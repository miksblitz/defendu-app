// app/(auth)/login.tsx
import React, { useState } from 'react';
import { Image, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthController } from '../controllers/AuthController';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await AuthController.login({ email, password });
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
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
          style={styles.input}
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
          style={styles.input}
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#01151F',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 16,
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
    marginRight: 415,
  },
  forgotText: {
    color: '#00AABB',
    fontWeight: '600',
    fontSize: 14,
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
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bottomText: {
    color: '#FFF',
    fontSize: 14,
  },
  linkText: {
    color: '#00AABB',
    fontWeight: '700',
    fontSize: 14,
  },
});