import React, { useState } from 'react';
import { Image, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  // Email validation function
  const validateEmail = (email: string) => {
    // Basic email regex: checks for @ symbol and domain
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
    return '';
  };

  // Handle email blur (when user leaves the field)
  const handleEmailBlur = () => {
    const validationError = validateEmail(email);
    setError(validationError);
  };

  // Handle send button press
  const handleSend = () => {
    const validationError = validateEmail(email);
    setError(validationError);

    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    // If validation passes, proceed with sending reset code
    Alert.alert('Success', 'A password reset code has been sent to your email');
    // Add your password reset logic here
    // router.push('/verificationcode'); // Navigate to verification screen if needed
  };

  return (
    <View style={styles.container}>
      {/* Logo Image */}
      <Image
        source={require('../../assets/images/defendulogo.png')}
        style={styles.logoImage}
      />

      <Text style={styles.title}>Forgot your password and Continue</Text>
      <Text style={styles.subtitle}>We'll send a code to your email</Text>

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
          onChangeText={(text) => {
            setEmail(text);
            // Clear error when user starts typing
            if (error) {
              setError('');
            }
          }}
          onBlur={handleEmailBlur}
          autoCapitalize="none"
          maxLength={254}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={handleSend}>
        <Text style={styles.buttonText}>Send</Text>
      </TouchableOpacity>

      <TouchableOpacity style={{ marginTop: 24 }} onPress={() => router.push('/login')}>
        <Text style={styles.backText}>← Back to Login</Text>
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
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginBottom: 16,
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
    marginBottom: 20,
    width: 300,
    alignSelf: 'center',
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