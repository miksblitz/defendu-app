// app/(auth)/forgotpassword-otp.tsx — Web flow: enter 6-digit code from email, then open reset password screen.
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  TouchableOpacity,
  View,
} from 'react-native';
import { getExpoApiBaseUrl } from '../../constants/apiBaseUrl';
import { AuthController } from '../controllers/AuthController';

const RESEND_COOLDOWN = 60;

function routeParamToString(value: string | string[] | undefined): string {
  if (value == null) return '';
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' ? raw.trim() : '';
}

export default function ForgotPasswordOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string }>();
  const email = routeParamToString(params.email).toLowerCase();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);

  const inputsRef = useRef<(TextInput | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!email) {
      setError('Missing email. Go back and start again.');
    }
    startCooldown();
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleChange = (text: string, index: number) => {
    const digitsOnly = text.replace(/\D/g, '');

    if (digitsOnly.length === 0) {
      const newCode = [...code];
      newCode[index] = '';
      setCode(newCode);
      setError('');
      return;
    }

    if (digitsOnly.length === 1) {
      const newCode = [...code];
      newCode[index] = digitsOnly;
      setCode(newCode);
      setError('');
      if (index < inputsRef.current.length - 1) {
        inputsRef.current[index + 1]?.focus();
      }
      return;
    }

    const newCode = [...code];
    for (let i = 0; i < digitsOnly.length && index + i < 6; i++) {
      newCode[index + i] = digitsOnly[i]!;
    }
    setCode(newCode);
    setError('');
    const next = Math.min(index + digitsOnly.length, 5);
    inputsRef.current[next]?.focus();
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const enteredCode = code.join('').replace(/\D/g, '');
    if (enteredCode.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    if (!email) {
      setError('Missing email. Go back and start again.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const apiBaseUrl = getExpoApiBaseUrl();
      const verifyRes = await fetch(`${apiBaseUrl}/api/verify-password-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: enteredCode }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error || 'Invalid code. Please try again.');
        return;
      }
      const token = verifyData.token as string;
      const expiresAt = verifyData.expiresAt as number;
      router.replace({
        pathname: '/resetpassword',
        params: { token, expiresAt: String(expiresAt) },
      });
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending || !email) return;
    setResending(true);
    setError('');
    try {
      await AuthController.forgotPassword({ email });
      setCode(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
      startCooldown();
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Image
          source={require('../../assets/images/defendulogo.png')}
          style={styles.logoImage}
        />
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code we sent to{'\n'}
          <Text style={styles.emailHighlight}>{email || 'your email'}</Text>
        </Text>
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              style={[styles.codeInput, error ? styles.codeInputError : null]}
              keyboardType="number-pad"
              inputMode="numeric"
              value={digit}
              ref={(el: TextInput | null) => {
                inputsRef.current[index] = el;
              }}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              textAlign="center"
              placeholderTextColor="#555"
              autoFocus={index === 0}
              caretHidden={false}
              editable={!loading}
              textContentType={index === 0 ? 'oneTimeCode' : 'none'}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
            />
          ))}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
          activeOpacity={0.8}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.verifyButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>{"Didn't receive a code? "}</Text>
          <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0 || resending}>
            {resending ? (
              <ActivityIndicator size="small" color="#00AABB" />
            ) : (
              <Text style={[styles.resendLink, resendCooldown > 0 && styles.resendLinkDisabled]}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => router.replace('/forgotpassword')}
          disabled={loading}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#041527',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  inner: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  logoImage: {
    width: 160,
    height: 180,
    alignSelf: 'center',
    marginBottom: 24,
    resizeMode: 'contain',
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 22,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#AAA',
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  emailHighlight: {
    color: '#09AEC3',
    fontWeight: '600',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 320,
    marginBottom: 16,
  },
  codeInput: {
    width: 44,
    height: 48,
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 10,
    color: '#FFF',
    fontSize: 22,
    textAlign: 'center',
    textAlignVertical: 'center',
    padding: 0,
    margin: 0,
    lineHeight: 48,
  },
  codeInputError: {
    borderColor: '#FF4444',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  verifyButton: {
    backgroundColor: '#00AABB',
    borderRadius: 30,
    width: '50%',
    minWidth: 160,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  resendText: {
    color: '#AAA',
    fontSize: 14,
  },
  resendLink: {
    color: '#00AABB',
    fontSize: 14,
    fontWeight: '700',
  },
  resendLinkDisabled: {
    color: '#555',
  },
  backRow: {
    marginTop: 8,
  },
  backText: {
    color: '#09AEC3',
    fontSize: 13,
  },
});
