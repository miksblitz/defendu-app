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
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthController } from '../controllers/AuthController';
import { TrainerApplication } from '../_models/TrainerApplication';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useLogout } from '../../hooks/useLogout';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';

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

const allDefenseStyles = [
  'Aikido',
  'Boxing',
  'Brazilian Jiu-Jitsu (BJJ)',
  'Hapkido',
  'Jeet Kune Do',
  'Judo',
  'Karate',
  'Kickboxing',
  'Krav Maga',
  'Kung Fu',
  'Kyokushin Karate',
  'Mixed Martial Arts (MMA)',
  'Muay Thai',
  'Shotokan Karate',
  'Taekwondo',
  'Tang Soo Do',
  'Wado-Ryu Karate',
  'Wing Chun',
  'Wrestling',
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
  const formatDateToIso = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseIsoDate = (value: string): Date | null => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const [, yearText, monthText, dayText] = match;
    const parsed = new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();
  const handleLogout = useLogout();

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [academyName, setAcademyName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [beltColor, setBeltColor] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [yearsOfTeaching, setYearsOfTeaching] = useState('');
  const [defenseStyles, setDefenseStyles] = useState<string[]>([]);
  const [showBeltDropdown, setShowBeltDropdown] = useState(false);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [showExperienceDropdown, setShowExperienceDropdown] = useState(false);
  const [showTeachingDropdown, setShowTeachingDropdown] = useState(false);
  const [beltSearch, setBeltSearch] = useState('');
  const [styleSearch, setStyleSearch] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dobPickerDate, setDobPickerDate] = useState(new Date(1990, 0, 1));

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
          const fallbackFullName =
            `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
            currentUser.username ||
            '';

          const loaded = {
            fullName: applicationData.fullLegalName || fallbackFullName,
            phone: applicationData.phone || '',
            email: applicationData.email || currentUser.email || '',
            academyName: applicationData.academyName || '',
            dateOfBirth: applicationData.dateOfBirth || '',
            beltColor: applicationData.currentRank || '',
            physicalAddress: applicationData.physicalAddress || '',
            yearsOfExperience: applicationData.yearsOfExperience || '',
            yearsOfTeaching: applicationData.yearsOfTeaching || '',
            defenseStyles: applicationData.defenseStyles || [],
          };
          setFullName(loaded.fullName);
          setPhone(loaded.phone);
          setEmail(loaded.email);
          setAcademyName(loaded.academyName);
          setDateOfBirth(loaded.dateOfBirth);
          const parsedDob = parseIsoDate(loaded.dateOfBirth);
          if (parsedDob) {
            setDobPickerDate(parsedDob);
          }
          setBeltColor(loaded.beltColor);
          setPhysicalAddress(loaded.physicalAddress);
          setYearsOfExperience(loaded.yearsOfExperience);
          setYearsOfTeaching(loaded.yearsOfTeaching);
          setDefenseStyles(loaded.defenseStyles);
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

  const filteredDefenseStyles = useMemo(() => {
    return allDefenseStyles.filter((style) =>
      style.toLowerCase().includes(styleSearch.toLowerCase())
    );
  }, [styleSearch]);

  const yearOptions = useMemo(() => {
    return Array.from({ length: 51 }, (_, i) => String(i));
  }, []);

  const hasBeltStyle = useMemo(() => {
    return defenseStyles.some((style) =>
      beltBasedMartialArts.some(
        (beltArt) =>
          style.toLowerCase() === beltArt.toLowerCase() ||
          style.toLowerCase().includes(beltArt.toLowerCase())
      )
    );
  }, [defenseStyles]);

  const toggleDefenseStyle = (style: string) => {
    setDefenseStyles((prev) =>
      prev.includes(style) ? prev.filter((item) => item !== style) : [...prev, style]
    );
  };

  const openDatePicker = () => {
    const parsedDob = parseIsoDate(dateOfBirth);
    if (parsedDob) {
      setDobPickerDate(parsedDob);
    }
    setShowDatePicker(true);
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed') {
      return;
    }

    if (selectedDate) {
      setDobPickerDate(selectedDate);
      setDateOfBirth(formatDateToIso(selectedDate));
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const currentUser = await AuthController.getCurrentUser();
      if (!currentUser) {
        showToast('Please log in to save changes');
        return;
      }

      // Validate required fields
      if (!fullName.trim()) {
        showToast('Full name is required');
        return;
      }
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
      if (!dateOfBirth.trim()) {
        showToast('Date of birth is required');
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
        showToast('Date of birth must be in YYYY-MM-DD format');
        return;
      }
      if (!yearsOfExperience.trim()) {
        showToast('Years of experience is required');
        return;
      }
      if (!yearsOfTeaching.trim()) {
        showToast('Years of teaching is required');
        return;
      }
      if (!defenseStyles.length) {
        showToast('Select at least one defense style');
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
        fullLegalName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        academyName: academyName.trim() || undefined,
        dateOfBirth: dateOfBirth.trim(),
        defenseStyles,
        yearsOfExperience: yearsOfExperience.trim(),
        yearsOfTeaching: yearsOfTeaching.trim(),
        currentRank: beltColor.trim() || undefined,
        physicalAddress: physicalAddress.trim(),
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

  const { unreadCount, unreadDisplay, clearUnread } = useUnreadMessages();

  const handleMessages = () => {
    clearUnread();
    setShowMenu(false);
    router.push('/messages');
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
          <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push('/trainer')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Image
                source={require('../../assets/images/backbuttonicon.png')}
                style={styles.backButtonIcon}
              />
            </TouchableOpacity>
            {/* Profile Form Section */}
            <View style={styles.profileFormSection}>
              <View style={styles.heroCard}>
                <View style={styles.heroTextWrap}>
                  <Text style={styles.formTitle}>Edit Trainer Profile</Text>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Personal Information</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={[styles.inputWrapper, styles.inputReadOnly]}>
                    <Ionicons name="person-outline" size={20} color="#6b8693" style={{ marginLeft: 6, marginRight: 8 }} />
                    <Text style={styles.readOnlyText}>{fullName || 'N/A'}</Text>
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

                {/* Date of Birth */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Date of Birth</Text>
                  {Platform.OS === 'web' ? (
                    <View style={styles.inputWrapper}>
                      <Ionicons name="calendar-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8 }} />
                      <input
                        type="date"
                        value={dateOfBirth}
                        max={formatDateToIso(new Date())}
                        onChange={(event) => {
                          const selected = event.target.value;
                          setDateOfBirth(selected);
                          const parsed = parseIsoDate(selected);
                          if (parsed) {
                            setDobPickerDate(parsed);
                          }
                        }}
                        style={styles.webDateInput as any}
                      />
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.selectInput} onPress={openDatePicker}>
                      <Ionicons name="calendar-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8 }} />
                      <Text style={dateOfBirth ? styles.selectedText : styles.placeholderText}>
                        {dateOfBirth || 'Select date of birth'}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#07bbc0" style={{ marginRight: 8 }} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Physical Address */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Address</Text>
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
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Credentials & Certifications</Text>

                <View style={[styles.inputGroup, showStyleDropdown && styles.inputGroupWithDropdown]}>
                  <Text style={styles.inputLabel}>Defense Styles</Text>
                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => {
                      setShowStyleDropdown((prev) => !prev);
                      setShowExperienceDropdown(false);
                      setShowTeachingDropdown(false);
                      setShowBeltDropdown(false);
                    }}
                  >
                    <Ionicons name="shield-checkmark-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8 }} />
                    <Text style={defenseStyles.length ? styles.selectedText : styles.placeholderText} numberOfLines={1}>
                      {defenseStyles.length ? `${defenseStyles.length} style(s) selected` : 'Select defense styles'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#07bbc0" style={{ marginRight: 8 }} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputGroup, showExperienceDropdown && styles.inputGroupWithDropdown]}>
                  <Text style={styles.inputLabel}>Years of Experience</Text>
                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => {
                      setShowExperienceDropdown((prev) => !prev);
                      setShowTeachingDropdown(false);
                      setShowBeltDropdown(false);
                      setShowStyleDropdown(false);
                    }}
                  >
                    <Ionicons name="medal-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8 }} />
                    <Text style={yearsOfExperience ? styles.selectedText : styles.placeholderText}>
                      {yearsOfExperience ? `${yearsOfExperience} year(s)` : 'Select years of experience'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#07bbc0" style={{ marginRight: 8 }} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputGroup, showTeachingDropdown && styles.inputGroupWithDropdown]}>
                  <Text style={styles.inputLabel}>Years of Teaching</Text>
                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => {
                      setShowTeachingDropdown((prev) => !prev);
                      setShowExperienceDropdown(false);
                      setShowBeltDropdown(false);
                      setShowStyleDropdown(false);
                    }}
                  >
                    <Ionicons name="people-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8 }} />
                    <Text style={yearsOfTeaching ? styles.selectedText : styles.placeholderText}>
                      {yearsOfTeaching ? `${yearsOfTeaching} year(s)` : 'Select years of teaching'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#07bbc0" style={{ marginRight: 8 }} />
                  </TouchableOpacity>
                </View>

                {/* Belt Color - Only show if trainer has selected a belt-based martial art */}
                {hasBeltStyle && (
                  <View style={[styles.inputGroup, showBeltDropdown && styles.inputGroupWithDropdown]}>
                    <Text style={styles.inputLabel}>Current Belt</Text>
                    <TouchableOpacity 
                      style={styles.selectInput}
                      onPress={() => {
                        setShowBeltDropdown((prev) => !prev);
                        setShowExperienceDropdown(false);
                        setShowTeachingDropdown(false);
                        setShowStyleDropdown(false);
                      }}
                    >
                      <Ionicons name="ribbon-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8 }} />
                      <Text style={beltColor ? styles.selectedText : styles.placeholderText}>
                        {beltColor || 'Select current rank...'}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#07bbc0" style={{ marginRight: 8 }} />
                    </TouchableOpacity>
                  </View>
                )}
                {!hasBeltStyle && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Current Belt</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="ribbon-outline" size={20} color="#FFFFFF" style={{ marginLeft: 6, marginRight: 8 }} />
                      <TextInput
                        style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                        value={beltColor}
                        placeholder="Current rank (optional)"
                        placeholderTextColor="#6b8693"
                        onChangeText={setBeltColor}
                      />
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.saveButtonText}>Save Profile</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      <Modal visible={showStyleDropdown} transparent animationType="fade" onRequestClose={() => setShowStyleDropdown(false)}>
        <TouchableOpacity style={styles.portalOverlay} activeOpacity={1} onPress={() => setShowStyleDropdown(false)}>
          <View style={styles.portalCard}>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#6b8693" style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                placeholder="Search styles..."
                placeholderTextColor="#6b8693"
                value={styleSearch}
                onChangeText={setStyleSearch}
              />
              {styleSearch.length > 0 && (
                <TouchableOpacity onPress={() => setStyleSearch('')}>
                  <Ionicons name="close-circle" size={20} color="#6b8693" />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
              {filteredDefenseStyles.length > 0 ? (
                filteredDefenseStyles.map((style) => {
                  const selected = defenseStyles.includes(style);
                  return (
                    <TouchableOpacity
                      key={style}
                      style={[styles.dropdownItem, selected && styles.dropdownItemSelected]}
                      onPress={() => toggleDefenseStyle(style)}
                    >
                      <Text style={[styles.dropdownItemText, selected && styles.dropdownItemTextSelected]}>{style}</Text>
                      <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                        {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.dropdownItem}>
                  <Text style={styles.dropdownItemText}>No results found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showExperienceDropdown} transparent animationType="fade" onRequestClose={() => setShowExperienceDropdown(false)}>
        <TouchableOpacity style={styles.portalOverlay} activeOpacity={1} onPress={() => setShowExperienceDropdown(false)}>
          <View style={styles.portalCard}>
            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
              {yearOptions.map((year) => (
                <TouchableOpacity
                  key={`exp-${year}`}
                  style={[styles.dropdownItem, yearsOfExperience === year && styles.dropdownItemSelected]}
                  onPress={() => {
                    setYearsOfExperience(year);
                    setShowExperienceDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, yearsOfExperience === year && styles.dropdownItemTextSelected]}>
                    {year} year(s)
                  </Text>
                  {yearsOfExperience === year && <Ionicons name="checkmark" size={18} color="#07bbc0" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showTeachingDropdown} transparent animationType="fade" onRequestClose={() => setShowTeachingDropdown(false)}>
        <TouchableOpacity style={styles.portalOverlay} activeOpacity={1} onPress={() => setShowTeachingDropdown(false)}>
          <View style={styles.portalCard}>
            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
              {yearOptions.map((year) => (
                <TouchableOpacity
                  key={`teach-${year}`}
                  style={[styles.dropdownItem, yearsOfTeaching === year && styles.dropdownItemSelected]}
                  onPress={() => {
                    setYearsOfTeaching(year);
                    setShowTeachingDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, yearsOfTeaching === year && styles.dropdownItemTextSelected]}>
                    {year} year(s)
                  </Text>
                  {yearsOfTeaching === year && <Ionicons name="checkmark" size={18} color="#07bbc0" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showBeltDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowBeltDropdown(false);
          setBeltSearch('');
        }}
      >
        <TouchableOpacity
          style={styles.portalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowBeltDropdown(false);
            setBeltSearch('');
          }}
        >
          <View style={styles.portalCard}>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#6b8693" style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                placeholder="Search belt..."
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
            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
              {filteredBelts.length > 0 ? (
                filteredBelts.map((belt) => (
                  <TouchableOpacity
                    key={belt}
                    style={[styles.dropdownItem, beltColor === belt && styles.dropdownItemSelected]}
                    onPress={() => {
                      setBeltColor(belt);
                      setShowBeltDropdown(false);
                      setBeltSearch('');
                    }}
                  >
                    <Text style={[styles.dropdownItemText, beltColor === belt && styles.dropdownItemTextSelected]}>
                      {belt}
                    </Text>
                    {beltColor === belt && <Ionicons name="checkmark" size={20} color="#07bbc0" />}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.dropdownItem}>
                  <Text style={styles.dropdownItemText}>No results found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={dobPickerDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      )}

      <Modal
        visible={showDatePicker && Platform.OS === 'ios'}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity style={styles.portalOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.datePickerCard}>
            <View style={styles.datePickerActionRow}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerActionText}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={dobPickerDate}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={handleDateChange}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
    paddingHorizontal: 16,
    position: 'relative',
  },
  backButton: {
    padding: 8,
    zIndex: 10,
    alignSelf: 'flex-start',
    marginBottom: 16,
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
    backgroundColor: '#031a2c',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(7, 187, 192, 0.28)',
    paddingVertical: 24,
    paddingHorizontal: 14,
    marginBottom: 40,
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    overflow: 'visible',
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 187, 192, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(7, 187, 192, 0.24)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  heroTextWrap: {
    flex: 1,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e8fbff',
    marginBottom: 4,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: 'rgba(7, 187, 192, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(7, 187, 192, 0.2)',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
    overflow: 'visible',
  },
  sectionTitle: {
    color: '#07bbc0',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: '10%',
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
    width: '80%',
    textAlign: 'left',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: 'rgba(156, 205, 224, 0.65)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 50,
    alignSelf: 'center',
    width: '80%',
    backgroundColor: 'rgba(2, 27, 41, 0.85)',
  },
  inputReadOnly: {
    borderColor: 'rgba(107,134,147,0.6)',
    backgroundColor: 'rgba(10, 54, 69, 0.45)',
  },
  readOnlyText: {
    flex: 1,
    color: '#b8c8d0',
    fontSize: 15,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  webDateInput: {
    flex: 1,
    color: '#FFFFFF',
    backgroundColor: 'transparent',
    borderWidth: 0,
    fontSize: 16,
    outlineStyle: 'none',
  } as any,
  inputGroupWithDropdown: {
    position: 'relative',
    zIndex: 3000,
    elevation: 40,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 27, 41, 0.95)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(156, 205, 224, 0.65)',
    paddingHorizontal: 15,
    minHeight: 50,
    justifyContent: 'space-between',
    alignSelf: 'center',
    width: '80%',
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
    left: '10%',
    right: '10%',
    backgroundColor: '#01151F',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#07bbc0',
    marginTop: 4,
    maxHeight: 200,
    zIndex: 12000,
    elevation: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
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
  portalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: '10%',
  },
  portalCard: {
    width: '80%',
    maxWidth: 736,
    backgroundColor: '#01151F',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#07bbc0',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  datePickerCard: {
    width: '80%',
    maxWidth: 736,
    backgroundColor: '#01151F',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#07bbc0',
    paddingBottom: 8,
  },
  datePickerActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#0a3645',
  },
  datePickerActionText: {
    color: '#07bbc0',
    fontSize: 16,
    fontWeight: '600',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#688997',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    borderColor: '#07bbc0',
    backgroundColor: '#07bbc0',
  },
  saveButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flex: 1,
    minHeight: 50,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  actionRow: {
    marginTop: 6,
    flexDirection: 'row',
    position: 'relative',
    zIndex: 1,
    elevation: 0,
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
});
