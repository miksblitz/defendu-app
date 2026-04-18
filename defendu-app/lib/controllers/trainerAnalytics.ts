import { Platform } from 'react-native';
import { auth } from '../../app/config/firebaseConfig';
import { getExpoApiBaseUrl, getServerlessApiBaseUrl } from '../../constants/apiBaseUrl';

export interface TrainerModuleAnalyticsRow {
  moduleId: string;
  moduleTitle: string;
  category?: string;
  thumbnailUrl?: string;
  buyers: number;
  creditsGross: number;
  avgCreditsPerBuyer: number;
  lastPurchasedAt: number;
}

export interface TrainerPublishedModuleAnalytics {
  success: boolean;
  trainerUid: string;
  totals: {
    modules: number;
    buyers: number;
    creditsGross: number;
  };
  modules: TrainerModuleAnalyticsRow[];
  phpEarnings?: {
    available: boolean;
    note?: string;
    payoutSplit?: string;
  };
  error?: string;
}

function getAnalyticsApiBase(): string {
  if (Platform.OS === 'web') {
    return getServerlessApiBaseUrl();
  }
  const pay = process.env.EXPO_PUBLIC_PAYMENT_API_BASE_URL;
  if (typeof pay === 'string' && pay.trim().length > 0) {
    return pay.trim().replace(/\/$/, '');
  }
  return getExpoApiBaseUrl();
}

/**
 * POST with Firebase ID token. Tries /api/trainer-module-analytics then /trainer-module-analytics.
 */
export async function getTrainerPublishedModuleAnalytics(): Promise<TrainerPublishedModuleAnalytics> {
  const user = auth.currentUser;
  if (!user) {
    return { success: false, trainerUid: '', totals: { modules: 0, buyers: 0, creditsGross: 0 }, modules: [], error: 'Not signed in' };
  }
  const token = await user.getIdToken();
  const base = getAnalyticsApiBase();
  const paths = ['/api/trainer-module-analytics', '/trainer-module-analytics'];
  let lastErr = 'Request failed';

  for (const path of paths) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      let data: TrainerPublishedModuleAnalytics & { message?: string };
      try {
        data = (await res.json()) as TrainerPublishedModuleAnalytics & { message?: string };
      } catch {
        lastErr = `HTTP ${res.status}`;
        continue;
      }
      if (res.ok && data.success) {
        return data;
      }
      lastErr = data.error || data.message || `HTTP ${res.status}`;
      if (res.status === 401 || res.status === 403) {
        break;
      }
    } catch (e) {
      lastErr = e instanceof Error ? e.message : 'Network error';
    }
  }

  return {
    success: false,
    trainerUid: user.uid,
    totals: { modules: 0, buyers: 0, creditsGross: 0 },
    modules: [],
    error: lastErr,
  };
}
