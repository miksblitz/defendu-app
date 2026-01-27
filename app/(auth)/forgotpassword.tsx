// app/(auth)/forgotpassword.tsx
import React, { useState } from 'react';
import { Image, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthController } from '../controllers/AuthController';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

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
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#01151F',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 56,
    marginBottom: 8,
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
    color: '#FFF',
    paddingVertical: 0,
    textAlignVertical: 'center',
    height: 56,
  },
  errorContainer: {
    width: 500,
    marginTop: -4,
    marginBottom: 16,
    paddingLeft: 15,
    alignSelf: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#00AABB',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
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