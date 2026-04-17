import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    ImageBackground,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ModuleGridSkeleton, Skeleton } from '../../components/SkeletonLoader';
import Toast from '../../components/Toast';
import { getModuleColumns, getSidebarWidth, Breakpoints } from '../../constants/layout';
import { useLogout } from '../../hooks/useLogout';
import { useToast } from '../../hooks/useToast';
import { Module } from '../_models/Module';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';
import { AuthController, CategorySegmentProgramRecord } from '../controllers/AuthController';

const circleSize = 40;
const strokeWidth = 4;
const radius = (circleSize - strokeWidth) / 2;
const circumference = 2 * Math.PI * radius;

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Fallbacks when skill profile has no module targets (e.g. legacy accounts). */
const DEFAULT_DAILY_MODULE_GOAL = 5;
const DEFAULT_WEEKLY_MODULE_GOAL = 7;

function clampDailyModuleTarget(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_DAILY_MODULE_GOAL;
  return Math.max(1, Math.min(10, Math.round(n)));
}

function clampWeeklyModuleTarget(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_WEEKLY_MODULE_GOAL;
  return Math.max(3, Math.min(20, Math.round(n)));
}

/** Start of current week (Monday 00:00) and end (Sunday 23:59:59.999) in local time. */
function getCurrentWeekRange(): { start: number; end: number } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - daysSinceMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}

/** Day index 0=Mon .. 6=Sun from a timestamp. */
function getDayIndex(ts: number): number {
  const d = new Date(ts);
  return (d.getDay() + 6) % 7;
}

/** Completions per day (Mon=0 .. Sun=6) for the current week only. */
function getDayCountsThisWeek(completionTimestamps: Record<string, number>): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const { start, end } = getCurrentWeekRange();
  for (const ts of Object.values(completionTimestamps)) {
    if (ts >= start && ts <= end) counts[getDayIndex(ts)]++;
  }
  return counts;
}

const CARD_GAP = 12;

const DEFAULT_MODULE_CATEGORIES = [
  'Punching',
  'Kicking',
  'Elbow Strikes',
  'Knee Strikes',
  'Defensive Moves',
] as const;

function normalizeCategory(cat: string | undefined): string {
  return (cat ?? '').trim().toLowerCase();
}

/** Program phases for web “track” layout (warm-up → introduction → training → cooldown). */
type WebProgramPhase =
  | 'warmup'
  | 'introduction'
  | 'basic'
  | 'intermediate'
  | 'advanced'
  | 'cooldown'
  | 'other';

function sortModulesProgramOrder(items: Module[]): Module[] {
  return [...items].sort((a, b) => {
    const ao = typeof a.sortOrder === 'number' ? a.sortOrder : 9999;
    const bo = typeof b.sortOrder === 'number' ? b.sortOrder : 9999;
    if (ao !== bo) return ao - bo;
    return (a.moduleTitle || '').localeCompare(b.moduleTitle || '', undefined, { sensitivity: 'base' });
  });
}

/**
 * Infer phase from copy/tags/difficulty so Firebase modules without a dedicated field
 * still land in sensible buckets (matches common Defendu mobile structure).
 */
function classifyModuleProgramPhase(m: Module): WebProgramPhase {
  if (m.moduleSegment === 'warmup') return 'warmup';
  if (m.moduleSegment === 'introduction') return 'introduction';
  if (m.moduleSegment === 'cooldown') return 'cooldown';
  const title = (m.moduleTitle || '').toLowerCase();
  const desc = (m.description || '').toLowerCase();
  const cat = (m.category || '').toLowerCase();
  const intro = typeof m.introduction === 'string' ? m.introduction.toLowerCase() : '';
  const tags = (m.physicalDemandTags || []).join(' ').toLowerCase();
  const blob = `${title} ${desc} ${cat} ${intro} ${tags}`;

  if (/\bwarm[\s_-]?up\b/.test(blob) || /\bwarmup\b/.test(blob)) return 'warmup';
  if (/\bintro(duction)?\b/.test(blob)) return 'introduction';
  if (/\b(cool|cool-)[\s_-]?down\b/.test(blob) || /\bcooldown\b/.test(blob)) return 'cooldown';
  if (/(^|\s)(arm|hip)\s+circles?(\s|$)/.test(title) || /jumping\s+jacks?/.test(title) || /\bhigh\s+knees\b/.test(title)) {
    return 'warmup';
  }
  if (cat === 'warmup' || cat === 'warm-up' || cat === 'warm up') return 'warmup';
  if (cat === 'introduction' || cat === 'intro') return 'introduction';
  if (cat === 'cooldown' || cat === 'cool down' || cat === 'cool-down') return 'cooldown';
  if (/\bstretch(ing)?\b/.test(blob) && (m.intensityLevel ?? 4) <= 2) return 'cooldown';

  const lvl = (m.difficultyLevel || '').toLowerCase();
  if (lvl === 'basic') return 'basic';
  if (lvl === 'intermediate') return 'intermediate';
  if (lvl === 'advanced') return 'advanced';
  return 'other';
}

const WEB_PROGRAM_SECTION_META: {
  phase: WebProgramPhase;
  title: string;
  subtitle: string;
  badge: string;
}[] = [
  {
    phase: 'warmup',
    title: 'Warm-up',
    subtitle: 'Mobility and light activation before you train.',
    badge: 'Warm-up',
  },
  {
    phase: 'introduction',
    title: 'Introduction',
    subtitle: 'Overview and orientation before the core training.',
    badge: 'Intro',
  },
  {
    phase: 'basic',
    title: 'Basic training',
    subtitle: 'Foundational techniques and drills.',
    badge: 'Training',
  },
  {
    phase: 'intermediate',
    title: 'Intermediate training',
    subtitle: 'Combinations and added intensity.',
    badge: 'Training',
  },
  {
    phase: 'advanced',
    title: 'Advanced training',
    subtitle: 'Complex flow and higher demand.',
    badge: 'Training',
  },
  {
    phase: 'other',
    title: 'More in this track',
    subtitle: 'Additional modules in this category.',
    badge: 'Training',
  },
  {
    phase: 'cooldown',
    title: 'Cooldown',
    subtitle: 'Ease out and recover.',
    badge: 'Cooldown',
  },
];

