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
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from '../../components/Toast';
import { useLogout } from '../../hooks/useLogout';
import { useToast } from '../../hooks/useToast';
import { TrainerApplication } from '../_models/TrainerApplication';
import { AuthController } from '../controllers/AuthController';

type ExtendedTrainerApplication = TrainerApplication & { 
  firstName?: string; 
  lastName?: string; 
  profilePicture?: string; 
  specialty?: string;
};

export default function ManageTrainersPage() {
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
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();
  const handleLogout = useLogout();
  
  // Animation refs
  const headerAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const animatedValues = useRef<Map<string, Animated.Value>>(new Map()).current;
  const hoverScales = useRef<Map<string, Animated.Value>>(new Map()).current;

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
  
  // Animate filtered applications when they change
  useEffect(() => {
    if (filteredApplications.length > 0) {
      const animations = filteredApplications.map((app, index) => {
        const animValue = getAnimatedValue(app.uid);
        return Animated.timing(animValue, {
          toValue: 1,
          duration: 500,
          delay: Math.min(index * 50, 1000),
          useNativeDriver: true,
        });
      });
      Animated.stagger(30, animations).start();
    }
  }, [filteredApplications]);
  
  const getAnimatedValue = (uid: string) => {
    if (!animatedValues.has(uid)) {
      animatedValues.set(uid, new Animated.Value(0));
    }
    return animatedValues.get(uid)!;
  };
  
  const getHoverScale = (uid: string) => {
    if (!hoverScales.has(uid)) {
      hoverScales.set(uid, new Animated.Value(1));
    }
    return hoverScales.get(uid)!;
  };
  
  const handleCardHover = (uid: string, isHovering: boolean) => {
    const scale = getHoverScale(uid);
    Animated.spring(scale, {
      toValue: isHovering ? 1.05 : 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
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
                  
                  {selectedApplication.address && (
                    <>
                      <Text style={styles.detailLabel}>ADDRESS:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.address}</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Credentials & Certifications */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Credentials & Certifications</Text>
                <View style={styles.detailInfoContainer}>
                  {selectedApplication.primaryStyle && (
                    <>
                      <Text style={styles.detailLabel}>PRIMARY STYLE:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.primaryStyle}</Text>
                    </>
                  )}
                  
                  {selectedApplication.yearsOfExperience !== undefined && (
                    <>
                      <Text style={styles.detailLabel}>YEARS OF EXPERIENCE:</Text>
                      <Text style={styles.detailValue}>{selectedApplication.yearsOfExperience} years</Text>
                    </>
                  )}
                  
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

              {/* Right Column - Uploaded Files & Background Questions */}
              <View style={styles.detailRightColumn}>
                {/* Uploaded Files */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Uploaded Files</Text>
                  {selectedApplication.uploadedFiles && selectedApplication.uploadedFiles.length > 0 ? (
                    <View style={styles.detailInfoContainer}>
                      {selectedApplication.uploadedFiles.map((file, index) => (
                        <TouchableOpacity key={index} style={styles.fileItem}>
                          <Ionicons 
                            name={file.type === 'pdf' ? 'document-text' : 'image'} 
                            size={20} 
                            color="#38a6de" 
                            style={styles.fileIcon}
                          />
                          <Text style={styles.fileName}>{file.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noFilesText}>No files uploaded</Text>
                  )}
                </View>

                {/* Background Questions */}
                <View style={styles.detailSection}>
                  <View style={styles.detailInfoContainer}>
                    <View style={styles.questionRow}>
                      <Text style={styles.detailLabel}>HAVE YOU EVER HAD CREDENTIALS REVOKED?</Text>
                      <Text style={styles.detailValue}>
                        {selectedApplication.credentialsRevoked ? 'Yes' : 'No'}
                      </Text>
                    </View>
                    <View style={styles.questionRow}>
                      <Text style={styles.detailLabel}>HAVE YOU BEEN CONVICTED OF A FELONY?</Text>
                      <Text style={styles.detailValue}>
                        {selectedApplication.felonyConviction ? 'Yes' : 'No'}
                      </Text>
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
        <View style={styles.mainContent}>
          {/* Search Bar */}
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
            <Ionicons name="search" size={20} color="#6b8693" style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
              placeholder="Search by name, email, or specialty..."
              placeholderTextColor="#6b8693"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#6b8693" />
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Applications Grid */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#38a6de" />
              <Text style={styles.loadingText}>Loading applications...</Text>
            </View>
          ) : filteredApplications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No applications found matching your search' : 'No trainer applications found'}
              </Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.gridContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.grid}>
                {filteredApplications.map((application) => {
                  const animValue = getAnimatedValue(application.uid);
                  const hoverScale = getHoverScale(application.uid);
                  
                  return (
                    <Animated.View
                      key={application.uid}
                      style={[
                        styles.applicationCard,
                        {
                          opacity: animValue,
                          transform: [
                            {
                              translateY: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [30, 0],
                              }),
                            },
                            { scale: Animated.multiply(animValue, hoverScale) },
                          ],
                        },
                      ]}
                    >
                      <TouchableOpacity
                        onPressIn={() => handleCardHover(application.uid, true)}
                        onPressOut={() => handleCardHover(application.uid, false)}
                        onPress={() => handleViewApplication(application)}
                        activeOpacity={1}
                      >
                        <View style={styles.cardHeader}>
                {application.profilePicture ? (
                  <Image
                    source={{ uri: application.profilePicture }}
                    style={styles.cardProfilePicture}
                  />
                ) : (
                  <View style={styles.cardProfilePicture}>
                    <Ionicons name="person" size={30} color="#6b8693" />
                  </View>
                )}
                      <Text style={styles.cardName}>
                        {application.firstName} {application.lastName}
                      </Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardInfoLine}>
                        Applied: <Text style={styles.cardHighlight}>{formatDate(application.appliedDate)}</Text>
                      </Text>
                      <Text style={styles.cardInfoLine}>
                        Specialty: <Text style={styles.cardHighlight}>{application.specialty || 'N/A'}</Text>
                      </Text>
                      <Text style={styles.cardInfoLine}>
                        Status: <Text style={styles.cardHighlight}>{application.status}</Text>
                      </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.viewButton}
                          onPress={() => handleViewApplication(application)}
                        >
                          <Text style={styles.viewButtonText}>View full application</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            </ScrollView>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#011f36',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(107, 134, 147, 0.3)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'system-ui',
  },
  clearButton: {
    padding: 4,
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
