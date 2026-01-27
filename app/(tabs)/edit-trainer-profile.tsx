import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthController } from '../controllers/AuthController';
import { TrainerApplication } from '../models/TrainerApplication';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

// Belt-based martial arts
const beltBasedMartialArts = [
  'Brazilian Jiu-Jitsu (BJJ)',
  'Judo',
  'Karate',
  'Taekwondo',
  'Kyokushin Karate',
  'Shotokan Karate',
  'Wado-Ryu Karate',
  'Tang Soo Do',
  'Hapkido',
];

// Belt systems
const beltSystems: { [key: string]: string[] } = {
  'Brazilian Jiu-Jitsu (BJJ)': ['White', 'Blue', 'Purple', 'Brown', 'Black'],
  'Judo': ['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Brown', 'Black'],
  'Karate': ['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown', 'Black'],
  'Taekwondo': ['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Red', 'Black'],
  'Kyokushin Karate': ['White', 'Orange', 'Blue', 'Yellow', 'Green', 'Brown', 'Black'],
  'Shotokan Karate': ['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown', 'Black'],
  'Wado-Ryu Karate': ['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown', 'Black'],
  'Tang Soo Do': ['White', 'Orange', 'Green', 'Red', 'Blue', 'Brown', 'Black'],
  'Hapkido': ['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Red', 'Brown', 'Black'],
};

