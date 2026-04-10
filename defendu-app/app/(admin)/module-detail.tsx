import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Image,
  TextInput,
  Modal,
  Linking,
  Share,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthController } from '../controllers/AuthController';
import { Module } from '../_models/Module';
import { User } from '../_models/User';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useLogout } from '../../hooks/useLogout';

/** Slug for extract output filename: alphanumeric only (e.g. "Jab fundamentals" -> "Jabfundamentals"). */
function slugForExtract(s: string): string {
  if (!s || typeof s !== 'string') return 'module';
  return s.replace(/[^a-zA-Z0-9]/g, '').trim() || 'module';
}

/** Category -> folder name for pose extract (punching, kicking, elbow_strikes, etc.). */
function categoryFolderForExtract(category: string): string {
  if (!category?.trim()) return 'other';
  const key = category.trim().toLowerCase();
  const map: Record<string, string> = {
    punching: 'punching',
    kicking: 'kicking',
    'elbow strikes': 'elbow_strikes',
    'knee strikes': 'knee_strikes',
    'defensive moves': 'defensive_moves',
  };
  return map[key] ?? (key.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'other');
}

/** Output path for pose extract: e.g. punching/Jab_MikelAboyme_pose_data.csv */
function getExtractOutputPath(title: string, trainer: string, category: string): string {
  const folder = categoryFolderForExtract(category);
  const titleSlug = slugForExtract(title) || 'module';
  const trainerSlug = slugForExtract(trainer) || 'trainer';
  return `${folder}/${titleSlug}_${trainerSlug}_pose_data.csv`;
}

/** Force Cloudinary video URLs to MP4 for reliable playback. */
function getPlayableVideoUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string' || !url.trim()) return '';
  const u = url.trim();
  if (u.includes('res.cloudinary.com') && u.includes('/video/upload/') && !u.includes('f_mp4') && !u.includes('f_auto')) {
    return u.replace('/video/upload/', '/video/upload/f_mp4/');
  }
  return u;
}

