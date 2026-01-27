// controllers/AnalyticsController.ts
import { ref, get } from 'firebase/database';
import { db } from '../config/firebaseConfig';
import { User } from '../models/User';

export interface AnalyticsData {
  totalActiveUsers: number;
  activeUsersOnline: number;
  activeTrainers: number;
  activeTrainersOnline: number;
  totalRegistrations: number;
  pendingTrainerVerifications: number;
  pendingModuleReviews: number;
  topPerformedTechniques: { technique: string; count: number }[];
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

      // Get top performed techniques
      const topPerformedTechniques = Object.entries(techniqueCounts)
        .map(([technique, count]) => ({ technique, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5

      // Check for pending module reviews (placeholder - would need modules collection)
      // For now, we'll use a placeholder value
      const pendingModuleReviews = 0; // TODO: Implement when modules collection exists

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
      revenue: {
        totalRevenue: 0,
        monthlyRevenue: 0,
        subscriptionRevenue: 0,
        isProfitable: false,
      },
    };
  }
}
