import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
import { getRequiredReps } from '../_utils/repRange';

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

/** Which rows the main AdminTable shows: technique modules, warm-up, cool-down, or introduction entries. */
type ModuleTableSegment = 'technique' | 'warmup' | 'cooldown' | 'introduction';

const PAGE_SIZE = 15;

/** Warm-up / cool-down picks per category (admin dashboard program). */
const SEGMENT_ASSIGN_COUNT = 3;

function isApprovedModuleStatus(status: unknown): boolean {
  if (status == null) return false;
  return String(status).trim().toLowerCase() === 'approved';
}

function isPendingReviewModuleStatus(status: unknown): boolean {
  if (status == null) return false;
  return String(status).trim().toLowerCase() === 'pending review';
}

export default function ManageModulesPage() {
  const { width, height } = useWindowDimensions();
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

  // Dynamic categories from Firebase
  const [categories, setCategories] = useState<string[]>([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryMetaByKey, setCategoryMetaByKey] = useState<Record<string, { name?: string; thumbnailUrl?: string | null }>>({});
  const [editCategoryOriginalName, setEditCategoryOriginalName] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryThumbnailUrl, setEditCategoryThumbnailUrl] = useState<string | null>(null);
  const [editCategoryThumbnailLocalUri, setEditCategoryThumbnailLocalUri] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(false);
  const [uploadingCategoryThumbnail, setUploadingCategoryThumbnail] = useState(false);
  const [showRemoveCategoryModal, setShowRemoveCategoryModal] = useState(false);
  const [categoryToRemove, setCategoryToRemove] = useState<string | null>(null);
  const [removingCategory, setRemovingCategory] = useState(false);
  const [confirmRemoveStep, setConfirmRemoveStep] = useState(false);
  const [showTrainerDropdown, setShowTrainerDropdown] = useState(false);
  const [addCategoryStep, setAddCategoryStep] = useState<1 | 2>(1);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [assignCategoryFilter, setAssignCategoryFilter] = useState<string>('');
  const [assignStatusFilter, setAssignStatusFilter] = useState<'approved' | 'pending'>('approved');
  const [editSelectedModuleIds, setEditSelectedModuleIds] = useState<string[]>([]);
  const [editSearchQuery, setEditSearchQuery] = useState('');
  const [editModuleCategoryFilter, setEditModuleCategoryFilter] = useState<string>('');
  const [editStatusFilter, setEditStatusFilter] = useState<'approved' | 'pending'>('approved');
  const [moduleTableSegment, setModuleTableSegment] = useState<ModuleTableSegment>('technique');
  const [approvedTrainerNames, setApprovedTrainerNames] = useState<string[]>([]);
  const [showAssignSegmentModal, setShowAssignSegmentModal] = useState(false);
  const [assignSegmentCategory, setAssignSegmentCategory] = useState('');
  const [assignSegmentWarmupIds, setAssignSegmentWarmupIds] = useState<string[]>([]);
  const [assignSegmentCooldownIds, setAssignSegmentCooldownIds] = useState<string[]>([]);
  const [assignSegmentLoading, setAssignSegmentLoading] = useState(false);
  const [savingAssignSegment, setSavingAssignSegment] = useState(false);

  /** Category list from Firebase only (single source of truth for admin category buttons/filters). */
  const displayCategories = useMemo(() => {
    const byLower = new Map<string, string>();
    for (const c of categories) {
      const t = (c || '').trim();
      if (t) byLower.set(t.toLowerCase(), t);
    }
    return Array.from(byLower.values()).sort((a, b) => a.localeCompare(b));
  }, [categories]);

  const categoryFilterOptions = useMemo(
    () => [{ label: 'All', value: 'All' }, ...displayCategories.map((c) => ({ label: c, value: c }))],
    [displayCategories]
  );

  const headerAnim = useRef(new Animated.Value(0)).current;
  const controlsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadModules();
    loadCategories();
    loadApprovedTrainerNames();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadModules();
      loadCategories();
      loadApprovedTrainerNames();
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
  }, [searchQuery, filterType, categoryFilter, difficultyFilter, trainerFilter, moduleTableSegment]);

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

  const loadCategories = async () => {
    try {
      const cats = await AuthController.getModuleCategories();
      setCategories(cats);
    } catch (error: any) {
      console.error('Error loading categories:', error);
      setCategories(AuthController.getFallbackModuleCategories());
    }
    try {
      const metaMap = await AuthController.getModuleCategoryMetaMap();
      setCategoryMetaByKey(metaMap);
    } catch {
      setCategoryMetaByKey({});
    }
  };

  const loadApprovedTrainerNames = async () => {
    try {
      const approved = await AuthController.getApprovedTrainers();
      const names = approved
        .map((trainer) => `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim())
        .filter((name) => !!name);
      setApprovedTrainerNames(Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)));
    } catch (error) {
      console.error('Error loading approved trainer names:', error);
      setApprovedTrainerNames([]);
    }
  };

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    try {
      setAddingCategory(true);
      const updated = await AuthController.addModuleCategory(trimmed);
      setCategories(updated);
      if (selectedModuleIds.length > 0) {
        await Promise.all(
          selectedModuleIds.map((id) =>
            AuthController.updateModuleMetadata(id, { category: trimmed, status: 'approved' })
          )
        );
        await loadModules();
      }
      setNewCategoryName('');
      setSelectedModuleIds([]);
      setAddCategoryStep(1);
      setShowAddCategoryModal(false);
      showToast(`Category "${trimmed}" added successfully`);
    } catch (error: any) {
      showToast(error.message || 'Failed to add category');
    } finally {
      setAddingCategory(false);
    }
  };

  const openEditCategoryModal = useCallback(() => {
    if (categoryFilter === 'All') {
      showToast('Select a category first (not "All")');
      return;
    }
    const original = categoryFilter;
    const originalKey = AuthController.categorySegmentProgramKey(original);
    const currentMeta = categoryMetaByKey[originalKey];
    setEditCategoryOriginalName(original);
    setEditCategoryName(original);
    setEditCategoryThumbnailUrl(currentMeta?.thumbnailUrl || null);
    setEditCategoryThumbnailLocalUri(null);
    setEditSearchQuery('');
    setEditModuleCategoryFilter('');
    setEditStatusFilter('approved');
    const existingIds = modules
      .filter((m) => !m.moduleSegment && (m.category || '').trim().toLowerCase() === original.trim().toLowerCase())
      .map((m) => m.moduleId);
    setEditSelectedModuleIds(existingIds);
    setShowEditCategoryModal(true);
  }, [categoryFilter, modules, showToast, categoryMetaByKey]);

  const handlePickEditCategoryThumbnail = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        showToast('Gallery permission is required to select an image');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.length) return;
      const picked = result.assets[0];
      if (!picked?.uri) return;
      setEditCategoryThumbnailLocalUri(picked.uri);
    } catch (error: any) {
      showToast(error.message || 'Failed to pick image');
    }
  }, [showToast]);

  const handleEditCategory = async () => {
    const original = editCategoryOriginalName.trim();
    const target = editCategoryName.trim();
    if (!original) return;
    if (!target) {
      showToast('Category name cannot be empty');
      return;
    }

    try {
      setEditingCategory(true);

      if (target.toLowerCase() !== original.toLowerCase()) {
        const existing = await AuthController.getModuleCategories();
        const alreadyExists = existing.some((c) => c.trim().toLowerCase() === target.toLowerCase());
        if (!alreadyExists) {
          const updated = await AuthController.addModuleCategory(target);
          setCategories(updated);
        }

        const modulesToRename = modules.filter(
          (m) => !m.moduleSegment && (m.category || '').trim().toLowerCase() === original.toLowerCase()
        );
        if (modulesToRename.length > 0) {
          await Promise.all(
            modulesToRename.map((m) =>
              AuthController.updateModuleMetadata(m.moduleId, { category: target })
            )
          );
        }

        const updatedAfterRemove = await AuthController.removeModuleCategory(original);
        setCategories(updatedAfterRemove);
      }

      let finalThumbnailUrl = editCategoryThumbnailUrl;
      if (editCategoryThumbnailLocalUri) {
        setUploadingCategoryThumbnail(true);
        const fileName = `category_${target}_${Date.now()}.png`;
        finalThumbnailUrl = await AuthController.uploadFileToCloudinary(
          editCategoryThumbnailLocalUri,
          'image',
          fileName
        );
      }

      await AuthController.setModuleCategoryMeta(target, {
        name: target,
        thumbnailUrl: finalThumbnailUrl,
      });

      if (editSelectedModuleIds.length > 0) {
        await Promise.all(
          editSelectedModuleIds.map((id) =>
            AuthController.updateModuleMetadata(id, { category: target, status: 'approved' })
          )
        );
      }

      await loadModules();
      await loadCategories();
      setCategoryFilter(target);
      setShowEditCategoryModal(false);
      showToast(`Category "${target}" updated successfully`);
    } catch (error: any) {
      showToast(error.message || 'Failed to edit category');
    } finally {
      setEditingCategory(false);
      setUploadingCategoryThumbnail(false);
    }
  };

  const handleRemoveCategory = async () => {
    if (!categoryToRemove) return;
    try {
      setRemovingCategory(true);
      const updated = await AuthController.removeModuleCategory(categoryToRemove);
      setCategories(updated);
      if (categoryFilter === categoryToRemove) setCategoryFilter('All');
      showToast(`Category "${categoryToRemove}" removed`);
      setCategoryToRemove(null);
      setShowRemoveCategoryModal(false);
      setConfirmRemoveStep(false);
    } catch (error: any) {
      showToast(error.message || 'Failed to remove category');
    } finally {
      setRemovingCategory(false);
    }
  };

  const trainerOptions = useMemo(() => {
    const trainers = new Set<string>();
    modules.forEach((module) => {
      const trainer = module.trainerName?.trim() || module.trainerId;
      if (trainer) trainers.add(trainer);
    });
    approvedTrainerNames.forEach((name) => trainers.add(name));

    return [
      { label: 'All Trainers', value: 'all' },
      ...Array.from(trainers)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ label: name, value: name })),
    ];
  }, [modules, approvedTrainerNames]);

  const modulesWithoutSegment = useMemo(
    () => modules.filter((m) => !m.moduleSegment),
    [modules]
  );

  const applyCommonFilters = useCallback(
    (list: Module[]) => {
      let filtered = list;
      if (filterType === 'active') {
        filtered = filtered.filter((module) => isApprovedModuleStatus(module.status));
      } else {
        filtered = filtered.filter(
          (module) => isPendingReviewModuleStatus(module.status) || module.status === 'disabled'
        );
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
            (module.category || '').toLowerCase().includes(query) ||
            module.moduleId.toLowerCase().includes(query) ||
            trainer.includes(query)
          );
        });
      }
      return filtered;
    },
    [filterType, difficultyFilter, trainerFilter, searchQuery]
  );

  const filteredModules = useMemo(() => {
    let filtered = applyCommonFilters(modulesWithoutSegment);
    if (categoryFilter !== 'All') {
      filtered = filtered.filter((module) => module.category === categoryFilter);
    }
    return filtered;
  }, [modulesWithoutSegment, categoryFilter, applyCommonFilters]);

  const warmupModulesFiltered = useMemo(
    () => applyCommonFilters(modules.filter((m) => m.moduleSegment === 'warmup')),
    [modules, applyCommonFilters]
  );

  const cooldownModulesFiltered = useMemo(
    () => applyCommonFilters(modules.filter((m) => m.moduleSegment === 'cooldown')),
    [modules, applyCommonFilters]
  );

  const introductionModulesFiltered = useMemo(
    () => applyCommonFilters(modules.filter((m) => m.moduleSegment === 'introduction')),
    [modules, applyCommonFilters]
  );

  const sortModuleListLikeMain = useCallback(
    (list: Module[]) => {
      const result = [...list];
      if (filterType === 'active') {
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
    },
    [filterType, sortState]
  );

  const sortedWarmupModules = useMemo(
    () => sortModuleListLikeMain(warmupModulesFiltered),
    [warmupModulesFiltered, sortModuleListLikeMain]
  );

  const sortedCooldownModules = useMemo(
    () => sortModuleListLikeMain(cooldownModulesFiltered),
    [cooldownModulesFiltered, sortModuleListLikeMain]
  );

  const sortedIntroductionModules = useMemo(
    () => sortModuleListLikeMain(introductionModulesFiltered),
    [introductionModulesFiltered, sortModuleListLikeMain]
  );

  const approvedWarmupLibraryForAssign = useMemo(
    () =>
      sortModuleListLikeMain(
        modules.filter((m) => m.moduleSegment === 'warmup' && isApprovedModuleStatus(m.status))
      ),
    [modules, sortModuleListLikeMain]
  );

  const approvedCooldownLibraryForAssign = useMemo(
    () =>
      sortModuleListLikeMain(
        modules.filter((m) => m.moduleSegment === 'cooldown' && isApprovedModuleStatus(m.status))
      ),
    [modules, sortModuleListLikeMain]
  );

  /** Shown as read-only rows so admins see warm-ups that still need approval. */
  const pendingWarmupLibraryForAssign = useMemo(() => {
    const list = modules.filter((m) => m.moduleSegment === 'warmup' && isPendingReviewModuleStatus(m.status));
    return [...list].sort((a, b) => (a.moduleTitle || '').localeCompare(b.moduleTitle || ''));
  }, [modules]);

  const pendingCooldownLibraryForAssign = useMemo(() => {
    const list = modules.filter((m) => m.moduleSegment === 'cooldown' && isPendingReviewModuleStatus(m.status));
    return [...list].sort((a, b) => (a.moduleTitle || '').localeCompare(b.moduleTitle || ''));
  }, [modules]);

  const sortedTechniqueModules = useMemo(() => {
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

  const sortedDisplayModules = useMemo(() => {
    if (moduleTableSegment === 'warmup') return sortedWarmupModules;
    if (moduleTableSegment === 'cooldown') return sortedCooldownModules;
    if (moduleTableSegment === 'introduction') return sortedIntroductionModules;
    return sortedTechniqueModules;
  }, [
    moduleTableSegment,
    sortedWarmupModules,
    sortedCooldownModules,
    sortedIntroductionModules,
    sortedTechniqueModules,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedDisplayModules.length / PAGE_SIZE)
  );

  const paginatedModules = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedDisplayModules.slice(start, start + PAGE_SIZE);
  }, [sortedDisplayModules, currentPage]);
  const orderIndexById = useMemo(
    () => new Map(sortedTechniqueModules.map((m, idx) => [m.moduleId, idx])),
    [sortedTechniqueModules]
  );
  const showOrderControls = filterType === 'active' && difficultyFilter === 'all' && categoryFilter !== 'All';

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

      const idx = sortedTechniqueModules.findIndex((m) => m.moduleId === moduleId);
      if (idx < 0) return;

      const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= sortedTechniqueModules.length) return;

      const next = [...sortedTechniqueModules];
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
    [filterType, sortedTechniqueModules, showToast]
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

  const openAssignSegmentModal = useCallback(() => {
    if (!displayCategories.length) {
      showToast('Add a category first');
      return;
    }
    const initialCat = categoryFilter !== 'All' ? categoryFilter : displayCategories[0];
    setAssignSegmentCategory(initialCat);
    setAssignSegmentWarmupIds([]);
    setAssignSegmentCooldownIds([]);
    setShowAssignSegmentModal(true);
  }, [displayCategories, categoryFilter, showToast]);

  useEffect(() => {
    if (!showAssignSegmentModal || !assignSegmentCategory) return;
    let cancelled = false;
    (async () => {
      setAssignSegmentLoading(true);
      try {
        const all = await AuthController.getAllCategorySegmentPrograms();
        if (cancelled) return;
        const key = AuthController.categorySegmentProgramKey(assignSegmentCategory);
        const row = all[key];
        setAssignSegmentWarmupIds(
          row?.warmupModuleIds?.length === SEGMENT_ASSIGN_COUNT ? [...row.warmupModuleIds] : []
        );
        setAssignSegmentCooldownIds(
          row?.cooldownModuleIds?.length === SEGMENT_ASSIGN_COUNT ? [...row.cooldownModuleIds] : []
        );
      } catch (e: any) {
        if (!cancelled) showToast(e.message || 'Failed to load category program');
      } finally {
        if (!cancelled) setAssignSegmentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showAssignSegmentModal, assignSegmentCategory, showToast]);

  const toggleAssignWarmup = (moduleId: string) => {
    setAssignSegmentWarmupIds((prev) => {
      if (prev.includes(moduleId)) return prev.filter((id) => id !== moduleId);
      if (prev.length >= SEGMENT_ASSIGN_COUNT) {
        showToast(`Pick exactly ${SEGMENT_ASSIGN_COUNT} warm-ups (uncheck one to change).`);
        return prev;
      }
      return [...prev, moduleId];
    });
  };

  const toggleAssignCooldown = (moduleId: string) => {
    setAssignSegmentCooldownIds((prev) => {
      if (prev.includes(moduleId)) return prev.filter((id) => id !== moduleId);
      if (prev.length >= SEGMENT_ASSIGN_COUNT) {
        showToast(`Pick exactly ${SEGMENT_ASSIGN_COUNT} cool-downs (uncheck one to change).`);
        return prev;
      }
      return [...prev, moduleId];
    });
  };

  const handleSaveCategorySegmentProgram = async () => {
    if (
      assignSegmentWarmupIds.length !== SEGMENT_ASSIGN_COUNT ||
      assignSegmentCooldownIds.length !== SEGMENT_ASSIGN_COUNT
    ) {
      showToast(`Select exactly ${SEGMENT_ASSIGN_COUNT} warm-ups and ${SEGMENT_ASSIGN_COUNT} cool-downs`);
      return;
    }
    try {
      setSavingAssignSegment(true);
      await AuthController.setCategorySegmentProgram(
        assignSegmentCategory,
        assignSegmentWarmupIds,
        assignSegmentCooldownIds
      );
      showToast(`Warm-up / cool-down program saved for "${assignSegmentCategory}".`);
      setShowAssignSegmentModal(false);
    } catch (e: any) {
      showToast(e.message || 'Failed to save');
    } finally {
      setSavingAssignSegment(false);
    }
  };

  // Technique modules only — warm-up / cool-down segments are managed separately, not counted as "active modules"
  const activeCount = modules.filter(
    (m) => !m.moduleSegment && isApprovedModuleStatus(m.status)
  ).length;
  const pendingCount = modules.filter(
    (m) => isPendingReviewModuleStatus(m.status) || m.status === 'disabled'
  ).length;

  const columns: AdminTableColumn<Module>[] = [
    {
      key: 'module',
      title: 'Module',
      minWidth: 260,
      flex: 2.5,
      render: (module, index) => (
        <View style={styles.moduleCell}>
          {showOrderControls && !module.moduleSegment && (
            <View style={styles.positionBadge}>
              <Text style={styles.positionBadgeText}>
                {(orderIndexById.get(module.moduleId) ?? index) + 1}
              </Text>
            </View>
          )}
          {showOrderControls && !module.moduleSegment && (
            <View style={styles.orderControls}>
              <TouchableOpacity
                style={[
                  styles.orderButton,
                  (orderIndexById.get(module.moduleId) ?? 0) <= 0 && styles.orderButtonDisabled,
                ]}
                onPress={() => moveActiveModule(module.moduleId, 'up')}
                disabled={(orderIndexById.get(module.moduleId) ?? 0) <= 0}
              >
                <Ionicons name="chevron-up" size={12} color="#d9f1ff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.orderButton,
                  (orderIndexById.get(module.moduleId) ?? 0) >= sortedTechniqueModules.length - 1 && styles.orderButtonDisabled,
                ]}
                onPress={() => moveActiveModule(module.moduleId, 'down')}
                disabled={(orderIndexById.get(module.moduleId) ?? 0) >= sortedTechniqueModules.length - 1}
              >
                <Ionicons name="chevron-down" size={12} color="#d9f1ff" />
              </TouchableOpacity>
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
            {!module.moduleSegment ? (
              <Text style={styles.moduleSubtext}>#{module.moduleId.slice(-6)}</Text>
            ) : null}
          </View>
        </View>
      ),
    },
    {
      key: 'difficulty',
      title: 'Difficulty',
      minWidth: 120,
      render: (module) => (
        <Text style={styles.cellText}>
          {module.moduleSegment === 'introduction' ? '—' : formatDifficulty(module.difficultyLevel)}
        </Text>
      ),
    },
    {
      key: 'reps',
      title: 'Reps',
      minWidth: 72,
      render: (module) => (
        <Text style={styles.cellText}>{getRequiredReps(module.repRange)}</Text>
      ),
    },
    {
      key: 'category',
      title: 'Category',
      minWidth: 140,
      render: (module) => (
        <Text style={styles.cellText}>
          {module.moduleSegment === 'warmup'
            ? 'Warmup'
            : module.moduleSegment === 'cooldown'
              ? 'Cooldown'
              : module.category || '—'}
        </Text>
      ),
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
      minWidth: 220,
      align: 'right',
      render: (module) => (
        <View style={[styles.actionRow, styles.actionRowFilled, isCompact && styles.actionRowCompact]}>
          <TouchableOpacity
            style={[
              styles.secondaryActionButton,
              styles.secondaryActionButtonFill,
              isCompact && styles.secondaryActionButtonCompact,
            ]}
            onPress={() => handleViewModule(module)}
          >
            <Text style={styles.secondaryActionText}>View</Text>
          </TouchableOpacity>
          {module.status === 'approved' && (
            <TouchableOpacity
              style={[
                styles.secondaryActionButton,
                styles.secondaryActionButtonFill,
                isCompact && styles.secondaryActionButtonCompact,
              ]}
              onPress={() => handleEditModule(module)}
            >
              <Text style={styles.secondaryActionText}>Edit</Text>
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
              <Text style={styles.headerAdminText}>Admin · Manage Modules</Text>
              <Text style={styles.subTitle}>
                Curate the library, approve trainer uploads, and build the learner program.
              </Text>
            </View>
          </Animated.View>

          <View style={[styles.mainContent, isCompact && styles.mainContentCompact]}>
            <Animated.View
              style={[
                styles.statsRow,
                isCompact && styles.statsRowCompact,
                {
                  opacity: controlsAnim,
                  transform: [
                    {
                      translateY: controlsAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.statCard, styles.statCardActive]}>
                <View style={[styles.statIconWrap, { backgroundColor: 'rgba(56, 166, 222, 0.18)' }]}>
                  <Ionicons name="fitness" size={20} color="#38a6de" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statValue}>{activeCount}</Text>
                  <Text style={styles.statLabel}>Active modules</Text>
                </View>
              </View>
              <View style={[styles.statCard, styles.statCardPending]}>
                <View style={[styles.statIconWrap, { backgroundColor: 'rgba(255, 193, 7, 0.18)' }]}>
                  <Ionicons name="time-outline" size={20} color="#ffc107" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statValue}>{pendingCount}</Text>
                  <Text style={styles.statLabel}>Pending / Disabled</Text>
                </View>
              </View>
              <View style={[styles.statCard, styles.statCardCategories]}>
                <View style={[styles.statIconWrap, { backgroundColor: 'rgba(7, 187, 192, 0.18)' }]}>
                  <Ionicons name="pricetags-outline" size={20} color="#07bbc0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statValue}>{displayCategories.length}</Text>
                  <Text style={styles.statLabel}>Categories</Text>
                </View>
              </View>
              <View style={[styles.statCard, styles.statCardTrainers]}>
                <View style={[styles.statIconWrap, { backgroundColor: 'rgba(180, 145, 255, 0.18)' }]}>
                  <Ionicons name="people-outline" size={20} color="#b491ff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statValue}>{approvedTrainerNames.length}</Text>
                  <Text style={styles.statLabel}>Approved trainers</Text>
                </View>
              </View>
            </Animated.View>

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
              <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <View style={styles.sectionCardTitleWrap}>
                    <Ionicons name="options-outline" size={18} color="#38a6de" />
                    <Text style={styles.sectionCardTitle}>Library status</Text>
                  </View>
                  <Text style={styles.sectionCardCaption}>
                    Switch between approved content and items awaiting review.
                  </Text>
                </View>
                <View style={styles.primaryFiltersRow}>
                  <TouchableOpacity
                    style={[styles.tabButton, filterType === 'active' && styles.tabButtonActive]}
                    onPress={() => setFilterType('active')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={15}
                      color={filterType === 'active' ? '#38a6de' : '#8199a5'}
                    />
                    <Text style={[styles.tabText, filterType === 'active' && styles.tabTextActive]}>
                      Active
                    </Text>
                    <View
                      style={[
                        styles.tabCountBadge,
                        filterType === 'active' && styles.tabCountBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabCountBadgeText,
                          filterType === 'active' && styles.tabCountBadgeTextActive,
                        ]}
                      >
                        {activeCount}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tabButton, filterType === 'pending' && styles.tabButtonActive]}
                    onPress={() => setFilterType('pending')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="time"
                      size={15}
                      color={filterType === 'pending' ? '#ffc107' : '#8199a5'}
                    />
                    <Text style={[styles.tabText, filterType === 'pending' && styles.tabTextActive]}>
                      Pending / Disabled
                    </Text>
                    <View
                      style={[
                        styles.tabCountBadge,
                        filterType === 'pending' && styles.tabCountBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabCountBadgeText,
                          filterType === 'pending' && styles.tabCountBadgeTextActive,
                        ]}
                      >
                        {pendingCount}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.segmentPickerCard}>
                <View style={styles.sectionCardHeader}>
                  <View style={styles.sectionCardTitleWrap}>
                    <Ionicons name="flame-outline" size={18} color="#38a6de" />
                    <Text style={styles.sectionCardTitle}>Warm-up & cool-down</Text>
                  </View>
                  <Text style={styles.sectionCardCaption}>
                    Tap a circle to filter the table. Tap it again to return to technique modules.
                  </Text>
                </View>
                <View style={styles.segmentPickerRow}>
                  <TouchableOpacity
                    style={[
                      styles.segmentCircleHit,
                      moduleTableSegment === 'warmup' && styles.segmentCircleHitActive,
                    ]}
                    onPress={() =>
                      setModuleTableSegment((prev) => (prev === 'warmup' ? 'technique' : 'warmup'))
                    }
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected: moduleTableSegment === 'warmup' }}
                  >
                    <View
                      style={[
                        styles.segmentCircleOuter,
                        moduleTableSegment === 'warmup' && styles.segmentCircleOuterActive,
                      ]}
                    >
                      <Ionicons
                        name="flame"
                        size={20}
                        color={moduleTableSegment === 'warmup' ? '#ff8a5c' : '#9db3be'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.segmentCircleLabel,
                        moduleTableSegment === 'warmup' && styles.segmentCircleLabelActive,
                      ]}
                    >
                      Warm-up
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.segmentCircleHit,
                      moduleTableSegment === 'cooldown' && styles.segmentCircleHitActive,
                    ]}
                    onPress={() =>
                      setModuleTableSegment((prev) => (prev === 'cooldown' ? 'technique' : 'cooldown'))
                    }
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected: moduleTableSegment === 'cooldown' }}
                  >
                    <View
                      style={[
                        styles.segmentCircleOuter,
                        moduleTableSegment === 'cooldown' && styles.segmentCircleOuterActive,
                      ]}
                    >
                      <Ionicons
                        name="leaf"
                        size={20}
                        color={moduleTableSegment === 'cooldown' ? '#7ed9a1' : '#9db3be'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.segmentCircleLabel,
                        moduleTableSegment === 'cooldown' && styles.segmentCircleLabelActive,
                      ]}
                    >
                      Cool-down
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.segmentCircleHit,
                      moduleTableSegment === 'introduction' && styles.segmentCircleHitActive,
                    ]}
                    onPress={() =>
                      setModuleTableSegment((prev) =>
                        prev === 'introduction' ? 'technique' : 'introduction'
                      )
                    }
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected: moduleTableSegment === 'introduction' }}
                  >
                    <View
                      style={[
                        styles.segmentCircleOuter,
                        moduleTableSegment === 'introduction' && styles.segmentCircleOuterActive,
                      ]}
                    >
                      <Ionicons
                        name="play-circle"
                        size={20}
                        color={moduleTableSegment === 'introduction' ? '#b491ff' : '#9db3be'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.segmentCircleLabel,
                        moduleTableSegment === 'introduction' && styles.segmentCircleLabelActive,
                      ]}
                    >
                      Introduction
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.segmentPickerSpacer} />

                  <TouchableOpacity
                    style={styles.segmentAddButton}
                    onPress={() =>
                      router.push({
                        pathname: '/(admin)/module-detail',
                        params: { mode: 'create', segment: 'warmup' },
                      } as any)
                    }
                    activeOpacity={0.75}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#38a6de" />
                    <Text style={styles.segmentAddButtonText}>Add warm-up</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.segmentAddButton}
                    onPress={() =>
                      router.push({
                        pathname: '/(admin)/module-detail',
                        params: { mode: 'create', segment: 'cooldown' },
                      } as any)
                    }
                    activeOpacity={0.75}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#38a6de" />
                    <Text style={styles.segmentAddButtonText}>Add cool-down</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.segmentAddButton}
                    onPress={() =>
                      router.push({
                        pathname: '/(admin)/module-detail',
                        params: { mode: 'create', segment: 'introduction' },
                      } as any)
                    }
                    activeOpacity={0.75}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#38a6de" />
                    <Text style={styles.segmentAddButtonText}>Add introduction</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <View style={styles.sectionCardTitleWrap}>
                    <Ionicons name="funnel-outline" size={18} color="#38a6de" />
                    <Text style={styles.sectionCardTitle}>Filters</Text>
                  </View>
                  <Text style={styles.sectionCardCaption}>
                    Narrow the table by category, difficulty, and trainer.
                  </Text>
                </View>

                {moduleTableSegment === 'technique' ? (
                  <View style={styles.filterGroup}>
                    <View style={styles.categoryRow}>
                      <Text style={styles.categoryRowLabel}>Category</Text>
                      <View style={styles.categoryActions}>
                        <TouchableOpacity
                          style={styles.addCategoryButton}
                          onPress={() => setShowAddCategoryModal(true)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add-circle-outline" size={15} color="#38a6de" />
                          <Text style={styles.addCategoryButtonText}>Add</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.editCategoryButton,
                            categoryFilter !== 'All' && styles.editCategoryButtonActive,
                          ]}
                          onPress={openEditCategoryModal}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="create-outline"
                            size={15}
                            color={categoryFilter !== 'All' ? '#ffca28' : '#9b8c5f'}
                          />
                          <Text
                            style={[
                              styles.editCategoryButtonText,
                              categoryFilter !== 'All' && styles.editCategoryButtonTextActive,
                            ]}
                          >
                            Edit
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeCategoryButton}
                          onPress={() => { setConfirmRemoveStep(false); setShowRemoveCategoryModal(true); }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="remove-circle-outline" size={15} color="#e57373" />
                          <Text style={styles.removeCategoryButtonText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <FilterBar
                      options={categoryFilterOptions}
                      selectedValue={categoryFilter}
                      onSelect={setCategoryFilter}
                    />
                  </View>
                ) : null}

                <View style={styles.filterGroup}>
                  <FilterBar
                    label="Difficulty"
                    options={DIFFICULTY_OPTIONS}
                    selectedValue={difficultyFilter}
                    onSelect={setDifficultyFilter}
                  />
                </View>

                <View style={[styles.filterGroup, styles.trainerAndAssignRow]}>
                  <View style={styles.trainerDropdownWrap}>
                    <Text style={styles.trainerDropdownLabel}>Trainer</Text>
                    <TouchableOpacity
                      style={styles.trainerDropdownButton}
                      onPress={() => setShowTrainerDropdown((prev) => !prev)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.trainerDropdownButtonInner}>
                        <Ionicons name="person-circle-outline" size={18} color="#9db3be" />
                        <Text style={styles.trainerDropdownButtonText} numberOfLines={1}>
                          {trainerOptions.find((o) => o.value === trainerFilter)?.label || 'All Trainers'}
                        </Text>
                      </View>
                      <Ionicons
                        name={showTrainerDropdown ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#9db3be"
                      />
                    </TouchableOpacity>
                    {showTrainerDropdown && (
                      <ScrollView
                        style={styles.trainerDropdownList}
                        nestedScrollEnabled
                      >
                        {trainerOptions.map((option) => {
                          const isSelected = option.value === trainerFilter;
                          return (
                            <TouchableOpacity
                              key={option.value}
                              style={[
                                styles.trainerDropdownItem,
                                isSelected && styles.trainerDropdownItemSelected,
                              ]}
                              onPress={() => {
                                setTrainerFilter(option.value);
                                setShowTrainerDropdown(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.trainerDropdownItemText,
                                  isSelected && styles.trainerDropdownItemTextSelected,
                                ]}
                              >
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.assignSegmentProgramButton}
                onPress={openAssignSegmentModal}
                activeOpacity={0.85}
              >
                <View style={styles.assignSegmentProgramIconWrap}>
                  <Ionicons name="fitness" size={22} color="#38a6de" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.assignSegmentProgramButtonText}>
                    Assign warm-ups & cool-downs
                  </Text>
                  <Text style={styles.assignSegmentProgramButtonHint}>
                    Set the program learners see per technique category.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#38a6de" />
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.tableSearchRow}>
              <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search modules..."
              />
            </View>

            <AdminTable
              columns={columns}
              data={paginatedModules}
              loading={loading}
              compact={isCompact}
              keyExtractor={(module) => module.moduleId}
              sortState={filterType === 'active' ? undefined : sortState}
              onSortChange={filterType === 'active' ? undefined : handleSortChange}
              emptyTitle={
                moduleTableSegment === 'warmup'
                  ? searchQuery.trim()
                    ? 'No warm ups match your search'
                    : 'No warm ups yet'
                  : moduleTableSegment === 'cooldown'
                    ? searchQuery.trim()
                      ? 'No cooldowns match your search'
                      : 'No cooldowns yet'
                    : moduleTableSegment === 'introduction'
                      ? searchQuery.trim()
                        ? 'No introductions match your search'
                        : 'No introductions yet'
                      : searchQuery.trim()
                        ? 'No modules match your search'
                        : 'No modules found'
              }
              emptyDescription={
                moduleTableSegment === 'warmup'
                  ? 'Use "Add warm up" above, or tap the Warm-up circle again to return to technique modules.'
                  : moduleTableSegment === 'cooldown'
                    ? 'Use "Add cooldown" above, or tap the Cool-down circle again to return to technique modules.'
                    : moduleTableSegment === 'introduction'
                      ? 'Use "Add introduction" above, or tap the Introduction circle again to return to technique modules.'
                      : 'Try updating your filters or review module approval data in the backend.'
              }
              pagination={{
                currentPage,
                totalPages,
                onPrevious: () => setCurrentPage((p) => Math.max(1, p - 1)),
                onNext: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
              }}
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

      <Modal
        visible={showAssignSegmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssignSegmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.assignSegmentModalContainer]}>
            <Text style={styles.modalTitle}>Assign warm-up & cool-downs</Text>
            <Text style={styles.modalSubtitle}>
              Pick a technique category, then choose exactly {SEGMENT_ASSIGN_COUNT} approved warm-ups and{' '}
              {SEGMENT_ASSIGN_COUNT} cool-downs. Learners see this program on the dashboard for that category.
            </Text>

            <ScrollView
              style={StyleSheet.flatten([
                styles.assignSegmentBodyScroll,
                { maxHeight: Math.min(height * 0.58, 560) },
              ])}
              contentContainerStyle={styles.assignSegmentBodyScrollContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              <Text style={StyleSheet.flatten([
                styles.assignSegmentFieldLabel,
                styles.assignSegmentCategoryFieldLabel,
              ])}>
                Category
              </Text>
              {assignSegmentCategory ? (
                <View style={styles.assignSegmentCategoryForRow}>
                  <Text style={styles.assignSegmentCategoryForPrefix}>Program for</Text>
                  <Text style={styles.assignSegmentCategoryForName} numberOfLines={2}>
                    {assignSegmentCategory}
                  </Text>
                </View>
              ) : (
                <Text style={styles.assignSegmentCategoryHintMuted}>Select a category below.</Text>
              )}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                style={styles.assignSegmentCategoryScroll}
                contentContainerStyle={styles.assignSegmentCategoryScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {displayCategories.map((cat) => {
                    const active = assignSegmentCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.assignSegmentCatPill, active && styles.assignSegmentCatPillActive]}
                        onPress={() => setAssignSegmentCategory(cat)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.assignSegmentCatPillText, active && styles.assignSegmentCatPillTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>

              {assignSegmentLoading ? (
                <View style={styles.assignSegmentLoadingBox}>
                  <ActivityIndicator color="#38a6de" />
                  <Text style={styles.assignSegmentLoadingText}>Loading saved program…</Text>
                </View>
              ) : (
                <>
                  <View style={styles.assignSegmentCounterRow}>
                    <Text style={styles.assignSegmentCounterText}>
                      Warm-ups: {assignSegmentWarmupIds.length}/{SEGMENT_ASSIGN_COUNT}
                    </Text>
                    <Text style={styles.assignSegmentCounterText}>
                      Cool-downs: {assignSegmentCooldownIds.length}/{SEGMENT_ASSIGN_COUNT}
                    </Text>
                  </View>

                  <Text style={styles.assignSegmentFieldLabel}>Warm-up library</Text>
                  <ScrollView style={styles.assignSegmentList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {approvedWarmupLibraryForAssign.length === 0 &&
                    pendingWarmupLibraryForAssign.length === 0 ? (
                      <Text style={styles.assignSegmentEmpty}>
                        No warm-up segment modules yet. Use Add warm-up on this page, then approve them to assign
                        here.
                      </Text>
                    ) : null}
                    {approvedWarmupLibraryForAssign.length === 0 &&
                    pendingWarmupLibraryForAssign.length > 0 ? (
                      <Text style={styles.assignSegmentEmptyHint}>
                        Only approved warm-ups can be selected. Approve pending entries below (or under the Pending
                        tab), then return here.
                      </Text>
                    ) : null}
                    {approvedWarmupLibraryForAssign.map((m) => {
                      const selected = assignSegmentWarmupIds.includes(m.moduleId);
                      const atCap = assignSegmentWarmupIds.length >= SEGMENT_ASSIGN_COUNT && !selected;
                      return (
                        <TouchableOpacity
                          key={m.moduleId}
                          style={[
                            styles.assignSegmentRow,
                            selected && styles.assignSegmentRowSelected,
                            atCap && styles.assignSegmentRowDimmed,
                          ]}
                          onPress={() => toggleAssignWarmup(m.moduleId)}
                          disabled={atCap}
                        >
                          <View
                            style={[
                              styles.assignSegmentCheckbox,
                              selected && styles.assignSegmentCheckboxChecked,
                            ]}
                          >
                            {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                          </View>
                          {m.thumbnailUrl ? (
                            <Image source={{ uri: m.thumbnailUrl }} style={styles.assignSegmentThumb} />
                          ) : (
                            <View style={styles.assignSegmentThumbFallback}>
                              <Ionicons name="barbell-outline" size={18} color="#6b8693" />
                            </View>
                          )}
                          <Text style={styles.assignSegmentRowTitle} numberOfLines={2}>
                            {m.moduleTitle}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {pendingWarmupLibraryForAssign.length > 0 ? (
                      <>
                        <View style={styles.assignSegmentPendingDivider}>
                          <Text style={styles.assignSegmentPendingDividerText}>Pending approval</Text>
                        </View>
                        {pendingWarmupLibraryForAssign.map((m) => (
                          <View key={m.moduleId} style={[styles.assignSegmentRow, styles.assignSegmentRowPending]}>
                            <View style={[styles.assignSegmentCheckbox, styles.assignSegmentCheckboxMuted]} />
                            {m.thumbnailUrl ? (
                              <Image source={{ uri: m.thumbnailUrl }} style={styles.assignSegmentThumb} />
                            ) : (
                              <View style={styles.assignSegmentThumbFallback}>
                                <Ionicons name="barbell-outline" size={18} color="#6b8693" />
                              </View>
                            )}
                            <View style={styles.assignSegmentRowTitleCol}>
                              <Text style={styles.assignSegmentRowTitleMuted} numberOfLines={2}>
                                {m.moduleTitle}
                              </Text>
                            </View>
                            <View style={styles.assignSegmentPendingBadge}>
                              <Text style={styles.assignSegmentPendingBadgeText}>Pending</Text>
                            </View>
                          </View>
                        ))}
                      </>
                    ) : null}
                  </ScrollView>

                  <Text style={styles.assignSegmentFieldLabel}>Cool-down library</Text>
                  <ScrollView style={styles.assignSegmentList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {approvedCooldownLibraryForAssign.length === 0 &&
                    pendingCooldownLibraryForAssign.length === 0 ? (
                      <Text style={styles.assignSegmentEmpty}>
                        No cool-down segment modules yet. Use Add cooldown on this page, then approve them to assign
                        here.
                      </Text>
                    ) : null}
                    {approvedCooldownLibraryForAssign.length === 0 &&
                    pendingCooldownLibraryForAssign.length > 0 ? (
                      <Text style={styles.assignSegmentEmptyHint}>
                        Only approved cool-downs can be selected. Approve pending entries below (or under the Pending
                        tab), then return here.
                      </Text>
                    ) : null}
                    {approvedCooldownLibraryForAssign.map((m) => {
                      const selected = assignSegmentCooldownIds.includes(m.moduleId);
                      const atCap = assignSegmentCooldownIds.length >= SEGMENT_ASSIGN_COUNT && !selected;
                      return (
                        <TouchableOpacity
                          key={m.moduleId}
                          style={[
                            styles.assignSegmentRow,
                            selected && styles.assignSegmentRowSelected,
                            atCap && styles.assignSegmentRowDimmed,
                          ]}
                          onPress={() => toggleAssignCooldown(m.moduleId)}
                          disabled={atCap}
                        >
                          <View
                            style={[
                              styles.assignSegmentCheckbox,
                              selected && styles.assignSegmentCheckboxChecked,
                            ]}
                          >
                            {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                          </View>
                          {m.thumbnailUrl ? (
                            <Image source={{ uri: m.thumbnailUrl }} style={styles.assignSegmentThumb} />
                          ) : (
                            <View style={styles.assignSegmentThumbFallback}>
                              <Ionicons name="leaf-outline" size={18} color="#6b8693" />
                            </View>
                          )}
                          <Text style={styles.assignSegmentRowTitle} numberOfLines={2}>
                            {m.moduleTitle}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {pendingCooldownLibraryForAssign.length > 0 ? (
                      <>
                        <View style={styles.assignSegmentPendingDivider}>
                          <Text style={styles.assignSegmentPendingDividerText}>Pending approval</Text>
                        </View>
                        {pendingCooldownLibraryForAssign.map((m) => (
                          <View key={m.moduleId} style={[styles.assignSegmentRow, styles.assignSegmentRowPending]}>
                            <View style={[styles.assignSegmentCheckbox, styles.assignSegmentCheckboxMuted]} />
                            {m.thumbnailUrl ? (
                              <Image source={{ uri: m.thumbnailUrl }} style={styles.assignSegmentThumb} />
                            ) : (
                              <View style={styles.assignSegmentThumbFallback}>
                                <Ionicons name="leaf-outline" size={18} color="#6b8693" />
                              </View>
                            )}
                            <View style={styles.assignSegmentRowTitleCol}>
                              <Text style={styles.assignSegmentRowTitleMuted} numberOfLines={2}>
                                {m.moduleTitle}
                              </Text>
                            </View>
                            <View style={styles.assignSegmentPendingBadge}>
                              <Text style={styles.assignSegmentPendingBadgeText}>Pending</Text>
                            </View>
                          </View>
                        ))}
                      </>
                    ) : null}
                  </ScrollView>
                </>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAssignSegmentModal(false)}
                disabled={savingAssignSegment}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.addCategoryConfirmButton]}
                onPress={handleSaveCategorySegmentProgram}
                disabled={
                  savingAssignSegment ||
                  assignSegmentLoading ||
                  assignSegmentWarmupIds.length !== SEGMENT_ASSIGN_COUNT ||
                  assignSegmentCooldownIds.length !== SEGMENT_ASSIGN_COUNT
                }
              >
                {savingAssignSegment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Save program</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

      <Modal
        visible={showAddCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddCategoryModal(false);
          setNewCategoryName('');
          setSelectedModuleIds([]);
          setAddCategoryStep(1);
          setAssignSearchQuery('');
          setAssignCategoryFilter('');
          setAssignStatusFilter('approved');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, addCategoryStep === 2 && styles.modalContainerLarge]}>
            {addCategoryStep === 1 ? (
              <>
                <Text style={styles.modalTitle}>Add Category</Text>
                <Text style={styles.modalSubtitle}>
                  Enter a name for the new module category.
                </Text>
                <TextInput
                  style={styles.customReasonInput}
                  placeholder="Category name"
                  placeholderTextColor="#6b8693"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  autoFocus
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowAddCategoryModal(false);
                      setNewCategoryName('');
                      setSelectedModuleIds([]);
                      setAddCategoryStep(1);
                      setAssignSearchQuery('');
                      setAssignCategoryFilter('');
                      setAssignStatusFilter('approved');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.addCategoryConfirmButton]}
                    onPress={handleAddCategory}
                    disabled={!newCategoryName.trim() || addingCategory}
                  >
                    {addingCategory ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmDeleteButtonText}>Add Category Only</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.addCategoryConfirmButton]}
                    onPress={() => setAddCategoryStep(2)}
                    disabled={!newCategoryName.trim()}
                  >
                    <Text style={styles.confirmDeleteButtonText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Assign Modules</Text>
                <Text style={styles.modalSubtitle}>
                  Select existing modules to add to{' '}
                  <Text style={{ color: '#38a6de', fontWeight: '700' }}>"{newCategoryName}".</Text>
                  {' '}You can skip this step.
                </Text>
                {/* Search bar */}
                <TextInput
                  style={styles.assignSearchInput}
                  placeholder="Search modules..."
                  placeholderTextColor="#6b8693"
                  value={assignSearchQuery}
                  onChangeText={setAssignSearchQuery}
                />
                <View style={styles.assignStatusRow}>
                  <TouchableOpacity
                    style={[styles.assignStatusPill, assignStatusFilter === 'approved' && styles.assignStatusPillActive]}
                    onPress={() => setAssignStatusFilter('approved')}
                  >
                    <Text style={[styles.assignStatusPillText, assignStatusFilter === 'approved' && styles.assignStatusPillTextActive]}>
                      Approved
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.assignStatusPill, assignStatusFilter === 'pending' && styles.assignStatusPillActive]}
                    onPress={() => setAssignStatusFilter('pending')}
                  >
                    <Text style={[styles.assignStatusPillText, assignStatusFilter === 'pending' && styles.assignStatusPillTextActive]}>
                      Pending
                    </Text>
                  </TouchableOpacity>
                </View>
                {/* Category filter pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.assignCategoryRow}
                  contentContainerStyle={styles.assignCategoryRowContent}
                >
                  {displayCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.assignCategoryPill, assignCategoryFilter === cat && styles.assignCategoryPillActive]}
                      onPress={() => setAssignCategoryFilter(cat)}
                    >
                      <Text style={[styles.assignCategoryPillText, assignCategoryFilter === cat && styles.assignCategoryPillTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <ScrollView style={styles.moduleSelectList} nestedScrollEnabled>
                  {modules.filter((m) => {
                    if (m.moduleSegment) return false;
                    if (assignStatusFilter === 'approved' && !isApprovedModuleStatus(m.status)) return false;
                    if (assignStatusFilter === 'pending' && !isPendingReviewModuleStatus(m.status)) return false;
                    if (assignCategoryFilter && m.category !== assignCategoryFilter) return false;
                    if (assignSearchQuery.trim()) {
                      const q = assignSearchQuery.trim().toLowerCase();
                      return m.moduleTitle.toLowerCase().includes(q) || (m.trainerName || '').toLowerCase().includes(q);
                    }
                    return true;
                  }).map((m) => {
                    const isSelected = selectedModuleIds.includes(m.moduleId);
                    return (
                      <TouchableOpacity
                        key={m.moduleId}
                        style={[styles.moduleSelectItem, isSelected && styles.moduleSelectItemSelected]}
                        onPress={() =>
                          setSelectedModuleIds((prev) =>
                            isSelected ? prev.filter((id) => id !== m.moduleId) : [...prev, m.moduleId]
                          )
                        }
                        activeOpacity={0.75}
                      >
                        <View style={[styles.moduleSelectCheckbox, isSelected && styles.moduleSelectCheckboxChecked]}>
                          {isSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.moduleSelectTitle} numberOfLines={1}>{m.moduleTitle}</Text>
                          <Text style={styles.moduleSelectMeta} numberOfLines={1}>
                            {m.trainerName || m.trainerId || 'Unknown trainer'} · {m.category}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {selectedModuleIds.length > 0 && (
                  <Text style={styles.moduleSelectCount}>
                    {selectedModuleIds.length} module{selectedModuleIds.length !== 1 ? 's' : ''} selected
                  </Text>
                )}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setAddCategoryStep(1)}
                  >
                    <Text style={styles.cancelButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.addCategoryConfirmButton]}
                    onPress={handleAddCategory}
                    disabled={addingCategory}
                  >
                    {addingCategory ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmDeleteButtonText}>
                        {selectedModuleIds.length > 0 ? 'Add & Assign' : 'Add Category'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowEditCategoryModal(false);
          setEditCategoryOriginalName('');
          setEditCategoryName('');
          setEditCategoryThumbnailUrl(null);
          setEditCategoryThumbnailLocalUri(null);
          setEditSelectedModuleIds([]);
          setEditSearchQuery('');
          setEditModuleCategoryFilter('');
          setEditStatusFilter('approved');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.modalContainerLarge]}>
            <Text style={styles.modalTitle}>Edit Category</Text>
            <Text style={styles.modalSubtitle}>
              Update name and assign modules for{' '}
              <Text style={{ color: '#ffca28', fontWeight: '700' }}>"{editCategoryOriginalName}".</Text>
            </Text>
            <TextInput
              style={styles.customReasonInput}
              placeholder="Category name"
              placeholderTextColor="#6b8693"
              value={editCategoryName}
              onChangeText={setEditCategoryName}
            />
            <View style={styles.categoryImagePickerRow}>
              <TouchableOpacity
                style={styles.categoryImagePickerButton}
                onPress={handlePickEditCategoryThumbnail}
                activeOpacity={0.75}
              >
                <Ionicons name="image-outline" size={16} color="#ffca28" />
                <Text style={styles.categoryImagePickerButtonText}>
                  {editCategoryThumbnailLocalUri ? 'Change Image' : 'Select PNG/Image'}
                </Text>
              </TouchableOpacity>
              {(editCategoryThumbnailLocalUri || editCategoryThumbnailUrl) ? (
                <Image
                  source={{ uri: editCategoryThumbnailLocalUri || editCategoryThumbnailUrl || '' }}
                  style={styles.categoryImagePreview}
                />
              ) : (
                <View style={[styles.categoryImagePreview, styles.categoryImagePreviewFallback]}>
                  <Ionicons name="image-outline" size={18} color="#6b8693" />
                </View>
              )}
            </View>

            <TextInput
              style={styles.assignSearchInput}
              placeholder="Search modules..."
              placeholderTextColor="#6b8693"
              value={editSearchQuery}
              onChangeText={setEditSearchQuery}
            />

            <View style={styles.assignStatusRow}>
              <TouchableOpacity
                style={[styles.assignStatusPill, editStatusFilter === 'approved' && styles.assignStatusPillActive]}
                onPress={() => setEditStatusFilter('approved')}
              >
                <Text style={[styles.assignStatusPillText, editStatusFilter === 'approved' && styles.assignStatusPillTextActive]}>
                  Approved
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.assignStatusPill, editStatusFilter === 'pending' && styles.assignStatusPillActive]}
                onPress={() => setEditStatusFilter('pending')}
              >
                <Text style={[styles.assignStatusPillText, editStatusFilter === 'pending' && styles.assignStatusPillTextActive]}>
                  Pending
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.assignCategoryRow}
              contentContainerStyle={styles.assignCategoryRowContent}
            >
              {displayCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.assignCategoryPill, editModuleCategoryFilter === cat && styles.assignCategoryPillActive]}
                  onPress={() => setEditModuleCategoryFilter(cat)}
                >
                  <Text style={[styles.assignCategoryPillText, editModuleCategoryFilter === cat && styles.assignCategoryPillTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView style={styles.moduleSelectList} nestedScrollEnabled>
              {modules.filter((m) => {
                if (m.moduleSegment) return false;
                if (editStatusFilter === 'approved' && !isApprovedModuleStatus(m.status)) return false;
                if (editStatusFilter === 'pending' && !isPendingReviewModuleStatus(m.status)) return false;
                if (editModuleCategoryFilter && m.category !== editModuleCategoryFilter) return false;
                if (editSearchQuery.trim()) {
                  const q = editSearchQuery.trim().toLowerCase();
                  return m.moduleTitle.toLowerCase().includes(q) || (m.trainerName || '').toLowerCase().includes(q);
                }
                return true;
              }).map((m) => {
                const isSelected = editSelectedModuleIds.includes(m.moduleId);
                return (
                  <TouchableOpacity
                    key={m.moduleId}
                    style={[styles.moduleSelectItem, isSelected && styles.moduleSelectItemSelected]}
                    onPress={() =>
                      setEditSelectedModuleIds((prev) =>
                        isSelected ? prev.filter((id) => id !== m.moduleId) : [...prev, m.moduleId]
                      )
                    }
                    activeOpacity={0.75}
                  >
                    <View style={[styles.moduleSelectCheckbox, isSelected && styles.moduleSelectCheckboxChecked]}>
                      {isSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moduleSelectTitle} numberOfLines={1}>{m.moduleTitle}</Text>
                      <Text style={styles.moduleSelectMeta} numberOfLines={1}>
                        {m.trainerName || m.trainerId || 'Unknown trainer'} · {m.category}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {editSelectedModuleIds.length > 0 && (
              <Text style={styles.moduleSelectCount}>
                {editSelectedModuleIds.length} module{editSelectedModuleIds.length !== 1 ? 's' : ''} selected
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditCategoryModal(false);
                  setEditCategoryOriginalName('');
                  setEditCategoryName('');
                  setEditCategoryThumbnailUrl(null);
                  setEditCategoryThumbnailLocalUri(null);
                  setEditSelectedModuleIds([]);
                  setEditSearchQuery('');
                  setEditModuleCategoryFilter('');
                  setEditStatusFilter('approved');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.editCategoryConfirmButton]}
                onPress={handleEditCategory}
                disabled={editingCategory || uploadingCategoryThumbnail}
              >
                {(editingCategory || uploadingCategoryThumbnail) ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRemoveCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowRemoveCategoryModal(false); setCategoryToRemove(null); setConfirmRemoveStep(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {!confirmRemoveStep ? (
              <>
                <Text style={styles.modalTitle}>Remove Category</Text>
                <Text style={styles.modalSubtitle}>
                  Select a category to remove.
                </Text>
                <ScrollView style={styles.reasonsList}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.reasonOption, categoryToRemove === cat && styles.reasonOptionSelected]}
                      onPress={() => setCategoryToRemove(cat)}
                    >
                      <View style={styles.radioButton}>
                        {categoryToRemove === cat && <View style={styles.radioButtonInner} />}
                      </View>
                      <Text style={styles.reasonText}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => { setShowRemoveCategoryModal(false); setCategoryToRemove(null); }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmDeleteButton]}
                    onPress={() => setConfirmRemoveStep(true)}
                    disabled={!categoryToRemove}
                  >
                    <Text style={styles.confirmDeleteButtonText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Ionicons name="warning-outline" size={48} color="#e57373" style={{ alignSelf: 'center', marginBottom: 12 }} />
                <Text style={styles.modalTitle}>Are you sure?</Text>
                <Text style={styles.modalSubtitle}>
                  You are about to remove the{' '}
                  <Text style={{ color: '#e57373', fontWeight: '700' }}>"{categoryToRemove}"</Text>{' '}
                  category. This will delete it from the database and it will no longer appear as a filter or option when publishing modules.
                </Text>
                <Text style={[styles.modalSubtitle, { color: '#f0a500', marginTop: 8 }]}>
                  Note: Existing modules that already use this category will not be affected.
                </Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setConfirmRemoveStep(false)}
                  >
                    <Text style={styles.cancelButtonText}>No, Go Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmDeleteButton]}
                    onPress={handleRemoveCategory}
                    disabled={removingCategory}
                  >
                    {removingCategory ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmDeleteButtonText}>Yes, Remove</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  tableSearchRow: {
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 4,
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
    fontSize: 14,
    fontWeight: '500',
    color: '#b8ccd6',
    marginTop: 4,
    opacity: 0.95,
    maxWidth: 540,
    lineHeight: 19,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  statsRowCompact: {
    gap: 10,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#011f36',
    minWidth: 180,
    flexGrow: 1,
    flexBasis: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  statCardActive: {
    borderColor: 'rgba(56, 166, 222, 0.35)',
  },
  statCardPending: {
    borderColor: 'rgba(255, 193, 7, 0.30)',
  },
  statCardCategories: {
    borderColor: 'rgba(7, 187, 192, 0.30)',
  },
  statCardTrainers: {
    borderColor: 'rgba(180, 145, 255, 0.30)',
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: '#f4fbff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statLabel: {
    color: '#9db3be',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: 'rgba(1, 31, 54, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(126, 153, 166, 0.22)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionCardHeader: {
    gap: 4,
  },
  sectionCardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionCardTitle: {
    color: '#f4fbff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionCardCaption: {
    color: '#8da8b5',
    fontSize: 12,
    lineHeight: 17,
  },
  filterGroup: {
    gap: 8,
  },
  segmentPickerCard: {
    backgroundColor: 'rgba(56, 166, 222, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 166, 222, 0.28)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 2,
  },
  segmentPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  segmentCircleHit: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 84,
  },
  segmentCircleHitActive: {
    backgroundColor: 'rgba(56, 166, 222, 0.12)',
  },
  segmentCircleOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(126, 153, 166, 0.45)',
    backgroundColor: 'rgba(2, 68, 70, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentCircleOuterActive: {
    borderColor: '#38a6de',
    backgroundColor: 'rgba(56, 166, 222, 0.22)',
  },
  segmentCircleLabel: {
    marginTop: 8,
    color: '#9db3be',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  segmentCircleLabelActive: {
    color: '#e5f5ff',
  },
  segmentPickerSpacer: {
    flexGrow: 1,
    flexBasis: 8,
    minWidth: 8,
  },
  segmentAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38a6de',
    backgroundColor: 'rgba(56, 166, 222, 0.12)',
  },
  segmentAddButtonText: {
    color: '#38a6de',
    fontSize: 14,
    fontWeight: '600',
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
    flexWrap: 'wrap',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(126, 153, 166, 0.4)',
    backgroundColor: 'rgba(15, 41, 63, 0.6)',
  },
  tabButtonActive: {
    borderColor: '#38a6de',
    backgroundColor: 'rgba(56, 166, 222, 0.22)',
  },
  tabText: {
    color: '#a9bdc6',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: '#e5f5ff',
  },
  tabCountBadge: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(126, 153, 166, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountBadgeActive: {
    backgroundColor: 'rgba(56, 166, 222, 0.45)',
  },
  tabCountBadgeText: {
    color: '#a9bdc6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  tabCountBadgeTextActive: {
    color: '#f4fbff',
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
    justifyContent: 'flex-end',
  },
  actionRowFilled: {
    width: '100%',
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
  secondaryActionButtonFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  addCategoryConfirmButton: {
    backgroundColor: '#07bbc0',
  },
  editCategoryConfirmButton: {
    backgroundColor: '#ffb300',
  },
  modalContainerLarge: {
    maxHeight: '80%',
  },
  moduleSelectList: {
    maxHeight: 320,
    marginTop: 14,
    marginBottom: 4,
  },
  moduleSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(126, 153, 166, 0.2)',
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 12,
  },
  moduleSelectItemSelected: {
    borderColor: '#38a6de',
    backgroundColor: 'rgba(56, 166, 222, 0.1)',
  },
  moduleSelectCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#6b8693',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleSelectCheckboxChecked: {
    backgroundColor: '#38a6de',
    borderColor: '#38a6de',
  },
  moduleSelectTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  moduleSelectMeta: {
    color: '#9db3be',
    fontSize: 11,
    marginTop: 2,
  },
  moduleSelectCount: {
    color: '#38a6de',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  assignSearchInput: {
    backgroundColor: '#0a1e30',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1a3a4a',
    color: '#FFFFFF',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  assignStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  assignStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0a1e30',
    borderWidth: 1,
    borderColor: '#1a3a4a',
  },
  assignStatusPillActive: {
    backgroundColor: '#38a6de',
    borderColor: '#38a6de',
  },
  assignStatusPillText: {
    color: '#9db3be',
    fontSize: 12,
    fontWeight: '700',
  },
  assignStatusPillTextActive: {
    color: '#FFFFFF',
  },
  categoryImagePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  categoryImagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 202, 40, 0.12)',
    borderWidth: 1,
    borderColor: '#ffca28',
  },
  categoryImagePickerButtonText: {
    color: '#ffca28',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryImagePreview: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a3a4a',
  },
  categoryImagePreviewFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a1e30',
  },
  assignCategoryRow: {
    minHeight: 44,
    marginBottom: 14,
    zIndex: 3,
  },
  assignCategoryRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  assignCategoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0a1e30',
    borderWidth: 1,
    borderColor: '#1a3a4a',
    marginRight: 6,
  },
  assignCategoryPillActive: {
    backgroundColor: '#38a6de',
    borderColor: '#38a6de',
  },
  assignCategoryPillText: {
    color: '#9db3be',
    fontSize: 12,
    fontWeight: '600',
  },
  assignCategoryPillTextActive: {
    color: '#FFFFFF',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryRowLabel: {
    color: '#9db3be',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(56, 166, 222, 0.18)',
    borderWidth: 1.5,
    borderColor: '#38a6de',
    marginBottom: 1,
  },
  addCategoryButtonText: {
    color: '#38a6de',
    fontSize: 13,
    fontWeight: '700',
  },
  editCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(155, 140, 95, 0.18)',
    borderWidth: 1.5,
    borderColor: '#9b8c5f',
  },
  editCategoryButtonActive: {
    backgroundColor: 'rgba(255, 202, 40, 0.22)',
    borderColor: '#ffca28',
    shadowColor: '#ffca28',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  editCategoryButtonText: {
    color: '#9b8c5f',
    fontSize: 13,
    fontWeight: '700',
  },
  editCategoryButtonTextActive: {
    color: '#ffca28',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  removeCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(229, 115, 115, 0.15)',
    borderWidth: 1.5,
    borderColor: '#e57373',
  },
  removeCategoryButtonText: {
    color: '#e57373',
    fontSize: 13,
    fontWeight: '700',
  },
  addModuleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#07bbc0',
  },
  addModuleButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
  trainerAndAssignRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 12,
  },
  assignSegmentProgramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 166, 222, 0.5)',
    backgroundColor: 'rgba(56, 166, 222, 0.14)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#38a6de',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  assignSegmentProgramIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 166, 222, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignSegmentProgramButtonText: {
    color: '#e5f5ff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  assignSegmentProgramButtonHint: {
    color: '#9db3be',
    fontSize: 12,
    marginTop: 2,
  },
  assignSegmentModalContainer: {
    maxWidth: 560,
  },
  assignSegmentBodyScroll: {
    flexGrow: 0,
  },
  assignSegmentBodyScrollContent: {
    paddingBottom: 8,
  },
  assignSegmentCategoryForLine: {
    color: '#b8ccd6',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 10,
    marginTop: 2,
  },
  assignSegmentCategoryForRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    marginTop: 2,
  },
  assignSegmentCategoryForPrefix: {
    color: '#b8ccd6',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  assignSegmentCategoryForName: {
    color: '#38a6de',
    fontWeight: '800',
    fontSize: 15,
  },
  assignSegmentCategoryHintMuted: {
    color: '#6b8693',
    fontSize: 13,
    marginBottom: 10,
    marginTop: 2,
  },
  assignSegmentCategoryScroll: {
    marginBottom: 12,
  },
  assignSegmentCategoryScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    paddingRight: 4,
  },
  assignSegmentCatPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(126, 153, 166, 0.55)',
    backgroundColor: 'rgba(15, 41, 63, 0.65)',
  },
  assignSegmentCatPillActive: {
    borderColor: '#38a6de',
    backgroundColor: 'rgba(56, 166, 222, 0.28)',
    borderWidth: 2,
  },
  assignSegmentCatPillText: {
    color: '#dce9f0',
    fontSize: 14,
    fontWeight: '700',
  },
  assignSegmentCatPillTextActive: {
    color: '#f4fbff',
  },
  assignSegmentCategoryFieldLabel: {
    marginTop: 0,
  },
  assignSegmentFieldLabel: {
    color: '#9db3be',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 12,
    marginBottom: 8,
  },
  assignSegmentLoadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 10,
  },
  assignSegmentLoadingText: {
    color: '#6b8693',
    fontSize: 13,
  },
  assignSegmentCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  assignSegmentCounterText: {
    color: '#38a6de',
    fontSize: 12,
    fontWeight: '700',
  },
  assignSegmentList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(126, 153, 166, 0.35)',
    borderRadius: 10,
    marginBottom: 4,
  },
  assignSegmentEmpty: {
    color: '#6b8693',
    fontSize: 13,
    padding: 16,
  },
  assignSegmentEmptyHint: {
    color: '#c5a572',
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    fontWeight: '600',
  },
  assignSegmentPendingDivider: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 193, 7, 0.08)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 193, 7, 0.25)',
  },
  assignSegmentPendingDividerText: {
    color: '#e6c35c',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  assignSegmentRowPending: {
    opacity: 0.92,
    backgroundColor: 'rgba(15, 41, 63, 0.35)',
  },
  assignSegmentCheckboxMuted: {
    borderColor: 'rgba(126, 153, 166, 0.25)',
    backgroundColor: 'rgba(15, 41, 63, 0.5)',
  },
  assignSegmentRowTitleCol: {
    flex: 1,
    minWidth: 0,
  },
  assignSegmentRowTitleMuted: {
    color: '#9db3be',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  assignSegmentPendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.45)',
  },
  assignSegmentPendingBadgeText: {
    color: '#ffd54f',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  assignSegmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(126, 153, 166, 0.12)',
  },
  assignSegmentRowSelected: {
    backgroundColor: 'rgba(56, 166, 222, 0.14)',
  },
  assignSegmentRowDimmed: {
    opacity: 0.38,
  },
  assignSegmentCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(126, 153, 166, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignSegmentCheckboxChecked: {
    backgroundColor: '#38a6de',
    borderColor: '#38a6de',
  },
  assignSegmentThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  assignSegmentThumbFallback: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 41, 63, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignSegmentRowTitle: {
    flex: 1,
    color: '#e8f4fa',
    fontSize: 14,
    fontWeight: '600',
  },
  trainerDropdownWrap: {
    gap: 7,
    flexGrow: 1,
    minWidth: 200,
  },
  trainerDropdownLabel: {
    color: '#9db3be',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  trainerDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(126, 153, 166, 0.5)',
    backgroundColor: 'rgba(15, 41, 63, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxWidth: 320,
    gap: 10,
  },
  trainerDropdownButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  trainerDropdownButtonText: {
    color: '#d2e8f3',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  trainerDropdownList: {
    maxHeight: 200,
    maxWidth: 260,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(126, 153, 166, 0.5)',
    backgroundColor: '#1a2332',
    marginTop: 4,
  },
  trainerDropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(126, 153, 166, 0.15)',
  },
  trainerDropdownItemSelected: {
    backgroundColor: 'rgba(56, 166, 222, 0.18)',
  },
  trainerDropdownItemText: {
    color: '#b2c6cf',
    fontSize: 13,
    fontWeight: '600',
  },
  trainerDropdownItemTextSelected: {
    color: '#e8f4fa',
  },
});
