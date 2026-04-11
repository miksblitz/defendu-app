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

const RESEND_COOLDOWN = 30; // seconds

export default function VerificationCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email: string;
    firstName: string;
    lastName: string;
    username: string;
    password: string;
  }>();

  const { email, firstName, lastName, username, password } = params;

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);

  const inputsRef = useRef<(TextInput | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
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
    if (text.length > 1) return;
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    setError('');
    if (text && index < inputsRef.current.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
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
    const enteredCode = code.join('');
    if (enteredCode.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const apiBaseUrl = getExpoApiBaseUrl();
      const verifyRes = await fetch(`${apiBaseUrl}/api/register-verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: enteredCode }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error || 'Invalid code. Please try again.');
        return;
      }
      await AuthController.register({ email, password, firstName, lastName, username });
      router.replace('/(tabs)/physicalAttributesQuestion');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      const apiBaseUrl = getExpoApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/api/register-send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to resend code.');
        return;
      }
      setCode(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
      startCooldown();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Image
        source={require('../../assets/images/defendulogo.png')}
        style={styles.logoImage}
      />
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{'\n'}
        <Text style={styles.emailHighlight}>{email}</Text>
      </Text>
      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            style={[styles.codeInput, error ? styles.codeInputError : null]}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            ref={(el: TextInput | null) => { inputsRef.current[index] = el; }}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            textAlign="center"
            placeholderTextColor="#555"
            autoFocus={index === 0}
            caretHidden={false}
            editable={!loading}
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
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.verifyButtonText}>Verify</Text>}
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
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()} disabled={loading}>
        <Text style={styles.backText}>{'<- Back to registration'}</Text>
      </TouchableOpacity>
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
    width: '80%',
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
