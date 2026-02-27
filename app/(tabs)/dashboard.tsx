import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    ImageBackground,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useLogout } from '../../hooks/useLogout';
import { Module } from '../_models/Module';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';
import { AuthController } from '../controllers/AuthController';

const circleSize = 40;
const strokeWidth = 4;
const radius = (circleSize - strokeWidth) / 2;
const circumference = 2 * Math.PI * radius;

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
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [userName, setUserName] = useState('User');
  const [modules, setModules] = useState<Module[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<{
    similarUserIds: string[];
    recommendedModuleIds: string[];
  } | null>(null);
  const [recommendedModules, setRecommendedModules] = useState<Module[]>([]);
  const [completedModuleIds, setCompletedModuleIds] = useState<string[]>([]);
  const router = useRouter();
  const handleLogout = useLogout();
  const { unreadCount, unreadDisplay, clearUnread } = useUnreadMessages();
  
  // Animation values
  const animatedValues = useRef<Map<string, Animated.Value>>(new Map()).current;
  const weeklyGoalPulse = useRef(new Animated.Value(1)).current;
  
  const getAnimatedValue = (moduleId: string) => {
    if (!animatedValues.has(moduleId)) {
      animatedValues.set(moduleId, new Animated.Value(0));
    }
    return animatedValues.get(moduleId)!;
  };

  useEffect(() => {
    const init = async () => {
      const user = await AuthController.getCurrentUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }
      try {
        setModulesLoading(true);
        const [approved, recs, progress] = await Promise.all([
          AuthController.getApprovedModules(),
          AuthController.getRecommendations(),
          AuthController.getUserProgress(),
        ]);
        setModules(approved);
        setRecommendations(recs);
        setCompletedModuleIds(progress.completedModuleIds);
        if (recs?.recommendedModuleIds?.length) {
          const recommended = await AuthController.getModulesByIds(recs.recommendedModuleIds);
          const notCompleted = recommended.filter((m) => !progress.completedModuleIds.includes(m.moduleId));
          setRecommendedModules(notCompleted);
        } else {
          setRecommendedModules([]);
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
        setModules([]);
      } finally {
        setModulesLoading(false);
      }
    };
    init();
  }, [router]);

  // Animate modules when they load
  useEffect(() => {
    if (!modulesLoading && modules.length > 0) {
      const animations = modules.map((module, index) => {
        const animValue = getAnimatedValue(module.moduleId);
        return Animated.timing(animValue, {
          toValue: 1,
          duration: 600,
          delay: index * 80,
          useNativeDriver: true,
        });
      });
      Animated.stagger(50, animations).start();
    }
  }, [modulesLoading, modules]);

  // Animate recommended modules when they load
  useEffect(() => {
    if (recommendedModules.length > 0) {
      const animations = recommendedModules.map((module, index) => {
        const animValue = getAnimatedValue(`rec-${module.moduleId}`);
        return Animated.timing(animValue, {
          toValue: 1,
          duration: 600,
          delay: index * 80,
          useNativeDriver: true,
        });
      });
      Animated.stagger(50, animations).start();
    }
  }, [recommendedModules]);

  // Pulse animation for weekly goal
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(weeklyGoalPulse, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(weeklyGoalPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, []);

  // Get current day name
  const currentDay = new Date().getDay();
  const todayName = days[currentDay];

  const handleMessages = () => {
    clearUnread();
    setShowMenu(false);
    router.push('/messages');
  };

  const handleModulePress = (module: Module) => {
    setSelectedModule(module.moduleId);
    router.push(`/view-module?moduleId=${module.moduleId}` as any);
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
          <View style={styles.sidebarTopButtonWrap}>
            <TouchableOpacity 
              style={styles.sidebarTopButton}
              onPress={() => { clearUnread(); setShowMenu(true); }}
            >
              <Image
                source={require('../../assets/images/threedoticon.png')}
                style={styles.threeDotIcon}
              />
            </TouchableOpacity>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadDisplay}</Text>
              </View>
            )}
          </View>

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

            {/* Recommended for you: best-suited modules (refreshes every 5 completed modules) */}
            {recommendedModules.length > 0 && (
              <View style={styles.recommendationsSection}>
                <View style={styles.recommendationsSectionHeader}>
                  <Text style={styles.recommendationsTitle}>Recommended for you</Text>
                  <Text style={styles.recommendationsSubtext}>
                    Best suited to your profile. Updates every 5 modules you complete.
                  </Text>
                </View>
                <View style={styles.recommendedModulesRow}>
                  {recommendedModules.slice(0, 8).map((module, index) => {
                    const isEndOfRow = (index + 1) % 4 === 0;
                    const durationMin = module.videoDuration ? `${Math.ceil(module.videoDuration / 60)} min` : '';
                    const animValue = getAnimatedValue(`rec-${module.moduleId}`);
                    const imageSource = module.thumbnailUrl 
                      ? { uri: module.thumbnailUrl }
                      : require('../../assets/images/managemodulepic.png');
                    
                    return (
                      <Animated.View
                        key={module.moduleId}
                        style={[
                          styles.moduleCard,
                          isEndOfRow && styles.moduleCardEndOfRow,
                          {
                            opacity: animValue,
                            transform: [
                              {
                                translateY: animValue.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [50, 0],
                                }),
                              },
                              {
                                scale: animValue.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.9, 1],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={[
                            styles.moduleCardTouchable,
                            selectedModule === module.moduleId && styles.moduleCardSelected,
                          ]}
                          onPress={() => handleModulePress(module)}
                          accessibilityRole="button"
                          accessibilityLabel={`Open recommended module ${module.moduleTitle}`}
                          activeOpacity={0.85}
                        >
                          <ImageBackground
                            source={imageSource}
                            style={styles.moduleCardBackground}
                            imageStyle={styles.moduleCardBackgroundImage}
                          >
                            <View style={styles.moduleCardOverlay}>
                              <View style={styles.moduleHeader}>
                                <Text style={styles.moduleHeaderText} numberOfLines={1}>
                                  {module.category}
                                </Text>
                              </View>
                              <View style={styles.moduleCardContent}>
                                <Text style={styles.moduleTitle} numberOfLines={2}>
                                  {module.moduleTitle}
                                </Text>
                                <Text style={styles.moduleDescription} numberOfLines={2}>
                                  {module.description}
                                </Text>
                                {durationMin ? (
                                  <View style={styles.moduleDurationBadge}>
                                    <Text style={styles.moduleDuration}>{durationMin}</Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                          </ImageBackground>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Weekly Goal */}
            <Animated.View style={[
              styles.weeklyGoalContainer,
              { transform: [{ scale: weeklyGoalPulse }] }
            ]}>
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
            </Animated.View>

            {/* Training Modules */}
            <View style={styles.trainingHeader}>
              <Text style={styles.trainingTitle}>TRAINING MODULES</Text>
              <Text style={styles.trainingSubtitle}>
                Continue your martial arts journey
              </Text>
            </View>
            <View style={styles.modulesContainer}>
              {modulesLoading ? (
                <View style={styles.modulesLoadingContainer}>
                  <ActivityIndicator size="large" color="#07bbc0" />
                  <Text style={styles.modulesLoadingText}>Loading modules...</Text>
                </View>
              ) : modules.length === 0 ? (
                <View style={styles.modulesEmptyContainer}>
                  <Text style={styles.modulesEmptyText}>No modules available yet.</Text>
                  <Text style={styles.modulesEmptySubtext}>Check back later for new training content.</Text>
                </View>
              ) : (
                modules.map((module, index) => {
                  const isEndOfRow = (index + 1) % 4 === 0;
                  const durationMin = module.videoDuration ? `${Math.ceil(module.videoDuration / 60)} min` : '';
                  const animValue = getAnimatedValue(module.moduleId);
                  const imageSource = module.thumbnailUrl 
                    ? { uri: module.thumbnailUrl }
                    : require('../../assets/images/managemodulepic.png');
                  
                  return (
                    <Animated.View
                      key={module.moduleId}
                      style={[
                        styles.moduleCard,
                        isEndOfRow && styles.moduleCardEndOfRow,
                        {
                          opacity: animValue,
                          transform: [
                            {
                              translateY: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [50, 0],
                              }),
                            },
                            {
                              scale: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.9, 1],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.moduleCardTouchable,
                          selectedModule === module.moduleId && styles.moduleCardSelected,
                        ]}
                        onPress={() => handleModulePress(module)}
                        accessibilityRole="button"
                        accessibilityLabel={`Open training module ${module.moduleTitle}`}
                        activeOpacity={0.85}
                      >
                        <ImageBackground
                          source={imageSource}
                          style={styles.moduleCardBackground}
                          imageStyle={styles.moduleCardBackgroundImage}
                        >
                          <View style={styles.moduleCardOverlay}>
                            <View style={styles.moduleHeader}>
                              <Text style={styles.moduleHeaderText} numberOfLines={1}>
                                {module.category}
                              </Text>
                            </View>
                            <View style={styles.moduleCardContent}>
                              <Text style={styles.moduleTitle} numberOfLines={2}>
                                {module.moduleTitle}
                              </Text>
                              <Text style={styles.moduleDescription} numberOfLines={2}>
                                {module.description}
                              </Text>
                              {durationMin ? (
                                <View style={styles.moduleDurationBadge}>
                                  <Text style={styles.moduleDuration}>{durationMin}</Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                        </ImageBackground>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })
              )}
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
              {unreadCount > 0 && (
                <View style={styles.menuUnreadBadge}>
                  <Text style={styles.menuUnreadBadgeText}>{unreadDisplay}</Text>
                </View>
              )}
            </TouchableOpacity>
            
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
  sidebarTopButtonWrap: {
    position: 'relative',
  },
  sidebarTopButton: {
    padding: 8,
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
  recommendationsSection: {
    marginBottom: 24,
  },
  recommendationsSectionHeader: {
    marginBottom: 12,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#07bbc0',
    marginBottom: 4,
  },
  recommendationsSubtext: {
    fontSize: 13,
    color: '#6b8693',
  },
  recommendedModulesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weeklyGoalContainer: {
    backgroundColor: '#041527',
    borderRadius: 28,
    padding: 28,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#000E1C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
  modulesLoadingContainer: {
    width: '100%',
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  modulesLoadingText: {
    color: '#6b8693',
    fontSize: 15,
    fontWeight: '500',
  },
  modulesEmptyContainer: {
    width: '100%',
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#041527',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#0a3645',
    borderStyle: 'dashed',
  },
  modulesEmptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modulesEmptySubtext: {
    color: '#6b8693',
    fontSize: 15,
  },
  moduleCard: {
    width: moduleCardWidth,
    minHeight: 260,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: moduleCardMarginRight,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  moduleCardEndOfRow: {
    marginRight: 0,
  },
  moduleCardTouchable: {
    width: '100%',
    height: '100%',
  },
  moduleCardSelected: {
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    transform: [{ scale: 1.03 }],
  },
  moduleCardBackground: {
    width: '100%',
    height: '100%',
    minHeight: 260,
  },
  moduleCardBackgroundImage: {
    resizeMode: 'cover',
    borderRadius: 24,
  },
  moduleCardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 21, 39, 0.75)',
    justifyContent: 'space-between',
    padding: 0,
  },
  moduleCardContent: {
    padding: 16,
    paddingTop: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  moduleHeader: {
    backgroundColor: 'rgba(6, 39, 49, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  moduleTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  moduleDescription: {
    color: '#b8cdd9',
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  moduleDurationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(7, 187, 192, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 4,
  },
  moduleDuration: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    top: 20,
    left: 90,
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
  menuUnreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  menuUnreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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