// hooks/useToast.ts
import { useState, useCallback } from 'react';

export function useToast() {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isShowing, setIsShowing] = useState(false);

  const showToast = useCallback((message: string) => {
    // Prevent spam - only show if not currently showing
    if (isShowing) {
      return;
    }

    setIsShowing(true);
    setToastMessage(message);
    setToastVisible(true);
  }, [isShowing]);

  const hideToast = useCallback(() => {
    setToastVisible(false);
    // Small delay before allowing next toast
    setTimeout(() => {
      setIsShowing(false);
    }, 100);
  }, []);

  return {
    toastVisible,
    toastMessage,
    showToast,
    hideToast,
  };
}