type WebProgramSection = {
  phase: WebProgramPhase;
  title: string;
  subtitle: string;
  badge: string;
  items: Module[];
};

/** Ordered program sections for a category (shared by web track + “first module” detection). */
function buildProgramSectionsFromModules(modulesInCategory: Module[]): WebProgramSection[] {
  const buckets: Record<WebProgramPhase, Module[]> = {
    warmup: [],
    introduction: [],
    basic: [],
    intermediate: [],
    advanced: [],
    cooldown: [],
    other: [],
  };
  for (const m of modulesInCategory) {
    buckets[classifyModuleProgramPhase(m)].push(m);
  }
  (Object.keys(buckets) as WebProgramPhase[]).forEach((k) => {
    buckets[k] = sortModulesProgramOrder(buckets[k]);
  });
  return WEB_PROGRAM_SECTION_META.map((meta) => ({
    ...meta,
    items: buckets[meta.phase],
  })).filter((s) => s.items.length > 0);
}

function resolveAdminPickIdsToModules(
  ids: string[] | undefined,
  byId: Map<string, Module>,
  segment: 'warmup' | 'cooldown'
): Module[] {
  if (!ids?.length) return [];
  const out: Module[] = [];
  for (const id of ids) {
    const trimmed = typeof id === 'string' ? id.trim() : '';
    if (!trimmed) continue;
    const mod = byId.get(trimmed);
    if (mod && mod.moduleSegment === segment) out.push(mod);
  }
  return out;
}

/**
 * Warm-up / cool-down rows use admin-assigned library modules per category (`categorySegmentProgram` in Firebase).
 * Falls back to title-based classification on technique modules when nothing is assigned yet.
 */
function buildProgramSectionsWithAdminAssignments(
  modulesInCategory: Module[],
  allApprovedModules: Module[],
  assignment: CategorySegmentProgramRecord | null | undefined
): WebProgramSection[] {
  const technique = modulesInCategory.filter((m) => !m.moduleSegment);
  const introductionsInCategory = sortModulesProgramOrder(
    modulesInCategory.filter((m) => m.moduleSegment === 'introduction')
  );
  const byId = new Map(allApprovedModules.map((m) => [m.moduleId, m]));

  const warmupFromAdmin = resolveAdminPickIdsToModules(
    assignment?.warmupModuleIds,
    byId,
    'warmup'
  );
  const cooldownFromAdmin = resolveAdminPickIdsToModules(
    assignment?.cooldownModuleIds,
    byId,
    'cooldown'
  );

  const fromClassify = buildProgramSectionsFromModules(technique);
  const byPhase: Partial<Record<WebProgramPhase, WebProgramSection>> = {};
  for (const s of fromClassify) {
    byPhase[s.phase] = s;
  }

  const warmupItems =
    warmupFromAdmin.length > 0 ? warmupFromAdmin : (byPhase.warmup?.items ?? []);
  const introductionItems =
    introductionsInCategory.length > 0
      ? introductionsInCategory
      : (byPhase.introduction?.items ?? []);
  const cooldownItems =
    cooldownFromAdmin.length > 0 ? cooldownFromAdmin : (byPhase.cooldown?.items ?? []);

  const out: WebProgramSection[] = [];
  for (const meta of WEB_PROGRAM_SECTION_META) {
    if (meta.phase === 'warmup') {
      if (warmupItems.length > 0) out.push({ ...meta, items: warmupItems });
    } else if (meta.phase === 'introduction') {
      if (introductionItems.length > 0) out.push({ ...meta, items: introductionItems });
    } else if (meta.phase === 'cooldown') {
      if (cooldownItems.length > 0) out.push({ ...meta, items: cooldownItems });
    } else {
      const s = byPhase[meta.phase];
      if (s && s.items.length > 0) out.push(s);
    }
  }
  return out;
}

