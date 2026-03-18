import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { AuthController } from '../controllers/AuthController';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useLogout } from '../../hooks/useLogout';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';

export default function EditProfilePage() {
  const [username, setUsername] = useState('@');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();
  const handleLogout = useLogout();
  const unreadMessages = useUnreadMessages();
  const unreadCount = unreadMessages?.unreadCount ?? 0;
  const unreadDisplay = unreadMessages?.unreadDisplay ?? '0';
  const clearUnread = unreadMessages?.clearUnread ?? (async () => {});

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      console.log('🔵 Requesting camera and media library permissions...');
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      console.log('📷 Camera permission status:', cameraPermission.status);
      console.log('🖼️ Media library permission status:', mediaLibraryPermission.status);
      
      if (cameraPermission.status !== 'granted') {
        console.warn('⚠️ Camera permission not granted');
        showToast('Camera permission is required to take photos');
      }
      if (mediaLibraryPermission.status !== 'granted') {
        console.warn('⚠️ Media library permission not granted');
        showToast('Gallery permission is required to select photos');
      }
    })();
  }, []);

  // Load user data on mount
  useEffect(() => {
    const loadUserData = async () => {
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
      } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Failed to load user data');
      } finally {
        setInitialLoading(false);
      }
    };

    loadUserData();
  }, []);

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

  const handleSave = async () => {
    try {
      // Validate username
      const cleanUsername = username.substring(1); // Remove @
      if (!cleanUsername || cleanUsername.trim().length === 0) {
        showToast('Username cannot be empty');
        return;
      }

      setLoading(true);
      
      // Save username to database
      await AuthController.updateUsername(username);
      
      showToast('Username updated successfully!');
      
      // Navigate back to profile after a short delay
      setTimeout(() => {
        router.push('/profile');
      }, 1500);
    } catch (error: any) {
      console.error('Error saving username:', error);
      showToast(error.message || 'Failed to update username');
    } finally {
      setLoading(false);
    }
  };

  const handleMessages = () => {
    clearUnread();
    setShowMenu(false);
    router.push('/messages');
  };

  const handleImagePickerPress = () => {
    if (Platform.OS === 'web') {
      // On web, directly trigger file input
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } else {
      // On mobile, show modal with camera/gallery options
      setShowImagePickerModal(true);
    }
  };

  const handleWebFileSelect = async (event: any) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('🌐 No file selected');
      return;
    }

    // Reset the input so the same file can be selected again
    event.target.value = '';

    try {
      setUploadingPicture(true);
      console.log('🌐 Web file selected:', file.name, file.type, file.size, 'bytes');

      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast('Please select an image file');
        setUploadingPicture(false);
        return;
      }

      // Create a local URL for the file
      const imageUrl = URL.createObjectURL(file);
      console.log('🌐 Object URL created:', imageUrl);
      
      // For web, we'll resize and crop using canvas
      await processWebImage(imageUrl, file);
      
      // Clean up the object URL
      URL.revokeObjectURL(imageUrl);
      console.log('🌐 Object URL cleaned up');
    } catch (error: any) {
      console.error('❌ Error processing web image:', error);
      console.error('❌ Error stack:', error.stack);
      showToast('Failed to process image: ' + error.message);
      setUploadingPicture(false);
    }
  };

  const processWebImage = async (imageUrl: string, file: File) => {
    return new Promise<void>((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = async () => {
        try {
          console.log('🌐 Image loaded, dimensions:', img.width, 'x', img.height);
          
          // Create canvas for cropping
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get canvas context');

          // Calculate square crop (center crop)
          const size = Math.min(img.width, img.height);
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;

          console.log('🌐 Cropping from:', x, y, 'size:', size);

          // Set canvas size to 400x400 for profile picture (smaller = faster upload)
          canvas.width = 400;
          canvas.height = 400;

          // Draw cropped and resized image
          ctx.drawImage(img, x, y, size, size, 0, 0, 400, 400);
          console.log('🌐 Image drawn to canvas');

          // Convert canvas to blob
          canvas.toBlob(async (blob) => {
            if (!blob) {
              reject(new Error('Failed to create image blob'));
              setUploadingPicture(false);
              return;
            }

            console.log('🌐 Blob created, size:', blob.size, 'bytes');

            try {
              // Create a blob URL that can be fetched
              const blobUrl = URL.createObjectURL(blob);
              console.log('🌐 Blob URL created:', blobUrl);
              
              // Upload to Firebase using the blob URL
              const downloadURL = await AuthController.updateProfilePicture(blobUrl);
              console.log('✅ Upload successful, download URL:', downloadURL);
              
              // Clean up blob URL
              URL.revokeObjectURL(blobUrl);
              
              // Update local state with cache-busting parameter to ensure fresh image
              const cacheBustedUrl = `${downloadURL}?t=${Date.now()}`;
              setProfilePicture(cacheBustedUrl);
              showToast('Profile picture updated successfully!');
              resolve();
            } catch (error: any) {
              console.error('❌ Upload error:', error);
              reject(error);
            } finally {
              setUploadingPicture(false);
            }
          }, 'image/jpeg', 0.75);
        } catch (error: any) {
          console.error('❌ Canvas error:', error);
          setUploadingPicture(false);
          reject(error);
        }
      };
      img.onerror = () => {
        console.error('❌ Failed to load image');
        setUploadingPicture(false);
        reject(new Error('Failed to load image'));
      };
      img.src = imageUrl;
    });
  };

  const handleTakePhoto = async () => {
    setShowImagePickerModal(false);
    try {
      console.log('📷 Launching camera...');
      
      // Check permission first
      const permission = await ImagePicker.getCameraPermissionsAsync();
      console.log('📷 Camera permission check:', permission.status);
      
      if (permission.status !== 'granted') {
        console.log('📷 Requesting camera permission...');
        const newPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (newPermission.status !== 'granted') {
          showToast('Camera permission is required');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, // Enable built-in editing/cropping UI
        aspect: [1, 1], // Square aspect ratio for profile pictures
        quality: 1,
      });

      console.log('📷 Camera result:', result.canceled ? 'Canceled' : 'Success');
      
      if (!result.canceled && result.assets[0]) {
        console.log('📷 Image selected, uploading...');
        await uploadImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('❌ Error taking photo:', error);
      console.error('❌ Error details:', error.message, error.code);
      showToast('Failed to take photo: ' + error.message);
    }
  };

  const handlePickFromGallery = async () => {
    setShowImagePickerModal(false);
    try {
      console.log('🖼️ Launching gallery...');
      
      // Check permission first
      const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
      console.log('🖼️ Media library permission check:', permission.status);
      
      if (permission.status !== 'granted') {
        console.log('🖼️ Requesting media library permission...');
        const newPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (newPermission.status !== 'granted') {
          showToast('Gallery permission is required');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, // Enable built-in editing/cropping UI
        aspect: [1, 1], // Square aspect ratio for profile pictures
        quality: 1,
      });

      console.log('🖼️ Gallery result:', result.canceled ? 'Canceled' : 'Success');
      
      if (!result.canceled && result.assets[0]) {
        console.log('🖼️ Image selected, uploading...');
        await uploadImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('❌ Error picking image:', error);
      console.error('❌ Error details:', error.message, error.code);
      showToast('Failed to pick image: ' + error.message);
    }
  };

  const uploadImage = async (imageUri: string) => {
    try {
      setUploadingPicture(true);

      // Resize the already-cropped image to optimal size for profile picture
      // The image is already cropped by the user in the picker UI
      const optimizedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: 400, height: 400 } }, // Resize to 400x400 for faster upload
        ],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Upload to Firebase Storage and update database
      const downloadURL = await AuthController.updateProfilePicture(optimizedImage.uri);
      
      // Update local state with cache-busting parameter to ensure fresh image
      const cacheBustedUrl = `${downloadURL}?t=${Date.now()}`;
      setProfilePicture(cacheBustedUrl);
      showToast('Profile picture updated successfully!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      showToast(error.message || 'Failed to update profile picture');
    } finally {
      setUploadingPicture(false);
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
                resizeMode="contain"
              />
            </TouchableOpacity>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadDisplay}</Text>
              </View>
            )}
          </View>

          <View style={styles.sidebarIconsBottom}>
            <TouchableOpacity 
              style={[styles.sidebarButton, styles.sidebarActive]}
              onPress={() => router.push('/profile')}
            >
              <Image
                source={require('../../assets/images/blueprofileicon.png')}
                style={styles.iconImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sidebarButton}
              onPress={() => router.push('/trainer')}
            >
              <Image
                source={require('../../assets/images/trainericon.png')}
                style={styles.iconImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sidebarButton}
              onPress={() => router.push('/dashboard')}
            >
              <Image
                source={require('../../assets/images/homeicon.png')}
                style={styles.iconImage}
                resizeMode="contain"
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
              resizeMode="contain"
            />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 60 }}>
            {/* Profile Form Section */}
            <View style={styles.profileFormSection}>
            {/* Hidden file input for web */}
            {Platform.OS === 'web' && (
              <input
                ref={(ref) => (fileInputRef.current = ref as any)}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleWebFileSelect}
              />
            )}
            
            {/* Avatar with camera - Larger */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarLarge}>
                {profilePicture ? (
                  <Image
                    source={{ uri: profilePicture }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Image
                    source={require('../../assets/images/profilepictureplaceholdericon.png')}
                    style={styles.avatarLargeIcon}
                    resizeMode="contain"
                  />
                )}
                {uploadingPicture && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color="#FFFFFF" size="large" />
                  </View>
                )}
              </View>
              <TouchableOpacity 
                style={styles.cameraIcon}
                onPress={handleImagePickerPress}
                disabled={uploadingPicture}
              >
                <Image
                  source={require('../../assets/images/addprofilepictureicon.png')}
                  style={styles.cameraIconImage}
                  resizeMode="contain"
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
                  style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
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
            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading || initialLoading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
          </ScrollView>
        </View>
      </View>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={hideToast}
        duration={3000}
      />

      {/* Image Picker Modal - Only show on mobile */}
      {Platform.OS !== 'web' && (
      <Modal
        visible={showImagePickerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowImagePickerModal(false)}
        >
          <View style={styles.imagePickerModal}>
            <Text style={styles.modalTitle}>Select Profile Picture</Text>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={handleTakePhoto}
            >
              <Ionicons name="camera" size={24} color="#07bbc0" />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={handlePickFromGallery}
            >
              <Ionicons name="images" size={24} color="#07bbc0" />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalOption, styles.modalCancel]}
              onPress={() => setShowImagePickerModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      )}

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
                resizeMode="contain"
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
                resizeMode="contain"
              />
              <Text style={styles.menuText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
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
  },
  avatarImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
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
  saveButtonDisabled: {
    opacity: 0.6,
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
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  imagePickerModal: {
    backgroundColor: '#011f36',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#024446',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  modalCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6b8693',
    marginTop: 8,
  },
  modalCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },
});
