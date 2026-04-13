import { get, ref, runTransaction, set } from 'firebase/database';
import { db } from '../config/firebaseConfig';
import { AuthController } from './AuthController';

export interface TrainerRatingSummary {
  averageRating: number;
  totalReviews: number;
  sumRatings: number;
  updatedAt?: number;
}

export interface TrainerReviewProfile {
  uid: string;
  fullName: string;
  profilePicture?: string;
  createdAt?: number;
}

type SubmitTrainerRatingInput = {
  category: string;
  categoryKey: string;
  ratings: { trainerUid: string; rating: number }[];
};

/** Parse numeric rating from category review trainerRatings map values (number or { rating }). */
function coerceRating(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 5) return value;
  if (value && typeof value === 'object' && typeof (value as any).rating === 'number') {
    const r = (value as any).rating;
    if (Number.isFinite(r) && r >= 1 && r <= 5) return r;
  }
  return null;
}

function readTrainerRatingsMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const uid = k.trim();
    if (!uid) continue;
    const r = coerceRating(v);
    if (r != null) out[uid] = r;
  }
  return out;
}

function summaryFromStats(stats: Record<string, unknown>): TrainerRatingSummary | null {
  const totalReviews =
    typeof stats.totalReviews === 'number' && Number.isFinite(stats.totalReviews)
      ? Math.max(0, stats.totalReviews)
      : 0;
  const sumStored =
    typeof stats.sumRatings === 'number' && Number.isFinite(stats.sumRatings) ? stats.sumRatings : null;
  const avgStored =
    typeof stats.averageRating === 'number' && Number.isFinite(stats.averageRating)
      ? stats.averageRating
      : null;
  if (totalReviews <= 0 && (sumStored == null || sumStored <= 0) && avgStored == null) return null;

  const averageRating =
    avgStored != null
      ? avgStored
      : totalReviews > 0 && sumStored != null
        ? sumStored / totalReviews
        : 0;
  const sumRatings =
    sumStored != null
      ? sumStored
      : totalReviews > 0 && avgStored != null
        ? avgStored * totalReviews
        : totalReviews > 0
          ? averageRating * totalReviews
          : 0;

  return {
    sumRatings,
    totalReviews,
    averageRating,
    updatedAt: typeof stats.updatedAt === 'number' ? stats.updatedAt : undefined,
  };
}

/** Tier 2: sum rating fields under trainerRatings/{uid}/reviews */
function summaryFromReviewsNode(reviewsVal: Record<string, unknown> | null | undefined): TrainerRatingSummary | null {
  if (!reviewsVal || typeof reviewsVal !== 'object') return null;
  let sum = 0;
  let count = 0;
  for (const rid of Object.keys(reviewsVal)) {
    const row = reviewsVal[rid];
    if (!row || typeof row !== 'object') continue;
    const r = (row as Record<string, unknown>).rating;
    if (typeof r === 'number' && Number.isFinite(r) && r >= 1 && r <= 5) {
      sum += r;
      count += 1;
    }
  }
  if (count === 0) return null;
  return {
    sumRatings: sum,
    totalReviews: count,
    averageRating: sum / count,
  };
}

type AggMap = Map<string, { sumRatings: number; totalReviews: number }>;

/**
 * Tier 3: merge categoryReviews + per-user categoryReviews mirror with dedupe
 * (users/{userId}/categoryReviews/{categoryKey}).
 * Dedupe key = userId|categoryKey|trainerUid so the same session is not counted twice.
 */