export default function EditTrainerProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();

  // Form state
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [academyName, setAcademyName] = useState('');
  const [beltColor, setBeltColor] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [defenseStyles, setDefenseStyles] = useState<string[]>([]);
  const [showBeltDropdown, setShowBeltDropdown] = useState(false);
  const [beltSearch, setBeltSearch] = useState('');

  // Load trainer application data on mount
  useEffect(() => {
    const loadTrainerData = async () => {
      try {
        const currentUser = await AuthController.getCurrentUser();
        if (!currentUser) {
          showToast('Please log in to edit your trainer profile');
          router.replace('/(auth)/login');
          return;
        }

        const applicationData = await AuthController.getTrainerApplicationData(currentUser.uid);
        if (applicationData) {
          setFullName(applicationData.fullLegalName || '');
          setDisplayName(applicationData.professionalAlias || '');
          setPhone(applicationData.phone || '');
          setEmail(applicationData.email || '');
          setAcademyName(applicationData.academyName || '');
          setBeltColor(applicationData.currentRank || '');
          setPhysicalAddress(applicationData.physicalAddress || '');
          setAboutMe(applicationData.aboutMe || '');
          setDefenseStyles(applicationData.defenseStyles || []);
        } else {
          showToast('Trainer application not found');
          router.back();
        }
      } catch (error) {
        console.error('Error loading trainer data:', error);
        showToast('Failed to load trainer data');
      } finally {
        setInitialLoading(false);
      }
    };

    loadTrainerData();
  }, []);

  // Get available belts based on selected martial arts
  const getAvailableBelts = (): string[] => {
    const allBelts = new Set<string>();
    defenseStyles.forEach(art => {
      if (beltSystems[art]) {
        beltSystems[art].forEach(belt => allBelts.add(belt));
      }
    });
    return Array.from(allBelts).sort();
  };

  const filteredBelts = useMemo(() => {
    return getAvailableBelts().filter(belt =>
      belt.toLowerCase().includes(beltSearch.toLowerCase())
    );
  }, [defenseStyles, beltSearch]);

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const currentUser = await AuthController.getCurrentUser();
      if (!currentUser) {
        showToast('Please log in to save changes');
        return;
      }

      // Validate required fields
      if (!phone.trim()) {
        showToast('Phone number is required');
        return;
      }
      if (!email.trim()) {
        showToast('Email is required');
        return;
      }
      if (!physicalAddress.trim()) {
        showToast('Physical address is required');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address');
        return;
      }

      // Update trainer application
      const updates: Partial<TrainerApplication> = {
        professionalAlias: displayName.trim() || undefined,
        phone: phone.trim(),
        email: email.trim(),
        academyName: academyName.trim() || undefined,
        currentRank: beltColor.trim() || undefined,
        physicalAddress: physicalAddress.trim(),
        aboutMe: aboutMe.trim() || undefined,
      };

      await AuthController.updateTrainerApplication(currentUser.uid, updates);
      
      showToast('Trainer profile updated successfully!');
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.push('/trainer');
      }, 1500);
    } catch (error: any) {
      console.error('Error saving trainer profile:', error);
      showToast(error.message || 'Failed to update trainer profile');
    } finally {
      setLoading(false);
    }
  };

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

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#07bbc0" />
          <Text style={styles.loadingText}>Loading trainer profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            <TouchableOpacity 
              style={styles.sidebarButton}
              onPress={() => router.push('/profile')}
            >
              <Image
                source={require('../../assets/images/blueprofileicon.png')}
                style={styles.iconImage}
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sidebarButton, styles.sidebarActive]}
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
        <View style={styles.mainContent}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push('/trainer')}
          >
            <Image
              source={require('../../assets/images/backbuttonicon.png')}
              style={styles.backButtonIcon}
            />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 60 }}>
            {/* Profile Form Section */}
            <View style={styles.profileFormSection}>
              <Text style={styles.formTitle}>Edit Trainer Profile</Text>

              {/* Full Name - Readonly */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[styles.inputWrapper, styles.readOnlyWrapper]}>
                  <Ionicons name="person-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8 }} />
                  <Text style={styles.readOnlyText}>{fullName}</Text>
                  <Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                </View>
              </View>

              {/* Display Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Display Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="at-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8 }} />
                  <TextInput
                    style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                    value={displayName}
                    placeholder="Display Name"
                    placeholderTextColor="#6b8693"
                    onChangeText={setDisplayName}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8 }} />
                  <TextInput
                    style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                    value={phone}
                    placeholder="Phone Number"
                    placeholderTextColor="#6b8693"
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8 }} />
                  <TextInput
                    style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                    value={email}
                    placeholder="Email Address"
                    placeholderTextColor="#6b8693"
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Academy Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Academy Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="school-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8 }} />
                  <TextInput
                    style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                    value={academyName}
                    placeholder="Academy Name"
                    placeholderTextColor="#6b8693"
                    onChangeText={setAcademyName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Belt Color - Only show if trainer has selected a belt-based martial art */}
              {defenseStyles.some(style => beltBasedMartialArts.includes(style)) && (
                <View style={[styles.inputGroup, showBeltDropdown && styles.inputGroupWithDropdown]}>
                  <Text style={styles.inputLabel}>Belt Color</Text>
                  <TouchableOpacity 
                    style={styles.selectInput}
                    onPress={() => setShowBeltDropdown(!showBeltDropdown)}
                  >
                    <Ionicons name="ribbon-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8 }} />
                    <Text style={beltColor ? styles.selectedText : styles.placeholderText}>
                      {beltColor || 'Select belt color...'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#07bbc0" style={{ marginRight: 8 }} />
                  </TouchableOpacity>
                  {showBeltDropdown && (
                    <>
                      <TouchableOpacity
                        style={styles.dropdownOverlay}
                        activeOpacity={1}
                        onPress={() => {
                          setShowBeltDropdown(false);
                          setBeltSearch('');
                        }}
                      />
                      <View style={styles.dropdown}>
                        <View style={styles.searchContainer}>
                          <Ionicons name="search-outline" size={20} color="#6b8693" style={styles.searchIcon} />
                          <TextInput
                            style={[styles.searchInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                            placeholder="Search belt color..."
                            placeholderTextColor="#6b8693"
                            value={beltSearch}
                            onChangeText={setBeltSearch}
                            autoFocus={false}
                          />
                          {beltSearch.length > 0 && (
                            <TouchableOpacity onPress={() => setBeltSearch('')}>
                              <Ionicons name="close-circle" size={20} color="#6b8693" />
                            </TouchableOpacity>
                          )}
                        </View>
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                          {filteredBelts.length > 0 ? (
                            filteredBelts.map((belt) => (
                              <TouchableOpacity
                                key={belt}
                                style={[
                                  styles.dropdownItem,
                                  beltColor === belt && styles.dropdownItemSelected,
                                ]}
                                onPress={() => {
                                  setBeltColor(belt);
                                  setShowBeltDropdown(false);
                                  setBeltSearch('');
                                }}
                              >
                                <Text style={[
                                  styles.dropdownItemText,
                                  beltColor === belt && styles.dropdownItemTextSelected,
                                ]}>
                                  {belt}
                                </Text>
                                {beltColor === belt && (
                                  <Ionicons name="checkmark" size={20} color="#07bbc0" />
                                )}
                              </TouchableOpacity>
                            ))
                          ) : (
                            <View style={styles.dropdownItem}>
                              <Text style={styles.dropdownItemText}>No results found</Text>
                            </View>
                          )}
                        </ScrollView>
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* Physical Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Physical Address</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="location-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8 }} />
                  <TextInput
                    style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                    value={physicalAddress}
                    placeholder="Physical Address"
                    placeholderTextColor="#6b8693"
                    onChangeText={setPhysicalAddress}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </View>

              {/* About Me */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>About Me</Text>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <Ionicons name="document-text-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8, marginTop: 12, alignSelf: 'flex-start' }} />
                  <TextInput
                    style={[styles.input, styles.textArea, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                    value={aboutMe}
                    placeholder="Tell us about yourself..."
                    placeholderTextColor="#6b8693"
                    onChangeText={setAboutMe}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* Save Changes */}
              <TouchableOpacity 
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={loading}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  profileFormSection: {
    marginBottom: 40,
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
  textAreaWrapper: {
    height: 120,
    alignItems: 'flex-start',
    paddingTop: 12,
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
  textArea: {
    textAlignVertical: 'top',
    paddingTop: 8,
    minHeight: 80,
  },
  readOnlyText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  inputGroupWithDropdown: {
    position: 'relative',
    zIndex: 1000,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#01151F',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#07bbc0',
    paddingHorizontal: 15,
    minHeight: 48,
    justifyContent: 'space-between',
    alignSelf: 'center',
    width: '65%',
  },
  placeholderText: {
    flex: 1,
    color: '#6b8693',
    fontSize: 16,
  },
  selectedText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  dropdownOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
    backgroundColor: 'transparent',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#01151F',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#07bbc0',
    marginTop: 4,
    maxHeight: 200,
    zIndex: 9999,
    alignSelf: 'center',
    width: '65%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0a3645',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    padding: 0,
  },
  dropdownScroll: {
    maxHeight: 150,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#0a3645',
  },
  dropdownItemSelected: {
    backgroundColor: '#062731',
  },
  dropdownItemText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  dropdownItemTextSelected: {
    color: '#07bbc0',
    fontWeight: '600',
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
});
