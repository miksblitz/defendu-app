// app/_layout.tsx
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    console.log('🚀 Root Layout Mounted - Setting up deep linking');

    const handleDeepLink = (event: { url: string }) => {
      console.log('📱 Deep link received:', event.url);
      
      try {
        const { hostname, path, queryParams } = Linking.parse(event.url);
        
        console.log('🔍 Parsed URL:', { 
          hostname, 
          path, 
          queryParams 
        });

        // Check if it's a Firebase auth action
        if (path?.includes('auth/action') || path === '__/auth/action') {
          const mode = queryParams?.mode as string;
          const oobCode = queryParams?.oobCode as string;

          console.log('🔐 Auth action detected:', { mode, oobCode });

          if (mode === 'resetPassword' && oobCode) {
            console.log('✅ Navigating to reset password with code:', oobCode);
            
            // Small delay to ensure router is ready
            setTimeout(() => {
              router.push(`/resetpassword?oobCode=${oobCode}`);
            }, 100);
          }
        }
        // Also handle direct resetpassword links
        else if (path === 'resetpassword' && queryParams?.oobCode) {
          const oobCode = queryParams.oobCode as string;
          console.log('✅ Direct reset password link with code:', oobCode);
          
          setTimeout(() => {
            router.push(`/resetpassword?oobCode=${oobCode}`);
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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}