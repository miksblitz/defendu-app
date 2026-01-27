import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { AuthController } from '../controllers/AuthController';
import OfflineModeModal from '../../components/OfflineModeModal';
import { OfflineStorage } from '../utils/offlineStorage';

export default function ProfilePage() {
  const router = useRouter();
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
      if (user) {
        // Add @ prefix if not present
        const displayUsername = user.username.startsWith('@') 
          ? user.username 
          : `@${user.username}`;
        setUsername(displayUsername);
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        setProfilePicture(user.profilePicture || null);
      }
      
      // Check offline mode status
      const isEnabled = await OfflineStorage.isOfflineEnabled();
      setOfflineEnabled(isEnabled);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  // Load data when screen comes into focus (e.g., when returning from edit profile)
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData])
  );

  const handleLogout = async () => {
    try {
      await AuthController.logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleMessages = () => {
    setShowMenu(false);
    // TODO: Navigate to messages page
    console.log('Navigate to messages');
  };

  const fullName = `${firstName} ${lastName}`.trim() || 'User';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Fixed Sidebar - always visible */}
        <View style={styles.sidebar}>
          {/* Three dots icon at top */}
          <TouchableOpacity 
            style={styles.sidebarTopButton}
            onPress={() => setShowMenu(true)}
          >
            <Image
              source={require('../../assets/images/threedoticon.png')}
              style={styles.threeDotIcon}
            />
          </TouchableOpacity>

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
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleLogout}
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
  sidebarTopButton: {
    padding: 8,
  },
  threeDotIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 30,
  },
  profileDisplaySection: {
    marginBottom: 40,
    alignItems: 'center',
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 30,
  },
  avatarLarge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#07bbc0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLargeIcon: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
  },
  avatarImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    resizeMode: 'cover',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  userHandle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#07bbc0',
    marginBottom: 30,
    textAlign: 'center',
  },
  editButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
    marginTop: 20,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  menuOptionsSection: {
    marginTop: 20,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  menuOptionText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: '#062731',
    marginVertical: 8,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  menuContainer: {
    position: 'absolute',
    top: 20,
    left: 90,
    backgroundColor: '#011f36',
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