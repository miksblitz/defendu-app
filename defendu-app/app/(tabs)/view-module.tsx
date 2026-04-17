import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    Image,
    Linking,
    Modal,
    Platform,
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
import { ModuleReview } from '../_models/ModuleReview';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';
import { AuthController } from '../controllers/AuthController';
import { markTrainingSafetyAcknowledged, shouldShowTrainingSafetyFirst } from '../_utils/trainingSafetySession';

type Step = 'intro' | 'safety' | 'video' | 'tryIt' | 'complete';

const CATEGORY_INTRO_STORAGE_PREFIX = '@defendu/category_intro_shown_v1/';

function routeParamToString(value: string | string[] | undefined): string {
  if (value == null) return '';
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' ? raw.trim() : '';
}

function normalizeCategoryKey(cat: string | undefined): string {
  return (cat ?? '').trim().toLowerCase();
}

/** Admin segment modules: no “rate category” when user backs out / goes home mid-flow. */
function isWarmupOrCooldownModule(m: Module | null | undefined): boolean {
  const seg = m?.moduleSegment;
  return seg === 'warmup' || seg === 'cooldown';
}

function moduleHasIntroductionContent(m: Module | null): boolean {
  if (!m) return false;
  if (m.introductionType === 'video' && (m.introductionVideoUrl ?? '').trim().length > 0) return true;
  // Introduction-segment modules often store the playable media as technique video.
  if (m.moduleSegment === 'introduction' && getTechniqueVideoUrl(m).trim().length > 0) return true;
  if (typeof m.introduction === 'string' && m.introduction.trim().length > 0) return true;
  return false;
}

function getIntroductionVideoUrl(module: Module | null): string {
  if (!module) return '';
  if (module.introductionType === 'video') {
    const introVideo = getPlayableVideoUrl(module.introductionVideoUrl);
    if (introVideo) return introVideo;
  }
  if (module.moduleSegment === 'introduction') {
    const techniqueVideo = getTechniqueVideoUrl(module);
    if (techniqueVideo) return techniqueVideo;
  }
  return '';
}

function isIntroductionSegmentModule(module: Module | null): boolean {
  return module?.moduleSegment === 'introduction';
}

/**
 * Normalize video URL for reliable playback (e.g. force MP4 for Cloudinary).
 * Some videos fail to play due to codec/format; this helps browsers play them.
 */
function getPlayableVideoUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string' || !url.trim()) return '';
  const u = url.trim();
  // Force MP4 delivery for Cloudinary videos so they play in more browsers/devices
  if (u.includes('res.cloudinary.com') && u.includes('/video/upload/') && !u.includes('f_mp4') && !u.includes('f_auto')) {
    return u.replace('/video/upload/', '/video/upload/f_mp4/');
  }
  return u;
}

/**
 * Open video URL in browser/tab when in-app playback fails.
 */
function openVideoInBrowser(url: string | undefined) {
  if (!url || !url.trim()) return;
  const u = url.trim();
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.open) {
    window.open(u, '_blank', 'noopener');
  } else {
    Linking.openURL(u).catch(() => {});
  }
}

function getTechniqueVideoUrl(module: Module | null): string {
  if (!module) return '';
  return (
    getPlayableVideoUrl(module.techniqueVideoUrl) ||
    module.techniqueVideoUrl2 ||
    module.techniqueVideoLink ||
    ''
  );
}

