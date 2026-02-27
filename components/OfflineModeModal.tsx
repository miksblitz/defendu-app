// components/OfflineModeModal.tsx
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#041527',
    borderRadius: 24,
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    borderWidth: 2,
    borderColor: '#0a3645',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  scrollContent: {
    padding: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b8693',
    textAlign: 'center',
    lineHeight: 22,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 24,
    backgroundColor: 'rgba(7, 187, 192, 0.1)',
    borderRadius: 50,
    padding: 24,
    alignSelf: 'center',
  },
  iconEmoji: {
    fontSize: 72,
  },
  descriptionContainer: {
    marginTop: 10,
  },
  descriptionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#07bbc0',
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  descriptionText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 18,
  },
  benefitsList: {
    marginBottom: 18,
    paddingLeft: 4,
  },
  benefitItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  benefitBullet: {
    fontSize: 18,
    color: '#07bbc0',
    marginRight: 12,
    fontWeight: '700',
  },
  benefitText: {
    fontSize: 15,
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 22,
  },
  noteText: {
    fontSize: 13,
    color: '#6b8693',
    fontStyle: 'italic',
    marginTop: 20,
    lineHeight: 20,
    backgroundColor: 'rgba(107, 134, 147, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(107, 134, 147, 0.2)',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 2,
    borderTopColor: '#0a3645',
    gap: 14,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6b8693',
  },
  cancelButtonText: {
    color: '#6b8693',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  enableButton: {
    backgroundColor: '#07bbc0',
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
});
