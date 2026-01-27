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
    Dimensions,
    Platform,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthController } from '../controllers/AuthController';
import { TrainerApplication } from '../models/TrainerApplication';
import * as DocumentPicker from 'expo-document-picker';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

const screenWidth = Dimensions.get('window').width;

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
    console.log('Navigate to messages');
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
      if (existingApplication) {
        // Only allow submission if the existing application is rejected
        if (existingApplication.status !== 'rejected') {
          const statusMessage = existingApplication.status === 'awaiting review' 
            ? 'Your application is currently under review. Please wait for a decision.'
            : 'You already have an approved application.';
          showToast(statusMessage);
          setLoading(false);
          return;
        }
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
      
      // Navigate back or show success message
      // You can add navigation here if needed
      // router.push('/profile');
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

        {/* Main Content */}
        <ScrollView 
          style={styles.mainContent}
          contentContainerStyle={styles.mainContentContainer}
          showsVerticalScrollIndicator={true}
        >
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/images/defendudashboardlogo.png')}
              style={styles.logoImage}
            />
            <Text style={styles.pageTitle}>Build Your Verified Profile</Text>
          </View>

          {/* Two Column Layout */}
          <View style={styles.twoColumnContainer}>
            {/* Left Column */}
            <View style={styles.leftColumn}>
              {/* Personal Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder=""
                      placeholderTextColor="transparent"
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
                  <Text style={styles.inputLabel}>Professional Alias/Display Name</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder=""
                      placeholderTextColor="transparent"
                      value={professionalAlias}
                      onChangeText={setProfessionalAlias}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Date of Birth</Text>
                  {Platform.OS === 'web' ? (
                    <View style={styles.inputWrapper}>
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
                        style={styles.inputWrapper}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Text style={dateOfBirth ? styles.selectedText : styles.placeholderText}>
                          {selectedDate ? formatDateDisplay(selectedDate) : 'Select date of birth'}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color="#0097A7" />
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
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder=""
                      placeholderTextColor="transparent"
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
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder=""
                      placeholderTextColor="transparent"
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
                  <Text style={styles.inputLabel}>Academy Name</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder=""
                      placeholderTextColor="transparent"
                      value={academyName}
                      onChangeText={(text) => {
                        setAcademyName(text);
                      }}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Physical Address</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder=""
                      placeholderTextColor="transparent"
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

              {/* Credentials & Certifications */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Credentials & Certifications</Text>
                
                <View style={[styles.inputGroup, showMartialArtsDropdown && styles.inputGroupWithDropdown]}>
                  <Text style={styles.inputLabel}>Defense Style</Text>
                  <TouchableOpacity 
                    style={styles.selectInput}
                    onPress={() => {
                      setShowMartialArtsDropdown(!showMartialArtsDropdown);
                      setShowYearsExperienceDropdown(false);
                      setShowYearsTeachingDropdown(false);
                      setShowRankDropdown(false);
                    }}
                  >
                    <View style={styles.selectedItemsContainer}>
                      {selectedMartialArts.length === 0 ? (
                        <Text style={styles.placeholderText}>Select martial arts...</Text>
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
                    <Ionicons name="chevron-down" size={20} color="#0097A7" style={styles.selectIcon} />
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
                                  <Ionicons name="checkmark" size={20} color="#0097A7" />
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
                  <Text style={styles.inputLabel}>Years of Experience</Text>
                  <TouchableOpacity 
                    style={styles.selectInput}
                    onPress={() => {
                      setShowMartialArtsDropdown(false);
                      setShowYearsExperienceDropdown(!showYearsExperienceDropdown);
                      setShowYearsTeachingDropdown(false);
                      setShowRankDropdown(false);
                    }}
                  >
                    <Text style={yearsExperience ? styles.selectedText : styles.placeholderText}>
                      {yearsExperience || 'Select years...'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#0097A7" style={styles.selectIcon} />
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
                                  <Ionicons name="checkmark" size={20} color="#0097A7" />
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
                  <Text style={styles.inputLabel}>Years of Teaching Experience</Text>
                  <TouchableOpacity 
                    style={styles.selectInput}
                    onPress={() => {
                      setShowMartialArtsDropdown(false);
                      setShowYearsExperienceDropdown(false);
                      setShowYearsTeachingDropdown(!showYearsTeachingDropdown);
                      setShowRankDropdown(false);
                    }}
                  >
                    <Text style={yearsTeaching ? styles.selectedText : styles.placeholderText}>
                      {yearsTeaching || 'Select years...'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#0097A7" style={styles.selectIcon} />
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
                                  <Ionicons name="checkmark" size={20} color="#0097A7" />
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
                      <Ionicons name="chevron-down" size={20} color="#0097A7" style={styles.selectIcon} />
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
                                    <Ionicons name="checkmark" size={20} color="#0097A7" />
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
                  <Text style={styles.inputLabel}>Social Media Links</Text>
                  <View style={styles.socialInputWrapper}>
                    <TextInput
                      style={[styles.socialInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder=""
                      placeholderTextColor="transparent"
                      value={facebookLink}
                      onChangeText={setFacebookLink}
                    />
                    <Ionicons name="logo-facebook" size={20} color="#0097A7" style={styles.socialIcon} />
                  </View>
                  <View style={styles.socialInputWrapper}>
                    <TextInput
                      style={[styles.socialInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder=""
                      placeholderTextColor="transparent"
                      value={instagramLink}
                      onChangeText={setInstagramLink}
                    />
                    <Ionicons name="logo-instagram" size={20} color="#0097A7" style={styles.socialIcon} />
                  </View>
                  <View style={styles.socialInputWrapper}>
                    <TextInput
                      style={[styles.socialInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder=""
                      placeholderTextColor="transparent"
                      value={otherLink}
                      onChangeText={setOtherLink}
                    />
                    <Ionicons name="link" size={20} color="#0097A7" style={styles.socialIcon} />
                  </View>
                </View>
              </View>
            </View>

            {/* Right Column */}
            <View style={styles.rightColumn}>
              {/* Upload Certification Files */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upload Certification Files</Text>
                {Platform.OS === 'web' ? (
                  <div
                    ref={uploadAreaRef}
                    style={{
                      borderWidth: 2,
                      borderColor: isDragging ? '#07bbc0' : '#0097A7',
                      borderStyle: 'dashed',
                      borderRadius: 12,
                      height: 250,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: isDragging ? 'rgba(7, 187, 192, 0.1)' : 'transparent',
                      marginTop: 10,
                      cursor: 'pointer',
                    } as any}
                    onClick={handleFileSelect}
                  >
                    <div style={{ textAlign: 'center', padding: 20 }}>
                      <Ionicons 
                        name="cloud-upload-outline" 
                        size={48} 
                        color={isDragging ? "#07bbc0" : "#0097A7"} 
                      />
                      <div style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 500, marginTop: 12 }}>
                        {isDragging ? 'Drop files here' : 'Click to upload or drag files here'}
                      </div>
                      <div style={{ color: '#6b8693', fontSize: 12, marginTop: 8 }}>
                        PDF, PNG, JPG, JPEG (Max 10MB per file)
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
                    ]}
                    onPress={handleFileSelect}
                    activeOpacity={0.7}
                  >
                    <View style={styles.uploadAreaContent}>
                      <Ionicons 
                        name="cloud-upload-outline" 
                        size={48} 
                        color={isDragging ? "#07bbc0" : "#0097A7"} 
                      />
                      <Text style={styles.uploadText}>
                        Tap to upload files
                      </Text>
                      <Text style={styles.uploadSubtext}>
                        PDF, PNG, JPG, JPEG (Max 10MB per file)
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
                          color="#0097A7" 
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

              {/* Credentials Revoked Question */}
              <View style={styles.section}>
                <Text style={styles.questionText}>Have you ever had credentials revoked?</Text>
                <View style={styles.checkboxGroup}>
                  <TouchableOpacity 
                    style={styles.checkboxRow}
                    onPress={() => setCredentialsRevoked('yes')}
                  >
                    <View style={[styles.checkbox, credentialsRevoked === 'yes' && styles.checkboxChecked]}>
                      {credentialsRevoked === 'yes' && (
                        <Ionicons name="checkmark" size={16} color="#0097A7" />
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.checkboxRow}
                    onPress={() => setCredentialsRevoked('no')}
                  >
                    <View style={[styles.checkbox, credentialsRevoked === 'no' && styles.checkboxChecked]}>
                      {credentialsRevoked === 'no' && (
                        <Ionicons name="checkmark" size={16} color="#0097A7" />
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>No</Text>
                  </TouchableOpacity>
                </View>
                {credentialsRevoked === 'yes' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.explanationLabel}>If yes, please explain:</Text>
                    <View style={[styles.inputWrapper, styles.multilineInputWrapper]}>
                      <TextInput
                        style={[styles.input, styles.multilineInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                        placeholder=""
                        placeholderTextColor="transparent"
                        value={credentialsRevokedExplanation}
                        onChangeText={setCredentialsRevokedExplanation}
                        multiline
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Felony Conviction Question */}
              <View style={[styles.section, { marginTop: 30 }]}>
                <Text style={styles.questionText}>Have you been convicted of a felony?</Text>
                <View style={styles.checkboxGroup}>
                  <TouchableOpacity 
                    style={styles.checkboxRow}
                    onPress={() => setFelonyConviction('yes')}
                  >
                    <View style={[styles.checkbox, felonyConviction === 'yes' && styles.checkboxChecked]}>
                      {felonyConviction === 'yes' && (
                        <Ionicons name="checkmark" size={16} color="#0097A7" />
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.checkboxRow}
                    onPress={() => setFelonyConviction('no')}
                  >
                    <View style={[styles.checkbox, felonyConviction === 'no' && styles.checkboxChecked]}>
                      {felonyConviction === 'no' && (
                        <Ionicons name="checkmark" size={16} color="#0097A7" />
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>No</Text>
                  </TouchableOpacity>
                </View>
                {felonyConviction === 'yes' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.explanationLabel}>If yes, please explain:</Text>
                    <View style={[styles.inputWrapper, styles.multilineInputWrapper]}>
                      <TextInput
                        style={[styles.input, styles.multilineInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                        placeholder=""
                        placeholderTextColor="transparent"
                        value={felonyExplanation}
                        onChangeText={setFelonyExplanation}
                        multiline
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Certifications */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Credentials & Certifications</Text>
                <TouchableOpacity 
                  style={styles.certificationCheckboxRow}
                  onPress={() => {
                    setCertifyAccurate(!certifyAccurate);
                    if (errors.certifyAccurate) {
                      setErrors(prev => ({ ...prev, certifyAccurate: '' }));
                    }
                  }}
                >
                  <View style={[styles.checkbox, certifyAccurate && styles.checkboxChecked]}>
                    {certifyAccurate && (
                      <Ionicons name="checkmark" size={16} color="#0097A7" />
                    )}
                  </View>
                  <Text style={styles.certificationText}>I certify all information provided is accurate</Text>
                </TouchableOpacity>
                {errors.certifyAccurate ? <Text style={styles.errorText}>{errors.certifyAccurate}</Text> : null}
                <TouchableOpacity 
                  style={styles.certificationCheckboxRow}
                  onPress={() => {
                    setAgreeConduct(!agreeConduct);
                    if (errors.agreeConduct) {
                      setErrors(prev => ({ ...prev, agreeConduct: '' }));
                    }
                  }}
                >
                  <View style={[styles.checkbox, agreeConduct && styles.checkboxChecked]}>
                    {agreeConduct && (
                      <Ionicons name="checkmark" size={16} color="#0097A7" />
                    )}
                  </View>
                  <Text style={styles.certificationText}>I agree to maintain professional conduct</Text>
                </TouchableOpacity>
                {errors.agreeConduct ? <Text style={styles.errorText}>{errors.agreeConduct}</Text> : null}
              </View>
            </View>
          </View>

          {/* Register Button */}
          <View style={styles.registerButtonContainer}>
            <TouchableOpacity 
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.registerButtonText}>Submitting...</Text>
              ) : (
                <Text style={styles.registerButtonText}>Register</Text>
              )}
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
  },
  mainContentContainer: {
    paddingHorizontal: 30,
    paddingVertical: 25,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  logoImage: {
    width: 180,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    width: '100%',
  },
  twoColumnContainer: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 40,
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: 1,
    minWidth: 0,
  },
  rightColumn: {
    flex: 1,
    minWidth: 0,
  },
  section: {
    marginBottom: 50,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#01151F',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#0097A7',
    paddingHorizontal: 15,
    minHeight: 56,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 0,
    textAlignVertical: 'center',
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
    backgroundColor: '#01151F',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#0097A7',
    paddingHorizontal: 15,
    minHeight: 56,
    justifyContent: 'space-between',
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
    backgroundColor: '#0097A7',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
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
    backgroundColor: '#01151F',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0097A7',
    marginTop: 4,
    maxHeight: 200,
    zIndex: 10000,
    shadowColor: '#0097A7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
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
    borderBottomColor: '#0097A7',
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
    backgroundColor: '#01151F',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#0097A7',
    paddingHorizontal: 15,
    height: 56,
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
  uploadArea: {
    borderWidth: 2,
    borderColor: '#0097A7',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginTop: 10,
    position: 'relative',
  },
  uploadAreaDragging: {
    borderColor: '#07bbc0',
    backgroundColor: 'rgba(7, 187, 192, 0.1)',
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
    backgroundColor: '#01151F',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#0097A7',
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
  checkboxGroup: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#0097A7',
    borderRadius: 2,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: 'transparent',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#FFFFFF',
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
  certificationText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 8,
  },
  registerButtonContainer: {
    alignItems: 'flex-end',
    marginTop: 30,
    marginBottom: 20,
  },
  registerButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    minWidth: 150,
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
