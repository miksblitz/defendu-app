import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { AuthController } from '../controllers/AuthController';
import { OfflineStorage } from '../utils/offlineStorage';

const circleSize = 40;
const strokeWidth = 4;
const radius = (circleSize - strokeWidth) / 2;
const circumference = 2 * Math.PI * radius;

const trainingModules = [
  { 
    key: 'Module 1',
    title: 'Basic Stance & Movement',
    description: 'Learn fundamental footwork',
    progress: 0.75,
    duration: '15 min',
    completed: false
  },
  { 
    key: 'Module 2',
    title: 'Striking Techniques',
    description: 'Master basic strikes',
    progress: 0.45,
    duration: '20 min',
    completed: false
  },
  { 
    key: 'Module 3',
    title: 'Defense & Blocks',
    description: 'Defensive movements',
    progress: 0.30,
    duration: '18 min',
    completed: false
  },
  { 
    key: 'Module 4',
    title: 'Ground Control',
    description: 'Ground fighting basics',
    progress: 0,
    duration: '25 min',
    completed: false
  },
  { 
    key: 'Module 5',
    title: 'Sparring Intro',
    description: 'Applied techniques',
    progress: 0,
    duration: '30 min',
    completed: false
  },
];

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Realistic progress values - showing some completed days
const progressValues = [1, 0.8, 0.6, 0.3, 0, 0, 0]; // Progress for each day

// Get screen width for horizontal scrolling
const screenWidth = Dimensions.get('window').width;
// Calculate module card width to fit exactly 4 in a row
// Available width = screenWidth - sidebar(80) - mainContentContainer padding(60) - modulesContainer padding(24)
// For 4 cards: 3 gaps of 12px between them (no gap after the 4th card)
const availableWidth = screenWidth - 80 - 60 - 24;
const gapBetweenCards = 12; // Gap between cards (not after last card in row)
const totalGapsFor4Cards = gapBetweenCards * 3; // 3 gaps between 4 cards
const moduleCardWidth = Math.floor((availableWidth - totalGapsFor4Cards) / 4); // Floor to ensure it fits
const moduleCardMarginRight = gapBetweenCards;

