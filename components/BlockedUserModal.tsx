import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#011f36',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 32,
    borderWidth: 1,
    borderColor: '#ff4444',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ff4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  supportContainer: {
    backgroundColor: 'rgba(107, 134, 147, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  supportText: {
    fontSize: 14,
    color: '#6b8693',
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#ff4444',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
