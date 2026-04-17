import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLogout } from '../../hooks/useLogout';
import { AuthController } from '../controllers/AuthController';

export default function SettingsPage() {
  const router = useRouter();
  const handleLogout = useLogout();

  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await AuthController.getCurrentUser();
        if (user) {
          setUserEmail(user.email);
          setUserName(`${user.firstName} ${user.lastName}`.trim());
        }
      } catch (e) {
        console.error('Error loading user:', e);
      }
    };

    loadUser();
  }, []);

  const handleResetProgress = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to reset all your training progress? This cannot be undone.')) {
        performResetProgress();
      }
    } else {
      Alert.alert(
        'Reset Progress',
        'Are you sure you want to reset all your training progress? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reset', style: 'destructive', onPress: performResetProgress },
        ]
      );
    }
  };

  const performResetProgress = async () => {
    try {
      await AuthController.resetUserProgress();
      if (Platform.OS === 'web') {
        window.alert('Progress has been reset successfully.');
      } else {
        Alert.alert('Success', 'Your training progress has been reset.');
      }
    } catch (e) {
      console.error('Error resetting progress:', e);
      if (Platform.OS === 'web') {
        window.alert('Failed to reset progress. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to reset progress. Please try again.');
      }
    }
  };

  const handleDeleteAccount = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete your account? This action is permanent and cannot be undone.')) {
        window.alert('Please contact support@defendu.com to complete account deletion.');
      }
    } else {
      Alert.alert(
        'Delete Account',
        'Are you sure you want to delete your account? This action is permanent and cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => Alert.alert('Contact Support', 'Please contact support@defendu.com to complete account deletion.'),
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#07bbc0" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#07bbc0" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{userName || 'Not set'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#07bbc0" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{userEmail || 'Not set'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#ff6b6b' }]}>Danger Zone</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.dangerRow} onPress={handleResetProgress}>
              <Ionicons name="refresh-outline" size={20} color="#ff6b6b" />
              <Text style={styles.dangerText}>Reset Training Progress</Text>
              <Ionicons name="chevron-forward-outline" size={18} color="#ff6b6b" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.dangerRow} onPress={handleDeleteAccount}>
              <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
              <Text style={styles.dangerText}>Delete Account</Text>
              <Ionicons name="chevron-forward-outline" size={18} color="#ff6b6b" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Defendu v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#041527',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(7, 187, 192, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#07bbc0',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'rgba(7, 187, 192, 0.05)',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(7, 187, 192, 0.1)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 14,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b8693',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(107, 134, 147, 0.15)',
    marginHorizontal: 16,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dangerText: {
    flex: 1,
    fontSize: 15,
    color: '#ff6b6b',
    fontWeight: '600',
    marginLeft: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff6b6b',
  },
  versionText: {
    textAlign: 'center',
    color: '#6b8693',
    fontSize: 13,
    marginTop: 20,
    fontWeight: '500',
  },
});
