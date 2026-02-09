// hooks/useLogout.ts
import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthController } from '../app/controllers/AuthController';
import { OfflineStorage } from '../app/_utils/offlineStorage';
import { useLogoutContext } from '../app/contexts/LogoutContext';

/**
 * Returns a function that shows "Are you sure you want to log out?" (Yes/No),
 * then on Yes: logs out, clears offline data, clears navigation history,
 * and replaces to login so the back button cannot return to the app.
 * When LogoutProvider is present, uses the styled in-app modal; otherwise falls back to Alert/confirm.
 */
export function useLogout() {
  const router = useRouter();
  const openLogoutConfirm = useLogoutContext();

  const performLogout = useCallback(async () => {
    try {
      await AuthController.logout();
      await OfflineStorage.clearOfflineData();
      router.dismissAll();
      router.replace('/(auth)/login');
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState(null, '', window.location.href);
        window.onpopstate = () => {
          window.history.pushState(null, '', window.location.href);
        };
      }
    } catch (error) {
      console.error('Logout error:', error);
      router.replace('/(auth)/login');
    }
  }, [router]);

  const handleLogout = useCallback(() => {
    if (openLogoutConfirm) {
      openLogoutConfirm();
      return;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm('Are you sure you want to log out?');
      if (confirmed) performLogout();
      return;
    }
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: performLogout },
      ]
    );
  }, [openLogoutConfirm, performLogout]);

  return handleLogout;
}
