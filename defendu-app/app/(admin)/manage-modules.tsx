import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import AdminTable, {
    AdminTableColumn,
    AdminTableSortState,
} from '../../components/admin/AdminTable';
import FilterBar from '../../components/admin/FilterBar';
import SearchInput from '../../components/admin/SearchInput';
import StatusBadge from '../../components/admin/StatusBadge';
import Toast from '../../components/Toast';
import { useLogout } from '../../hooks/useLogout';
import { useToast } from '../../hooks/useToast';
import { Module } from '../_models/Module';
import { AuthController } from '../controllers/AuthController';

const MODULE_CATEGORIES = [
  { label: 'All', value: 'All' },
  { label: 'Punching', value: 'Punching' },
  { label: 'Kicking', value: 'Kicking' },
  { label: 'Palm Strikes', value: 'Palm Strikes' },
  { label: 'Elbow Strikes', value: 'Elbow Strikes' },
  { label: 'Knee Strikes', value: 'Knee Strikes' },
  { label: 'Defensive Moves', value: 'Defensive Moves' },
];

const DIFFICULTY_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Basic', value: 'basic' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
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

const PAGE_SIZE = 10;

export default function ManageModulesPage() {
  const { width } = useWindowDimensions();
  const isCompact = width < 1100;
  const router = useRouter();
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();
  const handleLogout = useLogout();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [trainerFilter, setTrainerFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortState, setSortState] = useState<AdminTableSortState>({
    columnKey: 'created',
    direction: 'desc',
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [customDeletionReason, setCustomDeletionReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [enablingModuleId, setEnablingModuleId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const controlsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadModules();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadModules();
    }, [])
  );

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(controlsAnim, {
          toValue: 1,
          duration: 500,
          delay: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, headerAnim, controlsAnim]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, categoryFilter, difficultyFilter, trainerFilter]);

  const loadModules = async () => {
    try {
      setLoading(true);
      const allModules = await AuthController.getAllModules();
      setModules(allModules);
    } catch (error: any) {
      console.error('Error loading modules:', error);
      showToast(error.message || 'Failed to load modules');
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  const trainerOptions = useMemo(() => {
    const trainers = new Set<string>();
    modules.forEach((module) => {
      const trainer = module.trainerName?.trim() || module.trainerId;
      if (trainer) trainers.add(trainer);
    });

    return [
      { label: 'All Trainers', value: 'all' },
      ...Array.from(trainers)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ label: name, value: name })),
    ];
  }, [modules]);

  const filteredModules = useMemo(() => {
    let filtered = modules;

    if (filterType === 'active') {
      filtered = filtered.filter((module) => module.status === 'approved');
    } else {
      filtered = filtered.filter((module) => module.status === 'pending review' || module.status === 'disabled');
    }

    if (categoryFilter !== 'All') {
      filtered = filtered.filter((module) => module.category === categoryFilter);
    }

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter((module) => (module.difficultyLevel || 'basic') === difficultyFilter);
    }

    if (trainerFilter !== 'all') {
      filtered = filtered.filter((module) => {
        const trainer = module.trainerName?.trim() || module.trainerId;
        return trainer === trainerFilter;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((module) => {
        const trainer = (module.trainerName || module.trainerId || '').toLowerCase();
        return (
          module.moduleTitle.toLowerCase().includes(query) ||
          module.category.toLowerCase().includes(query) ||
          module.moduleId.toLowerCase().includes(query) ||
          trainer.includes(query)
        );
      });
    }

    return filtered;
  }, [modules, filterType, categoryFilter, difficultyFilter, trainerFilter, searchQuery]);

  const sortedModules = useMemo(() => {
    const result = [...filteredModules];
    if (filterType === 'active') {
      // Active tab: sort by display order (sortOrder) then createdAt for stable order; drag reorder updates sortOrder
      result.sort((a, b) => {
        const orderA = a.sortOrder ?? 999999;
        const orderB = b.sortOrder ?? 999999;
        if (orderA !== orderB) return orderA - orderB;
        return (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0);
      });
      return result;
    }
    const multiplier = sortState.direction === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      if (sortState.columnKey === 'status') {
        return a.status.localeCompare(b.status) * multiplier;
      }
      if (sortState.columnKey === 'updated') {
        return ((a.updatedAt?.getTime?.() ?? 0) - (b.updatedAt?.getTime?.() ?? 0)) * multiplier;
      }
      return ((a.createdAt?.getTime?.() ?? 0) - (b.createdAt?.getTime?.() ?? 0)) * multiplier;
    });
    return result;
  }, [filteredModules, filterType, sortState]);

  const totalPages = Math.max(
    1,
    filterType === 'active'
      ? 1
      : Math.ceil(sortedModules.length / PAGE_SIZE)
  );

  const paginatedModules = useMemo(() => {
    if (filterType === 'active') return sortedModules;
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedModules.slice(start, start + PAGE_SIZE);
  }, [sortedModules, currentPage, filterType]);

  const handleSortChange = (columnKey: string) => {
    setSortState((prev) => {
      if (prev.columnKey === columnKey) {
        return {
          columnKey,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        columnKey,
        direction: columnKey === 'created' || columnKey === 'updated' ? 'desc' : 'asc',
      };
    });
    setCurrentPage(1);
  };

  const moveActiveModule = useCallback(
    async (moduleId: string, direction: 'up' | 'down') => {
      // Only allow reordering in the Active tab
      if (filterType !== 'active') return;

      const idx = sortedModules.findIndex((m) => m.moduleId === moduleId);
      if (idx < 0) return;

      const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= sortedModules.length) return;

      const next = [...sortedModules];
      const temp = next[idx];
      next[idx] = next[nextIdx];
      next[nextIdx] = temp;

      const orderedIds = next.map((m) => m.moduleId);
      try {
        setSavingOrder(true);
        await AuthController.updateModulesOrder(orderedIds);
        await loadModules();
      } catch (error: any) {
        showToast(error.message || 'Failed to save order');
      } finally {
        setSavingOrder(false);
      }
    },
    [filterType, sortedModules, showToast]
  );

  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDifficulty = (difficultyLevel?: string): string => {
    if (!difficultyLevel) return 'Basic';
    return difficultyLevel.charAt(0).toUpperCase() + difficultyLevel.slice(1);
  };

  const handleViewModule = (module: Module) => {
    router.push({
      pathname: '/(admin)/module-detail',
      params: { moduleId: module.moduleId },
    });
  };

  const handleEditModule = (module: Module) => {
    router.push({
      pathname: '/(admin)/module-detail',
      params: { moduleId: module.moduleId, mode: 'edit' },
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
    const finalReason = custom || (deletionReason === 'Other (specify below)' ? custom : deletionReason);

    if (!finalReason) {
      showToast('Please select or type a reason for deletion');
      return;
    }

    try {
      setDeleting(true);
      await AuthController.deleteModule(moduleToDelete.moduleId, finalReason);
      showToast('Module disabled and trainer notified.');
      closeDeleteModal();
      loadModules();
    } catch (error: any) {
      showToast(error.message || 'Failed to disable module');
    } finally {
      setDeleting(false);
    }
  };

  const handleEnableModule = async (moduleId: string) => {
    try {
      setEnablingModuleId(moduleId);
      await AuthController.enableModule(moduleId);
      showToast('Module enabled successfully.');
      await loadModules();
    } catch (error: any) {
      showToast(error.message || 'Failed to enable module');
    } finally {
      setEnablingModuleId(null);
    }
  };

  const activeCount = modules.filter((m) => m.status === 'approved').length;
  const pendingCount = modules.filter((m) => m.status === 'pending review' || m.status === 'disabled').length;

  const columns: AdminTableColumn<Module>[] = [
    {
      key: 'module',
      title: 'Module',
      minWidth: 260,
      flex: 2.5,
      render: (module, index) => (
        <View style={styles.moduleCell}>
          {filterType === 'active' && categoryFilter !== 'All' ? ( // Only show drag controls when in Active tab with a specific category filter, to avoid confusion about ordering in other contexts
            <View style={styles.orderControls}>
              <TouchableOpacity
                style={[styles.orderButton, (savingOrder || index === 0) && styles.orderButtonDisabled]}
                disabled={savingOrder || index === 0}
                onPress={() => moveActiveModule(module.moduleId, 'up')}
              >
                <Ionicons name="chevron-up" size={18} color="#38a6de" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.orderButton,
                  (savingOrder || index === sortedModules.length - 1) && styles.orderButtonDisabled,
                ]}
                disabled={savingOrder || index === sortedModules.length - 1}
                onPress={() => moveActiveModule(module.moduleId, 'down')}
              >
                <Ionicons name="chevron-down" size={18} color="#38a6de" />
              </TouchableOpacity>
            </View>
          ) : null}
          {filterType === 'active' && categoryFilter !== 'All' && (
            <View style={styles.positionBadge}>
              <Text style={styles.positionBadgeText}>
                {(module.sortOrder ?? index) + 1}
              </Text>
            </View>
          )}
          {module.thumbnailUrl ? (
            <Image source={{ uri: module.thumbnailUrl }} style={styles.thumbnail} />
          ) : (
            <View style={styles.thumbnailFallback}>
              <Ionicons name="fitness-outline" size={18} color="#6b8693" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.moduleTitle} numberOfLines={1}>{module.moduleTitle}</Text>
            <Text style={styles.moduleSubtext}>#{module.moduleId.slice(-6)}</Text>
          </View>
        </View>
      ),
    },
    {
      key: 'difficulty',
      title: 'Difficulty',
      minWidth: 120,
      render: (module) => <Text style={styles.cellText}>{formatDifficulty(module.difficultyLevel)}</Text>,
    },
    {
      key: 'category',
      title: 'Category',
      minWidth: 140,
      render: (module) => <Text style={styles.cellText}>{module.category}</Text>,
    },
    {
      key: 'trainer',
      title: 'Trainer',
      minWidth: 160,
      render: (module) => <Text style={styles.cellText}>{module.trainerName || module.trainerId || 'N/A'}</Text>,
    },
    {
      key: 'status',
      title: 'Status',
      minWidth: 100,
      sortable: true,
      render: (module) => (
        <StatusBadge
          status={
            module.status === 'approved'
              ? 'Active'
              : module.status === 'disabled'
                ? 'Disabled'
                : 'Pending'
          }
          tone={
            module.status === 'approved'
              ? 'active'
              : module.status === 'disabled'
                ? 'disabled'
                : 'pending'
          }
        />
      ),
    },
    {
      key: 'created',
      title: 'Created',
      minWidth: 120,
      sortable: true,
      render: (module) => <Text style={styles.subtleText}>{formatDate(module.createdAt)}</Text>,
    },
    {
      key: 'updated',
      title: 'Updated',
      minWidth: 120,
      sortable: true,
      render: (module) => <Text style={styles.subtleText}>{formatDate(module.updatedAt)}</Text>,
    },
    {
      key: 'actions',
      title: 'Actions',
      minWidth: 190,
      align: 'right',
      render: (module) => (
        <View style={[styles.actionRow, isCompact && styles.actionRowCompact]}>
          <TouchableOpacity
            style={[styles.secondaryActionButton, isCompact && styles.secondaryActionButtonCompact]}
            onPress={() => handleViewModule(module)}
          >
            <Text style={styles.secondaryActionText}>View</Text>
          </TouchableOpacity>
          {module.status === 'approved' && (
            <TouchableOpacity
              style={[styles.secondaryActionButton, isCompact && styles.secondaryActionButtonCompact]}
              onPress={() => handleEditModule(module)}
            >
              <Text style={styles.secondaryActionText}>Edit</Text>
            </TouchableOpacity>
          )}
          {module.status === 'disabled' ? (
            <TouchableOpacity
              style={[styles.secondaryActionButton, isCompact && styles.secondaryActionButtonCompact]}
              onPress={() => handleEnableModule(module.moduleId)}
              disabled={enablingModuleId === module.moduleId}
            >
              <Text style={styles.secondaryActionText}>
                {enablingModuleId === module.moduleId ? '...' : 'Enable'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.dangerActionButton, isCompact && styles.dangerActionButtonCompact]}
              onPress={() => openDeleteModal(module)}
            >
              <Text style={styles.dangerActionText}>{isCompact ? 'Dis.' : 'Disable'}</Text>
            </TouchableOpacity>
          )}
        </View>
      ),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.leftNavBar}>
          <TouchableOpacity style={styles.navMenuButton} onPress={() => setShowMenu(true)}>
            <Ionicons name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.navBottomIcons}>
            <View style={styles.navIconsBox}>
              <TouchableOpacity
                style={styles.navIconActiveButton}
                onPress={() => router.push('/(admin)/adminManaging')}
              >
                <Image source={require('../../assets/images/adminmanageicon.png')} style={styles.navIconImage} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/(admin)/adminDashboard')}>
                <Image source={require('../../assets/images/homeicon.png')} style={styles.navIconImage} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.header,
              {
                opacity: headerAnim,
                transform: [
                  {
                    translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(admin)/adminManaging')}>
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
              <Text style={styles.subTitle}>
                Active Modules {filterType === 'active' ? activeCount : pendingCount}
              </Text>
            </View>
          </Animated.View>

          <View style={[styles.mainContent, isCompact && styles.mainContentCompact]}>
            <Animated.View
              style={[
                styles.controlsWrap,
                {
                  opacity: controlsAnim,
                  transform: [
                    {
                      translateY: controlsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.primaryFiltersRow}>
                <TouchableOpacity
                  style={[styles.tabButton, filterType === 'active' && styles.tabButtonActive]}
                  onPress={() => setFilterType('active')}
                >
                  <Text style={[styles.tabText, filterType === 'active' && styles.tabTextActive]}>
                    Active {activeCount}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabButton, filterType === 'pending' && styles.tabButtonActive]}
                  onPress={() => setFilterType('pending')}
                >
                  <Text style={[styles.tabText, filterType === 'pending' && styles.tabTextActive]}>
                    Pending/Disabled {pendingCount}
                  </Text>
                </TouchableOpacity>
              </View>

              <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by title, category, trainer, or ID"
              />

              <FilterBar
                label="Category"
                options={MODULE_CATEGORIES}
                selectedValue={categoryFilter}
                onSelect={setCategoryFilter}
              />
              <FilterBar
                label="Difficulty"
                options={DIFFICULTY_OPTIONS}
                selectedValue={difficultyFilter}
                onSelect={setDifficultyFilter}
              />
              <FilterBar
                label="Trainer"
                options={trainerOptions}
                selectedValue={trainerFilter}
                onSelect={setTrainerFilter}
              />
            </Animated.View>

            <AdminTable
              columns={columns}
              data={paginatedModules}
              loading={loading}
              compact={isCompact}
              keyExtractor={(module) => module.moduleId}
              sortState={filterType === 'active' ? undefined : sortState}
              onSortChange={filterType === 'active' ? undefined : handleSortChange}
              emptyTitle={searchQuery ? 'No modules match your search' : 'No modules found'}
              emptyDescription="Try updating your filters or review module approval data in the backend."
              pagination={
                filterType === 'active'
                  ? undefined
                  : {
                      currentPage,
                      totalPages,
                      onPrevious: () => setCurrentPage((p) => Math.max(1, p - 1)),
                      onNext: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
                    }
              }
            />

            {filterType === 'active' && savingOrder ? (
              <View style={styles.savingOrderBar}>
                <ActivityIndicator size="small" color="#38a6de" />
                <Text style={styles.savingOrderText}>Saving order…</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>

      <Modal visible={showDeleteModal} transparent animationType="slide" onRequestClose={closeDeleteModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Disable Module</Text>
            {moduleToDelete && (
              <Text style={styles.modalSubtitle} numberOfLines={2}>
                Disable "{moduleToDelete.moduleTitle}"? The trainer will receive a message with your reason.
              </Text>
            )}
            <Text style={styles.reasonLabel}>Reason for disabling (select or type):</Text>
            <ScrollView style={styles.reasonsList}>
              {DELETION_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonOption, deletionReason === reason && styles.reasonOptionSelected]}
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
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={closeDeleteModal}>
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
                  <Text style={styles.confirmDeleteButtonText}>Disable</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showMenu && (
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); handleLogout(); }}>
              <Image source={require('../../assets/images/logouticon.png')} style={styles.menuIcon} />
              <Text style={styles.menuText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <Toast message={toastMessage} visible={toastVisible} onHide={hideToast} duration={3000} />
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
  scrollView: {
    flex: 1,
    marginLeft: 80,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 20,
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
  subTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9,
  },
  mainContent: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 12,
  },
  mainContentCompact: {
    paddingLeft: 12,
    paddingRight: 12,
    gap: 10,
  },
  controlsWrap: {
    gap: 10,
  },
  primaryFiltersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tabButton: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(126, 153, 166, 0.4)',
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    borderColor: '#38a6de',
    backgroundColor: 'rgba(56, 166, 222, 0.2)',
  },
  tabText: {
    color: '#a9bdc6',
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#e5f5ff',
  },
  moduleCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 360,
  },
  positionBadge: {
    minWidth: 24,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(126, 153, 166, 0.6)',
    backgroundColor: 'rgba(2, 68, 70, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  positionBadgeText: {
    color: '#e5f5ff',
    fontSize: 11,
    fontWeight: '700',
  },
  orderControls: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  orderButton: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 166, 222, 0.55)',
    backgroundColor: 'rgba(56, 166, 222, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderButtonDisabled: {
    opacity: 0.35,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  thumbnailFallback: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#0f293f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTitle: {
    color: '#edf7fc',
    fontSize: 13,
    fontWeight: '700',
  },
  moduleSubtext: {
    color: '#8da8b5',
    fontSize: 12,
    marginTop: 2,
  },
  cellText: {
    color: '#d2e8f3',
    fontSize: 13,
  },
  subtleText: {
    color: '#a4bec9',
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionRowCompact: {
    gap: 6,
  },
  secondaryActionButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 166, 222, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(56, 166, 222, 0.1)',
  },
  secondaryActionButtonCompact: {
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  secondaryActionText: {
    color: '#d9f1ff',
    fontSize: 12,
    fontWeight: '700',
  },
  dangerActionButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 108, 97, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 108, 97, 0.16)',
  },
  dangerActionButtonCompact: {
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  dangerActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
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
  savingOrderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    marginTop: 8,
  },
  savingOrderText: {
    color: '#38a6de',
    fontSize: 12,
    fontWeight: '600',
  },
});
