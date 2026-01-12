import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function EditProfilePage() {
  const [username, setUsername] = useState('@Bowei_Gai');
  const firstName = 'Bowei';
  const lastName = 'Gai';
  const router = useRouter();

  const handleUsernameChange = (text: string) => {
    // Ensure @ always stays at the beginning
    if (text.startsWith('@')) {
      setUsername(text);
    } else if (text.length > 0) {
      // If user tries to remove @, add it back
      setUsername('@' + text.replace('@', ''));
    } else {
      // If empty, just keep @
      setUsername('@');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Fixed Sidebar - always visible */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarIconsBottom}>
            <TouchableOpacity 
              style={[styles.sidebarButton, styles.sidebarActive]}
              onPress={() => router.push('/profile')}
            >
              <Image
                source={require('../../assets/images/blueprofileicon.png')}
                style={styles.iconImage}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarButton}>
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
        <View style={styles.mainContent}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push('/profile')}
          >
            <Image
              source={require('../../assets/images/backbuttonicon.png')}
              style={styles.backButtonIcon}
            />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 60 }}>
            {/* Profile Form Section */}
            <View style={styles.profileFormSection}>
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
                <Ionicons name="person-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  value={username}
                  placeholder="Username"
                  placeholderTextColor="#FFFFFF"
                  onChangeText={handleUsernameChange}
                  autoCapitalize="none"
                />
                <Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              </View>
            </View>

            {/* First Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name</Text>
              <View style={[styles.inputWrapper, styles.readOnlyWrapper]}>
                <Ionicons name="person-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8 }} />
                <Text style={styles.readOnlyText}>{firstName}</Text>
                <Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              </View>
            </View>

            {/* Last Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <View style={[styles.inputWrapper, styles.readOnlyWrapper]}>
                <Ionicons name="person-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8 }} />
                <Text style={styles.readOnlyText}>{lastName}</Text>
                <Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              </View>
            </View>

            {/* Save Changes */}
            <TouchableOpacity style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </View>
      </View>
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
    backgroundColor: '#031A23',
    width: 80,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
    justifyContent: 'flex-end',
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
  mainContent: {
    flex: 1,
    paddingHorizontal: 30,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 25,
    left: 30,
    zIndex: 10,
    padding: 8,
  },
  backButtonIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  profileFormSection: {
    marginBottom: 40,
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
    backgroundColor: '#07bbc0',
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
    backgroundColor: '#07bbc0',
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
    alignItems: 'center',
    width: '100%',
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    alignSelf: 'center',
    width: '65%',
    textAlign: 'left',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 48,
    alignSelf: 'center',
    width: '65%',
  },
  readOnlyWrapper: {
    opacity: 0.7,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  readOnlyText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  saveButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 200,
    marginTop: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
