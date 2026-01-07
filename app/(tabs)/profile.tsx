import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';

export default function ProfilePage() {
  const [username, setUsername] = useState('@B owei_Gai');
  const [firstName, setFirstName] = useState('B owei');
  const [lastName, setLastName] = useState('Gai');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnim = useRef(new Animated.Value(-280)).current; // sidebar width is 280

  useEffect(() => {
    Animated.timing(menuAnim, {
      toValue: menuOpen ? 0 : -280,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  }, [menuOpen]);

  const toggleMenu = () => setMenuOpen((v) => !v);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Hamburger icon fixed top-left */}
        <TouchableOpacity
          style={styles.hamburgerIcon}
          onPress={toggleMenu}
          accessibilityLabel={menuOpen ? 'Close menu' : 'Open menu'}
          accessibilityRole="button"
        >
          <Ionicons
            name={menuOpen ? 'close' : 'menu-outline'}
            size={36}
            color="#09AEC3"
          />
        </TouchableOpacity>

        {/* Animated Sidebar */}
        <Animated.View
          style={[styles.sidebar, { transform: [{ translateX: menuAnim }] }]}
        >
          <ScrollView
            contentContainerStyle={styles.sidebarScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo Image */}
            <Image
              source={require('../../assets/images/defendudashboardlogo.png')}
              style={styles.logoImage}
            />

            {/* User Avatar - Larger */}
            <View style={styles.avatarPlaceholder}>
              <Image
                source={require('../../assets/images/profilepictureplaceholdericon.png')}
                style={styles.avatarIcon}
              />
            </View>

            {/* User Info */}
            <Text style={styles.userName}>B owei Gai</Text>
            <Text style={styles.userHandle}>@B owei_Gai</Text>

            {/* Edit Profile Button */}
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>

            {/* Horizontal Navigation Icons - Home, Trainer, Profile */}
            <View style={styles.horizontalNavIcons}>
              <TouchableOpacity style={styles.navIconButton}>
                <Image
                  source={require('../../assets/images/homeicon.png')}
                  style={styles.navIcon}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navIconButton}>
                <Image
                  source={require('../../assets/images/trainericon.png')}
                  style={styles.navIcon}
                />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.navIconButton, styles.navIconActive]}>
                <Image
                  source={require('../../assets/images/blueprofileicon.png')}
                  style={styles.navIcon}
                />
              </TouchableOpacity>
            </View>

            {/* Menu Options */}
            <View style={styles.menuOptions}>
              <TouchableOpacity style={styles.menuOption}>
                <Ionicons name="settings-outline" size={18} color="#09AEC3" />
                <Text style={styles.menuOptionText}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption}>
                <Ionicons name="location-outline" size={18} color="#09AEC3" />
                <Text style={styles.menuOptionText}>Location</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption}>
                <Ionicons name="help-circle-outline" size={18} color="#09AEC3" />
                <Text style={styles.menuOptionText}>Help & Support</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption}>
                <MaterialIcons name="stars" size={18} color="#09AEC3" />
                <Text style={styles.menuOptionText}>Premium</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption}>
                <Ionicons name="log-out-outline" size={18} color="#09AEC3" />
                <Text style={styles.menuOptionText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>

        {/* Main Profile Form */}
        <ScrollView style={styles.profileForm} contentContainerStyle={{ paddingBottom: 40, paddingTop: 60 }}>
          {/* Avatar with camera - Larger */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarLarge}>
              <Image
                source={require('../../assets/images/profilepictureplaceholdericon.png')}
                style={styles.avatarLargeIcon}
              />
            </View>
            <TouchableOpacity style={styles.cameraIcon}>
              <Image
                source={require('../../assets/images/addprofilepictureicon.png')}
                style={styles.cameraIconImage}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.formTitle}>Your Profile</Text>

          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputPrefix}>@</Text>
              <TextInput
                style={styles.input}
                value={username}
                placeholder="Username"
                placeholderTextColor="#09AEC3"
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* First Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>First Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#09AEC3" style={{ marginLeft: 6, marginRight: 8 }} />
              <TextInput
                style={styles.input}
                value={firstName}
                placeholder="First Name"
                placeholderTextColor="#09AEC3"
                onChangeText={setFirstName}
              />
            </View>
          </View>

          {/* Last Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#09AEC3" style={{ marginLeft: 6, marginRight: 8 }} />
              <TextInput
                style={styles.input}
                value={lastName}
                placeholder="Last Name"
                placeholderTextColor="#09AEC3"
                onChangeText={setLastName}
              />
            </View>
          </View>

          {/* Save Changes */}
          <TouchableOpacity style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#051220' },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  hamburgerIcon: {
    position: 'absolute',
    top: 40,
    left: 16,
    zIndex: 30,
    padding: 8,
    backgroundColor: '#031A23',
    borderRadius: 6,
  },
  sidebar: {
    backgroundColor: '#011623',
    width: 280,
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
  },
  sidebarScrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoImage: {
    width: 150,
    height: 50,
    resizeMode: 'contain',
    marginBottom: 50,
    marginTop: 20,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#09AEC3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarIcon: {
    width: 65,
    height: 65,
    resizeMode: 'contain',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userHandle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#09AEC3',
    marginBottom: 30,
  },
  editButton: {
    backgroundColor: '#09AEC3',
    paddingVertical: 8,
    paddingHorizontal: 28,
    borderRadius: 20,
    marginBottom: 30,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  horizontalNavIcons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  navIconButton: {
    padding: 12,
    borderRadius: 10,
  },
  navIconActive: {
    backgroundColor: '#024446',
  },
  navIcon: {
    width: 28,
    height: 28,
    tintColor: '#09AEC3',
    resizeMode: 'contain',
  },
  menuOptions: {
    width: '100%',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomColor: '#08303D',
    borderBottomWidth: 1,
  },
  menuOptionText: {
    color: '#09AEC3',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  profileForm: {
    flex: 1,
    backgroundColor: '#051220',
    paddingHorizontal: 24,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  avatarLarge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#09AEC3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLargeIcon: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#09AEC3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconImage: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 28,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    color: '#09AEC3',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#09AEC3',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 48,
  },
  inputPrefix: {
    color: '#09AEC3',
    fontSize: 18,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 0,
  },
  saveButton: {
    backgroundColor: '#09AEC3',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 200,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});