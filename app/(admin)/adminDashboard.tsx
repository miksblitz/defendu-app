import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthController } from '../controllers/AuthController';

const adminCards = [
  {
    id: 1,
    label: 'Manage Trainer Applications',
    route: '/trainer-applications', // You can add this route later
  },
  {
    id: 2,
    label: 'Manage Users',
    route: '/manage-users', // You can add this route later
  },
  {
    id: 3,
    label: 'Modules',
    route: '/modules', // You can add this route later
  },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

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

  const handleCardPress = (route: string) => {
    // TODO: Navigate to the specific admin section
    console.log('Navigate to:', route);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Header Section */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={() => setShowMenu(true)}
            >
              <Ionicons name="menu" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Image
                source={require('../../assets/images/defendudashboardlogo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.pageTitle}>Admin</Text>
            </View>
          </View>

          {/* Cards Section */}
          <View style={styles.cardsWrapper}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsContainer}
              style={styles.cardsScrollView}
            >
            {adminCards.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={styles.card}
                onPress={() => handleCardPress(card.route)}
                activeOpacity={0.8}
              >
                <ImageBackground
                  source={require('../../assets/images/react-logo.png')} // Placeholder - replace with actual images
                  style={styles.cardBackground}
                  imageStyle={styles.cardBackgroundImage}
                >
                  <View style={styles.cardOverlay}>
                    <View style={styles.cardLabelContainer}>
                      <Text style={styles.cardLabel}>{card.label}</Text>
                    </View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
            </ScrollView>
          </View>
        </View>

        {/* Vertical Navigation Bar - Bottom Left */}
        <View style={styles.bottomNavBar}>
          <TouchableOpacity 
            style={styles.navIconButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Image
              source={require('../../assets/images/blueprofileicon.png')}
              style={styles.navIconImage}
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navIconButton, styles.navIconActive]}
            onPress={() => {}} // Home icon - stay on admin dashboard
            disabled={true}
          >
            <Image
              source={require('../../assets/images/homeicon.png')}
              style={styles.navIconImage}
            />
          </TouchableOpacity>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#0b1625',
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  menuButton: {
    padding: 8,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  logoImage: {
    width: 180,
    height: 60,
    marginBottom: 10,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'system-ui', // Clean sans-serif
    letterSpacing: 0.5,
  },
  cardsWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsScrollView: {
    flexGrow: 0,
  },
  cardsContainer: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  card: {
    width: 300,
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 20,
  },
  cardBackground: {
    width: '100%',
    height: '100%',
  },
  cardBackgroundImage: {
    resizeMode: 'cover',
  },
  cardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 22, 37, 0.7)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 12,
  },
  cardLabelContainer: {
    backgroundColor: 'rgba(51, 51, 51, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 0,
  },
  cardLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'system-ui',
    letterSpacing: 0.3,
  },
  bottomNavBar: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    backgroundColor: 'rgba(11, 22, 37, 0.95)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: 'column',
    gap: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 166, 222, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  navIconButton: {
    padding: 8,
    borderRadius: 8,
  },
  navIconActive: {
    backgroundColor: 'rgba(56, 166, 222, 0.15)',
  },
  navIconImage: {
    width: 32,
    height: 32,
    tintColor: '#38a6de',
    resizeMode: 'contain',
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
