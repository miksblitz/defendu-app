import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');

  return (
    <View style={styles.container}>
      {/* Placeholder for Logo */}
      <View style={styles.logoPlaceholder}>
        <Text style={styles.logoText}>LOGO</Text>
      </View>

      <Text style={styles.title}>Forgot your password and Continue</Text>
      <Text style={styles.subtitle}>We'll send a code to your email</Text>

      {/* Email Input */}
      <View style={styles.inputWrapper}>
        <View style={styles.iconPlaceholder}>
          <Text style={styles.iconText}>📧</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="white"
          value={email}
          keyboardType="email-address"
          onChangeText={setEmail}
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity style={styles.button} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Send</Text>
      </TouchableOpacity>

      <TouchableOpacity style={{ marginTop: 24 }}>
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
  logoPlaceholder: {
    width: 80,
    height: 100,
    alignSelf: 'center',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#00AABB',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 4,
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
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#01151F',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 56,              // matched height
    marginBottom: 24,
    width: 500,              // matched width to other screens
    alignSelf: 'center',
  },
  iconPlaceholder: {
    width: 20,
    alignItems: 'center',
    marginRight: 10,
  },
  iconText: {
    color: '#555',
    fontSize: 16,
  },
  input: {
    flex: 1,
    fontSize: 20,            // matched font size for vertical consistency
    color: '#FFF',
    paddingVertical: 0,
    textAlignVertical: 'center',
    height: 56,
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