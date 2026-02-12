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
      {/* Mobile Header */}
      <View style={styles.mobileHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Image
            source={require('../../assets/images/backbuttonicon.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Image
          source={require('../../assets/images/defendulogo.png')}
          style={styles.logoImage}
        />
        <TouchableOpacity onPress={() => { clearUnread(); setShowMenu(true); }} style={styles.menuButton}>
          <Image
            source={require('../../assets/images/threedoticon.png')}
            style={styles.menuIcon}
          />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadDisplay}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.mainContent} 
        contentContainerStyle={styles.mainContentContainer}
        showsVerticalScrollIndicator={false}
      >
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
            <Ionicons name="settings-outline" size={18} color="#07bbc0" />
            <Text style={styles.menuOptionText}>Settings</Text>
            <Ionicons name="chevron-forward-outline" size={18} color="#07bbc0" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuOption}>
            <Ionicons name="location-outline" size={18} color="#07bbc0" />
            <Text style={styles.menuOptionText}>Location</Text>
            <Ionicons name="chevron-forward-outline" size={18} color="#07bbc0" />
          </TouchableOpacity>
          <View style={styles.menuSeparator} />
          <TouchableOpacity style={styles.menuOption}>
            <Ionicons name="help-circle-outline" size={18} color="#07bbc0" />
            <Text style={styles.menuOptionText}>Help & Support</Text>
            <Ionicons name="chevron-forward-outline" size={18} color="#07bbc0" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuOption}>
            <MaterialIcons name="stars" size={18} color="#07bbc0" />
            <Text style={styles.menuOptionText}>Premium</Text>
            <Ionicons name="chevron-forward-outline" size={18} color="#07bbc0" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuOption}
            onPress={() => setShowOfflineModal(true)}
          >
            <Ionicons name="cloud-download-outline" size={18} color="#07bbc0" />
            <Text style={styles.menuOptionText}>Offline Mode</Text>
            {offlineEnabled && (
              <View style={styles.enabledBadge}>
                <Text style={styles.enabledBadgeText}>ON</Text>
              </View>
            )}
            <Ionicons name="chevron-forward-outline" size={18} color="#07bbc0" />
          </TouchableOpacity>
        </View>
      </ScrollView>

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
                style={styles.menuItemIcon}
              />
              <Text style={styles.menuItemText}>Messages</Text>
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
                style={styles.menuItemIcon}
              />
              <Text style={styles.menuItemText}>Logout</Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#041527',
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  logoImage: {
    width: 100,
    height: 28,
    resizeMode: 'contain',
  },
  menuButton: {
    padding: 8,
    position: 'relative',
  },
  menuIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  unreadBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mainContentContainer: {
    paddingBottom: 120,
    paddingTop: 10,
  },
  profileDisplaySection: {
    marginBottom: 30,
    alignItems: 'center',
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  avatarLarge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#07bbc0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLargeIcon: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    resizeMode: 'cover',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  userHandle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#07bbc0',
    marginBottom: 20,
    textAlign: 'center',
  },
  editButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
    marginTop: 10,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  menuOptionsSection: {
    marginTop: 10,
    backgroundColor: '#011f36',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  menuOptionText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: '#062731',
    marginVertical: 4,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 14, 28, 0.85)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  menuContainer: {
    backgroundColor: '#000E1C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6b8693',
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
    resizeMode: 'contain',
  },
  menuItemText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  menuUnreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 5,
  },
  menuUnreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
