import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AuthController } from '../controllers/AuthController';

// Sample trainer data - replace with actual data from database
const trainers = [
  {
    id: 1,
    name: 'Mike Robaniel',
    username: '@Miksblitz',
    title: 'jiu-jitsu Trainer',
    academy: 'Elite BJJ Academy',
    location: 'New York, NY',
    phone: '+1 (555) 123-4567',
    email: 'mike.robaniel@example.com',
  },
  {
    id: 2,
    name: 'Chris Evans',
    username: '@ChrisTKD',
    title: 'Taekwondo Instructor',
    academy: 'Dynamic TKD Studio',
    location: 'Los Angeles, CA',
    phone: '+1 (555) 234-5678',
    email: 'chris.evans@example.com',
  },
  {
    id: 3,
    name: 'James Bond',
    username: '@JBond007',
    title: 'Self-Defense Specialist',
    academy: 'Defense Academy',
    location: 'London, UK',
    phone: '+44 20 7946 0958',
    email: 'james.bond@example.com',
  },
];

export default function TrainerPage() {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState<number | null>(null);

  // Get stats
  const totalTrainers = trainers.length;
  const specialties = [...new Set(trainers.map(t => t.title))].length;

  // Filter trainers based on search
  const filteredTrainers = trainers.filter(trainer =>
    trainer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trainer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trainer.academy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMessage = (trainerId: number) => {
    setSelectedTrainer(trainerId);
    // TODO: Implement message functionality
    console.log('Message trainer:', trainerId);
  };

  const handleRegisterTrainer = () => {
    // TODO: Implement trainer registration
    console.log('Register as trainer');
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
            <TouchableOpacity 
              style={styles.registerButton}
              onPress={handleRegisterTrainer}
            >
              <Ionicons name="person-add-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.registerButtonText}>Register as a certified Trainer</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#6b8693" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
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
          <ScrollView 
            style={styles.trainerList}
            contentContainerStyle={styles.trainerListContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredTrainers.length > 0 ? (
              filteredTrainers.map((trainer) => (
                <View 
                  key={trainer.id} 
                  style={[
                    styles.trainerCard,
                    selectedTrainer === trainer.id && styles.trainerCardSelected,
                  ]}
                >
                  {/* Avatar with checkmark */}
                  <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                      <View style={styles.avatarPlaceholder} />
                    </View>
                    <View style={styles.checkmarkContainer}>
                      <Ionicons name="checkmark-circle" size={24} color="#07bbc0" />
                    </View>
                  </View>

                  {/* Trainer Information */}
                  <View style={styles.trainerInfo}>
                    <Text style={styles.trainerName}>{trainer.name}</Text>
                    <Text style={styles.trainerUsername}>
                      {trainer.username} | {trainer.title}
                    </Text>
                    
                    <View style={styles.trainerDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="business-outline" size={14} color="#6b8693" />
                        <Text style={styles.detailText}>{trainer.academy}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={14} color="#6b8693" />
                        <Text style={styles.detailText}>{trainer.location}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={14} color="#6b8693" />
                        <Text style={styles.detailText}>{trainer.phone}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="mail-outline" size={14} color="#6b8693" />
                        <Text style={styles.detailText}>{trainer.email}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Message Button */}
                  <TouchableOpacity 
                    style={styles.messageButton}
                    onPress={() => handleMessage(trainer.id)}
                  >
                    <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color="#6b8693" />
                <Text style={styles.emptyStateText}>No trainers found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Try adjusting your search criteria
                </Text>
              </View>
            )}
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
    backgroundColor: '#031A23',
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
  trainerCardSelected: {
    borderColor: '#07bbc0',
    backgroundColor: '#062731',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2E7D32',
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
    marginBottom: 12,
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
  detailLabel: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messageButton: {
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
  messageButtonText: {
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
