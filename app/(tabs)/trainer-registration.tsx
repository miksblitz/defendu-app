import { useRouter } from 'expo-router';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform,
    Modal,
    useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthController } from '../controllers/AuthController';
import { TrainerApplication } from '../_models/TrainerApplication';
import * as DocumentPicker from 'expo-document-picker';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useLogout } from '../../hooks/useLogout';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';

const MOBILE_BREAKPOINT = 768;

// Famous martial arts list
const martialArts = [
  'Brazilian Jiu-Jitsu (BJJ)',
  'Judo',
  'Karate',
  'Taekwondo',
  'Muay Thai',
  'Boxing',
  'Wrestling',
  'Kickboxing',
  'Krav Maga',
  'Aikido',
  'Wing Chun',
  'Jeet Kune Do',
  'Capoeira',
  'Sambo',
  'Kyokushin Karate',
  'Shotokan Karate',
  'Wado-Ryu Karate',
  'Tang Soo Do',
  'Hapkido',
  'Kung Fu',
  'Mixed Martial Arts (MMA)',
  'Kali/Eskrima/Arnis',
  'Silat',
  'Savate',
  'Lethwei',
];

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

// Years options
const yearsOptions = Array.from({ length: 51 }, (_, i) => i.toString());

export default function TrainerRegistrationScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < MOBILE_BREAKPOINT;
  const [showMenu, setShowMenu] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [professionalAlias, setProfessionalAlias] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [academyName, setAcademyName] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [selectedMartialArts, setSelectedMartialArts] = useState<string[]>([]);
  const [showMartialArtsDropdown, setShowMartialArtsDropdown] = useState(false);
  const [martialArtsSearch, setMartialArtsSearch] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [showYearsExperienceDropdown, setShowYearsExperienceDropdown] = useState(false);
  const [yearsExperienceSearch, setYearsExperienceSearch] = useState('');
  const [yearsTeaching, setYearsTeaching] = useState('');
  const [showYearsTeachingDropdown, setShowYearsTeachingDropdown] = useState(false);
  const [yearsTeachingSearch, setYearsTeachingSearch] = useState('');
  const [currentRank, setCurrentRank] = useState('');
  const [showRankDropdown, setShowRankDropdown] = useState(false);
  const [rankSearch, setRankSearch] = useState('');
  const [facebookLink, setFacebookLink] = useState('');
  const [instagramLink, setInstagramLink] = useState('');
  const [otherLink, setOtherLink] = useState('');
  const [credentialsRevoked, setCredentialsRevoked] = useState<string | null>(null);
  const [credentialsRevokedExplanation, setCredentialsRevokedExplanation] = useState('');
  const [felonyConviction, setFelonyConviction] = useState<string | null>(null);
  const [felonyExplanation, setFelonyExplanation] = useState('');
  const [certifyAccurate, setCertifyAccurate] = useState(false);
  const [agreeConduct, setAgreeConduct] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    name: string;
    uri: string;
    type: string;
    size: number;
  }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<any>(null);
  const uploadAreaRef = useRef<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();
  const handleLogout = useLogout();
  
  // Validation errors state
  const [errors, setErrors] = useState({
    fullName: '',
    dateOfBirth: '',
    phoneNumber: '',
    emailAddress: '',
    physicalAddress: '',
    defenseStyle: '',
    yearsExperience: '',
    yearsTeaching: '',
    uploadedFiles: '',
    certifyAccurate: '',
    agreeConduct: '',
  });

  // Blur handlers for validation
  const handleFullNameBlur = () => {
    const error = validateFullName(fullName);
    setErrors(prev => ({ ...prev, fullName: error }));
  };

  const handleDateOfBirthBlur = () => {
    const error = validateDateOfBirth(selectedDate);
    setErrors(prev => ({ ...prev, dateOfBirth: error }));
  };

  const handlePhoneBlur = () => {
    const error = validatePhone(phoneNumber);
    setErrors(prev => ({ ...prev, phoneNumber: error }));
  };

  const handleEmailBlur = () => {
    const error = validateEmail(emailAddress);
    setErrors(prev => ({ ...prev, emailAddress: error }));
  };

  const handlePhysicalAddressBlur = () => {
    if (!physicalAddress.trim()) {
      setErrors(prev => ({ ...prev, physicalAddress: 'Physical address is required' }));
    } else {
      setErrors(prev => ({ ...prev, physicalAddress: '' }));
    }
  };

  // Get DateTimePicker component - only available on native platforms
  // Using useMemo to avoid re-evaluating on every render
  const DateTimePicker = useMemo(() => {
    if (Platform.OS === 'web') return null;
    try {
      // @ts-ignore - Dynamic require for native module
      const module = require('@react-native-community/datetimepicker');
      return module.default || module;
    } catch (error) {
      console.warn('DateTimePicker not available:', error);
      return null;
    }
  }, []);


  // Check if any selected martial art uses belts
  const hasBeltSystem = selectedMartialArts.some(art => beltBasedMartialArts.includes(art));
  
  // Get available belts based on selected martial arts
  const getAvailableBelts = (): string[] => {
    const allBelts = new Set<string>();
    selectedMartialArts.forEach(art => {
      if (beltSystems[art]) {
        beltSystems[art].forEach(belt => allBelts.add(belt));
      }
    });
    return Array.from(allBelts).sort();
  };

  // Filter functions
  const filteredMartialArts = martialArts.filter(art =>
    art.toLowerCase().includes(martialArtsSearch.toLowerCase())
  );

  const filteredYearsOptions = yearsOptions.filter(year =>
    year.includes(yearsExperienceSearch) || 
    `${year} ${year === '1' ? 'year' : 'years'}`.toLowerCase().includes(yearsExperienceSearch.toLowerCase())
  );

  const filteredYearsTeachingOptions = yearsOptions.filter(year =>
    year.includes(yearsTeachingSearch) || 
    `${year} ${year === '1' ? 'year' : 'years'}`.toLowerCase().includes(yearsTeachingSearch.toLowerCase())
  );

  const filteredBelts = getAvailableBelts().filter(belt =>
    belt.toLowerCase().includes(rankSearch.toLowerCase())
  );

  const toggleMartialArt = (art: string) => {
    if (selectedMartialArts.includes(art)) {
      setSelectedMartialArts(selectedMartialArts.filter(a => a !== art));
    } else {
      setSelectedMartialArts([...selectedMartialArts, art]);
    }
    // Clear error when user selects/deselects
    if (errors.defenseStyle) {
      setErrors(prev => ({ ...prev, defenseStyle: '' }));
    }
  };

  const removeMartialArt = (art: string) => {
    setSelectedMartialArts(selectedMartialArts.filter(a => a !== art));
  };

  const { unreadCount, unreadDisplay, clearUnread } = useUnreadMessages();

  const handleMessages = () => {
    clearUnread();
    setShowMenu(false);
    router.push('/messages');
  };

  // Validation functions
  const validateFullName = (name: string): string => {
    if (!name.trim()) {
      return 'Full name is required';
    }
    if (name.length < 2) {
      return 'Full name must be at least 2 characters';
    }
    if (/\d/.test(name)) {
      return 'Full name cannot contain numbers';
    }
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(name)) {
      return 'Full name can only contain letters, spaces, hyphens, and apostrophes';
    }
    return '';
  };

  const validateEmail = (email: string): string => {
    if (!email.trim()) {
      return 'Email address is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validatePhone = (phone: string): string => {
    if (!phone.trim()) {
      return 'Phone number is required';
    }
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      return 'Phone number can only contain numbers and formatting characters';
    }
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      return 'Phone number must contain at least 10 digits';
    }
    return '';
  };

  const validateDateOfBirth = (date: Date | null): string => {
    if (!date) {
      return 'Date of birth is required';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    
    if (dateToCheck > today) {
      return 'Date of birth cannot be in the future';
    }
    
    // Calculate age
    let age = today.getFullYear() - dateToCheck.getFullYear();
    const monthDiff = today.getMonth() - dateToCheck.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateToCheck.getDate())) {
      age--;
    }
    
    if (age < 18) {
      return 'You must be at least 18 years old';
    }
    
    return '';
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (date && event.type !== 'dismissed') {
        setSelectedDate(date);
        setDateOfBirth(formatDate(date));
      }
    } else if (Platform.OS === 'ios') {
      if (date && event.type !== 'dismissed') {
        setSelectedDate(date);
        setDateOfBirth(formatDate(date));
      }
      // Don't close on iOS here - let the Done button handle it
    }
  };

  const handleRegister = () => {
    if (loading) return;
    // Validate all fields and set errors
    const fullNameError = validateFullName(fullName);
    const dateError = validateDateOfBirth(selectedDate);
    const phoneError = validatePhone(phoneNumber);
    const emailError = validateEmail(emailAddress);
    const physicalAddressError = !physicalAddress.trim() ? 'Physical address is required' : '';
    const defenseStyleError = selectedMartialArts.length === 0 ? 'Please select at least one defense style' : '';
    const yearsExperienceError = !yearsExperience ? 'Years of experience is required' : '';
    const yearsTeachingError = !yearsTeaching ? 'Years of teaching experience is required' : '';
    const uploadedFilesError = uploadedFiles.length === 0 ? 'Please upload at least one certification file' : '';
    const certifyAccurateError = !certifyAccurate ? 'You must certify that all information is accurate' : '';
    const agreeConductError = !agreeConduct ? 'You must agree to maintain professional conduct' : '';

    // Set all errors
    setErrors({
      fullName: fullNameError,
      dateOfBirth: dateError,
      phoneNumber: phoneError,
      emailAddress: emailError,
      physicalAddress: physicalAddressError,
      defenseStyle: defenseStyleError,
      yearsExperience: yearsExperienceError,
      yearsTeaching: yearsTeachingError,
      uploadedFiles: uploadedFilesError,
      certifyAccurate: certifyAccurateError,
      agreeConduct: agreeConductError,
    });

    // Check if there are any errors
    if (fullNameError || dateError || phoneError || emailError || physicalAddressError || 
        defenseStyleError || yearsExperienceError || yearsTeachingError || 
        uploadedFilesError || certifyAccurateError || agreeConductError) {
      showToast('Please fix the errors before submitting');
      return;
    }

    // All validations passed - save to database
    submitApplication();
  };

  const submitApplication = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const currentUser = await AuthController.getCurrentUser();
      if (!currentUser) {
        showToast('Please log in to submit an application');
        setLoading(false);
        return;
      }

      // Check if user already has an existing application
      const existingApplication = await AuthController.getUserTrainerApplication(currentUser.uid);
      if (existingApplication && existingApplication.status !== 'rejected') {
        showToast('You have already submitted an application. Please wait for admins.');
        setLoading(false);
        return;
      }

      // Prepare application data
      const applicationData: TrainerApplication = {
        uid: currentUser.uid,
        fullLegalName: fullName,
        professionalAlias: professionalAlias.trim() || undefined,
        email: emailAddress,
        academyName: academyName.trim() || undefined,
        appliedDate: new Date(),
        status: 'awaiting review',
        dateOfBirth: dateOfBirth,
        phone: phoneNumber,
        physicalAddress: physicalAddress,
        defenseStyles: selectedMartialArts,
        yearsOfExperience: yearsExperience,
        yearsOfTeaching: yearsTeaching,
        currentRank: currentRank.trim() || undefined,
        facebookLink: facebookLink.trim() || undefined,
        instagramLink: instagramLink.trim() || undefined,
        otherLink: otherLink.trim() || undefined,
        uploadedFiles: uploadedFiles,
        credentialsRevoked: credentialsRevoked,
        credentialsRevokedExplanation: credentialsRevoked === 'yes' && credentialsRevokedExplanation.trim() ? credentialsRevokedExplanation : undefined,
        felonyConviction: felonyConviction,
        felonyExplanation: felonyConviction === 'yes' && felonyExplanation.trim() ? felonyExplanation : undefined,
        certifyAccurate: certifyAccurate,
        agreeConduct: agreeConduct,
      };

      // Save to database
      await AuthController.submitTrainerApplication(applicationData);
      
      showToast('Application submitted successfully!');
      setTimeout(() => {
        router.replace('/dashboard');
      }, 2500);
    } catch (error: any) {
      console.error('Error submitting application:', error);
      showToast(error.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, trigger file input click
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      } else {
        // For native, use expo-document-picker
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          multiple: true,
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets) {
          const newFiles = result.assets.map(asset => ({
            name: asset.name || 'Unknown',
            uri: asset.uri,
            type: asset.mimeType || 'application/octet-stream',
            size: asset.size || 0,
          }));
          setUploadedFiles(prev => [...prev, ...newFiles]);
          // Clear error when files are uploaded
          if (errors.uploadedFiles) {
            setErrors(prev => ({ ...prev, uploadedFiles: '' }));
          }
        }
      }
    } catch (error: any) {
      console.error('Error selecting files:', error);
    }
  };

  const handleWebFileChange = (event: any) => {
    const files = Array.from(event.target.files || []);
    const newFiles = files.map((file: any) => ({
      name: file.name,
      uri: URL.createObjectURL(file),
      type: file.type,
      size: file.size,
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
    // Clear error when files are uploaded
    if (errors.uploadedFiles) {
      setErrors(prev => ({ ...prev, uploadedFiles: '' }));
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Set up drag and drop event listeners for web
  useEffect(() => {
    if (Platform.OS === 'web' && uploadAreaRef.current) {
      const element = uploadAreaRef.current as any;
      
      const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      };

      const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set dragging to false if we're leaving the upload area
        if (!element.contains(e.relatedTarget as Node)) {
          setIsDragging(false);
        }
      };

      const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer?.files || []);
        const validFiles = files.filter((file: File) => {
          const type = file.type || '';
          return type.startsWith('image/') || type === 'application/pdf';
        });

        const newFiles = validFiles.map((file: File) => ({
          name: file.name,
          uri: URL.createObjectURL(file),
          type: file.type,
          size: file.size,
        }));
        setUploadedFiles(prev => [...prev, ...newFiles]);
        // Clear error when files are uploaded
        if (errors.uploadedFiles) {
          setErrors(prev => ({ ...prev, uploadedFiles: '' }));
        }
      };

      const handleDragEnter = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      };

      element.addEventListener('dragover', handleDragOver);
      element.addEventListener('dragleave', handleDragLeave);
      element.addEventListener('drop', handleDrop);
      element.addEventListener('dragenter', handleDragEnter);

      return () => {
        element.removeEventListener('dragover', handleDragOver);
        element.removeEventListener('dragleave', handleDragLeave);
        element.removeEventListener('drop', handleDrop);
        element.removeEventListener('dragenter', handleDragEnter);
      };
    }
  }, []);

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      // Revoke object URL if it's a web blob URL
      if (Platform.OS === 'web' && newFiles[index].uri.startsWith('blob:')) {
        URL.revokeObjectURL(newFiles[index].uri);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf' || type.includes('pdf')) {
      return 'document-text';
    } else if (type.startsWith('image/')) {
      return 'image';
    }
    return 'document';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Sidebar: hidden on mobile so content is full-width and easy to use on small screens */}
        {!isMobile && (
          <View style={styles.sidebar}>
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

              <TouchableOpacity style={[styles.sidebarButton, styles.sidebarActive]}>
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

        {/* Main content: full-width on mobile with top bar; scroll + sticky submit */}
        <View style={[styles.mainContentWrap, isMobile && styles.mainContentWrapMobile]}>
          {/* Top bar on mobile: Back + menu (like publish module) */}
          {isMobile && (
            <View style={[styles.topBar, styles.topBarMobile]}>
              <TouchableOpacity 
                style={styles.topBarBackButton}
                onPress={() => router.back()}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                activeOpacity={0.7}
              >
                <Image
                  source={require('../../assets/images/backbuttonicon.png')}
                  style={styles.topBarBackIcon}
                />
              </TouchableOpacity>
              <View style={styles.mobileMenuButtonWrap}>
                <TouchableOpacity 
                  style={styles.mobileMenuButton}
                  onPress={() => { clearUnread(); setShowMenu(true); }}
                  hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  activeOpacity={0.7}
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
            </View>
          )}

          {/* Back button - desktop only; same as edit profile (fixed top-left) */}
          {!isMobile && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Image
                source={require('../../assets/images/backbuttonicon.png')}
                style={styles.backButtonIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}

        <ScrollView 
          style={styles.mainContent}
          contentContainerStyle={[styles.mainContentContainer, isMobile && styles.mainContentContainerMobile]}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header — same vibes as publish module */}
          <View style={[styles.publishHeader, isMobile && styles.publishHeaderMobile]}>
            <Image
              source={require('../../assets/images/defendudashboardlogo.png')}
              style={[styles.logoImage, isMobile && styles.logoImageMobile]}
            />
            <Text style={[styles.publishTitle, isMobile && styles.publishTitleMobile]}>
              {isMobile ? 'Apply to become a trainer' : 'Build your verified trainer profile'}
            </Text>
            <Text style={styles.publishSubtitle}>
              {isMobile ? "One section at a time. Scroll down and fill each part. Fields with * are required." : "Fill in each section below. Required fields are marked with *. We'll review and get back to you."}
            </Text>
            <View style={styles.progressStrip}>
              <View style={styles.progressStripBar} />
              <Text style={styles.progressStripText}>
                {isMobile ? '5 steps — complete from top to bottom' : 'Complete each section from top to bottom'}
              </Text>
            </View>
          </View>

          {/* Single column straight down — same vibes as publish module */}
          <View style={[styles.singleColumn, isMobile && styles.singleColumnMobile]}>
            {/* Step 1: Personal Information */}
              <View style={[styles.section, styles.sectionCard, isMobile && styles.sectionCardMobile]}>
                <View style={[styles.sectionBadgeRow, isMobile && styles.sectionBadgeRowMobile]}>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>1</Text>
                  </View>
                  {isMobile && <Text style={styles.stepOfTotal}>Step 1 of 5</Text>}
                </View>
                <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>About you</Text>
                <Text style={[styles.sectionHint, isMobile && styles.sectionHintMobile]}>Your name, contact details, and where you train. We use this to verify your application.</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>Full name <Text style={styles.requiredDot}>*</Text></Text>
                  <View style={[styles.inputWrapper, errors.fullName ? styles.inputWrapperError : null, isMobile && styles.inputWrapperMobile]}>
                    <TextInput
                      style={[styles.input, isMobile && styles.inputMobile, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder="Your full legal name"
                      placeholderTextColor="#6b8693"
                      value={fullName}
                      onChangeText={(text) => {
                        // Remove numbers from input
                        const cleanedText = text.replace(/\d/g, '');
                        setFullName(cleanedText);
                        if (errors.fullName) {
                          setErrors(prev => ({ ...prev, fullName: '' }));
                        }
                      }}
                      onBlur={handleFullNameBlur}
                    />
                  </View>
                  {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>Professional alias (optional)</Text>
                  <View style={[styles.inputWrapper, isMobile && styles.inputWrapperMobile]}>
                    <TextInput
                      style={[styles.input, isMobile && styles.inputMobile, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder="e.g. Coach Mike"
                      placeholderTextColor="#6b8693"
                      value={professionalAlias}
                      onChangeText={setProfessionalAlias}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>Date of birth <Text style={styles.requiredDot}>*</Text></Text>
                  {Platform.OS === 'web' ? (
                    <View style={[styles.inputWrapper, errors.dateOfBirth ? styles.inputWrapperError : null, isMobile && styles.inputWrapperMobile]}>
                      {/* @ts-ignore - Web-specific input element */}
                      <input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={dateOfBirth}
                        onChange={(e: any) => {
                          if (e.target.value) {
                            const date = new Date(e.target.value + 'T00:00:00');
                            setSelectedDate(date);
                            setDateOfBirth(e.target.value);
                            if (errors.dateOfBirth) {
                              setErrors(prev => ({ ...prev, dateOfBirth: '' }));
                            }
                          } else {
                            setSelectedDate(null);
                            setDateOfBirth('');
                          }
                        }}
                        onBlur={handleDateOfBirthBlur}
                        style={{
                          flex: 1,
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: 16,
                          padding: 0,
                          outline: 'none',
                          width: '100%',
                          height: '100%',
                        } as any}
                      />
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.inputWrapper, errors.dateOfBirth ? styles.inputWrapperError : null, isMobile && styles.inputWrapperMobile]}
                        onPress={() => setShowDatePicker(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={dateOfBirth ? styles.selectedText : styles.placeholderText}>
                          {selectedDate ? formatDateDisplay(selectedDate) : 'Tap to choose your birth date'}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color="#07bbc0" />
                      </TouchableOpacity>
                      {showDatePicker && DateTimePicker && (
                        <>
                          {Platform.OS === 'ios' ? (
                            <Modal
                              transparent={true}
                              animationType="slide"
                              visible={showDatePicker}
                              onRequestClose={() => {
                                setShowDatePicker(false);
                                handleDateOfBirthBlur();
                              }}
                            >
                              <View style={styles.datePickerModal}>
                                <View style={styles.datePickerContainer}>
                                  <View style={styles.datePickerHeader}>
                                    <TouchableOpacity onPress={() => {
                                      setShowDatePicker(false);
                                      handleDateOfBirthBlur();
                                    }}>
                                      <Text style={styles.datePickerButton}>Cancel</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.datePickerTitle}>Select Date</Text>
                                    <TouchableOpacity
                                      onPress={() => {
                                        if (selectedDate) {
                                          setDateOfBirth(formatDate(selectedDate));
                                          handleDateOfBirthBlur();
                                        }
                                        setShowDatePicker(false);
                                      }}
                                    >
                                      <Text style={[styles.datePickerButton, styles.datePickerButtonDone]}>Done</Text>
                                    </TouchableOpacity>
                                  </View>
                                  <DateTimePicker
                                    value={selectedDate || new Date(2000, 0, 1)}
                                    mode="date"
                                    display="spinner"
                                    onChange={handleDateChange}
                                    maximumDate={new Date()}
                                  />
                                </View>
                              </View>
                            </Modal>
                          ) : (
                            <DateTimePicker
                              value={selectedDate || new Date(2000, 0, 1)}
                              mode="date"
                              display="default"
                              onChange={handleDateChange}
                              maximumDate={new Date()}
                            />
                          )}
                        </>
                      )}
                    </>
                  )}
                  {errors.dateOfBirth ? <Text style={styles.errorText}>{errors.dateOfBirth}</Text> : null}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>Phone number <Text style={styles.requiredDot}>*</Text></Text>
                  <View style={[styles.inputWrapper, errors.phoneNumber ? styles.inputWrapperError : null, isMobile && styles.inputWrapperMobile]}>
                    <TextInput
                      style={[styles.input, isMobile && styles.inputMobile, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder="e.g. +1 234 567 8900"
                      placeholderTextColor="#6b8693"
                      value={phoneNumber}
                      onChangeText={(text) => {
                        // Only allow numbers and common phone formatting characters
                        const cleanedText = text.replace(/[^\d\s\-\+\(\)]/g, '');
                        setPhoneNumber(cleanedText);
                        if (errors.phoneNumber) {
                          setErrors(prev => ({ ...prev, phoneNumber: '' }));
                        }
                      }}
                      onBlur={handlePhoneBlur}
                      keyboardType="phone-pad"
                    />
                  </View>
                  {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>Email address <Text style={styles.requiredDot}>*</Text></Text>
                  <View style={[styles.inputWrapper, errors.emailAddress ? styles.inputWrapperError : null, isMobile && styles.inputWrapperMobile]}>
                    <TextInput
                      style={[styles.input, isMobile && styles.inputMobile, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder="your@email.com"
                      placeholderTextColor="#6b8693"
                      value={emailAddress}
                      onChangeText={(text) => {
                        setEmailAddress(text);
                        if (errors.emailAddress) {
                          setErrors(prev => ({ ...prev, emailAddress: '' }));
                        }
                      }}
                      onBlur={handleEmailBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  {errors.emailAddress ? <Text style={styles.errorText}>{errors.emailAddress}</Text> : null}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>Academy or gym name (optional)</Text>
                  <View style={[styles.inputWrapper, isMobile && styles.inputWrapperMobile]}>
                    <TextInput
                      style={[styles.input, isMobile && styles.inputMobile, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder="Where you teach"
                      placeholderTextColor="#6b8693"
                      value={academyName}
                      onChangeText={(text) => {
                        setAcademyName(text);
                      }}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>Physical address <Text style={styles.requiredDot}>*</Text></Text>
                  <View style={[styles.inputWrapper, errors.physicalAddress ? styles.inputWrapperError : null, isMobile && styles.inputWrapperMobile]}>
                    <TextInput
                      style={[styles.input, isMobile && styles.inputMobile, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder="Street, city, state/country"
                      placeholderTextColor="#6b8693"
                      value={physicalAddress}
                      onChangeText={(text) => {
                        setPhysicalAddress(text);
                        if (errors.physicalAddress) {
                          setErrors(prev => ({ ...prev, physicalAddress: '' }));
                        }
                      }}
                      onBlur={handlePhysicalAddressBlur}
                    />
                  </View>
                  {errors.physicalAddress ? <Text style={styles.errorText}>{errors.physicalAddress}</Text> : null}
                </View>
              </View>

              {/* Step 2: Credentials & Certifications */}
              <View style={[styles.section, styles.sectionCard, isMobile && styles.sectionCardMobile]}>
                <View style={[styles.sectionBadgeRow, isMobile && styles.sectionBadgeRowMobile]}>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>2</Text>
                  </View>
                  {isMobile && <Text style={styles.stepOfTotal}>Step 2 of 5</Text>}
                </View>
                <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>Your experience</Text>
                <Text style={[styles.sectionHint, isMobile && styles.sectionHintMobile]}>Styles you teach, years of experience, and rank. Select at least one style.</Text>
                
                <View style={[styles.inputGroup, showMartialArtsDropdown && styles.inputGroupWithDropdown]}>
                  <Text style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>Defense style(s) <Text style={styles.requiredDot}>*</Text></Text>
                  <TouchableOpacity 
                    style={[styles.selectInput, errors.defenseStyle ? styles.inputWrapperError : null, isMobile && styles.selectInputMobile]}
                    onPress={() => {
                      setShowMartialArtsDropdown(!showMartialArtsDropdown);
                      setShowYearsExperienceDropdown(false);
                      setShowYearsTeachingDropdown(false);
                      setShowRankDropdown(false);
                    }}
                  >
                    <View style={styles.selectedItemsContainer}>
                      {selectedMartialArts.length === 0 ? (
                        <Text style={styles.placeholderText}>Tap to choose (e.g. Karate, BJJ)</Text>
                      ) : (
                        <View style={styles.chipsContainer}>
                          {selectedMartialArts.map((art) => (
                            <View key={art} style={styles.chip}>
                              <Text style={styles.chipText}>{art}</Text>
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  removeMartialArt(art);
                                }}
                                style={styles.chipRemove}
                              >
                                <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-down" size={20} color="#07bbc0" style={styles.selectIcon} />
                  </TouchableOpacity>
                  {showMartialArtsDropdown && (
                    <>
                      <TouchableOpacity
                        style={styles.dropdownOverlay}
                        activeOpacity={1}
                        onPress={() => {
                          setShowMartialArtsDropdown(false);
                          setMartialArtsSearch('');
                        }}
                      />
                      <View style={styles.dropdown}>
                        <View style={styles.searchContainer}>
                          <Ionicons name="search-outline" size={20} color="#6b8693" style={styles.searchIcon} />
                          <TextInput
                            style={[styles.searchInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                            placeholder="Search martial arts..."
                            placeholderTextColor="#6b8693"
                            value={martialArtsSearch}
                            onChangeText={setMartialArtsSearch}
                            autoFocus={false}
                          />
                          {martialArtsSearch.length > 0 && (
                            <TouchableOpacity onPress={() => setMartialArtsSearch('')}>
                              <Ionicons name="close-circle" size={20} color="#6b8693" />
                            </TouchableOpacity>
                          )}
                        </View>
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                          {filteredMartialArts.length > 0 ? (
                            filteredMartialArts.map((art) => (
                              <TouchableOpacity
                                key={art}
                                style={[
                                  styles.dropdownItem,
                                  isMobile && styles.dropdownItemMobile,
                                  selectedMartialArts.includes(art) && styles.dropdownItemSelected,
                                ]}
                                onPress={() => toggleMartialArt(art)}
                              >
                                <Text style={[
                                  styles.dropdownItemText,
                                  selectedMartialArts.includes(art) && styles.dropdownItemTextSelected,
                                ]}>
                                  {art}
                                </Text>
                                {selectedMartialArts.includes(art) && (
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
                  {errors.defenseStyle ? <Text style={styles.errorText}>{errors.defenseStyle}</Text> : null}
                </View>

                <View style={[styles.inputGroup, showYearsExperienceDropdown && styles.inputGroupWithDropdown]}>
                  <Text style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>Years of experience <Text style={styles.requiredDot}>*</Text></Text>
                  <TouchableOpacity 
                    style={[styles.selectInput, errors.yearsExperience ? styles.inputWrapperError : null, isMobile && styles.selectInputMobile]}
                    onPress={() => {
                      setShowMartialArtsDropdown(false);
                      setShowYearsExperienceDropdown(!showYearsExperienceDropdown);
                      setShowYearsTeachingDropdown(false);
                      setShowRankDropdown(false);
                    }}
                  >
                    <Text style={yearsExperience ? styles.selectedText : styles.placeholderText}>
                      {yearsExperience ? `${yearsExperience} ${yearsExperience === '1' ? 'year' : 'years'}` : 'Tap to choose'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#07bbc0" style={styles.selectIcon} />
                  </TouchableOpacity>
                  {showYearsExperienceDropdown && (
                    <>
                      <TouchableOpacity
                        style={styles.dropdownOverlay}
                        activeOpacity={1}
                        onPress={() => {
                          setShowYearsExperienceDropdown(false);
                          setYearsExperienceSearch('');
                        }}
                      />
                      <View style={styles.dropdown}>
                        <View style={styles.searchContainer}>
                          <Ionicons name="search-outline" size={20} color="#6b8693" style={styles.searchIcon} />
                          <TextInput
                            style={[styles.searchInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                            placeholder="Search years..."
                            placeholderTextColor="#6b8693"
                            value={yearsExperienceSearch}
                            onChangeText={setYearsExperienceSearch}
                            keyboardType="numeric"
                            autoFocus={false}
                          />
                          {yearsExperienceSearch.length > 0 && (
                            <TouchableOpacity onPress={() => setYearsExperienceSearch('')}>
                              <Ionicons name="close-circle" size={20} color="#6b8693" />
                            </TouchableOpacity>
                          )}
                        </View>
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                          {filteredYearsOptions.length > 0 ? (
                            filteredYearsOptions.map((year) => (
                              <TouchableOpacity
                                key={year}
                                style={[
                                  styles.dropdownItem,
                                  isMobile && styles.dropdownItemMobile,
                                  yearsExperience === year && styles.dropdownItemSelected,
                                ]}
                                onPress={() => {
                                  setYearsExperience(year);
                                  setShowYearsExperienceDropdown(false);
                                  setYearsExperienceSearch('');
                                  if (errors.yearsExperience) {
                                    setErrors(prev => ({ ...prev, yearsExperience: '' }));
                                  }
                                }}
                              >
                                <Text style={[
                                  styles.dropdownItemText,
                                  yearsExperience === year && styles.dropdownItemTextSelected,
                                ]}>
                                  {year} {year === '1' ? 'year' : 'years'}
                                </Text>
                                {yearsExperience === year && (
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
                  {errors.yearsExperience ? <Text style={styles.errorText}>{errors.yearsExperience}</Text> : null}
                </View>

                <View style={[styles.inputGroup, showYearsTeachingDropdown && styles.inputGroupWithDropdown]}>
                  <Text style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>Years of teaching <Text style={styles.requiredDot}>*</Text></Text>
                  <TouchableOpacity 
                    style={[styles.selectInput, errors.yearsTeaching ? styles.inputWrapperError : null, isMobile && styles.selectInputMobile]}
                    onPress={() => {
                      setShowMartialArtsDropdown(false);
                      setShowYearsExperienceDropdown(false);
                      setShowYearsTeachingDropdown(!showYearsTeachingDropdown);
                      setShowRankDropdown(false);
                    }}
                  >
                    <Text style={yearsTeaching ? styles.selectedText : styles.placeholderText}>
                      {yearsTeaching ? `${yearsTeaching} ${yearsTeaching === '1' ? 'year' : 'years'}` : 'Tap to choose'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#07bbc0" style={styles.selectIcon} />
                  </TouchableOpacity>
                  {showYearsTeachingDropdown && (
                    <>
                      <TouchableOpacity
                        style={styles.dropdownOverlay}
                        activeOpacity={1}
                        onPress={() => {
                          setShowYearsTeachingDropdown(false);
                          setYearsTeachingSearch('');
                        }}
                      />
                      <View style={styles.dropdown}>
                        <View style={styles.searchContainer}>
                          <Ionicons name="search-outline" size={20} color="#6b8693" style={styles.searchIcon} />
                          <TextInput
                            style={[styles.searchInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                            placeholder="Search years..."
                            placeholderTextColor="#6b8693"
                            value={yearsTeachingSearch}
                            onChangeText={setYearsTeachingSearch}
                            keyboardType="numeric"
                            autoFocus={false}
                          />
                          {yearsTeachingSearch.length > 0 && (
                            <TouchableOpacity onPress={() => setYearsTeachingSearch('')}>
                              <Ionicons name="close-circle" size={20} color="#6b8693" />
                            </TouchableOpacity>
                          )}
                        </View>
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                          {filteredYearsTeachingOptions.length > 0 ? (
                            filteredYearsTeachingOptions.map((year) => (
                              <TouchableOpacity
                                key={year}
                                style={[
                                  styles.dropdownItem,
                                  isMobile && styles.dropdownItemMobile,
                                  yearsTeaching === year && styles.dropdownItemSelected,
                                ]}
                                onPress={() => {
                                  setYearsTeaching(year);
                                  setShowYearsTeachingDropdown(false);
                                  setYearsTeachingSearch('');
                                  if (errors.yearsTeaching) {
                                    setErrors(prev => ({ ...prev, yearsTeaching: '' }));
                                  }
                                }}
                              >
                                <Text style={[
                                  styles.dropdownItemText,
                                  yearsTeaching === year && styles.dropdownItemTextSelected,
                                ]}>
                                  {year} {year === '1' ? 'year' : 'years'}
                                </Text>
                                {yearsTeaching === year && (
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
                  {errors.yearsTeaching ? <Text style={styles.errorText}>{errors.yearsTeaching}</Text> : null}
                </View>

                {hasBeltSystem && (
                  <View style={[styles.inputGroup, showRankDropdown && styles.inputGroupWithDropdown]}>
                    <Text style={styles.inputLabel}>Current Rank/Belt</Text>
                    <TouchableOpacity 
                      style={styles.selectInput}
                      onPress={() => {
                        setShowMartialArtsDropdown(false);
                        setShowYearsExperienceDropdown(false);
                        setShowYearsTeachingDropdown(false);
                        setShowRankDropdown(!showRankDropdown);
                      }}
                    >
                      <Text style={currentRank ? styles.selectedText : styles.placeholderText}>
                        {currentRank || 'Select rank/belt...'}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#07bbc0" style={styles.selectIcon} />
                    </TouchableOpacity>
                    {showRankDropdown && (
                      <>
                        <TouchableOpacity
                          style={styles.dropdownOverlay}
                          activeOpacity={1}
                          onPress={() => {
                            setShowRankDropdown(false);
                            setRankSearch('');
                          }}
                        />
                        <View style={styles.dropdown}>
                          <View style={styles.searchContainer}>
                            <Ionicons name="search-outline" size={20} color="#6b8693" style={styles.searchIcon} />
                            <TextInput
                              style={[styles.searchInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                              placeholder="Search rank/belt..."
                              placeholderTextColor="#6b8693"
                              value={rankSearch}
                              onChangeText={setRankSearch}
                              autoFocus={false}
                            />
                            {rankSearch.length > 0 && (
                              <TouchableOpacity onPress={() => setRankSearch('')}>
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
                                    isMobile && styles.dropdownItemMobile,
                                    currentRank === belt && styles.dropdownItemSelected,
                                  ]}
                                  onPress={() => {
                                    setCurrentRank(belt);
                                    setShowRankDropdown(false);
                                    setRankSearch('');
                                  }}
                                >
                                  <Text style={[
                                    styles.dropdownItemText,
                                    currentRank === belt && styles.dropdownItemTextSelected,
                                  ]}>
                                    {belt}
                                  </Text>
                                  {currentRank === belt && (
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

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>Social links (optional)</Text>
                  <View style={[styles.socialInputWrapper, isMobile && styles.socialInputWrapperMobile]}>
                    <TextInput
                      style={[styles.socialInput, isMobile && styles.inputMobile, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder="Facebook URL"
                      placeholderTextColor="#6b8693"
                      value={facebookLink}
                      onChangeText={setFacebookLink}
                    />
                    <Ionicons name="logo-facebook" size={20} color="#07bbc0" style={styles.socialIcon} />
                  </View>
                  <View style={[styles.socialInputWrapper, isMobile && styles.socialInputWrapperMobile]}>
                    <TextInput
                      style={[styles.socialInput, isMobile && styles.inputMobile, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder="Instagram URL"
                      placeholderTextColor="#6b8693"
                      value={instagramLink}
                      onChangeText={setInstagramLink}
                    />
                    <Ionicons name="logo-instagram" size={20} color="#07bbc0" style={styles.socialIcon} />
                  </View>
                  <View style={[styles.socialInputWrapper, isMobile && styles.socialInputWrapperMobile]}>
                    <TextInput
                      style={[styles.socialInput, isMobile && styles.inputMobile, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder="Other (website, etc.)"
                      placeholderTextColor="#6b8693"
                      value={otherLink}
                      onChangeText={setOtherLink}
                    />
                    <Ionicons name="link" size={20} color="#07bbc0" style={styles.socialIcon} />
                  </View>
                </View>
              </View>

            {/* Step 3: Upload Certification Files */}
              <View style={[styles.section, styles.sectionCard, isMobile && styles.sectionCardMobile]}>
                <View style={[styles.sectionBadgeRow, isMobile && styles.sectionBadgeRowMobile]}>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>3</Text>
                  </View>
                  {isMobile && <Text style={styles.stepOfTotal}>Step 3 of 5</Text>}
                </View>
                <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>Certification documents</Text>
                <Text style={[styles.sectionHint, isMobile && styles.sectionHintMobile]}>Upload at least one file (PDF or image) that shows your credentials. Max 10MB per file.</Text>
                {Platform.OS === 'web' ? (
                  <div
                    ref={uploadAreaRef}
                    style={{
                      borderWidth: 2,
                      borderColor: isDragging ? '#09AEC3' : '#07bbc0',
                      borderStyle: 'dashed',
                      borderRadius: 12,
                      minHeight: 220,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: isDragging ? 'rgba(7, 187, 192, 0.15)' : '#011f36',
                      marginTop: 10,
                      cursor: 'pointer',
                    } as any}
                    onClick={handleFileSelect}
                  >
                    <div style={{ textAlign: 'center', padding: 20 }}>
                      <Ionicons 
                        name="cloud-upload-outline" 
                        size={48} 
                        color="#07bbc0" 
                      />
                      <div style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 500, marginTop: 12 }}>
                        {isDragging ? 'Drop files here' : 'Click to upload or drag files here'}
                      </div>
                      <div style={{ color: '#6b8693', fontSize: 12, marginTop: 8 }}>
                        PDF or image. Max 10MB each.
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/*"
                      style={{ display: 'none' }}
                      onChange={handleWebFileChange}
                    />
                  </div>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.uploadArea,
                      isDragging && styles.uploadAreaDragging,
                      errors.uploadedFiles ? styles.uploadAreaError : null,
                      isMobile && styles.uploadAreaMobile,
                    ]}
                    onPress={handleFileSelect}
                    activeOpacity={0.7}
                  >
                    <View style={styles.uploadAreaContent}>
                      <Ionicons 
                        name="cloud-upload-outline" 
                        size={isMobile ? 40 : 48} 
                        color={isDragging ? "#07bbc0" : "#0097A7"} 
                      />
                      <Text style={[styles.uploadText, isMobile && styles.uploadTextMobile]}>
                        {isMobile ? 'Tap to add files' : 'Tap to upload files'}
                      </Text>
                      <Text style={styles.uploadSubtext}>
                        PDF or image, max 10MB each
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <View style={styles.uploadedFilesContainer}>
                    {uploadedFiles.map((file, index) => (
                      <View key={index} style={styles.uploadedFileItem}>
                        <Ionicons 
                          name={getFileIcon(file.type) as any} 
                          size={20} 
                          color="#07bbc0" 
                          style={styles.fileIcon}
                        />
                        <Text style={styles.fileName} numberOfLines={1}>
                          {file.name}
                        </Text>
                        <Text style={styles.fileSize}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeFile(index)}
                          style={styles.removeFileButton}
                        >
                          <Ionicons name="close-circle" size={20} color="#ff4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                {errors.uploadedFiles ? <Text style={styles.errorText}>{errors.uploadedFiles}</Text> : null}
              </View>

              {/* Step 4: A few questions */}
              <View style={[styles.section, styles.sectionCard, isMobile && styles.sectionCardMobile]}>
                <View style={[styles.sectionBadgeRow, isMobile && styles.sectionBadgeRowMobile]}>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>4</Text>
                  </View>
                  {isMobile && <Text style={styles.stepOfTotal}>Step 4 of 5</Text>}
                </View>
                <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>A few questions</Text>
                <Text style={[styles.sectionHint, isMobile && styles.sectionHintMobile]}>Two quick yes/no questions. Answer honestly — it helps us keep the platform safe.</Text>
                <Text style={[styles.questionText, isMobile && styles.questionTextMobile]}>Have you ever had credentials revoked?</Text>
                <View style={[styles.checkboxGroup, isMobile && styles.checkboxGroupMobile]}>
                  <TouchableOpacity 
                    style={[styles.checkboxRow, isMobile && styles.checkboxRowMobile]}
                    onPress={() => setCredentialsRevoked('yes')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, credentialsRevoked === 'yes' && styles.checkboxChecked, isMobile && styles.checkboxMobile]}>
                      {credentialsRevoked === 'yes' && (
                        <Ionicons name="checkmark" size={credentialsRevoked === 'yes' && isMobile ? 18 : 16} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={[styles.checkboxLabel, isMobile && styles.checkboxLabelMobile]}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.checkboxRow, isMobile && styles.checkboxRowMobile]}
                    onPress={() => setCredentialsRevoked('no')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, credentialsRevoked === 'no' && styles.checkboxChecked, isMobile && styles.checkboxMobile]}>
                      {credentialsRevoked === 'no' && (
                        <Ionicons name="checkmark" size={credentialsRevoked === 'no' && isMobile ? 18 : 16} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={[styles.checkboxLabel, isMobile && styles.checkboxLabelMobile]}>No</Text>
                  </TouchableOpacity>
                </View>
                {credentialsRevoked === 'yes' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.explanationLabel}>If yes, please explain:</Text>
                    <View style={[styles.inputWrapper, styles.multilineInputWrapper, isMobile && styles.inputWrapperMobile]}>
                      <TextInput
                        style={[styles.input, styles.multilineInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                        placeholder="Brief explanation (optional)"
                        placeholderTextColor="#6b8693"
                        value={credentialsRevokedExplanation}
                        onChangeText={setCredentialsRevokedExplanation}
                        multiline
                      />
                    </View>
                  </View>
                )}
                <Text style={[styles.questionText, isMobile && styles.questionTextMobile, { marginTop: 20 }]}>Have you been convicted of a felony?</Text>
                <View style={[styles.checkboxGroup, isMobile && styles.checkboxGroupMobile]}>
                  <TouchableOpacity 
                    style={[styles.checkboxRow, isMobile && styles.checkboxRowMobile]}
                    onPress={() => setFelonyConviction('yes')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, felonyConviction === 'yes' && styles.checkboxChecked, isMobile && styles.checkboxMobile]}>
                      {felonyConviction === 'yes' && (
                        <Ionicons name="checkmark" size={felonyConviction === 'yes' && isMobile ? 18 : 16} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={[styles.checkboxLabel, isMobile && styles.checkboxLabelMobile]}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.checkboxRow, isMobile && styles.checkboxRowMobile]}
                    onPress={() => setFelonyConviction('no')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, felonyConviction === 'no' && styles.checkboxChecked, isMobile && styles.checkboxMobile]}>
                      {felonyConviction === 'no' && (
                        <Ionicons name="checkmark" size={felonyConviction === 'no' && isMobile ? 18 : 16} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={[styles.checkboxLabel, isMobile && styles.checkboxLabelMobile]}>No</Text>
                  </TouchableOpacity>
                </View>
                {felonyConviction === 'yes' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.explanationLabel}>If yes, please explain:</Text>
                    <View style={[styles.inputWrapper, styles.multilineInputWrapper, isMobile && styles.inputWrapperMobile]}>
                      <TextInput
                        style={[styles.input, styles.multilineInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                        placeholder="Brief explanation (optional)"
                        placeholderTextColor="#6b8693"
                        value={felonyExplanation}
                        onChangeText={setFelonyExplanation}
                        multiline
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Step 5: Confirm & submit */}
              <View style={[styles.section, styles.sectionCard, styles.sectionCardLast, isMobile && styles.sectionCardMobile]}>
                <View style={[styles.sectionBadgeRow, isMobile && styles.sectionBadgeRowMobile]}>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>5</Text>
                  </View>
                  {isMobile && <Text style={styles.stepOfTotal}>Step 5 of 5</Text>}
                </View>
                <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>Almost done</Text>
                <Text style={[styles.sectionHint, isMobile && styles.sectionHintMobile]}>Check the two boxes below, then tap Submit. We’ll review your application and get back to you.</Text>
                <TouchableOpacity 
                  style={[styles.certificationCheckboxRow, isMobile && styles.certificationCheckboxRowMobile]}
                  onPress={() => {
                    setCertifyAccurate(!certifyAccurate);
                    if (errors.certifyAccurate) {
                      setErrors(prev => ({ ...prev, certifyAccurate: '' }));
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, certifyAccurate && styles.checkboxChecked, isMobile && styles.checkboxMobile]}>
                    {certifyAccurate && (
                      <Ionicons name="checkmark" size={isMobile ? 18 : 16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={[styles.certificationText, isMobile && styles.certificationTextMobile]}>I confirm that all information I provided is accurate</Text>
                </TouchableOpacity>
                {errors.certifyAccurate ? <Text style={styles.errorText}>{errors.certifyAccurate}</Text> : null}
                <TouchableOpacity 
                  style={[styles.certificationCheckboxRow, isMobile && styles.certificationCheckboxRowMobile]}
                  onPress={() => {
                    setAgreeConduct(!agreeConduct);
                    if (errors.agreeConduct) {
                      setErrors(prev => ({ ...prev, agreeConduct: '' }));
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, agreeConduct && styles.checkboxChecked, isMobile && styles.checkboxMobile]}>
                    {agreeConduct && (
                      <Ionicons name="checkmark" size={isMobile ? 18 : 16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={[styles.certificationText, isMobile && styles.certificationTextMobile]}>I agree to maintain professional conduct as a trainer</Text>
                </TouchableOpacity>
                {errors.agreeConduct ? <Text style={styles.errorText}>{errors.agreeConduct}</Text> : null}
              </View>
          </View>

          {/* Register Button - desktop */}
          <View style={[styles.registerButtonContainer, isMobile && styles.registerButtonContainerMobileHide]}>
            <TouchableOpacity 
              style={[styles.registerButton, loading && styles.registerButtonDisabled, isMobile && styles.registerButtonMobile]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.registerButtonText}>Submitting...</Text>
              ) : (
                <Text style={styles.registerButtonText}>Submit application</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Sticky submit bar on mobile */}
        {isMobile && (
          <View style={styles.stickySubmitBar}>
            <TouchableOpacity
              style={[styles.stickySubmitButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.registerButtonText}>Submitting...</Text>
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.registerButtonText}>Submit application</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
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

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={hideToast}
        duration={3000}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#041527' 
  },
  container: { 
    flex: 1, 
    flexDirection: 'row' 
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
  mainContentWrap: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  mainContentWrapMobile: {
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    minHeight: 52,
  },
  topBarMobile: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0a3645',
  },
  topBarBackButton: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  topBarBackIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  mobileMenuButtonWrap: {
    position: 'relative',
  },
  mobileMenuButton: {
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainContent: {
    flex: 1,
  },
  mainContentContainer: {
    paddingHorizontal: 30,
    paddingVertical: 25,
    paddingBottom: 40,
  },
  mainContentContainerMobile: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 140,
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
  publishHeader: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0a3645',
    alignItems: 'center',
  },
  publishHeaderMobile: {
    marginBottom: 20,
    paddingBottom: 12,
  },
  logoImage: {
    width: 180,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  logoImageMobile: {
    width: 140,
    height: 48,
    marginBottom: 12,
  },
  publishTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    width: '100%',
    marginBottom: 6,
  },
  publishTitleMobile: {
    fontSize: 22,
    paddingHorizontal: 8,
  },
  publishSubtitle: {
    fontSize: 14,
    color: '#8fa3b0',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  progressStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  progressStripBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#07bbc0',
  },
  progressStripText: {
    fontSize: 12,
    color: '#6b8693',
  },
  singleColumn: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    marginBottom: 24,
  },
  singleColumnMobile: {
    maxWidth: '100%',
  },
  section: {
    marginBottom: 50,
  },
  sectionCard: {
    backgroundColor: '#061d2e',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#0a3645',
    marginBottom: 24,
  },
  sectionCardMobile: {
    padding: 18,
    marginBottom: 20,
    borderRadius: 10,
  },
  sectionCardLast: {
    marginBottom: 32,
  },
  sectionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sectionBadgeRowMobile: {
    marginBottom: 14,
  },
  sectionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#07bbc0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#041527',
  },
  stepOfTotal: {
    fontSize: 13,
    color: '#8fa3b0',
    fontWeight: '500',
  },
  sectionHint: {
    fontSize: 13,
    color: '#8fa3b0',
    lineHeight: 18,
    marginBottom: 16,
  },
  sectionHintMobile: {
    fontSize: 14,
    lineHeight: 20,
  },
  requiredDot: {
    color: '#07bbc0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#07bbc0',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  sectionTitleMobile: {
    fontSize: 17,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 24,
    position: 'relative',
    zIndex: 1,
  },
  inputGroupWithDropdown: {
    marginBottom: 24,
    position: 'relative',
    zIndex: 10000,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputLabelMobile: {
    fontSize: 15,
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#011f36',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0a3645',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 56,
  },
  inputWrapperError: {
    borderColor: '#FF6B6B',
  },
  inputWrapperMobile: {
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 8,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  inputMobile: {
    fontSize: 16,
    minHeight: 44,
  },
  multilineInputWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 15,
    minHeight: 100,
  },
  multilineInput: {
    textAlignVertical: 'top',
    paddingVertical: 0,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#011f36',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0a3645',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 56,
    justifyContent: 'space-between',
  },
  selectInputMobile: {
    minHeight: 48,
    borderRadius: 8,
    paddingVertical: 14,
  },
  selectedItemsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 187, 192, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#07bbc0',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginRight: 4,
  },
  chipRemove: {
    marginLeft: 2,
  },
  placeholderText: {
    color: '#6b8693',
    fontSize: 16,
  },
  selectedText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  selectIcon: {
    marginLeft: 8,
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
    backgroundColor: '#011f36',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0a3645',
    marginTop: 4,
    maxHeight: 200,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 25,
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a3645',
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
    paddingVertical: 4,
  },
  dropdownScroll: {
    maxHeight: 200,
    backgroundColor: '#01151F',
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
  dropdownItemMobile: {
    paddingVertical: 14,
    minHeight: 48,
  },
  dropdownItemSelected: {
    backgroundColor: '#062731',
  },
  dropdownItemText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: '#0097A7',
    fontWeight: '600',
  },
  socialInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#011f36',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0a3645',
    paddingHorizontal: 12,
    minHeight: 56,
    marginBottom: 16,
  },
  socialInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  socialIcon: {
    marginLeft: 8,
  },
  socialInputWrapperMobile: {
    minHeight: 48,
    marginBottom: 12,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#07bbc0',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#011f36',
    marginTop: 10,
    position: 'relative',
  },
  uploadAreaDragging: {
    borderColor: '#09AEC3',
    backgroundColor: 'rgba(7, 187, 192, 0.15)',
    borderWidth: 3,
  },
  uploadAreaError: {
    borderColor: '#FF6B6B',
  },
  uploadAreaMobile: {
    height: 160,
    marginTop: 8,
    minHeight: 140,
  },
  uploadAreaContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  uploadText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  uploadTextMobile: {
    fontSize: 15,
  },
  uploadSubtext: {
    color: '#6b8693',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  uploadedFilesContainer: {
    marginTop: 16,
    gap: 8,
  },
  uploadedFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#011f36',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#0a3645',
  },
  fileIcon: {
    marginRight: 12,
  },
  fileName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 8,
  },
  fileSize: {
    color: '#6b8693',
    fontSize: 12,
    marginRight: 8,
  },
  removeFileButton: {
    padding: 4,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  questionTextMobile: {
    fontSize: 15,
  },
  checkboxGroup: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  checkboxGroupMobile: {
    gap: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxRowMobile: {
    minHeight: 44,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#07bbc0',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxMobile: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#07bbc0',
    borderColor: '#07bbc0',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  checkboxLabelMobile: {
    fontSize: 15,
  },
  explanationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 8,
  },
  certificationCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  certificationCheckboxRowMobile: {
    marginBottom: 20,
    minHeight: 44,
  },
  certificationText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 8,
  },
  certificationTextMobile: {
    fontSize: 15,
    lineHeight: 22,
  },
  registerButtonContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  registerButtonContainerMobileHide: {
    marginBottom: 24,
  },
  registerButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    minWidth: 150,
  },
  registerButtonMobile: {
    minWidth: '100%',
    paddingVertical: 16,
  },
  registerButtonDisabled: {
    backgroundColor: '#6b8693',
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  stickySubmitBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    backgroundColor: '#041527',
    borderTopWidth: 1,
    borderTopColor: '#0a3645',
  },
  stickySubmitButton: {
    backgroundColor: '#07bbc0',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 54,
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
  menuContainerMobile: {
    left: 16,
    right: 16,
    top: 70,
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
  datePickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContainer: {
    backgroundColor: '#01151F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#0097A7',
  },
  datePickerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  datePickerButton: {
    color: '#0097A7',
    fontSize: 16,
    fontWeight: '500',
  },
  datePickerButtonDone: {
    fontWeight: '700',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    paddingLeft: 4,
  },
});
