// controllers/AnalyticsController.ts
import { ref, get } from 'firebase/database';
import { db } from '../config/firebaseConfig';
import { TrainerApplication } from '../_models/TrainerApplication';
import { TrainerRatingController, TrainerRatingSummary } from './TrainerRatingController';

export interface TopModule {
  moduleId: string;
  moduleTitle: string;
  trainerName: string;
  category: string;
  averageRating: number;
  reviewCount: number;
}

export interface TrainerLeaderboardEntry {
  trainerId: string;
  trainerName: string;
  profilePicture?: string;
  coverPhoto?: string;
  academyName?: string;
  specialty?: string;
  aboutMe?: string;
  moduleCount: number;
  averageRating: number;
  totalReviews: number;
  /** Total accumulated stars across all reviews (e.g. 4+5+3). Used for ranking. */
  sumRatings?: number;
}

export interface AnalyticsData {
  totalActiveUsers: number;
  activeUsersOnline: number;
  activeTrainers: number;
  activeTrainersOnline: number;
  totalRegistrations: number;
  /** New registrations in the current calendar month (non-admin users). */
  registrationsThisMonth: number;
  /** New registrations in the previous calendar month (non-admin users). */
  registrationsLastMonth: number;
  /** Month-over-month % change in new registrations (rounded integer). */
  registrationsMomPct: number;
  /** Weekly new-registration counts for the last 12 weeks, oldest first. */
  registrationsTrend: number[];
  pendingTrainerVerifications: number;
  pendingModuleReviews: number;
  topModules: TopModule[];
  trainerLeaderboard: TrainerLeaderboardEntry[];
  revenue: {
    totalRevenue: number;
    monthlyRevenue: number;
    subscriptionRevenue: number;
    isProfitable: boolean;
  };
}

type ApprovedTrainerSeed = {
  trainerId: string;
  trainerName: string;
  profilePicture?: string;
  coverPhoto?: string;
  preferredTechnique?: string;
};

export class AnalyticsController {
  // Consider a user "online" if they were active in the last 15 minutes
  private static readonly ACTIVE_THRESHOLD_MS = 15 * 60 * 1000;
  private static isPermissionDenied(error: unknown): boolean {
    const code = (error as any)?.code;
    const msg = String((error as any)?.message || '').toLowerCase();
    return code === 'PERMISSION_DENIED' || msg.includes('permission denied');
  }

