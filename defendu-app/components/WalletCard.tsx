// components/WalletCard.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatCredits } from '../constants/credits';

interface WalletCardProps {
  balance: number;
  compact?: boolean;
}

export default function WalletCard({ balance, compact }: WalletCardProps) {
  const router = useRouter();

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={() => router.push('/(tabs)/wallet' as any)}
        activeOpacity={0.7}
      >
        <Ionicons name="wallet-outline" size={18} color="#07bbc0" />
        <Text style={styles.compactBalance}>{formatCredits(balance)}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.cardContainer}>
      {/* Card background with gradient feel */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardBrand}>
            <Ionicons name="shield-checkmark" size={24} color="#fff" />
            <Text style={styles.brandText}>DEFENDU</Text>
          </View>
          <Text style={styles.cardType}>PREPAID</Text>
        </View>

        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Available Credits</Text>
          <Text style={styles.balanceAmount}>{balance.toLocaleString()}</Text>
          <Text style={styles.balanceSub}>credits</Text>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.topUpButton}
            onPress={() => router.push('/(tabs)/top-up' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={18} color="#041527" />
            <Text style={styles.topUpText}>Top Up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => router.push('/(tabs)/transaction-history' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="receipt-outline" size={18} color="#07bbc0" />
            <Text style={styles.historyText}>History</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // -- Compact inline badge --
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 187, 192, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(7, 187, 192, 0.2)',
  },
  compactBalance: {
    color: '#07bbc0',
    fontSize: 13,
    fontWeight: '700',
  },

  // -- Full card --
  cardContainer: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#0a2a3f',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(7, 187, 192, 0.3)',
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  cardType: {
    color: 'rgba(7, 187, 192, 0.6)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    color: '#6b8693',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '700',
  },
  balanceSub: {
    color: '#07bbc0',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  topUpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07bbc0',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  topUpText: {
    color: '#041527',
    fontSize: 14,
    fontWeight: '700',
  },
  historyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7, 187, 192, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(7, 187, 192, 0.2)',
  },
  historyText: {
    color: '#07bbc0',
    fontSize: 14,
    fontWeight: '700',
  },
});
