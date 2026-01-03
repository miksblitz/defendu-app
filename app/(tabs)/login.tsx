import React, { useState } from 'react';
import { Image } from 'react-native';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  return (
    <View style={styles.container}>
      {/* Placeholder for Logo */}
      <View style={styles.logoPlaceholder}>
        <Text style={styles.logoText}>LOGO</Text>
      </View>

      <Text style={styles.title}>Welcome Back!</Text>
      <Text style={styles.subtitle}>Your skills are waiting. Let's continue your training.</Text>

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

      {/* Password Input */}
      <View style={styles.inputWrapper}>
        <View style={styles.iconPlaceholder}>
          <Text style={styles.iconText}>🔒</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="white"
          value={password}
          secureTextEntry={!showPassword}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeButton}
          activeOpacity={0.7}
        >
          <Text style={styles.iconText}>{showPassword ? '👁️' : '🚫'}</Text>
        </TouchableOpacity>
      </View>

      {/* Remember me & Forgot Password */}
      <View style={styles.rowBetween}>
        <View style={styles.rememberRow}>
          <Switch
            value={remember}
            onValueChange={setRemember}
            thumbColor="#00AABB"
            trackColor={{ true: '#007f91', false: '#444' }}
          />
          <Text style={styles.rememberText}>Remember me</Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <View style={styles.bottomRow}>
        <Text style={styles.bottomText}>Don't Have an Account? </Text>
        <TouchableOpacity>
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
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
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
    marginBottom: 16,
    height: 56,
    width: 500,          // narrower width (adjust as needed)
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
    fontSize: 20,                 // increased font size for text height
    lineHeight: 24,               // increased lineHeight for vertical spacing
    height: 56,                  // match inputWrapper height
    color: '#FFF',
    paddingVertical: 0,           // no padding vertically for better centering
    textAlignVertical: 'center', // vertical align text on Android
  },
  eyeButton: {
    marginLeft: 12,
  },
 rowBetween: {
  flexDirection: 'row',
  justifyContent: 'center',  // center horizontally
  alignItems: 'center',
  marginBottom: 24,
  gap: 230,                   // space between remember me and forgot password
},
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,               // some spacing between remember and forgot
  },
  rememberText: {
    color: '#AAA',
    marginLeft: 8,
    fontSize: 14,
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
    color: '#777',
    fontSize: 14,
  },
  linkText: {
    color: '#00AABB',
    fontWeight: '700',
    fontSize: 14,
  },
});