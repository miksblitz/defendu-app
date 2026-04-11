// controllers/AnalyticsController.ts
import { ref, get } from 'firebase/database';
import { db } from '../config/firebaseConfig';
import { User } from '../_models/User';

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
  moduleCount: number;
  averageRating: number;
}

export interface AnalyticsData {
  totalActiveUsers: number;
  activeUsersOnline: number;
  activeTrainers: number;
  activeTrainersOnline: number;
  totalRegistrations: number;
  pendingTrainerVerifications: number;
  pendingModuleReviews: number;
  topPerformedTechniques: { technique: string; count: number }[];
  topModules: TopModule[];
  trainerLeaderboard: TrainerLeaderboardEntry[];
  revenue: {
    totalRevenue: number;
    monthlyRevenue: number;
    subscriptionRevenue: number;
    isProfitable: boolean;
  };
}

export class AnalyticsController {
  // Consider a user "active" if they were active in the last 15 minutes
  private static readonly ACTIVE_THRESHOLD_MS = 15 * 60 * 1000;

  static async getAnalytics(): Promise<AnalyticsData> {
    try {
      // Fetch all users
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      
      if (!snapshot.exists()) {
        return this.getDefaultAnalytics();
      }

      const usersData = snapshot.val();
      const now = Date.now();
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      let totalActiveUsers = 0;
      let activeUsersOnline = 0;
      let activeTrainers = 0;
      let activeTrainersOnline = 0;
      let totalRegistrations = 0;
      let pendingTrainerVerifications = 0;
      const techniqueCounts: { [key: string]: number } = {};
      let totalRevenue = 0;
      let monthlyRevenue = 0;
      let subscriptionRevenue = 0;

      // Process each user
      for (const uid in usersData) {
        if (!usersData.hasOwnProperty(uid)) continue;
        
        const userDataRaw = usersData[uid];
        if (!userDataRaw || typeof userDataRaw !== 'object') continue;

        // Skip admin users
        if (userDataRaw.role === 'admin') continue;

        totalRegistrations++;

        // Check if user is active (individual users)
        if (userDataRaw.role === 'individual' || !userDataRaw.role) {
          const lastActive = userDataRaw.lastActive;
          if (lastActive) {
            const timeSinceActive = now - lastActive;
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

        // Check if trainer is active
        if (userDataRaw.role === 'trainer') {
          if (userDataRaw.trainerApproved === true) {
            activeTrainers++;
            const lastActive = userDataRaw.lastActive;
            if (lastActive) {
              const timeSinceActive = now - lastActive;
              if (timeSinceActive <= this.ACTIVE_THRESHOLD_MS) {
                activeTrainersOnline++;
              }
            }
          } else {
            // Pending trainer verification
            pendingTrainerVerifications++;
          }
        }

        // Count preferred techniques (from user preferences)
        // TODO: When technique performance tracking is implemented, 
        // fetch from a 'techniquePerformances' or 'trainingSessions' collection
        // to get actual performed techniques instead of just preferred ones
        if (userDataRaw.preferredTechnique) {
          const techniques = Array.isArray(userDataRaw.preferredTechnique)
            ? userDataRaw.preferredTechnique
            : [userDataRaw.preferredTechnique];
          
          techniques.forEach((technique: string) => {
            if (technique) {
              techniqueCounts[technique] = (techniqueCounts[technique] || 0) + 1;
            }
          });
        }
        
        // TODO: Add support for actual technique performance data
        // Example: if (userDataRaw.performedTechniques) { ... }
        // This will automatically work once you add technique performance tracking to your app

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

      // Get top performed techniques (exclude Palm Strikes)
      const topPerformedTechniques = Object.entries(techniqueCounts)
        .filter(([technique]) => technique !== 'Palm Strikes')
        .map(([technique, count]) => ({ technique, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5

      // ── Module ratings & trainer leaderboard ─────────────────────────
      // Fetch all approved modules
      const modulesSnap = await get(ref(db, 'modules'));
      const approvedModules: { moduleId: string; moduleTitle: string; trainerName: string; trainerId: string; category: string }[] = [];
      if (modulesSnap.exists()) {
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
          }
        }
      }

      // Fetch all reviews and compute per-module averages
      const reviewsSnap = await get(ref(db, 'moduleReviews'));
      const reviewsData = reviewsSnap.exists() ? reviewsSnap.val() : {};

      // pendingModuleReviews = modules with status pending review
      const pendingModuleReviews = modulesSnap.exists()
        ? Object.values(modulesSnap.val() as Record<string, any>).filter(
            (m: any) => m && m.status === 'pending review'
          ).length
        : 0;

      // Build topModules with real avg ratings
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

      // Build trainer leaderboard — aggregate ratings across all their approved modules
      const trainerMap: Record<string, { trainerName: string; totalRating: number; ratedModules: number; moduleCount: number }> = {};
      for (const mod of approvedModules) {
        if (!trainerMap[mod.trainerId]) {
          trainerMap[mod.trainerId] = { trainerName: mod.trainerName, totalRating: 0, ratedModules: 0, moduleCount: 0 };
        }
        trainerMap[mod.trainerId].moduleCount++;
        const moduleReviewsRaw = reviewsData[mod.moduleId];
        if (moduleReviewsRaw && typeof moduleReviewsRaw === 'object') {
          let mTotal = 0;
          let mCount = 0;
          for (const uid in moduleReviewsRaw) {
            if (!Object.prototype.hasOwnProperty.call(moduleReviewsRaw, uid)) continue;
            const r = moduleReviewsRaw[uid];
            if (r && typeof r.rating === 'number') {
              mTotal += r.rating;
              mCount++;
            }
          }
          if (mCount > 0) {
            trainerMap[mod.trainerId].totalRating += mTotal / mCount;
            trainerMap[mod.trainerId].ratedModules++;
          }
        }
      }

      const trainerLeaderboard: TrainerLeaderboardEntry[] = Object.entries(trainerMap)
        .map(([trainerId, t]) => ({
          trainerId,
          trainerName: t.trainerName,
          moduleCount: t.moduleCount,
          averageRating: t.ratedModules > 0 ? Math.round((t.totalRating / t.ratedModules) * 10) / 10 : 0,
        }))
        .filter((t) => t.averageRating > 0)
        .sort((a, b) => b.averageRating - a.averageRating || b.moduleCount - a.moduleCount)
        .slice(0, 5);
      // ──────────────────────────────────────────────────────────────────

      // Calculate if profitable (assuming operational costs)
      const estimatedMonthlyCosts = 500; // Placeholder for server costs, etc.
      const isProfitable = monthlyRevenue > estimatedMonthlyCosts;

      return {
        totalActiveUsers,
        activeUsersOnline,
        activeTrainers,
        activeTrainersOnline,
        totalRegistrations,
        pendingTrainerVerifications,
        pendingModuleReviews,
        topPerformedTechniques,
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

  static getDefaultAnalytics(): AnalyticsData {
    return {
      totalActiveUsers: 0,
      activeUsersOnline: 0,
      activeTrainers: 0,
      activeTrainersOnline: 0,
      totalRegistrations: 0,
      pendingTrainerVerifications: 0,
      pendingModuleReviews: 0,
      topPerformedTechniques: [],
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
