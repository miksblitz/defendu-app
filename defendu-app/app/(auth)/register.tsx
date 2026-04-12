import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { AuthController } from '../controllers/AuthController';

const INPUT_BG = '#031220';

/** Extra DOM props on web to discourage password managers / autofill heuristics. */
const webNoAutofill = (field: string) =>
  Platform.OS === 'web'
    ? ({
        spellCheck: false,
        name: `defendu-reg-${field}`,
        'data-lpignore': 'true',
        'data-1p-ignore': 'true',
        'data-bwignore': 'true',
        'data-form-type': 'other',
      } as Record<string, unknown>)
    : {};

export default function SignUpScreen() {
  const [form, setForm] = useState({
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

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const id = 'defendu-register-no-autofill-style';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = `
      #defendu-register-root input:-webkit-autofill,
      #defendu-register-root input:-webkit-autofill:hover,
      #defendu-register-root input:-webkit-autofill:focus,
      #defendu-register-root input:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 1000px ${INPUT_BG} inset !important;
        box-shadow: 0 0 0 1000px ${INPUT_BG} inset !important;
        -webkit-text-fill-color: #ffffff !important;
        caret-color: #ffffff;
        transition: background-color 99999s ease-out 0s;
      }
    `;
    document.head.appendChild(el);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, []);

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
    const nameRegex = /^[\p{L}\p{M}\s'.,·-]+$/u;
    if (!nameRegex.test(name)) {
      return `${fieldName} can only contain letters (including accents), spaces, and common punctuation`;
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

  // TEMPORARY: create account immediately (OTP / email verification disabled). Re-enable OTP by restoring register-send-otp + verificationcode flow.
  const handleCreateAccount = async () => {
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

    if (firstNameError || lastNameError || emailError || passwordError || confirmPasswordError) {
      showToast('Please fix the errors before submitting');
      return;
    }

    if (form.email.toLowerCase() === 'admin@defendu.com') {
      setErrors(prev => ({ ...prev, email: 'This email is not allowed.' }));
      return;
    }

    setLoading(true);
    try {
      await AuthController.register({
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
      try {
        await AuthController.logout();
      } catch (signOutErr) {
        console.error('Post-registration sign-out failed:', signOutErr);
      }
      showToast('Account created. Please sign in.');
      router.replace('/(auth)/login');
    } catch (error: any) {
      showToast(error?.message || 'Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper} {...(Platform.OS === 'web' ? ({ id: 'defendu-register-root' } as any) : {})}>
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

      {/* First Name */}
      <View style={styles.inputWrapper}>
        <Ionicons name="person-outline" size={20} color="#07bbc0" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
          placeholder="Enter your First Name"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={form.firstName}
          onChangeText={(text) => {
            setForm((f) => ({ ...f, firstName: text }));
            if (errors.firstName) {
              setErrors(prev => ({ ...prev, firstName: '' }));
            }
          }}
          onBlur={handleFirstNameBlur}
          maxLength={50}
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          editable={!loading}
          {...(webNoAutofill('firstname') as any)}
        />
      </View>
      {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}

      {/* Last Name */}
      <View style={styles.inputWrapper}>
        <Ionicons name="person-outline" size={20} color="#07bbc0" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
          placeholder="Enter your Last Name"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={form.lastName}
          onChangeText={(text) => {
            setForm((f) => ({ ...f, lastName: text }));
            if (errors.lastName) {
              setErrors(prev => ({ ...prev, lastName: '' }));
            }
          }}
          onBlur={handleLastNameBlur}
          maxLength={50}
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          editable={!loading}
          {...(webNoAutofill('lastname') as any)}
        />
      </View>
      {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}

      {/* Email */}
      <View style={styles.inputWrapper}>
        <Ionicons name="mail-outline" size={20} color="#07bbc0" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
          placeholder="Enter your email"
          placeholderTextColor="rgba(255,255,255,0.4)"
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
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          editable={!loading}
          {...(webNoAutofill('email') as any)}
        />
      </View>
      {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

      {/* Password */}
      <View style={styles.inputWrapper}>
        <Ionicons name="lock-closed-outline" size={20} color="#07bbc0" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
          placeholder="Enter your password"
          placeholderTextColor="rgba(255,255,255,0.4)"
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
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          editable={!loading}
          passwordRules={null}
          {...(webNoAutofill('password') as any)}
        />
        <TouchableOpacity
          onPress={() => setShowPass(!showPass)}
          style={styles.eyeButton}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.55)" />
        </TouchableOpacity>
      </View>
      {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

      {/* Confirm Password */}
      <View style={styles.inputWrapper}>
        <Ionicons name="shield-checkmark-outline" size={20} color="#07bbc0" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
          placeholder="Re-type your password"
          placeholderTextColor="rgba(255,255,255,0.4)"
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
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          editable={!loading}
          passwordRules={null}
          {...(webNoAutofill('password2') as any)}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPass(!showConfirmPass)}
          style={styles.eyeButton}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Ionicons name={showConfirmPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.55)" />
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
    width: 120,
    height: 130,
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
    marginBottom: 28,
    lineHeight: 21,
    paddingHorizontal: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#031220',
    borderRadius: 14,
    paddingHorizontal: 18,
    marginBottom: 4,
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
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginBottom: 10,
    marginTop: 4,
    width: '100%',
    paddingLeft: 6,
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#07bbc0',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
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
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 14,
  },
  linkText: {
    color: '#07bbc0',
    fontWeight: '700',
    fontSize: 14,
  },
});