export default function DashboardScreen() {
  const [selectedDay, setSelectedDay] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [userName, setUserName] = useState('User');
  const router = useRouter();

  // Get current day name
  const currentDay = new Date().getDay();
  const todayName = days[currentDay];

  const handleLogout = async () => {
    try {
      // Clear all session data
      await AuthController.logout();
      await OfflineStorage.clearOfflineData();
      
      // Clear navigation history and prevent back navigation
      router.dismissAll();
      router.replace('/(auth)/login');
      
      // Prevent back button navigation
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState(null, '', window.location.href);
        window.onpopstate = () => {
          window.history.pushState(null, '', window.location.href);
        };
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleMessages = () => {
    setShowMenu(false);
    // TODO: Navigate to messages page
    console.log('Navigate to messages');
  };

  const handleModulePress = (index: number) => {
    setSelectedModule(index);
    // TODO: Navigate to module details or start training
    console.log('Open module:', trainingModules[index].title);
  };

  // Calculate overall weekly progress
  const weeklyProgress = progressValues.reduce((acc, val) => acc + val, 0) / days.length;

  const CircularProgress = ({ progress }: { progress: number }) => {
    const strokeDashoffset = circumference * (1 - progress);
    return (
      <Svg height={circleSize} width={circleSize}>
        <Circle
          stroke="#0a3645"
          fill="none"
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke="#07bbc0"
          fill="none"
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${circleSize / 2}, ${circleSize / 2}`}
        />
      </Svg>
    );
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

            <TouchableOpacity 
              style={styles.sidebarButton}
              onPress={() => router.push('/trainer')}
            >
              <Image
                source={require('../../assets/images/trainericon.png')}
                style={styles.iconImage}
              />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.sidebarButton, styles.sidebarActive]}>
              <Image
                source={require('../../assets/images/homeicon.png')}
                style={styles.iconImage}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content */}
        <ScrollView
          horizontal
          style={styles.mainContentScrollView}
          contentContainerStyle={styles.mainContentHorizontalContainer}
          showsHorizontalScrollIndicator={true}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          bounces={true}
          decelerationRate="fast"
        >
          <ScrollView
            style={styles.mainContentVerticalScrollView}
            contentContainerStyle={styles.mainContentContainer}
            showsVerticalScrollIndicator={true}
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* Welcome Header */}
            <View style={styles.welcomeSection}>
              <Image
                source={require('../../assets/images/defendudashboardlogo.png')}
                style={styles.logoImage}
              />
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeText}>Welcome back, {userName}!</Text>
                <Text style={styles.welcomeSubtext}>Today is {todayName} - Let's keep training</Text>
              </View>
            </View>

            {/* Weekly Goal */}
            <View style={styles.weeklyGoalContainer}>
              <View style={styles.weeklyGoalHeader}>
                <View>
                  <Text style={styles.weeklyGoalTitle}>Weekly Goal</Text>
                  <Text style={styles.weeklyGoalSubtitle}>
                    Track your training progress
                  </Text>
                </View>
                <View style={styles.weeklyGoalStats}>
                  <Text style={styles.weeklyGoalPercentage}>
                    {Math.round(weeklyProgress * 100)}%
                  </Text>
                  <Text style={styles.weeklyGoalLabel}>Complete</Text>
                </View>
              </View>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${weeklyProgress * 100}%` }]} />
              </View>
              <View style={styles.weekDaysContainer}>
                {days.map((day, i) => (
                  <TouchableOpacity
                    key={day}
                    onPress={() => setSelectedDay(i)}
                    style={styles.dayProgressContainer}
                    accessibilityRole="button"
                    accessibilityLabel={`Select day ${day}`}
                    accessibilityState={{ selected: selectedDay === i }}
                  >
                    <CircularProgress progress={progressValues[i]} />
                    <View
                      style={[
                        styles.dayLabelContainer,
                        i === selectedDay && styles.dayLabelContainerSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayLabel,
                          i === selectedDay && styles.dayLabelActive,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Training Modules */}
            <View style={styles.trainingHeader}>
              <Text style={styles.trainingTitle}>TRAINING MODULES</Text>
              <Text style={styles.trainingSubtitle}>
                Continue your martial arts journey
              </Text>
            </View>
            <View style={styles.modulesContainer}>
              {trainingModules.map((module, index) => {
                // Remove right margin from every 4th card (end of row)
                const isEndOfRow = (index + 1) % 4 === 0;
                return (
                <TouchableOpacity
                  key={module.key}
                  style={[
                    styles.moduleCard,
                    selectedModule === index && styles.moduleCardSelected,
                    isEndOfRow && styles.moduleCardEndOfRow,
                  ]}
                  onPress={() => handleModulePress(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open training module ${module.title}`}
                >
                  <View style={styles.moduleHeader}>
                    <Text style={styles.moduleHeaderText}>{module.key}</Text>
                    {module.completed && (
                      <View style={styles.moduleCompleteBadge}>
                        <Text style={styles.moduleCompleteText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.moduleContent}>
                    <View style={styles.moduleThumbnail}>
                      <Text style={styles.moduleThumbnailIcon}>🥋</Text>
                    </View>
                    <View style={styles.moduleInfo}>
                      <Text style={styles.moduleTitle}>{module.title}</Text>
                      <Text style={styles.moduleDescription}>{module.description}</Text>
                      <Text style={styles.moduleDuration}>{module.duration}</Text>
                    </View>
                    {/* Progress bar for module */}
                    {module.progress > 0 && (
                      <View style={styles.moduleProgressContainer}>
                        <View style={styles.moduleProgressBar}>
                          <View 
                            style={[
                              styles.moduleProgressFill, 
                              { width: `${module.progress * 100}%` }
                            ]} 
                          />
                        </View>
                        <Text style={styles.moduleProgressText}>
                          {Math.round(module.progress * 100)}%
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#041527' },
  container: { flex: 1, flexDirection: 'row' },
  sidebar: {
    backgroundColor: '#000E1C',
    width: 80,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
    justifyContent: 'space-between', // Space between top icon and bottom icons
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
  mainContentScrollView: {
    flex: 1,
  },
  mainContentHorizontalContainer: {
    minWidth: screenWidth - 80, // Screen width minus sidebar width
  },
  mainContentVerticalScrollView: {
    width: screenWidth - 80, // Fixed width to enable horizontal scrolling
  },
  mainContentContainer: {
    paddingHorizontal: 30,
    paddingVertical: 25,
    paddingBottom: 40,
    width: screenWidth - 80, // Fixed width to enable horizontal scrolling
  },
  logoImage: {
    width: 180,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  welcomeSection: {
    marginBottom: 30,
  },
  welcomeTextContainer: {
    marginTop: 5,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#6b8693',
  },
  weeklyGoalContainer: {
    backgroundColor: '#041527',
    borderRadius: 25,
    padding: 25,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#000E1C',
  },
  weeklyGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  weeklyGoalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  weeklyGoalSubtitle: {
    fontSize: 14,
    color: '#6b8693',
  },
  weeklyGoalStats: {
    alignItems: 'flex-end',
  },
  weeklyGoalPercentage: {
    fontSize: 32,
    fontWeight: '700',
    color: '#07bbc0',
  },
  weeklyGoalLabel: {
    fontSize: 12,
    color: '#6b8693',
    marginTop: -4,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#0a3645',
    borderRadius: 8,
    marginBottom: 20,
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#07bbc0',
    borderRadius: 8,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayProgressContainer: {
    alignItems: 'center',
  },
  dayLabelContainer: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dayLabelContainerSelected: {
    backgroundColor: '#0097A7',
  },
  dayLabel: {
    color: '#6b8693',
    fontSize: 14,
  },
  dayLabelActive: {
    color: '#041527',
  },
  trainingHeader: {
    marginBottom: 15,
  },
  trainingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#07bbc0',
    letterSpacing: 2,
    marginBottom: 4,
  },
  trainingSubtitle: {
    fontSize: 14,
    color: '#6b8693',
  },
  modulesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 10,
    justifyContent: 'flex-start',
  },
  moduleCard: {
    width: moduleCardWidth,
    minHeight: 240,
    borderRadius: 20,
    backgroundColor: '#011f36',
    overflow: 'hidden',
    marginRight: moduleCardMarginRight,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moduleCardEndOfRow: {
    marginRight: 0, // Remove right margin from cards at the end of each row
  },
  moduleCardSelected: {
    borderColor: '#07bbc0',
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  moduleHeader: {
    backgroundColor: '#062731',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleHeaderText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  moduleCompleteBadge: {
    backgroundColor: '#4CAF50',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleCompleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  moduleContent: {
    padding: 16,
  },
  moduleThumbnail: {
    width: '100%',
    height: 90,
    backgroundColor: '#0a3645',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleThumbnailIcon: {
    fontSize: 40,
  },
  moduleInfo: {
    marginBottom: 12,
  },
  moduleTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  moduleDescription: {
    color: '#6b8693',
    fontSize: 12,
    marginBottom: 6,
  },
  moduleDuration: {
    color: '#07bbc0',
    fontSize: 11,
    fontWeight: '600',
  },
  moduleProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moduleProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#0a3645',
    borderRadius: 3,
    overflow: 'hidden',
  },
  moduleProgressFill: {
    height: '100%',
    backgroundColor: '#07bbc0',
    borderRadius: 3,
  },
  moduleProgressText: {
    color: '#6b8693',
    fontSize: 11,
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
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