// app/_layout.tsx
import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { SkillProfileProvider } from './contexts/SkillProfileContext';
import { LogoutProvider } from './contexts/LogoutContext';
import { UnreadMessagesProvider } from './contexts/UnreadMessagesContext';
import { AuthController } from './controllers/AuthController';
import BlockedUserModal from '../components/BlockedUserModal';

export default function RootLayout() {
  const router = useRouter();
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  useEffect(() => {
    console.log('🚀 Root Layout Mounted - Setting up deep linking');

    const handleDeepLink = (event: { url: string }) => {
      console.log('📱 Deep link received:', event.url);
      
      try {
        const { scheme, hostname, path, queryParams } = Linking.parse(event.url);
        
        console.log('🔍 Parsed URL:', { 
          scheme,
          hostname, 
          path, 
          queryParams 
        });

        // Handle custom app scheme: defenduapp://resetpassword?token=...
        if (scheme === 'defenduapp' && path === 'resetpassword') {
          const token = queryParams?.token as string;
          console.log('✅ Custom app scheme - reset password with token:', token?.substring(0, 8) + '...');
          
          if (token) {
            setTimeout(() => {
              router.push(`/resetpassword?token=${token}`);
            }, 100);
            return;
          }
        }

        // Also handle direct resetpassword links with token
        if (path === 'resetpassword' && queryParams?.token) {
          const token = queryParams.token as string;
          console.log('✅ Direct reset password link with token:', token?.substring(0, 8) + '...');
          
          setTimeout(() => {
            router.push(`/resetpassword?token=${token}`);
          }, 100);
        }

        // Handle top-up payment success: defenduapp://wallet?status=success&credits=N
        if (
          (scheme === 'defenduapp' && (hostname === 'wallet' || path === 'wallet')) &&
          queryParams?.status === 'success'
        ) {
          console.log('✅ Payment success deep link received');
          setTimeout(async () => {
            try {
              const { WalletController } = await import('./controllers/WalletController');
              const transactions = await WalletController.getTransactions(1);
              const latest = transactions[0];
              if (latest && latest.type === 'top_up') {
                router.replace({
                  pathname: '/(tabs)/topup-invoice',
                  params: {
                    transactionId: latest.transactionId ?? '',
                    credits: String(latest.amount ?? queryParams?.credits ?? 0),
                    phpAmount: String(latest.phpAmount ?? 0),
                    balanceAfter: String(latest.balanceAfter ?? 0),
                    paymentMethod: latest.paymentMethod ?? '',
                    createdAt: String(latest.createdAt ?? Date.now()),
                  },
                });
              } else {
                router.replace('/(tabs)/wallet');
              }
            } catch (e) {
              console.error('Failed to fetch transaction after top-up:', e);
              router.replace('/(tabs)/wallet');
            }
          }, 300);
          return;
        }
      } catch (error) {
        console.error('❌ Error parsing deep link:', error);
      }
    };

    // Listen for incoming deep links while app is open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🚀 App opened with initial URL:', url);
        handleDeepLink({ url });
      } else {
        console.log('ℹ️ No initial URL');
      }
    });

    return () => {
      console.log('🔴 Removing deep link listener');
      subscription.remove();
    };
  }, []);

  // Set up real-time listener for blocked status
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const setupBlockedListener = async () => {
      try {
        const currentUser = await AuthController.getCurrentUser();
        if (currentUser && currentUser.uid) {
          // Set up real-time listener for blocked status
          cleanup = AuthController.setupBlockedStatusListener(
            currentUser.uid,
            () => {
              console.log('⚠️ User blocked - showing modal');
              setShowBlockedModal(true);
            }
          );
        }
      } catch (error) {
        console.error('Error setting up blocked listener:', error);
      }
    };

    setupBlockedListener();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  return (
    <SkillProfileProvider>
      <LogoutProvider>
        <UnreadMessagesProvider>
          <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="+not-found" />
        </Stack>
        </UnreadMessagesProvider>
        <BlockedUserModal
          visible={showBlockedModal}
          onDismiss={() => setShowBlockedModal(false)}
        />
      </LogoutProvider>
    </SkillProfileProvider>
  );
}