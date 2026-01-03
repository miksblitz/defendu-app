import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function SignUpScreen() {
  const [form, setForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Placeholder for Logo */}
      <View style={styles.logoPlaceholder}>
        <Text style={styles.logoText}>LOGO</Text>
      </View>

      <Text style={styles.title}>Empower your safety.</Text>
      <Text style={styles.subtitle}>
        Create your account and start building lifesaving skills today.
      </Text>

      {/* Username */}
      <View style={styles.inputWrapper}>
        <View style={styles.iconPlaceholder}>
          <Text style={styles.iconText}>👤</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Enter your username"
          placeholderTextColor="white"
          value={form.username}
          onChangeText={(text) => setForm((f) => ({ ...f, username: text }))}
          autoCapitalize="none"
        />
      </View>

      {/* First Name */}
      <View style={styles.inputWrapper}>
        <View style={styles.iconPlaceholder}>
          <Text style={styles.iconText}>👤</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Enter your First Name"
          placeholderTextColor="white"
          value={form.firstName}
          onChangeText={(text) => setForm((f) => ({ ...f, firstName: text }))}
        />
      </View>

      {/* Last Name */}
      <View style={styles.inputWrapper}>
        <View style={styles.iconPlaceholder}>
          <Text style={styles.iconText}>👤</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Enter your Last Name"
          placeholderTextColor="white"
          value={form.lastName}
          onChangeText={(text) => setForm((f) => ({ ...f, lastName: text }))}
        />
      </View>

      {/* Email */}
      <View style={styles.inputWrapper}>
        <View style={styles.iconPlaceholder}>
          <Text style={styles.iconText}>📧</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="white"
          value={form.email}
          onChangeText={(text) => setForm((f) => ({ ...f, email: text }))}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Password */}
      <View style={styles.inputWrapper}>
        <View style={styles.iconPlaceholder}>
          <Text style={styles.iconText}>🔒</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="white"
          value={form.password}
          secureTextEntry={!showPass}
          onChangeText={(text) => setForm((f) => ({ ...f, password: text }))}
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
          placeholder="Re-type your password"
          placeholderTextColor="white"
          value={form.confirmPassword}
          secureTextEntry={!showConfirmPass}
          onChangeText={(text) => setForm((f) => ({ ...f, confirmPassword: text }))}
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
        <Text style={styles.buttonText}>Create Account</Text>
      </TouchableOpacity>

      <View style={styles.bottomRow}>
        <Text style={styles.bottomText}>Already have an Account? </Text>
        <TouchableOpacity>
          <Text style={styles.linkText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#041527',
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 80,
    height: 100,
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
    width: 500,     // Matches login input width
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
    fontSize: 20,                 // Matches login input font size
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
    marginBottom: 20,
    width: 300,   // Matches login button width
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