export default function ViewModulePage() {
  const router = useRouter();
  const handleLogout = useLogout();
  const { unreadCount, unreadDisplay, clearUnread } = useUnreadMessages();
  const params = useLocalSearchParams<{
    moduleId: string;
    categoryKey?: string;
    programOrder?: string;
  }>();
  const { moduleId } = params;
  const categoryKeyFromRoute = routeParamToString(params.categoryKey);
  const programOrderRaw = routeParamToString(params.programOrder);

  const resolvedModuleId = useMemo(() => {
    const raw = moduleId;
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    if (Array.isArray(raw) && typeof raw[0] === 'string' && raw[0].trim()) return raw[0].trim();
    return '';
  }, [moduleId]);

  const programOrderIds = useMemo(() => {
    if (!programOrderRaw) return [];
    return programOrderRaw.split(',').map((id) => id.trim()).filter(Boolean);
  }, [programOrderRaw]);

  const nextModuleId = useMemo(() => {
    if (!resolvedModuleId || programOrderIds.length === 0) return null;
    const idx = programOrderIds.indexOf(resolvedModuleId);
    if (idx < 0 || idx >= programOrderIds.length - 1) return null;
    return programOrderIds[idx + 1];
  }, [programOrderIds, resolvedModuleId]);
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('intro');
  const [showMenu, setShowMenu] = useState(false);
  const [introVideoError, setIntroVideoError] = useState(false);
  const [introVideoWatched, setIntroVideoWatched] = useState(false);
  // Try it yourself timer
  const [tryItRemainingSeconds, setTryItRemainingSeconds] = useState(0);
  const [tryItTotalSeconds, setTryItTotalSeconds] = useState(60);
  const [tryItPaused, setTryItPaused] = useState(false);
  const tryItTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Back from Try it → Safety only when user reached practice via Confirm on the safety screen for this module. */
  const tryItBackToSafetyRef = useRef(false);
  /** Latest navigate-to-dashboard (optional category review prompt on exit). */
  const exitToDashboardRef = useRef<(opts: { review: boolean }) => void>(() => {});
  // Reviews (Amazon-style)
  const [reviews, setReviews] = useState<ModuleReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);


  useEffect(() => {
    if (resolvedModuleId) {
      loadModule();
    }
  }, [resolvedModuleId]);

  const loadReviews = async () => {
    if (!resolvedModuleId) return;
    try {
      setReviewsLoading(true);
      const list = await AuthController.getModuleReviews(resolvedModuleId);
      setReviews(list);
    } catch (e) {
      console.error('Error loading reviews:', e);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (module && resolvedModuleId) {
      loadReviews();
    }
  }, [module?.moduleId, resolvedModuleId]);

  const categoryStorageKey = useMemo(
    () =>
      module ? normalizeCategoryKey(categoryKeyFromRoute || module.category || 'uncategorized') : '',
    [module, categoryKeyFromRoute]
  );

  useEffect(() => {
    exitToDashboardRef.current = (opts: { review: boolean }) => {
      const key = categoryStorageKey || normalizeCategoryKey(module?.category || '');
      const categoryLabel = (module?.category || categoryKeyFromRoute || '').trim();
      const wantCategoryReview =
        opts.review && key && !isWarmupOrCooldownModule(module);
      if (wantCategoryReview) {
        router.replace({
          pathname: '/dashboard',
          params: {
            reviewPrompt: '1',
            reviewCategoryKey: key,
            reviewCategory: categoryLabel,
            reviewTs: String(Date.now()),
          },
        } as any);
      } else {
        router.replace('/dashboard' as any);
      }
    };
  }, [categoryStorageKey, module, categoryKeyFromRoute, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'intro') {
        exitToDashboardRef.current({ review: true });
        return true;
      }
      if (step === 'safety') {
        exitToDashboardRef.current({ review: true });
        return true;
      }
      if (step === 'video') {
        setStep('safety');
        return true;
      }
      if (step === 'tryIt') {
        if (tryItBackToSafetyRef.current) {
          setStep('safety');
          return true;
        }
        exitToDashboardRef.current({ review: true });
        return true;
      }
      if (step === 'complete') {
        exitToDashboardRef.current({ review: true });
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [step]);

  const beginTryItPractice = (mod?: Module | null, backToSafetyAfterTryIt = false) => {
    const m = mod ?? module;
    if (!m) return;
    tryItBackToSafetyRef.current = backToSafetyAfterTryIt;
    const total = m.trainingDurationSeconds ?? 60;
    setTryItTotalSeconds(total);
    setTryItRemainingSeconds(total);
    setTryItPaused(false);
    setStep('tryIt');
  };

  const loadModule = async () => {
    try {
      setLoading(true);
      if (!resolvedModuleId) {
        router.replace('/dashboard' as any);
        return;
      }
      const data = await AuthController.getModuleByIdForUser(resolvedModuleId);
      if (!data) {
        router.replace('/dashboard' as any);
        return;
      }
      setModule(data);
      setIntroVideoError(false);
      setIntroVideoWatched(false);
      const hasIntroContent = moduleHasIntroductionContent(data);
      const isIntroductionSegment = isIntroductionSegmentModule(data);
      if (shouldShowTrainingSafetyFirst()) {
        setStep('safety');
      } else if (isIntroductionSegment && hasIntroContent) {
        setStep('video');
      } else {
        beginTryItPractice(data, false);
      }
    } catch (error) {
      console.error('Error loading module:', error);
      router.replace('/dashboard' as any);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    beginTryItPractice(undefined, false);
  };

  const finishModuleIntroToPractice = async () => {
    try {
      if (categoryStorageKey) {
        await AsyncStorage.setItem(`${CATEGORY_INTRO_STORAGE_PREFIX}${categoryStorageKey}`, '1');
      }
    } catch {
      /* ignore */
    }
    if (isIntroductionSegmentModule(module)) {
      setStep('complete');
      return;
    }
    beginTryItPractice(undefined, false);
  };

  const handleSafetyConfirm = () => {
    if (!module) return;
    markTrainingSafetyAcknowledged();
    if (isIntroductionSegmentModule(module) && moduleHasIntroductionContent(module)) {
      setStep('video');
      return;
    }
    beginTryItPractice(undefined, true);
  };

  // Timer tick for Try it yourself (depends only on step and pause so we don't recreate interval every second)
  useEffect(() => {
    if (step !== 'tryIt' || tryItPaused) {
      if (tryItTickRef.current) {
        clearInterval(tryItTickRef.current);
        tryItTickRef.current = null;
      }
      return;
    }
    tryItTickRef.current = setInterval(() => {
      setTryItRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (tryItTickRef.current) {
            clearInterval(tryItTickRef.current);
            tryItTickRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (tryItTickRef.current) {
        clearInterval(tryItTickRef.current);
        tryItTickRef.current = null;
      }
    };
  }, [step, tryItPaused]);

  const handlePracticeAgain = () => beginTryItPractice(undefined, false);
  const goDashboardWithReviewPrompt = () => exitToDashboardRef.current({ review: true });
  const handleMessages = () => {
    clearUnread();
    setShowMenu(false);
    router.push('/messages');
  };

  const handleNextModule = async () => {
    if (resolvedModuleId) {
      try {
        const newCount = await AuthController.recordModuleCompletion(resolvedModuleId);
        if (newCount > 0 && newCount % 5 === 0) {
          Alert.alert(
            'Recommendations updated!',
            'Your recommended modules have been refreshed. Check your dashboard.',
            [{ text: 'OK' }]
          );
        }
      } catch (e) {
        console.error('Error recording module completion:', e);
      }
    }
    const key = categoryStorageKey || normalizeCategoryKey(module?.category || '');
    const categoryLabel = (module?.category || categoryKeyFromRoute || '').trim();
    if (nextModuleId) {
      router.replace({
        pathname: '/view-module',
        params: {
          moduleId: nextModuleId,
          ...(key ? { categoryKey: key } : {}),
          ...(programOrderRaw ? { programOrder: programOrderRaw } : {}),
        },
      } as any);
    } else if (key) {
      router.replace({
        pathname: '/dashboard',
        params: {
          reviewPrompt: '1',
          reviewCategoryKey: key,
          reviewCategory: categoryLabel,
          reviewTs: String(Date.now()),
        },
      } as any);
    } else {
      router.replace('/dashboard' as any);
    }
  };

  const averageRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;
  const reviewCount = reviews.length;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading || !module) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#07bbc0" />
          <Text style={styles.loadingText}>Loading module...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <TouchableOpacity style={styles.sidebarTopButton} onPress={() => setShowMenu(true)}>
            <Image source={require('../../assets/images/threedoticon.png')} style={styles.threeDotIcon} resizeMode="contain" />
          </TouchableOpacity>
          <View style={styles.sidebarIconsBottom}>
            <TouchableOpacity style={styles.sidebarButton} onPress={() => router.push('/profile')}>
              <Image source={require('../../assets/images/blueprofileicon.png')} style={styles.iconImage} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sidebarButton} onPress={() => router.push('/trainer')}>
              <Image source={require('../../assets/images/trainericon.png')} style={styles.iconImage} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sidebarButton} onPress={goDashboardWithReviewPrompt}>
              <Image source={require('../../assets/images/homeicon.png')} style={styles.iconImage} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === 'intro') goDashboardWithReviewPrompt();
              else if (step === 'safety') goDashboardWithReviewPrompt();
              else if (step === 'video') setStep('safety');
              else if (step === 'tryIt') {
                if (tryItBackToSafetyRef.current) setStep('safety');
                else goDashboardWithReviewPrompt();
              }
              else if (step === 'complete') goDashboardWithReviewPrompt();
            }}
          >
            <Image source={require('../../assets/images/backbuttonicon.png')} style={styles.backButtonIcon} resizeMode="contain" />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {step === 'intro' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{module.moduleTitle}</Text>
                <View style={styles.thumbnailContainer}>
                  {module.thumbnailUrl ? (
                    <Image source={{ uri: module.thumbnailUrl }} style={styles.thumbnailImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.thumbnailPlaceholder}>
                      <Ionicons name="fitness" size={64} color="#07bbc0" />
                    </View>
                  )}
                </View>
                {/* Rating summary - Amazon style */}
                <View style={styles.ratingRow}>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Ionicons
                        key={i}
                        name={i <= Math.round(averageRating) ? 'star' : 'star-outline'}
                        size={18}
                        color="#f0c14b"
                        style={styles.starIcon}
                      />
                    ))}
                  </View>
                  <Text style={styles.ratingAverage}>
                    {reviewCount > 0 ? averageRating.toFixed(1) : '—'}
                  </Text>
                  <Text style={styles.ratingCount}>
                    {reviewCount === 0 ? 'No reviews yet' : reviewCount === 1 ? '1 review' : `${reviewCount} reviews`}
                  </Text>
                  {reviewCount > 0 && (
                    <TouchableOpacity
                      style={styles.showAllReviewsButton}
                      onPress={() => setShowAllReviewsModal(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.showAllReviewsButtonText}>Show all reviews</Text>
                      <Ionicons name="chevron-forward" size={16} color="#07bbc0" />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.mediaSection}>
                  <Text style={styles.mediaSectionTitle}>Technique Video</Text>
                  {getTechniqueVideoUrl(module) ? (
                    <TouchableOpacity
                      style={styles.videoErrorButton}
                      onPress={() => openVideoInBrowser(getTechniqueVideoUrl(module))}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="play-circle-outline" size={20} color="#07bbc0" style={{ marginRight: 8 }} />
                      <Text style={styles.videoErrorButtonText}>Open technique video</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.mediaFallbackText}>No technique video provided.</Text>
                  )}
                  <Text style={styles.mediaSectionTitle}>Reference Guide</Text>
                  {module.referenceGuideUrl ? (
                    <>
                      <Image
                        source={{ uri: module.referenceGuideUrl }}
                        style={styles.referenceGuideImage}
                        resizeMode="contain"
                      />
                      <TouchableOpacity
                        style={styles.videoErrorButton}
                        onPress={() => Linking.openURL(module.referenceGuideUrl!)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="images-outline" size={20} color="#07bbc0" style={{ marginRight: 8 }} />
                        <Text style={styles.videoErrorButtonText}>Open reference guide</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <Text style={styles.mediaFallbackText}>No reference guide provided.</Text>
                  )}
                </View>

                <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.8}>
                  <Text style={styles.startButtonText}>Start</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'safety' && (
              <View style={styles.card}>
                <Text style={styles.safetyTitle}>Safety Protocol</Text>
                <Text style={styles.safetyIntro}>Please read and confirm the following before starting this module:</Text>
                <View style={styles.safetyList}>
                  <Text style={styles.safetyItem}>• Ensure you have enough space to move safely with no obstacles.</Text>
                  <Text style={styles.safetyItem}>• Warm up before practicing. Do not train if you feel unwell or injured.</Text>
                  <Text style={styles.safetyItem}>• This content is for educational purposes. Train at your own risk and within your ability.</Text>
                  <Text style={styles.safetyItem}>• If using camera-based features, make sure the area behind you is clear.</Text>
                </View>
                <TouchableOpacity style={styles.startButton} onPress={handleSafetyConfirm} activeOpacity={0.8}>
                  <Text style={styles.startButtonText}>Confirm & Continue</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={goDashboardWithReviewPrompt}
                  activeOpacity={0.8}
                >
                  <Text style={styles.continueButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'video' && (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>Module Introduction</Text>
                {getIntroductionVideoUrl(module) ? (
                  <>
                    {Platform.OS === 'web' ? (
                      introVideoError ? (
                        <View style={styles.videoErrorContainer}>
                          <Ionicons name="alert-circle-outline" size={40} color="#FFA500" />
                          <Text style={styles.videoErrorText}>This video couldn't be played here.</Text>
                          <TouchableOpacity
                            style={styles.videoErrorButton}
                            onPress={() => openVideoInBrowser(getIntroductionVideoUrl(module))}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="open-outline" size={20} color="#07bbc0" style={{ marginRight: 8 }} />
                            <Text style={styles.videoErrorButtonText}>Open video in new tab</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.continueButton}
                            onPress={() => {
                              setIntroVideoWatched(true);
                              finishModuleIntroToPractice();
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.continueButtonText}>Continue without watching</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <video
                          src={getIntroductionVideoUrl(module)}
                          controls
                          style={styles.videoPlayer as any}
                          playsInline
                          onEnded={() => setIntroVideoWatched(true)}
                          onError={() => setIntroVideoError(true)}
                          onLoadedData={() => setIntroVideoError(false)}
                        />
                      )
                    ) : (
                      <View style={styles.videoPlaceholder}>
                        <Ionicons name="play-circle" size={48} color="#07bbc0" />
                        <Text style={styles.videoPlaceholderText}>Video: {module.moduleTitle}</Text>
                        <TouchableOpacity
                          style={styles.videoErrorButton}
                          onPress={() => openVideoInBrowser(getIntroductionVideoUrl(module))}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.videoErrorButtonText}>Open video in browser</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <TouchableOpacity style={styles.primaryButton} onPress={finishModuleIntroToPractice} activeOpacity={0.8}>
                      <Text style={styles.primaryButtonText}>Continue to practice</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {module.introduction ? (
                      <Text style={styles.introText}>{module.introduction}</Text>
                    ) : null}
                    <TouchableOpacity style={styles.primaryButton} onPress={finishModuleIntroToPractice} activeOpacity={0.8}>
                      <Text style={styles.primaryButtonText}>Continue to practice</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity style={styles.continueButton} onPress={() => setStep('safety')} activeOpacity={0.8}>
                  <Text style={styles.continueButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'tryIt' && (
              <View style={styles.card}>
                <View style={styles.tryItTopSection}>
                  <View style={styles.tryItHeroColumn}>
                    <View style={styles.tryItHero}>
                      <View style={styles.tryItHeroAccentBar} />
                      <Text style={styles.tryItHeroTitle} numberOfLines={4}>
                        {module.moduleTitle?.trim() || 'Training module'}
                      </Text>
                      <Text style={styles.tryItHeroTagline}>Your mat. Your tempo. Make every second count.</Text>
                    </View>
                  </View>
                  <View style={styles.tryItTimerCorner}>
                    <Svg width={108} height={108} style={styles.tryItTimerSvg}>
                      <Circle
                        stroke="#0a3645"
                        fill="none"
                        cx={54}
                        cy={54}
                        r={46}
                        strokeWidth={6}
                      />
                      <Circle
                        stroke="#07bbc0"
                        fill="none"
                        cx={54}
                        cy={54}
                        r={46}
                        strokeWidth={6}
                        strokeDasharray={`${2 * Math.PI * 46} ${2 * Math.PI * 46}`}
                        strokeDashoffset={(2 * Math.PI * 46) * (1 - tryItRemainingSeconds / tryItTotalSeconds)}
                        strokeLinecap="round"
                        rotation="-90"
                        origin="54, 54"
                      />
                    </Svg>
                    <View style={styles.tryItTimerCenterText}>
                      <Text style={styles.tryItTimerTimeText}>{formatTime(tryItRemainingSeconds)}</Text>
                      <Text style={styles.tryItTimerLabel}>left</Text>
                    </View>
                  </View>
                </View>
                {module.referenceGuideUrl ? (
                  <ExpoImage
                    source={{ uri: module.referenceGuideUrl }}
                    style={styles.tryItGifInCard}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                ) : null}
                <Text style={styles.tryItSubtext}>
                  Practice for {formatTime(tryItTotalSeconds)}. Timer counts down; you can pause and resume.
                </Text>
                {tryItRemainingSeconds > 0 ? (
                  <>
                    <TouchableOpacity
                      style={styles.timerControlButton}
                      onPress={() => setTryItPaused(!tryItPaused)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={tryItPaused ? 'play' : 'pause'} size={28} color="#FFFFFF" style={{ marginRight: 10 }} />
                      <Text style={styles.timerControlButtonText}>{tryItPaused ? 'Resume' : 'Pause'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.continueButton} onPress={() => setStep('complete')} activeOpacity={0.8}>
                      <Text style={styles.continueButtonText}>Finish</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.timesUpText}>Time's up!</Text>
                    <TouchableOpacity style={styles.continueButton} onPress={() => setStep('complete')} activeOpacity={0.8}>
                      <Text style={styles.continueButtonText}>Continue to Complete</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {step === 'complete' && (
              <View style={styles.card}>
                <View style={styles.completeHeader}>
                  <Ionicons name="trophy-outline" size={28} color="#07bbc0" style={{ marginRight: 8 }} />
                  <Text style={styles.completeTitle}>Module Complete!</Text>
                </View>
                <Text style={styles.completeMessage}>
                  You've successfully finished '{module.moduleTitle}'.
                </Text>
                <View style={styles.progressSection}>
                  <Text style={styles.progressLabel}>Your Progress:</Text>
                  <View style={styles.progressBarBg}>
                    <View style={styles.progressBarFill} />
                  </View>
                  <Text style={styles.progressPercent}>100%</Text>
                </View>

                <View style={styles.posePromoCard}>
                  <View style={styles.posePromoAccentBar} />
                  <View style={styles.posePromoInner}>
                    <Text style={styles.posePromoKicker}>
                      ⚡ Visit the DEFENDU mobile application to try our pose estimation feature
                    </Text>
                    <Text style={styles.posePromoTitle}>🎮 TRAIN LIKE A FIGHTER</Text>
                    <Text style={styles.posePromoLead}>Your body is the controller.</Text>
                    <Text style={styles.posePromoLeadSecondary}>Our AI is your coach.</Text>
                    <View style={styles.posePromoCallouts}>
                      <Text style={styles.posePromoCallout}>🥊 Strike Accuracy Detection</Text>
                      <Text style={styles.posePromoCallout}>🧠 Smart Pose Analysis</Text>
                      <Text style={styles.posePromoCallout}>📊 Real-Time Scoring System</Text>
                      <Text style={styles.posePromoCallout}>🔥 Perfect Rep Recognition</Text>
                    </View>
                    <Text style={styles.posePromoTagline}>“Every move counts. Every rep matters.”</Text>
                    <Text style={styles.posePromoCta}>
                      {Platform.OS === 'web'
                        ? '👉 Download now and master your form!'
                        : '👉 Keep the app updated — pose estimation & live scoring are built for mobile.'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.outlineButton} onPress={handlePracticeAgain} activeOpacity={0.8}>
                  <Text style={styles.outlineButtonText}>Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleNextModule} activeOpacity={0.8}>
                  <Text style={styles.primaryButtonText}>{nextModuleId ? 'Next Module' : 'Done'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

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
                style={styles.menuIcon}
                resizeMode="contain"
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
                resizeMode="contain"
              />
              <Text style={styles.menuText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <Modal
        visible={showAllReviewsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAllReviewsModal(false)}
      >
        <TouchableOpacity
          style={styles.reviewsModalOverlay}
          activeOpacity={1}
          onPress={() => setShowAllReviewsModal(false)}
        >
          <View style={styles.reviewsModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.reviewsModalHeader}>
              <Text style={styles.reviewsModalTitle}>All reviews</Text>
              <TouchableOpacity
                style={styles.reviewsModalCloseButton}
                onPress={() => setShowAllReviewsModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.reviewsModalScroll} showsVerticalScrollIndicator>
              {reviews.length === 0 ? (
                <Text style={styles.reviewsModalEmpty}>No reviews yet.</Text>
              ) : (
                reviews.map((r) => (
                  <View key={r.userId + r.createdAt.getTime()} style={styles.reviewItem}>
                    <View style={styles.reviewItemHeader}>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Ionicons
                            key={i}
                            name={i <= r.rating ? 'star' : 'star-outline'}
                            size={14}
                            color="#f0c14b"
                            style={styles.starIconSmall}
                          />
                        ))}
                      </View>
                      <Text style={styles.reviewAuthor}>{r.userName}</Text>
                    </View>
                    {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#041527' },
  container: { flex: 1, flexDirection: 'row' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { color: '#6b8693', fontSize: 14 },
  sidebar: {
    width: 80,
    backgroundColor: '#000E1C',
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sidebarTopButton: { padding: 8 },
  threeDotIcon: { width: 24, height: 24 },
  sidebarIconsBottom: { alignItems: 'center', gap: 16 },
  sidebarButton: { padding: 8 },
  iconImage: { width: 28, height: 28 },
  mainContent: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 25,
    left: 30,
    zIndex: 10,
    padding: 8,
  },
  backButtonIcon: { width: 24, height: 24 },
  scrollContent: { paddingTop: 60, paddingBottom: 40 },
  card: {
    backgroundColor: '#011f36',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#0a3645',
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0a3645',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  thumbnailImage: { width: '100%', height: '100%' },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
  starIcon: { marginRight: 2 },
  starIconSmall: { marginRight: 1 },
  ratingAverage: {
    color: '#f0c14b',
    fontSize: 16,
    fontWeight: '700',
  },
  ratingCount: {
    color: '#6b8693',
    fontSize: 14,
  },
  showAllReviewsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  showAllReviewsButtonBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#07bbc0',
    borderRadius: 12,
    gap: 8,
  },
  showAllReviewsButtonText: {
    color: '#07bbc0',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  reviewsModalContent: {
    backgroundColor: '#011f36',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0a3645',
    maxWidth: 480,
    width: '100%',
    maxHeight: '80%',
  },
  reviewsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0a3645',
  },
  reviewsModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  reviewsModalCloseButton: {
    padding: 4,
  },
  reviewsModalScroll: {
    padding: 20,
    maxHeight: 400,
  },
  reviewsModalEmpty: {
    color: '#6b8693',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  reviewsSection: {
    marginTop: 8,
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#0a3645',
  },
  reviewsSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  reviewItem: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0a3645',
  },
  reviewItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  reviewAuthor: { color: '#6b8693', fontSize: 13, fontWeight: '600' },
  reviewComment: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  starTouchable: { padding: 4 },
  rateSection: {
    marginTop: 8,
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#0a3645',
  },
  rateSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  rateHint: { color: '#6b8693', fontSize: 13, marginBottom: 12 },
  commentLabel: { color: '#6b8693', fontSize: 14, marginBottom: 6 },
  commentInput: {
    backgroundColor: '#0a3645',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 80,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  buttonDisabled: { opacity: 0.5 },
  thankYouRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  thankYouText: { color: '#07bbc0', fontSize: 16, fontWeight: '600' },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  mediaSection: {
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#0a3645',
    paddingTop: 14,
  },
  mediaSectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 2,
  },
  mediaFallbackText: {
    color: '#6b8693',
    fontSize: 14,
    marginBottom: 12,
  },
  referenceGuideImage: {
    width: '100%',
    minHeight: 180,
    maxHeight: 280,
    borderRadius: 10,
    backgroundColor: '#0a3645',
    marginBottom: 12,
  },
  tryItGifInCard: {
    width: '100%',
    height: 320,
    alignSelf: 'center',
    marginBottom: 16,
  },
  tryItTopSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0a3645',
  },
  tryItHeroColumn: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  tryItTimerCorner: {
    width: 108,
    height: 108,
    position: 'relative',
    flexShrink: 0,
    marginTop: 2,
  },
  tryItTimerSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  tryItTimerCenterText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tryItTimerTimeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  tryItTimerLabel: {
    color: '#6b8693',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  safetyTitle: {
    color: '#07bbc0',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  safetyIntro: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 16,
  },
  safetyList: {
    marginBottom: 24,
  },
  safetyItem: {
    color: '#6b8693',
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 22,
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  tryItHero: {
    width: '100%',
  },
  tryItHeroAccentBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#07bbc0',
    marginBottom: 14,
  },
  tryItHeroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    letterSpacing: -0.3,
    marginBottom: 10,
    textShadowColor: 'rgba(7, 187, 192, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  tryItHeroTagline: {
    color: '#8aa3b0',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 21,
    fontWeight: '500',
  },
  videoPlayer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  videoPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0a3645',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  videoPlaceholderText: { color: '#6b8693', fontSize: 14 },
  videoErrorContainer: {
    width: '100%',
    minHeight: 200,
    backgroundColor: '#0a3645',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  videoErrorText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
  videoErrorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#07bbc0',
    marginTop: 8,
  },
  videoErrorButtonText: {
    color: '#07bbc0',
    fontSize: 14,
    fontWeight: '600',
  },
  introText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  continueButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  continueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  tryItSubtext: {
    color: '#6b8693',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  timerControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07bbc0',
    paddingVertical: 14,
    borderRadius: 12,
  },
  timerControlButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  timesUpText: {
    color: '#07bbc0',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  completeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  completeTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  completeMessage: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  progressSection: { marginBottom: 12 },
  progressLabel: { color: '#6b8693', fontSize: 14, marginBottom: 8 },
  progressBarBg: {
    height: 8,
    backgroundColor: '#0a3645',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    width: '100%',
    backgroundColor: '#07bbc0',
    borderRadius: 4,
  },
  progressPercent: { color: '#07bbc0', fontSize: 14, fontWeight: '700' },
  posePromoCard: {
    marginTop: 8,
    marginBottom: 22,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(240, 193, 75, 0.45)',
    backgroundColor: '#050f18',
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  posePromoAccentBar: {
    height: 4,
    width: '100%',
    backgroundColor: '#f0c14b',
  },
  posePromoInner: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderLeftWidth: 3,
    borderLeftColor: '#07bbc0',
  },
  posePromoKicker: {
    color: 'rgba(184, 205, 217, 0.95)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
    lineHeight: 16,
  },
  posePromoTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 12,
    textShadowColor: 'rgba(7, 187, 192, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  posePromoLead: {
    color: '#07bbc0',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  posePromoLeadSecondary: {
    color: '#e8f4f8',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  posePromoCallouts: {
    gap: 10,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(7, 187, 192, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(7, 187, 192, 0.22)',
  },
  posePromoCallout: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  posePromoTagline: {
    color: '#f0c14b',
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 20,
  },
  posePromoCta: {
    color: '#07bbc0',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: '#07bbc0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  outlineButtonText: { color: '#07bbc0', fontSize: 16, fontWeight: '600' },
  primaryButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
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
  },
  menuIcon: {
    width: 22,
    height: 22,
    marginRight: 12,
    tintColor: '#07bbc0',
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
});
