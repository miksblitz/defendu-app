import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Linking,
    Modal,
    Platform,
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
import { TrainerApplication } from '../_models/TrainerApplication';
import { AuthController } from '../controllers/AuthController';
import { isStableRemoteImageUri } from '../../utils/imageUri';

type ExtendedTrainerApplication = TrainerApplication & { 
  firstName?: string; 
  lastName?: string; 
  profilePicture?: string; 
  specialty?: string;
};
type ApprovedTrainerRow = {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  specialty?: string;
  description?: string;
  application: TrainerApplication | null;
};

type TrainerUploadFile = TrainerApplication['uploadedFiles'][number];

function isTrainerUploadImage(file: TrainerUploadFile): boolean {
  const t = String(file.type || '').toLowerCase();
  if (t === 'image' || t.startsWith('image/')) return true;
  const n = String(file.name || '').toLowerCase();
  return /\.(jpe?g|png|gif|webp|heic|bmp)$/.test(n);
}

function isTrainerUploadPdf(file: TrainerUploadFile): boolean {
  const t = String(file.type || '').toLowerCase();
  if (t.includes('pdf')) return true;
  const n = String(file.name || '').toLowerCase();
  return n.endsWith('.pdf');
}

/** Web-only: embed PDF in the page (native returns null). */
function InlinePdfEmbedWeb({ uri, title }: { uri: string; title: string }) {
  if (Platform.OS !== 'web') return null;
  return React.createElement('iframe', {
    src: uri,
    title,
    style: {
      width: '100%',
      height: 520,
      border: 'none',
      borderRadius: 8,
      backgroundColor: '#e8eef3',
    },
  }) as React.ReactElement;
}

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
  const [processingTrainerId, setProcessingTrainerId] = useState<string | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [trainerToRevoke, setTrainerToRevoke] = useState<ApprovedTrainerRow | null>(null);
  const [viewMode, setViewMode] = useState<'applications' | 'trainers'>('applications');
  const [approvedTrainers, setApprovedTrainers] = useState<ApprovedTrainerRow[]>([]);
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

  useEffect(() => {
    loadAllData();
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
      const email = (app.email ?? '').toLowerCase();
      const specialty = (app.specialty || '').toLowerCase();
      return fullName.includes(query) || email.includes(query) || specialty.includes(query);
    });
  }, [applications, searchQuery]);
  const filteredApprovedTrainers = useMemo(() => {
    if (!searchQuery.trim()) return approvedTrainers;
    const query = searchQuery.toLowerCase().trim();
    return approvedTrainers.filter((trainer) => {
      const fullName = `${trainer.firstName} ${trainer.lastName}`.toLowerCase();
      const email = trainer.email.toLowerCase();
      const specialty = (trainer.specialty || '').toLowerCase();
      const description = (trainer.description || '').toLowerCase();
      return fullName.includes(query) || email.includes(query) || specialty.includes(query) || description.includes(query);
    });
  }, [approvedTrainers, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode]);

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
  const sortedApprovedTrainers = useMemo(() => {
    const result = [...filteredApprovedTrainers];
    result.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
    return result;
  }, [filteredApprovedTrainers]);

  const sortedTotalPages = Math.max(
    1,
    Math.ceil((viewMode === 'applications' ? sortedApplications.length : sortedApprovedTrainers.length) / PAGE_SIZE)
  );
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedApplications.slice(start, start + PAGE_SIZE);
  }, [sortedApplications, currentPage]);
  const paginatedApprovedTrainers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedApprovedTrainers.slice(start, start + PAGE_SIZE);
  }, [sortedApprovedTrainers, currentPage]);

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

  const loadAllData = async () => {
    await Promise.all([loadApplications(), loadApprovedTrainers()]);
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

  const loadApprovedTrainers = async () => {
    try {
      const trainers = await AuthController.getApprovedTrainers();
      const rows: ApprovedTrainerRow[] = [];
      for (const trainer of trainers) {
        const app = await AuthController.getTrainerApplicationData(trainer.uid);
        rows.push({
          uid: trainer.uid,
          firstName: trainer.firstName,
          lastName: trainer.lastName,
          email: trainer.email,
          profilePicture: trainer.profilePicture,
          specialty: app?.defenseStyles?.[0] || trainer.preferredTechnique?.[0] || 'N/A',
          description: app?.aboutMe || trainer.previousTrainingDetails || '',
          application: app,
        });
      }
      setApprovedTrainers(rows);
    } catch (error: any) {
      console.error('❌ Error loading approved trainers:', error);
      showToast(error.message || 'Failed to load approved trainers');
      setApprovedTrainers([]);
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
      await loadAllData();
      setSelectedApplication(null);
      showToast('Trainer application approved successfully!');
    } catch (error: any) {
      console.error('Error approving application:', error);
      showToast('Failed to approve application. Please try again.');
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

  const openUploadUri = async (uri: string) => {
    const trimmed = uri?.trim();
    if (!trimmed) {
      showToast('File link is not available.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(trimmed);
      if (supported) {
        await Linking.openURL(trimmed);
      } else {
        showToast('Cannot open this file on this device.');
      }
    } catch {
      showToast('Could not open this file.');
    }
  };

  const handleViewTrainerApplication = (trainer: ApprovedTrainerRow) => {
    if (!trainer.application) {
      Alert.alert('No application found', 'This trainer does not have a stored application record.');
      return;
    }
    setSelectedApplication({
      ...trainer.application,
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      profilePicture: trainer.profilePicture,
      specialty: trainer.specialty,
    });
  };

  const handleRevokeTrainerRights = async (trainer: ApprovedTrainerRow) => {
    setTrainerToRevoke(trainer);
    setShowRevokeModal(true);
  };

  const handleConfirmRevokeRights = async () => {
    if (!trainerToRevoke) return;
    try {
      setProcessingTrainerId(trainerToRevoke.uid);
      await AuthController.revokeTrainerRights(trainerToRevoke.uid, 'Revoked by admin from manage trainers');
      showToast('Trainer rights removed successfully.');
      setShowRevokeModal(false);
      setTrainerToRevoke(null);
      await loadAllData();
      if (selectedApplication?.uid === trainerToRevoke.uid) setSelectedApplication(null);
    } catch (error: any) {
      showToast(error.message || 'Failed to remove trainer rights');
    } finally {
      setProcessingTrainerId(null);
    }
  };

  const columns: AdminTableColumn<ExtendedTrainerApplication>[] = [
    {
      key: 'trainer',
      title: 'Trainer',
      minWidth: 250,
      flex: 2,
      render: (application) => (
        <View style={styles.trainerCell}>
          {isStableRemoteImageUri(application.profilePicture) ? (
            <Image source={{ uri: application.profilePicture! }} style={styles.trainerAvatar} />
          ) : (
            <View style={styles.trainerAvatarFallback}>
              <Ionicons name="person" size={16} color="#6b8693" />
            </View>
          )}
          <View>
            <Text style={styles.trainerNameText}>{application.firstName} {application.lastName}</Text>
            <Text style={styles.trainerEmailText}>{application.email?.trim() ? application.email : '—'}</Text>
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
        </View>
      ),
    },
  ];
  const trainerColumns: AdminTableColumn<ApprovedTrainerRow>[] = [
    {
      key: 'trainer',
      title: 'Trainer',
      minWidth: 260,
      flex: 2,
      render: (trainer) => (
        <View style={styles.trainerCell}>
          {isStableRemoteImageUri(trainer.profilePicture) ? (
            <Image source={{ uri: trainer.profilePicture! }} style={styles.trainerAvatar} />
          ) : (
            <View style={styles.trainerAvatarFallback}>
              <Ionicons name="person" size={16} color="#6b8693" />
            </View>
          )}
          <View>
            <Text style={styles.trainerNameText}>{trainer.firstName} {trainer.lastName}</Text>
            <Text style={styles.trainerEmailText}>{trainer.email}</Text>
          </View>
        </View>
      ),
    },
    {
      key: 'specialty',
      title: 'Profile',
      minWidth: 320,
      flex: 2,
      render: (trainer) => (
        <View>
          <Text style={styles.cellText}>{trainer.specialty || 'N/A'}</Text>
          <Text style={styles.cellSubtleText} numberOfLines={2}>
            {trainer.description?.trim() || 'No trainer description provided.'}
          </Text>
        </View>
      ),
    },
    {
      key: 'application',
      title: 'Application',
      minWidth: 120,
      render: (trainer) => (
        <StatusBadge
          status={trainer.application ? 'Available' : 'Not found'}
          tone={trainer.application ? 'approved' : 'pending'}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      minWidth: 280,
      align: 'right',
      render: (trainer) => (
        <View style={[styles.actionButtonsRow, isCompact && styles.actionButtonsRowCompact]}>
          <TouchableOpacity
            style={[styles.viewButtonSmall, isCompact && styles.actionButtonSmallCompact]}
            onPress={() => handleViewTrainerApplication(trainer)}
          >
            <Text style={styles.viewButtonSmallText}>View application</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.removeRightsButtonSmall, isCompact && styles.actionButtonSmallCompact]}
            onPress={() => handleRevokeTrainerRights(trainer)}
            disabled={processingTrainerId === trainer.uid}
          >
            <Text style={styles.actionButtonSmallText}>
              {processingTrainerId === trainer.uid ? 'Removing...' : 'Remove rights'}
            </Text>
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
              contentContainerStyle={styles.detailScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Applicant Summary */}
              <View style={styles.detailSummarySection}>
              {isStableRemoteImageUri(selectedApplication.profilePicture) ? (
                <Image
                  source={{ uri: selectedApplication.profilePicture! }}
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
                  
                  <Text style={styles.detailLabel}>DATE OF BIRTH:</Text>
                  <Text style={styles.detailValue}>
                    {selectedApplication.dateOfBirth?.trim()
                      ? selectedApplication.dateOfBirth
                      : '—'}
                  </Text>

                  {selectedApplication.phone && (
                    <>
                      <Text style={styles.detailLabel}>PHONE:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.phone}</Text>
                    </>
                  )}

                  <Text style={styles.detailLabel}>EMAIL ADDRESS:</Text>
                  <Text style={styles.detailValue}>
                    {selectedApplication.email?.trim() ? selectedApplication.email : '—'}
                  </Text>

                  {selectedApplication.academyName && (
                    <>
                      <Text style={styles.detailLabel}>ACADEMY NAME:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.academyName}</Text>
                    </>
                  )}

                  <Text style={styles.detailLabel}>PHYSICAL ADDRESS:</Text>
                  <Text style={styles.detailValue}>
                    {(selectedApplication as any).physicalAddress?.trim?.() ||
                      (selectedApplication as any).address?.trim?.() ||
                      '—'}
                  </Text>
                </View>
              </View>

              {/* Credentials & Certifications */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Credentials & Certifications</Text>
                <View style={styles.detailInfoContainer}>
                  {selectedApplication.defenseStyles && selectedApplication.defenseStyles.length > 0 ? (
                    <>
                      <Text style={styles.detailLabel}>DEFENSE STYLES:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.defenseStyles.join(', ')}</Text>
                    </>
                  ) : null}

                  {selectedApplication.primaryStyle && (
                    <>
                      <Text style={styles.detailLabel}>PRIMARY STYLE:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.primaryStyle}</Text>
                    </>
                  )}

                  {selectedApplication.yearsOfExperience !== undefined && selectedApplication.yearsOfExperience !== '' && (
                    <>
                      <Text style={styles.detailLabel}>YEARS OF EXPERIENCE:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.yearsOfExperience} years</Text>
                    </>
                  )}

                  {selectedApplication.yearsOfTeaching !== undefined && selectedApplication.yearsOfTeaching !== '' && (
                    <>
                      <Text style={styles.detailLabel}>YEARS OF TEACHING:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.yearsOfTeaching} years</Text>
                    </>
                  )}

                  {selectedApplication.currentRank ? (
                    <>
                      <Text style={styles.detailLabel}>CURRENT RANK / BELT:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.currentRank}</Text>
                    </>
                  ) : null}
                  
                  {selectedApplication.certificationBody && (
                    <>
                      <Text style={styles.detailLabel}>CERTIFICATION BODY:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.certificationBody}</Text>
                    </>
                  )}
                  
                  {selectedApplication.certificationNumber && (
                    <>
                      <Text style={styles.detailLabel}>CERTIFICATION NUMBER:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.certificationNumber}</Text>
                    </>
                  )}
                  
                  {selectedApplication.certificationDate && (
                    <>
                      <Text style={styles.detailLabel}>CERTIFICATION DATE:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedApplication.certificationDate)}</Text>
                    </>
                  )}
                  
                  {selectedApplication.expirationDate && (
                    <>
                      <Text style={styles.detailLabel}>EXPIRATION DATE:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedApplication.expirationDate)}</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Additional Certifications */}
              {selectedApplication.additionalCertifications && selectedApplication.additionalCertifications.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>ADDITIONAL CERTIFICATIONS:</Text>
                  <View style={styles.detailInfoContainer}>
                    {selectedApplication.additionalCertifications.map((cert, index) => (
                      <Text key={index} style={styles.detailBulletPoint}>- {cert}</Text>
                    ))}
                  </View>
                </View>
              )}

              {/* Right Column - Uploaded Files */}
              <View style={styles.detailRightColumn}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Uploaded Files</Text>
                  {selectedApplication.uploadedFiles && selectedApplication.uploadedFiles.length > 0 ? (
                    <View style={styles.detailInfoContainer}>
                      {selectedApplication.uploadedFiles.map((file, index) => (
                        <View key={index} style={styles.inlineUploadBlock}>
                          <View style={styles.inlineUploadHeader}>
                            <Ionicons
                              name={
                                isTrainerUploadPdf(file)
                                  ? 'document-text'
                                  : isTrainerUploadImage(file)
                                    ? 'image'
                                    : 'document-attach'
                              }
                              size={20}
                              color="#38a6de"
                              style={styles.inlineUploadHeaderIcon}
                            />
                            <Text style={styles.inlineUploadName} numberOfLines={3}>
                              {file.name}
                            </Text>
                          </View>
                          {!file.uri?.trim() ? (
                            <Text style={styles.inlineUploadMissing}>
                              No file URL was stored for this upload.
                            </Text>
                          ) : isTrainerUploadImage(file) && isStableRemoteImageUri(file.uri) ? (
                            <View style={styles.inlineImageWrap}>
                              <Image
                                source={{ uri: file.uri }}
                                style={styles.inlineUploadImage}
                                resizeMode="contain"
                                onError={() =>
                                  showToast(`Could not load image: ${file.name || 'file'}`)
                                }
                              />
                            </View>
                          ) : isTrainerUploadImage(file) && !isStableRemoteImageUri(file.uri) ? (
                            <View style={styles.inlineGenericFile}>
                              <Text style={styles.inlineUploadHintText}>
                                This image was stored with a temporary link and can no longer be previewed. Ask the trainer to re-submit or replace the file.
                              </Text>
                              {file.uri?.trim() ? (
                                <TouchableOpacity
                                  style={styles.inlineOpenButton}
                                  onPress={() => openUploadUri(file.uri)}
                                >
                                  <Text style={styles.inlineOpenButtonText}>Try open link</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          ) : isTrainerUploadPdf(file) ? (
                            Platform.OS === 'web' ? (
                              <View style={styles.inlinePdfFrameWrap}>
                                <InlinePdfEmbedWeb uri={file.uri} title={file.name} />
                                <TouchableOpacity
                                  style={styles.inlineOpenLinkRow}
                                  onPress={() => openUploadUri(file.uri)}
                                >
                                  <Text style={styles.inlineOpenLinkText}>
                                    Open PDF in new tab if it does not show above
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <View style={styles.inlinePdfNativeHint}>
                                <Text style={styles.inlineUploadHintText}>
                                  Inline PDF preview is available on web admin. Open externally on this device.
                                </Text>
                                <TouchableOpacity
                                  style={styles.inlineOpenButton}
                                  onPress={() => openUploadUri(file.uri)}
                                >
                                  <Text style={styles.inlineOpenButtonText}>Open PDF</Text>
                                </TouchableOpacity>
                              </View>
                            )
                          ) : (
                            <View style={styles.inlineGenericFile}>
                              <Text style={styles.inlineUploadHintText}>
                                Preview is not available for this file type.
                              </Text>
                              <TouchableOpacity
                                style={styles.inlineOpenButton}
                                onPress={() => openUploadUri(file.uri)}
                              >
                                <Text style={styles.inlineOpenButtonText}>Open file</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noFilesText}>No files uploaded</Text>
                  )}
                </View>
              </View>

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
        <Modal visible={showRevokeModal} transparent animationType="fade" onRequestClose={() => setShowRevokeModal(false)}>
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIconWrap}>
                <Ionicons name="warning-outline" size={28} color="#ff9b8a" />
              </View>
              <Text style={styles.confirmTitle}>Remove trainer rights?</Text>
              <Text style={styles.confirmBody}>
                {trainerToRevoke
                  ? `Are you sure you want to remove ${trainerToRevoke.firstName} ${trainerToRevoke.lastName}'s trainer rights?`
                  : 'Are you sure you want to remove this trainer rights?'}
              </Text>
              <View style={styles.confirmBulletWrap}>
                <Text style={styles.confirmBullet}>- They become an individual user.</Text>
                <Text style={styles.confirmBullet}>- They can no longer publish modules.</Text>
                <Text style={styles.confirmBullet}>- Published modules remain visible.</Text>
              </View>
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={[styles.confirmBtn, styles.confirmCancelBtn]}
                  onPress={() => { setShowRevokeModal(false); setTrainerToRevoke(null); }}
                  disabled={!!processingTrainerId}
                >
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, styles.confirmDangerBtn]}
                  onPress={handleConfirmRevokeRights}
                  disabled={!!processingTrainerId}
                >
                  {processingTrainerId ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmDangerText}>Yes, remove rights</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
              {viewMode === 'applications'
                ? `Trainer Applications ${searchQuery ? `${filteredApplications.length} of ${applications.length}` : applications.length}`
                : `All Trainers ${searchQuery ? `${filteredApprovedTrainers.length} of ${approvedTrainers.length}` : approvedTrainers.length}`}
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <ScrollView style={[styles.mainContent, isCompact && styles.mainContentCompact]} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
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
            <View style={styles.modeSwitchRow}>
              <TouchableOpacity
                style={[styles.modeSwitchButton, viewMode === 'applications' && styles.modeSwitchButtonActive]}
                onPress={() => setViewMode('applications')}
              >
                <Text style={[styles.modeSwitchButtonText, viewMode === 'applications' && styles.modeSwitchButtonTextActive]}>
                  Applications
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeSwitchButton, viewMode === 'trainers' && styles.modeSwitchButtonActive]}
                onPress={() => setViewMode('trainers')}
              >
                <Text style={[styles.modeSwitchButtonText, viewMode === 'trainers' && styles.modeSwitchButtonTextActive]}>
                  All Trainers
                </Text>
              </TouchableOpacity>
            </View>
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={viewMode === 'applications'
                ? 'Search applications by name, email, or specialty'
                : 'Search trainers by name, email, specialty, or description'}
            />
          </Animated.View>

          <View style={styles.tableWrap}>
            <AdminTable
              columns={viewMode === 'applications' ? columns : trainerColumns}
              data={viewMode === 'applications' ? paginatedApplications : paginatedApprovedTrainers}
              loading={loading}
              compact={isCompact}
              keyExtractor={(row) => row.uid}
              sortState={viewMode === 'applications' ? sortState : undefined}
              onSortChange={viewMode === 'applications' ? handleSortChange : undefined}
              emptyTitle={viewMode === 'applications'
                ? (searchQuery ? 'No applications match your search' : 'No trainer applications found')
                : (searchQuery ? 'No trainers match your search' : 'No approved trainers found')}
              emptyDescription={viewMode === 'applications'
                ? 'Applications will appear here when trainers submit their profiles.'
                : 'Approved trainers will appear here.'}
              pagination={{
                currentPage,
                totalPages: sortedTotalPages,
                onPrevious: () => setCurrentPage((p) => Math.max(1, p - 1)),
                onNext: () => setCurrentPage((p) => Math.min(sortedTotalPages, p + 1)),
              }}
            />
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
      <Modal visible={showRevokeModal} transparent animationType="fade" onRequestClose={() => setShowRevokeModal(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="warning-outline" size={28} color="#ff9b8a" />
            </View>
            <Text style={styles.confirmTitle}>Remove trainer rights?</Text>
            <Text style={styles.confirmBody}>
              {trainerToRevoke
                ? `Are you sure you want to remove ${trainerToRevoke.firstName} ${trainerToRevoke.lastName}'s trainer rights?`
                : 'Are you sure you want to remove this trainer rights?'}
            </Text>
            <View style={styles.confirmBulletWrap}>
              <Text style={styles.confirmBullet}>- They become an individual user.</Text>
              <Text style={styles.confirmBullet}>- They can no longer publish modules.</Text>
              <Text style={styles.confirmBullet}>- Published modules remain visible.</Text>
            </View>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmCancelBtn]}
                onPress={() => { setShowRevokeModal(false); setTrainerToRevoke(null); }}
                disabled={!!processingTrainerId}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmDangerBtn]}
                onPress={handleConfirmRevokeRights}
                disabled={!!processingTrainerId}
              >
                {processingTrainerId ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmDangerText}>Yes, remove rights</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingRight: 8,
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
    // Inset past absolute leftNavBar (80) so table and application detail are not covered
    paddingLeft: 100,
    paddingRight: 8,
    paddingTop: 20,
  },
  mainContentCompact: {
    paddingLeft: 92,
    paddingRight: 6,
    paddingTop: 14,
  },
  searchContainer: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    marginBottom: 18,
    gap: 10,
  },
  tableWrap: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  modeSwitchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  modeSwitchButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(107, 134, 147, 0.45)',
    backgroundColor: 'rgba(107, 134, 147, 0.12)',
  },
  modeSwitchButtonActive: {
    borderColor: '#38a6de',
    backgroundColor: 'rgba(56, 166, 222, 0.22)',
  },
  modeSwitchButtonText: {
    color: '#b8d0dc',
    fontSize: 13,
    fontWeight: '700',
  },
  modeSwitchButtonTextActive: {
    color: '#e9f6ff',
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
  removeRightsButtonSmall: {
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
  detailScrollContent: {
    paddingBottom: 40,
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
  inlineUploadBlock: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(4, 28, 45, 0.95)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 166, 222, 0.28)',
  },
  inlineUploadHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  inlineUploadHeaderIcon: {
    marginTop: 2,
  },
  inlineUploadName: {
    flex: 1,
    color: '#def2ff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'system-ui',
  },
  inlineUploadMissing: {
    color: '#97aeb9',
    fontSize: 13,
    fontFamily: 'system-ui',
    fontStyle: 'italic',
  },
  inlineImageWrap: {
    width: '100%',
    minHeight: 180,
    maxHeight: 480,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  inlineUploadImage: {
    width: '100%',
    minHeight: 200,
    maxHeight: 480,
  },
  inlinePdfFrameWrap: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  inlinePdfNativeHint: {
    gap: 10,
  },
  inlineGenericFile: {
    gap: 10,
  },
  inlineUploadHintText: {
    color: '#97aeb9',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'system-ui',
  },
  inlineOpenButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 166, 222, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(56, 166, 222, 0.45)',
  },
  inlineOpenButtonText: {
    color: '#9bd8ff',
    fontSize: 13,
    fontWeight: '700',
  },
  inlineOpenLinkRow: {
    marginTop: 10,
    paddingVertical: 6,
  },
  inlineOpenLinkText: {
    color: '#6bc4f0',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  noFilesText: {
    color: '#6b8693',
    fontSize: 14,
    fontFamily: 'system-ui',
    fontStyle: 'italic',
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
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'system-ui',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 12, 22, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#071a2c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 166, 222, 0.35)',
    padding: 20,
  },
  confirmIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 108, 97, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 108, 97, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  confirmBody: {
    color: '#b8d0dc',
    fontSize: 14,
    lineHeight: 21,
  },
  confirmBulletWrap: {
    marginTop: 12,
    marginBottom: 16,
    gap: 6,
  },
  confirmBullet: {
    color: '#d8eaf3',
    fontSize: 13,
    lineHeight: 19,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  confirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelBtn: {
    borderWidth: 1,
    borderColor: 'rgba(107, 134, 147, 0.5)',
    backgroundColor: 'rgba(107, 134, 147, 0.12)',
  },
  confirmDangerBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255, 108, 97, 0.55)',
    backgroundColor: 'rgba(255, 108, 97, 0.22)',
  },
  confirmCancelText: {
    color: '#c0d4de',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmDangerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
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
});
