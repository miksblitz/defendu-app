import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Image,
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
  const chartAnim = useRef(new Animated.Value(0)).current;
  const revenueAnim = useRef(new Animated.Value(0)).current;
  
  // Hover scale animations
  const activeBox1Scale = useRef(new Animated.Value(1)).current;
  const activeBox2Scale = useRef(new Animated.Value(1)).current;
  const kpiCard1Scale = useRef(new Animated.Value(1)).current;
  const kpiCard2Scale = useRef(new Animated.Value(1)).current;
  const kpiCard3Scale = useRef(new Animated.Value(1)).current;
  const chartScale = useRef(new Animated.Value(1)).current;
  const revenueScale = useRef(new Animated.Value(1)).current;

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
        Animated.timing(chartAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(revenueAnim, {
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

  // Mini Line Chart Component for Total Registrations
  const MiniLineChart = () => {
    // Sample data for the mini chart (12 weeks)
    const chartData = [2, 4, 3, 6, 5, 8, 7, 9, 8, 10, 9, 12];
    const maxValue = Math.max(...chartData);
    const chartWidth = 80;
    const chartHeight = 40;
    const padding = 4;
    const points = chartData.map((value, index) => {
      const x = (index / (chartData.length - 1)) * (chartWidth - padding * 2) + padding;
      const y = chartHeight - (value / maxValue) * (chartHeight - padding * 2) - padding;
      return `${x},${y}`;
    }).join(' ');

    return (
      <View style={styles.miniChartContainer}>
        <Text style={styles.miniChartTitle}>Months vs Usage</Text>
        <Svg width={chartWidth} height={chartHeight} style={styles.miniChartSvg}>
          <Polyline
            points={points}
            fill="none"
            stroke="#38a6de"
            strokeWidth="2"
          />
        </Svg>
      </View>
    );
  };

  // Bar Chart Component with Y-axis
  const BarChart = ({ data, maxValue }: { data: { technique: string; count: number }[]; maxValue: number }) => {
    if (data.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <EmptyState
            title="No technique activity yet"
            description="This chart will populate once users start performing techniques."
            iconName="bar-chart-outline"
          />
        </View>
      );
    }

    const chartData = data.slice(0, 5);
    const axisMax = Math.max(4, Math.ceil(maxValue / 4) * 4);
    const step = axisMax / 4;
    const yAxisLabels = [axisMax, axisMax - step, axisMax - step * 2, axisMax - step * 3, 0];
    const chartHeight = 160;

    return (
      <View style={styles.chartContainer}>
        {/* Y-axis labels */}
        <View style={styles.yAxisContainer}>
          {yAxisLabels.map((label, index) => (
            <Text key={index} style={styles.yAxisLabel}>{label}</Text>
          ))}
        </View>
        
        {/* Chart area */}
        <View style={styles.barChartArea}>
          <View style={styles.chartGrid}>
            {yAxisLabels.map((_, index) => (
              <View key={index} style={styles.chartGridLine} />
            ))}
          </View>
          {chartData.map((item, index) => {
            const barHeight = maxValue > 0 ? (item.count / axisMax) * chartHeight : 0;
            const barOpacity = 1 - (index * 0.12);
            return (
              <View key={index} style={styles.barChartItem}>
                <View style={styles.barWrapper}>
                  <Text style={styles.barCount}>{item.count}</Text>
                  <View style={[styles.bar, { height: Math.max(barHeight, 4), opacity: barOpacity }]} />
                </View>
                <Text style={styles.barChartLabel} numberOfLines={2}>{item.technique}</Text>
              </View>
            );
          })}
        </View>
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
  const maxTechniqueCount = data.topPerformedTechniques.length > 0
    ? Math.max(...data.topPerformedTechniques.map(t => t.count))
    : 1;
  const userOnlineRate = getPercent(data.activeUsersOnline, data.totalActiveUsers);
  const trainerOnlineRate = getPercent(data.activeTrainersOnline, data.activeTrainers);
  const topTechnique = data.topPerformedTechniques[0];
  const totalTechniqueRuns = data.topPerformedTechniques.reduce((sum, item) => sum + item.count, 0);
  const topTechniqueShare = totalTechniqueRuns > 0 && topTechnique
    ? Math.round((topTechnique.count / totalTechniqueRuns) * 100)
    : 0;
  const registrationSummary = `${formatNumber(data.totalRegistrations)} accounts in total`;

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
                <Image
                  source={require('../../assets/images/adminmanageicon.png')}
                  style={styles.navIconImage}
                />
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
          <Text style={styles.sectionLabel}>Overview</Text>
          {/* Active Users and Trainers Boxes */}
          <View style={styles.activeBoxesRow}>
            <Animated.View style={[
              { flex: 1 },
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
                style={styles.activeBox}
                onPress={() => router.push('/(admin)/manage-users')}
                activeOpacity={1}
                onPressIn={() => handleCardHover(activeBox1Scale, true)}
                onPressOut={() => handleCardHover(activeBox1Scale, false)}
              >
                <Text style={styles.activeBoxLabel}>Active Users</Text>
                <Text style={styles.activeBoxSubLabel}>Individual</Text>
                <Text style={styles.activeBoxValue}>{data.totalActiveUsers}</Text>
                <Text style={styles.activeBoxOnline}>{data.activeUsersOnline} Online ({userOnlineRate}%)</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${userOnlineRate}%` }]} />
                </View>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[
              { flex: 1 },
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
                style={styles.activeBox}
                onPress={() => router.push('/(admin)/manage-trainers')}
                activeOpacity={1}
                onPressIn={() => handleCardHover(activeBox2Scale, true)}
                onPressOut={() => handleCardHover(activeBox2Scale, false)}
              >
                <Text style={styles.activeBoxLabel}>Active Trainers</Text>
                <Text style={styles.activeBoxSubLabel}>Verified</Text>
                <Text style={styles.activeBoxValue}>{data.activeTrainers}</Text>
                <Text style={styles.activeBoxOnline}>{data.activeTrainersOnline} Online ({trainerOnlineRate}%)</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${trainerOnlineRate}%` }]} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* KPI Cards Row - Horizontal */}
          <View style={styles.kpiRow}>
            {/* Total Registrations */}
            <Animated.View style={[
              { flex: 1 },
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
                <View style={styles.kpiHeader}>
                  <Text style={styles.kpiTitle}>Total Registrations</Text>
                </View>
                <Text style={styles.kpiValue}>{formatNumber(data.totalRegistrations)}</Text>
                <Text style={styles.kpiSubtext}>{registrationSummary}</Text>
                <View style={styles.kpiTrend}>
                  <Ionicons name="trending-up" size={14} color="#4CAF50" />
                  <Text style={styles.kpiTrendText}>+15% this month</Text>
                </View>
                <View style={styles.kpiChartContainer}>
                  <MiniLineChart />
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Pending Trainer Verifications */}
            <Animated.View style={[
              { flex: 1 },
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
                <View style={styles.kpiHeader}>
                  <Text style={styles.kpiTitle}>Pending Trainer</Text>
                  <Text style={styles.kpiTitle}>Verifications</Text>
                </View>
                <Text style={styles.kpiValue}>{data.pendingTrainerVerifications}</Text>
                <Text style={styles.kpiSubtext}>Applications awaiting review</Text>
                <View style={styles.warningPill}>
                  <Ionicons name="time-outline" size={14} color="#ffb454" />
                  <Text style={styles.warningPillText}>Queue is active</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Pending Module Reviews */}
            <Animated.View style={[
              { flex: 1 },
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
                <View style={styles.kpiHeader}>
                  <Text style={styles.kpiTitle}>Pending Module</Text>
                  <Text style={styles.kpiTitle}>Reviews</Text>
                </View>
                <Text style={styles.kpiValue}>{data.pendingModuleReviews}</Text>
                <Text style={styles.kpiSubtext}>New modules awaiting approval</Text>
                <View style={styles.infoPill}>
                  <Ionicons name="checkmark-done-outline" size={14} color="#9be6b3" />
                  <Text style={styles.infoPillText}>Keep SLA under 24h</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Text style={styles.sectionLabel}>Performance</Text>
          {/* Top Performed Techniques Chart */}
          <Animated.View style={[
            styles.chartCard,
            {
              opacity: chartAnim,
              transform: [
                {
                  translateY: chartAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
                { scale: chartScale },
              ],
            },
          ]}>
            <TouchableOpacity
              activeOpacity={1}
              onPressIn={() => handleCardHover(chartScale, true)}
              onPressOut={() => handleCardHover(chartScale, false)}
            >
              <View style={styles.chartHeaderRow}>
                <View style={styles.chartTitleGroup}>
                  <View style={styles.chartTitleRow}>
                    <Ionicons name="pulse-outline" size={18} color="#8fd8ff" />
                    <Text style={styles.chartTitle}>Top Performed Techniques</Text>
                  </View>
                  <Text style={styles.chartSubtitle}>
                    {topTechnique
                      ? `${topTechnique.technique} leads with ${topTechnique.count} runs (${topTechniqueShare}%)`
                      : 'No activity captured yet'}
                  </Text>
                </View>
                <View style={styles.chartMetricCluster}>
                  <View style={styles.chartMetricChip}>
                    <Text style={styles.chartMetricValue}>{totalTechniqueRuns}</Text>
                    <Text style={styles.chartMetricLabel}>runs</Text>
                  </View>
                  <View style={styles.chartMetricChip}>
                    <Text style={styles.chartMetricValue}>{data.topPerformedTechniques.length}</Text>
                    <Text style={styles.chartMetricLabel}>techniques</Text>
                  </View>
                </View>
              </View>
              <BarChart data={data.topPerformedTechniques} maxValue={maxTechniqueCount} />
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.sectionLabel}>Revenue</Text>
          {/* Revenue Card */}
          <Animated.View style={[
            styles.revenueCard,
            {
              opacity: revenueAnim,
              transform: [
                {
                  translateY: revenueAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
                { scale: revenueScale },
              ],
            },
          ]}>
            <TouchableOpacity
              activeOpacity={1}
              onPressIn={() => handleCardHover(revenueScale, true)}
              onPressOut={() => handleCardHover(revenueScale, false)}
            >
              <View style={styles.revenueHeader}>
                <Text style={styles.revenueTitle}>Revenue Overview</Text>
                <View style={[styles.profitabilityBadge, data.revenue.isProfitable ? styles.profitable : styles.losing]}>
                  <Ionicons 
                    name={data.revenue.isProfitable ? "trending-up" : "trending-down"} 
                    size={16} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.profitabilityText}>
                    {data.revenue.isProfitable ? 'Profitable' : 'Losing Money'}
                  </Text>
                </View>
              </View>
              <View style={styles.revenueGrid}>
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueLabel}>Total Revenue</Text>
                  <Text style={styles.revenueAmount}>{formatCurrency(data.revenue.totalRevenue)}</Text>
                </View>
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueLabel}>Monthly Revenue</Text>
                  <Text style={styles.revenueAmount}>{formatCurrency(data.revenue.monthlyRevenue)}</Text>
                </View>
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueLabel}>Subscription Revenue</Text>
                  <Text style={styles.revenueAmount}>{formatCurrency(data.revenue.subscriptionRevenue)}</Text>
                </View>
              </View>
            </TouchableOpacity>
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
    marginBottom: 24,
  },
  sectionLabel: {
    color: '#96b1be',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  activeBox: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#0d1c2b',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(80, 140, 180, 0.18)',
    cursor: 'pointer',
  },
  activeBoxLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  activeBoxSubLabel: {
    color: '#B0BEC5',
    fontSize: 12,
    marginBottom: 8,
  },
  activeBoxValue: {
    color: '#8fd8ff',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  activeBoxOnline: {
    color: '#8ad79f',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 10,
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#4dc7b4',
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#0e1e2d',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(80, 140, 180, 0.18)',
    minHeight: 180,
    cursor: 'pointer',
  },
  kpiHeader: {
    marginBottom: 12,
  },
  kpiTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  kpiValue: {
    color: '#9be0ff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  kpiSubtext: {
    color: '#B0BEC5',
    fontSize: 11,
    marginBottom: 8,
  },
  kpiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  kpiTrendText: {
    color: '#9de7b4',
    fontSize: 11,
    fontWeight: '500',
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
  kpiChartContainer: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  miniChartContainer: {
    alignItems: 'flex-end',
  },
  miniChartTitle: {
    color: '#B0BEC5',
    fontSize: 9,
    marginBottom: 4,
    textAlign: 'right',
  },
  miniChartSvg: {
    alignSelf: 'flex-end',
  },
  chartCard: {
    backgroundColor: '#0d1f2e',
    borderRadius: 14,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(80, 150, 180, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    cursor: 'pointer',
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 0,
    letterSpacing: 0.3,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  chartTitleGroup: {
    flex: 1,
    minWidth: 240,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  chartSubtitle: {
    color: '#7a9cad',
    fontSize: 12,
    marginBottom: 0,
  },
  chartMetricCluster: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  chartMetricChip: {
    backgroundColor: 'rgba(100, 170, 210, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(100, 170, 210, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 72,
  },
  chartMetricValue: {
    color: '#bceeff',
    fontSize: 16,
    fontWeight: '700',
  },
  chartMetricLabel: {
    color: '#8db9ce',
    fontSize: 11,
    marginTop: 2,
  },
  chartContainer: {
    flexDirection: 'row',
    minHeight: 190,
  },
  yAxisContainer: {
    justifyContent: 'space-between',
    paddingRight: 10,
    paddingBottom: 26,
    paddingTop: 2,
  },
  yAxisLabel: {
    color: '#88adbf',
    fontSize: 11,
    fontWeight: '500',
    height: 35,
    textAlign: 'right',
  },
  barChartArea: {
    flex: 1,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 26,
    paddingTop: 2,
    gap: 10,
  },
  chartGrid: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    top: 2,
    bottom: 26,
  },
  chartGridLine: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(130, 180, 203, 0.18)',
  },
  barChartItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 64,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 160,
    marginBottom: 10,
  },
  bar: {
    width: 32,
    backgroundColor: '#4eadd4',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    minHeight: 4,
  },
  barCount: {
    color: '#a3d4ea',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 16,
  },
  barChartLabel: {
    color: '#8badbf',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
    textAlign: 'center',
    maxWidth: 90,
  },
  noDataText: {
    color: '#B0BEC5',
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    lineHeight: 24,
  },
  revenueCard: {
    backgroundColor: '#0e1e2d',
    borderRadius: 14,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(80, 160, 155, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    cursor: 'pointer',
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  revenueTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  profitabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  profitable: {
    backgroundColor: '#4CAF50',
  },
  losing: {
    backgroundColor: '#F44336',
  },
  profitabilityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  revenueGrid: {
    gap: 12,
  },
  revenueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  revenueLabel: {
    color: '#B0BEC5',
    fontSize: 14,
  },
  revenueAmount: {
    color: '#6ad9c6',
    fontSize: 16,
    fontWeight: '600',
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