  static async getAnalytics(): Promise<AnalyticsData> {
    try {
      // Fetch all users
      const usersRef = ref(db, 'users');
      let snapshot;
      try {
        snapshot = await get(usersRef);
      } catch (error) {
        if (this.isPermissionDenied(error)) {
          return this.getDefaultAnalytics();
        }
        throw error;
      }
      
      if (!snapshot.exists()) {
        return this.getDefaultAnalytics();
      }

      const usersData = snapshot.val();
      const now = Date.now();
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Month boundaries for month-over-month registration growth
      const thisMonthStartMs = new Date(currentYear, currentMonth, 1).getTime();
      const nextMonthStartMs = new Date(currentYear, currentMonth + 1, 1).getTime();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const lastMonthStartMs = new Date(lastMonthYear, lastMonth, 1).getTime();

      // 12-week rolling registration trend (oldest bucket first)
      const TREND_WEEKS = 12;
      const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      const trendStartMs = now - TREND_WEEKS * WEEK_MS;
      const registrationsTrend: number[] = new Array(TREND_WEEKS).fill(0);

      let totalActiveUsers = 0;
      let activeUsersOnline = 0;
      let activeTrainers = 0;
      let activeTrainersOnline = 0;
      let totalRegistrations = 0;
      let registrationsThisMonth = 0;
      let registrationsLastMonth = 0;
      let pendingTrainerVerifications = 0;
      let totalRevenue = 0;
      let monthlyRevenue = 0;
      let subscriptionRevenue = 0;

      // Seed data for the trainer leaderboard built from the same users snapshot.
      const approvedTrainerSeeds: ApprovedTrainerSeed[] = [];

      // Process each user
      for (const uid in usersData) {
        if (!usersData.hasOwnProperty(uid)) continue;
        
        const userDataRaw = usersData[uid];
        if (!userDataRaw || typeof userDataRaw !== 'object') continue;

        // Skip admin users
        if (userDataRaw.role === 'admin') continue;

        totalRegistrations++;

        // Registration growth & trend (uses createdAt which may be an ISO string or epoch ms)
        if (userDataRaw.createdAt != null) {
          const createdMs = typeof userDataRaw.createdAt === 'number'
            ? userDataRaw.createdAt
            : new Date(userDataRaw.createdAt).getTime();

          if (!Number.isNaN(createdMs)) {
            // Month-over-month buckets
            if (createdMs >= thisMonthStartMs && createdMs < nextMonthStartMs) {
              registrationsThisMonth++;
            } else if (createdMs >= lastMonthStartMs && createdMs < thisMonthStartMs) {
              registrationsLastMonth++;
            }

            // 12-week trend bucket
            if (createdMs >= trendStartMs && createdMs <= now) {
              const idx = Math.min(
                TREND_WEEKS - 1,
                Math.max(0, Math.floor((createdMs - trendStartMs) / WEEK_MS))
              );
              registrationsTrend[idx]++;
            }
          }
        }

        // Normalize lastActive (may be number in ms or ISO string) before any comparisons.
        const lastActiveMs = typeof userDataRaw.lastActive === 'number'
          ? userDataRaw.lastActive
          : typeof userDataRaw.lastActive === 'string'
            ? new Date(userDataRaw.lastActive).getTime()
            : null;

        // Individual users → active/online counts
        if (userDataRaw.role === 'individual' || userDataRaw.role === 'user' || !userDataRaw.role) {
          if (lastActiveMs && !Number.isNaN(lastActiveMs)) {
            const timeSinceActive = now - lastActiveMs;
            // Active within last 24 hours
            if (timeSinceActive <= 24 * 60 * 60 * 1000) {
              totalActiveUsers++;
              // Online if active within last 15 minutes
              if (timeSinceActive <= this.ACTIVE_THRESHOLD_MS) {
                activeUsersOnline++;
              }
            }
          }
        }

        // Approved trainers → contribute to active trainer totals + leaderboard seed
        if (userDataRaw.role === 'trainer') {
          if (userDataRaw.trainerApproved === true) {
            activeTrainers++;
            if (lastActiveMs && !Number.isNaN(lastActiveMs)) {
              const timeSinceActive = now - lastActiveMs;
              if (timeSinceActive <= this.ACTIVE_THRESHOLD_MS) {
                activeTrainersOnline++;
              }
            }

            const firstName = typeof userDataRaw.firstName === 'string' ? userDataRaw.firstName.trim() : '';
            const lastName = typeof userDataRaw.lastName === 'string' ? userDataRaw.lastName.trim() : '';
            const fullName = `${firstName} ${lastName}`.trim()
              || (typeof userDataRaw.username === 'string' && userDataRaw.username.trim())
              || 'Trainer';
            const preferredTechniqueRaw = userDataRaw.preferredTechnique;
            const preferredTechnique = Array.isArray(preferredTechniqueRaw)
              ? preferredTechniqueRaw.find((t: unknown) => typeof t === 'string' && (t as string).trim())
              : typeof preferredTechniqueRaw === 'string'
                ? preferredTechniqueRaw
                : undefined;

            approvedTrainerSeeds.push({
              trainerId: uid,
              trainerName: fullName,
              profilePicture: typeof userDataRaw.profilePicture === 'string' ? userDataRaw.profilePicture : undefined,
              coverPhoto: typeof userDataRaw.coverPhoto === 'string' ? userDataRaw.coverPhoto : undefined,
              preferredTechnique: typeof preferredTechnique === 'string' ? preferredTechnique : undefined,
            });
          } else {
            // Pending trainer verification
            pendingTrainerVerifications++;
          }
        }

        // Calculate revenue from subscriptions
        if (userDataRaw.subscriptionStatus) {
          // Assume subscription costs $9.99/month
          const subscriptionPrice = 9.99;
          subscriptionRevenue += subscriptionPrice;
          totalRevenue += subscriptionPrice;

          // Check if subscription was created this month
          const createdAt = userDataRaw.createdAt;
          if (createdAt) {
            const createdDate = new Date(createdAt);
            if (createdDate.getMonth() === currentMonth && 
                createdDate.getFullYear() === currentYear) {
              monthlyRevenue += subscriptionPrice;
            }
          }
        }
      }

      // ── Module ratings & pending reviews ─────────────────────────────
      let modulesSnap;
      try {
        modulesSnap = await get(ref(db, 'modules'));
      } catch (error) {
        if (this.isPermissionDenied(error)) {
          modulesSnap = null;
        } else {
          throw error;
        }
      }
      const approvedModules: { moduleId: string; moduleTitle: string; trainerName: string; trainerId: string; category: string }[] = [];
      const moduleCountByTrainer: Record<string, number> = {};
      if (modulesSnap && modulesSnap.exists()) {
        const modulesData = modulesSnap.val();
        for (const moduleId in modulesData) {
          if (!Object.prototype.hasOwnProperty.call(modulesData, moduleId)) continue;
          const m = modulesData[moduleId];
          if (m && m.status === 'approved') {
            approvedModules.push({
              moduleId,
              moduleTitle: m.moduleTitle || 'Untitled',
              trainerName: m.trainerName || 'Unknown Trainer',
              trainerId: m.trainerId || '',
              category: m.category || 'Uncategorized',
            });
            const tId = typeof m.trainerId === 'string' ? m.trainerId.trim() : '';
            if (tId) {
              moduleCountByTrainer[tId] = (moduleCountByTrainer[tId] || 0) + 1;
            }
          }
        }
      }

      let reviewsSnap;
      try {
        reviewsSnap = await get(ref(db, 'moduleReviews'));
      } catch (error) {
        if (this.isPermissionDenied(error)) {
          reviewsSnap = null;
        } else {
          throw error;
        }
      }
      const reviewsData = reviewsSnap && reviewsSnap.exists() ? reviewsSnap.val() : {};

      const pendingModuleReviews = modulesSnap && modulesSnap.exists()
        ? Object.values(modulesSnap.val() as Record<string, any>).filter(
            (m: any) => m && m.status === 'pending review'
          ).length
        : 0;

      const topModules: TopModule[] = approvedModules
        .map((mod) => {
          const moduleReviewsRaw = reviewsData[mod.moduleId];
          let totalRating = 0;
          let reviewCount = 0;
          if (moduleReviewsRaw && typeof moduleReviewsRaw === 'object') {
            for (const uid in moduleReviewsRaw) {
              if (!Object.prototype.hasOwnProperty.call(moduleReviewsRaw, uid)) continue;
              const r = moduleReviewsRaw[uid];
              if (r && typeof r.rating === 'number') {
                totalRating += r.rating;
                reviewCount++;
              }
            }
          }
          const averageRating = reviewCount > 0 ? Math.round((totalRating / reviewCount) * 10) / 10 : 0;
          return { ...mod, averageRating, reviewCount };
        })
        .filter((m) => m.reviewCount > 0)
        .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount)
        .slice(0, 5);

      // Aggregate module review stars per trainer as a fallback for the trainer leaderboard
      // (in case `trainerRatings/*` is empty or blocked by rules).
      const moduleReviewAggByTrainer: Record<string, { sumRatings: number; totalReviews: number }> = {};
      for (const mod of approvedModules) {
        const tId = (mod.trainerId || '').trim();
        if (!tId) continue;
        const moduleReviewsRaw = reviewsData[mod.moduleId];
        if (!moduleReviewsRaw || typeof moduleReviewsRaw !== 'object') continue;
        for (const uid in moduleReviewsRaw) {
          if (!Object.prototype.hasOwnProperty.call(moduleReviewsRaw, uid)) continue;
          const r = moduleReviewsRaw[uid];
          const rating = r && typeof r.rating === 'number' ? r.rating : null;
          if (typeof rating !== 'number' || !Number.isFinite(rating) || rating < 1 || rating > 5) continue;
          const prev = moduleReviewAggByTrainer[tId] || { sumRatings: 0, totalReviews: 0 };
          prev.sumRatings += rating;
          prev.totalReviews += 1;
          moduleReviewAggByTrainer[tId] = prev;
        }
      }

      // ── Trainer leaderboard (by dedicated trainer ratings) ───────────
      const trainerLeaderboard = await this.buildTrainerLeaderboard(
        approvedTrainerSeeds,
        moduleCountByTrainer,
        moduleReviewAggByTrainer
      );

      // Calculate if profitable (assuming operational costs)
      const estimatedMonthlyCosts = 500; // Placeholder for server costs, etc.
      const isProfitable = monthlyRevenue > estimatedMonthlyCosts;

      // Month-over-month registration growth
      const registrationsMomPct = registrationsLastMonth > 0
        ? Math.round(
            ((registrationsThisMonth - registrationsLastMonth) / registrationsLastMonth) * 100
          )
        : (registrationsThisMonth > 0 ? 100 : 0);

      return {
        totalActiveUsers,
        activeUsersOnline,
        activeTrainers,
        activeTrainersOnline,
        totalRegistrations,
        registrationsThisMonth,
        registrationsLastMonth,
        registrationsMomPct,
        registrationsTrend,
        pendingTrainerVerifications,
        pendingModuleReviews,
        topModules,
        trainerLeaderboard,
        revenue: {
          totalRevenue,
          monthlyRevenue,
          subscriptionRevenue,
          isProfitable,
        },
      };
    } catch (error: any) {
      console.error('❌ Error fetching analytics:', error);
      return AnalyticsController.getDefaultAnalytics();
    }
  }

  /**
   * Merges approved-trainer seeds with the dedicated trainerRatings tree
   * (populated by TrainerRatingController) and each trainer's application
   * profile so the leaderboard can render rich cards (cover photo, gym, etc.).
   */
  private static async buildTrainerLeaderboard(
    seeds: ApprovedTrainerSeed[],
    moduleCountByTrainer: Record<string, number>,
    moduleReviewAggByTrainer: Record<string, { sumRatings: number; totalReviews: number }>
  ): Promise<TrainerLeaderboardEntry[]> {
    const seedByTrainerId = new Map<string, ApprovedTrainerSeed>();
    for (const seed of seeds) {
      const tId = (seed.trainerId || '').trim();
      if (!tId) continue;
      seedByTrainerId.set(tId, seed);
    }

    // Build candidates from any known trainer source so leaderboard is not empty when
    // approved-trainer seeds are missing/stale but ratings already exist.
    const candidateTrainerIds = new Set<string>([
      ...Array.from(seedByTrainerId.keys()),
      ...Object.keys(moduleCountByTrainer).map((id) => id.trim()).filter(Boolean),
      ...Object.keys(moduleReviewAggByTrainer).map((id) => id.trim()).filter(Boolean),
    ]);
    if (!candidateTrainerIds.size) return [];

    // Enrich missing seeds from users/{uid} (name/profile data for card rendering).
    const missingIds = Array.from(candidateTrainerIds).filter((id) => !seedByTrainerId.has(id));
    if (missingIds.length > 0) {
      const fetchedSeeds = await Promise.all(
        missingIds.map(async (trainerId) => {
          try {
            const snap = await get(ref(db, `users/${trainerId}`));
            if (!snap.exists()) return null;
            const userDataRaw = snap.val();
            if (!userDataRaw || typeof userDataRaw !== 'object') return null;
            const firstName = typeof userDataRaw.firstName === 'string' ? userDataRaw.firstName.trim() : '';
            const lastName = typeof userDataRaw.lastName === 'string' ? userDataRaw.lastName.trim() : '';
            const fullName = `${firstName} ${lastName}`.trim()
              || (typeof userDataRaw.username === 'string' && userDataRaw.username.trim())
              || 'Trainer';
            const preferredTechniqueRaw = userDataRaw.preferredTechnique;
            const preferredTechnique = Array.isArray(preferredTechniqueRaw)
              ? preferredTechniqueRaw.find((t: unknown) => typeof t === 'string' && (t as string).trim())
              : typeof preferredTechniqueRaw === 'string'
                ? preferredTechniqueRaw
                : undefined;
            return {
              trainerId,
              trainerName: fullName,
              profilePicture: typeof userDataRaw.profilePicture === 'string' ? userDataRaw.profilePicture : undefined,
              coverPhoto: typeof userDataRaw.coverPhoto === 'string' ? userDataRaw.coverPhoto : undefined,
              preferredTechnique: typeof preferredTechnique === 'string' ? preferredTechnique : undefined,
            } as ApprovedTrainerSeed;
          } catch {
            return null;
          }
        })
      );
      for (const seed of fetchedSeeds) {
        if (!seed) continue;
        seedByTrainerId.set(seed.trainerId, seed);
      }
    }

    const trainerIds = Array.from(candidateTrainerIds);

    let ratingSummaries: Record<string, TrainerRatingSummary> = {};
    try {
      ratingSummaries = await TrainerRatingController.getTrainerRatingSummariesForTrainers(trainerIds);
    } catch (error) {
      console.warn('⚠️ Failed to fetch trainer rating summaries for leaderboard:', error);
    }

    // Fetch trainer applications in parallel to enrich cards with academy / specialty.
    const applicationEntries = await Promise.all(
      trainerIds.map(async (trainerId) => {
        try {
          const snap = await get(ref(db, `TrainerApplication/${trainerId}`));
          if (!snap.exists()) return [trainerId, null] as const;
          return [trainerId, snap.val() as TrainerApplication] as const;
        } catch {
          return [trainerId, null] as const;
        }
      })
    );
    const applicationByTrainer: Record<string, TrainerApplication | null> = {};
    for (const [id, application] of applicationEntries) {
      applicationByTrainer[id] = application;
    }

    const entries: TrainerLeaderboardEntry[] = trainerIds.map((trainerId) => {
      const seed = seedByTrainerId.get(trainerId) || {
        trainerId,
        trainerName: 'Trainer',
      };
      const primary = ratingSummaries[seed.trainerId] || { averageRating: 0, totalReviews: 0, sumRatings: 0 };
      const fallbackAgg = moduleReviewAggByTrainer[seed.trainerId];
      const fallbackSummary = fallbackAgg
        ? {
            sumRatings: fallbackAgg.sumRatings,
            totalReviews: fallbackAgg.totalReviews,
            averageRating: fallbackAgg.totalReviews > 0 ? fallbackAgg.sumRatings / fallbackAgg.totalReviews : 0,
          }
        : null;
      const summary = primary.totalReviews > 0 ? primary : (fallbackSummary || primary);
      const application = applicationByTrainer[seed.trainerId];

      const specialty = (application?.defenseStyles && application.defenseStyles.find((s) => typeof s === 'string' && s.trim()))
        || seed.preferredTechnique
        || undefined;

      const academyName = typeof application?.academyName === 'string' && application.academyName.trim()
        ? application.academyName.trim()
        : undefined;

      const aboutMe = typeof application?.aboutMe === 'string' && application.aboutMe.trim()
        ? application.aboutMe.trim()
        : undefined;

      return {
        trainerId: seed.trainerId,
        trainerName: seed.trainerName,
        profilePicture: seed.profilePicture,
        coverPhoto: seed.coverPhoto,
        academyName,
        specialty,
        aboutMe,
        moduleCount: moduleCountByTrainer[seed.trainerId] || 0,
        averageRating: Math.round((summary.averageRating || 0) * 10) / 10,
        totalReviews: summary.totalReviews || 0,
        sumRatings: summary.sumRatings || 0,
      };
    });

    return entries
      .filter((t) => t.totalReviews > 0 && t.averageRating > 0)
      // Rank by "most stars" first (sumRatings), then average rating, then review volume.
      .sort((a, b) => (b.sumRatings || 0) - (a.sumRatings || 0)
        || b.averageRating - a.averageRating
        || b.totalReviews - a.totalReviews
        || b.moduleCount - a.moduleCount)
      .slice(0, 5);
  }

  static getDefaultAnalytics(): AnalyticsData {
    return {
      totalActiveUsers: 0,
      activeUsersOnline: 0,
      activeTrainers: 0,
      activeTrainersOnline: 0,
      totalRegistrations: 0,
      registrationsThisMonth: 0,
      registrationsLastMonth: 0,
      registrationsMomPct: 0,
      registrationsTrend: new Array(12).fill(0),
      pendingTrainerVerifications: 0,
      pendingModuleReviews: 0,
      topModules: [],
      trainerLeaderboard: [],
      revenue: {
        totalRevenue: 0,
        monthlyRevenue: 0,
        subscriptionRevenue: 0,
        isProfitable: false,
      },
    };
  }
}
