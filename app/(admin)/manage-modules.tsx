import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from '../../components/Toast';
import { useLogout } from '../../hooks/useLogout';
import { useToast } from '../../hooks/useToast';
import { Module } from '../_models/Module';
import { AuthController } from '../controllers/AuthController';

const MODULE_CATEGORIES = [
  'All',
  'Punching',
  'Kicking',
  'Palm Strikes',
  'Elbow Strikes',
  'Knee Strikes',
  'Defensive Moves',
];

const DELETION_REASONS = [
  'Inappropriate content',
  'Incomplete information',
  'Poor video quality',
  'Does not meet safety standards',
  'Incorrect technique demonstration',
  'Violates community guidelines',
  'Duplicate module',
  'No longer needed',
  'Other (specify below)',
];

type FilterType = 'active' | 'pending';

export default function ManageModulesPage() {
  const router = useRouter();
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();
  const handleLogout = useLogout();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [customDeletionReason, setCustomDeletionReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  // Animation refs
  const headerAnim = useRef(new Animated.Value(0)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;
  const animatedValues = useRef<Map<string, Animated.Value>>(new Map()).current;
  const hoverScales = useRef<Map<string, Animated.Value>>(new Map()).current;

  useEffect(() => {
    loadModules();
  }, []);
  
  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(filterAnim, {
          toValue: 1,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  // Reset search when filter changes
  useEffect(() => {
    setSearchQuery('');
  }, [filterType]);

  const loadModules = async () => {
    try {
      setLoading(true);
      console.log('🔵 Loading modules...');
      const allModules = await AuthController.getAllModules();
      console.log('✅ Loaded modules:', allModules.length);
      setModules(allModules);
    } catch (error: any) {
      console.error('❌ Error loading modules:', error);
      showToast(error.message || 'Failed to load modules');
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter modules based on status, category, and search query
  const filteredModules = useMemo(() => {
    let filtered = modules;

    // Filter by status
    if (filterType === 'active') {
      filtered = filtered.filter((module) => module.status === 'approved');
    } else if (filterType === 'pending') {
      filtered = filtered.filter((module) => module.status === 'pending review');
    }

    // Filter by category
    if (categoryFilter && categoryFilter !== 'All') {
      filtered = filtered.filter((module) => module.category === categoryFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((module) => {
        const title = module.moduleTitle.toLowerCase();
        const category = module.category.toLowerCase();
        const referenceCode = module.moduleId.toLowerCase();
        return (
          title.includes(query) ||
          category.includes(query) ||
          referenceCode.includes(query)
        );
      });
    }

    return filtered;
  }, [modules, filterType, searchQuery, categoryFilter]);
  
  // Animate filtered modules when they change
  useEffect(() => {
    if (filteredModules.length > 0) {
      const animations = filteredModules.map((module, index) => {
        const animValue = getAnimatedValue(module.moduleId);
        return Animated.timing(animValue, {
          toValue: 1,
          duration: 500,
          delay: Math.min(index * 50, 1000),
          useNativeDriver: true,
        });
      });
      Animated.stagger(30, animations).start();
    }
  }, [filteredModules]);
  
  const getAnimatedValue = (moduleId: string) => {
    if (!animatedValues.has(moduleId)) {
      animatedValues.set(moduleId, new Animated.Value(0));
    }
    return animatedValues.get(moduleId)!;
  };
  
  const getHoverScale = (moduleId: string) => {
    if (!hoverScales.has(moduleId)) {
      hoverScales.set(moduleId, new Animated.Value(1));
    }
    return hoverScales.get(moduleId)!;
  };
  
  const handleCardHover = (moduleId: string, isHovering: boolean) => {
    const scale = getHoverScale(moduleId);
    Animated.spring(scale, {
      toValue: isHovering ? 1.05 : 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getReferenceCode = (moduleId: string): string => {
    // Generate a reference code like M0101, M0102, etc.
    // This is a simple implementation - you might want to use a different logic
    const num = moduleId.slice(-4) || '0000';
    return `M${num}`;
  };

  const handleViewModule = (module: Module) => {
    router.push({
      pathname: '/(admin)/module-detail',
      params: { moduleId: module.moduleId },
    });
  };

  const openDeleteModal = (module: Module) => {
    setModuleToDelete(module);
    setDeletionReason('');
    setCustomDeletionReason('');
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setModuleToDelete(null);
    setDeletionReason('');
    setCustomDeletionReason('');
  };

  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;
    const custom = customDeletionReason.trim();
    const finalReason =
      custom || (deletionReason === 'Other (specify below)' ? custom : deletionReason);
    if (!finalReason) {
      showToast('Please select or type a reason for deletion');
      return;
    }
    try {
      setDeleting(true);
      await AuthController.deleteModule(moduleToDelete.moduleId, finalReason);
      showToast('Module deleted. Trainer has been notified.');
      closeDeleteModal();
      loadModules();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete module');
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = modules.filter((m) => m.status === 'approved').length;
  const pendingCount = modules.filter((m) => m.status === 'pending review').length;

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
                style={styles.navIconActiveButton}
                onPress={() => router.push('/(admin)/adminManaging')}
              >
                <Image
                  source={require('../../assets/images/adminmanageicon.png')}
                  style={styles.navIconImage}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/(admin)/adminDashboard')}>
                <Image
                  source={require('../../assets/images/homeicon.png')}
                  style={styles.navIconImage}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Header with Back button, DEFENDU Logo and Admin */}
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(admin)/adminManaging')}
          >
            <Image
              source={require('../../assets/images/backbuttonicon.png')}
              style={styles.backButtonIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Image
              source={require('../../assets/images/defendudashboardlogo.png')}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
            <Text style={styles.headerAdminText}>Admin</Text>
          </View>
        </Animated.View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Filter Buttons and Search */}
          <Animated.View style={[
            styles.topSection,
            {
              opacity: filterAnim,
              transform: [{
                translateY: filterAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              }],
            },
          ]}>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterType === 'active' && styles.filterButtonActive,
                ]}
                onPress={() => setFilterType('active')}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === 'active' && styles.filterButtonTextActive,
                  ]}
                >
                  All Active Modules {activeCount}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterType === 'pending' && styles.filterButtonActive,
                ]}
                onPress={() => setFilterType('pending')}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === 'pending' && styles.filterButtonTextActive,
                  ]}
                >
                  Pending Modules {pendingCount}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#FFFFFF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search"
                placeholderTextColor="#6b8693"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </Animated.View>

          {/* Category Filter */}
          <Animated.View style={[
            styles.categoryFilterWrap,
            {
              opacity: filterAnim,
            },
          ]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {MODULE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    (cat === 'All' ? !categoryFilter || categoryFilter === 'All' : categoryFilter === cat) && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategoryFilter(cat === 'All' ? 'All' : cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      (cat === 'All' ? !categoryFilter || categoryFilter === 'All' : categoryFilter === cat) && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Modules Grid */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#38a6de" />
              <Text style={styles.loadingText}>Loading modules...</Text>
            </View>
          ) : filteredModules.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No modules found matching your search'
                  : categoryFilter && categoryFilter !== 'All'
                  ? `No ${filterType === 'active' ? 'active' : 'pending'} modules in ${categoryFilter}`
                  : filterType === 'active'
                  ? 'No active modules found'
                  : 'No pending modules found'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredModules}
              keyExtractor={(item) => item.moduleId}
              numColumns={2}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.modulesGrid}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const animValue = getAnimatedValue(item.moduleId);
                const hoverScale = getHoverScale(item.moduleId);
                
                return (
                  <Animated.View style={[
                    { flex: 0.5, margin: 8 },
                    {
                      opacity: animValue,
                      transform: [
                        {
                          translateY: animValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [30, 0],
                          }),
                        },
                        { scale: Animated.multiply(animValue, hoverScale) },
                      ],
                    },
                  ]}>
                    <TouchableOpacity 
                      style={styles.moduleCard}
                      onPress={() => handleViewModule(item)}
                      onPressIn={() => handleCardHover(item.moduleId, true)}
                      onPressOut={() => handleCardHover(item.moduleId, false)}
                      activeOpacity={0.9}
                    >
                  {/* Full-width Module Image with Overlay */}
                  <View style={styles.moduleImageContainer}>
                    {item.thumbnailUrl ? (
                      <Image
                        source={{ uri: item.thumbnailUrl }}
                        style={styles.moduleImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.moduleImagePlaceholder}>
                        <Ionicons name="fitness-outline" size={48} color="#38a6de" />
                      </View>
                    )}
                    {/* Dark gradient overlay for text readability */}
                    <View style={styles.imageOverlay} />
                    
                    {/* Category Badge */}
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{item.category}</Text>
                    </View>
                  </View>

                  {/* Module Info */}
                  <View style={styles.moduleInfo}>
                    <Text style={styles.moduleTitle} numberOfLines={2}>
                      {item.moduleTitle}
                    </Text>

                    <View style={styles.moduleMetaRow}>
                      <View style={styles.metaItem}>
                        <Ionicons name="code-outline" size={14} color="#6b8693" />
                        <Text style={styles.metaText}>{getReferenceCode(item.moduleId)}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={14} color="#6b8693" />
                        <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
                      </View>
                    </View>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          openDeleteModal(item);
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
              );
            }}
            />
          )}
        </View>
      </View>

      {/* Delete Module Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="slide"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Delete Module</Text>
            {moduleToDelete && (
              <Text style={styles.modalSubtitle} numberOfLines={2}>
                Remove "{moduleToDelete.moduleTitle}"? The trainer will receive a message with your reason.
              </Text>
            )}
            <Text style={styles.reasonLabel}>Reason for deletion (select or type):</Text>
            <ScrollView style={styles.reasonsList}>
              {DELETION_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonOption,
                    deletionReason === reason && styles.reasonOptionSelected,
                  ]}
                  onPress={() => setDeletionReason(reason)}
                >
                  <View style={styles.radioButton}>
                    {deletionReason === reason && <View style={styles.radioButtonInner} />}
                  </View>
                  <Text style={styles.reasonText}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={styles.customReasonInput}
              placeholder="Or type a custom reason..."
              placeholderTextColor="#6b8693"
              value={customDeletionReason}
              onChangeText={setCustomDeletionReason}
              multiline
              numberOfLines={3}
            />
            {(deletionReason || customDeletionReason.trim()) && (
              <>
                <Text style={styles.selectedReasonLabel}>Reason for deletion:</Text>
                <Text style={styles.selectedReasonText}>
                  {customDeletionReason.trim() || deletionReason}
                </Text>
              </>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeDeleteModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmDeleteButton]}
                onPress={handleDeleteModule}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Delete & notify trainer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pop-up Menu */}
      {showMenu && (
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); handleLogout(); }}>
              <Image
                source={require('../../assets/images/logouticon.png')}
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
                </Animated.View>
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={hideToast}
        duration={3000}
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 100,
    paddingRight: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonIcon: {
    width: 24,
    height: 24,
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
  mainContent: {
    flex: 1,
    paddingLeft: 100,
    paddingRight: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: '#38a6de',
    borderColor: '#38a6de',
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 134, 147, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 200,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  categoryFilterWrap: {
    height: 40,
    marginBottom: 16,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 0,
  },
  categoryChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#6b8693',
    backgroundColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: '#38a6de',
    borderColor: '#38a6de',
  },
  categoryChipText: {
    color: '#6b8693',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 134, 147, 0.2)',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    gap: 6,
    backgroundColor: '#c62828',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1a2332',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '85%',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#6b8693',
    fontSize: 14,
    marginBottom: 16,
  },
  reasonLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  reasonsList: {
    maxHeight: 220,
    marginBottom: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: 'rgba(56, 166, 222, 0.1)',
  },
  reasonOptionSelected: {
    backgroundColor: 'rgba(56, 166, 222, 0.3)',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#38a6de',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38a6de',
  },
  reasonText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  customReasonInput: {
    backgroundColor: 'rgba(107, 134, 147, 0.2)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  selectedReasonLabel: {
    color: '#38a6de',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedReasonText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 16,
    padding: 8,
    backgroundColor: 'rgba(56, 166, 222, 0.15)',
    borderRadius: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(107, 134, 147, 0.3)',
  },
  confirmDeleteButton: {
    backgroundColor: '#c62828',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b8693',
    fontSize: 16,
  },
  modulesGrid: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  moduleCard: {
    width: '48%',
    backgroundColor: '#1a2332',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 166, 222, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  moduleImageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: '#0d1a2b',
  },
  moduleImage: {
    width: '100%',
    height: '100%',
  },
  moduleImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0d1a2b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(11, 22, 37, 0.7)',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(56, 166, 222, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moduleInfo: {
    padding: 16,
  },
  moduleTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    minHeight: 48,
    lineHeight: 24,
  },
  moduleMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metaText: {
    color: '#6b8693',
    fontSize: 11,
    fontWeight: '500',
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
