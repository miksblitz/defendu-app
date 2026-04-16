import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Image,
  Modal,
  Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import EmptyState from '../../components/admin/EmptyState';
import { useLogout } from '../../hooks/useLogout';
import { AnalyticsController, AnalyticsData } from '../controllers/AnalyticsController';
import LoadingSkeleton from './LoadingSkeleton';

export default function AdminDashboard() {
  const router = useRouter();
  const handleLogout = useLogout();
  const { width } = useWindowDimensions();
  const [showMenu, setShowMenu] = useState(false);
  const [showTrainerModal, setShowTrainerModal] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<AnalyticsData['trainerLeaderboard'][number] | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const navWidth = width < 680 ? 66 : 80;
  const contentPadding = navWidth + 20;
  
  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const activeBoxAnim1 = useRef(new Animated.Value(0)).current;
  const activeBoxAnim2 = useRef(new Animated.Value(0)).current;
  const kpiCard1Anim = useRef(new Animated.Value(0)).current;
  const kpiCard2Anim = useRef(new Animated.Value(0)).current;
  const kpiCard3Anim = useRef(new Animated.Value(0)).current;
  const insightsAnim = useRef(new Animated.Value(0)).current;
  
  // Hover scale animations
  const activeBox1Scale = useRef(new Animated.Value(1)).current;
  const activeBox2Scale = useRef(new Animated.Value(1)).current;
  const kpiCard1Scale = useRef(new Animated.Value(1)).current;
  const kpiCard2Scale = useRef(new Animated.Value(1)).current;
  const kpiCard3Scale = useRef(new Animated.Value(1)).current;
  const insightsScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadAnalytics();
    // Refresh analytics every 30 seconds
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (!loading && analytics) {
      // Staggered entrance animations
      Animated.stagger(100, [
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(activeBoxAnim1, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(activeBoxAnim2, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(kpiCard1Anim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(kpiCard2Anim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(kpiCard3Anim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(insightsAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, analytics]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await AnalyticsController.getAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardHover = (scale: Animated.Value, isHovering: boolean) => {
    Animated.spring(scale, {
      toValue: isHovering ? 1.03 : 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  };

  const handleOpenTrainerDetails = (trainer: AnalyticsData['trainerLeaderboard'][number]) => {
    setSelectedTrainer(trainer);
    setShowTrainerModal(true);
  };

  const handleCloseTrainerDetails = () => {
    setShowTrainerModal(false);
    setSelectedTrainer(null);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPercent = (active: number, total: number): number => {
    if (!total) {
      return 0;
    }
    return Math.min(100, Math.round((active / total) * 100));
  };

  // Mini Line Chart for 12-week registration trend (oldest → newest)
  const MiniLineChart = ({ chartData }: { chartData: number[] }) => {
    const chartWidth = 90;
    const chartHeight = 40;
    const padding = 4;

    const safeData = chartData && chartData.length > 1 ? chartData : [0, 0];
    const maxValue = Math.max(...safeData, 1); // avoid divide-by-zero on flat/empty data

    const points = safeData
      .map((value, index) => {
        const x = (index / (safeData.length - 1)) * (chartWidth - padding * 2) + padding;
        const y = chartHeight - (value / maxValue) * (chartHeight - padding * 2) - padding;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <View style={styles.miniChartContainer}>
        <Svg width={chartWidth} height={chartHeight} style={styles.miniChartSvg}>
          <Polyline
            points={points}
            fill="none"
            stroke="#38a6de"
            strokeWidth="2.2"
          />
        </Svg>
      </View>
    );
  };

  if (loading && !analytics) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.loadingContainer, { paddingLeft: 100, paddingRight: 20, paddingTop: 20 }]}>
          <LoadingSkeleton rows={2} />
          <View style={{ height: 12 }} />
          <LoadingSkeleton rows={3} />
          <View style={{ height: 12 }} />
          <LoadingSkeleton rows={2} />
        </View>
      </SafeAreaView>
    );
  }

  const data = analytics || AnalyticsController.getDefaultAnalytics();
  const userOnlineRate = getPercent(data.activeUsersOnline, data.totalActiveUsers);
  const trainerOnlineRate = getPercent(data.activeTrainersOnline, data.activeTrainers);
  const registrationSummary = `${formatNumber(data.totalRegistrations)} accounts in total`;
  const pendingTotal = data.pendingTrainerVerifications + data.pendingModuleReviews;
  const topTrainer = data.trainerLeaderboard[0];
  const runnerUpTrainers = data.trainerLeaderboard.slice(1);

  // Month-over-month delta visuals (real data)
  const momPct = data.registrationsMomPct;
  const hasMomHistory = data.registrationsLastMonth > 0 || data.registrationsThisMonth > 0;
  const momIsPositive = momPct > 0;
  const momIsNegative = momPct < 0;
  const momColor = momIsPositive ? '#6bd49a' : momIsNegative ? '#ff8a8a' : '#8db1c4';
  const momIcon: 'trending-up' | 'trending-down' | 'remove' = momIsPositive
    ? 'trending-up'
    : momIsNegative
      ? 'trending-down'
      : 'remove';
  const momText = hasMomHistory
    ? `${momIsPositive ? '+' : ''}${momPct}%`
    : 'New';
  const momChipBg = momIsPositive
    ? 'rgba(107, 212, 154, 0.14)'
    : momIsNegative
      ? 'rgba(255, 138, 138, 0.16)'
      : 'rgba(141, 177, 196, 0.16)';
  const momChipBorder = momIsPositive
    ? 'rgba(107, 212, 154, 0.3)'
    : momIsNegative
      ? 'rgba(255, 138, 138, 0.36)'
      : 'rgba(141, 177, 196, 0.3)';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Left Navigation Bar */}
        <View style={[styles.leftNavBar, { width: navWidth }]}>
          {/* Hamburger Menu */}
          <TouchableOpacity 
            style={styles.navMenuButton}
            onPress={() => setShowMenu(true)}
          >
            <Ionicons name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          {/* Bottom Icons - One Box */}
          <View style={styles.navBottomIcons}>
            <View style={styles.navIconsBox}>
              <TouchableOpacity 
                onPress={() => router.push('/(admin)/adminManaging')}
              >
                <View style={{ position: 'relative' }}>
                  <Image
                    source={require('../../assets/images/adminmanageicon.png')}
                    style={styles.navIconImage}
                  />
                  {pendingTotal > 0 && (
                    <View style={styles.navPendingDot} />
                  )}
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.navIconActiveButton}
                onPress={() => {}}
                disabled={true}
              >
                <Image
                  source={require('../../assets/images/homeicon.png')}
                  style={styles.navIconImage}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Header with DEFENDU Logo and Admin */}
        <Animated.View style={[
          styles.header,
          { paddingLeft: contentPadding },
          {
            opacity: headerAnim,
            transform: [{
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            }],
          },
        ]}>
          <View style={styles.headerContent}>
            <Image
              source={require('../../assets/images/defendudashboardlogo.png')}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
            <Text style={styles.headerAdminText}>Admin</Text>
            <Text style={styles.headerSubText}>Platform operations and live health</Text>
          </View>
        </Animated.View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingLeft: contentPadding }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderAccent} />
            <Text style={styles.sectionLabel}>Live overview</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>Real-time</Text>
            </View>
          </View>

          <View style={styles.activeBoxesRow}>
            <Animated.View style={[
              { flex: 1, minWidth: 260 },
              {
                opacity: activeBoxAnim1,
                transform: [
                  {
                    translateY: activeBoxAnim1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                  { scale: activeBox1Scale },
                ],
              },
            ]}>
              <TouchableOpacity
                style={[styles.activeBox, styles.activeBoxUsers]}
                onPress={() => router.push('/(admin)/manage-users')}
                activeOpacity={1}
                onPressIn={() => handleCardHover(activeBox1Scale, true)}
                onPressOut={() => handleCardHover(activeBox1Scale, false)}
              >
                <View style={[styles.activeBoxAccentStrip, { backgroundColor: '#38a6de' }]} />
                <View style={styles.activeBoxTopRow}>
                  <View style={[styles.activeBoxIconTile, { backgroundColor: 'rgba(56, 166, 222, 0.18)' }]}>
                    <Ionicons name="people" size={22} color="#38a6de" />
                  </View>
                  <View style={styles.activeBoxOnlineChip}>
                    <View style={[styles.activeBoxOnlineChipDot, { backgroundColor: '#6bd49a' }]} />
                    <Text style={styles.activeBoxOnlineChipText}>{data.activeUsersOnline} online</Text>
                  </View>
                </View>
                <Text style={styles.activeBoxLabel}>Active Users</Text>
                <Text style={styles.activeBoxSubLabel}>Individual accounts</Text>
                <Text style={styles.activeBoxValue}>{formatNumber(data.totalActiveUsers)}</Text>
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${userOnlineRate}%`, backgroundColor: '#38a6de' }]} />
                  </View>
                  <Text style={styles.progressPercent}>{userOnlineRate}%</Text>
                </View>
                <View style={styles.activeBoxFooterRow}>
                  <Text style={styles.activeBoxFooterText}>Tap to manage users</Text>
                  <Ionicons name="arrow-forward" size={14} color="#8db1c4" />
                </View>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[
              { flex: 1, minWidth: 260 },
              {
                opacity: activeBoxAnim2,
                transform: [
                  {
                    translateY: activeBoxAnim2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                  { scale: activeBox2Scale },
                ],
              },
            ]}>
              <TouchableOpacity
                style={[styles.activeBox, styles.activeBoxTrainers]}
                onPress={() => router.push('/(admin)/manage-trainers')}
                activeOpacity={1}
                onPressIn={() => handleCardHover(activeBox2Scale, true)}
                onPressOut={() => handleCardHover(activeBox2Scale, false)}
              >
                <View style={[styles.activeBoxAccentStrip, { backgroundColor: '#b491ff' }]} />
                <View style={styles.activeBoxTopRow}>
                  <View style={[styles.activeBoxIconTile, { backgroundColor: 'rgba(180, 145, 255, 0.18)' }]}>
                    <Ionicons name="ribbon" size={22} color="#b491ff" />
                  </View>
                  <View style={styles.activeBoxOnlineChip}>
                    <View style={[styles.activeBoxOnlineChipDot, { backgroundColor: '#6bd49a' }]} />
                    <Text style={styles.activeBoxOnlineChipText}>{data.activeTrainersOnline} online</Text>
                  </View>
                </View>
                <Text style={styles.activeBoxLabel}>Active Trainers</Text>
                <Text style={styles.activeBoxSubLabel}>Verified professionals</Text>
                <Text style={styles.activeBoxValue}>{formatNumber(data.activeTrainers)}</Text>
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${trainerOnlineRate}%`, backgroundColor: '#b491ff' }]} />
                  </View>
                  <Text style={styles.progressPercent}>{trainerOnlineRate}%</Text>
                </View>
                <View style={styles.activeBoxFooterRow}>
                  <Text style={styles.activeBoxFooterText}>Tap to manage trainers</Text>
                  <Ionicons name="arrow-forward" size={14} color="#8db1c4" />
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={styles.sectionHeader}>
            <View style={[styles.sectionHeaderAccent, { backgroundColor: '#07bbc0' }]} />
            <Text style={styles.sectionLabel}>Key metrics</Text>
          </View>

          <View style={styles.kpiRow}>
            <Animated.View style={[
              { flex: 1, minWidth: 240 },
              {
                opacity: kpiCard1Anim,
                transform: [
                  {
                    translateY: kpiCard1Anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                  { scale: kpiCard1Scale },
                ],
              },
            ]}>
              <TouchableOpacity
                style={styles.kpiCard}
                onPress={() => router.push('/(admin)/manage-users')}
                activeOpacity={1}
                onPressIn={() => handleCardHover(kpiCard1Scale, true)}
                onPressOut={() => handleCardHover(kpiCard1Scale, false)}
              >
                <View style={styles.kpiTopRow}>
                  <View style={[styles.kpiIconTile, { backgroundColor: 'rgba(56, 166, 222, 0.18)' }]}>
                    <Ionicons name="person-add" size={18} color="#38a6de" />
                  </View>
                  <View
                    style={[
                      styles.kpiDeltaChip,
                      { backgroundColor: momChipBg, borderColor: momChipBorder },
                    ]}
                  >
                    <Ionicons name={momIcon} size={11} color={momColor} />
                    <Text style={[styles.kpiDeltaChipText, { color: momColor }]}>{momText}</Text>
                  </View>
                </View>
                <Text style={styles.kpiTitle}>Total Registrations</Text>
                <Text style={styles.kpiValue}>{formatNumber(data.totalRegistrations)}</Text>
                <Text style={styles.kpiSubtext}>
                  {hasMomHistory
                    ? `${data.registrationsThisMonth} new this month · ${registrationSummary}`
                    : registrationSummary}
                </Text>
                <View style={styles.kpiDivider} />
                <View style={styles.kpiFooterRow}>
                  <Text style={styles.kpiFooterLabel}>12-week trend</Text>
                  <MiniLineChart chartData={data.registrationsTrend} />
                </View>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[
              { flex: 1, minWidth: 240 },
              {
                opacity: kpiCard2Anim,
                transform: [
                  {
                    translateY: kpiCard2Anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                  { scale: kpiCard2Scale },
                ],
              },
            ]}>
              <TouchableOpacity
                style={styles.kpiCard}
                onPress={() => router.push('/(admin)/manage-trainers')}
                activeOpacity={1}
                onPressIn={() => handleCardHover(kpiCard2Scale, true)}
                onPressOut={() => handleCardHover(kpiCard2Scale, false)}
              >
                <View style={styles.kpiTopRow}>
                  <View style={[styles.kpiIconTile, { backgroundColor: 'rgba(255, 180, 84, 0.18)' }]}>
                    <Ionicons name="shield-checkmark" size={18} color="#ffb454" />
                  </View>
                  {data.pendingTrainerVerifications > 0 && (
                    <View style={[styles.kpiDeltaChip, { backgroundColor: 'rgba(255, 180, 84, 0.16)', borderColor: 'rgba(255, 180, 84, 0.35)' }]}>
                      <View style={[styles.kpiPulseDot, { backgroundColor: '#ffb454' }]} />
                      <Text style={[styles.kpiDeltaChipText, { color: '#ffd08c' }]}>Needs review</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.kpiTitle}>Pending Trainer Verifications</Text>
                <Text style={styles.kpiValue}>{data.pendingTrainerVerifications}</Text>
                <Text style={styles.kpiSubtext}>Applications awaiting review</Text>
                <View style={styles.kpiDivider} />
                <View style={styles.warningPill}>
                  <Ionicons name="time-outline" size={14} color="#ffb454" />
                  <Text style={styles.warningPillText}>Queue is active</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[
              { flex: 1, minWidth: 240 },
              {
                opacity: kpiCard3Anim,
                transform: [
                  {
                    translateY: kpiCard3Anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                  { scale: kpiCard3Scale },
                ],
              },
            ]}>
              <TouchableOpacity
                style={styles.kpiCard}
                onPress={() => router.push('/(admin)/manage-modules')}
                activeOpacity={1}
                onPressIn={() => handleCardHover(kpiCard3Scale, true)}
                onPressOut={() => handleCardHover(kpiCard3Scale, false)}
              >
                <View style={styles.kpiTopRow}>
                  <View style={[styles.kpiIconTile, { backgroundColor: 'rgba(94, 194, 139, 0.18)' }]}>
                    <Ionicons name="document-text" size={18} color="#6bd49a" />
                  </View>
                  {data.pendingModuleReviews > 0 && (
                    <View style={[styles.kpiDeltaChip, { backgroundColor: 'rgba(94, 194, 139, 0.14)', borderColor: 'rgba(94, 194, 139, 0.35)' }]}>
                      <View style={[styles.kpiPulseDot, { backgroundColor: '#6bd49a' }]} />
                      <Text style={[styles.kpiDeltaChipText, { color: '#b6f1ca' }]}>In queue</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.kpiTitle}>Pending Module Reviews</Text>
                <Text style={styles.kpiValue}>{data.pendingModuleReviews}</Text>
                <Text style={styles.kpiSubtext}>New modules awaiting approval</Text>
                <View style={styles.kpiDivider} />
                <View style={styles.infoPill}>
                  <Ionicons name="checkmark-done-outline" size={14} color="#9be6b3" />
                  <Text style={styles.infoPillText}>Keep SLA under 24h</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={styles.sectionHeader}>
            <View style={[styles.sectionHeaderAccent, { backgroundColor: '#f5a742' }]} />
            <Text style={styles.sectionLabel}>Trainer leaderboard</Text>
          </View>

          <Animated.View style={[
            {
              opacity: insightsAnim,
              transform: [
                {
                  translateY: insightsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
                { scale: insightsScale },
              ],
            },
          ]}>
            <View
              style={styles.trainerLeaderboardCard}
            >
              <View style={styles.insightCardHeaderRow}>
                <View style={styles.insightCardTitleGroup}>
                  <View style={[styles.insightCardIconTile, { backgroundColor: 'rgba(245, 167, 66, 0.18)' }]}>
                    <Ionicons name="trophy" size={18} color="#f5a742" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.insightCardTitle}>Top trainers by rating</Text>
                    <Text style={styles.insightCardSubtitle}>Ranked by average star rating from real user reviews</Text>
                  </View>
                </View>
                <View style={styles.insightHeaderPill}>
                  <Text style={styles.insightHeaderPillText}>
                    {data.trainerLeaderboard.length} ranked
                  </Text>
                </View>
              </View>

              {data.trainerLeaderboard.length === 0 ? (
                <EmptyState
                  title="No trainer ratings yet"
                  description="Trainer rankings will appear once their modules receive user ratings."
                  iconName="trophy-outline"
                />
              ) : (
                <>
                  {/* Featured top trainer card */}
                  {topTrainer && (
                    <Animated.View style={{ transform: [{ scale: insightsScale }] }}>
                      <TouchableOpacity
                        style={styles.topTrainerCard}
                        activeOpacity={0.85}
                        onPressIn={() => handleCardHover(insightsScale, true)}
                        onPressOut={() => handleCardHover(insightsScale, false)}
                        onPress={() => handleOpenTrainerDetails(topTrainer)}
                      >
                        <View style={styles.topTrainerCover}>
                          {topTrainer.coverPhoto ? (
                            <Image
                              source={{ uri: topTrainer.coverPhoto }}
                              style={styles.topTrainerCoverImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.topTrainerCoverFallback}>
                              <Ionicons name="image-outline" size={28} color="#4a7a93" />
                              <Text style={styles.topTrainerCoverFallbackText}>No cover photo</Text>
                            </View>
                          )}
                          <View style={styles.topTrainerCoverOverlay} />
                          <View style={styles.topTrainerCrownPill}>
                            <Ionicons name="trophy" size={12} color="#f5c842" />
                            <Text style={styles.topTrainerCrownText}>#1 Top Trainer</Text>
                          </View>
                        </View>

                        <View style={styles.topTrainerBody}>
                          <View style={styles.topTrainerAvatarWrap}>
                            {topTrainer.profilePicture ? (
                              <Image
                                source={{ uri: topTrainer.profilePicture }}
                                style={styles.topTrainerAvatar}
                              />
                            ) : (
                              <View style={[styles.topTrainerAvatar, styles.topTrainerAvatarFallback]}>
                                <Ionicons name="person" size={28} color="#6b8693" />
                              </View>
                            )}
                          </View>

                          <View style={styles.topTrainerInfo}>
                            <View style={styles.topTrainerNameRow}>
                              <Text style={styles.topTrainerName} numberOfLines={1}>
                                {topTrainer.trainerName}
                              </Text>
                              <View style={styles.topTrainerRatingPill}>
                                <Ionicons name="star" size={13} color="#f5c842" />
                                <Text style={styles.topTrainerRatingValue}>
                                  {topTrainer.averageRating.toFixed(1)}
                                </Text>
                                <Text style={styles.topTrainerRatingCount}>
                                  ({topTrainer.totalReviews})
                                </Text>
                              </View>
                            </View>

                            <View style={styles.topTrainerMetaRow}>
                              <View style={styles.topTrainerMetaItem}>
                                <Ionicons name="business-outline" size={13} color="#8db1c4" />
                                <Text style={styles.topTrainerMetaText} numberOfLines={1}>
                                  {topTrainer.academyName || 'Independent trainer'}
                                </Text>
                              </View>
                              <View style={styles.topTrainerMetaItem}>
                                <Ionicons name="ribbon-outline" size={13} color="#8db1c4" />
                                <Text style={styles.topTrainerMetaText} numberOfLines={1}>
                                  {topTrainer.specialty || 'General self-defense'}
                                </Text>
                              </View>
                              <View style={styles.topTrainerMetaItem}>
                                <Ionicons name="document-text-outline" size={13} color="#8db1c4" />
                                <Text style={styles.topTrainerMetaText} numberOfLines={1}>
                                  {topTrainer.moduleCount} module{topTrainer.moduleCount !== 1 ? 's' : ''}
                                </Text>
                              </View>
                            </View>

                            {topTrainer.aboutMe ? (
                              <Text style={styles.topTrainerAbout} numberOfLines={2}>
                                "{topTrainer.aboutMe}"
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  )}

                  {/* Runner-up trainers */}
                  {runnerUpTrainers.length > 0 && (
                    <View style={styles.runnerUpList}>
                      {runnerUpTrainers.map((trainer, index) => {
                        const rank = index + 2;
                        const isLast = index === runnerUpTrainers.length - 1;
                        return (
                          <TouchableOpacity
                            key={trainer.trainerId}
                            style={[styles.runnerUpRow, isLast && styles.runnerUpRowLast]}
                            activeOpacity={0.75}
                            onPress={() => handleOpenTrainerDetails(trainer)}
                          >
                            <View style={[
                              styles.insightRankBadge,
                              rank === 2 && styles.insightRankSilver,
                              rank === 3 && styles.insightRankBronze,
                            ]}>
                              {rank <= 3 ? (
                                <Ionicons
                                  name="trophy"
                                  size={13}
                                  color={rank === 2 ? '#d8e0e6' : '#e3a565'}
                                />
                              ) : (
                                <Text style={styles.insightRank}>{rank}</Text>
                              )}
                            </View>

                            {trainer.profilePicture ? (
                              <Image source={{ uri: trainer.profilePicture }} style={styles.runnerUpAvatar} />
                            ) : (
                              <View style={[styles.runnerUpAvatar, styles.topTrainerAvatarFallback]}>
                                <Ionicons name="person" size={16} color="#6b8693" />
                              </View>
                            )}

                            <View style={styles.insightInfo}>
                              <Text style={styles.insightTitle} numberOfLines={1}>{trainer.trainerName}</Text>
                              <Text style={styles.insightMeta} numberOfLines={1}>
                                {trainer.academyName || 'Independent'}
                                {trainer.specialty ? ` · ${trainer.specialty}` : ''}
                              </Text>
                            </View>

                            <View style={styles.insightRatingCluster}>
                              <View style={styles.insightRatingPill}>
                                <Ionicons name="star" size={12} color="#f5c842" />
                                <Text style={styles.insightRatingValue}>{trainer.averageRating.toFixed(1)}</Text>
                              </View>
                              <Text style={styles.insightRatingCount}>
                                {trainer.totalReviews} review{trainer.totalReviews !== 1 ? 's' : ''}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color="#4a7a93" style={{ marginLeft: 4 }} />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              )}
            </View>
          </Animated.View>

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

      <Modal
        visible={showTrainerModal && !!selectedTrainer}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseTrainerDetails}
      >
        <Pressable style={styles.trainerModalOverlay} onPress={handleCloseTrainerDetails}>
          <Pressable style={styles.trainerModalCard} onPress={() => {}}>
            <View style={styles.trainerModalHeader}>
              <View style={styles.trainerModalTitleWrap}>
                <Text style={styles.trainerModalTitle}>Trainer Details</Text>
                <Text style={styles.trainerModalSubtitle}>Top trainer profile snapshot</Text>
              </View>
              <TouchableOpacity style={styles.trainerModalCloseBtn} onPress={handleCloseTrainerDetails}>
                <Ionicons name="close" size={18} color="#d7e6f0" />
              </TouchableOpacity>
            </View>

            {selectedTrainer && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.trainerModalContent}>
                <View style={styles.trainerModalIdentityRow}>
                  {selectedTrainer.profilePicture ? (
                    <Image source={{ uri: selectedTrainer.profilePicture }} style={styles.trainerModalAvatar} />
                  ) : (
                    <View style={[styles.trainerModalAvatar, styles.topTrainerAvatarFallback]}>
                      <Ionicons name="person" size={26} color="#6b8693" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trainerModalName}>{selectedTrainer.trainerName}</Text>
                    <Text style={styles.trainerModalMeta}>
                      {selectedTrainer.academyName || 'Independent trainer'}
                    </Text>
                  </View>
                </View>

                <View style={styles.trainerModalStatsRow}>
                  <View style={styles.trainerModalStatPill}>
                    <Ionicons name="star" size={13} color="#f5c842" />
                    <Text style={styles.trainerModalStatText}>{selectedTrainer.averageRating.toFixed(1)} avg</Text>
                  </View>
                  <View style={styles.trainerModalStatPill}>
                    <Ionicons name="chatbubble-ellipses-outline" size={13} color="#9cc2d7" />
                    <Text style={styles.trainerModalStatText}>{selectedTrainer.totalReviews} reviews</Text>
                  </View>
                  <View style={styles.trainerModalStatPill}>
                    <Ionicons name="sparkles-outline" size={13} color="#ffd968" />
                    <Text style={styles.trainerModalStatText}>{selectedTrainer.sumRatings || 0} stars</Text>
                  </View>
                  <View style={styles.trainerModalStatPill}>
                    <Ionicons name="document-text-outline" size={13} color="#9cc2d7" />
                    <Text style={styles.trainerModalStatText}>{selectedTrainer.moduleCount} modules</Text>
                  </View>
                </View>

                <View style={styles.trainerModalDetailBlock}>
                  <Text style={styles.trainerModalLabel}>Specialty</Text>
                  <Text style={styles.trainerModalValue}>{selectedTrainer.specialty || 'General self-defense'}</Text>
                </View>

                <View style={styles.trainerModalDetailBlock}>
                  <Text style={styles.trainerModalLabel}>About</Text>
                  <Text style={styles.trainerModalValue}>
                    {selectedTrainer.aboutMe || 'No detailed trainer bio is available yet.'}
                  </Text>
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
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
  leftNavBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#071321',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingBottom: 30,
    zIndex: 10,
    borderRightWidth: 1,
    borderRightColor: 'rgba(122, 183, 211, 0.18)',
  },
  navMenuButton: {
    padding: 12,
    cursor: 'pointer',
  },
  navBottomIcons: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  navIconsBox: {
    backgroundColor: 'rgba(61, 145, 185, 0.14)',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(138, 205, 235, 0.24)',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 100,
    paddingRight: 18,
    paddingTop: 20,
    paddingBottom: 12,
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
    color: '#f7fbff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubText: {
    color: '#8db1c4',
    fontSize: 12,
    marginTop: 3,
    letterSpacing: 0.3,
  },
  navIconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 166, 222, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 166, 222, 0.2)',
  },
  navIconActive: {
    backgroundColor: 'rgba(56, 166, 222, 0.2)',
    borderColor: 'rgba(56, 166, 222, 0.4)',
  },
  navIconImage: {
    width: 28,
    height: 28,
    tintColor: '#38a6de',
    resizeMode: 'contain',
  },
  navPendingDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#e0a243',
  },
  navIconActiveButton: {
    backgroundColor: 'rgba(41, 125, 167, 0.35)',
    borderRadius: 8,
    padding: 8,
    width: '100%',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingLeft: 100,
    paddingRight: 18,
    paddingBottom: 100,
  },
  activeBoxesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeaderAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#38a6de',
  },
  sectionLabel: {
    color: '#d9e6ef',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(107, 212, 154, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(107, 212, 154, 0.32)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#6bd49a',
  },
  liveBadgeText: {
    color: '#9be6b3',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  activeBox: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#0d1c2b',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    paddingLeft: 22,
    borderWidth: 1,
    borderColor: 'rgba(80, 140, 180, 0.22)',
    cursor: 'pointer',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  activeBoxUsers: {
    backgroundColor: '#0c2035',
  },
  activeBoxTrainers: {
    backgroundColor: '#12172a',
  },
  activeBoxAccentStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  activeBoxTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  activeBoxIconTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBoxOnlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(107, 212, 154, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(107, 212, 154, 0.28)',
  },
  activeBoxOnlineChipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  activeBoxOnlineChipText: {
    color: '#9be6b3',
    fontSize: 11,
    fontWeight: '700',
  },
  activeBoxLabel: {
    color: '#f7fbff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  activeBoxSubLabel: {
    color: '#8db1c4',
    fontSize: 11,
    marginBottom: 10,
  },
  activeBoxValue: {
    color: '#f4fbff',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#4dc7b4',
  },
  progressPercent: {
    color: '#d9e6ef',
    fontSize: 11,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  activeBoxFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  activeBoxFooterText: {
    color: '#8db1c4',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 22,
  },
  kpiCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#0e1e2d',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(80, 140, 180, 0.22)',
    minHeight: 210,
    cursor: 'pointer',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  kpiIconTile: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiDeltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(107, 212, 154, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(107, 212, 154, 0.3)',
  },
  kpiDeltaChipText: {
    color: '#9be6b3',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  kpiPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  kpiTitle: {
    color: '#cfe2ef',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  kpiValue: {
    color: '#f4fbff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  kpiSubtext: {
    color: '#8db1c4',
    fontSize: 11,
    lineHeight: 15,
  },
  kpiDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 12,
    marginBottom: 12,
  },
  kpiFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  kpiFooterLabel: {
    color: '#8db1c4',
    fontSize: 11,
    fontWeight: '600',
  },
  warningPill: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 180, 84, 0.12)',
  },
  warningPillText: {
    color: '#ffd08c',
    fontSize: 11,
    fontWeight: '600',
  },
  infoPill: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(94, 194, 139, 0.16)',
  },
  infoPillText: {
    color: '#b6f1ca',
    fontSize: 11,
    fontWeight: '600',
  },
  miniChartContainer: {
    alignItems: 'flex-end',
  },
  miniChartSvg: {
    alignSelf: 'flex-end',
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
  trainerLeaderboardCard: {
    width: '100%',
    backgroundColor: '#0d1f2e',
    borderRadius: 16,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(80, 150, 180, 0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  topTrainerCard: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#12263a',
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.28)',
    marginBottom: 18,
    cursor: 'pointer',
  },
  topTrainerCover: {
    position: 'relative',
    width: '100%',
    height: 150,
    backgroundColor: '#0b1625',
  },
  topTrainerCoverImage: {
    width: '100%',
    height: '100%',
  },
  topTrainerCoverFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0b1d2d',
  },
  topTrainerCoverFallbackText: {
    color: '#6b8693',
    fontSize: 12,
    fontWeight: '600',
  },
  topTrainerCoverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 16, 28, 0.45)',
  },
  topTrainerCrownPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 200, 66, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.45)',
  },
  topTrainerCrownText: {
    color: '#ffd968',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  topTrainerBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    paddingTop: 0,
  },
  topTrainerAvatarWrap: {
    marginTop: -34,
    padding: 3,
    borderRadius: 999,
    backgroundColor: '#12263a',
    borderWidth: 2,
    borderColor: 'rgba(245, 200, 66, 0.4)',
  },
  topTrainerAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  topTrainerAvatarFallback: {
    backgroundColor: '#15344a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTrainerInfo: {
    flex: 1,
    paddingTop: 8,
  },
  topTrainerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  topTrainerName: {
    flexShrink: 1,
    color: '#f7fbff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  topTrainerRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 200, 66, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.36)',
  },
  topTrainerRatingValue: {
    color: '#ffd968',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  topTrainerRatingCount: {
    color: '#c7a95c',
    fontSize: 11,
    fontWeight: '700',
  },
  topTrainerMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  topTrainerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(100, 170, 210, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(100, 170, 210, 0.16)',
    maxWidth: '100%',
  },
  topTrainerMetaText: {
    color: '#cfe2ef',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 180,
  },
  topTrainerAbout: {
    color: '#a4bec9',
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
    marginTop: 4,
  },
  runnerUpList: {
    marginTop: 4,
  },
  runnerUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  runnerUpRowLast: {
    borderBottomWidth: 0,
  },
  runnerUpAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  insightCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  insightCardTitleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  insightCardIconTile: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightHeaderPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(100, 170, 210, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(100, 170, 210, 0.25)',
  },
  insightHeaderPillText: {
    color: '#b6dcf0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  insightCardTitle: {
    color: '#f7fbff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  insightCardSubtitle: {
    color: '#8db1c4',
    fontSize: 12,
    marginTop: 2,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  insightRowLast: {
    borderBottomWidth: 0,
  },
  insightRankBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(100, 170, 210, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100, 170, 210, 0.2)',
  },
  insightRankGold: {
    backgroundColor: 'rgba(245, 200, 66, 0.18)',
    borderColor: 'rgba(245, 200, 66, 0.4)',
  },
  insightRankSilver: {
    backgroundColor: 'rgba(190, 200, 210, 0.14)',
    borderColor: 'rgba(190, 200, 210, 0.32)',
  },
  insightRankBronze: {
    backgroundColor: 'rgba(205, 127, 50, 0.16)',
    borderColor: 'rgba(205, 127, 50, 0.36)',
  },
  insightRank: {
    color: '#d0eaf8',
    fontSize: 13,
    fontWeight: '800',
  },
  insightInfo: {
    flex: 1,
  },
  insightTitle: {
    color: '#f4fbff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  insightMeta: {
    color: '#8db1c4',
    fontSize: 11,
    marginTop: 3,
  },
  insightRatingCluster: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  insightRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 200, 66, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.3)',
  },
  insightRatingValue: {
    color: '#ffd968',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  insightRatingCount: {
    color: '#8db1c4',
    fontSize: 10,
    marginTop: 3,
  },
  trainerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 13, 24, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  trainerModalCard: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '82%',
    borderRadius: 16,
    backgroundColor: '#0d1f2e',
    borderWidth: 1,
    borderColor: 'rgba(122, 183, 211, 0.24)',
    padding: 18,
  },
  trainerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  trainerModalTitleWrap: {
    flex: 1,
  },
  trainerModalTitle: {
    color: '#f4fbff',
    fontSize: 18,
    fontWeight: '800',
  },
  trainerModalSubtitle: {
    color: '#8db1c4',
    fontSize: 12,
    marginTop: 2,
  },
  trainerModalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(122, 183, 211, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(122, 183, 211, 0.24)',
  },
  trainerModalContent: {
    paddingBottom: 8,
    gap: 12,
  },
  trainerModalIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  trainerModalAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  trainerModalName: {
    color: '#f7fbff',
    fontSize: 17,
    fontWeight: '800',
  },
  trainerModalMeta: {
    color: '#8db1c4',
    fontSize: 12,
    marginTop: 3,
  },
  trainerModalStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trainerModalStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(100, 170, 210, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(100, 170, 210, 0.26)',
  },
  trainerModalStatText: {
    color: '#d8e9f3',
    fontSize: 12,
    fontWeight: '700',
  },
  trainerModalDetailBlock: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(100, 170, 210, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(100, 170, 210, 0.18)',
  },
  trainerModalLabel: {
    color: '#8db1c4',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  trainerModalValue: {
    color: '#dbeaf3',
    fontSize: 13,
    lineHeight: 18,
  },
});
