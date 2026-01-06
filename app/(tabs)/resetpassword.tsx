import React, { useState } from 'react';
import { Image, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  return (
    <View style={styles.container}>
      {/* Logo Image */}
      <Image
        source={require('../../assets/images/defendulogo.png')}
        style={styles.logoImage}
      />

      <Text style={styles.title}>Reset your Password</Text>

      {/* Password */}
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
          secureTextEntry={!showPass}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPass(!showPass)}
          style={styles.eyeButton}
          activeOpacity={0.7}
        >
          <Image
            source={require('../../assets/images/showpasswordicon.png')}
            style={styles.eyeIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Confirm Password */}
      <View style={styles.inputWrapper}>
        <Image
          source={require('../../assets/images/passwordicon.png')}
          style={styles.iconImage}
        />
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
          <Image
            source={require('../../assets/images/showpasswordicon.png')}
            style={styles.eyeIcon}
          />
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
    tintColor: '#555',
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
    tintColor: '#555',
    resizeMode: 'contain',
  },
  button: {
    backgroundColor: '#00AABB',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    width: 300,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});