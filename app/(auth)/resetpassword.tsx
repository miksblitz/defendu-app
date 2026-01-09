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
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const token = params.token as string; // Changed from oobCode to token

  useEffect(() => {
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
  }, [params, token]);

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
      Alert.alert('Error', 'Invalid reset link. Please request a new password reset.');
      router.replace('/forgotpassword');
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
      Alert.alert('Validation Error', 'Please fix the errors before submitting');
      return;
    }

    // Validate token before proceeding
    if (!tokenValidated || !token) {
      Alert.alert('Error', 'Please wait for token validation to complete.');
      return;
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
        throw new Error(result.error || 'Failed to reset password');
      }
      
      Alert.alert(
        'Success! 🎉',
        'Your password has been reset successfully! You can now log in with your new password.',
        [
          {
            text: 'Go to Login',
            onPress: () => router.replace('/login'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to reset password';
      
      if (error.message.includes('expired')) {
        errorMessage = 'This reset link has expired. Please request a new one.';
      } else if (error.message.includes('invalid') || error.message.includes('used')) {
        errorMessage = 'This reset link is invalid or has already been used. Please request a new one.';
      } else if (error.message.includes('weak')) {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else {
        errorMessage = error.message || 'Failed to reset password. Please try again.';
      }
      
      Alert.alert('Error', errorMessage, [
        {
          text: 'Request New Link',
          onPress: () => router.replace('/forgotpassword'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]);
    } finally {
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
        onPress={() => router.push('/forgotpassword')}
        disabled={loading}
      >
        <Text style={styles.backText}>← Request New Reset Link</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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