export default function DashboardScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const sidebarW = getSidebarWidth(screenWidth);
  const isMobile = screenWidth < Breakpoints.tablet;
  const columns = getModuleColumns(screenWidth);
  const contentWidth = screenWidth - sidebarW - (isMobile ? 32 : 60) - 24;
  const moduleCardWidth = Math.floor((contentWidth - CARD_GAP * (columns - 1)) / columns);
  const moduleCardMarginRight = CARD_GAP;

  const [selectedDay, setSelectedDay] = useState(() => (new Date().getDay() + 6) % 7);
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [userName, setUserName] = useState('User');
  const [modules, setModules] = useState<Module[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  /** Set when getApprovedModules throws (e.g. permission denied), so we do not look like “no content”. */
  const [modulesLoadError, setModulesLoadError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<{
    similarUserIds: string[];
    recommendedModuleIds: string[];
  } | null>(null);
  const [recommendedModules, setRecommendedModules] = useState<Module[]>([]);
  const [completionTimestamps, setCompletionTimestamps] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [moduleCategories, setModuleCategories] = useState<string[]>([...DEFAULT_MODULE_CATEGORIES]);
  const [dailyModuleGoal, setDailyModuleGoal] = useState(DEFAULT_DAILY_MODULE_GOAL);
  const [weeklyModuleGoal, setWeeklyModuleGoal] = useState(DEFAULT_WEEKLY_MODULE_GOAL);
  const [categorySegmentPrograms, setCategorySegmentPrograms] = useState<
    Record<string, CategorySegmentProgramRecord>
  >({});
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();
  const router = useRouter();
  const handleLogout = useLogout();
  const { unreadCount, unreadDisplay, clearUnread } = useUnreadMessages();

  const weeklyGoalPulse = useRef(new Animated.Value(1)).current;
  const welcomeAnim = useRef(new Animated.Value(0)).current;

  const refreshModuleTargets = useCallback(async () => {
    try {
      const profile = await AuthController.getSkillProfile();
      const prefs = profile?.preferences;
      const d = prefs?.dailyModuleTarget;
      const w = prefs?.weeklyModuleTarget;
      setDailyModuleGoal(
        typeof d === 'number' && Number.isFinite(d) ? clampDailyModuleTarget(d) : DEFAULT_DAILY_MODULE_GOAL
      );
      setWeeklyModuleGoal(
        typeof w === 'number' && Number.isFinite(w) ? clampWeeklyModuleTarget(w) : DEFAULT_WEEKLY_MODULE_GOAL
      );
    } catch {
      setDailyModuleGoal(DEFAULT_DAILY_MODULE_GOAL);
      setWeeklyModuleGoal(DEFAULT_WEEKLY_MODULE_GOAL);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshModuleTargets();
      let cancelled = false;
      (async () => {
        try {
          const progress = await AuthController.getUserProgress();
          if (cancelled) return;
          setCompletionTimestamps(progress.completionTimestamps ?? {});
        } catch {
          /* ignore */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [refreshModuleTargets])
  );

  useEffect(() => {
    const init = async () => {
      const user = await AuthController.getCurrentUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      // Set first name from user's full name
      const firstNamePart = (user.firstName || '').trim().split(' ')[0];
      setUserName(firstNamePart || 'User');

      Animated.timing(welcomeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
      
      try {
        setModulesLoading(true);
        setModulesLoadError(null);

        let approved: Module[] = [];
        try {
          approved = await AuthController.getApprovedModules();
        } catch (modError: any) {
          const msg = modError?.message || 'Could not load training modules.';
          console.error('Dashboard: getApprovedModules failed:', modError);
          setModulesLoadError(msg);
          approved = [];
        }
        setModules(approved);
        setModulesLoading(false);

        const [recs, progress, cats, segmentMap] = await Promise.all([
          AuthController.getRecommendations(),
          AuthController.getUserProgress(),
          AuthController.getModuleCategories(),
          AuthController.getAllCategorySegmentPrograms().catch(() => ({} as Record<string, CategorySegmentProgramRecord>)),
        ]);
        setRecommendations(recs);
        setCompletionTimestamps(progress.completionTimestamps ?? {});
        setModuleCategories(cats);
        setCategorySegmentPrograms(segmentMap);
        if (recs?.recommendedModuleIds?.length) {
          const recommended = await AuthController.getModulesByIds(recs.recommendedModuleIds);
          const notCompleted = recommended.filter((m) => !progress.completedModuleIds.includes(m.moduleId));
          setRecommendedModules(notCompleted);
        } else {
          setRecommendedModules([]);
        }
      } catch (error) {
        console.error('Error loading dashboard (secondary data):', error);
      }
    };
    init();
  }, [router, refreshModuleTargets]);

  useEffect(() => {
    if (modulesLoading || moduleCategories.length === 0) return;
    setSelectedCategory((prev) => {
      if (
        prev != null &&
        moduleCategories.some((c) => normalizeCategory(c) === normalizeCategory(prev))
      ) {
        return prev;
      }
      return moduleCategories[0];
    });
  }, [modulesLoading, moduleCategories]);


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

  // Get current day index (Mon=0 .. Sun=6)
  const todayIndex = (new Date().getDay() + 6) % 7;
  const todayName = days[todayIndex];

  // Calculate real weekly progress from completionTimestamps (targets from skill profile)
  const dayCounts = getDayCountsThisWeek(completionTimestamps);
  const dayProgress = dayCounts.map((c) => Math.min(1, c / dailyModuleGoal));

  const handleMessages = () => {
    clearUnread();
    setShowMenu(false);
    router.push('/messages');
  };

  // Overall weekly progress: total modules this week vs weekly target from skill profile
  const totalModulesThisWeek = dayCounts.reduce((a, b) => a + b, 0);
  const weeklyProgress =
    weeklyModuleGoal > 0 ? Math.min(1, totalModulesThisWeek / weeklyModuleGoal) : 0;

  // Modules filtered by selected category (category is always set after load)
  const modulesInCategory = selectedCategory
    ? modules.filter((m) => normalizeCategory(m.category) === normalizeCategory(selectedCategory))
    : [];

  // Group modules by difficulty level within category
  const modulesInCategoryByLevel = (() => {
    const basic = modulesInCategory.filter((m) => (m.difficultyLevel ?? '').toLowerCase() === 'basic');
    const intermediate = modulesInCategory.filter((m) => (m.difficultyLevel ?? '').toLowerCase() === 'intermediate');
    const advanced = modulesInCategory.filter((m) => (m.difficultyLevel ?? '').toLowerCase() === 'advanced');
    const other = modulesInCategory.filter((m) => {
      const L = (m.difficultyLevel ?? '').toLowerCase();
      return L !== 'basic' && L !== 'intermediate' && L !== 'advanced';
    });
    const out: { label: string; items: typeof modulesInCategory }[] = [];
    if (basic.length) out.push({ label: 'Basic', items: basic });
    if (intermediate.length) out.push({ label: 'Intermediate', items: intermediate });
    if (advanced.length) out.push({ label: 'Advanced', items: advanced });
    if (other.length) out.push({ label: 'More', items: other });
    return out;
  })();

  const showWebProgramTrack = !isMobile && !!selectedCategory;

  const programSectionList = useMemo(() => {
    if (!selectedCategory || !modulesInCategory.length) return [];
    const key = AuthController.categorySegmentProgramKey(selectedCategory);
    const assignment = categorySegmentPrograms[key];
    return buildProgramSectionsWithAdminAssignments(modulesInCategory, modules, assignment);
  }, [selectedCategory, modulesInCategory, modules, categorySegmentPrograms]);

  const webProgramSections = useMemo(() => {
    if (!showWebProgramTrack || !programSectionList.length) return null;
    return programSectionList;
  }, [showWebProgramTrack, programSectionList]);

  /** Flat program order (warm-up → training blocks → cooldown) for “Next module” in training flow. */
  const programOrderParamFromSections = useMemo(() => {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const sec of programSectionList) {
      for (const m of sec.items) {
        if (seen.has(m.moduleId)) continue;
        seen.add(m.moduleId);
        ids.push(m.moduleId);
      }
    }
    return ids.join(',');
  }, [programSectionList]);

  const recommendedProgramOrderParam = useMemo(
    () => recommendedModules.map((m) => m.moduleId).join(','),
    [recommendedModules],
  );

  const selectDashboardModule = useCallback(
    (module: Module) => {
      setSelectedModule(module.moduleId);
      router.push({
        pathname: '/view-module',
        params: {
          moduleId: module.moduleId,
          categoryKey: normalizeCategory(module.category || selectedCategory || ''),
          programOrder: programOrderParamFromSections,
        },
      } as any);
    },
    [router, selectedCategory, programOrderParamFromSections],
  );

  const openRecommendedModule = useCallback(
    (module: Module) => {
      setSelectedModule(module.moduleId);
      router.push({
        pathname: '/view-module',
        params: {
          moduleId: module.moduleId,
          categoryKey: normalizeCategory(module.category),
          programOrder: recommendedProgramOrderParam,
        },
      } as any);
    },
    [router, recommendedProgramOrderParam],
  );

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
        {/* Sidebar - desktop/tablet only */}
        {!isMobile && (
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
        )}

        {/* Main Content */}
        <View style={{ flex: 1 }}>
        {/* Mobile Header */}
        {isMobile && (
          <View style={styles.mobileHeader}>
            <TouchableOpacity onPress={() => setShowMobileMenu(true)} style={styles.hamburgerBtn}>
              <Ionicons name="menu" size={26} color="#FFFFFF" />
              {unreadCount > 0 && (
                <View style={styles.hamburgerBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadDisplay}</Text>
                </View>
              )}
            </TouchableOpacity>
            <Image source={require('../../assets/images/defendudashboardlogo.png')} style={styles.mobileLogo} resizeMode="contain" />
            <View style={{ width: 40 }} />
          </View>
        )}

        <ScrollView
          style={styles.mainContentVerticalScrollView}
          contentContainerStyle={[styles.mainContentContainer, isMobile && styles.mainContentContainerMobile]}
          showsVerticalScrollIndicator={true}
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
            {/* Welcome Header */}
            <Animated.View style={[
              styles.welcomeSection,
              {
                opacity: welcomeAnim,
                transform: [{
                  translateY: welcomeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-30, 0],
                  }),
                }],
              },
            ]}>
              <Image
                source={require('../../assets/images/defendudashboardlogo.png')}
                style={styles.logoImage}
              />
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeText}>Welcome back, {userName}!</Text>
                <Text style={styles.welcomeSubtext}>Today is {todayName} - Let's keep training</Text>
              </View>
            </Animated.View>

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
                    const isEndOfRow = (index + 1) % columns === 0;
                    const durationMin = module.videoDuration ? `${Math.ceil(module.videoDuration / 60)} min` : '';
                    const imageSource = module.thumbnailUrl 
                      ? { uri: module.thumbnailUrl }
                      : require('../../assets/images/managemodulepic.png');
                    
                    return (
                      <View
                        key={module.moduleId}
                        style={[
                          styles.moduleCard,
                          { width: moduleCardWidth, marginRight: isEndOfRow ? 0 : moduleCardMarginRight },
                        ]}
                      >
                        <TouchableOpacity
                          style={[
                            styles.moduleCardTouchable,
                            selectedModule === module.moduleId && styles.moduleCardSelected,
                          ]}
                          onPress={() => openRecommendedModule(module)}
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
                                {durationMin ? (
                                  <View style={styles.moduleDurationBadge}>
                                    <Text style={styles.moduleDuration}>{durationMin}</Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                          </ImageBackground>
                        </TouchableOpacity>
                      </View>
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
                    {dailyModuleGoal} module{dailyModuleGoal !== 1 ? 's' : ''} per day • {weeklyModuleGoal} per week •
                    Resets every Monday
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
                    <CircularProgress progress={dayProgress[i] ?? 0} />
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
                      {i === todayIndex && <Text style={styles.todayBadge}>Today</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>

            {/* Training Modules */}
            <View style={styles.trainingHeader}>
              <Text style={styles.trainingTitle}>TRAINING MODULES</Text>
              <Text style={styles.trainingSubtitle}>
                {modulesLoading
                  ? 'Loading all modules…'
                  : showWebProgramTrack
                    ? `Step-by-step path for ${selectedCategory}. Warm-up, introduction, and cool-down follow the program for this category. Tap a module to open it.`
                    : selectedCategory
                      ? 'Tap a module to open it and begin.'
                      : 'Loading your program…'}
              </Text>
            </View>

            {/* Category filter pills */}
            <View style={styles.categoryFilterRow}>
              {moduleCategories.map((cat) => {
                const count = modules.filter((m) => normalizeCategory(m.category) === normalizeCategory(cat)).length;
                const isActive = selectedCategory === cat;
                const categoryLocked = modulesLoading;
                return (
                  <TouchableOpacity
                    key={cat}
                    disabled={categoryLocked}
                    style={[
                      styles.categoryPill,
                      isActive && styles.categoryPillActive,
                      categoryLocked && styles.categoryPillDisabled,
                    ]}
                    onPress={() => {
                      if (categoryLocked) return;
                      if (!isActive) {
                        setSelectedCategory(cat);
                        setSelectedModule(null);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        isActive && styles.categoryPillTextActive,
                        categoryLocked && styles.categoryPillTextDisabled,
                      ]}
                    >
                      {cat} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View
              style={[
                styles.modulesContainer,
                showWebProgramTrack && styles.modulesContainerWebTrack,
              ]}
            >
              {modulesLoading ? (
                showWebProgramTrack ? (
                  <View style={styles.webProgramSkeletonWrap}>
                    <Skeleton height={120} borderRadius={16} />
                    <Skeleton height={56} borderRadius={12} />
                    <Skeleton height={88} borderRadius={14} />
                    <Skeleton height={88} borderRadius={14} />
                    <Skeleton height={88} borderRadius={14} />
                  </View>
                ) : (
                  <ModuleGridSkeleton columns={columns} cardWidth={moduleCardWidth} />
                )
              ) : modules.length === 0 ? (
                <View style={styles.modulesEmptyContainer}>
                  <Text style={styles.modulesEmptyText}>
                    {modulesLoadError ? 'Unable to load modules' : 'No modules available yet.'}
                  </Text>
                  <Text style={styles.modulesEmptySubtext}>
                    {modulesLoadError
                      ? modulesLoadError
                      : 'Check back later for new training content.'}
                  </Text>
                </View>
              ) : !selectedCategory ? (
                <View style={styles.modulesEmptyContainer}>
                  <Text style={styles.modulesEmptySubtext}>Loading program…</Text>
                </View>
              ) : modulesInCategory.length === 0 ? (
                <View style={styles.modulesEmptyContainer}>
                  <Text style={styles.modulesEmptyText}>No modules in this category yet</Text>
                  <Text style={styles.modulesEmptySubtext}>Check back later for new content.</Text>
                </View>
              ) : showWebProgramTrack && webProgramSections && webProgramSections.length > 0 ? (
                <View style={styles.webProgramWrap}>
                  <View style={styles.webCategoryHero}>
                    <ImageBackground
                      source={
                        modulesInCategory[0]?.thumbnailUrl
                          ? { uri: modulesInCategory[0].thumbnailUrl }
                          : require('../../assets/images/managemodulepic.png')
                      }
                      style={styles.webCategoryHeroBg}
                      imageStyle={styles.webCategoryHeroBgImage}
                    >
                      <View style={styles.webCategoryHeroOverlay}>
                        <Text style={styles.webCategoryHeroTitle}>{selectedCategory}</Text>
                        <Text style={styles.webCategoryHeroHint}>
                          Follow the steps below—complete each block at your pace.
                        </Text>
                      </View>
                    </ImageBackground>
                  </View>

                  <View style={styles.webStepper}>
                    {webProgramSections.map((sec, si) => (
                      <React.Fragment key={sec.phase}>
                        <View style={styles.webStepperSegment}>
                          <View style={styles.webStepperNode}>
                            <Text style={styles.webStepperNodeText}>{si + 1}</Text>
                          </View>
                          <Text style={styles.webStepperLabel} numberOfLines={2}>
                            {sec.title}
                          </Text>
                        </View>
                        {si < webProgramSections.length - 1 ? (
                          <View style={styles.webStepperConnector} />
                        ) : null}
                      </React.Fragment>
                    ))}
                  </View>

                  {webProgramSections.map((section) => (
                    <View key={section.phase} style={styles.webProgramSection}>
                      <View style={styles.webProgramSectionHead}>
                        <Text style={styles.webProgramSectionTitle}>{section.title}</Text>
                        <Text style={styles.webProgramSectionSub}>{section.subtitle}</Text>
                      </View>
                      <View style={styles.webModuleList}>
                        {section.items.map((module) => {
                          const durationMin = module.videoDuration
                            ? `${Math.ceil(module.videoDuration / 60)} min`
                            : '';
                          const imageSource = module.thumbnailUrl
                            ? { uri: module.thumbnailUrl }
                            : require('../../assets/images/managemodulepic.png');
                          const useGiPlaceholder =
                            (section.phase === 'warmup' ||
                              section.phase === 'introduction' ||
                              section.phase === 'cooldown') &&
                            !module.thumbnailUrl;
                          return (
                            <TouchableOpacity
                              key={module.moduleId}
                              style={[
                                styles.webModuleRow,
                                selectedModule === module.moduleId && styles.webModuleRowSelected,
                              ]}
                              onPress={() => selectDashboardModule(module)}
                              activeOpacity={0.88}
                              accessibilityRole="button"
                              accessibilityLabel={`Select module ${module.moduleTitle}`}
                            >
                              <View style={styles.webModuleRowMain}>
                                <View style={styles.webModuleBadge}>
                                  <Text style={styles.webModuleBadgeText}>{section.badge}</Text>
                                </View>
                                <Text style={styles.webModuleRowTitle} numberOfLines={2}>
                                  {module.moduleTitle}
                                </Text>
                                <View style={styles.webModuleRowMeta}>
                                  {durationMin ? (
                                    <Text style={styles.webModuleRowMetaText}>{durationMin}</Text>
                                  ) : null}
                                </View>
                              </View>
                              <View style={styles.webModuleRowThumbWrap}>
                                {useGiPlaceholder ? (
                                  <View style={styles.webModuleThumbGi}>
                                    <Ionicons name="body-outline" size={36} color="#07bbc0" />
                                  </View>
                                ) : (
                                  <Image
                                    source={imageSource}
                                    style={styles.webModuleThumb}
                                    resizeMode="cover"
                                  />
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <>
                {isMobile &&
                programSectionList.some(
                  (s) =>
                    s.phase === 'warmup' ||
                    s.phase === 'introduction' ||
                    s.phase === 'cooldown'
                ) ? (
                  <View style={styles.mobileLinkedProgramWrap}>
                    {programSectionList
                      .filter(
                        (s) =>
                          s.phase === 'warmup' ||
                          s.phase === 'introduction' ||
                          s.phase === 'cooldown'
                      )
                      .map((section) => (
                        <View key={section.phase} style={styles.mobileLinkedBlock}>
                          <View style={styles.mobileLinkedBlockHead}>
                            <Text style={styles.mobileLinkedBlockTitle}>{section.title}</Text>
                            <Text style={styles.mobileLinkedBlockSub}>{section.subtitle}</Text>
                          </View>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.mobileLinkedScrollContent}
                          >
                            {section.items.map((module) => {
                              const imageSource = module.thumbnailUrl
                                ? { uri: module.thumbnailUrl }
                                : require('../../assets/images/managemodulepic.png');
                              return (
                                <TouchableOpacity
                                  key={module.moduleId}
                                  style={[
                                    styles.mobileLinkedCard,
                                    selectedModule === module.moduleId && styles.mobileLinkedCardSelected,
                                  ]}
                                  onPress={() => selectDashboardModule(module)}
                                  activeOpacity={0.88}
                                >
                                  <ImageBackground
                                    source={imageSource}
                                    style={styles.mobileLinkedCardBg}
                                    imageStyle={styles.mobileLinkedCardBgImage}
                                  >
                                    <View style={styles.mobileLinkedCardOverlay}>
                                      <Text style={styles.mobileLinkedCardBadge}>
                                        {section.badge}
                                      </Text>
                                      <Text style={styles.mobileLinkedCardTitle} numberOfLines={2}>
                                        {module.moduleTitle}
                                      </Text>
                                    </View>
                                  </ImageBackground>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      ))}
                  </View>
                ) : null}
                {modulesInCategoryByLevel.map(({ label, items }) => (
                  <View key={label} style={{ marginBottom: 18, width: '100%' }}>
                    <Text style={styles.difficultySectionTitle}>{label}</Text>
                    <View style={styles.modulesGrid}>
                      {items.map((module, index) => {
                        const isEndOfRow = (index + 1) % columns === 0;
                        const durationMin = module.videoDuration
                          ? `${Math.ceil(module.videoDuration / 60)} min`
                          : '';
                        const imageSource = module.thumbnailUrl
                          ? { uri: module.thumbnailUrl }
                          : require('../../assets/images/managemodulepic.png');

                        return (
                          <View
                            key={module.moduleId}
                            style={[
                              styles.moduleCard,
                              {
                                width: moduleCardWidth,
                                marginRight: isEndOfRow ? 0 : moduleCardMarginRight,
                              },
                            ]}
                          >
                            <TouchableOpacity
                              style={[
                                styles.moduleCardTouchable,
                                selectedModule === module.moduleId && styles.moduleCardSelected,
                              ]}
                              onPress={() => selectDashboardModule(module)}
                              accessibilityRole="button"
                              accessibilityLabel={`Select training module ${module.moduleTitle}`}
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
                                    {durationMin ? (
                                      <View style={styles.moduleDurationBadge}>
                                        <Text style={styles.moduleDuration}>{durationMin}</Text>
                                      </View>
                                    ) : null}
                                  </View>
                                </View>
                              </ImageBackground>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Mobile Drawer */}
      {showMobileMenu && (
        <TouchableOpacity style={styles.drawerOverlay} activeOpacity={1} onPress={() => setShowMobileMenu(false)}>
          <View style={styles.drawerContainer}>
            <View style={styles.drawerHeader}>
              <Image source={require('../../assets/images/defendudashboardlogo.png')} style={styles.drawerLogo} resizeMode="contain" />
              <TouchableOpacity onPress={() => setShowMobileMenu(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { setShowMobileMenu(false); router.push('/dashboard'); }}>
              <Image source={require('../../assets/images/homeicon.png')} style={styles.drawerIcon} />
              <Text style={styles.drawerText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { setShowMobileMenu(false); router.push('/explore'); }}>
              <Ionicons name="compass-outline" size={22} color="#07bbc0" />
              <Text style={styles.drawerText}>Explore</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { setShowMobileMenu(false); router.push('/profile'); }}>
              <Image source={require('../../assets/images/blueprofileicon.png')} style={styles.drawerIcon} />
              <Text style={styles.drawerText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { setShowMobileMenu(false); router.push('/trainer'); }}>
              <Image source={require('../../assets/images/trainericon.png')} style={styles.drawerIcon} />
              <Text style={styles.drawerText}>Trainer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { setShowMobileMenu(false); handleMessages(); }}>
              <Image source={require('../../assets/images/messageicon.png')} style={styles.drawerIcon} />
              <Text style={styles.drawerText}>Messages</Text>
              {unreadCount > 0 && (
                <View style={styles.drawerBadge}><Text style={styles.unreadBadgeText}>{unreadDisplay}</Text></View>
              )}
            </TouchableOpacity>
            <View style={styles.drawerDivider} />
            <TouchableOpacity style={styles.drawerItem} onPress={() => { setShowMobileMenu(false); handleLogout(); }}>
              <Image source={require('../../assets/images/logouticon.png')} style={styles.drawerIcon} />
              <Text style={[styles.drawerText, { color: '#e57373' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
      <Toast message={toastMessage} visible={toastVisible} onHide={hideToast} duration={3200} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#041527' },
  container: { flex: 1, flexDirection: 'row' },
  sidebar: {
    backgroundColor: '#000E1C',
    width: 72,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRightWidth: 1,
    borderRightColor: 'rgba(7,187,192,0.08)',
  },
  sidebarIconsBottom: {
    flexDirection: 'column',
    width: '100%',
    alignItems: 'center',
  },
  sidebarButton: {
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
    cursor: 'pointer',
  },
  sidebarActive: {
    backgroundColor: 'rgba(2, 68, 70, 0.7)',
    borderLeftWidth: 3,
    borderLeftColor: '#07bbc0',
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
    cursor: 'pointer',
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
  mainContentVerticalScrollView: {
    flex: 1,
  },
  mainContentContainer: {
    paddingHorizontal: 30,
    paddingVertical: 25,
    paddingBottom: 40,
  },
  mainContentContainerMobile: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  logoImage: {
    width: 160,
    height: 52,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  welcomeSection: {
    marginBottom: 28,
    backgroundColor: 'rgba(7,187,192,0.04)',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.1)',
  },
  welcomeTextContainer: {
    marginTop: 8,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0,
  },
  welcomeSubtext: {
    fontSize: 13,
    color: 'rgba(107,134,147,0.9)',
    letterSpacing: 0.1,
  },
  recommendationsSection: {
    marginBottom: 28,
  },
  recommendationsSectionHeader: {
    marginBottom: 14,
  },
  recommendationsTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#07bbc0',
    marginBottom: 2,
    letterSpacing: 0.1,
  },
  recommendationsSubtext: {
    fontSize: 12,
    color: 'rgba(107,134,147,0.8)',
  },
  recommendedModulesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weeklyGoalContainer: {
    backgroundColor: '#021422',
    borderRadius: 20,
    padding: 22,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.18)',
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  weeklyGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  weeklyGoalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  weeklyGoalSubtitle: {
    fontSize: 12,
    color: 'rgba(107,134,147,0.8)',
  },
  weeklyGoalStats: {
    alignItems: 'flex-end',
  },
  weeklyGoalPercentage: {
    fontSize: 30,
    fontWeight: '700',
    color: '#07bbc0',
  },
  weeklyGoalLabel: {
    fontSize: 11,
    color: 'rgba(107,134,147,0.8)',
    marginTop: -2,
    letterSpacing: 0.3,
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(10,54,69,0.8)',
    borderRadius: 6,
    marginBottom: 18,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#07bbc0',
    borderRadius: 6,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayProgressContainer: {
    alignItems: 'center',
    cursor: 'pointer',
  },
  dayLabelContainer: {
    marginTop: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dayLabelContainerSelected: {
    backgroundColor: '#07bbc0',
  },
  dayLabel: {
    color: '#6b8693',
    fontSize: 12,
    fontWeight: '600',
  },
  dayLabelActive: {
    color: '#041527',
    fontWeight: '700',
  },
  todayBadge: {
    color: '#07bbc0',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 1,
    textAlign: 'center',
  },
  trainingHeader: {
    marginBottom: 14,
  },
  trainingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#07bbc0',
    letterSpacing: 1.5,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  trainingSubtitle: {
    fontSize: 13,
    color: 'rgba(107,134,147,0.8)',
  },
  categoryFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(6,39,49,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(7, 187, 192, 0.2)',
  },
  categoryPillActive: {
    backgroundColor: '#07bbc0',
    borderColor: '#07bbc0',
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryPillText: {
    color: 'rgba(107,134,147,0.9)',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#041527',
    fontWeight: '700',
  },
  categoryPillDisabled: {
    opacity: 0.38,
    borderColor: 'rgba(107,134,147,0.25)',
  },
  categoryPillTextDisabled: {
    color: 'rgba(107,134,147,0.55)',
  },
  modulesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingLeft: 0,
    paddingRight: 0,
    paddingBottom: 10,
    justifyContent: 'flex-start',
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  mobileLinkedProgramWrap: {
    width: '100%',
    marginBottom: 20,
    gap: 18,
  },
  mobileLinkedBlock: {
    width: '100%',
  },
  mobileLinkedBlockHead: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  mobileLinkedBlockTitle: {
    color: '#07bbc0',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mobileLinkedBlockSub: {
    color: '#8fa3b0',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  mobileLinkedScrollContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    paddingRight: 8,
    paddingVertical: 2,
  },
  mobileLinkedCard: {
    width: 168,
    minHeight: 118,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mobileLinkedCardSelected: {
    borderColor: '#07bbc0',
  },
  mobileLinkedCardBg: {
    width: '100%',
    minHeight: 118,
    justifyContent: 'flex-end',
  },
  mobileLinkedCardBgImage: {
    borderRadius: 12,
  },
  mobileLinkedCardOverlay: {
    padding: 10,
    backgroundColor: 'rgba(4,21,39,0.82)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  mobileLinkedCardBadge: {
    alignSelf: 'flex-start',
    fontSize: 9,
    fontWeight: '800',
    color: '#041527',
    backgroundColor: '#07bbc0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  mobileLinkedCardTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  difficultySectionTitle: {
    color: '#07bbc0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 6,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingLeft: 2,
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
    backgroundColor: 'rgba(4,21,39,0.5)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(10,54,69,0.8)',
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
    minHeight: 240,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 7,
  },
  moduleCardEndOfRow: {
    marginRight: 0,
  },
  moduleCardTouchable: {
    width: '100%',
    height: '100%',
    cursor: 'pointer',
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
    minHeight: 240,
  },
  moduleCardBackgroundImage: {
    resizeMode: 'cover',
    borderRadius: 18,
  },
  moduleCardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 10, 22, 0.72)',
    justifyContent: 'space-between',
    padding: 0,
  },
  moduleCardContent: {
    padding: 14,
    paddingTop: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  moduleHeader: {
    backgroundColor: 'rgba(4, 21, 39, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(7,187,192,0.15)',
  },
  moduleHeaderText: {
    color: '#07bbc0',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  moduleTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  moduleDescription: {
    color: 'rgba(184,205,217,0.85)',
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 17,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  moduleDurationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(7, 187, 192, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 2,
  },
  moduleDuration: {
    color: '#041527',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 14, 28, 0.6)',
  },
  menuContainer: {
    position: 'absolute',
    top: 20,
    left: 82,
    backgroundColor: '#021422',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.2)',
    paddingVertical: 8,
    minWidth: 190,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
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
    paddingVertical: 13,
    paddingHorizontal: 18,
    cursor: 'pointer',
  },
  menuIcon: {
    width: 22,
    height: 22,
    marginRight: 12,
    resizeMode: 'contain',
    tintColor: '#07bbc0',
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },

  /* Mobile Header */
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000E1C',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(7,187,192,0.08)',
  },
  hamburgerBtn: {
    padding: 4,
    position: 'relative',
  },
  hamburgerBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  mobileLogo: {
    width: 120,
    height: 36,
  },

  /* Mobile Drawer */
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,14,28,0.8)',
    zIndex: 1000,
  },
  drawerContainer: {
    width: 275,
    height: '100%',
    backgroundColor: '#010F1C',
    paddingTop: 24,
    paddingHorizontal: 20,
    borderRightWidth: 1,
    borderRightColor: 'rgba(7,187,192,0.1)',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(7,187,192,0.1)',
  },
  drawerLogo: {
    width: 110,
    height: 34,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 14,
    borderRadius: 10,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  drawerIcon: {
    width: 20,
    height: 20,
    tintColor: '#07bbc0',
    resizeMode: 'contain',
  },
  drawerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  drawerBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 'auto' as any,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: 'rgba(107,134,147,0.15)',
    marginVertical: 12,
    marginHorizontal: 8,
  },

  /* Web / tablet program track (category selected) */
  modulesContainerWebTrack: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    width: '100%',
  },
  webProgramWrap: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
  },
  webProgramSkeletonWrap: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    gap: 12,
  },
  webCategoryHero: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.22)',
  },
  webCategoryHeroBg: {
    width: '100%',
    minHeight: 140,
    justifyContent: 'flex-end',
  },
  webCategoryHeroBgImage: {
    resizeMode: 'cover',
  },
  webCategoryHeroOverlay: {
    backgroundColor: 'rgba(2, 10, 22, 0.78)',
    paddingVertical: 22,
    paddingHorizontal: 24,
  },
  webCategoryHeroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  webCategoryHeroHint: {
    fontSize: 14,
    color: 'rgba(184,205,217,0.88)',
    lineHeight: 20,
    maxWidth: 520,
  },
  webStepper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 28,
    paddingHorizontal: 4,
    gap: 4,
  },
  webStepperSegment: {
    alignItems: 'center',
    maxWidth: 100,
    minWidth: 72,
  },
  webStepperNode: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#07bbc0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(7,187,192,0.5)',
  },
  webStepperNodeText: {
    color: '#041527',
    fontSize: 15,
    fontWeight: '800',
  },
  webStepperLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#07bbc0',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    lineHeight: 13,
  },
  webStepperConnector: {
    width: 28,
    height: 3,
    backgroundColor: 'rgba(7,187,192,0.35)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 16,
    marginHorizontal: 2,
  },
  webProgramSection: {
    marginBottom: 26,
    width: '100%',
  },
  webProgramSectionHead: {
    marginBottom: 12,
    paddingLeft: 4,
  },
  webProgramSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#07bbc0',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  webProgramSectionSub: {
    fontSize: 13,
    color: 'rgba(107,134,147,0.9)',
    lineHeight: 18,
  },
  webModuleList: {
    width: '100%',
  },
  webModuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6,39,49,0.55)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.12)',
    width: '100%',
    cursor: 'pointer',
  },
  webModuleRowSelected: {
    borderColor: '#07bbc0',
    borderWidth: 1.5,
    backgroundColor: 'rgba(7,187,192,0.08)',
  },
  webModuleRowMain: {
    flex: 1,
    paddingRight: 12,
    minWidth: 0,
  },
  webModuleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#07bbc0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  webModuleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#041527',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  webModuleRowTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  webModuleRowSub: {
    fontSize: 13,
    color: 'rgba(184,205,217,0.82)',
    lineHeight: 18,
    marginBottom: 8,
  },
  webModuleRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  webModuleRowMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(7,187,192,0.95)',
  },
  webModuleRowThumbWrap: {
    flexShrink: 0,
  },
  webModuleThumb: {
    width: 88,
    height: 88,
    borderRadius: 14,
    backgroundColor: 'rgba(4,21,39,0.9)',
  },
  webModuleThumbGi: {
    width: 88,
    height: 88,
    borderRadius: 14,
    backgroundColor: 'rgba(4,21,39,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webProgramCta: {
    marginTop: 8,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#07bbc0',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignSelf: 'center',
    minWidth: 220,
    cursor: 'pointer',
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  webProgramCtaText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#041527',
    letterSpacing: 0.3,
  },
  webProgramCtaDisabled: {
    opacity: 0.45,
    shadowOpacity: 0.08,
  },
  mobileStartTraining: {
    marginTop: 8,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#07bbc0',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignSelf: 'stretch',
    maxWidth: 400,
    width: '100%',
  },
  mobileStartTrainingDisabled: {
    opacity: 0.45,
  },
  mobileStartTrainingText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#041527',
    letterSpacing: 0.3,
  },
});