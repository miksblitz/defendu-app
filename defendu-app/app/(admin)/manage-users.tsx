import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import AdminTable, {
    AdminTableColumn,
    AdminTableSortState,
} from '../../components/admin/AdminTable';
import SearchInput from '../../components/admin/SearchInput';
import StatusBadge from '../../components/admin/StatusBadge';
import { useLogout } from '../../hooks/useLogout';
import { User } from '../_models/User';
import { AuthController } from '../controllers/AuthController';

const PAGE_SIZE = 12;

export default function ManageUsersPage() {
  const { width } = useWindowDimensions();
  const isCompact = width < 1100;
  const router = useRouter();
  const handleLogout = useLogout();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortState, setSortState] = useState<AdminTableSortState>({
    columnKey: 'date-joined',
    direction: 'desc',
  });
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [userToToggleBlock, setUserToToggleBlock] = useState<User | null>(null);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const controlsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUsers();
  }, []);

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
  }, [searchQuery]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await AuthController.getAllUsers();
      setUsers(allUsers);
    } catch (error: any) {
      console.error('Error loading users:', error);
      alert(`Failed to load users: ${error.message || 'Unknown error'}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase().trim();
    return users.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      return fullName.includes(query) || user.email.toLowerCase().includes(query);
    });
  }, [users, searchQuery]);

  const sortedUsers = useMemo(() => {
    const result = [...filteredUsers];
    const multiplier = sortState.direction === 'asc' ? 1 : -1;

    result.sort((a, b) => {
      if (sortState.columnKey === 'role') {
        return a.role.localeCompare(b.role) * multiplier;
      }
      if (sortState.columnKey === 'status') {
        const left = a.blocked ? 'disabled' : 'active';
        const right = b.blocked ? 'disabled' : 'active';
        return left.localeCompare(right) * multiplier;
      }
      const leftDate = a.createdAt?.getTime?.() ?? 0;
      const rightDate = b.createdAt?.getTime?.() ?? 0;
      return (leftDate - rightDate) * multiplier;
    });

    return result;
  }, [filteredUsers, sortState]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedUsers.slice(start, start + PAGE_SIZE);
  }, [sortedUsers, currentPage]);

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
        direction: columnKey === 'date-joined' ? 'desc' : 'asc',
      };
    });
    setCurrentPage(1);
  };

  const formatLastActive = (date: Date | undefined): string => {
    if (!date) return 'Never';
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateAdded = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getRoleDisplay = (role: string): string => {
    if (role === 'individual') return 'Individual';
    if (role === 'trainer') return 'Trainer';
    if (role === 'admin') return 'Admin';
    return role;
  };

  const requestToggleBlock = (user: User) => {
    setUserToToggleBlock(user);
  };

  const handleToggleBlock = async () => {
    if (!userToToggleBlock) return;

    try {
      const userId = userToToggleBlock.uid;
      setBlockingUserId(userId);

      if (userToToggleBlock.blocked) {
        await AuthController.unblockUser(userId);
      } else {
        await AuthController.blockUser(userId);
      }

      await loadUsers();
      setUserToToggleBlock(null);
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status. Please try again.');
    } finally {
      setBlockingUserId(null);
    }
  };

  const columns: AdminTableColumn<User>[] = [
    {
      key: 'user',
      title: 'User',
      flex: 2.5,
      minWidth: 240,
      render: (user) => (
        <View>
          <Text style={styles.nameText}>{user.firstName} {user.lastName}</Text>
          <Text style={styles.emailText}>{user.email}</Text>
        </View>
      ),
    },
    {
      key: 'role',
      title: 'Access / Role',
      flex: 1.1,
      minWidth: 130,
      sortable: true,
      render: (user) => <StatusBadge status={getRoleDisplay(user.role)} tone="info" />,
    },
    {
      key: 'last-active',
      title: 'Last Active',
      flex: 1,
      minWidth: 130,
      render: (user) => <Text style={styles.subtleText}>{formatLastActive(user.lastActive)}</Text>,
    },
    {
      key: 'date-joined',
      title: 'Date Joined',
      flex: 1,
      minWidth: 125,
      sortable: true,
      render: (user) => <Text style={styles.subtleText}>{formatDateAdded(user.createdAt)}</Text>,
    },
    {
      key: 'status',
      title: 'Status',
      flex: 1,
      minWidth: 120,
      sortable: true,
      render: (user) => <StatusBadge status={user.blocked ? 'Disabled' : 'Active'} tone={user.blocked ? 'disabled' : 'active'} />,
    },
    {
      key: 'actions',
      title: 'Actions',
      minWidth: 140,
      align: 'right',
      render: (user) => (
        <TouchableOpacity
          style={[styles.actionButton, isCompact && styles.actionButtonCompact, user.blocked ? styles.enableButton : styles.disableButton]}
          onPress={() => requestToggleBlock(user)}
          disabled={blockingUserId === user.uid}
        >
          {blockingUserId === user.uid ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.actionText}>{user.blocked ? 'Enable' : 'Disable'}</Text>
          )}
        </TouchableOpacity>
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
                disabled
              >
                <Image
                  source={require('../../assets/images/adminmanageicon.png')}
                  style={styles.navIconImage}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/(admin)/adminDashboard')}>
                <Image source={require('../../assets/images/homeicon.png')} style={styles.navIconImage} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
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
              Manage Users {searchQuery ? `${filteredUsers.length} of ${users.length}` : users.length}
            </Text>
          </View>
        </Animated.View>

        <ScrollView style={[styles.mainContent, isCompact && styles.mainContentCompact]} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.controlsRow,
              {
                opacity: controlsAnim,
                transform: [
                  {
                    translateY: controlsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or email"
            />
          </Animated.View>

          <AdminTable
            columns={columns}
            data={paginatedUsers}
            loading={loading}
            compact={isCompact}
            keyExtractor={(user) => user.uid}
            sortState={sortState}
            onSortChange={handleSortChange}
            emptyTitle={searchQuery ? 'No users match your search' : 'No users available'}
            emptyDescription="Try clearing filters or check if users are properly loaded from the database."
            pagination={{
              currentPage,
              totalPages,
              onPrevious: () => setCurrentPage((p) => Math.max(1, p - 1)),
              onNext: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
            }}
          />
        </ScrollView>
      </View>

      <Modal
        visible={!!userToToggleBlock}
        transparent
        animationType="fade"
        onRequestClose={() => setUserToToggleBlock(null)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>{userToToggleBlock?.blocked ? 'Enable User' : 'Disable User'}</Text>
            <Text style={styles.confirmText}>
              {userToToggleBlock?.blocked
                ? 'This user will regain access to the platform.'
                : 'This user will no longer be able to access the platform until re-enabled.'}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setUserToToggleBlock(null)}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleToggleBlock}>
                <Text style={styles.modalPrimaryText}>{userToToggleBlock?.blocked ? 'Enable' : 'Disable'}</Text>
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
    marginTop: 4,
    opacity: 0.9,
  },
  mainContent: {
    flex: 1,
    paddingLeft: 100,
    paddingRight: 20,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 12,
  },
  mainContentCompact: {
    paddingLeft: 86,
    paddingRight: 12,
    gap: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nameText: {
    color: '#f0f8fc',
    fontSize: 14,
    fontWeight: '600',
  },
  emailText: {
    color: '#9db3be',
    fontSize: 12,
    marginTop: 2,
  },
  valueText: {
    color: '#d9edf8',
    fontSize: 13,
    fontWeight: '700',
  },
  subtleText: {
    color: '#aac0ca',
    fontSize: 13,
  },
  actionButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  actionButtonCompact: {
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  disableButton: {
    borderColor: 'rgba(255, 108, 97, 0.5)',
    backgroundColor: 'rgba(255, 108, 97, 0.15)',
  },
  enableButton: {
    borderColor: 'rgba(67, 209, 127, 0.5)',
    backgroundColor: 'rgba(67, 209, 127, 0.15)',
  },
  actionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 10, 18, 0.68)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#0f263a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(107, 134, 147, 0.4)',
    padding: 20,
  },
  confirmTitle: {
    color: '#f0f8fc',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 8,
  },
  confirmText: {
    color: '#9db3be',
    fontSize: 14,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  modalSecondaryButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#728b97',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalSecondaryText: {
    color: '#bed0d8',
    fontSize: 13,
    fontWeight: '600',
  },
  modalPrimaryButton: {
    borderRadius: 8,
    backgroundColor: '#38a6de',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalPrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
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
