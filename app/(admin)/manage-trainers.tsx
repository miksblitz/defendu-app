import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import AdminTable, {
    AdminTableColumn,
    AdminTableSortState,
} from '../../components/admin/AdminTable';
import SearchInput from '../../components/admin/SearchInput';
import StatusBadge from '../../components/admin/StatusBadge';
import Toast from '../../components/Toast';
import { useLogout } from '../../hooks/useLogout';
import { useToast } from '../../hooks/useToast';
import { AuthController } from '../_controllers/AuthController';
import { TrainerApplication } from '../_models/TrainerApplication';

type ExtendedTrainerApplication = TrainerApplication & { 
  firstName?: string; 
  lastName?: string; 
  profilePicture?: string; 
  specialty?: string;
};

const PAGE_SIZE = 10;

export default function ManageTrainersPage() {
  const { width } = useWindowDimensions();
  const isCompact = width < 1100;
  const router = useRouter();
  const [applications, setApplications] = useState<ExtendedTrainerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<ExtendedTrainerApplication | null>(null);
  const [processingApplication, setProcessingApplication] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingUid, setRejectingUid] = useState<string | null>(null);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortState, setSortState] = useState<AdminTableSortState>({
    columnKey: 'submitted',
    direction: 'desc',
  });
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();
  const handleLogout = useLogout();
  
  // Animation refs
  const headerAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;

  // Rejection reasons
  const rejectionReasons = [
    'Inappropriate credentials',
    'Invalid credentials',
    'Lacking qualities of being a certified trainer',
    'Bad reputation',
    'Incomplete application',
    'Does not meet minimum requirements',
    'Other (specify in notes)',
  ];

  useEffect(() => {
    loadApplications();
  }, []);
  
  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(searchAnim, {
          toValue: 1,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  // Filter applications based on search query
  const filteredApplications = useMemo(() => {
    if (!searchQuery.trim()) {
      return applications;
    }
    const query = searchQuery.toLowerCase().trim();
    return applications.filter((app) => {
      const fullName = `${app.firstName} ${app.lastName}`.toLowerCase();
      const email = app.email.toLowerCase();
      const specialty = (app.specialty || '').toLowerCase();
      return fullName.includes(query) || email.includes(query) || specialty.includes(query);
    });
  }, [applications, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / PAGE_SIZE));
  const sortedApplications = useMemo(() => {
    const result = [...filteredApplications];
    const multiplier = sortState.direction === 'asc' ? 1 : -1;

    result.sort((a, b) => {
      if (sortState.columnKey === 'status') {
        return a.status.localeCompare(b.status) * multiplier;
      }
      return ((a.appliedDate?.getTime?.() ?? 0) - (b.appliedDate?.getTime?.() ?? 0)) * multiplier;
    });

    return result;
  }, [filteredApplications, sortState]);

  const sortedTotalPages = Math.max(1, Math.ceil(sortedApplications.length / PAGE_SIZE));
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedApplications.slice(start, start + PAGE_SIZE);
  }, [sortedApplications, currentPage]);

  const handleSortChange = (columnKey: string) => {
    setSortState((prev) => {
      if (prev.columnKey === columnKey) {
        return {
          columnKey,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        columnKey,
        direction: columnKey === 'submitted' ? 'desc' : 'asc',
      };
    });
    setCurrentPage(1);
  };

  const loadApplications = async () => {
    try {
      setLoading(true);
      console.log('🔵 Loading trainer applications...');
      const pendingTrainers = await AuthController.getPendingTrainerApplications();
      console.log('✅ Loaded pending trainers:', pendingTrainers.length);
      
      // Fetch TrainerApplication data for each pending trainer
      const trainerApplications: ExtendedTrainerApplication[] = [];
      
      for (const user of pendingTrainers) {
        const applicationData = await AuthController.getTrainerApplicationData(user.uid);
        if (applicationData) {
          // Merge User data with TrainerApplication data
          trainerApplications.push({
            ...applicationData,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePicture: user.profilePicture,
            specialty: applicationData.defenseStyles?.[0] || user.preferredTechnique?.[0] || 'N/A',
          });
        } else {
          // Fallback if TrainerApplication doesn't exist yet
          trainerApplications.push({
            uid: user.uid,
            fullLegalName: `${user.firstName} ${user.lastName}`,
            email: user.email,
            appliedDate: user.createdAt,
            status: 'awaiting review' as const,
            dateOfBirth: '',
            phone: '',
            physicalAddress: '',
            defenseStyles: [],
            yearsOfExperience: '',
            yearsOfTeaching: '',
            uploadedFiles: [],
            credentialsRevoked: null,
            felonyConviction: null,
            certifyAccurate: false,
            agreeConduct: false,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePicture: user.profilePicture,
            specialty: user.preferredTechnique?.[0] || 'N/A',
          });
        }
      }
      
      console.log('✅ Loaded applications:', trainerApplications.length);
      setApplications(trainerApplications);
    } catch (error: any) {
      console.error('❌ Error loading applications:', error);
      alert(`Failed to load applications: ${error.message || 'Unknown error'}`);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleApprove = async (uid: string) => {
    try {
      setProcessingApplication(uid);
      await AuthController.approveTrainerApplication(uid);
      await loadApplications();
      setSelectedApplication(null);
      showToast('Trainer application approved successfully!');
    } catch (error: any) {
      console.error('Error approving application:', error);
      showToast('Failed to approve application. Please try again.');
    } finally {
      setProcessingApplication(null);
    }
  };

  const handleRejectClick = (uid: string) => {
    setRejectingUid(uid);
    setSelectedRejectionReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectingUid || !selectedRejectionReason) {
      alert('Please select a rejection reason');
      return;
    }

    try {
      setProcessingApplication(rejectingUid);
      await AuthController.rejectTrainerApplication(rejectingUid, selectedRejectionReason);
      await loadApplications();
      setSelectedApplication(null);
      setShowRejectModal(false);
      setRejectingUid(null);
      setSelectedRejectionReason('');
      alert('Trainer application rejected');
    } catch (error: any) {
      console.error('Error rejecting application:', error);
      alert('Failed to reject application. Please try again.');
    } finally {
      setProcessingApplication(null);
    }
  };

  const handleViewApplication = (application: TrainerApplication) => {
    setSelectedApplication(application);
  };

  const handleBackToList = () => {
    setSelectedApplication(null);
  };

  const columns: AdminTableColumn<ExtendedTrainerApplication>[] = [
    {
      key: 'trainer',
      title: 'Trainer',
      minWidth: 250,
      flex: 2,
      render: (application) => (
        <View style={styles.trainerCell}>
          {application.profilePicture ? (
            <Image source={{ uri: application.profilePicture }} style={styles.trainerAvatar} />
          ) : (
            <View style={styles.trainerAvatarFallback}>
              <Ionicons name="person" size={16} color="#6b8693" />
            </View>
          )}
          <View>
            <Text style={styles.trainerNameText}>{application.firstName} {application.lastName}</Text>
            <Text style={styles.trainerEmailText}>{application.email}</Text>
          </View>
        </View>
      ),
    },
    {
      key: 'specialty',
      title: 'Specialty',
      minWidth: 150,
      render: (application) => <Text style={styles.cellText}>{application.specialty || 'N/A'}</Text>,
    },
    {
      key: 'status',
      title: 'Status',
      minWidth: 130,
      sortable: true,
      render: (application) => <StatusBadge status={application.status.replace('awaiting review', 'Pending')} tone={application.status === 'approved' ? 'approved' : application.status === 'rejected' ? 'rejected' : 'pending'} />,
    },
    {
      key: 'submitted',
      title: 'Submitted',
      minWidth: 140,
      sortable: true,
      render: (application) => <Text style={styles.cellSubtleText}>{formatDate(application.appliedDate)}</Text>,
    },
    {
      key: 'actions',
      title: 'Actions',
      minWidth: 240,
      align: 'right',
      render: (application) => (
        <View style={[styles.actionButtonsRow, isCompact && styles.actionButtonsRowCompact]}>
          <TouchableOpacity style={[styles.viewButtonSmall, isCompact && styles.actionButtonSmallCompact]} onPress={() => handleViewApplication(application)}>
            <Text style={styles.viewButtonSmallText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.approveButtonSmall, isCompact && styles.actionButtonSmallCompact]}
            onPress={() => handleApprove(application.uid)}
            disabled={processingApplication === application.uid}
          >
            <Text style={styles.actionButtonSmallText}>{isCompact ? 'Appr.' : 'Approve'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rejectButtonSmall, isCompact && styles.actionButtonSmallCompact]}
            onPress={() => handleRejectClick(application.uid)}
            disabled={processingApplication === application.uid}
          >
            <Text style={styles.actionButtonSmallText}>Reject</Text>
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  // Detail View
  if (selectedApplication) {
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
                  style={styles.navIconActiveButton}
                  onPress={() => router.push('/(admin)/adminManaging')}
                  disabled={true}
                >
                  <Image
                    source={require('../../assets/images/adminmanageicon.png')}
                    style={styles.navIconImage}
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => router.push('/(admin)/adminDashboard')}
                >
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
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToList}
            >
              <Image
                source={require('../../assets/images/backbuttonicon.png')}
                style={styles.backButtonIcon}
                resizeMode="contain"
              />
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

          {/* Detail Content */}
          <View style={styles.mainContent}>
            <ScrollView 
              style={styles.detailContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Applicant Summary */}
              <View style={styles.detailSummarySection}>
              {selectedApplication.profilePicture ? (
                <Image
                  source={{ uri: selectedApplication.profilePicture }}
                  style={styles.detailProfilePicture}
                />
              ) : (
                <View style={styles.detailProfilePicture}>
                  <Ionicons name="person" size={40} color="#6b8693" />
                </View>
              )}
                <View style={styles.detailSummaryInfo}>
                  <Text style={styles.detailName}>
                    {selectedApplication.firstName} {selectedApplication.lastName}
                  </Text>
                  <Text style={styles.detailInfoLine}>
                    Applied: <Text style={styles.detailHighlight}>{formatDate(selectedApplication.appliedDate)}</Text>
                  </Text>
                  <Text style={styles.detailInfoLine}>
                    Specialty: <Text style={styles.detailHighlight}>{selectedApplication.specialty || 'N/A'}</Text>
                  </Text>
                  <Text style={styles.detailInfoLine}>
                    Status: <Text style={styles.detailHighlight}>{selectedApplication.status}</Text>
                  </Text>
                </View>
              </View>

              {/* About Me Section */}
              {(selectedApplication.aboutMe || selectedApplication.aboutMeImageUrl) && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>About Me</Text>
                  <View style={styles.detailInfoContainer}>
                    {selectedApplication.aboutMeImageUrl && (
                      <TouchableOpacity
                        onPress={() => { if (typeof window !== 'undefined') window.open(selectedApplication.aboutMeImageUrl, '_blank'); }}
                        style={styles.aboutMeImageContainer}
                      >
                        <Image
                          source={{ uri: selectedApplication.aboutMeImageUrl }}
                          style={styles.aboutMeImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    )}
                    {selectedApplication.aboutMe && (
                      <Text style={styles.detailValue}>{selectedApplication.aboutMe}</Text>
                    )}
                  </View>
                </View>
              )}

              {/* Personal Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Personal Information</Text>
                <View style={styles.detailInfoContainer}>
                  <Text style={styles.detailLabel}>FULL LEGAL NAME:</Text>
                  <Text style={styles.detailValue}>{selectedApplication.fullLegalName || `${selectedApplication.firstName} ${selectedApplication.lastName}`}</Text>

                  {selectedApplication.professionalAlias && (
                    <>
                      <Text style={styles.detailLabel}>PROFESSIONAL ALIAS:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.professionalAlias}</Text>
                    </>
                  )}

                  {selectedApplication.dateOfBirth && (
                    <>
                      <Text style={styles.detailLabel}>DATE OF BIRTH:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.dateOfBirth}</Text>
                    </>
                  )}

                  {selectedApplication.phone && (
                    <>
                      <Text style={styles.detailLabel}>PHONE:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.phone}</Text>
                    </>
                  )}

                  <Text style={styles.detailLabel}>EMAIL:</Text>
                  <Text style={styles.detailValue}>{selectedApplication.email}</Text>

                  {selectedApplication.academyName && (
                    <>
                      <Text style={styles.detailLabel}>ACADEMY NAME:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.academyName}</Text>
                    </>
                  )}

                  {selectedApplication.physicalAddress && (
                    <>
                      <Text style={styles.detailLabel}>ADDRESS:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.physicalAddress}</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Credentials & Certifications */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Credentials & Certifications</Text>
                <View style={styles.detailInfoContainer}>
                  {selectedApplication.defenseStyles && selectedApplication.defenseStyles.length > 0 && (
                    <>
                      <Text style={styles.detailLabel}>DEFENSE STYLES / MARTIAL ARTS:</Text>
                      <View style={styles.tagsContainer}>
                        {selectedApplication.defenseStyles.map((style, index) => (
                          <View key={index} style={styles.styleTag}>
                            <Text style={styles.styleTagText}>{style}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {selectedApplication.yearsOfExperience && (
                    <>
                      <Text style={styles.detailLabel}>YEARS OF EXPERIENCE:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.yearsOfExperience} years</Text>
                    </>
                  )}

                  {selectedApplication.yearsOfTeaching && (
                    <>
                      <Text style={styles.detailLabel}>YEARS OF TEACHING:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.yearsOfTeaching} years</Text>
                    </>
                  )}

                  {selectedApplication.currentRank && (
                    <>
                      <Text style={styles.detailLabel}>CURRENT RANK:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.currentRank}</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Social Media Links */}
              {(selectedApplication.facebookLink || selectedApplication.instagramLink || selectedApplication.otherLink) && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Social Media</Text>
                  <View style={styles.detailInfoContainer}>
                    {selectedApplication.facebookLink && (
                      <TouchableOpacity
                        onPress={() => { if (typeof window !== 'undefined') window.open(selectedApplication.facebookLink, '_blank'); }}
                        style={styles.socialLinkButton}
                      >
                        <Ionicons name="logo-facebook" size={18} color="#38a6de" />
                        <Text style={styles.socialLinkText}>Facebook Profile</Text>
                      </TouchableOpacity>
                    )}
                    {selectedApplication.instagramLink && (
                      <TouchableOpacity
                        onPress={() => { if (typeof window !== 'undefined') window.open(selectedApplication.instagramLink, '_blank'); }}
                        style={styles.socialLinkButton}
                      >
                        <Ionicons name="logo-instagram" size={18} color="#38a6de" />
                        <Text style={styles.socialLinkText}>Instagram Profile</Text>
                      </TouchableOpacity>
                    )}
                    {selectedApplication.otherLink && (
                      <TouchableOpacity
                        onPress={() => { if (typeof window !== 'undefined') window.open(selectedApplication.otherLink, '_blank'); }}
                        style={styles.socialLinkButton}
                      >
                        <Ionicons name="link" size={18} color="#38a6de" />
                        <Text style={styles.socialLinkText}>Other Link</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Right Column - Uploaded Files & Background Questions */}
              <View style={styles.detailRightColumn}>
                {/* Uploaded Files */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Uploaded Files</Text>
                  {selectedApplication.uploadedFiles && selectedApplication.uploadedFiles.length > 0 ? (
                    <View style={styles.detailInfoContainer}>
                      {selectedApplication.uploadedFiles.map((file, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.fileItem}
                          onPress={() => { if (typeof window !== 'undefined' && file.uri) window.open(file.uri, '_blank'); }}
                        >
                          <Ionicons
                            name={file.type?.includes('pdf') ? 'document-text' : file.type?.includes('image') ? 'image' : 'document'}
                            size={20}
                            color="#38a6de"
                            style={styles.fileIcon}
                          />
                          <View style={styles.fileInfo}>
                            <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                            {file.size && (
                              <Text style={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</Text>
                            )}
                          </View>
                          <Ionicons name="open-outline" size={16} color="#6b8693" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noFilesText}>No files uploaded</Text>
                  )}
                </View>

                {/* Background Questions */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Background Check</Text>
                  <View style={styles.detailInfoContainer}>
                    <View style={styles.questionRow}>
                      <Text style={styles.detailLabel}>HAVE YOU EVER HAD CREDENTIALS REVOKED?</Text>
                      <Text style={[styles.detailValue, selectedApplication.credentialsRevoked === 'yes' && styles.warningText]}>
                        {selectedApplication.credentialsRevoked === 'yes' ? 'Yes' : selectedApplication.credentialsRevoked === 'no' ? 'No' : 'Not answered'}
                      </Text>
                      {selectedApplication.credentialsRevoked === 'yes' && selectedApplication.credentialsRevokedExplanation && (
                        <Text style={styles.explanationText}>Explanation: {selectedApplication.credentialsRevokedExplanation}</Text>
                      )}
                    </View>
                    <View style={styles.questionRow}>
                      <Text style={styles.detailLabel}>HAVE YOU BEEN CONVICTED OF A FELONY?</Text>
                      <Text style={[styles.detailValue, selectedApplication.felonyConviction === 'yes' && styles.warningText]}>
                        {selectedApplication.felonyConviction === 'yes' ? 'Yes' : selectedApplication.felonyConviction === 'no' ? 'No' : 'Not answered'}
                      </Text>
                      {selectedApplication.felonyConviction === 'yes' && selectedApplication.felonyExplanation && (
                        <Text style={styles.explanationText}>Explanation: {selectedApplication.felonyExplanation}</Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* Certifications Agreement */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Agreements</Text>
                  <View style={styles.detailInfoContainer}>
                    <View style={styles.agreementRow}>
                      <Ionicons
                        name={selectedApplication.certifyAccurate ? 'checkmark-circle' : 'close-circle'}
                        size={18}
                        color={selectedApplication.certifyAccurate ? '#43d17f' : '#ff6c61'}
                      />
                      <Text style={styles.agreementText}>Certified information is accurate</Text>
                    </View>
                    <View style={styles.agreementRow}>
                      <Ionicons
                        name={selectedApplication.agreeConduct ? 'checkmark-circle' : 'close-circle'}
                        size={18}
                        color={selectedApplication.agreeConduct ? '#43d17f' : '#ff6c61'}
                      />
                      <Text style={styles.agreementText}>Agreed to code of conduct</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleApprove(selectedApplication.uid)}
                  disabled={processingApplication === selectedApplication.uid}
                >
                  {processingApplication === selectedApplication.uid ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.actionButtonText}>Approve</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleRejectClick(selectedApplication.uid)}
                  disabled={processingApplication === selectedApplication.uid}
                >
                  {processingApplication === selectedApplication.uid ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.actionButtonText}>Reject</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Rejection Reason Modal */}
        <Modal
          visible={showRejectModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowRejectModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Select Rejection Reason</Text>
              <Text style={styles.modalSubtitle}>Please select a reason for rejecting this application:</Text>
              
              <ScrollView style={styles.reasonsList}>
                {rejectionReasons.map((reason, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.reasonOption,
                      selectedRejectionReason === reason && styles.reasonOptionSelected,
                    ]}
                    onPress={() => setSelectedRejectionReason(reason)}
                  >
                    <View style={styles.reasonRadio}>
                      {selectedRejectionReason === reason && (
                        <View style={styles.reasonRadioSelected} />
                      )}
                    </View>
                    <Text style={[
                      styles.reasonText,
                      selectedRejectionReason === reason && styles.reasonTextSelected,
                    ]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => {
                    setShowRejectModal(false);
                    setRejectingUid(null);
                    setSelectedRejectionReason('');
                  }}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={handleReject}
                  disabled={!selectedRejectionReason || processingApplication === rejectingUid}
                >
                  {processingApplication === rejectingUid ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmButtonText}>Confirm Rejection</Text>
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

  // List View
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
                style={styles.navIconActiveButton}
                onPress={() => router.push('/(admin)/adminManaging')}
                disabled={true}
              >
                <Image
                  source={require('../../assets/images/adminmanageicon.png')}
                  style={styles.navIconImage}
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => router.push('/(admin)/adminDashboard')}
              >
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
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push('/(admin)/adminManaging')}
          >
            <Image
              source={require('../../assets/images/backbuttonicon.png')}
              style={styles.backButtonIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Image
              source={require('../../assets/images/defendudashboardlogo.png')}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
            <Text style={styles.headerAdminText}>Admin</Text>
            <Text style={styles.subTitle}>
              Trainer Applications {searchQuery ? `${filteredApplications.length} of ${applications.length}` : applications.length}
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={[styles.mainContent, isCompact && styles.mainContentCompact]}>
          <Animated.View style={[
            styles.searchContainer,
            {
              opacity: searchAnim,
              transform: [{
                translateY: searchAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              }],
            },
          ]}>
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name, email, or specialty"
            />
          </Animated.View>

          <AdminTable
            columns={columns}
            data={paginatedApplications}
            loading={loading}
            compact={isCompact}
            keyExtractor={(application) => application.uid}
            sortState={sortState}
            onSortChange={handleSortChange}
            emptyTitle={searchQuery ? 'No applications match your search' : 'No trainer applications found'}
            emptyDescription="Applications will appear here when trainers submit their profiles."
            pagination={{
              currentPage,
              totalPages: sortedTotalPages,
              onPrevious: () => setCurrentPage((p) => Math.max(1, p - 1)),
              onNext: () => setCurrentPage((p) => Math.min(sortedTotalPages, p + 1)),
            }}
          />
        </View>
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
    backgroundColor: '#0b1625',
  },
  container: {
    flex: 1,
    position: 'relative',
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
  navIconActiveButton: {
    backgroundColor: '#024446',
    borderRadius: 8,
    padding: 8,
    width: '100%',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 100,
    paddingRight: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  backButtonIcon: {
    width: 24,
    height: 24,
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
  subTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: 'system-ui',
    marginTop: 4,
    opacity: 0.9,
  },
  mainContent: {
    flex: 1,
    paddingLeft: 100,
    paddingRight: 20,
    paddingTop: 20,
  },
  mainContentCompact: {
    paddingLeft: 86,
    paddingRight: 12,
    paddingTop: 14,
  },
  searchContainer: {
    width: '100%',
    marginBottom: 16,
  },
  trainerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 320,
  },
  trainerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  trainerAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#15344a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerNameText: {
    color: '#edf6fb',
    fontSize: 13,
    fontWeight: '700',
  },
  trainerEmailText: {
    color: '#97aeb9',
    fontSize: 12,
  },
  cellText: {
    color: '#d5eaf4',
    fontSize: 13,
  },
  cellSubtleText: {
    color: '#a4bec9',
    fontSize: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButtonsRowCompact: {
    gap: 5,
  },
  actionButtonSmallCompact: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  viewButtonSmall: {
    borderWidth: 1,
    borderColor: 'rgba(56, 166, 222, 0.5)',
    backgroundColor: 'rgba(56, 166, 222, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  viewButtonSmallText: {
    color: '#def2ff',
    fontSize: 12,
    fontWeight: '700',
  },
  approveButtonSmall: {
    backgroundColor: 'rgba(67, 209, 127, 0.18)',
    borderColor: 'rgba(67, 209, 127, 0.55)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rejectButtonSmall: {
    backgroundColor: 'rgba(255, 108, 97, 0.18)',
    borderColor: 'rgba(255, 108, 97, 0.55)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionButtonSmallText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    opacity: 0.7,
  },
  gridContainer: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingBottom: 20,
  },
  applicationCard: {
    width: 300,
    marginRight: 16,
    marginBottom: 16,
    backgroundColor: '#011f36',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(107, 134, 147, 0.2)',
    cursor: 'pointer',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardProfilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#6b8693',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'system-ui',
  },
  cardInfo: {
    marginBottom: 16,
  },
  cardInfoLine: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'system-ui',
    marginBottom: 6,
    opacity: 0.9,
  },
  cardHighlight: {
    color: '#38a6de',
    fontWeight: '600',
  },
  viewButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#38a6de',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    cursor: 'pointer',
  },
  viewButtonText: {
    color: '#38a6de',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'system-ui',
  },
  // Detail View Styles
  detailContainer: {
    flex: 1,
    backgroundColor: '#011f36',
    borderRadius: 12,
    padding: 20,
  },
  detailSummarySection: {
    flexDirection: 'row',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 134, 147, 0.3)',
  },
  detailProfilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    backgroundColor: '#6b8693',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailSummaryInfo: {
    flex: 1,
  },
  detailName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'system-ui',
    marginBottom: 8,
  },
  detailInfoLine: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'system-ui',
    marginBottom: 4,
    opacity: 0.9,
  },
  detailHighlight: {
    color: '#38a6de',
    fontWeight: '600',
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'system-ui',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  detailInfoContainer: {
    gap: 8,
  },
  detailLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'system-ui',
    opacity: 0.8,
    marginTop: 8,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'system-ui',
    marginBottom: 4,
  },
  detailBulletPoint: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'system-ui',
    marginLeft: 8,
    marginBottom: 4,
  },
  detailRightColumn: {
    marginTop: 24,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(56, 166, 222, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  fileIcon: {
    marginRight: 8,
  },
  fileName: {
    color: '#38a6de',
    fontSize: 14,
    fontFamily: 'system-ui',
  },
  noFilesText: {
    color: '#6b8693',
    fontSize: 14,
    fontFamily: 'system-ui',
    fontStyle: 'italic',
  },
  questionRow: {
    marginBottom: 12,
  },
  // New styles for enhanced trainer detail view
  aboutMeImageContainer: {
    marginBottom: 12,
  },
  aboutMeImage: {
    width: '100%',
    maxWidth: 300,
    height: 200,
    borderRadius: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  styleTag: {
    backgroundColor: 'rgba(56, 166, 222, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 166, 222, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  styleTagText: {
    color: '#67bce9',
    fontSize: 12,
    fontWeight: '600',
  },
  socialLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(56, 166, 222, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  socialLinkText: {
    color: '#38a6de',
    fontSize: 14,
    fontWeight: '500',
  },
  fileInfo: {
    flex: 1,
    marginRight: 8,
  },
  fileSize: {
    color: '#6b8693',
    fontSize: 11,
    marginTop: 2,
  },
  warningText: {
    color: '#ff6c61',
    fontWeight: '600',
  },
  explanationText: {
    color: '#a9c0cb',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255, 108, 97, 0.4)',
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  agreementText: {
    color: '#d6efff',
    fontSize: 14,
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 134, 147, 0.3)',
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  approveButton: {
    backgroundColor: '#38a6de',
  },
  rejectButton: {
    backgroundColor: '#6b8693',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'system-ui',
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
    cursor: 'pointer',
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
  // Rejection Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#011f36',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#38a6de',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: 'system-ui',
  },
  modalSubtitle: {
    color: '#6b8693',
    fontSize: 14,
    marginBottom: 20,
    fontFamily: 'system-ui',
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
    marginBottom: 8,
    backgroundColor: '#0a3645',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reasonOptionSelected: {
    borderColor: '#38a6de',
    backgroundColor: 'rgba(56, 166, 222, 0.1)',
  },
  reasonRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6b8693',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonRadioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38a6de',
  },
  reasonText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'system-ui',
  },
  reasonTextSelected: {
    color: '#38a6de',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 134, 147, 0.3)',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6b8693',
  },
  modalCancelButtonText: {
    color: '#6b8693',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'system-ui',
  },
  modalConfirmButton: {
    backgroundColor: '#6b8693',
  },
  modalConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'system-ui',
  },
});
