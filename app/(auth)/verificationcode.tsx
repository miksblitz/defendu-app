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
  Image,
} from 'react-native';

export default function VerificationCodeScreen() {
  const [code, setCode] = useState(['', '', '', '', '', '']);

  // Typed ref array to store references for each TextInput
  const inputsRef = useRef<(TextInput | null)[]>([]);

  // Handle digit input change
  const handleChange = (text: string, index: number) => {
    if (text.length > 1) return; // limit to one char
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Focus next input if text entered and not last input
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
      <Image
        source={require('../../assets/images/defendulogo.png')}
        style={styles.logoImage}
      />

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
            ref={(el: TextInput | null) => {
              inputsRef.current[index] = el;
            }}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            textAlign="center"
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
    textAlign: 'center',
    textAlignVertical: 'center',
    padding: 0,
    margin: 0,
    lineHeight: 40,
  },
  verifyButton: {
    backgroundColor: '#00AABB',
    borderRadius: 30,
    width: '30%',
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