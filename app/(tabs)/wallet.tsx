// app/(tabs)/wallet.tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from '../../components/Toast';
import WalletCard from '../../components/WalletCard';
import { CREDITS_PER_USE, formatCredits, FREE_USAGE_LIMITS, getDifficultyColor, getDifficultyLabel } from '../../constants/credits';
import { useToast } from '../../hooks/useToast';
import { WalletController } from '../_controllers/WalletController';
import { Wallet, WalletTransaction } from '../_models/Wallet';

export default function WalletPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string; credits?: string }>();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();
  const toastShownRef = useRef(false);

  // Handle payment status from deep link
  useEffect(() => {
    if (!params.status || toastShownRef.current) return;
    toastShownRef.current = true;

    switch (params.status) {
      case 'success': {
        const creditsAdded = params.credits ? Number(params.credits) : 0;
        showToast(
          creditsAdded > 0
            ? `✅ Payment successful! ${creditsAdded} credits added to your wallet.`
            : '✅ Payment successful! Credits added to your wallet.'
        );
        // Refresh wallet data to show updated balance
        loadData();
        break;
      }
      case 'cancelled':
        showToast('⚠️ Payment was cancelled. No credits were charged.');
        break;
      case 'error':
        showToast('❌ Payment failed. Please try again or contact support.');
        break;
      case 'already_processed':
        showToast('ℹ️ This payment was already processed. Check your balance.');
        loadData();
        break;
      case 'config_error':
        showToast('❌ Server configuration error. Please contact support.');
        break;
    }
  }, [params.status]);

  const loadData = useCallback(async () => {
    try {
      const [w, tx] = await Promise.all([
        WalletController.getWallet(),
        WalletController.getTransactions(5),
      ]);
      setWallet(w);
      setRecentTransactions(tx);
    } catch (e) {
      console.error('Error loading wallet:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#07bbc0" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#07bbc0" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#07bbc0" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Wallet</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Wallet Card */}
        <WalletCard balance={wallet?.balance ?? 0} />

        {/* Credit Rates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credit Rates</Text>
          <View style={styles.card}>
            {(['basic', 'intermediate', 'advanced'] as const).map((level, idx) => (
              <React.Fragment key={level}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.rateRow}>
                  <View style={[styles.levelDot, { backgroundColor: getDifficultyColor(level) }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rateLevel}>{getDifficultyLabel(level)}</Text>
                    <Text style={styles.rateFree}>
                      {FREE_USAGE_LIMITS[level]} free uses
                    </Text>
                  </View>
                  <Text style={styles.rateCost}>
                    {CREDITS_PER_USE[level]} credits/use
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {recentTransactions.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/transaction-history' as any)}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.card}>
            {recentTransactions.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="receipt-outline" size={24} color="#6b8693" />
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
            ) : (
              recentTransactions.map((tx, idx) => (
                <React.Fragment key={tx.transactionId}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.txRow}>
                    <View style={[
                      styles.txIcon,
                      { backgroundColor: tx.type === 'top_up' ? 'rgba(76, 175, 80, 0.12)' : 'rgba(255, 152, 0, 0.12)' }
                    ]}>
                      <Ionicons
                        name={tx.type === 'top_up' ? 'add-circle' : 'flash'}
                        size={20}
                        color={tx.type === 'top_up' ? '#4CAF50' : '#FF9800'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                      <Text style={styles.txDate}>
                        {new Date(tx.createdAt).toLocaleDateString('en-PH', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <Text style={[styles.txAmount, { color: tx.amount > 0 ? '#4CAF50' : '#FF9800' }]}>
                      {tx.amount > 0 ? '+' : ''}{formatCredits(tx.amount)}
                    </Text>
                  </View>
                </React.Fragment>
              ))
            )}
          </View>
        </View>
      </ScrollView>
      <Toast message={toastMessage} visible={toastVisible} onHide={hideToast} duration={4000} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#041527' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: 10,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(7, 187, 192, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#07bbc0',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12, marginLeft: 4,
  },
  seeAllText: { color: '#07bbc0', fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: 'rgba(7, 187, 192, 0.05)',
    borderRadius: 16, padding: 4,
    borderWidth: 1, borderColor: 'rgba(7, 187, 192, 0.1)',
  },
  divider: { height: 1, backgroundColor: 'rgba(107, 134, 147, 0.15)', marginHorizontal: 16 },
  // Rate rows
  rateRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
  },
  levelDot: { width: 10, height: 10, borderRadius: 5 },
  rateLevel: { fontSize: 15, color: '#fff', fontWeight: '600' },
  rateFree: { fontSize: 12, color: '#6b8693', marginTop: 2 },
  rateCost: { fontSize: 14, color: '#07bbc0', fontWeight: '700' },
  // Transaction rows
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 14, color: '#fff', fontWeight: '600' },
  txDate: { fontSize: 12, color: '#6b8693', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  // Empty
  emptyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyText: { color: '#6b8693', fontSize: 14 },
});
