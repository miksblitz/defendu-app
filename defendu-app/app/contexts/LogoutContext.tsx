// app/contexts/LogoutContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { AuthController } from '../controllers/AuthController';
import { OfflineStorage } from '../_utils/offlineStorage';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';

type OpenLogoutConfirm = () => void;

const LogoutContext = createContext<OpenLogoutConfirm | undefined>(undefined);

export function LogoutProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  const performLogout = useCallback(async () => {
    try {
      await AuthController.logout();
      await OfflineStorage.clearOfflineData();
      router.dismissAll();
      router.replace('/(auth)/login');
      setVisible(false);
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState(null, '', window.location.href);
        window.onpopstate = () => {
          window.history.pushState(null, '', window.location.href);
        };
      }
    } catch (error) {
      console.error('Logout error:', error);
      setVisible(false);
      router.replace('/(auth)/login');
    }
  }, [router]);

  const openLogoutConfirm = useCallback(() => {
    setVisible(true);
  }, []);

  return (
    <LogoutContext.Provider value={openLogoutConfirm}>
      {children}
      <LogoutConfirmModal
        visible={visible}
        onConfirm={performLogout}
        onCancel={() => setVisible(false)}
      />
    </LogoutContext.Provider>
  );
}

export function useLogoutContext(): OpenLogoutConfirm | undefined {
  return useContext(LogoutContext);
}
