import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
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
const progressValues = [1, 0.8, 0.6, 0.3, 0, 0, 0];

const screenWidth = Dimensions.get('window').width;
// Mobile: 2 cards per row with padding
const horizontalPadding = 20;
const gapBetweenCards = 12;
const moduleCardWidth = Math.floor((screenWidth - horizontalPadding * 2 - gapBetweenCards) / 2);

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

  useEffect(() => {
    const init = async () => {
      const user = await AuthController.getCurrentUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }
      setUserName(user.firstName || 'User');
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with menu */}
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

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back, {userName}!</Text>
          <Text style={styles.welcomeSubtext}>Today is {todayName} - Let's keep training</Text>
        </View>

        {/* Weekly Goals */}
        <View style={styles.weeklyGoalContainer}>
          <View style={styles.weeklyGoalHeader}>
            <View>
              <Text style={styles.weeklyGoalTitle}>Weekly Goals</Text>
              <Text style={styles.weeklyGoalSubtitle}>Track your progress</Text>
            </View>
            <View style={styles.weeklyGoalStats}>
              <Text style={styles.weeklyGoalPercentage}>{Math.round(weeklyProgress * 100)}%</Text>
              <Text style={styles.weeklyGoalLabel}>Complete</Text>
            </View>
          </View>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${weeklyProgress * 100}%` }]} />
          </View>
          <View style={styles.weekDaysContainer}>
            {days.map((day, index) => (
              <TouchableOpacity
                key={day}
                onPress={() => setSelectedDay(index)}
                style={styles.dayProgressContainer}
              >
                <CircularProgress progress={progressValues[index]} />
                <View style={[
                  styles.dayLabelContainer,
                  selectedDay === index && styles.dayLabelContainerSelected
                ]}>
                  <Text style={[
                    styles.dayLabel,
                    selectedDay === index && styles.dayLabelActive
                  ]}>{day}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recommended Modules */}
        {recommendedModules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommended for you</Text>
            <Text style={styles.sectionSubtitle}>
              Best suited to your profile
            </Text>
            <View style={styles.modulesGrid}>
              {recommendedModules.slice(0, 4).map((module, index) => {
                const durationMin = module.videoDuration ? `${Math.ceil(module.videoDuration / 60)} min` : '';
                return (
                  <TouchableOpacity
                    key={module.moduleId}
                    style={[
                      styles.moduleCard,
                      selectedModule === module.moduleId && styles.moduleCardSelected,
                    ]}
                    onPress={() => handleModulePress(module)}
                  >
                    <View style={styles.moduleHeader}>
                      <Text style={styles.moduleHeaderText} numberOfLines={1}>{module.category}</Text>
                    </View>
                    <View style={styles.moduleContent}>
                      <View style={styles.moduleThumbnail}>
                        {module.thumbnailURL ? (
                          <Image source={{ uri: module.thumbnailURL }} style={styles.moduleThumbnailImage} />
                        ) : (
                          <Text style={styles.moduleThumbnailIcon}>🥋</Text>
                        )}
                      </View>
                      <View style={styles.moduleInfo}>
                        <Text style={styles.moduleTitle} numberOfLines={2}>{module.moduleTitle}</Text>
                        {durationMin ? <Text style={styles.moduleDuration}>{durationMin}</Text> : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Training Modules */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Training Modules</Text>
          <Text style={styles.sectionSubtitle}>Continue your journey</Text>
          
          {modulesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#07bbc0" />
              <Text style={styles.loadingText}>Loading modules...</Text>
            </View>
          ) : modules.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="fitness-outline" size={48} color="#6b8693" />
              <Text style={styles.emptyText}>No modules available</Text>
              <Text style={styles.emptySubtext}>Check back soon for new content</Text>
            </View>
          ) : (
            <View style={styles.modulesGrid}>
              {modules.map((module) => {
                const durationMin = module.videoDuration ? `${Math.ceil(module.videoDuration / 60)} min` : '';
                const isCompleted = completedModuleIds.includes(module.moduleId);
                return (
                  <TouchableOpacity
                    key={module.moduleId}
                    style={[
                      styles.moduleCard,
                      selectedModule === module.moduleId && styles.moduleCardSelected,
                    ]}
                    onPress={() => handleModulePress(module)}
                  >
                    <View style={styles.moduleHeader}>
                      <Text style={styles.moduleHeaderText} numberOfLines={1}>{module.category}</Text>
                      {isCompleted && (
                        <View style={styles.completeBadge}>
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <View style={styles.moduleContent}>
                      <View style={styles.moduleThumbnail}>
                        {module.thumbnailURL ? (
                          <Image source={{ uri: module.thumbnailURL }} style={styles.moduleThumbnailImage} />
                        ) : (
                          <Text style={styles.moduleThumbnailIcon}>🥋</Text>
                        )}
                      </View>
                      <View style={styles.moduleInfo}>
                        <Text style={styles.moduleTitle} numberOfLines={2}>{module.moduleTitle}</Text>
                        {durationMin ? <Text style={styles.moduleDuration}>{durationMin}</Text> : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

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
    paddingHorizontal: horizontalPadding,
    paddingTop: 20,
    paddingBottom: 100, // Extra padding for bottom tabs
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  welcomeSection: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#6b8693',
  },
  weeklyGoalContainer: {
    backgroundColor: '#011f36',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
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
    marginBottom: 4,
  },
  weeklyGoalSubtitle: {
    fontSize: 13,
    color: '#6b8693',
  },
  weeklyGoalStats: {
    alignItems: 'flex-end',
  },
  weeklyGoalPercentage: {
    fontSize: 28,
    fontWeight: '700',
    color: '#07bbc0',
  },
  weeklyGoalLabel: {
    fontSize: 11,
    color: '#6b8693',
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: '#0a3645',
    borderRadius: 3,
    marginBottom: 16,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#07bbc0',
    borderRadius: 3,
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
    fontSize: 12,
  },
  dayLabelActive: {
    color: '#041527',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#07bbc0',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b8693',
    marginBottom: 16,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moduleCard: {
    width: moduleCardWidth,
    borderRadius: 16,
    backgroundColor: '#011f36',
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moduleCardSelected: {
    borderColor: '#07bbc0',
  },
  moduleHeader: {
    backgroundColor: '#062731',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleHeaderText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  completeBadge: {
    backgroundColor: '#4CAF50',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleContent: {
    padding: 12,
  },
  moduleThumbnail: {
    width: '100%',
    height: 70,
    backgroundColor: '#0a3645',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  moduleThumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  moduleThumbnailIcon: {
    fontSize: 28,
  },
  moduleInfo: {
    gap: 4,
  },
  moduleTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  moduleDuration: {
    color: '#07bbc0',
    fontSize: 11,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6b8693',
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#6b8693',
    fontSize: 14,
  },
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
    right: 20,
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
