import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import {
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { AuthController } from '../controllers/AuthController';
import { User } from '../models/User';
import { TrainerApplication } from '../models/TrainerApplication';

interface TrainerWithData extends User {
  applicationData?: TrainerApplication | null;
}

export default function TrainerPage() {
  const router = useRouter();
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

  const checkCurrentUserTrainerStatus = async () => {
    try {
      const user = await AuthController.getCurrentUser();
      setCurrentUser(user);
      if (user && user.role === 'trainer' && user.trainerApproved === true) {
        setIsCurrentUserTrainer(true);
      }
    } catch (error) {
      console.error('Error checking user trainer status:', error);
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
          // Still add the trainer even if application data fails to load
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
      // If user is already a trainer, navigate to edit trainer profile
      router.push('/edit-trainer-profile');
    } else {
      router.push('/trainer-registration');
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

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
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
        <View style={styles.mainContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../assets/images/defendudashboardlogo.png')}
                style={styles.logoImage}
              />
              <Text style={styles.pageTitle}>TRAINERS</Text>
            </View>
            <View style={styles.headerButtons}>
              {isCurrentUserTrainer && (
                <TouchableOpacity 
                  style={styles.publishModuleButton}
                  onPress={() => router.push('/publish-module' as any)}
                >
                  <Ionicons 
                    name="cloud-upload-outline" 
                    size={18} 
                    color="#FFFFFF" 
                    style={{ marginRight: 6 }} 
                  />
                  <Text style={styles.publishModuleButtonText}>
                    Publish Module
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.registerButton}
                onPress={handleRegisterTrainer}
              >
                <Ionicons 
                  name={isCurrentUserTrainer ? "create-outline" : "person-add-outline"} 
                  size={18} 
                  color="#FFFFFF" 
                  style={{ marginRight: 6 }} 
                />
                <Text style={styles.registerButtonText}>
                  {isCurrentUserTrainer ? 'Edit Trainer Profile' : 'Register as a certified Trainer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#6b8693" style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
              placeholder="Search trainers, specialties, or academies..."
              placeholderTextColor="#6b8693"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#6b8693" />
              </TouchableOpacity>
            )}
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalTrainers}</Text>
              <Text style={styles.statLabel}>Total Trainers</Text>
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
          ) : (
            <ScrollView 
              style={styles.trainerList}
              contentContainerStyle={styles.trainerListContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredTrainers.length > 0 ? (
                filteredTrainers.map((trainer) => {
                  const appData = trainer.applicationData;
                  const allStyles = appData?.defenseStyles || trainer.preferredTechnique || [];
                  const displayedStyles = allStyles.slice(0, 3); // Get up to 3 martial arts
                  const username = appData?.professionalAlias || trainer.username || '';
                  const academyName = appData?.academyName || '';
                  const location = appData?.physicalAddress || 'Location not provided';
                  const phone = appData?.phone || 'Phone not provided';
                  const email = trainer.email || 'Email not provided';

                  return (
                    <View 
                      key={trainer.uid} 
                      style={styles.trainerCard}
                    >
                      {/* Avatar with checkmark */}
                      <View style={styles.avatarContainer}>
                        {trainer.profilePicture ? (
                          <Image
                            source={{ uri: trainer.profilePicture }}
                            style={styles.avatar}
                          />
                        ) : (
                          <View style={styles.avatar}>
                            <Ionicons name="person" size={40} color="#FFFFFF" />
                          </View>
                        )}
                        <View style={styles.checkmarkContainer}>
                          <Ionicons name="checkmark-circle" size={24} color="#07bbc0" />
                        </View>
                      </View>

                      {/* Trainer Information */}
                      <View style={styles.trainerInfo}>
                        <Text style={styles.trainerName}>
                          {trainer.firstName} {trainer.lastName}
                        </Text>
                        {username && (
                          <Text style={styles.trainerUsername}>
                            @{username.replace('@', '')}
                          </Text>
                        )}
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
                          {academyName && (
                            <View style={styles.detailRow}>
                              <Ionicons name="school-outline" size={14} color="#6b8693" />
                              <Text style={styles.detailText}>{academyName}</Text>
                            </View>
                          )}
                          <View style={styles.detailRow}>
                            <Ionicons name="location-outline" size={14} color="#6b8693" />
                            <Text style={styles.detailText}>{location}</Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Ionicons name="call-outline" size={14} color="#6b8693" />
                            <Text style={styles.detailText}>{phone}</Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Ionicons name="mail-outline" size={14} color="#6b8693" />
                            <Text style={styles.detailText}>{email}</Text>
                          </View>
                        </View>
                      </View>

                      {/* View Button */}
                      <TouchableOpacity 
                        style={styles.viewButton}
                        onPress={() => handleViewCredentials(trainer)}
                      >
                        <Ionicons name="eye-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.viewButtonText}>View</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color="#6b8693" />
                  <Text style={styles.emptyStateText}>No trainers found</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {searchQuery ? 'Try adjusting your search criteria' : 'No approved trainers available yet'}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>

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
                  <Ionicons name="close" size={24} color="#FFFFFF" />
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
                            <Ionicons name="person" size={40} color="#FFFFFF" />
                          </View>
                        )}
                        <View style={styles.credentialHeaderInfo}>
                          <Text style={styles.credentialName}>
                            {selectedTrainer.applicationData.fullLegalName}
                          </Text>
                          {selectedTrainer.applicationData.professionalAlias && (
                            <Text style={styles.credentialAlias}>
                              @{selectedTrainer.applicationData.professionalAlias.replace('@', '')}
                            </Text>
                          )}
                        </View>
                      </View>
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
                          <Text style={styles.credentialLabel}>Academy Name:</Text>
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
                          <Text style={styles.credentialLabel}>Date of Birth:</Text>
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
                      <Text style={styles.credentialSectionTitle}>Credentials & Certifications</Text>
                      {selectedTrainer.applicationData.defenseStyles && selectedTrainer.applicationData.defenseStyles.length > 0 && (
                        <View style={styles.credentialInfoRow}>
                          <Text style={styles.credentialLabel}>Defense Styles:</Text>
                          <Text style={styles.credentialValue}>
                            {selectedTrainer.applicationData.defenseStyles.join(', ')}
                          </Text>
                        </View>
                      )}
                      {selectedTrainer.applicationData.yearsOfExperience && (
                        <View style={styles.credentialInfoRow}>
                          <Text style={styles.credentialLabel}>Years of Experience:</Text>
                          <Text style={styles.credentialValue}>{selectedTrainer.applicationData.yearsOfExperience} years</Text>
                        </View>
                      )}
                      {selectedTrainer.applicationData.yearsOfTeaching && (
                        <View style={styles.credentialInfoRow}>
                          <Text style={styles.credentialLabel}>Years of Teaching:</Text>
                          <Text style={styles.credentialValue}>{selectedTrainer.applicationData.yearsOfTeaching} years</Text>
                        </View>
                      )}
                      {selectedTrainer.applicationData.currentRank && (
                        <View style={styles.credentialInfoRow}>
                          <Text style={styles.credentialLabel}>Current Rank:</Text>
                          <Text style={styles.credentialValue}>{selectedTrainer.applicationData.currentRank}</Text>
                        </View>
                      )}
                    </View>

                    {/* Social Media Links */}
                    {(selectedTrainer.applicationData.facebookLink || 
                      selectedTrainer.applicationData.instagramLink || 
                      selectedTrainer.applicationData.otherLink) && (
                      <View style={styles.credentialSection}>
                        <Text style={styles.credentialSectionTitle}>Social Media</Text>
                        {selectedTrainer.applicationData.facebookLink && (
                          <View style={styles.credentialInfoRow}>
                            <Text style={styles.credentialLabel}>Facebook:</Text>
                            <Text style={styles.credentialValue}>{selectedTrainer.applicationData.facebookLink}</Text>
                          </View>
                        )}
                        {selectedTrainer.applicationData.instagramLink && (
                          <View style={styles.credentialInfoRow}>
                            <Text style={styles.credentialLabel}>Instagram:</Text>
                            <Text style={styles.credentialValue}>{selectedTrainer.applicationData.instagramLink}</Text>
                          </View>
                        )}
                        {selectedTrainer.applicationData.otherLink && (
                          <View style={styles.credentialInfoRow}>
                            <Text style={styles.credentialLabel}>Other:</Text>
                            <Text style={styles.credentialValue}>{selectedTrainer.applicationData.otherLink}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* About Me */}
                    {selectedTrainer.applicationData.aboutMe && (
                      <View style={styles.credentialSection}>
                        <Text style={styles.credentialSectionTitle}>About Me</Text>
                        <View style={styles.credentialInfoRow}>
                          <Text style={styles.credentialValue}>{selectedTrainer.applicationData.aboutMe}</Text>
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>No application data available</Text>
                    <Text style={styles.credentialName}>
                      {selectedTrainer.firstName} {selectedTrainer.lastName}
                    </Text>
                    <Text style={styles.credentialValue}>{selectedTrainer.email}</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

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
  sidebarTopButton: {
    padding: 8,
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
  threeDotIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  headerLeft: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoImage: {
    width: 180,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#07bbc0',
    letterSpacing: 2,
  },
  registerButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  publishModuleButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  publishModuleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
    borderColor: '#0a3645',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    padding: 0,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#011f36',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#07bbc0',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b8693',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#0a3645',
  },
  resultsText: {
    fontSize: 14,
    color: '#6b8693',
    marginBottom: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  trainerList: {
    flex: 1,
  },
  trainerListContent: {
    paddingBottom: 40,
  },
  trainerCard: {
    backgroundColor: '#011f36',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0a3645',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  checkmarkContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#041527',
    borderRadius: 12,
  },
  trainerInfo: {
    flex: 1,
    paddingRight: 10,
  },
  trainerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  trainerUsername: {
    fontSize: 14,
    color: '#6b8693',
    marginBottom: 8,
  },
  martialArtsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  martialArtTag: {
    backgroundColor: 'rgba(7, 187, 192, 0.15)',
    borderWidth: 1,
    borderColor: '#07bbc0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  martialArtText: {
    color: '#07bbc0',
    fontSize: 12,
    fontWeight: '600',
  },
  trainerDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    flex: 1,
  },
  viewButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#6b8693',
    fontSize: 14,
  },
  // Modal Styles
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
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#07bbc0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 134, 147, 0.3)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  credentialSection: {
    marginBottom: 24,
  },
  credentialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 134, 147, 0.3)',
  },
  credentialAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0a3645',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  credentialHeaderInfo: {
    flex: 1,
  },
  credentialName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  credentialAlias: {
    color: '#6b8693',
    fontSize: 14,
  },
  credentialSectionTitle: {
    color: '#07bbc0',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  credentialInfoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  credentialLabel: {
    color: '#6b8693',
    fontSize: 14,
    fontWeight: '600',
    width: 140,
    marginRight: 12,
  },
  credentialValue: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(7, 187, 192, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  fileName: {
    color: '#07bbc0',
    fontSize: 14,
    flex: 1,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    color: '#6b8693',
    fontSize: 16,
    marginBottom: 16,
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
