// app/(auth)/resetpassword.tsx
import React, { useState, useEffect } from 'react';
import { 
  Image, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ password: '', confirmPassword: '' });
  const [hasValidCode, setHasValidCode] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [tokenEmail, setTokenEmail] = useState<string | null>(null);
  const [oldPassword, setOldPassword] = useState<string | null>(null);
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const token = params.token as string; // Changed from oobCode to token
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();

  useEffect(() => {
    // Clear session data on mount to prevent back navigation
    const clearSession = async () => {
      try {
        // Sign out from Firebase Auth first
        try {
          await signOut(auth);
          console.log('✅ Signed out from Firebase Auth');
        } catch (authError) {
          console.log('⚠️ No active Firebase session to sign out');
        }

        // Clear AsyncStorage completely
        await AsyncStorage.clear();
        console.log('✅ Cleared AsyncStorage');

        // Clear web storage if on web
        if (typeof window !== 'undefined') {
          // Clear localStorage
          window.localStorage.clear();
          console.log('✅ Cleared localStorage');
          
          // Clear sessionStorage
          window.sessionStorage.clear();
          console.log('✅ Cleared sessionStorage');
          
          // Clear all cookies
          document.cookie.split(";").forEach((c) => {
            const cookieName = c.split("=")[0].trim();
            // Clear cookie for current domain
            document.cookie = `${cookieName}=;expires=${new Date(0).toUTCString()};path=/`;
            // Clear cookie for root domain
            document.cookie = `${cookieName}=;expires=${new Date(0).toUTCString()};path=/;domain=${window.location.hostname}`;
          });
          console.log('✅ Cleared cookies');

          // Replace current history entry to prevent back navigation
          window.history.replaceState(null, '', window.location.href);
          
          // Push a new state to prevent going back further
          window.history.pushState(null, '', window.location.href);
          
          console.log('✅ Reset browser history');
        }
      } catch (error) {
        console.error('❌ Error clearing session:', error);
      }
    };
    
    // Clear session immediately on mount
    clearSession();

    // Only check for token if params are loaded
    if (params && Object.keys(params).length > 0) {
      if (!token) {
        Alert.alert(
          'Invalid Link',
          'This password reset link is invalid or has expired. Please request a new one.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/forgotpassword'),
            },
          ]
        );
      } else {
        setHasValidCode(true);
        // Validate token with backend webhook
        validateToken(token);
      }
    }

    // Set up aggressive back navigation prevention on web
    let popstateHandler: ((e: PopStateEvent) => void) | null = null;
    let hashChangeHandler: (() => void) | null = null;
    
    if (typeof window !== 'undefined') {
      // Prevent back button navigation - redirect to login immediately
      popstateHandler = (e: PopStateEvent) => {
        // Push current state again to prevent navigation
        window.history.pushState(null, '', window.location.href);
        // Force redirect to login
        router.replace('/(auth)/login');
      };
      window.addEventListener('popstate', popstateHandler);

      // Also prevent hashchange (some browsers use this for navigation)
      hashChangeHandler = () => {
        window.history.pushState(null, '', window.location.href);
        router.replace('/(auth)/login');
      };
      window.addEventListener('hashchange', hashChangeHandler);
    }

    // Cleanup function
    return () => {
      if (typeof window !== 'undefined') {
        if (popstateHandler) {
          window.removeEventListener('popstate', popstateHandler);
        }
        if (hashChangeHandler) {
          window.removeEventListener('hashchange', hashChangeHandler);
        }
      }
    };
  }, [params, token, router]);

  // Validate token with backend API
  const validateToken = async (token: string) => {
    try {
      const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-api-domain.com';
      
      const response = await fetch(`${apiBaseUrl}/api/validate-reset-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (!response.ok || !result.valid) {
        Alert.alert(
          'Invalid or Expired Link',
          result.error || 'This password reset link is invalid or has expired. Please request a new one.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/forgotpassword'),
            },
          ]
        );
        return;
      }

      // Token is valid
      setTokenEmail(result.email);
      setTokenValidated(true);
      
      // Check time remaining
      const timeRemaining = result.timeRemaining; // milliseconds
      const minutesRemaining = Math.floor(timeRemaining / 60000);
      
      if (minutesRemaining < 1) {
        Alert.alert(
          'Link Expiring Soon',
          'This link will expire in less than a minute. Please reset your password now.',
        );
      }
    } catch (error: any) {
      console.error('Token validation error:', error);
      Alert.alert(
        'Validation Error',
        'Failed to validate reset link. Please try again or request a new link.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/forgotpassword'),
          },
        ]
      );
    }
  };

  // Password validation
  const validatePassword = (password: string) => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return '';
  };

  const validateConfirmPassword = (confirmPassword: string, password: string) => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    if (confirmPassword !== password) {
      return 'Passwords do not match';
    }
    return '';
  };

  const handlePasswordBlur = () => {
    const error = validatePassword(password);
    setErrors(prev => ({ ...prev, password: error }));
  };

  const handleConfirmPasswordBlur = () => {
    const error = validateConfirmPassword(confirmPassword, password);
    setErrors(prev => ({ ...prev, confirmPassword: error }));
  };

  const handleChangePassword = async () => {
    // Check if we have a valid token
    if (!token) {
      showToast('Invalid reset link. Please request a new password reset.');
      setTimeout(() => router.replace('/forgotpassword'), 2000);
      return;
    }

    // Validate both fields
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(confirmPassword, password);

    setErrors({
      password: passwordError,
      confirmPassword: confirmPasswordError,
    });

    if (passwordError || confirmPasswordError) {
      showToast('Please fix the errors before submitting');
      return;
    }

    // Validate token before proceeding
    if (!tokenValidated || !token) {
      showToast('Please wait for token validation to complete.');
      return;
    }

    // IMPORTANT: Client-side check - verify new password is different from current password
    // Attempt to sign in with the new password. If it succeeds, the password is the same.
    if (tokenEmail) {
      try {
        // Try to sign in with the new password
        const userCredential = await signInWithEmailAndPassword(auth, tokenEmail, password);
        
        // If sign-in succeeds, the password is the same - BLOCK IT
        // Sign out immediately to prevent unwanted login
        await signOut(auth);
        
        const errorMsg = 'New password must be different from your current password. Please choose a different password.';
        setErrors(prev => ({ ...prev, password: 'Password must be different from your current password' }));
        showToast(errorMsg);
        return;
      } catch (signInError: any) {
        // Sign-in failed - check the error type
        const errorCode = signInError?.code || '';
        const errorMessage = signInError?.message || '';
        
        // If error is "wrong-password" or "invalid-credential", that's GOOD - password is different
        if (
          errorCode.includes('wrong-password') || 
          errorCode.includes('invalid-credential') ||
          errorCode.includes('auth/wrong-password') ||
          errorCode.includes('auth/invalid-credential')
        ) {
          // Password is different - this is what we want, proceed with reset
          console.log('✅ Client-side check: Password is different from current password');
        } else if (
          errorCode.includes('user-not-found') ||
          errorCode.includes('auth/user-not-found')
        ) {
          // User not found - this shouldn't happen if token is valid, but proceed anyway
          console.log('⚠️ Client-side check: User not found (unexpected)');
        } else {
          // Other errors - log but proceed (might be network issues, etc.)
          console.log('⚠️ Client-side check error:', errorCode, errorMessage);
        }
      }
    }

    setLoading(true);
    try {
      // Confirm password reset via backend API
      const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-api-domain.com';
      
      const response = await fetch(`${apiBaseUrl}/api/confirm-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          newPassword: password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Check for specific error messages
        let errorMessage = result.error || 'Failed to reset password';
        
        // Check for password same as current password error
        if (
          errorMessage.toLowerCase().includes('same') || 
          errorMessage.toLowerCase().includes('previous') || 
          errorMessage.toLowerCase().includes('current') ||
          errorMessage.toLowerCase().includes('different')
        ) {
          errorMessage = 'New password must be different from your current password. Please choose a different password.';
          // Set error on password field to highlight it
          setErrors(prev => ({ ...prev, password: 'Password must be different from your current password' }));
        } else if (errorMessage.includes('expired')) {
          errorMessage = 'This reset link has expired. Please request a new one.';
        } else if (errorMessage.includes('invalid') || errorMessage.includes('used')) {
          errorMessage = 'This reset link is invalid or has already been used. Please request a new one.';
        } else if (errorMessage.includes('weak')) {
          errorMessage = 'Password is too weak. Please choose a stronger password.';
        }
        
        throw new Error(errorMessage);
      }
      
      // Clear all session data comprehensively after password reset
      try {
        // Sign out from Firebase Auth first
        try {
          await signOut(auth);
          console.log('✅ Signed out from Firebase Auth after password reset');
        } catch (authError) {
          console.log('⚠️ No active Firebase session to sign out');
        }

        // Clear AsyncStorage completely
        await AsyncStorage.clear();
        console.log('✅ Cleared AsyncStorage after password reset');

        // Clear web storage if on web
        if (typeof window !== 'undefined') {
          // Clear localStorage
          window.localStorage.clear();
          console.log('✅ Cleared localStorage after password reset');
          
          // Clear sessionStorage
          window.sessionStorage.clear();
          console.log('✅ Cleared sessionStorage after password reset');
          
          // Clear all cookies comprehensively
          document.cookie.split(";").forEach((c) => {
            const cookieName = c.split("=")[0].trim();
            // Clear cookie for current domain
            document.cookie = `${cookieName}=;expires=${new Date(0).toUTCString()};path=/`;
            // Clear cookie for root domain
            document.cookie = `${cookieName}=;expires=${new Date(0).toUTCString()};path=/;domain=${window.location.hostname}`;
          });
          console.log('✅ Cleared cookies after password reset');

          // Aggressively reset browser history
          window.history.replaceState(null, '', window.location.href);
          window.history.pushState(null, '', window.location.href);
          console.log('✅ Reset browser history after password reset');
        }
      } catch (error) {
        console.error('❌ Error clearing session after password reset:', error);
      }

      // Show success toast
      showToast('Password reset successfully! Redirecting to login...');
      
      // Navigate to login after a short delay and prevent back navigation
      setTimeout(() => {
        setLoading(false);
        router.dismissAll();
        
        // Final history manipulation to prevent back navigation
        if (typeof window !== 'undefined' && window.history) {
          // Replace current history entry
          window.history.replaceState(null, '', window.location.href);
          // Push login page state
          window.history.pushState(null, '', '/(auth)/login');
          
          // Set up popstate handler to prevent going back
          const preventBack = () => {
            window.history.pushState(null, '', '/(auth)/login');
            router.replace('/(auth)/login');
          };
          window.addEventListener('popstate', preventBack);
          
          // Remove the handler after a short delay to avoid memory leaks
          setTimeout(() => {
            window.removeEventListener('popstate', preventBack);
          }, 1000);
        }
        
        // Use replace to prevent going back to reset password page
        router.replace('/(auth)/login');
      }, 2000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      showToast(error.message || 'Failed to reset password. Please try again.');
      setLoading(false);
    }
  };

  // Show loading state while checking for code or validating token
  if (!hasValidCode && (!params || Object.keys(params).length === 0)) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00AABB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (hasValidCode && !tokenValidated) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00AABB" />
        <Text style={styles.loadingText}>Validating reset link...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/defendulogo.png')}
        style={styles.logoImage}
      />

      <Text style={styles.title}>Reset your Password</Text>
      <Text style={styles.subtitle}>Create a strong, secure password</Text>

      {/* Password */}
      <View style={styles.inputWrapper}>
        <Image
          source={require('../../assets/images/passwordicon.png')}
          style={styles.iconImage}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter your new password"
          placeholderTextColor="white"
          value={password}
          secureTextEntry={!showPass}
          onChangeText={(text) => {
            setPassword(text);
            if (errors.password) {
              setErrors(prev => ({ ...prev, password: '' }));
            }
          }}
          onBlur={handlePasswordBlur}
          maxLength={128}
          editable={!loading}
        />
        <TouchableOpacity
          onPress={() => setShowPass(!showPass)}
          style={styles.eyeButton}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Image
            source={require('../../assets/images/showpasswordicon.png')}
            style={styles.eyeIcon}
          />
        </TouchableOpacity>
      </View>
      {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

      {/* Confirm Password */}
      <View style={styles.inputWrapper}>
        <Image
          source={require('../../assets/images/passwordicon.png')}
          style={styles.iconImage}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm your new password"
          placeholderTextColor="white"
          value={confirmPassword}
          secureTextEntry={!showConfirmPass}
          onChangeText={(text) => {
            setConfirmPassword(text);
            if (errors.confirmPassword) {
              setErrors(prev => ({ ...prev, confirmPassword: '' }));
            }
          }}
          onBlur={handleConfirmPasswordBlur}
          maxLength={128}
          editable={!loading}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPass(!showConfirmPass)}
          style={styles.eyeButton}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Image
            source={require('../../assets/images/showpasswordicon.png')}
            style={styles.eyeIcon}
          />
        </TouchableOpacity>
      </View>
      {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        activeOpacity={0.8}
        onPress={handleChangePassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Change Password</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={{ marginTop: 24 }} 
        onPress={() => router.replace('/forgotpassword')}
        disabled={loading}
      >
        <Text style={styles.backText}>← Request New Reset Link</Text>
      </TouchableOpacity>
      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={hideToast}
        duration={3000}
      />
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#041527',
  },
  container: {
    flex: 1,
    backgroundColor: '#041527',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoImage: {
    width: 160,
    height: 180,
    alignSelf: 'center',
    marginBottom: 16,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#01151F',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 8,
    height: 56,
    width: 500,
    alignSelf: 'center',
  },
  iconImage: {
    width: 20,
    height: 20,
    marginRight: 10,
    tintColor: '#FFF',
    resizeMode: 'contain',
  },
  input: {
    flex: 1,
    fontSize: 20,
    lineHeight: 24,
    height: 56,
    color: '#FFF',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  eyeButton: {
    marginLeft: 12,
  },
  eyeIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFF',
    resizeMode: 'contain',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginBottom: 12,
    marginTop: -4,
    width: 500,
    paddingLeft: 15,
    alignSelf: 'center',
  },
  button: {
    backgroundColor: '#00AABB',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    width: 300,
    alignSelf: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  backText: {
    color: '#00AABB',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
});