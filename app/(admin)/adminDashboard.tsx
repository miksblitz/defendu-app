import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { useLogout } from '../../hooks/useLogout';
import { AnalyticsController, AnalyticsData } from '../controllers/AnalyticsController';

const { width: screenWidth } = Dimensions.get('window');

export default function AdminDashboard() {
  const router = useRouter();
  const handleLogout = useLogout();
  const [showMenu, setShowMenu] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  
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
          <Text style={styles.noDataText}>No technique data available. Graph will populate once users perform techniques.</Text>
        </View>
      );
    }

    // Calculate rounded max for Y-axis (round up to nearest 5)
    const roundedMax = Math.ceil(maxValue / 5) * 5 || 20;
    const yAxisLabels = [0, 5, 10, 15, 20].filter(val => val <= roundedMax);
    const chartHeight = 200;
    const barWidth = 60;
    const spacing = 40;

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
          {data.slice(0, 5).map((item, index) => {
            const barHeight = maxValue > 0 ? (item.count / roundedMax) * chartHeight : 0;
            return (
              <View key={index} style={styles.barChartItem}>
                <View style={styles.barWrapper}>
                  <View style={[styles.bar, { height: Math.max(barHeight, 4) }]} />
                  <Text style={styles.barCount}>{item.count}</Text>
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#38a6de" />
          <Text style={styles.loadingText}>Loading Analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const data = analytics || AnalyticsController.getDefaultAnalytics();
  const maxTechniqueCount = data.topPerformedTechniques.length > 0
    ? Math.max(...data.topPerformedTechniques.map(t => t.count))
    : 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Left Navigation Bar */}
        <View style={styles.leftNavBar}>
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
          </View>
        </Animated.View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
                activeOpacity={1}
                onPressIn={() => handleCardHover(activeBox1Scale, true)}
                onPressOut={() => handleCardHover(activeBox1Scale, false)}
              >
                <Text style={styles.activeBoxLabel}>Active Users</Text>
                <Text style={styles.activeBoxSubLabel}>Individual</Text>
                <Text style={styles.activeBoxValue}>{data.totalActiveUsers}</Text>
                <Text style={styles.activeBoxOnline}>{data.activeUsersOnline} Online</Text>
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
                activeOpacity={1}
                onPressIn={() => handleCardHover(activeBox2Scale, true)}
                onPressOut={() => handleCardHover(activeBox2Scale, false)}
              >
                <Text style={styles.activeBoxLabel}>Active Trainers</Text>
                <Text style={styles.activeBoxSubLabel}>Verified</Text>
                <Text style={styles.activeBoxValue}>{data.activeTrainers}</Text>
                <Text style={styles.activeBoxOnline}>{data.activeTrainersOnline} Online</Text>
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
                activeOpacity={1}
                onPressIn={() => handleCardHover(kpiCard1Scale, true)}
                onPressOut={() => handleCardHover(kpiCard1Scale, false)}
              >
                <View style={styles.kpiHeader}>
                  <Text style={styles.kpiTitle}>Total Registrations</Text>
                </View>
                <Text style={styles.kpiValue}>{formatNumber(data.totalRegistrations)}</Text>
                <Text style={styles.kpiSubtext}>Online</Text>
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
                activeOpacity={1}
                onPressIn={() => handleCardHover(kpiCard2Scale, true)}
                onPressOut={() => handleCardHover(kpiCard2Scale, false)}
              >
                <View style={styles.kpiHeader}>
                  <Text style={styles.kpiTitle}>Pending Trainer</Text>
                  <Text style={styles.kpiTitle}>Verifications</Text>
                </View>
                <Text style={styles.kpiValue}>{data.pendingTrainerVerifications}</Text>
                <Text style={styles.kpiSubtext}>Applications</Text>
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
                activeOpacity={1}
                onPressIn={() => handleCardHover(kpiCard3Scale, true)}
                onPressOut={() => handleCardHover(kpiCard3Scale, false)}
              >
                <View style={styles.kpiHeader}>
                  <Text style={styles.kpiTitle}>Pending Module</Text>
                  <Text style={styles.kpiTitle}>Reviews</Text>
                </View>
                <Text style={styles.kpiValue}>{data.pendingModuleReviews}</Text>
                <Text style={styles.kpiSubtext}>New Modules</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

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
              <Text style={styles.chartTitle}>Top Performed Techniques</Text>
              <BarChart data={data.topPerformedTechniques} maxValue={maxTechniqueCount} />
            </TouchableOpacity>
          </Animated.View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 100,
    paddingRight: 20,
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
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
    backgroundColor: '#024446',
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
    paddingRight: 20,
    paddingBottom: 100,
  },
  activeBoxesRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  activeBox: {
    flex: 1,
    backgroundColor: '#0D1C2C',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 166, 222, 0.2)',
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
    color: '#38a6de',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  activeBoxOnline: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '500',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#0D1C2C',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 166, 222, 0.2)',
    minHeight: 180,
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
    color: '#38a6de',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
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
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '500',
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
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(56, 166, 222, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  chartContainer: {
    flexDirection: 'row',
    minHeight: 220,
  },
  yAxisContainer: {
    justifyContent: 'space-between',
    paddingRight: 12,
    paddingBottom: 20,
    paddingTop: 10,
  },
  yAxisLabel: {
    color: '#B0BEC5',
    fontSize: 12,
    fontWeight: '500',
    height: 40,
    textAlign: 'right',
  },
  barChartArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 20,
    paddingTop: 10,
  },
  barChartItem: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 200,
    marginBottom: 8,
  },
  bar: {
    width: 40,
    backgroundColor: '#38a6de',
    borderRadius: 4,
    minHeight: 4,
  },
  barCount: {
    color: '#38a6de',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  barChartLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 60,
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
    backgroundColor: '#0D1C2C',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(156, 39, 176, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  revenueTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    color: '#9C27B0',
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
