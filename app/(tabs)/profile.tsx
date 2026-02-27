import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import OfflineModeModal from '../../components/OfflineModeModal';
import { useLogout } from '../../hooks/useLogout';
import { OfflineStorage } from '../_utils/offlineStorage';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';
import { AuthController } from '../controllers/AuthController';

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

  // Load user data on mount and when screen comes into focus
  const loadUserData = useCallback(async () => {
    try {
      const user = await AuthController.getCurrentUser();
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
              onPress={() => router.push('/editprofile')}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
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