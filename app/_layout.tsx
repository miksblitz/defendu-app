// app/_layout.tsx
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { SkillProfileProvider } from './contexts/SkillProfileContext';

export default function RootLayout() {
  const router = useRouter();

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

  return (
    <SkillProfileProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </SkillProfileProvider>
  );
}