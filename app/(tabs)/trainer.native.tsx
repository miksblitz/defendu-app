import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
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
import { User } from '../_models/User';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';
import { AuthController } from '../controllers/AuthController';

interface TrainerWithData extends User {
  applicationData?: TrainerApplication | null;
}

export default function TrainerPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ moduleSubmitted?: string }>();
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();
  const handleLogout = useLogout();
  const { unreadCount, unreadDisplay, clearUnread } = useUnreadMessages();

  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [trainers, setTrainers] = useState<TrainerWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerWithData | null>(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCurrentUserTrainer, setIsCurrentUserTrainer] = useState(false);

  useEffect(() => {
    loadTrainers();
    checkCurrentUserTrainerStatus();
  }, []);

  // Show success toast when arriving after submitting a module
  useEffect(() => {
    if (params.moduleSubmitted === '1') {
      showToast('Module has successfully been submitted. Please wait for the admins to accept.');
      router.replace('/trainer');
    }
  }, [params.moduleSubmitted]);

  const checkCurrentUserTrainerStatus = async () => {
    try {
      const user = await AuthController.getCurrentUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }
      setCurrentUser(user);
      if (user.role === 'trainer' && user.trainerApproved === true) {
        setIsCurrentUserTrainer(true);
      }
    } catch (error) {
      console.error('Error checking user trainer status:', error);
      router.replace('/(auth)/login');
    }
  };

  const loadTrainers = async () => {
    try {
      setLoading(true);
      console.log('🔵 Loading approved trainers...');
      const approvedTrainers = await AuthController.getApprovedTrainers();
      console.log('✅ Loaded approved trainers:', approvedTrainers.length);

      // Fetch TrainerApplication data for each trainer
      const trainersWithData: TrainerWithData[] = [];
      for (const trainer of approvedTrainers) {
        try {
          const applicationData = await AuthController.getTrainerApplicationData(trainer.uid);
          trainersWithData.push({
            ...trainer,
            applicationData: applicationData || null,
          });
        } catch (error) {
          console.error(`❌ Error loading application data for trainer ${trainer.uid}:`, error);
          trainersWithData.push({
            ...trainer,
            applicationData: null,
          });
        }
      }

      console.log('✅ Processed trainers with data:', trainersWithData.length);
      setTrainers(trainersWithData);
    } catch (error: any) {
      console.error('❌ Error loading trainers:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      setTrainers([]);
    } finally {
      setLoading(false);
    }
  };

  // Get stats
  const totalTrainers = trainers.length;
  const specialties = useMemo(() => {
    const allSpecialties = new Set<string>();
    trainers.forEach(trainer => {
      if (trainer.applicationData?.defenseStyles) {
        trainer.applicationData.defenseStyles.forEach(style => allSpecialties.add(style));
      } else if (trainer.preferredTechnique) {
        trainer.preferredTechnique.forEach(tech => allSpecialties.add(tech));
      }
    });
    return allSpecialties.size;
  }, [trainers]);

  // Filter trainers based on search
  const filteredTrainers = useMemo(() => {
    if (!searchQuery.trim()) {
      return trainers;
    }
    const query = searchQuery.toLowerCase().trim();
    return trainers.filter(trainer => {
      const name = `${trainer.firstName} ${trainer.lastName}`.toLowerCase();
      const username = trainer.username?.toLowerCase() || '';
      const email = trainer.email?.toLowerCase() || '';
      const styles = trainer.applicationData?.defenseStyles?.join(' ') || 
                     trainer.preferredTechnique?.join(' ') || '';
      const location = trainer.applicationData?.physicalAddress?.toLowerCase() || '';
      
      return name.includes(query) || 
             username.includes(query) || 
             email.includes(query) ||
             styles.toLowerCase().includes(query) ||
             location.includes(query);
    });
  }, [trainers, searchQuery]);

  const handleViewCredentials = (trainer: TrainerWithData) => {
    setSelectedTrainer(trainer);
    setShowCredentialsModal(true);
  };

  const handleRegisterTrainer = () => {
    if (isCurrentUserTrainer) {
      router.push('/edit-trainer-profile');
    } else {
      router.push('/trainer-registration');
    }
  };

  const handleMessages = () => {
    clearUnread();
    setShowMenu(false);
    router.push('/messages');
  };

  const handleContactTrainer = (trainer: TrainerWithData) => {
    setShowCredentialsModal(false);
    const name = trainer.applicationData?.fullLegalName || `${trainer.firstName} ${trainer.lastName}`.trim();
    const photo = trainer.profilePicture || '';
    router.push(`/messages?with=${trainer.uid}&name=${encodeURIComponent(name)}&photo=${encodeURIComponent(photo)}` as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mobile Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/defendudashboardlogo.png')}
            style={styles.logoImage}
          />
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => { clearUnread(); setShowMenu(true); }}
          >
            <Image
              source={require('../../assets/images/threedoticon.png')}
              style={styles.menuIcon}
            />
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadDisplay}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Page Title */}
        <Text style={styles.pageTitle}>TRAINERS</Text>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {isCurrentUserTrainer && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/publish-module' as any)}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.actionButtonText}>Publish Module</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.actionButton, !isCurrentUserTrainer && styles.actionButtonFull]}
            onPress={handleRegisterTrainer}
          >
            <Ionicons 
              name={isCurrentUserTrainer ? "create-outline" : "person-add-outline"} 
              size={16} 
              color="#FFFFFF" 
              style={{ marginRight: 4 }} 
            />
            <Text style={styles.actionButtonText} numberOfLines={1}>
              {isCurrentUserTrainer ? 'Edit Profile' : 'Register as Trainer'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#6b8693" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search trainers, specialties..."
            placeholderTextColor="#6b8693"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#6b8693" />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalTrainers}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{specialties}</Text>
            <Text style={styles.statLabel}>Specialties</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{filteredTrainers.length}</Text>
            <Text style={styles.statLabel}>Showing</Text>
          </View>
        </View>

        {/* Results Count */}
        <Text style={styles.resultsText}>
          {filteredTrainers.length} {filteredTrainers.length === 1 ? 'Trainer' : 'Trainers'} Available
        </Text>

        {/* Trainer List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#07bbc0" />
            <Text style={styles.loadingText}>Loading trainers...</Text>
          </View>
        ) : filteredTrainers.length > 0 ? (
          filteredTrainers.map((trainer) => {
            const appData = trainer.applicationData;
            const allStyles = appData?.defenseStyles || trainer.preferredTechnique || [];
            const displayedStyles = allStyles.slice(0, 3);
            const username = appData?.professionalAlias || trainer.username || '';
            const academyName = appData?.academyName || '';
            const location = appData?.physicalAddress || 'Location not provided';
            const phone = appData?.phone || 'Phone not provided';
            const email = trainer.email || 'Email not provided';

            return (
              <View key={trainer.uid} style={styles.trainerCard}>
                {/* Avatar with checkmark */}
                <View style={styles.avatarContainer}>
                  {trainer.profilePicture ? (
                    <Image
                      source={{ uri: trainer.profilePicture }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={32} color="#FFFFFF" />
                    </View>
                  )}
                  <View style={styles.checkmarkContainer}>
                    <Ionicons name="checkmark-circle" size={20} color="#07bbc0" />
                  </View>
                </View>

                {/* Trainer Information */}
                <View style={styles.trainerInfo}>
                  <Text style={styles.trainerName}>
                    {trainer.firstName} {trainer.lastName}
                  </Text>
                  {username ? (
                    <Text style={styles.trainerUsername}>
                      @{username.replace('@', '')}
                    </Text>
                  ) : null}
                  {displayedStyles.length > 0 && (
                    <View style={styles.martialArtsContainer}>
                      {displayedStyles.map((style, index) => (
                        <View key={index} style={styles.martialArtTag}>
                          <Text style={styles.martialArtText}>{style}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  <View style={styles.trainerDetails}>
                    {academyName ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="school-outline" size={12} color="#6b8693" />
                        <Text style={styles.detailText} numberOfLines={1}>{academyName}</Text>
                      </View>
                    ) : null}
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={12} color="#6b8693" />
                      <Text style={styles.detailText} numberOfLines={1}>{location}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="call-outline" size={12} color="#6b8693" />
                      <Text style={styles.detailText}>{phone}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="mail-outline" size={12} color="#6b8693" />
                      <Text style={styles.detailText} numberOfLines={1}>{email}</Text>
                    </View>
                  </View>
                </View>

                {/* View Button */}
                <TouchableOpacity 
                  style={styles.viewButton}
                  onPress={() => handleViewCredentials(trainer)}
                >
                  <Ionicons name="eye-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.viewButtonText}>View</Text>
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={40} color="#6b8693" />
            <Text style={styles.emptyStateText}>No trainers found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try adjusting your search criteria' : 'No approved trainers available yet'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Credentials Modal */}
      {selectedTrainer && (
        <Modal
          visible={showCredentialsModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCredentialsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Trainer Credentials</Text>
                <TouchableOpacity
                  onPress={() => setShowCredentialsModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {selectedTrainer.applicationData ? (
                  <>
                    {/* Profile Summary */}
                    <View style={styles.credentialSection}>
                      <View style={styles.credentialHeader}>
                        {selectedTrainer.profilePicture ? (
                          <Image
                            source={{ uri: selectedTrainer.profilePicture }}
                            style={styles.credentialAvatar}
                          />
                        ) : (
                          <View style={styles.credentialAvatar}>
                            <Ionicons name="person" size={32} color="#FFFFFF" />
                          </View>
                        )}
                        <View style={styles.credentialHeaderInfo}>
                          <Text style={styles.credentialName} numberOfLines={2}>
                            {selectedTrainer.applicationData.fullLegalName}
                          </Text>
                          {selectedTrainer.applicationData.professionalAlias && (
                            <Text style={styles.credentialAlias} numberOfLines={1}>
                              @{selectedTrainer.applicationData.professionalAlias.replace('@', '')}
                            </Text>
                          )}
                        </View>
                      </View>
                      {currentUser?.uid !== selectedTrainer.uid && (
                        <TouchableOpacity
                          style={styles.contactTrainerButton}
                          onPress={() => handleContactTrainer(selectedTrainer)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.contactTrainerButtonText}>Contact Trainer</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Personal Information */}
                    <View style={styles.credentialSection}>
                      <Text style={styles.credentialSectionTitle}>Personal Information</Text>
                      <View style={styles.credentialInfoRow}>
                        <Text style={styles.credentialLabel}>Email:</Text>
                        <Text style={styles.credentialValue}>{selectedTrainer.email}</Text>
                      </View>
                      {selectedTrainer.applicationData.academyName && (
                        <View style={styles.credentialInfoRow}>
                          <Text style={styles.credentialLabel}>Academy:</Text>
                          <Text style={styles.credentialValue}>{selectedTrainer.applicationData.academyName}</Text>
                        </View>
                      )}
                      {selectedTrainer.applicationData.phone && (
                        <View style={styles.credentialInfoRow}>
                          <Text style={styles.credentialLabel}>Phone:</Text>
                          <Text style={styles.credentialValue}>{selectedTrainer.applicationData.phone}</Text>
                        </View>
                      )}
                      {selectedTrainer.applicationData.dateOfBirth && (
                        <View style={styles.credentialInfoRow}>
                          <Text style={styles.credentialLabel}>DOB:</Text>
                          <Text style={styles.credentialValue}>{selectedTrainer.applicationData.dateOfBirth}</Text>
                        </View>
                      )}
                      {selectedTrainer.applicationData.physicalAddress && (
                        <View style={styles.credentialInfoRow}>
                          <Text style={styles.credentialLabel}>Address:</Text>
                          <Text style={styles.credentialValue}>{selectedTrainer.applicationData.physicalAddress}</Text>
                        </View>
                      )}
                    </View>

                    {/* Credentials & Certifications */}
                    <View style={styles.credentialSection}>
                      <Text style={styles.credentialSectionTitle}>Credentials</Text>
                      {selectedTrainer.applicationData.defenseStyles && selectedTrainer.applicationData.defenseStyles.length > 0 && (
                        <View style={styles.credentialInfoRow}>
                          <Text style={styles.credentialLabel}>Styles:</Text>
                          <Text style={styles.credentialValue}>
                            {selectedTrainer.applicationData.defenseStyles.join(', ')}
                          </Text>
                        </View>
                      )}
                      {selectedTrainer.applicationData.yearsOfExperience && (
                        <View style={styles.credentialInfoRow}>
                          <Text style={styles.credentialLabel}>Experience:</Text>
                          <Text style={styles.credentialValue}>{selectedTrainer.applicationData.yearsOfExperience} years</Text>
                        </View>
                      )}
                      {selectedTrainer.applicationData.yearsOfTeaching && (
                        <View style={styles.credentialInfoRow}>
                          <Text style={styles.credentialLabel}>Teaching:</Text>
                          <Text style={styles.credentialValue}>{selectedTrainer.applicationData.yearsOfTeaching} years</Text>
                        </View>
                      )}
                      {selectedTrainer.applicationData.currentRank && (
                        <View style={styles.credentialInfoRow}>
                          <Text style={styles.credentialLabel}>Rank:</Text>
                          <Text style={styles.credentialValue}>{selectedTrainer.applicationData.currentRank}</Text>
                        </View>
                      )}
                    </View>

                    {/* Social Media */}
                    {(selectedTrainer.applicationData.facebookLink || 
                      selectedTrainer.applicationData.instagramLink || 
                      selectedTrainer.applicationData.otherLink) && (
                      <View style={styles.credentialSection}>
                        <Text style={styles.credentialSectionTitle}>Social Media</Text>
                        {selectedTrainer.applicationData.facebookLink && (
                          <View style={styles.credentialInfoRow}>
                            <Text style={styles.credentialLabel}>Facebook:</Text>
                            <Text style={styles.credentialValue} numberOfLines={1}>{selectedTrainer.applicationData.facebookLink}</Text>
                          </View>
                        )}
                        {selectedTrainer.applicationData.instagramLink && (
                          <View style={styles.credentialInfoRow}>
                            <Text style={styles.credentialLabel}>Instagram:</Text>
                            <Text style={styles.credentialValue} numberOfLines={1}>{selectedTrainer.applicationData.instagramLink}</Text>
                          </View>
                        )}
                        {selectedTrainer.applicationData.otherLink && (
                          <View style={styles.credentialInfoRow}>
                            <Text style={styles.credentialLabel}>Other:</Text>
                            <Text style={styles.credentialValue} numberOfLines={1}>{selectedTrainer.applicationData.otherLink}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* About Me */}
                    {selectedTrainer.applicationData.aboutMe && (
                      <View style={styles.credentialSection}>
                        <Text style={styles.credentialSectionTitle}>About Me</Text>
                        <Text style={styles.credentialValue}>{selectedTrainer.applicationData.aboutMe}</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.noDataContainer}>
                    <View style={styles.credentialHeader}>
                      {selectedTrainer.profilePicture ? (
                        <Image
                          source={{ uri: selectedTrainer.profilePicture }}
                          style={styles.credentialAvatar}
                        />
                      ) : (
                        <View style={styles.credentialAvatar}>
                          <Ionicons name="person" size={32} color="#FFFFFF" />
                        </View>
                      )}
                      <View style={styles.credentialHeaderInfo}>
                        <Text style={styles.credentialName} numberOfLines={2}>
                          {selectedTrainer.firstName} {selectedTrainer.lastName}
                        </Text>
                      </View>
                    </View>
                    {currentUser?.uid !== selectedTrainer.uid && (
                      <TouchableOpacity
                        style={styles.contactTrainerButton}
                        onPress={() => handleContactTrainer(selectedTrainer)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.contactTrainerButtonText}>Contact Trainer</Text>
                      </TouchableOpacity>
                    )}
                    <Text style={styles.credentialValue}>{selectedTrainer.email}</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Menu Overlay */}
      {showMenu && (
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleMessages}>
              <Image
                source={require('../../assets/images/messageicon.png')}
                style={styles.menuItemIcon}
              />
              <Text style={styles.menuItemText}>Messages</Text>
              {unreadCount > 0 && (
                <View style={styles.menuUnreadBadge}>
                  <Text style={styles.menuUnreadText}>{unreadDisplay}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowMenu(false); handleLogout(); }}
            >
              <Image
                source={require('../../assets/images/logouticon.png')}
                style={styles.menuItemIcon}
              />
              <Text style={styles.menuItemText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={hideToast}
        duration={4000}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#041527',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 140,
    height: 45,
    resizeMode: 'contain',
  },
  menuButton: {
    padding: 8,
    position: 'relative',
  },
  menuIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
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
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#07bbc0',
    letterSpacing: 2,
    marginBottom: 12,
  },
  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#07bbc0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonFull: {
    flex: 1,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#011f36',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#0a3645',
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
  // Stats
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#011f36',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#07bbc0',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b8693',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#0a3645',
  },
  resultsText: {
    fontSize: 13,
    color: '#6b8693',
    marginBottom: 12,
    fontWeight: '600',
  },
  // Loading
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  // Trainer Card
  trainerCard: {
    backgroundColor: '#011f36',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0a3645',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  checkmarkContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#041527',
    borderRadius: 10,
  },
  trainerInfo: {
    flex: 1,
    paddingRight: 8,
  },
  trainerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  trainerUsername: {
    fontSize: 12,
    color: '#6b8693',
    marginBottom: 6,
  },
  martialArtsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  martialArtTag: {
    backgroundColor: 'rgba(7, 187, 192, 0.15)',
    borderWidth: 1,
    borderColor: '#07bbc0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
  },
  martialArtText: {
    color: '#07bbc0',
    fontSize: 10,
    fontWeight: '600',
  },
  trainerDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    color: '#FFFFFF',
    flex: 1,
  },
  viewButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 14,
    right: 14,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Empty State
  emptyState: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 8,
  },
  emptyStateText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    color: '#6b8693',
    fontSize: 13,
    textAlign: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#011f36',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#07bbc0',
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 134, 147, 0.3)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
  },
  credentialSection: {
    marginBottom: 20,
  },
  credentialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 134, 147, 0.3)',
  },
  credentialAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0a3645',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  credentialHeaderInfo: {
    flex: 1,
  },
  contactTrainerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#07bbc0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  contactTrainerButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  credentialName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  credentialAlias: {
    color: '#6b8693',
    fontSize: 13,
  },
  credentialSectionTitle: {
    color: '#07bbc0',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  credentialInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  credentialLabel: {
    color: '#6b8693',
    fontSize: 12,
    fontWeight: '600',
    width: 80,
    marginRight: 8,
  },
  credentialValue: {
    color: '#FFFFFF',
    fontSize: 12,
    flex: 1,
  },
  noDataContainer: {
    paddingVertical: 16,
  },
  // Menu Overlay
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 14, 28, 0.85)',
    zIndex: 1000,
  },
  menuContainer: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: '#011f36',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0a3645',
    paddingVertical: 8,
    minWidth: 180,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemIcon: {
    width: 22,
    height: 22,
    marginRight: 12,
    resizeMode: 'contain',
  },
  menuItemText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  menuUnreadBadge: {
    backgroundColor: '#e53935',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  menuUnreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
