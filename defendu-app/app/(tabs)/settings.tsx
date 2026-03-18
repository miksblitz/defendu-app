import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatCredits } from '../../constants/credits';
import { useLogout } from '../../hooks/useLogout';
import { AuthController } from '../controllers/AuthController';
import { WalletController } from '../controllers/WalletController';

export default function SettingsPage() {
  const router = useRouter();
  const handleLogout = useLogout();

  // Notification preferences
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [trainingReminders, setTrainingReminders] = useState(true);
  const [messageAlerts, setMessageAlerts] = useState(true);

  // Display preferences
  const [darkMode, setDarkMode] = useState(true);
  const [autoPlayVideos, setAutoPlayVideos] = useState(true);

  // Privacy
  const [profileVisible, setProfileVisible] = useState(true);
  const [showProgress, setShowProgress] = useState(true);

  // User's info
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);

  // Track whether initial load is done to avoid saving defaults on mount
  const [settingsLoaded, setSettingsLoaded] = useState(false);

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

    const loadSettings = async () => {
      try {
        const s = await AuthController.loadUserSettings();
        setPushNotifications(s.pushNotifications);
        setEmailNotifications(s.emailNotifications);
        setTrainingReminders(s.trainingReminders);
        setMessageAlerts(s.messageAlerts);
        setDarkMode(s.darkMode);
        setAutoPlayVideos(s.autoPlayVideos);
        setProfileVisible(s.profileVisible);
        setShowProgress(s.showProgress);
      } catch (e) {
        console.error('Error loading settings:', e);
      } finally {
        setSettingsLoaded(true);
      }
    };

    loadUser();
    loadSettings();
    WalletController.getWallet()
      .then(w => setWalletBalance(w.balance))
      .catch(e => console.error('Error loading wallet:', e));
  }, []);

  // Persist settings whenever a toggle changes (after initial load)
  const persistSettings = useCallback(
    (overrides: Record<string, boolean>) => {
      if (!settingsLoaded) return;
      const current = {
        pushNotifications,
        emailNotifications,
        trainingReminders,
        messageAlerts,
        darkMode,
        autoPlayVideos,
        profileVisible,
        showProgress,
        ...overrides,
      };
      AuthController.saveUserSettings(current).catch((e) =>
        console.error('Error saving settings:', e),
      );
    },
    [
      settingsLoaded,
      pushNotifications,
      emailNotifications,
      trainingReminders,
      messageAlerts,
      darkMode,
      autoPlayVideos,
      profileVisible,
      showProgress,
    ],
  );

  // Toggle handlers that update state AND persist
  const togglePush = (v: boolean) => { setPushNotifications(v); persistSettings({ pushNotifications: v }); };
  const toggleEmail = (v: boolean) => { setEmailNotifications(v); persistSettings({ emailNotifications: v }); };
  const toggleReminders = (v: boolean) => { setTrainingReminders(v); persistSettings({ trainingReminders: v }); };
  const toggleMessages = (v: boolean) => { setMessageAlerts(v); persistSettings({ messageAlerts: v }); };
  const toggleDarkMode = (v: boolean) => { setDarkMode(v); persistSettings({ darkMode: v }); };
  const toggleAutoPlay = (v: boolean) => { setAutoPlayVideos(v); persistSettings({ autoPlayVideos: v }); };
  const toggleProfileVisible = (v: boolean) => { setProfileVisible(v); persistSettings({ profileVisible: v }); };
  const toggleShowProgress = (v: boolean) => { setShowProgress(v); persistSettings({ showProgress: v }); };

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
        // Account deletion would be handled here
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#07bbc0" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Account Section */}
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
            <View style={styles.divider} />
            <TouchableOpacity style={styles.infoRow} onPress={() => router.push('/editprofile')}>
              <Ionicons name="create-outline" size={20} color="#07bbc0" />
              <Text style={styles.actionText}>Edit Profile</Text>
              <Ionicons name="chevron-forward-outline" size={18} color="#6b8693" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Wallet & Credits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet & Credits</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.infoRow} onPress={() => router.push('/(tabs)/wallet' as any)}>
              <Ionicons name="wallet-outline" size={20} color="#07bbc0" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Balance</Text>
                <Text style={styles.infoValue}>{formatCredits(walletBalance)}</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={18} color="#6b8693" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.infoRow} onPress={() => router.push('/(tabs)/top-up' as any)}>
              <Ionicons name="add-circle-outline" size={20} color="#07bbc0" />
              <Text style={styles.actionText}>Top Up Credits</Text>
              <Ionicons name="chevron-forward-outline" size={18} color="#6b8693" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.infoRow} onPress={() => router.push('/(tabs)/transaction-history' as any)}>
              <Ionicons name="receipt-outline" size={20} color="#07bbc0" />
              <Text style={styles.actionText}>Transaction History</Text>
              <Ionicons name="chevron-forward-outline" size={18} color="#6b8693" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <Ionicons name="notifications-outline" size={20} color="#07bbc0" />
              <Text style={styles.toggleLabel}>Push Notifications</Text>
              <Switch
                value={pushNotifications}
                onValueChange={togglePush}
                trackColor={{ false: '#2a3a4a', true: '#07bbc0' }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.toggleRow}>
              <Ionicons name="mail-outline" size={20} color="#07bbc0" />
              <Text style={styles.toggleLabel}>Email Notifications</Text>
              <Switch
                value={emailNotifications}
                onValueChange={toggleEmail}
                trackColor={{ false: '#2a3a4a', true: '#07bbc0' }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.toggleRow}>
              <Ionicons name="fitness-outline" size={20} color="#07bbc0" />
              <Text style={styles.toggleLabel}>Training Reminders</Text>
              <Switch
                value={trainingReminders}
                onValueChange={toggleReminders}
                trackColor={{ false: '#2a3a4a', true: '#07bbc0' }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.toggleRow}>
              <Ionicons name="chatbubble-outline" size={20} color="#07bbc0" />
              <Text style={styles.toggleLabel}>Message Alerts</Text>
              <Switch
                value={messageAlerts}
                onValueChange={toggleMessages}
                trackColor={{ false: '#2a3a4a', true: '#07bbc0' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Display Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <Ionicons name="moon-outline" size={20} color="#07bbc0" />
              <Text style={styles.toggleLabel}>Dark Mode</Text>
              <Switch
                value={darkMode}
                onValueChange={toggleDarkMode}
                trackColor={{ false: '#2a3a4a', true: '#07bbc0' }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.toggleRow}>
              <Ionicons name="play-circle-outline" size={20} color="#07bbc0" />
              <Text style={styles.toggleLabel}>Auto-Play Videos</Text>
              <Switch
                value={autoPlayVideos}
                onValueChange={toggleAutoPlay}
                trackColor={{ false: '#2a3a4a', true: '#07bbc0' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <Ionicons name="eye-outline" size={20} color="#07bbc0" />
              <Text style={styles.toggleLabel}>Profile Visible to Others</Text>
              <Switch
                value={profileVisible}
                onValueChange={toggleProfileVisible}
                trackColor={{ false: '#2a3a4a', true: '#07bbc0' }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.toggleRow}>
              <Ionicons name="bar-chart-outline" size={20} color="#07bbc0" />
              <Text style={styles.toggleLabel}>Show Training Progress</Text>
              <Switch
                value={showProgress}
                onValueChange={toggleShowProgress}
                trackColor={{ false: '#2a3a4a', true: '#07bbc0' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Danger Zone */}
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

        {/* Logout */}
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
  actionText: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 14,
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