function mergeCategoryReviewTrainerRatingsIntoAgg(
  agg: AggMap,
  seen: Set<string>,
  userId: string,
  categoryKey: string,
  trainerRatingsRaw: unknown
): void {
  if (!trainerRatingsRaw || typeof trainerRatingsRaw !== 'object') return;
  const map = trainerRatingsRaw as Record<string, unknown>;
  for (const trainerUid of Object.keys(map)) {
    const tUid = trainerUid.trim();
    if (!tUid) continue;
    const rating = coerceRating(map[trainerUid]);
    if (rating == null) continue;
    const dedupeKey = `${userId}|${categoryKey}|${tUid}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const prev = agg.get(tUid) || { sumRatings: 0, totalReviews: 0 };
    prev.sumRatings += rating;
    prev.totalReviews += 1;
    agg.set(tUid, prev);
  }
}

function walkCategoryReviewsTree(val: unknown, agg: AggMap, seen: Set<string>): void {
  if (!val || typeof val !== 'object') return;
  const byCategory = val as Record<string, unknown>;
  for (const categoryKey of Object.keys(byCategory)) {
    const catNode = byCategory[categoryKey];
    if (!catNode || typeof catNode !== 'object') continue;
    const byUser = catNode as Record<string, unknown>;
    for (const userId of Object.keys(byUser)) {
      const doc = byUser[userId];
      if (!doc || typeof doc !== 'object') continue;
      const tr = (doc as Record<string, unknown>).trainerRatings;
      mergeCategoryReviewTrainerRatingsIntoAgg(agg, seen, userId, categoryKey, tr);
    }
  }
}

function walkUsersCategoryReviewsMirror(val: unknown, agg: AggMap, seen: Set<string>): void {
  if (!val || typeof val !== 'object') return;
  const users = val as Record<string, unknown>;
  for (const userId of Object.keys(users)) {
    const userVal = users[userId];
    if (!userVal || typeof userVal !== 'object') continue;
    const cr = (userVal as Record<string, unknown>).categoryReviews;
    if (!cr || typeof cr !== 'object') continue;
    const byCategory = cr as Record<string, unknown>;
    for (const categoryKey of Object.keys(byCategory)) {
      const doc = byCategory[categoryKey];
      if (!doc || typeof doc !== 'object') continue;
      const tr = (doc as Record<string, unknown>).trainerRatings;
      mergeCategoryReviewTrainerRatingsIntoAgg(agg, seen, userId, categoryKey, tr);
    }
  }
}

function summaryFromAggEntry(entry: { sumRatings: number; totalReviews: number }): TrainerRatingSummary {
  const { sumRatings, totalReviews } = entry;
  return {
    sumRatings,
    totalReviews,
    averageRating: totalReviews > 0 ? sumRatings / totalReviews : 0,
  };
}

const EMPTY_SUMMARY: TrainerRatingSummary = { averageRating: 0, totalReviews: 0, sumRatings: 0 };

function isPermissionDenied(e: unknown): boolean {
  const code = (e as any)?.code;
  const msg = String((e as any)?.message || '').toLowerCase();
  return code === 'PERMISSION_DENIED' || msg.includes('permission denied');
}

export class TrainerRatingController {
  static async hasCategoryReview(categoryKey: string): Promise<boolean> {
    const currentUser = await AuthController.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');
    const key = (categoryKey || '').trim().toLowerCase();
    if (!key) return false;
    try {
      const [primary, mirror] = await Promise.all([
        get(ref(db, `categoryReviews/${key}/${currentUser.uid}`)),
        get(ref(db, `users/${currentUser.uid}/categoryReviews/${key}`)),
      ]);
      return primary.exists() || mirror.exists();
    } catch (error: any) {
      if (isPermissionDenied(error)) return false;
      throw error;
    }
  }

  /** Saved per-trainer stars for this user + category (primary path, else mirror). */
  static async getCategoryReviewRatingsMap(categoryKey: string): Promise<Record<string, number>> {
    const currentUser = await AuthController.getCurrentUser();
    if (!currentUser) return {};
    const key = (categoryKey || '').trim().toLowerCase();
    if (!key) return {};
    try {
      const primary = await get(ref(db, `categoryReviews/${key}/${currentUser.uid}`));
      if (primary.exists()) return readTrainerRatingsMap((primary.val() as any)?.trainerRatings);
      const mirror = await get(ref(db, `users/${currentUser.uid}/categoryReviews/${key}`));
      if (mirror.exists()) return readTrainerRatingsMap((mirror.val() as any)?.trainerRatings);
      return {};
    } catch (e) {
      if (isPermissionDenied(e)) return {};
      throw e;
    }
  }

  /** True when every required trainerUid has a 1–5 rating stored on the category review doc. */
  static async hasRatedAllCategoryTrainers(categoryKey: string, requiredTrainerUids: string[]): Promise<boolean> {
    const required = Array.from(
      new Set(requiredTrainerUids.map((u) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean))
    );
    if (!required.length) return true;
    const map = await this.getCategoryReviewRatingsMap(categoryKey);
    return required.every((uid) => {
      const r = map[uid];
      return typeof r === 'number' && r >= 1 && r <= 5;
    });
  }

  static async getTrainerProfiles(trainerUids: string[]): Promise<Record<string, TrainerReviewProfile>> {
    const unique = Array.from(
      new Set(trainerUids.map((id) => (typeof id === 'string' ? id.trim() : '')).filter(Boolean))
    );
    if (!unique.length) return {};
    const out: Record<string, TrainerReviewProfile> = {};
    await Promise.all(
      unique.map(async (uid) => {
        try {
          const snap = await get(ref(db, `users/${uid}`));
          if (!snap.exists()) return;
          const v = snap.val() as Record<string, any>;
          const first = typeof v.firstName === 'string' ? v.firstName.trim() : '';
          const last = typeof v.lastName === 'string' ? v.lastName.trim() : '';
          const full = `${first} ${last}`.trim() || v.username || 'Trainer';
          out[uid] = {
            uid,
            fullName: full,
            profilePicture: typeof v.profilePicture === 'string' ? v.profilePicture : undefined,
            createdAt: typeof v.createdAt === 'number' ? v.createdAt : undefined,
          };
        } catch {
          /* ignore */
        }
      })
    );
    return out;
  }

  /**
   * Tier 3 aggregate: categoryReviews tree + users/{uid}/categoryReviews mirror (deduped).
   */
  static async fetchCategoryReviewTrainerAggregateMap(): Promise<AggMap> {
    const agg: AggMap = new Map();
    const seen = new Set<string>();

    try {
      const snap = await get(ref(db, 'categoryReviews'));
      if (snap.exists()) walkCategoryReviewsTree(snap.val(), agg, seen);
    } catch (e) {
      if (!isPermissionDenied(e)) console.warn('TrainerRatingController: categoryReviews read failed', e);
    }

    try {
      const snap = await get(ref(db, 'users'));
      if (snap.exists()) walkUsersCategoryReviewsMirror(snap.val(), agg, seen);
    } catch (e) {
      if (!isPermissionDenied(e)) console.warn('TrainerRatingController: users mirror read failed', e);
    }

    return agg;
  }

  /**
   * Batch: one read of trainerRatings root when rules allow (preferred for public listing).
   */
  static async fetchTrainerRatingsTreeSnapshot(): Promise<Record<string, unknown> | null> {
    try {
      const snap = await get(ref(db, 'trainerRatings'));
      return snap.exists() ? (snap.val() as Record<string, unknown>) : null;
    } catch (e) {
      if (!isPermissionDenied(e)) console.warn('TrainerRatingController: trainerRatings batch read failed', e);
      return null;
    }
  }

  static resolveSummaryForTrainer(
    trainerUid: string,
    trainerNode: unknown,
    categoryAgg: AggMap
  ): TrainerRatingSummary {
    const uid = (trainerUid || '').trim();
    if (!uid) return { ...EMPTY_SUMMARY };

    if (trainerNode && typeof trainerNode === 'object') {
      const node = trainerNode as Record<string, unknown>;
      const statsRaw = node.stats;
      if (statsRaw && typeof statsRaw === 'object') {
        const fromStats = summaryFromStats(statsRaw as Record<string, unknown>);
        if (fromStats) return fromStats;
      }
      const reviewsRaw = node.reviews;
      if (reviewsRaw && typeof reviewsRaw === 'object') {
        const fromReviews = summaryFromReviewsNode(reviewsRaw as Record<string, unknown>);
        if (fromReviews) return fromReviews;
      }
    }

    const fromCat = categoryAgg.get(uid);
    if (fromCat && fromCat.totalReviews > 0) return summaryFromAggEntry(fromCat);

    return { ...EMPTY_SUMMARY };
  }

  /**
   * Single-trainer read (N+1 safe fallback): tries stats → reviews on node only, then category aggregate map.
   * Pass `categoryAgg` from fetchCategoryReviewTrainerAggregateMap() when batching many trainers.
   */
  static async getTrainerRatingSummary(
    trainerUid: string,
    categoryAgg?: AggMap
  ): Promise<TrainerRatingSummary> {
    const uid = (trainerUid || '').trim();
    if (!uid) return { ...EMPTY_SUMMARY };

    let catMap = categoryAgg;
    if (!catMap) {
      catMap = await this.fetchCategoryReviewTrainerAggregateMap();
    }

    try {
      const snap = await get(ref(db, `trainerRatings/${uid}`));
      const node = snap.exists() ? snap.val() : null;
      return this.resolveSummaryForTrainer(uid, node, catMap);
    } catch (e) {
      if (isPermissionDenied(e)) {
        return this.resolveSummaryForTrainer(uid, null, catMap);
      }
      return { ...EMPTY_SUMMARY };
    }
  }

  /**
   * Batch summaries for trainer listing: prefers one trainerRatings tree read + one category aggregate read.
   */
  static async getTrainerRatingSummariesForTrainers(trainerUids: string[]): Promise<Record<string, TrainerRatingSummary>> {
    const unique = Array.from(new Set(trainerUids.map((u) => (u || '').trim()).filter(Boolean)));
    const out: Record<string, TrainerRatingSummary> = {};
    if (!unique.length) return out;

    const [tree, categoryAgg] = await Promise.all([
      this.fetchTrainerRatingsTreeSnapshot(),
      this.fetchCategoryReviewTrainerAggregateMap(),
    ]);

    for (const uid of unique) {
      const node = tree && typeof tree[uid] === 'object' ? tree[uid] : null;
      out[uid] = this.resolveSummaryForTrainer(uid, node, categoryAgg);
    }
    return out;
  }

  static async submitCategoryTrainerRatings(input: SubmitTrainerRatingInput): Promise<void> {
    const currentUser = await AuthController.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const categoryKey = (input.categoryKey || '').trim().toLowerCase();
    const category = (input.category || '').trim();
    if (!categoryKey || !category) throw new Error('Category is required');

    const rows = input.ratings
      .map((r) => ({
        trainerUid: (r.trainerUid || '').trim(),
        rating: Number(r.rating),
      }))
      .filter((r) => r.trainerUid && Number.isFinite(r.rating) && r.rating >= 1 && r.rating <= 5);
    if (!rows.length) throw new Error('Please rate at least one trainer.');

    const userName =
      `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username || 'User';
    const now = Date.now();

    const primarySnap = await get(ref(db, `categoryReviews/${categoryKey}/${currentUser.uid}`));
    let existingDoc: Record<string, any> | null = primarySnap.exists() ? primarySnap.val() : null;
    if (!existingDoc) {
      const mirrorSnap = await get(ref(db, `users/${currentUser.uid}/categoryReviews/${categoryKey}`));
      existingDoc = mirrorSnap.exists() ? mirrorSnap.val() : null;
    }
    const existingTr = readTrainerRatingsMap(existingDoc?.trainerRatings);

    const trainerRatingsPayload: Record<string, number> = {};
    for (const { trainerUid, rating } of rows) {
      trainerRatingsPayload[trainerUid] = rating;
    }
    const mergedTrainerRatings = { ...existingTr, ...trainerRatingsPayload };

    await Promise.all(
      rows.map(async ({ trainerUid, rating }) => {
        const reviewId = `${currentUser.uid}_${categoryKey}`;
        const reviewPath = `trainerRatings/${trainerUid}/reviews/${reviewId}`;
        const existingSnap = await get(ref(db, reviewPath));
        const existing = existingSnap.exists() ? (existingSnap.val() as Record<string, any>) : null;
        const previousRating = typeof existing?.rating === 'number' ? existing.rating : null;
        const createdAt = typeof existing?.createdAt === 'number' ? existing.createdAt : now;

        try {
          await set(ref(db, reviewPath), {
            trainerUid,
            userUid: currentUser.uid,
            userName,
            category,
            categoryKey,
            rating,
            comment: null,
            createdAt,
            updatedAt: now,
          });
        } catch (e) {
          if (!isPermissionDenied(e)) throw e;
        }

        try {
          await runTransaction(ref(db, `trainerRatings/${trainerUid}/stats`), (statsRaw) => {
            const stats = (statsRaw || {}) as Record<string, any>;
            const oldSum = typeof stats.sumRatings === 'number' ? stats.sumRatings : 0;
            const oldTotal = typeof stats.totalReviews === 'number' ? stats.totalReviews : 0;
            const existed = previousRating != null;
            const sumRatings = existed ? oldSum - (previousRating as number) + rating : oldSum + rating;
            const totalReviews = existed ? oldTotal : oldTotal + 1;
            const averageRating = totalReviews > 0 ? sumRatings / totalReviews : 0;
            return { sumRatings, totalReviews, averageRating, updatedAt: now };
          });
        } catch (e) {
          if (!isPermissionDenied(e)) throw e;
        }
      })
    );

    const createdAt = typeof existingDoc?.createdAt === 'number' ? existingDoc.createdAt : now;
    const categoryDoc = {
      userUid: currentUser.uid,
      category,
      categoryKey,
      ratedTrainerUids: Object.keys(mergedTrainerRatings),
      trainerRatings: mergedTrainerRatings,
      createdAt,
      updatedAt: now,
    };

    await set(ref(db, `categoryReviews/${categoryKey}/${currentUser.uid}`), categoryDoc);
    await set(ref(db, `users/${currentUser.uid}/categoryReviews/${categoryKey}`), categoryDoc);
  }
}
