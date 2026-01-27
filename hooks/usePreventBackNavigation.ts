import { useRouter } from 'expo-router';
import { useEffect } from 'react';

/**
 * Custom hook to prevent users from navigating back from skill profile questions
 * Prevents browser back button on web platforms
 */
export function usePreventBackNavigation() {
  const router = useRouter();

  useEffect(() => {
    // For web, prevent browser back button
    if (typeof window !== 'undefined') {
      const handlePopState = () => {
        window.history.pushState(null, '', window.location.href);
      };

      window.addEventListener('popstate', handlePopState);
      window.history.pushState(null, '', window.location.href);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [router]);
}
