// app/_layout.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { AppState, AppStateStatus, StyleSheet, Text, TextInput } from 'react-native';
import {
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
  useFonts,
} from '@expo-google-fonts/poppins';
import { SkillProfileProvider } from './contexts/SkillProfileContext';
import { LogoutProvider } from './contexts/LogoutContext';
import { UnreadMessagesProvider } from './contexts/UnreadMessagesContext';
import { AuthController } from './controllers/AuthController';
import BlockedUserModal from '../components/BlockedUserModal';

SplashScreen.preventAutoHideAsync().catch(() => {});

declare global {
  var __defenduPoppinsApplied: boolean | undefined;
}

export default function RootLayout() {
  const router = useRouter();
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
  });

  const ready = fontsLoaded || !!fontError;

  const poppinsMap = useMemo(() => {
    return {
      '300': 'Poppins_300Light',
      '400': 'Poppins_400Regular',
      '500': 'Poppins_500Medium',
      '600': 'Poppins_600SemiBold',
      '700': 'Poppins_700Bold',
      '800': 'Poppins_800ExtraBold',
      '900': 'Poppins_900Black',
      regular: 'Poppins_400Regular',
    } as const;
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (!global.__defenduPoppinsApplied) {
      global.__defenduPoppinsApplied = true;

      const baseTextRender = (Text as any).render;
      const baseInputRender = (TextInput as any).render;

      const patchStyleWithPoppins = (style: any) => {
        const flat = StyleSheet.flatten(style) || {};
        const fwRaw = flat.fontWeight;
        const fw = typeof fwRaw === 'string' ? fwRaw : typeof fwRaw === 'number' ? String(fwRaw) : '';

        // Pick a family based on existing weight, but keep the original weight value
        // so the "look" stays the same for components that rely on it.
        const family =
          fw === '900'
            ? poppinsMap['900']
            : fw === '800'
              ? poppinsMap['800']
              : fw === '700' || fw === 'bold'
                ? poppinsMap['700']
                : fw === '600'
                  ? poppinsMap['600']
                  : fw === '500'
                    ? poppinsMap['500']
                    : fw === '300'
                      ? poppinsMap['300']
                      : poppinsMap.regular;

        // If a component explicitly set another fontFamily, respect it.
        if (flat.fontFamily) return style;

        // Always return a flattened object to avoid style arrays leaking into
        // raw DOM nodes on web (which can crash with indexed CSS properties).
        return StyleSheet.flatten([style, { fontFamily: family }]);
      };

      (Text as any).render = function render(...args: any[]) {
        const origin = baseTextRender.call(this, ...args);
        const props = origin?.props || {};
        const nextStyle = patchStyleWithPoppins(props.style);
        return {
          ...origin,
          props: {
            ...props,
            style: nextStyle,
          },
        };
      };

      (TextInput as any).render = function render(...args: any[]) {
        const origin = baseInputRender.call(this, ...args);
        const props = origin?.props || {};
        const nextStyle = patchStyleWithPoppins(props.style);
        return {
          ...origin,
          props: {
            ...props,
            style: nextStyle,
          },
        };
      };
    }

    SplashScreen.hideAsync().catch(() => {});
  }, [ready, poppinsMap]);

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

  // Keep users/{uid}/lastActive fresh while the app is in the foreground so
  // admin analytics (active users/trainers online) reflect real-time mobile activity.
  useEffect(() => {
    const HEARTBEAT_MS = 60 * 1000; // 1 minute
    let interval: ReturnType<typeof setInterval> | null = null;

    const startHeartbeat = () => {
      if (interval) return;
      // Fire once immediately so status catches up on resume/mount.
      AuthController.updateLastActive();
      interval = setInterval(() => {
        AuthController.updateLastActive();
      }, HEARTBEAT_MS);
    };

    const stopHeartbeat = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    if (AppState.currentState === 'active') {
      startHeartbeat();
    }

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        startHeartbeat();
      } else {
        stopHeartbeat();
      }
    });

    return () => {
      stopHeartbeat();
      sub.remove();
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

  if (!ready) {
    // Keep splash screen visible while fonts load.
    return null;
  }

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