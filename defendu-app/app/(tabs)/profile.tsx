import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
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
    useWindowDimensions,
    View,
} from 'react-native';
import OfflineModeModal from '../../components/OfflineModeModal';
import { getSidebarWidth, Breakpoints } from '../../constants/layout';
import { useLogout } from '../../hooks/useLogout';
import { OfflineStorage } from '../_utils/offlineStorage';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';
import { AuthController } from '../controllers/AuthController';

const PRIVACY_URL = 'https://defendu.com/privacy';
const TERMS_URL = 'https://defendu.com/terms';
const CONTACT_EMAIL = 'support@defendu.com';

/** Display avatar is 150×150; cap source uploads to keep picks fast and avoid memory issues. */
const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PROFILE_IMAGE_LABEL = '5 MB';

const MAX_COVER_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_COVER_IMAGE_LABEL = '12 MB';

export default function ProfilePage() {
  const router = useRouter();
  const handleLogout = useLogout();
  const { width: screenWidth } = useWindowDimensions();
  const sidebarW = getSidebarWidth(screenWidth);
  const isMobile = screenWidth < Breakpoints.tablet;
  const { unreadCount, unreadDisplay, clearUnread } = useUnreadMessages();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
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

  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [showCoverPickerModal, setShowCoverPickerModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);

  const alertImageTooLarge = useCallback(() => {
    Alert.alert(
      'Image too large',
      `Please choose a photo under ${MAX_PROFILE_IMAGE_LABEL}. Smaller files work best for your profile picture.`
    );
  }, []);

  const alertCoverTooLarge = useCallback(() => {
    Alert.alert(
      'Cover image too large',
      `Please choose an image under ${MAX_COVER_IMAGE_LABEL}.`
    );
  }, []);

  const resolveImageByteSize = async (
    uri: string,
    knownSize?: number | null
  ): Promise<number> => {
    if (knownSize != null && knownSize > 0) return knownSize;
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size;
  };

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
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setProfilePicture(user.profilePicture || null);
      setCoverPhoto(user.coverPhoto || null);

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

  const handleImagePickerPress = () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
    } else {
      setShowImagePickerModal(true);
    }
  };

  const handleWebFileSelect = async (event: { target: { value: string; files?: FileList | null } }) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Alert.alert('Invalid file', 'Please select an image file.');
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      alertImageTooLarge();
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    try {
      setUploadingPicture(true);
      await processWebImage(imageUrl);
    } catch (e) {
      console.error('Web profile image:', e);
      Alert.alert('Error', 'Could not process the image. Please try another photo.');
    } finally {
      URL.revokeObjectURL(imageUrl);
      setUploadingPicture(false);
    }
  };

  const processWebImage = async (imageUrl: string) => {
    return new Promise<void>((resolve, reject) => {
      const img = typeof document !== 'undefined' ? document.createElement('img') : null;
      if (!img) {
        reject(new Error('No document'));
        return;
      }
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas'));
            return;
          }
          const size = Math.min(img.width, img.height);
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;
          canvas.width = 400;
          canvas.height = 400;
          ctx.drawImage(img, x, y, size, size, 0, 0, 400, 400);
          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                reject(new Error('Blob'));
                return;
              }
              try {
                const blobUrl = URL.createObjectURL(blob);
                const downloadURL = await AuthController.updateProfilePicture(blobUrl);
                URL.revokeObjectURL(blobUrl);
                setProfilePicture(`${downloadURL}?t=${Date.now()}`);
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            'image/jpeg',
            0.75
          );
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Load'));
      img.src = imageUrl;
    });
  };

  const handleTakePhoto = async () => {
    setShowImagePickerModal(false);
    try {
      const permission = await ImagePicker.getCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        const next = await ImagePicker.requestCameraPermissionsAsync();
        if (next.status !== 'granted') {
          Alert.alert('Permission needed', 'Camera access is required to take a photo.');
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const bytes = await resolveImageByteSize(asset.uri, asset.fileSize);
        if (bytes > MAX_PROFILE_IMAGE_BYTES) {
          alertImageTooLarge();
          return;
        }
        await uploadProfileImage(asset.uri);
      }
    } catch (e) {
      console.error('Camera:', e);
      Alert.alert('Error', 'Could not take a photo. Please try again.');
    }
  };

  const handlePickFromGallery = async () => {
    setShowImagePickerModal(false);
    try {
      const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        const next = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (next.status !== 'granted') {
          Alert.alert('Permission needed', 'Photo library access is required to choose a picture.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const bytes = await resolveImageByteSize(asset.uri, asset.fileSize);
        if (bytes > MAX_PROFILE_IMAGE_BYTES) {
          alertImageTooLarge();
          return;
        }
        await uploadProfileImage(asset.uri);
      }
    } catch (e) {
      console.error('Gallery:', e);
      Alert.alert('Error', 'Could not open your photos. Please try again.');
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    setUploadingPicture(true);
    try {
      const optimized = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
      );
      const downloadURL = await AuthController.updateProfilePicture(optimized.uri);
      setProfilePicture(`${downloadURL}?t=${Date.now()}`);
    } catch (e) {
      console.error('uploadProfileImage:', e);
      Alert.alert('Error', 'Could not update your profile picture. Please try again.');
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleCoverPickerPress = () => {
    if (Platform.OS === 'web') {
      coverFileInputRef.current?.click();
    } else {
      setShowCoverPickerModal(true);
    }
  };

  const handleWebCoverFileSelect = async (event: { target: { value: string; files?: FileList | null } }) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      Alert.alert('Invalid file', 'Please select an image file.');
      return;
    }
    if (file.size > MAX_COVER_IMAGE_BYTES) {
      alertCoverTooLarge();
      return;
    }
    const imageUrl = URL.createObjectURL(file);
    try {
      setUploadingCover(true);
      await processWebCoverImage(imageUrl);
    } catch (e) {
      console.error('Web cover image:', e);
      Alert.alert('Error', 'Could not process the cover image. Please try another photo.');
    } finally {
      URL.revokeObjectURL(imageUrl);
      setUploadingCover(false);
    }
  };

  const processWebCoverImage = async (imageUrl: string) => {
    const targetW = 1200;
    const targetH = 400;
    return new Promise<void>((resolve, reject) => {
      const img = typeof document !== 'undefined' ? document.createElement('img') : null;
      if (!img) {
        reject(new Error('No document'));
        return;
      }
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas'));
            return;
          }
          canvas.width = targetW;
          canvas.height = targetH;
          const scale = Math.max(targetW / img.width, targetH / img.height);
          const rw = img.width * scale;
          const rh = img.height * scale;
          const ox = (targetW - rw) / 2;
          const oy = (targetH - rh) / 2;
          ctx.drawImage(img, 0, 0, img.width, img.height, ox, oy, rw, rh);
          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                reject(new Error('Blob'));
                return;
              }
              try {
                const blobUrl = URL.createObjectURL(blob);
                const downloadURL = await AuthController.updateCoverPhoto(blobUrl);
                URL.revokeObjectURL(blobUrl);
                setCoverPhoto(`${downloadURL}?t=${Date.now()}`);
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            'image/jpeg',
            0.82
          );
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Load'));
      img.src = imageUrl;
    });
  };

  const handleCoverTakePhoto = async () => {
    setShowCoverPickerModal(false);
    try {
      const permission = await ImagePicker.getCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        const next = await ImagePicker.requestCameraPermissionsAsync();
        if (next.status !== 'granted') {
          Alert.alert('Permission needed', 'Camera access is required to take a photo.');
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 1],
        quality: 1,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const bytes = await resolveImageByteSize(asset.uri, asset.fileSize);
        if (bytes > MAX_COVER_IMAGE_BYTES) {
          alertCoverTooLarge();
          return;
        }
        await uploadCoverImage(asset.uri);
      }
    } catch (e) {
      console.error('Cover camera:', e);
      Alert.alert('Error', 'Could not take a photo. Please try again.');
    }
  };

  const handleCoverPickFromGallery = async () => {
    setShowCoverPickerModal(false);
    try {
      const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        const next = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (next.status !== 'granted') {
          Alert.alert('Permission needed', 'Photo library access is required to choose a picture.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 1],
        quality: 1,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const bytes = await resolveImageByteSize(asset.uri, asset.fileSize);
        if (bytes > MAX_COVER_IMAGE_BYTES) {
          alertCoverTooLarge();
          return;
        }
        await uploadCoverImage(asset.uri);
      }
    } catch (e) {
      console.error('Cover gallery:', e);
      Alert.alert('Error', 'Could not open your photos. Please try again.');
    }
  };

  const uploadCoverImage = async (imageUri: string) => {
    setUploadingCover(true);
    try {
      const optimized = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1200 } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
      );
      const downloadURL = await AuthController.updateCoverPhoto(optimized.uri);
      setCoverPhoto(`${downloadURL}?t=${Date.now()}`);
    } catch (e) {
      console.error('uploadCoverImage:', e);
      Alert.alert('Error', 'Could not update your cover photo. Please try again.');
    } finally {
      setUploadingCover(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Sidebar - desktop/tablet only */}
        {!isMobile && (
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
        )}

        {/* Main Content */}
        <View style={styles.mainContentWrap}>
          {/* Mobile Header */}
          {isMobile && (
            <View style={styles.mobileHeader}>
              <TouchableOpacity onPress={() => setShowMobileMenu(true)} style={styles.hamburgerBtn}>
                <Ionicons name="menu" size={26} color="#FFFFFF" />
                {unreadCount > 0 && (
                  <View style={styles.hamburgerBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadDisplay}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.mobileHeaderTitle}>Profile</Text>
              <View style={{ width: 40 }} />
            </View>
          )}
          {Platform.OS === 'web' && (
            <>
              <input
                ref={(el) => {
                  fileInputRef.current = el;
                }}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleWebFileSelect}
              />
              <input
                ref={(el) => {
                  coverFileInputRef.current = el;
                }}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleWebCoverFileSelect}
              />
            </>
          )}
          <TouchableOpacity
            style={styles.coverCornerButton}
            onPress={handleCoverPickerPress}
            disabled={uploadingCover || uploadingPicture}
            accessibilityLabel="Add or change cover photo"
          >
            {uploadingCover ? (
              <ActivityIndicator color="#07bbc0" size="small" />
            ) : (
              <>
                <Ionicons name="image-outline" size={18} color="#07bbc0" />
                <Text style={styles.coverCornerButtonText}>Add cover photo</Text>
              </>
            )}
          </TouchableOpacity>
          <ScrollView style={[styles.mainContent, isMobile && { paddingHorizontal: 16 }]} contentContainerStyle={{ paddingBottom: 40, paddingTop: 25 }}>
          {/* Profile header: cover behind avatar, name below */}
          <View style={styles.profileDisplaySection}>
            <View style={styles.profileHero}>
              <View style={styles.coverStrip}>
                {coverPhoto ? (
                  <Image
                    source={{ uri: coverPhoto }}
                    style={styles.coverImage}
                    resizeMode="cover"
                  />
                ) : null}
              </View>
              <View style={styles.avatarOverlap}>
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
                    {uploadingPicture && (
                      <View style={styles.avatarUploadOverlay}>
                        <ActivityIndicator color="#FFFFFF" size="large" />
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.avatarAddBadge}
                    onPress={handleImagePickerPress}
                    disabled={uploadingPicture}
                    accessibilityLabel="Add or change profile picture"
                  >
                    <Ionicons name="add" size={26} color="#041527" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={styles.userName}>{fullName}</Text>

            <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
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
            <TouchableOpacity style={styles.menuOption} onPress={() => router.push('/settings')}>
              <Ionicons name="settings-outline" size={20} color="#07bbc0" />
              <Text style={styles.menuOptionText}>Settings</Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#07bbc0" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => router.push('/location')}>
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
      </View>

      {/* Pop-up Menu */}
      {showMenu && (
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.menuContainer, isMobile && styles.menuContainerMobile]}>
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

      {/* Mobile Drawer */}
      {showMobileMenu && (
        <TouchableOpacity
          style={styles.drawerOverlay}
          activeOpacity={1}
          onPress={() => setShowMobileMenu(false)}
        >
          <View style={styles.drawerContainer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setShowMobileMenu(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.drawerItem} onPress={() => { setShowMobileMenu(false); router.push('/dashboard'); }}>
              <Image source={require('../../assets/images/homeicon.png')} style={styles.drawerIcon} />
              <Text style={styles.drawerItemText}>Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.drawerItem, styles.drawerItemActive]}>
              <Image source={require('../../assets/images/blueprofileicon.png')} style={styles.drawerIcon} />
              <Text style={styles.drawerItemText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerItem} onPress={() => { setShowMobileMenu(false); router.push('/trainer'); }}>
              <Image source={require('../../assets/images/trainericon.png')} style={styles.drawerIcon} />
              <Text style={styles.drawerItemText}>Trainer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerItem} onPress={() => { setShowMobileMenu(false); handleMessages(); }}>
              <Image source={require('../../assets/images/messageicon.png')} style={styles.drawerIcon} />
              <Text style={styles.drawerItemText}>Messages</Text>
              {unreadCount > 0 && (
                <View style={styles.drawerBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadDisplay}</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.drawerSeparator} />

            <TouchableOpacity style={styles.drawerItem} onPress={() => { setShowMobileMenu(false); handleLogout(); }}>
              <Image source={require('../../assets/images/logouticon.png')} style={styles.drawerIcon} />
              <Text style={[styles.drawerItemText, { color: '#e57373' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {Platform.OS !== 'web' && (
        <Modal
          visible={showImagePickerModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowImagePickerModal(false)}
        >
          <TouchableOpacity
            style={styles.imagePickerModalOverlay}
            activeOpacity={1}
            onPress={() => setShowImagePickerModal(false)}
          >
            <View style={styles.imagePickerSheet}>
              <Text style={styles.imagePickerTitle}>Profile picture</Text>
              <Text style={styles.imagePickerHint}>Max size {MAX_PROFILE_IMAGE_LABEL}</Text>
              <TouchableOpacity style={styles.imagePickerOption} onPress={handleTakePhoto}>
                <Ionicons name="camera" size={24} color="#07bbc0" />
                <Text style={styles.imagePickerOptionText}>Take photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imagePickerOption} onPress={handlePickFromGallery}>
                <Ionicons name="images" size={24} color="#07bbc0" />
                <Text style={styles.imagePickerOptionText}>Choose from library</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.imagePickerOption, styles.imagePickerCancel]}
                onPress={() => setShowImagePickerModal(false)}
              >
                <Text style={styles.imagePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {Platform.OS !== 'web' && (
        <Modal
          visible={showCoverPickerModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCoverPickerModal(false)}
        >
          <TouchableOpacity
            style={styles.imagePickerModalOverlay}
            activeOpacity={1}
            onPress={() => setShowCoverPickerModal(false)}
          >
            <View style={styles.imagePickerSheet}>
              <Text style={styles.imagePickerTitle}>Cover photo</Text>
              <Text style={styles.imagePickerHint}>Wide banner (3:1). Max {MAX_COVER_IMAGE_LABEL}</Text>
              <TouchableOpacity style={styles.imagePickerOption} onPress={handleCoverTakePhoto}>
                <Ionicons name="camera" size={24} color="#07bbc0" />
                <Text style={styles.imagePickerOptionText}>Take photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imagePickerOption} onPress={handleCoverPickFromGallery}>
                <Ionicons name="images" size={24} color="#07bbc0" />
                <Text style={styles.imagePickerOptionText}>Choose from library</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.imagePickerOption, styles.imagePickerCancel]}
                onPress={() => setShowCoverPickerModal(false)}
              >
                <Text style={styles.imagePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
    width: 72,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRightWidth: 1,
    borderRightColor: 'rgba(7,187,192,0.08)',
  },
  sidebarIconsBottom: {
    flexDirection: 'column',
    width: '100%',
    alignItems: 'center',
  },
  sidebarButton: {
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
  },
  sidebarActive: {
    backgroundColor: 'rgba(2, 68, 70, 0.7)',
    borderLeftWidth: 3,
    borderLeftColor: '#07bbc0',
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
  mainContentWrap: {
    flex: 1,
    position: 'relative',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 30,
  },
  coverCornerButton: {
    position: 'absolute',
    top: 10,
    right: 12,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(4, 21, 39, 0.94)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(7, 187, 192, 0.4)',
    maxWidth: '58%',
  },
  coverCornerButtonText: {
    color: '#07bbc0',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    flexShrink: 1,
  },
  profileDisplaySection: {
    marginBottom: 40,
    alignItems: 'center',
    paddingTop: 8,
  },
  profileHero: {
    width: '100%',
    marginHorizontal: -30,
    alignItems: 'center',
  },
  coverStrip: {
    width: '100%',
    height: 152,
    backgroundColor: '#0a1e30',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  avatarOverlap: {
    marginTop: -76,
    alignItems: 'center',
    zIndex: 2,
    marginBottom: 8,
  },
  avatarContainer: {
    alignSelf: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarUploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarAddBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#07bbc0',
    borderWidth: 2.5,
    borderColor: '#041527',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarLarge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#07bbc0',
    overflow: 'hidden',
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  avatarLargeIcon: {
    width: 100,
    height: 100,
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
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0,
  },
  editButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  editButtonText: {
    color: '#041527',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  editHint: {
    color: 'rgba(107,134,147,0.8)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  heightWeightSection: {
    backgroundColor: 'rgba(7, 187, 192, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.1)',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0,
  },
  sectionHint: {
    color: 'rgba(107,134,147,0.8)',
    fontSize: 12,
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
    color: 'rgba(107,134,147,0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  hwInput: {
    backgroundColor: '#021422',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(7,187,192,0.2)',
    color: '#FFFFFF',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveStatsBtn: {
    backgroundColor: '#07bbc0',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  saveStatsBtnText: {
    color: '#041527',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
  linksSection: {
    marginTop: 12,
    marginHorizontal: 8,
    backgroundColor: 'rgba(7, 187, 192, 0.04)',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.08)',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 134, 147, 0.1)',
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
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 115, 115, 0.3)',
    marginHorizontal: 8,
    backgroundColor: 'rgba(229,115,115,0.05)',
  },
  resetButtonText: {
    color: '#e57373',
    fontSize: 14,
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
    backgroundColor: '#021422',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(7,187,192,0.2)',
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
    borderColor: 'rgba(107,134,147,0.35)',
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
    marginTop: 20,
    paddingHorizontal: 8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(7, 187, 192, 0.04)',
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.08)',
  },
  menuOptionText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 14,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: 'rgba(107, 134, 147, 0.15)',
    marginVertical: 4,
    marginHorizontal: 4,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 14, 28, 0.6)',
  },
  menuContainer: {
    position: 'absolute',
    top: 20,
    left: 82,
    backgroundColor: '#021422',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.2)',
    paddingVertical: 8,
    minWidth: 190,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  menuIcon: {
    width: 22,
    height: 22,
    marginRight: 12,
    resizeMode: 'contain',
    tintColor: '#07bbc0',
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 15,
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
  imagePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  imagePickerSheet: {
    backgroundColor: '#011f36',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 36,
    paddingHorizontal: 20,
  },
  imagePickerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  imagePickerHint: {
    color: '#6b8693',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  imagePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#024446',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  imagePickerOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  imagePickerCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(107,134,147,0.3)',
    marginTop: 4,
    justifyContent: 'center',
  },
  imagePickerCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },
  // Mobile responsive styles
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000E1C',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(7, 187, 192, 0.1)',
  },
  mobileHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  hamburgerBtn: {
    padding: 6,
    position: 'relative',
  },
  hamburgerBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  menuContainerMobile: {
    left: 16,
    top: 56,
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
    backgroundColor: 'rgba(0, 14, 28, 0.75)',
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#000E1C',
    paddingTop: 20,
    borderRightWidth: 1,
    borderRightColor: 'rgba(7, 187, 192, 0.15)',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 134, 147, 0.15)',
    marginBottom: 8,
  },
  drawerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  drawerItemActive: {
    backgroundColor: 'rgba(7, 187, 192, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#07bbc0',
  },
  drawerIcon: {
    width: 24,
    height: 24,
    marginRight: 14,
    resizeMode: 'contain',
    tintColor: '#07bbc0',
  },
  drawerItemText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  drawerBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    paddingHorizontal: 6,
  },
  drawerSeparator: {
    height: 1,
    backgroundColor: 'rgba(107, 134, 147, 0.15)',
    marginVertical: 8,
    marginHorizontal: 20,
  },
  purchasedModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  purchasedModalSheet: {
    backgroundColor: '#011f36',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  purchasedModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  purchasedModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  purchasedEmptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  purchasedEmptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 14,
  },
  purchasedEmptyHint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  purchasedModuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(7,187,192,0.05)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.1)',
  },
  purchasedModuleInfo: {
    flex: 1,
    marginRight: 8,
  },
  purchasedModuleTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  purchasedDiffBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 5,
  },
  purchasedDiffText: {
    fontSize: 11,
    fontWeight: '700',
  },
});