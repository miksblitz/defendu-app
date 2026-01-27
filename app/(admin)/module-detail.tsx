import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthController } from '../controllers/AuthController';
import { Module } from '../models/Module';

export default function ModuleDetailPage() {
  const router = useRouter();
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (moduleId) {
      loadModule();
    }
  }, [moduleId]);

  const loadModule = async () => {
    try {
      setLoading(true);
      if (!moduleId) {
        throw new Error('Module ID is required');
      }
      const moduleData = await AuthController.getModuleById(moduleId);
      if (!moduleData) {
        alert('Module not found');
        router.back();
        return;
      }
      setModule(moduleData);
    } catch (error: any) {
      console.error('❌ Error loading module:', error);
      alert(`Failed to load module: ${error.message || 'Unknown error'}`);
      router.back();
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

  const handleApprove = async () => {
    if (!module || !moduleId) return;

    try {
      setProcessing(true);
      await AuthController.approveModule(moduleId);
      alert('Module approved successfully!');
      router.back();
    } catch (error: any) {
      console.error('Error approving module:', error);
      alert(`Failed to approve module: ${error.message || 'Unknown error'}`);
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
      alert('Please select or provide a rejection reason');
      return;
    }

    try {
      setProcessing(true);
      await AuthController.rejectModule(moduleId, finalReason);
      alert('Module rejected');
      setShowRejectModal(false);
      router.back();
    } catch (error: any) {
      console.error('Error rejecting module:', error);
      alert(`Failed to reject module: ${error.message || 'Unknown error'}`);
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

  const openVideoUrl = (url: string) => {
    Linking.openURL(url).catch((err) => {
      console.error('Failed to open URL:', err);
      alert('Failed to open video URL');
    });
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

  if (!module) {
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

  const isPending = module.status === 'pending review';
  const isApproved = module.status === 'approved';
  const isRejected = module.status === 'rejected';

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
                 module.status === 'rejected' ? 'Rejected' : 'Draft'}
              </Text>
            </View>
          </View>

          {/* Module Title */}
          <Text style={styles.moduleTitle}>{module.moduleTitle}</Text>

          {/* Basic Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reference Code:</Text>
              <Text style={styles.infoValue}>{getReferenceCode(module.moduleId)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Category:</Text>
              <Text style={styles.infoValue}>{module.category}</Text>
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
                    onPress={() => openVideoUrl(module.introductionVideoUrl!)}
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
            {module.techniqueVideoUrl ? (
              <TouchableOpacity
                style={styles.videoButton}
                onPress={() => openVideoUrl(module.techniqueVideoUrl!)}
              >
                <Ionicons name="play-circle" size={24} color="#38a6de" />
                <Text style={styles.videoButtonText}>View Technique Video</Text>
              </TouchableOpacity>
            ) : module.techniqueVideoLink ? (
              <TouchableOpacity
                style={styles.videoButton}
                onPress={() => openVideoUrl(module.techniqueVideoLink!)}
              >
                <Ionicons name="play-circle" size={24} color="#38a6de" />
                <Text style={styles.videoButtonText}>View External Video Link</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.descriptionText}>No video provided</Text>
            )}
            {module.videoDuration && (
              <Text style={styles.durationText}>Duration: {formatDuration(module.videoDuration)}</Text>
            )}
          </View>

          {/* Thumbnail Section */}
          {module.thumbnailUrl && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thumbnail</Text>
              <Image
                source={{ uri: module.thumbnailUrl }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
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

          {/* Spacing at bottom */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>

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
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#38a6de',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
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
  thumbnailImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#1a2332',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
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
