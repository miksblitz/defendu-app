import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { AuthController } from '../app/controllers/AuthController';

interface BlockedUserModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function BlockedUserModal({
  visible,
  onDismiss,
}: BlockedUserModalProps) {
  const router = useRouter();

  const handleGoToLogin = async () => {
    try {
      // Logout the user
      await AuthController.logout();
      // Navigate to login page
      router.replace('/(auth)/login');
      onDismiss();
    } catch (error) {
      console.error('Error logging out:', error);
      // Still navigate to login even if logout fails
      router.replace('/(auth)/login');
      onDismiss();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleGoToLogin}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="ban" size={64} color="#ff4444" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Account Blocked</Text>

          {/* Message */}
          <Text style={styles.message}>
            This account has been blocked. Please contact support for details.
          </Text>

          {/* Support Info */}
          <View style={styles.supportContainer}>
            <Text style={styles.supportText}>
              If you believe this is an error, please contact our support team for assistance.
            </Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleGoToLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Return to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#011f36',
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    padding: 36,
    borderWidth: 2,
    borderColor: '#ff4444',
    alignItems: 'center',
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    marginBottom: 28,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 50,
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ff4444',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
  },
  supportContainer: {
    backgroundColor: 'rgba(107, 134, 147, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(107, 134, 147, 0.2)',
  },
  supportText: {
    fontSize: 14,
    color: '#6b8693',
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#ff4444',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
