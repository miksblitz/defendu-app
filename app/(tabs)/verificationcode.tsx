import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';

export default function VerificationCodeScreen() {
  const [code, setCode] = useState(['', '', '', '', '', '']);

  // Typed ref array with nullable TextInput refs
  const inputsRef = useRef<Array<TextInput | null>>([]);

  // Handle digit input change
  const handleChange = (text: string, index: number) => {
    if (text.length > 1) return; // Only one digit per input
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus next input if any and text entered
    if (text && index < inputsRef.current.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  // Handle backspace key press to focus previous input
  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.logoPlaceholder}>
        <Text style={styles.logoText}>LOGO</Text>
      </View>

      <Text style={styles.title}>Enter 6-digit verification code</Text>
      <Text style={styles.subtitle}>We sent a code to your email</Text>

      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            style={styles.codeInput}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            // Use callback ref assigning properly with TypeScript
            ref={(ref) => {
              inputsRef.current[index] = ref;
            }}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            textAlign="center"
            placeholder=""
            placeholderTextColor="#555"
            autoFocus={index === 0}
            caretHidden={false}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.verifyButton} activeOpacity={0.8}>
        <Text style={styles.verifyButtonText}>Verify</Text>
      </TouchableOpacity>

      <View style={styles.resendRow}>
        <Text style={styles.resendText}>Didn’t receive any code? </Text>
        <TouchableOpacity>
          <Text style={styles.resendLink}>Resend code</Text>
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
  logoPlaceholder: {
    width: 120,
    height: 120,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#00AABB',
    fontWeight: '700',
    fontSize: 32,
    letterSpacing: 8,
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
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 32,
  },
  codeInput: {
  width: 40,
  height: 40,
  borderWidth: 1,
  borderColor: '#888',
  borderRadius: 30,
  color: '#FFF',
  fontSize: 20,
  textAlign: 'center',          // center horizontally
  textAlignVertical: 'center',  // center vertically (Android)
  padding: 0,
  margin: 0,
  lineHeight: 40,               // match height
  // Optionally add paddingTop if you need fine vertical alignment
  // paddingTop: 2,
},
  verifyButton: {
    backgroundColor: '#00AABB',
    borderRadius: 30,
    width: '80%',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
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
});