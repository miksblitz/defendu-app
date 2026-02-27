import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLogout } from '../../hooks/useLogout';
import { User } from '../_models/User';
import { AuthController } from '../controllers/AuthController';

export default function ManageUsersPage() {
  const router = useRouter();
  const handleLogout = useLogout();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedCount, setDisplayedCount] = useState(10);
  
  // Animation refs
  const headerAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const tableHeaderAnim = useRef(new Animated.Value(0)).current;
  const animatedValues = useRef<Map<string, Animated.Value>>(new Map()).current;
  const hoverScales = useRef<Map<string, Animated.Value>>(new Map()).current;

  useEffect(() => {
    loadUsers();
  }, []);
  
  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(searchAnim, {
          toValue: 1,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(tableHeaderAnim, {
          toValue: 1,
          duration: 600,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  // Reset displayed count when search query changes
  useEffect(() => {
    setDisplayedCount(10);
  }, [searchQuery]);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users;
    }
    const query = searchQuery.toLowerCase().trim();
    return users.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const email = user.email.toLowerCase();
      return fullName.includes(query) || email.includes(query);
    });
  }, [users, searchQuery]);

  // Get displayed users (paginated)
  const displayedUsers = useMemo(() => {
    return filteredUsers.slice(0, displayedCount);
  }, [filteredUsers, displayedCount]);
  
  // Animate displayed users when they change
  useEffect(() => {
    if (displayedUsers.length > 0) {
      const animations = displayedUsers.map((user, index) => {
        const animValue = getAnimatedValue(user.uid);
        return Animated.timing(animValue, {
          toValue: 1,
          duration: 400,
          delay: Math.min(index * 30, 500),
          useNativeDriver: true,
        });
      });
      Animated.stagger(20, animations).start();
    }
  }, [displayedUsers]);
  
  const getAnimatedValue = (uid: string) => {
    if (!animatedValues.has(uid)) {
      animatedValues.set(uid, new Animated.Value(0));
    }
    return animatedValues.get(uid)!;
  };
  
  const getHoverScale = (uid: string) => {
    if (!hoverScales.has(uid)) {
      hoverScales.set(uid, new Animated.Value(1));
    }
    return hoverScales.get(uid)!;
  };
  
  const handleRowHover = (uid: string, isHovering: boolean) => {
    const scale = getHoverScale(uid);
    Animated.spring(scale, {
      toValue: isHovering ? 1.02 : 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 8,
    }).start();
  };

  const hasMoreUsers = displayedCount < filteredUsers.length;

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('🔵 Loading users...');
      const allUsers = await AuthController.getAllUsers();
      console.log('✅ Loaded users:', allUsers.length);
      setUsers(allUsers);
    } catch (error: any) {
      console.error('❌ Error loading users:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      // Show error to user
      alert(`Failed to load users: ${error.message || 'Unknown error'}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'Never';
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
  };

  const formatDateAdded = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getRoleDisplay = (role: string): string => {
    if (role === 'individual') return 'Individual';
    if (role === 'trainer') return 'Trainer';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getRoleColor = (role: string): string => {
    if (role === 'trainer') return '#38a6de';
    if (role === 'admin') return '#1a5f8a';
    return '#5a9bc4';
  };

  const handleBlockUser = async (userId: string) => {
    try {
      setBlockingUserId(userId);
      await AuthController.blockUser(userId);
      // Reload users to reflect the change
      await loadUsers();
      setOpenMenuUserId(null);
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Failed to block user. Please try again.');
    } finally {
      setBlockingUserId(null);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      setBlockingUserId(userId);
      await AuthController.unblockUser(userId);
      // Reload users to reflect the change
      await loadUsers();
      setOpenMenuUserId(null);
    } catch (error) {
      console.error('Error unblocking user:', error);
      alert('Failed to unblock user. Please try again.');
    } finally {
      setBlockingUserId(null);
    }
  };

  const toggleUserMenu = (userId: string) => {
    setOpenMenuUserId(openMenuUserId === userId ? null : userId);
  };

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
                disabled={true}
              >
                <Image
                  source={require('../../assets/images/adminmanageicon.png')}
                  style={styles.navIconImage}
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => router.push('/(admin)/adminDashboard')}
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
            <Text style={styles.subTitle}>
              All Users {searchQuery ? `${filteredUsers.length} of ${users.length}` : users.length}
            </Text>
          </View>
        </Animated.View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Search Bar */}
          <Animated.View style={[
            styles.searchContainer,
            {
              opacity: searchAnim,
              transform: [{
                translateY: searchAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              }],
            },
          ]}>
            <Ionicons name="search" size={20} color="#6b8693" style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
              placeholder="Search by name or email..."
              placeholderTextColor="#6b8693"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#6b8693" />
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Users Table */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#38a6de" />
              <Text style={styles.loadingText}>Loading users...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No users found matching your search' : 'No users found'}
              </Text>
            </View>
          ) : (
            <View style={styles.tableWrapper}>
              <ScrollView 
                style={styles.tableContainer}
                showsVerticalScrollIndicator={false}
              >
              {/* Table Header */}
              <Animated.View style={[
                styles.tableHeader,
                {
                  opacity: tableHeaderAnim,
                  transform: [{
                    translateY: tableHeaderAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  }],
                },
              ]}>
                <Text style={[styles.headerCell, styles.nameHeader]}>Name</Text>
                <Text style={[styles.headerCell, styles.emailHeader]}>Email</Text>
                <Text style={[styles.headerCell, styles.accessHeader]}>Access</Text>
                <Text style={[styles.headerCell, styles.lastActiveHeader]}>Last Active</Text>
                <Text style={[styles.headerCell, styles.dateAddedHeader]}>Date Added</Text>
                <View style={[styles.headerCell, styles.actionsHeader]} />
              </Animated.View>

              {/* Table Rows */}
              {displayedUsers.map((user) => {
                const animValue = getAnimatedValue(user.uid);
                const hoverScale = getHoverScale(user.uid);
                
                return (
                  <Animated.View
                    key={user.uid}
                    style={[
                      styles.tableRow,
                      {
                        opacity: animValue,
                        transform: [
                          {
                            translateY: animValue.interpolate({
                              inputRange: [0, 1],
                              outputRange: [20, 0],
                            }),
                          },
                          { scale: hoverScale },
                        ],
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      activeOpacity={1}
                      onPressIn={() => handleRowHover(user.uid, true)}
                      onPressOut={() => handleRowHover(user.uid, false)}
                    >
                  <View style={[styles.tableCell, styles.nameCell]}>
                    <Text style={styles.nameText} numberOfLines={1}>
                      {user.firstName} {user.lastName}
                    </Text>
                  </View>
                  
                  <View style={[styles.tableCell, styles.emailCell]}>
                    <Text style={styles.emailText} numberOfLines={1}>
                      {user.email}
                    </Text>
                  </View>
                  
                  <View style={[styles.tableCell, styles.accessCell]}>
                    <View 
                      style={[
                        styles.roleBadge, 
                        { backgroundColor: getRoleColor(user.role) }
                      ]}
                    >
                      <Text style={styles.roleText}>
                        {getRoleDisplay(user.role)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[styles.tableCell, styles.lastActiveCell]}>
                    <Text style={[styles.dateText, styles.lastActiveText]} numberOfLines={1}>
                      {formatDate(user.lastActive)}
                    </Text>
                  </View>
                  
                  <View style={[styles.tableCell, styles.dateAddedCell]}>
                    <Text style={styles.dateText} numberOfLines={1}>
                      {formatDateAdded(user.createdAt)}
                    </Text>
                  </View>
                  
                  <View style={[styles.tableCell, styles.actionsCell]}>
                    <TouchableOpacity
                      style={styles.actionMenuButton}
                      onPress={() => toggleUserMenu(user.uid)}
                      disabled={blockingUserId === user.uid}
                    >
                      {blockingUserId === user.uid ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                    
                    {/* Dropdown Menu */}
                    {openMenuUserId === user.uid && (
                      <View style={styles.dropdownMenu}>
                        {user.blocked ? (
                          <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => handleUnblockUser(user.uid)}
                          >
                            <Ionicons name="checkmark-circle" size={18} color="#38a6de" />
                            <Text style={styles.dropdownItemText}>Unblock user</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => handleBlockUser(user.uid)}
                          >
                            <Ionicons name="ban" size={18} color="#ff4444" />
                            <Text style={[styles.dropdownItemText, styles.blockText]}>Block user</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
              })}
              
              {/* Load More Button */}
              {hasMoreUsers && (
                <View style={styles.loadMoreContainer}>
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={() => setDisplayedCount(prev => prev + 10)}
                  >
                    <Text style={styles.loadMoreText}>Load More</Text>
                    <Ionicons name="chevron-down" size={20} color="#38a6de" />
                  </TouchableOpacity>
                </View>
              )}
              </ScrollView>
              {/* Overlay to close dropdown when clicking outside */}
              {openMenuUserId && (
                <TouchableOpacity
                  style={styles.overlay}
                  activeOpacity={1}
                  onPress={() => setOpenMenuUserId(null)}
                />
              )}
            </View>
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
  subTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: 'system-ui',
    marginTop: 4,
    opacity: 0.9,
  },
  mainContent: {
    flex: 1,
    paddingLeft: 100,
    paddingRight: 20,
    paddingTop: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#011f36',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(107, 134, 147, 0.3)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'system-ui',
  },
  clearButton: {
    padding: 4,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    opacity: 0.7,
  },
  tableWrapper: {
    flex: 1,
    position: 'relative',
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#011f36',
    borderRadius: 12,
    padding: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 134, 147, 0.3)',
    marginBottom: 8,
  },
  headerCell: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'system-ui',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.8,
    textAlign: 'left',
  },
  nameHeader: {
    flex: 2,
  },
  emailHeader: {
    flex: 2.5,
  },
  accessHeader: {
    flex: 1.2,
  },
  lastActiveHeader: {
    flex: 1.3,
  },
  dateAddedHeader: {
    flex: 1.3,
  },
  actionsHeader: {
    flex: 0.5,
    minWidth: 50,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 134, 147, 0.1)',
    alignItems: 'center',
  },
  tableCell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  nameCell: {
    flex: 2,
    minWidth: 120,
  },
  emailCell: {
    flex: 2.5,
    minWidth: 150,
  },
  accessCell: {
    flex: 1.2,
    minWidth: 90,
  },
  lastActiveCell: {
    flex: 1.3,
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  dateAddedCell: {
    flex: 1.3,
    minWidth: 100,
    justifyContent: 'center',
  },
  actionsCell: {
    flex: 0.5,
    minWidth: 50,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMenuButton: {
    padding: 8,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#011f36',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6b8693',
    minWidth: 160,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  dropdownItemText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'system-ui',
  },
  blockText: {
    color: '#ff4444',
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'system-ui',
  },
  emailText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'system-ui',
    opacity: 0.8,
  },
  roleBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'system-ui',
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'system-ui',
    opacity: 0.8,
    textAlign: 'left',
  },
  lastActiveText: {
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginLeft: 2,
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 166, 222, 0.1)',
    borderWidth: 1,
    borderColor: '#38a6de',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  loadMoreText: {
    color: '#38a6de',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'system-ui',
  },
});
