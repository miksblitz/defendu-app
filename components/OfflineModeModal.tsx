// components/OfflineModeModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { OfflineStorage } from '../app/_utils/offlineStorage';
import { AuthController } from '../app/controllers/AuthController';

interface OfflineModeModalProps {
  visible: boolean;
  onClose: () => void;
  onEnable: () => void;
}

export default function OfflineModeModal({
  visible,
  onClose,
  onEnable,
}: OfflineModeModalProps) {
  const [loading, setLoading] = useState(false);

  const handleEnableOffline = async () => {
    setLoading(true);
    try {
      // Enable offline mode
      await OfflineStorage.enableOfflineMode();

      // Get current user data and store offline snapshot
      const currentUser = await AuthController.getCurrentUser();
      if (currentUser) {
        // Store user data
        await OfflineStorage.storeData('user', currentUser);

        // Try to get skill profile if available
        try {
          const skillProfile = await AuthController.getSkillProfile();
          if (skillProfile) {
            await OfflineStorage.storeData('skillProfile', skillProfile);
          }
        } catch (error) {
          console.log('No skill profile to store offline');
        }

        // Create initial snapshot
        await OfflineStorage.storeOfflineSnapshot({
          user: currentUser,
          lastSync: Date.now(),
        });
      }

      onEnable();
      onClose();
    } catch (error) {
      console.error('Error enabling offline mode:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Enable Offline Mode</Text>
              <Text style={styles.subtitle}>
                Access your training content anytime, anywhere
              </Text>
            </View>

            {/* Icon/Illustration */}
            <View style={styles.iconContainer}>
              <Text style={styles.iconEmoji}>📱</Text>
            </View>

            {/* Description */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionTitle}>What is Offline Mode?</Text>
              <Text style={styles.descriptionText}>
                Offline Mode allows you to access your training modules, progress tracking, and profile information even when you don't have an internet connection. Perfect for training sessions in areas with limited connectivity or when you want to save data usage.
              </Text>

              <Text style={styles.descriptionTitle}>Benefits:</Text>
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>•</Text>
                  <Text style={styles.benefitText}>
                    Access training content without internet
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>•</Text>
                  <Text style={styles.benefitText}>
                    Track your progress offline
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>•</Text>
                  <Text style={styles.benefitText}>
                    Save mobile data usage
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>•</Text>
                  <Text style={styles.benefitText}>
                    Automatic sync when connection is restored
                  </Text>
                </View>
              </View>

              <Text style={styles.descriptionTitle}>How it works:</Text>
              <Text style={styles.descriptionText}>
                When you enable Offline Mode, we'll download and store your essential training data locally on your device. This data will be automatically synchronized with our servers whenever you have an internet connection, ensuring your progress is always up to date.
              </Text>

              <Text style={styles.noteText}>
                Note: Some features may require an internet connection. Your data is stored securely on your device and will be synced automatically when online.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Maybe Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.enableButton, loading && styles.buttonDisabled]}
              onPress={handleEnableOffline}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.enableButtonText}>Enable Offline Mode</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#041527',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#0a3645',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b8693',
    textAlign: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  iconEmoji: {
    fontSize: 64,
  },
  descriptionContainer: {
    marginTop: 10,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#07bbc0',
    marginTop: 20,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 16,
  },
  benefitsList: {
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  benefitBullet: {
    fontSize: 16,
    color: '#07bbc0',
    marginRight: 10,
    fontWeight: '700',
  },
  benefitText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 20,
  },
  noteText: {
    fontSize: 12,
    color: '#6b8693',
    fontStyle: 'italic',
    marginTop: 16,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#0a3645',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6b8693',
  },
  cancelButtonText: {
    color: '#6b8693',
    fontSize: 16,
    fontWeight: '600',
  },
  enableButton: {
    backgroundColor: '#07bbc0',
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
