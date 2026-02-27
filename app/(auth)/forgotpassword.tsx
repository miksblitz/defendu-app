// app/(auth)/forgotpassword.tsx
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { AuthController } from '../controllers/AuthController';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();

  // Email validation function
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      return 'Email is required';
    }
    if (email.length > 254) {
      return 'Email is too long (max 254 characters)';
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address (e.g., user@domain.com)';
    }
    // Block admin email
    if (email.toLowerCase() === 'admin@defendu.com') {
      return 'This email is not available for password reset. Please contact support.';
    }
    return '';
  };

  // Handle email blur
  const handleEmailBlur = () => {
    const validationError = validateEmail(email);
    setError(validationError);
  };

  // Handle send button press
  const handleSend = async () => {
    const validationError = validateEmail(email);
    setError(validationError);

    if (validationError) {
      showToast(validationError);
      return;
    }

    // Double check admin email before sending
    if (email.toLowerCase() === 'admin@defendu.com') {
      showToast('This email is not available for password reset. Please contact support.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const message = await AuthController.forgotPassword({ email });
      showToast('Password reset email sent successfully! Please check your inbox.');
      
      // Navigate after a short delay to allow toast to be visible
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      showToast(error.message || 'Failed to send reset email. Please try again.');
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/defendulogo.png')}
        style={styles.logoImage}
      />

      <Text style={styles.title}>Forgot your password?</Text>
      <Text style={styles.subtitle}>We'll send a reset link to your email</Text>

      {/* Email Input */}
      <View style={styles.inputWrapper}>
        <Image
          source={require('../../assets/images/emailicon.png')}
          style={styles.iconImage}
        />
        <TextInput
          style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
          placeholder="Enter your email"
          placeholderTextColor="white"
          value={email}
          keyboardType="email-address"
          onChangeText={(text) => {
            setEmail(text);
            if (error) {
              setError('');
            }
          }}
          onBlur={handleEmailBlur}
          autoCapitalize="none"
          maxLength={254}
          editable={!loading}
        />
      </View>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        activeOpacity={0.8} 
        onPress={handleSend}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Send Reset Link</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={{ marginTop: 24 }} 
        onPress={() => router.push('/login')}
        disabled={loading}
      >
        <Text style={styles.backText}>← Back to Login</Text>
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
    paddingHorizontal: 32,
    justifyContent: 'center',
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  logoImage: {
    width: 140,
    height: 160,
    alignSelf: 'center',
    marginBottom: 24,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 26,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#01151F',
    borderRadius: 28,
    paddingHorizontal: 20,
    height: 56,
    marginBottom: 4,
    width: '100%',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconImage: {
    width: 22,
    height: 22,
    marginRight: 12,
    tintColor: 'rgba(255, 255, 255, 0.7)',
    resizeMode: 'contain',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
    paddingVertical: 0,
    textAlignVertical: 'center',
    height: 56,
  },
  errorContainer: {
    width: '100%',
    marginTop: 4,
    marginBottom: 16,
    paddingLeft: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#00AABB',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#00AABB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  backText: {
    color: '#00AABB',
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'center',
  },
});