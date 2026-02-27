// app/(auth)/login.tsx
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
      // Provide specific error messages for different login failures
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.message) {
        if (error.message.includes('blocked')) {
          errorMessage = 'This account has been blocked. Please contact support for details.';
        } else if (error.message.includes('user-not-found') || error.message.includes('No account found')) {
          errorMessage = 'Invalid credentials. No account found with this email.';
        } else if (error.message.includes('wrong-password') || error.message.includes('Incorrect password')) {
          errorMessage = 'Invalid credentials. Incorrect password.';
        } else if (error.message.includes('invalid-email')) {
          errorMessage = 'Invalid email format. Please check your email address.';
        } else if (error.message.includes('too-many-requests')) {
          errorMessage = 'Too many login attempts. Please try again later.';
        } else if (error.message.includes('network') || error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection.';
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
          onChangeText={setEmail}
          autoCapitalize="none"
          editable={!loading}
        />
      </View>

      {/* Password Input */}
      <View style={styles.inputWrapper}>
        <Image
          source={require('../../assets/images/passwordicon.png')}
          style={styles.iconImage}
        />
        <TextInput
          style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
          placeholder="Enter your password"
          placeholderTextColor="white"
          value={password}
          secureTextEntry={!showPassword}
          onChangeText={setPassword}
          editable={!loading}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
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
    width: 140,
    height: 160,
    alignSelf: 'center',
    marginBottom: 24,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
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
    marginBottom: 16,
    height: 56,
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
    lineHeight: 24,
    height: 56,
    color: '#FFF',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  eyeButton: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 20,
  },
  eyeIcon: {
    width: 22,
    height: 22,
    tintColor: 'rgba(255, 255, 255, 0.7)',
    resizeMode: 'contain',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 28,
    width: '100%',
  },
  forgotText: {
    color: '#00AABB',
    fontWeight: '600',
    fontSize: 14,
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
    color: '#00AABB',
    fontWeight: '700',
    fontSize: 14,
  },
});