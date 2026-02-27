import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    Image,
    Linking,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import OfflineModeModal from '../../components/OfflineModeModal';
import { useLogout } from '../../hooks/useLogout';
import { OfflineStorage } from '../_utils/offlineStorage';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';
import { AuthController } from '../controllers/AuthController';

const PRIVACY_URL = 'https://defendu.com/privacy';
const TERMS_URL = 'https://defendu.com/terms';
const CONTACT_EMAIL = 'support@defendu.com';

export default function ProfilePage() {
  const router = useRouter();
  const handleLogout = useLogout();
  const { unreadCount, unreadDisplay, clearUnread } = useUnreadMessages();
  const [username, setUsername] = useState('@');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [offlineEnabled, setOfflineEnabled] = useState(false);

  // Height & weight editing
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [heightInput, setHeightInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [savingStats, setSavingStats] = useState(false);

  // Edit profile modal (name + password change)
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [editFirstError, setEditFirstError] = useState('');
  const [editLastError, setEditLastError] = useState('');
  const [currentPwError, setCurrentPwError] = useState('');
  const [newPwError, setNewPwError] = useState('');
  const [confirmPwError, setConfirmPwError] = useState('');

  // Load user data on mount and when screen comes into focus
  const loadUserData = useCallback(async () => {
    try {
      const [user, skillProfile] = await Promise.all([
        AuthController.getCurrentUser(),
        AuthController.getSkillProfileHeightWeight(),
      ]);
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }
      // Add @ prefix if not present
      const displayUsername = user.username.startsWith('@') 
        ? user.username 
        : `@${user.username}`;
      setUsername(displayUsername);
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setProfilePicture(user.profilePicture || null);

      const h = user.height ?? skillProfile?.height;
      const w = user.weight ?? skillProfile?.weight;
      setHeight(h != null ? String(h) : '');
      setWeight(w != null ? String(w) : '');
      setHeightInput(h != null ? String(h) : '');
      setWeightInput(w != null ? String(w) : '');

      // Check offline mode status
      const isEnabled = await OfflineStorage.isOfflineEnabled();
      setOfflineEnabled(isEnabled);
    } catch (error) {
      console.error('Error loading user data:', error);
      router.replace('/(auth)/login');
    }
  }, [router]);

  // Load data when screen comes into focus (e.g., when returning from edit profile)
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData])
  );

  const handleMessages = () => {
    clearUnread();
    setShowMenu(false);
    router.push('/messages');
  };

  const fullName = `${firstName} ${lastName}`.trim() || 'User';
  const hasHeightWeightChanges = heightInput !== height || weightInput !== weight;
  const hasEditProfileChanges =
    editFirstName !== firstName ||
    editLastName !== lastName ||
    currentPassword.length > 0 ||
    newPassword.length > 0 ||
    confirmPassword.length > 0;

  const handleSaveHeightWeight = async () => {
    const h = heightInput.trim() ? Number(heightInput.trim()) : undefined;
    const w = weightInput.trim() ? Number(weightInput.trim()) : undefined;
    if (h !== undefined && (isNaN(h) || h < 50 || h > 250)) {
      Alert.alert('Invalid height', 'Please enter a height between 50 and 250 cm.');
      return;
    }
    if (w !== undefined && (isNaN(w) || w < 20 || w > 300)) {
      Alert.alert('Invalid weight', 'Please enter a weight between 20 and 300 kg.');
      return;
    }
    setSavingStats(true);
    try {
      await AuthController.updateUserProfile({
        ...(h !== undefined && { height: h }),
        ...(w !== undefined && { weight: w }),
      });
      if (h !== undefined) setHeight(String(h));
      if (w !== undefined) setWeight(String(w));
    } catch (e) {
      console.error('updateUserProfile:', e);
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setSavingStats(false);
    }
  };

  const openEditModal = () => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setProfileError('');
    setEditFirstError('');
    setEditLastError('');
    setCurrentPwError('');
    setNewPwError('');
    setConfirmPwError('');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    setProfileError('');
    setEditFirstError('');
    setEditLastError('');
    setCurrentPwError('');
    setNewPwError('');
    setConfirmPwError('');

    const newFirst = editFirstName.trim();
    const newLast = editLastName.trim();
    const hasPasswordChange = currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0;
    let hasErrors = false;

    if (!newFirst) {
      setEditFirstError('First name is required.');
      hasErrors = true;
    }
    if (!newLast) {
      setEditLastError('Last name is required.');
      hasErrors = true;
    }
    if (hasPasswordChange) {
      if (!currentPassword.trim()) {
        setCurrentPwError('Enter your current password to change password.');
        hasErrors = true;
      }
      if (newPassword.length < 6) {
        setNewPwError('New password must be at least 6 characters.');
        hasErrors = true;
      }
      if (newPassword !== confirmPassword) {
        setConfirmPwError('Passwords do not match.');
        hasErrors = true;
      }
    }
    if (hasErrors) return;

    setSavingProfile(true);
    try {
      await AuthController.updateUserProfile({
        firstName: newFirst,
        lastName: newLast,
      });
      setFirstName(newFirst);
      setLastName(newLast);
      if (hasPasswordChange) {
        await AuthController.changePassword(currentPassword, newPassword);
      }
      setEditModalVisible(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save. Please try again.';
      setProfileError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResetProgress = () => {
    Alert.alert(
      'Reset all progress',
      'This will clear all completed modules and weekly goal data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthController.resetUserProgress();
              Alert.alert('Done', 'Your progress has been reset.');
            } catch (e) {
              console.error('resetUserProgress:', e);
              Alert.alert('Error', 'Could not reset progress. Please try again.');
            }
          },
        },
      ]
    );
  };

  const openLink = (url: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.open) {
      window.open(url, '_blank', 'noopener');
    } else {
      Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open link.'));
    }
  };

  const openContact = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(`mailto:${CONTACT_EMAIL}`, '_self');
    } else {
      Linking.openURL(`mailto:${CONTACT_EMAIL}`).catch(() => Alert.alert('Error', 'Could not open email.'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Fixed Sidebar - always visible */}
        <View style={styles.sidebar}>
          {/* Three dots icon at top */}
          <View style={styles.sidebarTopButtonWrap}>
            <TouchableOpacity 
              style={styles.sidebarTopButton}
              onPress={() => { clearUnread(); setShowMenu(true); }}
            >
              <Image
                source={require('../../assets/images/threedoticon.png')}
                style={styles.threeDotIcon}
              />
            </TouchableOpacity>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadDisplay}</Text>
              </View>
            )}
          </View>

          <View style={styles.sidebarIconsBottom}>
            <TouchableOpacity style={[styles.sidebarButton, styles.sidebarActive]}>
              <Image
                source={require('../../assets/images/blueprofileicon.png')}
                style={styles.iconImage}
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sidebarButton}
              onPress={() => router.push('/trainer')}
            >
              <Image
                source={require('../../assets/images/trainericon.png')}
                style={styles.iconImage}
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sidebarButton}
              onPress={() => router.push('/dashboard')}
            >
              <Image
                source={require('../../assets/images/homeicon.png')}
                style={styles.iconImage}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content */}
        <ScrollView style={styles.mainContent} contentContainerStyle={{ paddingBottom: 40, paddingTop: 25 }}>
          {/* Profile Display Section */}
          <View style={styles.profileDisplaySection}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarLarge}>
                {profilePicture ? (
                  <Image
                    source={{ uri: profilePicture }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Image
                    source={require('../../assets/images/profilepictureplaceholdericon.png')}
                    style={styles.avatarLargeIcon}
                  />
                )}
              </View>
            </View>

            {/* User Name */}
            <Text style={styles.userName}>{fullName}</Text>
            
            {/* Username */}
            <Text style={styles.userHandle}>{username}</Text>

            {/* Edit Profile Button */}
            <TouchableOpacity 
              style={styles.editButton}
              onPress={openEditModal}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <Text style={styles.editHint}>Change your name and password</Text>
          </View>

          {/* Height & Weight Section */}
          <View style={styles.heightWeightSection}>
            <Text style={styles.sectionTitle}>Height & Weight</Text>
            <Text style={styles.sectionHint}>From your skill profile; you can update them here.</Text>
            <View style={styles.hwRow}>
              <View style={styles.hwField}>
                <Text style={styles.hwLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.hwInput}
                  value={heightInput}
                  onChangeText={setHeightInput}
                  placeholder="e.g. 170"
                  placeholderTextColor="#6b8693"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.hwField}>
                <Text style={styles.hwLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.hwInput}
                  value={weightInput}
                  onChangeText={setWeightInput}
                  placeholder="e.g. 70"
                  placeholderTextColor="#6b8693"
                  keyboardType="numeric"
                />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.saveStatsBtn, (savingStats || !hasHeightWeightChanges) && styles.buttonDisabled]}
              onPress={handleSaveHeightWeight}
              disabled={savingStats || !hasHeightWeightChanges}
            >
              <Text style={styles.saveStatsBtnText}>{savingStats ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          {/* Menu Options Section */}
          <View style={styles.menuOptionsSection}>
            <TouchableOpacity style={styles.menuOption}>
              <Ionicons name="settings-outline" size={20} color="#07bbc0" />
              <Text style={styles.menuOptionText}>Settings</Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#07bbc0" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption}>
              <Ionicons name="location-outline" size={20} color="#07bbc0" />
              <Text style={styles.menuOptionText}>Location</Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#07bbc0" />
            </TouchableOpacity>
            <View style={styles.menuSeparator} />
            <TouchableOpacity style={styles.menuOption}>
              <Ionicons name="help-circle-outline" size={20} color="#07bbc0" />
              <Text style={styles.menuOptionText}>Help & Support</Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#07bbc0" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption}>
              <MaterialIcons name="stars" size={20} color="#07bbc0" />
              <Text style={styles.menuOptionText}>Premium</Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#07bbc0" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuOption}
              onPress={() => setShowOfflineModal(true)}
            >
              <Ionicons name="cloud-download-outline" size={20} color="#07bbc0" />
              <Text style={styles.menuOptionText}>Offline Mode</Text>
              {offlineEnabled && (
                <View style={styles.enabledBadge}>
                  <Text style={styles.enabledBadgeText}>ON</Text>
                </View>
              )}
              <Ionicons name="chevron-forward-outline" size={20} color="#07bbc0" />
            </TouchableOpacity>
          </View>

          {/* Links Section */}
          <View style={styles.linksSection}>
            <TouchableOpacity style={styles.linkRow} onPress={() => openLink(PRIVACY_URL)}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#07bbc0" />
              <Text style={styles.linkText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#6b8693" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkRow} onPress={() => openLink(TERMS_URL)}>
              <Ionicons name="document-text-outline" size={20} color="#07bbc0" />
              <Text style={styles.linkText}>Terms of Service</Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#6b8693" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.linkRow, styles.linkRowLast]} onPress={openContact}>
              <Ionicons name="mail-outline" size={20} color="#07bbc0" />
              <Text style={styles.linkText}>Contact us</Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#6b8693" />
            </TouchableOpacity>
          </View>

          {/* Reset Progress */}
          <TouchableOpacity style={styles.resetButton} onPress={handleResetProgress}>
            <Ionicons name="trash-outline" size={18} color="#e57373" style={{ marginRight: 8 }} />
            <Text style={styles.resetButtonText}>Reset all progress</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Pop-up Menu */}
      {showMenu && (
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleMessages}
            >
              <Image
                source={require('../../assets/images/messageicon.png')}
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Messages</Text>
              {unreadCount > 0 && (
                <View style={styles.menuUnreadBadge}>
                  <Text style={styles.menuUnreadBadgeText}>{unreadDisplay}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => { setShowMenu(false); handleLogout(); }}
            >
              <Image
                source={require('../../assets/images/logouticon.png')}
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Offline Mode Modal */}
      <OfflineModeModal
        visible={showOfflineModal}
        onClose={() => {
          setShowOfflineModal(false);
          // Refresh offline status when modal closes
          loadUserData();
        }}
        onEnable={() => {
          setOfflineEnabled(true);
        }}
      />

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            {profileError ? <Text style={styles.modalError}>{profileError}</Text> : null}

            <Text style={styles.modalLabel}>First Name</Text>
            <TextInput
              style={[styles.modalInput, editFirstError ? styles.inputError : null]}
              value={editFirstName}
              onChangeText={(t) => { setEditFirstName(t); setEditFirstError(''); }}
              placeholder="First name"
              placeholderTextColor="#6b8693"
            />

            <Text style={styles.modalLabel}>Last Name</Text>
            <TextInput
              style={[styles.modalInput, editLastError ? styles.inputError : null]}
              value={editLastName}
              onChangeText={(t) => { setEditLastName(t); setEditLastError(''); }}
              placeholder="Last name"
              placeholderTextColor="#6b8693"
            />

            <View style={styles.modalDivider} />
            <Text style={styles.modalSubtitle}>Change Password (optional)</Text>

            <Text style={styles.modalLabel}>Current Password</Text>
            <TextInput
              style={[styles.modalInput, currentPwError ? styles.inputError : null]}
              value={currentPassword}
              onChangeText={(t) => { setCurrentPassword(t); setCurrentPwError(''); }}
              placeholder="Current password"
              placeholderTextColor="#6b8693"
              secureTextEntry
            />

            <Text style={styles.modalLabel}>New Password</Text>
            <TextInput
              style={[styles.modalInput, newPwError ? styles.inputError : null]}
              value={newPassword}
              onChangeText={(t) => { setNewPassword(t); setNewPwError(''); }}
              placeholder="New password"
              placeholderTextColor="#6b8693"
              secureTextEntry
            />

            <Text style={styles.modalLabel}>Confirm Password</Text>
            <TextInput
              style={[styles.modalInput, confirmPwError ? styles.inputError : null]}
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setConfirmPwError(''); }}
              placeholder="Confirm new password"
              placeholderTextColor="#6b8693"
              secureTextEntry
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditModalVisible(false)}
                disabled={savingProfile}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, (savingProfile || !hasEditProfileChanges) && styles.buttonDisabled]}
                onPress={handleSaveProfile}
                disabled={savingProfile || !hasEditProfileChanges}
              >
                <Text style={styles.modalSaveText}>{savingProfile ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#041527' },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    backgroundColor: '#000E1C',
    width: 80,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sidebarIconsBottom: {
    flexDirection: 'column',
    width: '100%',
    alignItems: 'center',
  },
  sidebarButton: {
    paddingVertical: 20,
    width: '100%',
    alignItems: 'center',
  },
  sidebarActive: {
    backgroundColor: '#024446',
  },
  iconImage: {
    width: 28,
    height: 28,
    tintColor: '#07bbc0',
    resizeMode: 'contain',
  },
  sidebarTopButtonWrap: {
    position: 'relative',
  },
  sidebarTopButton: {
    padding: 8,
  },
  unreadBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  threeDotIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  menuUnreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  menuUnreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 30,
  },
  profileDisplaySection: {
    marginBottom: 40,
    alignItems: 'center',
    paddingTop: 20,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 32,
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarLarge: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#07bbc0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#041527',
  },
  avatarLargeIcon: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  avatarImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    resizeMode: 'cover',
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  userHandle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#07bbc0',
    marginBottom: 28,
    textAlign: 'center',
  },
  editButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 28,
    marginTop: 20,
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  editHint: {
    color: '#6b8693',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  heightWeightSection: {
    backgroundColor: 'rgba(7, 187, 192, 0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    marginHorizontal: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionHint: {
    color: '#6b8693',
    fontSize: 13,
    marginBottom: 14,
  },
  hwRow: {
    flexDirection: 'row',
    gap: 14,
  },
  hwField: {
    flex: 1,
  },
  hwLabel: {
    color: '#6b8693',
    fontSize: 13,
    marginBottom: 6,
  },
  hwInput: {
    backgroundColor: '#0a1e30',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1a3a4a',
    color: '#FFFFFF',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveStatsBtn: {
    backgroundColor: '#07bbc0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  saveStatsBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  linksSection: {
    marginTop: 16,
    marginHorizontal: 8,
    backgroundColor: 'rgba(7, 187, 192, 0.05)',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 134, 147, 0.15)',
  },
  linkRowLast: {
    borderBottomWidth: 0,
  },
  linkText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 14,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 30,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(229, 115, 115, 0.35)',
    marginHorizontal: 8,
  },
  resetButtonText: {
    color: '#e57373',
    fontSize: 15,
    fontWeight: '600',
  },
  // Edit Profile Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 14, 28, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#0a1e30',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: 'rgba(7, 187, 192, 0.2)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 18,
    textAlign: 'center',
  },
  modalError: {
    color: '#e57373',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalLabel: {
    color: '#6b8693',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#041527',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1a3a4a',
    color: '#FFFFFF',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputError: {
    borderColor: '#e57373',
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(107, 134, 147, 0.2)',
    marginVertical: 18,
  },
  modalSubtitle: {
    color: '#07bbc0',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 22,
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6b8693',
  },
  modalCancelText: {
    color: '#6b8693',
    fontSize: 15,
    fontWeight: '600',
  },
  modalSaveBtn: {
    backgroundColor: '#07bbc0',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  menuOptionsSection: {
    marginTop: 24,
    paddingHorizontal: 8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(7, 187, 192, 0.05)',
    borderRadius: 16,
    marginBottom: 12,
  },
  menuOptionText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 14,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: 'rgba(107, 134, 147, 0.2)',
    marginVertical: 4,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 14, 28, 0.75)',
  },
  menuContainer: {
    position: 'absolute',
    top: 20,
    left: 90,
    backgroundColor: '#000E1C',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#6b8693',
    paddingVertical: 10,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  menuIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    resizeMode: 'contain',
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  enabledBadge: {
    backgroundColor: '#07bbc0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  enabledBadgeText: {
    color: '#041527',
    fontSize: 10,
    fontWeight: '700',
  },
});