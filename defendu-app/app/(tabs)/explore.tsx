import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { ModuleGridSkeleton } from '../../components/SkeletonLoader';
import { getModuleColumns, getSidebarWidth, Breakpoints } from '../../constants/layout';
import { useLogout } from '../../hooks/useLogout';
import { Module } from '../_models/Module';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';
import { AuthController } from '../controllers/AuthController';

const CARD_GAP = 12;

function normalizeCategory(cat: string | undefined): string {
  return (cat ?? '').trim().toLowerCase();
}

export default function ExploreScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const sidebarW = getSidebarWidth(screenWidth);
  const isMobile = screenWidth < Breakpoints.tablet;
  const columns = getModuleColumns(screenWidth);
  const router = useRouter();
  const handleLogout = useLogout();
  const { unreadCount, unreadDisplay, clearUnread } = useUnreadMessages();

  const [modules, setModules] = useState<Module[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'title'>('newest');
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const hoverScales = useRef<Map<string, Animated.Value>>(new Map()).current;

  const getHoverScale = (id: string) => {
    if (!hoverScales.has(id)) hoverScales.set(id, new Animated.Value(1));
    return hoverScales.get(id)!;
  };

  const handlePressIn = (id: string) => {
    Animated.spring(getHoverScale(id), { toValue: 1.04, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  };
  const handlePressOut = (id: string) => {
    Animated.spring(getHoverScale(id), { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const user = await AuthController.getCurrentUser();
      if (!user) { router.replace('/(auth)/login'); return; }
      const [approved, cats] = await Promise.all([
        AuthController.getApprovedModules(),
        AuthController.getModuleCategories(),
      ]);
      setModules(approved);
      setCategories(cats);
    } catch (e) {
      console.error('Explore load error:', e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    if (!loading) {
      Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }
  }, [loading, headerAnim]);

  const filteredModules = useMemo(() => {
    let result = modules;
    if (selectedCategory) {
      result = result.filter((m) => normalizeCategory(m.category) === normalizeCategory(selectedCategory));
    }
    if (selectedDifficulty) {
      result = result.filter((m) => (m.difficultyLevel ?? 'basic') === selectedDifficulty);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.moduleTitle.toLowerCase().includes(q) ||
          (m.category || '').toLowerCase().includes(q) ||
          (m.trainerName ?? '').toLowerCase().includes(q) ||
          (m.description ?? '').toLowerCase().includes(q),
      );
    }
    if (sortBy === 'title') {
      result = [...result].sort((a, b) => a.moduleTitle.localeCompare(b.moduleTitle));
    }
    return result;
  }, [modules, selectedCategory, selectedDifficulty, searchQuery, sortBy]);

  const contentWidth = screenWidth - sidebarW - (isMobile ? 32 : 60);
  const totalGaps = CARD_GAP * (columns - 1);
  const cardWidth = Math.floor((contentWidth - totalGaps) / columns);

  const exploreProgramOrderParam = useMemo(
    () => filteredModules.map((mod) => mod.moduleId).join(','),
    [filteredModules],
  );

  const handleModulePress = useCallback(
    (m: Module) => {
      router.push({
        pathname: '/view-module',
        params: {
          moduleId: m.moduleId,
          categoryKey: normalizeCategory(m.category),
          programOrder: exploreProgramOrderParam,
        },
      } as any);
    },
    [router, exploreProgramOrderParam],
  );

  const handleMessages = () => {
    clearUnread();
    setShowMenu(false);
    router.push('/messages');
  };

  const renderSidebar = () => (
    <View style={s.sidebar}>
      <View style={s.sidebarTopWrap}>
        <TouchableOpacity style={s.sidebarTopBtn} onPress={() => { clearUnread(); setShowMenu(true); }}>
          <Image source={require('../../assets/images/threedoticon.png')} style={s.threeDotIcon} />
        </TouchableOpacity>
        {unreadCount > 0 && (
          <View style={s.unreadBadge}>
            <Text style={s.unreadBadgeText}>{unreadDisplay}</Text>
          </View>
        )}
      </View>
      <View style={s.sidebarBottom}>
        <TouchableOpacity style={s.sidebarBtn} onPress={() => router.push('/profile')}>
          <Image source={require('../../assets/images/blueprofileicon.png')} style={s.sidebarIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={s.sidebarBtn} onPress={() => router.push('/trainer')}>
          <Image source={require('../../assets/images/trainericon.png')} style={s.sidebarIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={s.sidebarBtn} onPress={() => router.push('/dashboard')}>
          <Image source={require('../../assets/images/homeicon.png')} style={s.sidebarIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMobileHeader = () => (
    <View style={s.mobileHeader}>
      <TouchableOpacity onPress={() => setShowMobileMenu(true)} style={s.hamburgerBtn}>
        <Ionicons name="menu" size={26} color="#FFFFFF" />
        {unreadCount > 0 && (
          <View style={s.hamburgerBadge}>
            <Text style={s.unreadBadgeText}>{unreadDisplay}</Text>
          </View>
        )}
      </TouchableOpacity>
      <Image source={require('../../assets/images/defendudashboardlogo.png')} style={s.mobileLogo} resizeMode="contain" />
      <View style={{ width: 40 }} />
    </View>
  );

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.container}>
        {!isMobile && renderSidebar()}

        <View style={{ flex: 1 }}>
          {isMobile && renderMobileHeader()}

          <ScrollView
            style={s.scrollView}
            contentContainerStyle={[s.scrollContent, isMobile && s.scrollContentMobile]}
            showsVerticalScrollIndicator
          >
            {/* Header */}
            <Animated.View style={[s.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
              {!isMobile && (
                <Image source={require('../../assets/images/defendudashboardlogo.png')} style={s.logoImage} resizeMode="contain" />
              )}
              <Text style={s.pageTitle}>Explore Modules</Text>
              <Text style={s.pageSubtitle}>
                Browse all {modules.length} training modules — filter by category, difficulty, or search.
              </Text>
            </Animated.View>

            {/* Search Bar */}
            <View style={s.searchBarWrap}>
              <Ionicons name="search" size={18} color="#6b8693" style={{ marginRight: 8 }} />
              <TextInput
                style={s.searchInput}
                placeholder="Search modules, trainers, categories…"
                placeholderTextColor="#6b8693"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color="#6b8693" />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillScroll} contentContainerStyle={s.pillRow}>
              <TouchableOpacity
                style={[s.pill, !selectedCategory && s.pillActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[s.pillText, !selectedCategory && s.pillTextActive]}>All</Text>
              </TouchableOpacity>
              {categories.map((cat) => {
                const count = modules.filter((m) => normalizeCategory(m.category) === normalizeCategory(cat)).length;
                const active = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[s.pill, active && s.pillActive]}
                    onPress={() => setSelectedCategory(active ? null : cat)}
                  >
                    <Text style={[s.pillText, active && s.pillTextActive]}>
                      {cat} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Difficulty + Sort Row */}
            <View style={s.filterRow}>
              <View style={s.filterGroup}>
                {['basic', 'intermediate', 'advanced'].map((d) => {
                  const active = selectedDifficulty === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[s.filterChip, active && s.filterChipActive]}
                      onPress={() => setSelectedDifficulty(active ? null : d)}
                    >
                      <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={s.sortGroup}>
                <TouchableOpacity
                  style={[s.sortBtn, sortBy === 'newest' && s.sortBtnActive]}
                  onPress={() => setSortBy('newest')}
                >
                  <Text style={[s.sortBtnText, sortBy === 'newest' && s.sortBtnTextActive]}>Newest</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.sortBtn, sortBy === 'title' && s.sortBtnActive]}
                  onPress={() => setSortBy('title')}
                >
                  <Text style={[s.sortBtnText, sortBy === 'title' && s.sortBtnTextActive]}>A–Z</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Results count */}
            <Text style={s.resultCount}>
              {filteredModules.length} module{filteredModules.length !== 1 ? 's' : ''}
              {searchQuery.trim() ? ` matching "${searchQuery}"` : ''}
            </Text>

            {/* Module Grid */}
            {loading ? (
              <ModuleGridSkeleton columns={columns} cardWidth={cardWidth} />
            ) : filteredModules.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="search-outline" size={48} color="#0a3645" />
                <Text style={s.emptyTitle}>No modules found</Text>
                <Text style={s.emptySubtext}>Try adjusting your filters or search query.</Text>
                <TouchableOpacity
                  style={s.emptyResetBtn}
                  onPress={() => { setSearchQuery(''); setSelectedCategory(null); setSelectedDifficulty(null); }}
                >
                  <Text style={s.emptyResetText}>Clear Filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.modulesGrid}>
                {filteredModules.map((module, index) => {
                  const isEndOfRow = (index + 1) % columns === 0;
                  const durationMin = module.videoDuration ? `${Math.ceil(module.videoDuration / 60)} min` : '';
                  const imageSource = module.thumbnailUrl
                    ? { uri: module.thumbnailUrl }
                    : require('../../assets/images/managemodulepic.png');
                  const hoverScale = getHoverScale(module.moduleId);

                  return (
                    <Animated.View
                      key={module.moduleId}
                      style={[
                        { width: cardWidth, marginRight: isEndOfRow ? 0 : CARD_GAP, marginBottom: 16 },
                        { transform: [{ scale: hoverScale }] },
                      ]}
                    >
                      <TouchableOpacity
                        style={s.card}
                        onPress={() => handleModulePress(module)}
                        onPressIn={() => handlePressIn(module.moduleId)}
                        onPressOut={() => handlePressOut(module.moduleId)}
                        activeOpacity={0.9}
                        accessibilityRole="button"
                        accessibilityLabel={`Open module ${module.moduleTitle}`}
                      >
                        <ImageBackground
                          source={imageSource}
                          style={s.cardImage}
                          imageStyle={s.cardImageInner}
                        >
                          <View style={s.cardOverlay}>
                            <View style={s.cardBadgeRow}>
                              <View style={s.cardCategoryBadge}>
                                <Text style={s.cardCategoryText}>{module.category}</Text>
                              </View>
                              {module.difficultyLevel && (
                                <View style={[s.cardDifficultyBadge, module.difficultyLevel === 'advanced' && s.diffAdvanced, module.difficultyLevel === 'intermediate' && s.diffIntermediate]}>
                                  <Text style={s.cardDifficultyText}>
                                    {module.difficultyLevel.charAt(0).toUpperCase() + module.difficultyLevel.slice(1)}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <View style={s.cardContent}>
                              <Text style={s.cardTitle} numberOfLines={2}>{module.moduleTitle}</Text>
                              {module.description ? (
                                <Text style={s.cardDesc} numberOfLines={2}>{module.description}</Text>
                              ) : null}
                              <View style={s.cardMeta}>
                                {module.trainerName ? (
                                  <Text style={s.cardTrainer} numberOfLines={1}>
                                    <Ionicons name="person-outline" size={11} color="#6b8693" /> {module.trainerName}
                                  </Text>
                                ) : null}
                                {durationMin ? (
                                  <View style={s.durationBadge}>
                                    <Text style={s.durationText}>{durationMin}</Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                          </View>
                        </ImageBackground>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Mobile Drawer */}
      {showMobileMenu && (
        <TouchableOpacity style={s.drawerOverlay} activeOpacity={1} onPress={() => setShowMobileMenu(false)}>
          <View style={s.drawerContainer}>
            <View style={s.drawerHeader}>
              <Image source={require('../../assets/images/defendudashboardlogo.png')} style={s.drawerLogo} resizeMode="contain" />
              <TouchableOpacity onPress={() => setShowMobileMenu(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.drawerItem} onPress={() => { setShowMobileMenu(false); router.push('/dashboard'); }}>
              <Image source={require('../../assets/images/homeicon.png')} style={s.drawerIcon} />
              <Text style={s.drawerText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.drawerItem} onPress={() => { setShowMobileMenu(false); router.push('/profile'); }}>
              <Image source={require('../../assets/images/blueprofileicon.png')} style={s.drawerIcon} />
              <Text style={s.drawerText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.drawerItem} onPress={() => { setShowMobileMenu(false); router.push('/trainer'); }}>
              <Image source={require('../../assets/images/trainericon.png')} style={s.drawerIcon} />
              <Text style={s.drawerText}>Trainer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.drawerItem} onPress={() => { setShowMobileMenu(false); handleMessages(); }}>
              <Image source={require('../../assets/images/messageicon.png')} style={s.drawerIcon} />
              <Text style={s.drawerText}>Messages</Text>
              {unreadCount > 0 && (
                <View style={s.drawerBadge}>
                  <Text style={s.unreadBadgeText}>{unreadDisplay}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={s.drawerDivider} />
            <TouchableOpacity style={s.drawerItem} onPress={() => { setShowMobileMenu(false); handleLogout(); }}>
              <Image source={require('../../assets/images/logouticon.png')} style={s.drawerIcon} />
              <Text style={[s.drawerText, { color: '#e57373' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Desktop pop-up menu */}
      {showMenu && (
        <TouchableOpacity style={s.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={s.menuContainer}>
            <TouchableOpacity style={s.menuItem} onPress={handleMessages}>
              <Image source={require('../../assets/images/messageicon.png')} style={s.menuIcon} />
              <Text style={s.menuText}>Messages</Text>
              {unreadCount > 0 && (
                <View style={s.menuBadge}><Text style={s.unreadBadgeText}>{unreadDisplay}</Text></View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); handleLogout(); }}>
              <Image source={require('../../assets/images/logouticon.png')} style={s.menuIcon} />
              <Text style={s.menuText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#041527' },
  container: { flex: 1, flexDirection: 'row' },

  sidebar: { backgroundColor: '#000E1C', width: 72, paddingTop: 20, paddingBottom: 30, alignItems: 'center', justifyContent: 'space-between', borderRightWidth: 1, borderRightColor: 'rgba(7,187,192,0.08)' },
  sidebarTopWrap: { position: 'relative' },
  sidebarTopBtn: { padding: 8 },
  sidebarBottom: { flexDirection: 'column', width: '100%', alignItems: 'center' },
  sidebarBtn: { paddingVertical: 18, width: '100%', alignItems: 'center' },
  sidebarIcon: { width: 26, height: 26, tintColor: '#07bbc0', resizeMode: 'contain' },
  threeDotIcon: { width: 22, height: 22, resizeMode: 'contain' },
  unreadBadge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#e53935', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  mobileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#000E1C', borderBottomWidth: 1, borderBottomColor: 'rgba(7,187,192,0.08)' },
  hamburgerBtn: { padding: 4, position: 'relative' },
  hamburgerBadge: { position: 'absolute', top: -2, right: -6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#e53935', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  mobileLogo: { width: 110, height: 34 },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 28, paddingVertical: 24, paddingBottom: 40 },
  scrollContentMobile: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 32 },

  header: { marginBottom: 24, backgroundColor: 'rgba(7,187,192,0.04)', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: 'rgba(7,187,192,0.1)' },
  logoImage: { width: 150, height: 48, marginBottom: 10 },
  pageTitle: { fontSize: 24, fontWeight: '600', color: '#FFFFFF', marginBottom: 3, letterSpacing: 0 },
  pageSubtitle: { fontSize: 13, color: 'rgba(107,134,147,0.8)', lineHeight: 19 },

  searchBarWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#021422', borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(7,187,192,0.2)', paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14, padding: 0 },

  pillScroll: { marginBottom: 14 },
  pillRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(6,39,49,0.7)', borderWidth: 1, borderColor: 'rgba(7,187,192,0.2)' },
  pillActive: { backgroundColor: '#07bbc0', borderColor: '#07bbc0', shadowColor: '#07bbc0', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 3 },
  pillText: { color: 'rgba(107,134,147,0.9)', fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: '#041527', fontWeight: '700' },

  filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  filterGroup: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(107,134,147,0.25)' },
  filterChipActive: { backgroundColor: 'rgba(7,187,192,0.12)', borderColor: '#07bbc0' },
  filterChipText: { color: 'rgba(107,134,147,0.8)', fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: '#07bbc0', fontWeight: '700' },
  sortGroup: { flexDirection: 'row', gap: 6 },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'transparent' },
  sortBtnActive: { backgroundColor: 'rgba(7,187,192,0.1)' },
  sortBtnText: { color: 'rgba(107,134,147,0.8)', fontSize: 12, fontWeight: '600' },
  sortBtnTextActive: { color: '#07bbc0', fontWeight: '700' },

  resultCount: { color: 'rgba(107,134,147,0.8)', fontSize: 12, marginBottom: 12 },

  modulesGrid: { flexDirection: 'row', flexWrap: 'wrap' },

  card: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#062731' },
  cardImage: { width: '100%', minHeight: 260 },
  cardImageInner: { resizeMode: 'cover', borderRadius: 16 },
  cardOverlay: { flex: 1, backgroundColor: 'rgba(2,10,22,0.72)', justifyContent: 'space-between' },
  cardBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  cardCategoryBadge: { backgroundColor: 'rgba(4,21,39,0.88)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(7,187,192,0.15)' },
  cardCategoryText: { color: '#07bbc0', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  cardDifficultyBadge: { backgroundColor: 'rgba(7,187,192,0.18)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  diffIntermediate: { backgroundColor: 'rgba(240,165,0,0.18)' },
  diffAdvanced: { backgroundColor: 'rgba(229,115,115,0.18)' },
  cardDifficultyText: { color: '#b8cdd9', fontSize: 10, fontWeight: '700' },
  cardContent: { padding: 14, paddingTop: 8 },
  cardTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  cardDesc: { color: 'rgba(184,205,217,0.85)', fontSize: 12, lineHeight: 17, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTrainer: { color: 'rgba(107,134,147,0.8)', fontSize: 11 },
  durationBadge: { backgroundColor: 'rgba(7,187,192,0.85)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  durationText: { color: '#041527', fontSize: 10, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12, backgroundColor: 'rgba(4,21,39,0.5)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(10,54,69,0.8)', borderStyle: 'dashed' },
  emptyTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  emptySubtext: { color: 'rgba(107,134,147,0.8)', fontSize: 14 },
  emptyResetBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#07bbc0' },
  emptyResetText: { color: '#041527', fontSize: 13, fontWeight: '600' },

  drawerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,14,28,0.8)', zIndex: 1000 },
  drawerContainer: { width: 275, height: '100%', backgroundColor: '#010F1C', paddingTop: 24, paddingHorizontal: 20, borderRightWidth: 1, borderRightColor: 'rgba(7,187,192,0.1)' },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(7,187,192,0.1)' },
  drawerLogo: { width: 110, height: 34 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 14, borderRadius: 10, paddingHorizontal: 8, marginBottom: 2 },
  drawerIcon: { width: 20, height: 20, tintColor: '#07bbc0', resizeMode: 'contain' },
  drawerText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  drawerBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#e53935', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginLeft: 'auto' as any },
  drawerDivider: { height: 1, backgroundColor: 'rgba(107,134,147,0.15)', marginVertical: 12, marginHorizontal: 8 },

  menuOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: 'rgba(0,14,28,0.6)' },
  menuContainer: { position: 'absolute', top: 20, left: 82, backgroundColor: '#021422', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(7,187,192,0.2)', paddingVertical: 8, minWidth: 190, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 18 },
  menuIcon: { width: 22, height: 22, marginRight: 12, resizeMode: 'contain', tintColor: '#07bbc0' },
  menuText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  menuBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#e53935', alignItems: 'center', justifyContent: 'center', marginLeft: 8, paddingHorizontal: 6 },
});