export default function ModuleDetailPage() {
  const router = useRouter();
  const { moduleId: moduleIdParam, mode, category: categoryParam } = useLocalSearchParams<{
    moduleId: string | string[];
    mode?: string;
    category?: string;
  }>();
  /** Expo web/router may pass search params as string[] — API expects a single string. */
  const moduleId = Array.isArray(moduleIdParam) ? moduleIdParam[0] : moduleIdParam;
  const isCreateMode = mode === 'create';
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();
  const handleLogout = useLogout();
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(!isCreateMode);
  const [showMenu, setShowMenu] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customRejectionReason, setCustomRejectionReason] = useState('');

  const rejectionReasons = [
    'Inappropriate content',
    'Incomplete information',
    'Poor video quality',
    'Does not meet safety standards',
    'Incorrect technique demonstration',
    'Violates community guidelines',
    'Other (specify below)',
  ];

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [customDeletionReason, setCustomDeletionReason] = useState('');
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [poseTicketSubmitting, setPoseTicketSubmitting] = useState(false);

  const [isEditing, setIsEditing] = useState(mode === 'edit');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIntroduction, setEditIntroduction] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDifficulty, setEditDifficulty] = useState<Module['difficultyLevel']>('basic');
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('');
  const [editTechniqueVideoUrl, setEditTechniqueVideoUrl] = useState('');
  const [editReferenceGuideUrl, setEditReferenceGuideUrl] = useState('');
  const techniqueVideoInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailWebInputRef = useRef<HTMLInputElement | null>(null);
  const [editIntensity, setEditIntensity] = useState<number>(1);
  const [editSpaceRequirements, setEditSpaceRequirements] = useState<string[]>([]);
  const [editPhysicalDemandTags, setEditPhysicalDemandTags] = useState<string[]>([]);
  const [approvedTrainers, setApprovedTrainers] = useState<User[]>([]);
  const [editTrainerId, setEditTrainerId] = useState('');
  const [editTrainerName, setEditTrainerName] = useState('');
  const [showTrainerPicker, setShowTrainerPicker] = useState(false);

  // Create mode state
  const [createCategory, setCreateCategory] = useState(categoryParam || '');
  const [createDescription, setCreateDescription] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showEditCategoryPicker, setShowEditCategoryPicker] = useState(false);

  const deletionReasons = [
    'Inappropriate content',
    'Incomplete information',
    'Poor video quality',
    'Does not meet safety standards',
    'Incorrect technique demonstration',
    'Violates community guidelines',
    'Duplicate module',
    'No longer needed',
    'Other (specify below)',
  ];

  useEffect(() => {
    if (isCreateMode) {
      // Load categories for create mode category picker
      AuthController.getModuleCategories()
        .then(setCategories)
        .catch((err) => console.error('Failed to load categories:', err));
    } else if (moduleId) {
      loadModule();
      // Also load categories for edit mode category picker
      AuthController.getModuleCategories()
        .then(setCategories)
        .catch((err) => console.error('Failed to load categories:', err));
    }
    // Fetch approved trainers for the trainer picker
    AuthController.getApprovedTrainers()
      .then(setApprovedTrainers)
      .catch((err) => console.error('Failed to load trainers:', err));
  }, [moduleId, isCreateMode]);

  useEffect(() => {
    if (module) {
      setEditTitle(module.moduleTitle);
      setEditDescription(module.description || '');
      setEditIntroduction(module.introductionType === 'text' ? (module.introduction || '') : '');
      setEditCategory(module.category || '');
      setEditDifficulty(module.difficultyLevel || 'basic');
      setEditThumbnailUrl(module.thumbnailUrl || '');
      setEditTechniqueVideoUrl(module.techniqueVideoUrl || '');
      setEditReferenceGuideUrl(module.referenceGuideUrl || '');
      setEditIntensity(module.intensityLevel || 1);
      setEditSpaceRequirements(module.spaceRequirements || []);
      setEditPhysicalDemandTags(module.physicalDemandTags || []);
      setEditTrainerId(module.trainerId || '');
      setEditTrainerName(module.trainerName || '');
      if (module.status !== 'approved') setIsEditing(false);
    }
  }, [module]);

  const techniqueVideoForExtract = useMemo(() => {
    if (!module) return '';
    if (module.status === 'approved' && isEditing) {
      const u = editTechniqueVideoUrl.trim();
      if (u) return getPlayableVideoUrl(u) || u;
      return (module.techniqueVideoLink || '').trim() || module.techniqueVideoUrl2 || '';
    }
    if (module.techniqueVideoUrl) {
      return getPlayableVideoUrl(module.techniqueVideoUrl) || module.techniqueVideoUrl;
    }
    return module.techniqueVideoUrl2 || module.techniqueVideoLink || '';
  }, [module, isEditing, editTechniqueVideoUrl]);

  const extractCommand = useMemo(() => {
    if (!module || !techniqueVideoForExtract) return '';
    const title =
      module.status === 'approved' && isEditing ? editTitle.trim() : (module.moduleTitle ?? '');
    return `python extract_pose_data.py --video "${techniqueVideoForExtract}" --title "${title.replace(/"/g, '\\"')}" --trainer "${(module.trainerName ?? '').replace(/"/g, '\\"')}" --category "${(module.category ?? '').replace(/"/g, '\\"')}"`;
  }, [module, isEditing, editTitle, techniqueVideoForExtract]);

  const toggleEditSpaceRequirement = (requirement: string) => {
    setEditSpaceRequirements((prev) =>
      prev.includes(requirement) ? prev.filter((r) => r !== requirement) : [...prev, requirement]
    );
  };

  const toggleEditPhysicalDemandTag = (tag: string) => {
    setEditPhysicalDemandTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handlePickThumbnail = async () => {
    try {
      if (Platform.OS === 'web') {
        thumbnailWebInputRef.current?.click();
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const localUri = result.assets[0].uri;
        setProcessing(true);
        const url = await AuthController.uploadFileToCloudinary(localUri, 'image', 'module_thumbnail');
        setEditThumbnailUrl(url);
        showToast('Thumbnail updated');
      }
    } catch (error: any) {
      console.error('Error picking thumbnail:', error);
      showToast(error.message || 'Failed to update thumbnail');
    } finally {
      setProcessing(false);
    }
  };

  const handleWebThumbnailPick = async (event: any) => {
    const file = event.target.files?.[0];
    if (thumbnailWebInputRef.current) thumbnailWebInputRef.current.value = '';
    if (!file) return;
    try {
      setProcessing(true);
      const uri = URL.createObjectURL(file);
      const url = await AuthController.uploadFileToCloudinary(uri, 'image', file.name || 'module_thumbnail');
      URL.revokeObjectURL(uri);
      setEditThumbnailUrl(url);
      showToast('Thumbnail updated');
    } catch (error: any) {
      console.error('Error picking thumbnail:', error);
      showToast(error.message || 'Failed to update thumbnail');
    } finally {
      setProcessing(false);
    }
  };

  const handleCaptureThumbnail = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        showToast('Camera permission is required to take a photo');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const localUri = result.assets[0].uri;
        setProcessing(true);
        const url = await AuthController.uploadFileToCloudinary(localUri, 'image', 'module_thumbnail');
        setEditThumbnailUrl(url);
        showToast('Thumbnail updated');
      }
    } catch (error: any) {
      console.error('Error capturing thumbnail:', error);
      showToast(error.message || 'Failed to update thumbnail');
    } finally {
      setProcessing(false);
    }
  };

  const handlePickReferenceGuide = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const localUri = result.assets[0].uri;
        setProcessing(true);
        const url = await AuthController.uploadFileToCloudinary(localUri, 'image', 'module_reference_guide');
        setEditReferenceGuideUrl(url);
        showToast('Reference guide updated');
      }
    } catch (error: any) {
      console.error('Error picking reference guide:', error);
      showToast(error.message || 'Failed to update reference guide');
    } finally {
      setProcessing(false);
    }
  };

  const handlePickTechniqueVideo = async () => {
    try {
      if (Platform.OS === 'web') {
        techniqueVideoInputRef.current?.click();
        return;
      }
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setProcessing(true);
      const url = await AuthController.uploadFileToCloudinary(
        asset.uri,
        'video',
        asset.name || 'technique_video'
      );
      setEditTechniqueVideoUrl(url);
      showToast('Technique video uploaded');
    } catch (error: any) {
      console.error('Error selecting technique video:', error);
      showToast(error.message || 'Failed to upload technique video');
    } finally {
      setProcessing(false);
    }
  };

  const handleWebTechniqueVideoChange = async (event: any) => {
    const file = event.target.files?.[0];
    if (techniqueVideoInputRef.current) techniqueVideoInputRef.current.value = '';
    if (!file) return;
    try {
      setProcessing(true);
      const uri = URL.createObjectURL(file);
      const url = await AuthController.uploadFileToCloudinary(uri, 'video', file.name || 'technique_video');
      URL.revokeObjectURL(uri);
      setEditTechniqueVideoUrl(url);
      showToast('Technique video uploaded');
    } catch (error: any) {
      console.error('Error uploading technique video:', error);
      showToast(error.message || 'Failed to upload technique video');
    } finally {
      setProcessing(false);
    }
  };

  const loadModule = async () => {
    try {
      setLoading(true);
      if (!moduleId) {
        throw new Error('Module ID is required');
      }
      const moduleData = await AuthController.getModuleById(moduleId);
      if (!moduleData) {
        showToast('Module not found');
        router.back();
        return;
      }
      setModule(moduleData);
    } catch (error: any) {
      console.error('❌ Error loading module:', error);
      showToast(error.message || 'Failed to load module');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!module || !moduleId) return;
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      showToast('Title cannot be empty');
      return;
    }
    try {
      setProcessing(true);
      const vid = editTechniqueVideoUrl.trim();
      const savedLink = (module.techniqueVideoLink || '').trim();
      const trainerChanged = editTrainerId && editTrainerId !== module.trainerId;
      const categoryChanged = editCategory.trim() && editCategory.trim() !== module.category;
      await AuthController.updateModuleMetadata(moduleId, {
        moduleTitle: trimmedTitle,
        description: editDescription.trim(),
        introduction: editIntroduction.trim(),
        category: editCategory.trim() || undefined,
        difficultyLevel: editDifficulty,
        thumbnailUrl: editThumbnailUrl.trim() || undefined,
        referenceGuideUrl: editReferenceGuideUrl.trim() || undefined,
        intensityLevel: editIntensity,
        spaceRequirements: editSpaceRequirements,
        physicalDemandTags: editPhysicalDemandTags,
        techniqueVideoUrl: vid || null,
        techniqueVideoUrl2: !vid && !savedLink ? null : undefined,
        ...(trainerChanged ? { trainerId: editTrainerId, trainerName: editTrainerName } : {}),
      });
      const updated: Module = {
        ...module,
        moduleTitle: trimmedTitle,
        description: editDescription.trim(),
        introduction: editIntroduction.trim() || module.introduction,
        category: editCategory.trim() || module.category,
        difficultyLevel: editDifficulty,
        thumbnailUrl: editThumbnailUrl.trim() || undefined,
        referenceGuideUrl: editReferenceGuideUrl.trim() || undefined,
        intensityLevel: editIntensity,
        spaceRequirements: editSpaceRequirements,
        physicalDemandTags: editPhysicalDemandTags,
        techniqueVideoUrl: vid || undefined,
        techniqueVideoUrl2: !vid && !savedLink ? undefined : module.techniqueVideoUrl2,
        ...(trainerChanged ? { trainerId: editTrainerId, trainerName: editTrainerName } : {}),
        updatedAt: new Date(),
      };
      setModule(updated);
      setIsEditing(false);
      showToast('Module updated');
    } catch (error: any) {
      console.error('Error updating module:', error);
      showToast(error.message || 'Failed to update module');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateModule = async () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) { showToast('Title is required'); return; }
    if (!createCategory) { showToast('Category is required'); return; }
    if (!editTrainerId) { showToast('Trainer is required'); return; }
    try {
      setProcessing(true);
      const newModuleId = await AuthController.adminCreateModule({
        moduleTitle: trimmedTitle,
        description: createDescription.trim(),
        category: createCategory,
        trainerId: editTrainerId,
        trainerName: editTrainerName,
        difficultyLevel: editDifficulty || 'basic',
        intensityLevel: editIntensity,
        spaceRequirements: editSpaceRequirements,
        physicalDemandTags: editPhysicalDemandTags,
        thumbnailUrl: editThumbnailUrl.trim() || undefined,
        techniqueVideoUrl: editTechniqueVideoUrl.trim() || undefined,
        referenceGuideUrl: editReferenceGuideUrl.trim() || undefined,
      });
      showToast('Module created successfully!');
      router.replace({
        pathname: '/(admin)/module-detail',
        params: { moduleId: newModuleId },
      });
    } catch (error: any) {
      console.error('Error creating module:', error);
      showToast(error.message || 'Failed to create module');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!module || !moduleId) return;

    try {
      setProcessing(true);
      await AuthController.approveModule(moduleId);
      showToast('Module accepted successfully!');
      router.back();
    } catch (error: any) {
      console.error('Error approving module:', error);
      showToast(error.message || 'Failed to accept module');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectClick = () => {
    setShowRejectModal(true);
    setRejectionReason('');
    setCustomRejectionReason('');
  };

  const handleReject = async () => {
    if (!module || !moduleId) return;

    const finalReason = rejectionReason === 'Other (specify below)'
      ? customRejectionReason.trim()
      : rejectionReason;

    if (!finalReason) {
      showToast('Please select or provide a rejection reason');
      return;
    }

    try {
      setProcessing(true);
      await AuthController.rejectModule(moduleId, finalReason);
      showToast('Module rejected');
      setShowRejectModal(false);
      router.back();
    } catch (error: any) {
      console.error('Error rejecting module:', error);
      showToast(error.message || 'Failed to reject module');
    } finally {
      setProcessing(false);
    }
  };

  const openDeleteModal = () => {
    setDeletionReason('');
    setCustomDeletionReason('');
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletionReason('');
    setCustomDeletionReason('');
  };

  const handleDeleteModule = async () => {
    if (!module || !moduleId) return;
    const custom = customDeletionReason.trim();
    const finalReason =
      custom || (deletionReason === 'Other (specify below)' ? custom : deletionReason);
    if (!finalReason) {
      showToast('Please select or type a reason for deletion');
      return;
    }
    try {
      setProcessing(true);
      await AuthController.deleteModule(moduleId, finalReason);
      showToast('Module deleted. Trainer has been notified.');
      setShowDeleteModal(false);
      router.back();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete module');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDuration = (seconds: number | undefined): string => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getReferenceCode = (moduleId: string): string => {
    const num = moduleId.slice(-4) || '0000';
    return `M${num}`;
  };

  const openVideoUrl = (url: string, isCloudinary = false) => {
    const target = isCloudinary ? getPlayableVideoUrl(url) || url : url;
    Linking.openURL(target).catch((err) => {
      console.error('Failed to open URL:', err);
      showToast('Failed to open video URL');
    });
  };

  const extractOutputPath = module
    ? getExtractOutputPath(
        module.status === 'approved' && isEditing
          ? editTitle.trim() || module.moduleTitle
          : module.moduleTitle,
        module.trainerName ?? '',
        module.category
      )
    : 'pose_data.csv';

  const handleShareExtractCommand = async () => {
    const message = `Run on your computer (in pose-data-extractor folder):\n\n${extractCommand}\n\nOutput: ${extractOutputPath}\n\nKeys: U=jab, I=hook, O=uppercut, G=good_rep, P=positive, N=bad, Space=pause, Q=quit`;
    try {
      await Share.share({
        message: message + '\n\nVideo: ' + techniqueVideoForExtract,
        title: 'Pose estimation — developer ticket',
      });
    } catch {
      showToast('Share not available');
    }
  };

  const handleSubmitPoseEstimationTicket = async () => {
    if (!module || !moduleId || !extractCommand || !techniqueVideoForExtract) {
      showToast('Video URL and command are required to submit a ticket');
      return;
    }
    try {
      setPoseTicketSubmitting(true);
      await AuthController.submitPoseEstimationTicket({
        moduleId,
        referenceCode: getReferenceCode(moduleId),
        moduleTitle: module.moduleTitle,
        description: module.description ?? '',
        category: module.category ?? '',
        trainerName: module.trainerName ?? '',
        status: module.status ?? '',
        videoUrl: techniqueVideoForExtract,
        extractCommand,
        outputPath: extractOutputPath,
        createdAtLabel: formatDate(module.createdAt),
        submittedAtLabel: formatDate(module.submittedAt),
      });
      showToast('Ticket emailed to the developer');
      setShowExtractModal(false);
    } catch (error: any) {
      console.error('Pose estimation ticket error:', error);
      showToast(error.message || 'Failed to send ticket');
    } finally {
      setPoseTicketSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#38a6de" />
          <Text style={styles.loadingText}>Loading module details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!module && !isCreateMode) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Module not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Create mode: render a full creation form
  if (isCreateMode) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.leftNavBar}>
            <TouchableOpacity style={styles.navMenuButton} onPress={() => setShowMenu(true)}>
              <Ionicons name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.navBottomIcons}>
              <View style={styles.navIconsBox}>
                <TouchableOpacity onPress={() => router.push('/(admin)/adminManaging')}>
                  <Image source={require('../../assets/images/adminmanageicon.png')} style={styles.navIconImage} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/(admin)/adminDashboard')}>
                  <Image source={require('../../assets/images/homeicon.png')} style={styles.navIconImage} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.header}>
            <TouchableOpacity style={styles.backButtonHeader} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Image source={require('../../assets/images/defendudashboardlogo.png')} style={styles.headerLogoImage} resizeMode="contain" />
              <Text style={styles.headerAdminText}>Admin</Text>
            </View>
          </View>

          <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, styles.statusBadgeApproved]}>
                <Text style={styles.statusText}>New Module</Text>
              </View>
            </View>

            <Text style={[styles.moduleTitle, { marginBottom: 16 }]}>Create Module</Text>

            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Title *</Text>
              <TextInput
                style={styles.editInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Module title"
                placeholderTextColor="#6b8693"
                autoFocus
              />

              <Text style={styles.editLabel}>Description</Text>
              <TextInput
                style={[styles.editInput, { minHeight: 80, textAlignVertical: 'top' }]}
                value={createDescription}
                onChangeText={setCreateDescription}
                placeholder="Module description"
                placeholderTextColor="#6b8693"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.editLabel}>Category *</Text>
              <TouchableOpacity
                style={styles.trainerPickerButton}
                onPress={() => setShowCategoryPicker(true)}
              >
                <Text style={styles.trainerPickerText}>
                  {createCategory || 'Select category'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#9bb8c7" />
              </TouchableOpacity>

              <Modal
                visible={showCategoryPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowCategoryPicker(false)}
              >
                <TouchableOpacity style={styles.trainerPickerOverlay} activeOpacity={1} onPress={() => setShowCategoryPicker(false)}>
                  <View style={styles.trainerPickerModal}>
                    <Text style={styles.trainerPickerTitle}>Select Category</Text>
                    <ScrollView style={styles.trainerPickerList}>
                      {categories.length === 0 ? (
                        <Text style={styles.trainerPickerEmpty}>No categories found</Text>
                      ) : (
                        categories.map((cat) => {
                          const isSelected = cat === createCategory;
                          return (
                            <TouchableOpacity
                              key={cat}
                              style={[styles.trainerPickerItem, isSelected && styles.trainerPickerItemActive]}
                              onPress={() => { setCreateCategory(cat); setShowCategoryPicker(false); }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.trainerPickerItemText, isSelected && styles.trainerPickerItemTextActive]}>{cat}</Text>
                              </View>
                              {isSelected && <Ionicons name="checkmark-circle" size={20} color="#38a6de" />}
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>
                    <TouchableOpacity style={styles.trainerPickerCloseButton} onPress={() => setShowCategoryPicker(false)}>
                      <Text style={styles.trainerPickerCloseText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>

              <Text style={styles.editLabel}>Difficulty</Text>
              <View style={styles.difficultyRow}>
                {(['basic', 'intermediate', 'advanced'] as const).map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.difficultyChip, editDifficulty === level && styles.difficultyChipActive]}
                    onPress={() => setEditDifficulty(level)}
                  >
                    <Text style={[styles.difficultyChipText, editDifficulty === level && styles.difficultyChipTextActive]}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.editLabel}>Trainer *</Text>
              <TouchableOpacity
                style={styles.trainerPickerButton}
                onPress={() => setShowTrainerPicker(true)}
              >
                <Text style={styles.trainerPickerText}>
                  {editTrainerName || 'Select trainer'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#9bb8c7" />
              </TouchableOpacity>

              <Modal
                visible={showTrainerPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowTrainerPicker(false)}
              >
                <TouchableOpacity style={styles.trainerPickerOverlay} activeOpacity={1} onPress={() => setShowTrainerPicker(false)}>
                  <View style={styles.trainerPickerModal}>
                    <Text style={styles.trainerPickerTitle}>Select Trainer</Text>
                    <ScrollView style={styles.trainerPickerList}>
                      {approvedTrainers.length === 0 ? (
                        <Text style={styles.trainerPickerEmpty}>No approved trainers found</Text>
                      ) : (
                        approvedTrainers.map((trainer) => {
                          const name = trainer.username || `${trainer.firstName} ${trainer.lastName}`.trim();
                          const isSelected = trainer.uid === editTrainerId;
                          return (
                            <TouchableOpacity
                              key={trainer.uid}
                              style={[styles.trainerPickerItem, isSelected && styles.trainerPickerItemActive]}
                              onPress={() => { setEditTrainerId(trainer.uid); setEditTrainerName(name); setShowTrainerPicker(false); }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.trainerPickerItemText, isSelected && styles.trainerPickerItemTextActive]}>{name}</Text>
                                <Text style={styles.trainerPickerItemEmail}>{trainer.email}</Text>
                              </View>
                              {isSelected && <Ionicons name="checkmark-circle" size={20} color="#38a6de" />}
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>
                    <TouchableOpacity style={styles.trainerPickerCloseButton} onPress={() => setShowTrainerPicker(false)}>
                      <Text style={styles.trainerPickerCloseText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>

              <Text style={styles.editLabel}>Thumbnail (image or GIF)</Text>
              {editThumbnailUrl ? (
                <View style={styles.editThumbnailPreviewWrap}>
                  <Image source={{ uri: editThumbnailUrl }} style={styles.editThumbnailPreview} resizeMode="contain" />
                </View>
              ) : null}
              {Platform.OS === 'web' ? (
                <input ref={thumbnailWebInputRef} type="file" accept="image/*,.gif" style={{ display: 'none' }} onChange={handleWebThumbnailPick} />
              ) : null}
              <View style={styles.thumbnailButtonsRow}>
                <TouchableOpacity style={styles.thumbnailButton} onPress={handlePickThumbnail} disabled={processing}>
                  <Ionicons name="images-outline" size={18} color="#38a6de" />
                  <Text style={styles.thumbnailButtonText}>Choose from gallery</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.editLabel}>Technique video</Text>
              {editTechniqueVideoUrl ? (
                <Text style={styles.editTechniqueVideoUrl} numberOfLines={2}>{editTechniqueVideoUrl}</Text>
              ) : null}
              <View style={styles.thumbnailButtonsRow}>
                <TouchableOpacity style={styles.thumbnailButton} onPress={handlePickTechniqueVideo} disabled={processing}>
                  <Ionicons name="videocam-outline" size={18} color="#38a6de" />
                  <Text style={styles.thumbnailButtonText}>{editTechniqueVideoUrl ? 'Replace video file' : 'Upload video file'}</Text>
                </TouchableOpacity>
              </View>
              {Platform.OS === 'web' ? (
                <input ref={techniqueVideoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleWebTechniqueVideoChange} />
              ) : null}

              <Text style={styles.editLabel}>Intensity (1 = easy, 5 = very hard)</Text>
              <View style={styles.intensityEditRow}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.intensityDotEdit, level <= editIntensity && styles.intensityDotEditActive]}
                    onPress={() => setEditIntensity(level)}
                  />
                ))}
                <Text style={styles.intensityEditText}>{editIntensity}/5</Text>
              </View>

              <Text style={styles.editLabel}>Space Requirements</Text>
              <View style={styles.tagsRow}>
                {['Stationary', 'Arm/Leg Span (Medium Space)', 'Mobility (Large Space)'].map((req) => (
                  <TouchableOpacity
                    key={req}
                    style={[styles.tag, editSpaceRequirements.includes(req) && styles.tagActive]}
                    onPress={() => toggleEditSpaceRequirement(req)}
                  >
                    <Text style={[styles.tagText, editSpaceRequirements.includes(req) && styles.tagTextActive]}>{req}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.editLabel}>Physical Demand Tags</Text>
              <View style={styles.tagsRow}>
                {['Flexibility', 'Strength', 'Endurance', 'Balance', 'Coordination', 'Speed', 'Agility', 'Power'].map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tag, editPhysicalDemandTags.includes(tag) && styles.tagActive]}
                    onPress={() => toggleEditPhysicalDemandTag(tag)}
                  >
                    <Text style={[styles.tagText, editPhysicalDemandTags.includes(tag) && styles.tagTextActive]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveEditsButton, processing && styles.saveEditsButtonDisabled]}
                onPress={handleCreateModule}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveEditsButtonText}>Create Module</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {showMenu && (
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); handleLogout(); }}>
                <Image source={require('../../assets/images/logouticon.png')} style={styles.menuIcon} />
                <Text style={styles.menuText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        <Toast message={toastMessage} visible={toastVisible} onHide={hideToast} duration={3000} />
      </SafeAreaView>
    );
  }

  const isPending = module.status === 'pending review';
  const isApproved = module.status === 'approved';
  const isRejected = module.status === 'rejected';

  const displayTechniqueVideoUrl =
    isApproved && isEditing ? editTechniqueVideoUrl.trim() : (module.techniqueVideoUrl || '');
  const displayTechniqueVideoLink = module.techniqueVideoLink || '';
  const displayReferenceGuideUrl =
    isApproved && isEditing ? editReferenceGuideUrl.trim() : (module.referenceGuideUrl || '');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Left Navigation Bar */}
        <View style={styles.leftNavBar}>
          <TouchableOpacity
            style={styles.navMenuButton}
            onPress={() => setShowMenu(true)}
          >
            <Ionicons name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.navBottomIcons}>
            <View style={styles.navIconsBox}>
              <TouchableOpacity
                onPress={() => router.push('/(admin)/adminManaging')}
              >
                <Image
                  source={require('../../assets/images/adminmanageicon.png')}
                  style={styles.navIconImage}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/(admin)/adminDashboard')}>
                <Image
                  source={require('../../assets/images/homeicon.png')}
                  style={styles.navIconImage}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButtonHeader} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Image
              source={require('../../assets/images/defendudashboardlogo.png')}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
            <Text style={styles.headerAdminText}>Admin</Text>
          </View>
        </View>

        {/* Main Content */}
        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
          {/* Module Status Badge */}
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                isPending && styles.statusBadgePending,
                isApproved && styles.statusBadgeApproved,
                isRejected && styles.statusBadgeRejected,
              ]}
            >
              <Text style={styles.statusText}>
                {module.status === 'pending review' ? 'Pending Review' : 
                 module.status === 'approved' ? 'Approved' : 
                 module.status === 'rejected' ? 'Rejected' :
                 module.status === 'disabled' ? 'Disabled' : 'Draft'}
              </Text>
            </View>
          </View>

          {/* Module Title */}
          <View style={styles.titleRow}>
            <Text style={styles.moduleTitle}>{module.moduleTitle}</Text>
            {isApproved && (
              <TouchableOpacity
                style={styles.editToggleButton}
                onPress={() => setIsEditing((prev) => !prev)}
              >
                <Ionicons name="create-outline" size={18} color="#38a6de" />
                <Text style={styles.editToggleText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {isApproved && isEditing && (
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Title</Text>
              <TextInput
                style={styles.editInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Module title"
                placeholderTextColor="#6b8693"
              />

              <Text style={styles.editLabel}>Description</Text>
              <TextInput
                style={[styles.editInput, { minHeight: 80, textAlignVertical: 'top' }]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Module description"
                placeholderTextColor="#6b8693"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.editLabel}>Introduction (text)</Text>
              <TextInput
                style={[styles.editInput, { minHeight: 80, textAlignVertical: 'top' }]}
                value={editIntroduction}
                onChangeText={setEditIntroduction}
                placeholder="Introduction text"
                placeholderTextColor="#6b8693"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.editLabel}>Category</Text>
              <TouchableOpacity
                style={styles.trainerPickerButton}
                onPress={() => setShowEditCategoryPicker(true)}
              >
                <Text style={styles.trainerPickerText}>
                  {editCategory || 'Select category'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#9bb8c7" />
              </TouchableOpacity>

              <Modal
                visible={showEditCategoryPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowEditCategoryPicker(false)}
              >
                <TouchableOpacity style={styles.trainerPickerOverlay} activeOpacity={1} onPress={() => setShowEditCategoryPicker(false)}>
                  <View style={styles.trainerPickerModal}>
                    <Text style={styles.trainerPickerTitle}>Select Category</Text>
                    <ScrollView style={styles.trainerPickerList}>
                      {categories.length === 0 ? (
                        <Text style={styles.trainerPickerEmpty}>No categories found</Text>
                      ) : (
                        categories.map((cat) => {
                          const isSelected = cat === editCategory;
                          return (
                            <TouchableOpacity
                              key={cat}
                              style={[styles.trainerPickerItem, isSelected && styles.trainerPickerItemActive]}
                              onPress={() => { setEditCategory(cat); setShowEditCategoryPicker(false); }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.trainerPickerItemText, isSelected && styles.trainerPickerItemTextActive]}>{cat}</Text>
                              </View>
                              {isSelected && <Ionicons name="checkmark-circle" size={20} color="#38a6de" />}
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>
                    <TouchableOpacity style={styles.trainerPickerCloseButton} onPress={() => setShowEditCategoryPicker(false)}>
                      <Text style={styles.trainerPickerCloseText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>

              <Text style={styles.editLabel}>Difficulty</Text>
              <View style={styles.difficultyRow}>
                {(['basic', 'intermediate', 'advanced'] as const).map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.difficultyChip,
                      editDifficulty === level && styles.difficultyChipActive,
                    ]}
                    onPress={() => setEditDifficulty(level)}
                  >
                    <Text
                      style={[
                        styles.difficultyChipText,
                        editDifficulty === level && styles.difficultyChipTextActive,
                      ]}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.editLabel}>Trainer</Text>
              <TouchableOpacity
                style={styles.trainerPickerButton}
                onPress={() => setShowTrainerPicker(true)}
              >
                <Text style={styles.trainerPickerText}>
                  {editTrainerName || 'Select trainer'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#9bb8c7" />
              </TouchableOpacity>

              <Modal
                visible={showTrainerPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowTrainerPicker(false)}
              >
                <TouchableOpacity
                  style={styles.trainerPickerOverlay}
                  activeOpacity={1}
                  onPress={() => setShowTrainerPicker(false)}
                >
                  <View style={styles.trainerPickerModal}>
                    <Text style={styles.trainerPickerTitle}>Select Trainer</Text>
                    <ScrollView style={styles.trainerPickerList}>
                      {approvedTrainers.length === 0 ? (
                        <Text style={styles.trainerPickerEmpty}>No approved trainers found</Text>
                      ) : (
                        approvedTrainers.map((trainer) => {
                          const name = trainer.username || `${trainer.firstName} ${trainer.lastName}`.trim();
                          const isSelected = trainer.uid === editTrainerId;
                          return (
                            <TouchableOpacity
                              key={trainer.uid}
                              style={[
                                styles.trainerPickerItem,
                                isSelected && styles.trainerPickerItemActive,
                              ]}
                              onPress={() => {
                                setEditTrainerId(trainer.uid);
                                setEditTrainerName(name);
                                setShowTrainerPicker(false);
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[
                                    styles.trainerPickerItemText,
                                    isSelected && styles.trainerPickerItemTextActive,
                                  ]}
                                >
                                  {name}
                                </Text>
                                <Text style={styles.trainerPickerItemEmail}>
                                  {trainer.email}
                                </Text>
                              </View>
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={20} color="#38a6de" />
                              )}
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>
                    <TouchableOpacity
                      style={styles.trainerPickerCloseButton}
                      onPress={() => setShowTrainerPicker(false)}
                    >
                      <Text style={styles.trainerPickerCloseText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>

              <Text style={styles.editLabel}>Thumbnail (image or GIF)</Text>
              <Text style={styles.editHint}>Static images and animated GIFs are uploaded as images to Cloudinary.</Text>
              {editThumbnailUrl ? (
                <View style={styles.editThumbnailPreviewWrap}>
                  <Image
                    source={{ uri: editThumbnailUrl }}
                    style={styles.editThumbnailPreview}
                    resizeMode="contain"
                  />
                </View>
              ) : null}
              {Platform.OS === 'web' ? (
                <input
                  ref={thumbnailWebInputRef}
                  type="file"
                  accept="image/*,.gif"
                  style={{ display: 'none' }}
                  onChange={handleWebThumbnailPick}
                />
              ) : null}
              <View style={styles.thumbnailButtonsRow}>
                <TouchableOpacity
                  style={styles.thumbnailButton}
                  onPress={handlePickThumbnail}
                  disabled={processing}
                >
                  <Ionicons name="images-outline" size={18} color="#38a6de" />
                  <Text style={styles.thumbnailButtonText}>Choose from gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.thumbnailButton}
                  onPress={handleCaptureThumbnail}
                  disabled={processing || Platform.OS === 'web'}
                >
                  <Ionicons name="camera-outline" size={18} color="#38a6de" />
                  <Text style={styles.thumbnailButtonText}>Take photo</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.editLabel}>Reference guide (GIF or image)</Text>
              <Text style={styles.editHint}>One picture or GIF for user guidance only.</Text>
              {editReferenceGuideUrl ? (
                <Image
                  source={{ uri: editReferenceGuideUrl }}
                  style={styles.editReferenceGuidePreview}
                  resizeMode="contain"
                />
              ) : null}
              <TouchableOpacity
                style={styles.referenceGuideButton}
                onPress={handlePickReferenceGuide}
                disabled={processing}
              >
                <Ionicons name="image-outline" size={18} color="#38a6de" />
                <Text style={styles.thumbnailButtonText}>
                  {editReferenceGuideUrl ? 'Replace reference guide' : 'Choose from gallery or upload'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.editLabel}>Technique video</Text>
              <Text style={styles.editHint}>
                Replace the uploaded technique video file. Pose-estimation command and developer email use the URL after you save (while editing, the ticket preview uses your unsaved upload when set).
              </Text>
              {editTechniqueVideoUrl ? (
                <Text style={styles.editTechniqueVideoUrl} numberOfLines={2}>
                  {editTechniqueVideoUrl}
                </Text>
              ) : null}
              <View style={styles.thumbnailButtonsRow}>
                <TouchableOpacity
                  style={styles.thumbnailButton}
                  onPress={handlePickTechniqueVideo}
                  disabled={processing}
                >
                  <Ionicons name="videocam-outline" size={18} color="#38a6de" />
                  <Text style={styles.thumbnailButtonText}>
                    {editTechniqueVideoUrl ? 'Replace video file' : 'Upload video file'}
                  </Text>
                </TouchableOpacity>
                {editTechniqueVideoUrl ? (
                  <TouchableOpacity
                    style={styles.thumbnailButton}
                    onPress={() => {
                      setEditTechniqueVideoUrl('');
                      showToast('Uploaded video cleared (save to apply)');
                    }}
                    disabled={processing}
                  >
                    <Ionicons name="trash-outline" size={18} color="#e57373" />
                    <Text style={[styles.thumbnailButtonText, { color: '#e57373' }]}>Clear upload</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {Platform.OS === 'web' ? (
                <input
                  ref={techniqueVideoInputRef}
                  type="file"
                  accept="video/*"
                  style={{ display: 'none' }}
                  onChange={handleWebTechniqueVideoChange}
                />
              ) : null}

              <Text style={styles.editLabel}>Intensity (1 = easy, 5 = very hard)</Text>
              <View style={styles.intensityEditRow}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.intensityDotEdit,
                      level <= editIntensity && styles.intensityDotEditActive,
                    ]}
                    onPress={() => setEditIntensity(level)}
                  />
                ))}
                <Text style={styles.intensityEditText}>{editIntensity}/5</Text>
              </View>

              <Text style={styles.editLabel}>Space Requirements</Text>
              <View style={styles.tagsRow}>
                {['Stationary', 'Arm/Leg Span (Medium Space)', 'Mobility (Large Space)'].map(
                  (req) => (
                    <TouchableOpacity
                      key={req}
                      style={[
                        styles.tag,
                        editSpaceRequirements.includes(req) && styles.tagActive,
                      ]}
                      onPress={() => toggleEditSpaceRequirement(req)}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          editSpaceRequirements.includes(req) && styles.tagTextActive,
                        ]}
                      >
                        {req}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <Text style={styles.editLabel}>Physical Demand Tags</Text>
              <View style={styles.tagsRow}>
                {['Flexibility', 'Strength', 'Endurance', 'Balance', 'Coordination', 'Speed', 'Agility', 'Power'].map(
                  (tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tag,
                        editPhysicalDemandTags.includes(tag) && styles.tagActive,
                      ]}
                      onPress={() => toggleEditPhysicalDemandTag(tag)}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          editPhysicalDemandTags.includes(tag) && styles.tagTextActive,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <TouchableOpacity
                style={[styles.saveEditsButton, processing && styles.saveEditsButtonDisabled]}
                onPress={handleSaveEdits}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveEditsButtonText}>Save changes</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Basic Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reference Code:</Text>
              <Text style={styles.infoValue}>{getReferenceCode(module.moduleId)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Module ID:</Text>
              <Text style={styles.infoValue}>{module.moduleId}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Category:</Text>
              <Text style={styles.infoValue}>{module.category}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Difficulty:</Text>
              <Text style={styles.infoValue}>
                {module.difficultyLevel
                  ? module.difficultyLevel.charAt(0).toUpperCase() + module.difficultyLevel.slice(1)
                  : 'Basic'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trainer:</Text>
              <Text style={styles.infoValue}>{module.trainerName || 'N/A'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date Created:</Text>
              <Text style={styles.infoValue}>{formatDate(module.createdAt)}</Text>
            </View>

            {module.submittedAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date Submitted:</Text>
                <Text style={styles.infoValue}>{formatDate(module.submittedAt)}</Text>
              </View>
            )}

            {module.reviewedAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date Reviewed:</Text>
                <Text style={styles.infoValue}>{formatDate(module.reviewedAt)}</Text>
              </View>
            )}
          </View>

          {/* Description Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{module.description}</Text>
          </View>

          {/* Introduction Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Introduction</Text>
            {module.introductionType === 'text' ? (
              <Text style={styles.descriptionText}>
                {module.introduction || 'No introduction provided'}
              </Text>
            ) : (
              <View>
                {module.introductionVideoUrl ? (
                  <TouchableOpacity
                    style={styles.videoButton}
                    onPress={() => openVideoUrl(module.introductionVideoUrl!, true)}
                  >
                    <Ionicons name="play-circle" size={24} color="#38a6de" />
                    <Text style={styles.videoButtonText}>View Introduction Video</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.descriptionText}>No introduction video provided</Text>
                )}
              </View>
            )}
          </View>

          {/* Technique Video Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technique Video</Text>
            {displayTechniqueVideoUrl ? (
              <TouchableOpacity
                style={styles.videoButton}
                onPress={() => openVideoUrl(displayTechniqueVideoUrl, true)}
              >
                <Ionicons name="play-circle" size={24} color="#38a6de" />
                <Text style={styles.videoButtonText}>View Technique Video</Text>
              </TouchableOpacity>
            ) : displayTechniqueVideoLink ? (
              <TouchableOpacity
                style={styles.videoButton}
                onPress={() => openVideoUrl(displayTechniqueVideoLink)}
              >
                <Ionicons name="play-circle" size={24} color="#38a6de" />
                <Text style={styles.videoButtonText}>View External Video Link</Text>
              </TouchableOpacity>
            ) : !isEditing && module.techniqueVideoUrl2 ? (
              <TouchableOpacity
                style={styles.videoButton}
                onPress={() => openVideoUrl(module.techniqueVideoUrl2!, true)}
              >
                <Ionicons name="play-circle" size={24} color="#38a6de" />
                <Text style={styles.videoButtonText}>View Technique Video</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.descriptionText}>No video provided</Text>
            )}
            {module.videoDuration && (
              <Text style={styles.durationText}>Duration: {formatDuration(module.videoDuration)}</Text>
            )}
            {techniqueVideoForExtract ? (
              <TouchableOpacity
                style={styles.extractDataButton}
                onPress={() => setShowExtractModal(true)}
              >
                <Ionicons name="mail-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.extractDataButtonText}>Request pose estimation (dev ticket)</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.mediaSubsectionTitle}>Reference video guide</Text>
            {displayReferenceGuideUrl ? (
              <>
                <View style={styles.referenceGuideViewWrap}>
                  <Image
                    source={{ uri: displayReferenceGuideUrl }}
                    style={styles.referenceGuideViewImage}
                    resizeMode="contain"
                  />
                </View>
                <TouchableOpacity
                  style={styles.videoButton}
                  onPress={() =>
                    Linking.openURL(displayReferenceGuideUrl).catch((err) => {
                      console.error('Failed to open URL:', err);
                      showToast('Failed to open reference guide');
                    })
                  }
                >
                  <Ionicons name="images-outline" size={24} color="#38a6de" />
                  <Text style={styles.videoButtonText}>Open reference guide</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.descriptionText}>No reference guide provided</Text>
            )}
          </View>

          {/* Thumbnail Section */}
          {module.thumbnailUrl && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thumbnail</Text>
              <View style={styles.thumbnailSectionWrap}>
                <Image
                  source={{ uri: module.thumbnailUrl }}
                  style={styles.thumbnailImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          )}

          {/* AI Training Specifications Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Training Specifications</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Intensity Level:</Text>
              <View style={styles.intensityContainer}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <View
                    key={level}
                    style={[
                      styles.intensityDot,
                      level <= module.intensityLevel && styles.intensityDotActive,
                    ]}
                  />
                ))}
                <Text style={styles.intensityText}>{module.intensityLevel}/5</Text>
              </View>
            </View>

            {module.spaceRequirements && module.spaceRequirements.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Space Requirements:</Text>
                <View style={styles.tagsContainer}>
                  {module.spaceRequirements.map((req, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{req}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {module.physicalDemandTags && module.physicalDemandTags.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Physical Demand Tags:</Text>
                <View style={styles.tagsContainer}>
                  {module.physicalDemandTags.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Certification Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certification</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trainer Certified:</Text>
              <Text style={styles.infoValue}>
                {module.certificationChecked ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>

          {/* Rejection Reason (if rejected) */}
          {isRejected && module.rejectionReason && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rejection Reason</Text>
              <Text style={styles.rejectionReasonText}>{module.rejectionReason}</Text>
            </View>
          )}

          {/* Action Buttons (only show for pending modules) */}
          {isPending && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={handleRejectClick}
                disabled={processing}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={handleApprove}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.approveButtonText}>Accept</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Delete module (all statuses) */}
          <TouchableOpacity
            style={styles.deleteModuleButton}
            onPress={openDeleteModal}
            disabled={processing}
          >
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            <Text style={styles.deleteModuleButtonText}>Delete module</Text>
          </TouchableOpacity>

          {/* Spacing at bottom */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>

      {/* Pose estimation — email developer ticket (Mailjet) */}
      <Modal
        visible={showExtractModal}
        transparent
        animationType="slide"
        onRequestClose={() => !poseTicketSubmitting && setShowExtractModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Pose estimation — developer ticket</Text>
            <Text style={styles.modalSubtitle}>
              Send a formal request to the development team (via Mailjet) to add pose estimation for this module. The email includes the module reference, title, description, created and submitted dates, technique video URL, and the local extract command so they can start immediately.
            </Text>
            <Text style={styles.extractCommandLabel}>Video URL:</Text>
            <Text style={styles.extractUrlText} selectable numberOfLines={3}>
              {techniqueVideoForExtract}
            </Text>
            <Text style={styles.extractCommandLabel}>Command (in pose-data-extractor folder):</Text>
            <Text style={styles.extractCommandText} selectable>
              {extractCommand}
            </Text>
            <Text style={styles.extractCommandLabel}>Output file (CSV):</Text>
            <Text style={styles.extractUrlText} selectable numberOfLines={1}>
              {extractOutputPath}
            </Text>
            <Text style={styles.extractKeysText}>
              Local tool keys: U=jab, I=hook, O=uppercut, G=good_rep, P=positive, N=bad, Space=pause, Q=quit & save
            </Text>
            <TouchableOpacity
              style={[styles.shareExtractButton, poseTicketSubmitting && { opacity: 0.7 }]}
              onPress={handleSubmitPoseEstimationTicket}
              disabled={poseTicketSubmitting || !extractCommand}
            >
              {poseTicketSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="send-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.shareExtractButtonText}>
                {poseTicketSubmitting ? 'Sending…' : 'Email ticket to developer'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareExtractSecondary}
              onPress={handleShareExtractCommand}
              disabled={poseTicketSubmitting}
            >
              <Ionicons name="share-outline" size={20} color="#38a6de" style={{ marginRight: 8 }} />
              <Text style={styles.shareExtractSecondaryText}>Share URL & command</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowExtractModal(false)}
              disabled={poseTicketSubmitting}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Module Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="slide"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Delete Module</Text>
            <Text style={styles.modalSubtitle}>
              Remove "{module?.moduleTitle}"? The trainer will receive a message with your reason.
            </Text>
            <Text style={styles.modalSubtitle}>Reason for deletion (select or type):</Text>
            <ScrollView style={styles.reasonsList}>
              {deletionReasons.map((reason, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.reasonOption,
                    deletionReason === reason && styles.reasonOptionSelected,
                  ]}
                  onPress={() => setDeletionReason(reason)}
                >
                  <View style={styles.radioButton}>
                    {deletionReason === reason && <View style={styles.radioButtonInner} />}
                  </View>
                  <Text style={styles.reasonText}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={styles.customReasonInput}
              placeholder="Or type a custom reason..."
              placeholderTextColor="#6b8693"
              value={customDeletionReason}
              onChangeText={setCustomDeletionReason}
              multiline
              numberOfLines={3}
            />
            {(deletionReason || customDeletionReason.trim()) && (
              <>
                <Text style={styles.modalSubtitle}>Reason for deletion:</Text>
                <Text style={styles.selectedReasonText}>
                  {customDeletionReason.trim() || deletionReason}
                </Text>
              </>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeDeleteModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmDeleteButton]}
                onPress={handleDeleteModule}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Delete & notify trainer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rejection Modal */}
      <Modal
        visible={showRejectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Reject Module</Text>
            <Text style={styles.modalSubtitle}>Please select a reason for rejection:</Text>

            <ScrollView style={styles.reasonsList}>
              {rejectionReasons.map((reason, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.reasonOption,
                    rejectionReason === reason && styles.reasonOptionSelected,
                  ]}
                  onPress={() => setRejectionReason(reason)}
                >
                  <View style={styles.radioButton}>
                    {rejectionReason === reason && <View style={styles.radioButtonInner} />}
                  </View>
                  <Text style={styles.reasonText}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {rejectionReason === 'Other (specify below)' && (
              <TextInput
                style={styles.customReasonInput}
                placeholder="Please specify the reason..."
                placeholderTextColor="#6b8693"
                value={customRejectionReason}
                onChangeText={setCustomRejectionReason}
                multiline
                numberOfLines={4}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setCustomRejectionReason('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmRejectButton]}
                onPress={handleReject}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmRejectButtonText}>Confirm Rejection</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pop-up Menu */}
      {showMenu && (
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); handleLogout(); }}>
              <Image
                source={require('../../assets/images/logouticon.png')}
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

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
    backgroundColor: '#0b1625',
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
    marginBottom: 20,
  },
  leftNavBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#000E1C',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 30,
    zIndex: 10,
  },
  navMenuButton: {
    padding: 12,
  },
  navBottomIcons: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  navIconsBox: {
    backgroundColor: 'rgba(56, 166, 222, 0.1)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 166, 222, 0.2)',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
  },
  navIconImage: {
    width: 28,
    height: 28,
    tintColor: '#38a6de',
    resizeMode: 'contain',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 100,
    paddingRight: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  backButtonHeader: {
    marginRight: 16,
  },
  headerContent: {
    flexDirection: 'column',
  },
  headerLogoImage: {
    width: 180,
    height: 60,
    marginBottom: 4,
  },
  headerAdminText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    paddingLeft: 100,
    paddingRight: 20,
    paddingTop: 20,
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  statusBadgePending: {
    backgroundColor: '#ffa726',
  },
  statusBadgeApproved: {
    backgroundColor: '#66bb6a',
  },
  statusBadgeRejected: {
    backgroundColor: '#ef5350',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  moduleTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  section: {
    marginBottom: 32,
  },
  editToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#38a6de',
    backgroundColor: 'rgba(56, 166, 222, 0.15)',
  },
  editToggleText: {
    color: '#38a6de',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  editSection: {
    marginBottom: 28,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#0b1d2d',
    borderWidth: 1,
    borderColor: 'rgba(56, 166, 222, 0.3)',
  },
  editLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 8,
  },
  editInput: {
    backgroundColor: 'rgba(5, 18, 32, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1c3850',
  },
  difficultyRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 8,
  },
  difficultyChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1c3850',
    backgroundColor: '#0b1625',
  },
  difficultyChipActive: {
    borderColor: '#38a6de',
    backgroundColor: 'rgba(56, 166, 222, 0.25)',
  },
  difficultyChipText: {
    color: '#9eb9c9',
    fontSize: 13,
    fontWeight: '500',
  },
  difficultyChipTextActive: {
    color: '#e6f6ff',
  },
  trainerPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2a4a5c',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#16303d',
    marginBottom: 4,
  },
  trainerPickerText: {
    color: '#cfe6f0',
    fontSize: 14,
  },
  trainerPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trainerPickerModal: {
    backgroundColor: '#162a36',
    borderRadius: 14,
    width: '90%',
    maxWidth: 420,
    maxHeight: '70%',
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e3d4d',
  },
  trainerPickerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  trainerPickerList: {
    maxHeight: 320,
  },
  trainerPickerEmpty: {
    color: '#6b8693',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  trainerPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  trainerPickerItemActive: {
    backgroundColor: 'rgba(56,166,222,0.15)',
  },
  trainerPickerItemText: {
    color: '#cfe6f0',
    fontSize: 14,
    fontWeight: '600',
  },
  trainerPickerItemTextActive: {
    color: '#38a6de',
  },
  trainerPickerItemEmail: {
    color: '#6b8693',
    fontSize: 12,
    marginTop: 2,
  },
  trainerPickerCloseButton: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a4a5c',
  },
  trainerPickerCloseText: {
    color: '#9bb8c7',
    fontSize: 14,
    fontWeight: '600',
  },
  saveEditsButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38a6de',
  },
  saveEditsButtonDisabled: {
    opacity: 0.7,
  },
  saveEditsButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  editThumbnailPreviewWrap: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#1a2332',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editThumbnailPreview: {
    width: '100%',
    height: '100%',
  },
  thumbnailButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  thumbnailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#38a6de',
    backgroundColor: 'rgba(56, 166, 222, 0.12)',
  },
  thumbnailButtonText: {
    color: '#38a6de',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  editHint: {
    color: '#6b8693',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 6,
  },
  editTechniqueVideoUrl: {
    color: '#8fa8b8',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 6,
  },
  editReferenceGuidePreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#1a2332',
  },
  referenceGuideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#38a6de',
    backgroundColor: 'rgba(56, 166, 222, 0.12)',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  intensityEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  intensityDotEdit: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1a2332',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#38a6de',
  },
  intensityDotEditActive: {
    backgroundColor: '#38a6de',
  },
  intensityEditText: {
    color: '#38a6de',
    fontSize: 14,
    marginLeft: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#38a6de',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  mediaSubsectionTitle: {
    color: '#38a6de',
    fontSize: 17,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  referenceGuideViewWrap: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: '#1a2332',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  referenceGuideViewImage: {
    width: '100%',
    height: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  infoLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
    minWidth: 150,
  },
  infoValue: {
    color: '#38a6de',
    fontSize: 16,
    flex: 1,
  },
  descriptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 166, 222, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  videoButtonText: {
    color: '#38a6de',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
  durationText: {
    color: '#6b8693',
    fontSize: 14,
    marginTop: 4,
  },
  thumbnailSectionWrap: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    backgroundColor: '#1a2332',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  intensityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  intensityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1a2332',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#38a6de',
  },
  intensityDotActive: {
    backgroundColor: '#38a6de',
  },
  intensityText: {
    color: '#38a6de',
    fontSize: 16,
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(56, 166, 222, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 4,
  },
  tagText: {
    color: '#38a6de',
    fontSize: 14,
  },
  tagActive: {
    backgroundColor: 'rgba(56, 166, 222, 0.35)',
  },
  tagTextActive: {
    color: '#e6f6ff',
    fontWeight: '600',
  },
  rejectionReasonText: {
    color: '#ff6b6b',
    fontSize: 16,
    lineHeight: 24,
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    marginBottom: 20,
    gap: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#ef5350',
  },
  approveButton: {
    backgroundColor: '#66bb6a',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  deleteModuleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#c62828',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
  },
  deleteModuleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  extractDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#0a3645',
    borderWidth: 1,
    borderColor: '#38a6de',
  },
  extractDataButtonText: {
    color: '#38a6de',
    fontSize: 15,
    fontWeight: '600',
  },
  extractCommandLabel: {
    color: '#38a6de',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  extractUrlText: {
    color: '#FFFFFF',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  extractCommandText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  extractKeysText: {
    color: '#6b8693',
    fontSize: 12,
    marginBottom: 12,
  },
  shareExtractButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38a6de',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  shareExtractButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  shareExtractSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#38a6de',
  },
  shareExtractSecondaryText: {
    color: '#38a6de',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    backgroundColor: '#c62828',
  },
  confirmDeleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedReasonText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 16,
    padding: 8,
    backgroundColor: 'rgba(56, 166, 222, 0.15)',
    borderRadius: 8,
  },
  backButton: {
    backgroundColor: '#38a6de',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1a2332',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#6b8693',
    fontSize: 16,
    marginBottom: 20,
  },
  reasonsList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(56, 166, 222, 0.1)',
  },
  reasonOptionSelected: {
    backgroundColor: 'rgba(56, 166, 222, 0.3)',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#38a6de',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38a6de',
  },
  reasonText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  customReasonInput: {
    backgroundColor: 'rgba(107, 134, 147, 0.2)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(107, 134, 147, 0.3)',
  },
  confirmRejectButton: {
    backgroundColor: '#ef5350',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmRejectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    top: 60,
    left: 20,
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
    resizeMode: 'contain',
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
