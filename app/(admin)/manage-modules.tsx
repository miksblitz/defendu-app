import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Image,
  TextInput,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthController } from '../controllers/AuthController';
import { Module } from '../models/Module';

type FilterType = 'active' | 'pending';

export default function ManageModulesPage() {
  const router = useRouter();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('active');

  useEffect(() => {
    loadModules();
  }, []);

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
      alert(`Failed to load modules: ${error.message || 'Unknown error'}`);
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AuthController.logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Filter modules based on status and search query
  const filteredModules = useMemo(() => {
    let filtered = modules;

    // Filter by status
    if (filterType === 'active') {
      filtered = filtered.filter((module) => module.status === 'approved');
    } else if (filterType === 'pending') {
      filtered = filtered.filter((module) => module.status === 'pending review');
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
  }, [modules, filterType, searchQuery]);

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

        {/* Header with DEFENDU Logo and Admin */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Image
              source={require('../../assets/images/defendudashboardlogo.png')}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
            <Text style={styles.headerAdminText}>Admin</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Filter Buttons and Search */}
          <View style={styles.topSection}>
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
          </View>

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
              renderItem={({ item }) => (
                <View style={styles.moduleCard}>
                  {/* Module Image Placeholder */}
                  <View style={styles.moduleImagePlaceholder}>
                    {item.thumbnailUrl ? (
                      <Image
                        source={{ uri: item.thumbnailUrl }}
                        style={styles.moduleImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.moduleImagePlaceholderInner} />
                    )}
                  </View>

                  {/* Module Info */}
                  <View style={styles.moduleInfo}>
                    <Text style={styles.moduleTitle} numberOfLines={2}>
                      {item.moduleTitle}
                    </Text>

                    <View style={styles.moduleDetailRow}>
                      <Text style={styles.moduleDetailLabel}>Category:</Text>
                      <Text style={styles.moduleDetailValue}>{item.category}</Text>
                    </View>

                    <View style={styles.moduleDetailRow}>
                      <Text style={styles.moduleDetailLabel}>Reference Code:</Text>
                      <Text style={styles.moduleDetailValue}>
                        {getReferenceCode(item.moduleId)}
                      </Text>
                    </View>

                    <View style={styles.moduleDetailRow}>
                      <Text style={styles.moduleDetailLabel}>Date Added:</Text>
                      <Text style={styles.moduleDetailValue}>
                        {formatDate(item.createdAt)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.viewButton}
                      onPress={() => handleViewModule(item)}
                    >
                      <Text style={styles.viewButtonText}>View full application</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>

      {/* Pop-up Menu */}
      {showMenu && (
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  moduleImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#024446',
    marginBottom: 12,
    overflow: 'hidden',
  },
  moduleImage: {
    width: '100%',
    height: '100%',
  },
  moduleImagePlaceholderInner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#024446',
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    minHeight: 40,
  },
  moduleDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  moduleDetailLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    marginRight: 4,
  },
  moduleDetailValue: {
    color: '#38a6de',
    fontSize: 12,
    fontWeight: '500',
  },
  viewButton: {
    backgroundColor: '#38a6de',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: '#011f36',
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
