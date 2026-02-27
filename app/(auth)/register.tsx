import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { AuthController } from '../controllers/AuthController';

export default function SignUpScreen() {
  const [form, setForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();

  // Name validation function (no numbers allowed)
  const validateName = (name: string, fieldName: string) => {
    if (!name) {
      return `${fieldName} is required`;
    }
    if (name.length < 2) {
      return `${fieldName} must be at least 2 characters long`;
    }
    if (name.length > 50) {
      return `${fieldName} is too long (max 50 characters)`;
    }
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(name)) {
      return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
    }
    return '';
  };

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
      return 'This email is not allowed. Please try a different one.';
    }
    return '';
  };

  // Password validation function
  const validatePassword = (password: string) => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (password.length > 128) {
      return 'Password is too long (max 128 characters)';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return '';
  };

  // Confirm password validation
  const validateConfirmPassword = (confirmPassword: string, password: string) => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    if (confirmPassword !== password) {
      return 'Passwords do not match';
    }
    return '';
  };

  // Handle first name blur
  const handleFirstNameBlur = () => {
    const error = validateName(form.firstName, 'First name');
    setErrors(prev => ({ ...prev, firstName: error }));
  };

  // Handle last name blur
  const handleLastNameBlur = () => {
    const error = validateName(form.lastName, 'Last name');
    setErrors(prev => ({ ...prev, lastName: error }));
  };

  // Handle email blur
  const handleEmailBlur = () => {
    const error = validateEmail(form.email);
    setErrors(prev => ({ ...prev, email: error }));
  };

  // Handle password blur
  const handlePasswordBlur = () => {
    const error = validatePassword(form.password);
    setErrors(prev => ({ ...prev, password: error }));
  };

  // Handle confirm password blur
  const handleConfirmPasswordBlur = () => {
    const error = validateConfirmPassword(form.confirmPassword, form.password);
    setErrors(prev => ({ ...prev, confirmPassword: error }));
  };

  // Handle form submission with Firebase
  const handleCreateAccount = async () => {
    // Validate all fields
    const firstNameError = validateName(form.firstName, 'First name');
    const lastNameError = validateName(form.lastName, 'Last name');
    const emailError = validateEmail(form.email);
    const passwordError = validatePassword(form.password);
    const confirmPasswordError = validateConfirmPassword(form.confirmPassword, form.password);

    setErrors({
      firstName: firstNameError,
      lastName: lastNameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    });

    // Check if there are any errors
    if (firstNameError || lastNameError || emailError || passwordError || confirmPasswordError) {
      showToast('Please fix the errors before submitting');
      return;
    }

    // Double check admin email before registering
    if (form.email.toLowerCase() === 'admin@defendu.com') {
      setErrors(prev => ({ ...prev, email: 'This email is not allowed. Please try a different one.' }));
      showToast('This email is not allowed. Please try a different one.');
      return;
    }

    // Check if username is filled
    if (!form.username) {
      showToast('Please enter a username');
      return;
    }

    // Register user with Firebase
    setLoading(true);
    try {
      await AuthController.register({
        email: form.email,
        password: form.password,
        username: form.username,
        firstName: form.firstName,
        lastName: form.lastName,
      });
      
      // Show success toast
      showToast('Account created successfully! Please complete your skill profile.');
      
      // Navigate after a short delay to allow toast to be visible
      setTimeout(() => {
        setLoading(false);
        router.replace('/(tabs)/physicalAttributesQuestion');
      }, 2000);
    } catch (error: any) {
      showToast(error.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Logo Image */}
      <Image
        source={require('../../assets/images/defendulogo.png')}
        style={styles.logoImage}
      />

      <Text style={styles.title}>Empower your safety.</Text>
      <Text style={styles.subtitle}>
        Create your account and start building lifesaving skills today.
      </Text>

      {/* Username */}
      <View style={styles.inputWrapper}>
        <Image
          source={require('../../assets/images/profileicon.png')}
          style={styles.iconImage}
        />
        <TextInput
          style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
          placeholder="Enter your username"
          placeholderTextColor="white"
          value={form.username}
          onChangeText={(text) => setForm((f) => ({ ...f, username: text }))}
          autoCapitalize="none"
          maxLength={50}
          editable={!loading}
        />
      </View>

      {/* First Name */}
      <View style={styles.inputWrapper}>
        <Image
          source={require('../../assets/images/profileicon.png')}
          style={styles.iconImage}
        />
        <TextInput
          style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
          placeholder="Enter your First Name"
          placeholderTextColor="white"
          value={form.firstName}
          onChangeText={(text) => {
            setForm((f) => ({ ...f, firstName: text }));
            if (errors.firstName) {
              setErrors(prev => ({ ...prev, firstName: '' }));
            }
          }}
          onBlur={handleFirstNameBlur}
          maxLength={50}
          editable={!loading}
        />
      </View>
      {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}

      {/* Last Name */}
      <View style={styles.inputWrapper}>
        <Image
          source={require('../../assets/images/profileicon.png')}
          style={styles.iconImage}
        />
        <TextInput
          style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
          placeholder="Enter your Last Name"
          placeholderTextColor="white"
          value={form.lastName}
          onChangeText={(text) => {
            setForm((f) => ({ ...f, lastName: text }));
            if (errors.lastName) {
              setErrors(prev => ({ ...prev, lastName: '' }));
            }
          }}
          onBlur={handleLastNameBlur}
          maxLength={50}
          editable={!loading}
        />
      </View>
      {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}

      {/* Email */}
      <View style={styles.inputWrapper}>
        <Image
          source={require('../../assets/images/emailicon.png')}
          style={styles.iconImage}
        />
        <TextInput
          style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
          placeholder="Enter your email"
          placeholderTextColor="white"
          value={form.email}
          onChangeText={(text) => {
            setForm((f) => ({ ...f, email: text }));
            if (errors.email) {
              setErrors(prev => ({ ...prev, email: '' }));
            }
          }}
          onBlur={handleEmailBlur}
          keyboardType="email-address"
          autoCapitalize="none"
          maxLength={254}
          editable={!loading}
        />
      </View>
      {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

      {/* Password */}
      <View style={styles.inputWrapper}>
        <Image
          source={require('../../assets/images/passwordicon.png')}
          style={styles.iconImage}
        />
        <TextInput
          style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
          placeholder="Enter your password"
          placeholderTextColor="white"
          value={form.password}
          secureTextEntry={!showPass}
          onChangeText={(text) => {
            setForm((f) => ({ ...f, password: text }));
            if (errors.password) {
              setErrors(prev => ({ ...prev, password: '' }));
            }
          }}
          onBlur={handlePasswordBlur}
          maxLength={128}
          editable={!loading}
        />
        <TouchableOpacity
          onPress={() => setShowPass(!showPass)}
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
      {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

      {/* Confirm Password */}
      <View style={styles.inputWrapper}>
        <Image
          source={require('../../assets/images/passwordicon.png')}
          style={styles.iconImage}
        />
        <TextInput
          style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
          placeholder="Re-type your password"
          placeholderTextColor="white"
          value={form.confirmPassword}
          secureTextEntry={!showConfirmPass}
          onChangeText={(text) => {
            setForm((f) => ({ ...f, confirmPassword: text }));
            if (errors.confirmPassword) {
              setErrors(prev => ({ ...prev, confirmPassword: '' }));
            }
          }}
          onBlur={handleConfirmPasswordBlur}
          maxLength={128}
          editable={!loading}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPass(!showConfirmPass)}
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
      {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        activeOpacity={0.8} 
        onPress={handleCreateAccount}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </TouchableOpacity>

      <View style={styles.bottomRow}>
        <Text style={styles.bottomText}>Already have an Account? </Text>
        <TouchableOpacity onPress={() => router.push('/login')} disabled={loading}>
          <Text style={styles.linkText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={hideToast}
        duration={3000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#041527',
  },
  container: {
    backgroundColor: '#041527',
    paddingHorizontal: 32,
    paddingVertical: 40,
    alignItems: 'center',
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  logoImage: {
    width: 140,
    height: 160,
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
    paddingHorizontal: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#01151F',
    borderRadius: 28,
    paddingHorizontal: 20,
    marginBottom: 4,
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
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    marginBottom: 12,
    marginTop: 4,
    width: '100%',
    paddingLeft: 20,
    paddingRight: 20,
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#00AABB',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
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