// app/(tabs)/transaction-history.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import { formatPHP } from '../../constants/credits';
import { WalletTransaction } from '../_models/Wallet';
import { WalletController } from '../_controllers/WalletController';

export default function TransactionHistoryPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const tx = await WalletController.getTransactions();
      setTransactions(tx);
    } catch (e) {
      console.error('Error loading transactions:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
          <Text style={styles.headerTitle}>Transaction History</Text>
          <View style={{ width: 40 }} />
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#6b8693" />
            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
            <Text style={styles.emptySubtitle}>
              Your credit purchases and module usage will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            {transactions.map((tx, idx) => (
              <React.Fragment key={tx.transactionId}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.txRow}>
                  <View style={[
                    styles.txIcon,
                    {
                      backgroundColor: tx.type === 'top_up'
                        ? 'rgba(76, 175, 80, 0.12)'
                        : 'rgba(255, 152, 0, 0.12)',
                    },
                  ]}>
                    <Ionicons
                      name={tx.type === 'top_up' ? 'add-circle' : 'flash'}
                      size={22}
                      color={tx.type === 'top_up' ? '#4CAF50' : '#FF9800'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txDesc}>{tx.description}</Text>
                    <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
                    {tx.type === 'top_up' && tx.phpAmount ? (
                      <Text style={styles.txMeta}>
                        {tx.paymentMethod?.toUpperCase()} • {formatPHP(tx.phpAmount)}
                      </Text>
                    ) : tx.difficultyLevel ? (
                      <Text style={styles.txMeta}>
                        {tx.difficultyLevel.charAt(0).toUpperCase() + tx.difficultyLevel.slice(1)} module
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.txAmountContainer}>
                    <Text style={[
                      styles.txAmount,
                      { color: tx.amount > 0 ? '#4CAF50' : '#FF9800' },
                    ]}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                    </Text>
                    <Text style={styles.txCreditsLabel}>credits</Text>
                    <Text style={styles.txBalanceAfter}>
                      Bal: {tx.balanceAfter.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#041527' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 24, paddingTop: 10,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(7, 187, 192, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  // Empty
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#6b8693', textAlign: 'center', marginTop: 8 },
  // Card
  card: {
    backgroundColor: 'rgba(7, 187, 192, 0.05)',
    borderRadius: 16, padding: 4,
    borderWidth: 1, borderColor: 'rgba(7, 187, 192, 0.1)',
  },
  divider: { height: 1, backgroundColor: 'rgba(107, 134, 147, 0.15)', marginHorizontal: 16 },
  // Rows
  txRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
  },
  txIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  txDesc: { fontSize: 15, color: '#fff', fontWeight: '600' },
  txDate: { fontSize: 12, color: '#6b8693', marginTop: 2 },
  txMeta: { fontSize: 11, color: '#6b8693', marginTop: 2, fontStyle: 'italic' },
  txAmountContainer: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '800' },
  txCreditsLabel: { fontSize: 10, color: '#6b8693' },
  txBalanceAfter: { fontSize: 11, color: '#6b8693', marginTop: 2 },
});
