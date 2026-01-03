import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  return (
    <View style={styles.container}>
      {/* Placeholder for Logo */}
      <View style={styles.logoPlaceholder}>
        <Text style={styles.logoText}>LOGO</Text>
      </View>

      <Text style={styles.title}>Reset your Password</Text>

      {/* Password */}
      <View style={styles.inputWrapper}>
        <View style={styles.iconPlaceholder}>
          <Text style={styles.iconText}>🔒</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="white"
          value={password}
          secureTextEntry={!showPass}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPass(!showPass)}
          style={styles.eyeButton}
          activeOpacity={0.7}
        >
          <Text style={styles.iconText}>{showPass ? '👁️' : '🚫'}</Text>
        </TouchableOpacity>
      </View>

      {/* Confirm Password */}
      <View style={styles.inputWrapper}>
        <View style={styles.iconPlaceholder}>
          <Text style={styles.iconText}>🔒</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Confirm your password"
          placeholderTextColor="white"
          value={confirmPassword}
          secureTextEntry={!showConfirmPass}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPass(!showConfirmPass)}
          style={styles.eyeButton}
          activeOpacity={0.7}
        >
          <Text style={styles.iconText}>{showConfirmPass ? '👁️' : '🚫'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Change Password</Text>
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
    fontSize: 24,
    fontWeight: '700',
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
    width: 500,       // Matches Login/SignUp input width
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
    fontSize: 20,         // Matches Login/SignUp input font size
    lineHeight: 24,
    height: 56,
    color: '#FFF',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  eyeButton: {
    marginLeft: 12,
  },
  button: {
    backgroundColor: '#00AABB',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    width: 300,          // Matches Login/SignUp button width
    alignSelf: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});