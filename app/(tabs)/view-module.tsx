import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  Linking,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { AuthController } from '../controllers/AuthController';
import { Module } from '../_models/Module';
import { ModuleReview } from '../_models/ModuleReview';
import { useLogout } from '../../hooks/useLogout';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';

type Step = 'intro' | 'video' | 'tryIt' | 'complete';

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

export default function ViewModulePage() {
  const router = useRouter();
  const handleLogout = useLogout();
  const { unreadCount, unreadDisplay, clearUnread } = useUnreadMessages();
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
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
  // Reviews (Amazon-style)
  const [reviews, setReviews] = useState<ModuleReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);

  useEffect(() => {
    if (moduleId) {
      loadModule();
    }
  }, [moduleId]);

  const loadReviews = async () => {
    if (!moduleId) return;
    try {
      setReviewsLoading(true);
      const list = await AuthController.getModuleReviews(moduleId);
      setReviews(list);
      // One review per user: if current user already reviewed, prefill and mark as submitted
      const currentUser = await AuthController.getCurrentUser();
      if (currentUser) {
        const myReview = list.find((r) => r.userId === currentUser.uid);
        if (myReview) {
          setReviewSubmitted(true);
          setUserRating(myReview.rating);
          setUserComment(myReview.comment || '');
        }
      }
    } catch (e) {
      console.error('Error loading reviews:', e);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (module && moduleId) {
      loadReviews();
    }
  }, [module?.moduleId, moduleId]);

  const loadModule = async () => {
    try {
      setLoading(true);
      if (!moduleId) {
        router.replace('/dashboard');
        return;
      }
      const data = await AuthController.getModuleByIdForUser(moduleId);
      if (!data) {
        router.replace('/dashboard');
        return;
      }
      setModule(data);
      setStep('intro');
      setIntroVideoError(false);
    } catch (error) {
      console.error('Error loading module:', error);
      router.replace('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    const hasVideoIntro = module?.introductionType === 'video' && module?.introductionVideoUrl;
    const hasTextIntro = module?.introductionType === 'text' && module?.introduction?.trim();
    if (hasVideoIntro || hasTextIntro) {
      setStep('video');
      if (hasTextIntro) setIntroVideoWatched(true);
    } else {
      setStep('complete');
    }
  };

  const handleIntroDone = () => {
    setStep('complete');
  };

  const handleTryItYourself = () => {
    const total = module?.trainingDurationSeconds ?? 60;
    setTryItTotalSeconds(total);
    setTryItRemainingSeconds(total);
    setTryItPaused(false);
    setStep('tryIt');
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

  const handleReviewModule = () => setStep('intro');
  const handlePracticeAgain = () => setStep('video');
  const handleMessages = () => {
    clearUnread();
    setShowMenu(false);
    router.push('/messages');
  };

  const handleSaveProgress = async () => {
    if (moduleId) {
      try {
        const newCount = await AuthController.recordModuleCompletion(moduleId);
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
    router.replace('/dashboard');
  };

  const averageRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;
  const reviewCount = reviews.length;

  const handleSubmitReview = async () => {
    if (!moduleId || userRating < 1) return;
    try {
      setReviewSubmitting(true);
      await AuthController.submitModuleReview(moduleId, userRating, userComment || undefined);
      setReviewSubmitted(true);
      setUserComment('');
      await loadReviews();
    } catch (e) {
      console.error('Error submitting review:', e);
    } finally {
      setReviewSubmitting(false);
    }
  };

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
            <TouchableOpacity style={styles.sidebarButton} onPress={() => router.replace('/dashboard')}>
              <Image source={require('../../assets/images/homeicon.png')} style={styles.iconImage} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === 'intro') router.replace('/dashboard');
              else if (step === 'video') setStep('intro');
              else if (step === 'tryIt') setStep('video');
              else if (step === 'complete') router.replace('/dashboard');
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
                <Text style={styles.cardDescription}>{module.description}</Text>
                <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.8}>
                  <Text style={styles.startButtonText}>Start</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'video' && (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>Module Introduction</Text>
                {module.introductionType === 'video' && module.introductionVideoUrl ? (
                  <>
                    {Platform.OS === 'web' ? (
                      introVideoError ? (
                        <View style={styles.videoErrorContainer}>
                          <Ionicons name="alert-circle-outline" size={40} color="#FFA500" />
                          <Text style={styles.videoErrorText}>This video couldn't be played here.</Text>
                          <TouchableOpacity
                            style={styles.videoErrorButton}
                            onPress={() => openVideoInBrowser(module.introductionVideoUrl)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="open-outline" size={20} color="#07bbc0" style={{ marginRight: 8 }} />
                            <Text style={styles.videoErrorButtonText}>Open video in new tab</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.continueButton} onPress={() => { setIntroVideoWatched(true); handleIntroDone(); }} activeOpacity={0.8}>
                            <Text style={styles.continueButtonText}>Continue without watching</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <video
                          src={getPlayableVideoUrl(module.introductionVideoUrl)}
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
                          onPress={() => openVideoInBrowser(module.introductionVideoUrl)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.videoErrorButtonText}>Open video in browser</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <TouchableOpacity style={styles.tryItButton} onPress={handleTryItYourself} activeOpacity={0.8}>
                      <Ionicons name="fitness-outline" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.tryItButtonText}>Try it yourself</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.continueButton} onPress={handleIntroDone} activeOpacity={0.8}>
                      <Text style={styles.continueButtonText}>Continue to Complete</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {module.introduction ? (
                      <Text style={styles.introText}>{module.introduction}</Text>
                    ) : null}
                    <TouchableOpacity style={styles.tryItButton} onPress={handleTryItYourself} activeOpacity={0.8}>
                      <Ionicons name="fitness-outline" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.tryItButtonText}>Try it yourself</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.continueButton} onPress={handleIntroDone} activeOpacity={0.8}>
                      <Text style={styles.continueButtonText}>Continue to Complete</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {step === 'tryIt' && (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>Try it yourself</Text>
                <Text style={styles.tryItSubtext}>
                  Practice for {formatTime(tryItTotalSeconds)}. Timer counts down; you can pause and resume.
                </Text>
                <View style={styles.timerCircleWrap}>
                  <Svg width={220} height={220} style={styles.timerSvg}>
                    <Circle
                      stroke="#0a3645"
                      fill="none"
                      cx={110}
                      cy={110}
                      r={100}
                      strokeWidth={10}
                    />
                    <Circle
                      stroke="#07bbc0"
                      fill="none"
                      cx={110}
                      cy={110}
                      r={100}
                      strokeWidth={10}
                      strokeDasharray={`${2 * Math.PI * 100} ${2 * Math.PI * 100}`}
                      strokeDashoffset={(2 * Math.PI * 100) * (1 - tryItRemainingSeconds / tryItTotalSeconds)}
                      strokeLinecap="round"
                      rotation="-90"
                      origin="110, 110"
                    />
                  </Svg>
                  <View style={styles.timerTextContainer}>
                    <Text style={styles.timerTimeText}>{formatTime(tryItRemainingSeconds)}</Text>
                    <Text style={styles.timerLabel}>time left</Text>
                  </View>
                </View>
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
                <Text style={styles.metricsText}>Accuracy: 92% | Consistency: 88%</Text>

                {/* Rate this module - Amazon style (one review per user) */}
                <View style={styles.rateSection}>
                  <Text style={styles.rateSectionTitle}>Rate this module</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => !reviewSubmitted && setUserRating(i)}
                        style={styles.starTouchable}
                        activeOpacity={reviewSubmitted ? 1 : 0.7}
                        disabled={reviewSubmitted}
                      >
                        <Ionicons
                          name={userRating >= i ? 'star' : 'star-outline'}
                          size={32}
                          color="#f0c14b"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.rateHint}>
                    {reviewSubmitted ? 'You have already reviewed this module.' : 'Tap to rate 1–5 stars'}
                  </Text>
                  <Text style={styles.commentLabel}>Comment (optional)</Text>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Share your experience with this module..."
                    placeholderTextColor="#6b8693"
                    value={userComment}
                    onChangeText={setUserComment}
                    multiline
                    numberOfLines={3}
                    editable={!reviewSubmitting && !reviewSubmitted}
                  />
                  <TouchableOpacity
                    style={[styles.primaryButton, (userRating < 1 && !reviewSubmitted) && styles.buttonDisabled, reviewSubmitted && styles.buttonDisabled]}
                    onPress={reviewSubmitted ? undefined : handleSubmitReview}
                    disabled={(!reviewSubmitted && (userRating < 1 || reviewSubmitting)) || reviewSubmitted}
                    activeOpacity={reviewSubmitted ? 1 : 0.8}
                  >
                    <Text style={styles.primaryButtonText}>
                      {reviewSubmitted
                        ? 'You have already rated this module'
                        : reviewSubmitting
                          ? 'Submitting...'
                          : 'Submit review'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Show all reviews */}
                {(reviewsLoading || reviews.length > 0) && (
                  <TouchableOpacity
                    style={styles.showAllReviewsButtonBlock}
                    onPress={() => setShowAllReviewsModal(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.showAllReviewsButtonText}>
                      {reviewsLoading ? 'Loading...' : `Show all reviews (${reviewCount})`}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#07bbc0" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.outlineButton} onPress={handleReviewModule} activeOpacity={0.8}>
                  <Text style={styles.outlineButtonText}>Review Module</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.outlineButton} onPress={handlePracticeAgain} activeOpacity={0.8}>
                  <Text style={styles.outlineButtonText}>Practice Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleSaveProgress} activeOpacity={0.8}>
                  <Text style={styles.primaryButtonText}>Save Progress</Text>
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
  startButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
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
  tryItButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a3645',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#07bbc0',
  },
  tryItButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  tryItSubtext: {
    color: '#6b8693',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  timerCircleWrap: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  timerSvg: { alignSelf: 'center' },
  timerTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerTimeText: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '700',
  },
  timerLabel: {
    color: '#6b8693',
    fontSize: 14,
    marginTop: 4,
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
  metricsText: { color: '#FFFFFF', fontSize: 14, marginBottom: 24 },
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
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
