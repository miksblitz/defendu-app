// utils/offlineStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Offline storage bucket keys
const OFFLINE_BUCKET_PREFIX = 'offline_bucket_';
const OFFLINE_ENABLED_KEY = 'offline_mode_enabled';
const OFFLINE_DATA_KEY = 'offline_data';

export interface OfflineData {
  user?: any;
  skillProfile?: any;
  trainingModules?: any[];
  lastSync?: number;
  [key: string]: any;
}

/**
 * Offline Storage Manager
 * Handles offline data storage using AsyncStorage and SecureStore
 */
export class OfflineStorage {
  /**
   * Check if offline mode is enabled
   */
  static async isOfflineEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(OFFLINE_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking offline mode:', error);
      return false;
    }
  }

  /**
   * Enable offline mode
   */
  static async enableOfflineMode(): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_ENABLED_KEY, 'true');
      console.log('✅ Offline mode enabled');
    } catch (error) {
      console.error('Error enabling offline mode:', error);
      throw error;
    }
  }

  /**
   * Disable offline mode
   */
  static async disableOfflineMode(): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_ENABLED_KEY, 'false');
      // Optionally clear offline data when disabling
      // await this.clearOfflineData();
      console.log('✅ Offline mode disabled');
    } catch (error) {
      console.error('Error disabling offline mode:', error);
      throw error;
    }
  }

  /**
   * Store data in offline bucket
   */
  static async storeData(key: string, data: any): Promise<void> {
    try {
      const isEnabled = await this.isOfflineEnabled();
      if (!isEnabled) {
        console.log('⚠️ Offline mode not enabled, skipping storage');
        return;
      }

      const storageKey = `${OFFLINE_BUCKET_PREFIX}${key}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(data));
      console.log(`✅ Stored data in offline bucket: ${key}`);
    } catch (error) {
      console.error(`Error storing data for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve data from offline bucket
   */
  static async getData(key: string): Promise<any | null> {
    try {
      const isEnabled = await this.isOfflineEnabled();
      if (!isEnabled) {
        return null;
      }

      const storageKey = `${OFFLINE_BUCKET_PREFIX}${key}`;
      const data = await AsyncStorage.getItem(storageKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error retrieving data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Store complete offline data snapshot
   */
  static async storeOfflineSnapshot(data: OfflineData): Promise<void> {
    try {
      const isEnabled = await this.isOfflineEnabled();
      if (!isEnabled) {
        console.log('⚠️ Offline mode not enabled, skipping snapshot');
        return;
      }

      const snapshot = {
        ...data,
        lastSync: Date.now(),
      };

      await AsyncStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(snapshot));
      console.log('✅ Offline snapshot stored');
    } catch (error) {
      console.error('Error storing offline snapshot:', error);
      throw error;
    }
  }

  /**
   * Retrieve complete offline data snapshot
   */
  static async getOfflineSnapshot(): Promise<OfflineData | null> {
    try {
      const isEnabled = await this.isOfflineEnabled();
      if (!isEnabled) {
        return null;
      }

      const data = await AsyncStorage.getItem(OFFLINE_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error retrieving offline snapshot:', error);
      return null;
    }
  }

  /**
   * Clear all offline data
   */
  static async clearOfflineData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(key => 
        key.startsWith(OFFLINE_BUCKET_PREFIX) || key === OFFLINE_DATA_KEY
      );
      
      if (offlineKeys.length > 0) {
        await AsyncStorage.multiRemove(offlineKeys);
        console.log('✅ Offline data cleared');
      }
    } catch (error) {
      console.error('Error clearing offline data:', error);
      throw error;
    }
  }

  /**
   * Get storage size estimate (for debugging)
   */
  static async getStorageSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(key => 
        key.startsWith(OFFLINE_BUCKET_PREFIX) || key === OFFLINE_DATA_KEY
      );
      
      let totalSize = 0;
      for (const key of offlineKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Error calculating storage size:', error);
      return 0;
    }
  }
}
