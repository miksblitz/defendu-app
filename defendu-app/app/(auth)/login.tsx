// app/(auth)/login.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { AuthController } from '../controllers/AuthController';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const styleId = 'defendu-login-password-eye-style';
    if (document.getElementById(styleId)) return;
    const el = document.createElement('style');
    el.id = styleId;
    el.textContent = `
      input::-ms-reveal,
      input::-ms-clear {
        display: none !important;
      }
    `;
    document.head.appendChild(el);
    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      showToast('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const user = await AuthController.login({ email, password });
      
      // Log user data for debugging
      console.log('🔵 Login - User role:', user.role);
      console.log('🔵 Login - User email:', user.email);
      console.log('🔵 Login - Full user object:', JSON.stringify(user, null, 2));
      
      // Check if user is admin - redirect to admin dashboard
      if (user.role === 'admin') {
        console.log('✅ Admin detected - redirecting to admin dashboard');
        router.replace('/(admin)/adminDashboard');
        return;
      }
      
      console.log('ℹ️ Non-admin user - checking skill profile status');
      
      // Check if user has completed skill profile
      if (!user.hasCompletedSkillProfile) {
        // Redirect to first skill profile question
        router.replace('/(tabs)/physicalAttributesQuestion');
      } else {
        // Redirect to dashboard
        router.replace('/(tabs)/dashboard');
      }
    } catch (error: any) {
      // Show specific toasts for common login issues.
      let errorMessage = 'Unable to sign in right now. Please try again.';
      
      if (error.message) {
        const msg = String(error.message).toLowerCase();
        if (msg.includes('blocked')) {
          errorMessage = 'This account has been blocked. Please contact support for details.';
        } else if (msg.includes('network') || msg.includes('internet') || msg.includes('wifi') || msg.includes('connection')) {
          errorMessage = 'No internet connection. Please check your Wi-Fi or mobile data and try again.';
        } else if (
          msg.includes('user-not-found') ||
          msg.includes('wrong-password') ||
          msg.includes('incorrect password') ||
          msg.includes('no account found') ||
          msg.includes('invalid credentials') ||
          msg.includes('invalid-credential')
        ) {
          errorMessage = 'Incorrect email or password. Please check your credentials and try again.';
        } else if (msg.includes('invalid-email')) {
          errorMessage = 'Invalid email format. Please check your email address.';
        } else if (msg.includes('too-many-requests')) {
          errorMessage = 'Too many login attempts. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }
      
      showToast(errorMessage);
    } finally {
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

      <Text style={styles.title}>Welcome Back!</Text>
      <Text style={styles.subtitle}>Your skills are waiting. Let's continue your training.</Text>

      {/* Email Input */}
      <View style={styles.inputWrapper}>
        <Ionicons name="mail-outline" size={20} color="#07bbc0" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
          placeholder="Enter your email"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={email}
          keyboardType="email-address"
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          editable={!loading}
        />
      </View>

      {/* Password Input */}
      <View style={styles.inputWrapper}>
        <Ionicons name="lock-closed-outline" size={20} color="#07bbc0" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
          placeholder="Enter your password"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={password}
          secureTextEntry={!showPassword}
          onChangeText={setPassword}
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          editable={!loading}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeButton}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {/* Forgot Password */}
      <View style={styles.forgotPasswordContainer}>
        <TouchableOpacity onPress={() => router.push('/forgotpassword')} disabled={loading}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        activeOpacity={0.8}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <View style={styles.bottomRow}>
        <Text style={styles.bottomText}>Don't Have an Account? </Text>
        <TouchableOpacity onPress={() => router.push('/register')} disabled={loading}>
          <Text style={styles.linkText}>Create an Account</Text>
        </TouchableOpacity>
      </View>
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
    width: 120,
    height: 130,
    alignSelf: 'center',
    marginBottom: 20,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 21,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#031220',
    borderRadius: 14,
    paddingHorizontal: 18,
    marginBottom: 14,
    height: 54,
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(7, 187, 192, 0.22)',
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    height: 54,
    color: '#FFF',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  eyeButton: {
    marginLeft: 10,
    padding: 6,
    borderRadius: 20,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 28,
    width: '100%',
  },
  forgotText: {
    color: '#07bbc0',
    fontWeight: '600',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#07bbc0',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
    cursor: 'pointer' as any,
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: '#041527',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  bottomText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  linkText: {
    color: '#07bbc0',
    fontWeight: '700',
    fontSize: 14,
  },
});