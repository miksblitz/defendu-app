// components/InsufficientCreditsModal.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatCredits, getDifficultyColor, getDifficultyLabel } from '../constants/credits';

interface InsufficientCreditsModalProps {
  visible: boolean;
  onClose: () => void;
  balance: number;
  creditCost: number;
  difficultyLevel: string;
  moduleTitle: string;
}

export default function InsufficientCreditsModal({
  visible,
  onClose,
  balance,
  creditCost,
  difficultyLevel,
  moduleTitle,
}: InsufficientCreditsModalProps) {
  const router = useRouter();
  const shortfall = creditCost - balance;
  const diffColor = getDifficultyColor(difficultyLevel);

  const handleTopUp = () => {
    onClose();
    router.push('/(tabs)/top-up' as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="wallet-outline" size={40} color="#ff6b6b" />
          </View>

          <Text style={styles.title}>Insufficient Credits</Text>
          <Text style={styles.subtitle}>
            You need more credits to access this module
          </Text>

          {/* Module info */}
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleName} numberOfLines={2}>{moduleTitle}</Text>
            <View style={[styles.difficultyBadge, { backgroundColor: diffColor + '20' }]}>
              <Text style={[styles.difficultyText, { color: diffColor }]}>
                {getDifficultyLabel(difficultyLevel)}
              </Text>
            </View>
          </View>

          {/* Cost breakdown */}
          <View style={styles.costCard}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Module cost</Text>
              <Text style={styles.costValue}>{formatCredits(creditCost)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Your balance</Text>
              <Text style={[styles.costValue, { color: '#ff6b6b' }]}>
                {formatCredits(balance)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.costRow}>
              <Text style={[styles.costLabel, { fontWeight: '700' }]}>You need</Text>
              <Text style={[styles.costValue, { color: '#FF9800', fontWeight: '700' }]}>
                {formatCredits(shortfall)} more
              </Text>
            </View>
          </View>

          {/* Actions */}
          <TouchableOpacity style={styles.topUpButton} onPress={handleTopUp} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={20} color="#041527" />
            <Text style={styles.topUpButtonText}>Top Up Credits</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#0a2a3f',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(7, 187, 192, 0.2)',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b8693',
    textAlign: 'center',
    marginBottom: 20,
  },
  moduleInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  costCard: {
    backgroundColor: 'rgba(7, 187, 192, 0.05)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(7, 187, 192, 0.1)',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  costLabel: {
    fontSize: 14,
    color: '#6b8693',
    fontWeight: '500',
  },
  costValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(107, 134, 147, 0.15)',
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07bbc0',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    gap: 8,
    marginBottom: 12,
  },
  topUpButtonText: {
    color: '#041527',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 10,
  },
  cancelText: {
    color: '#6b8693',
    fontSize: 14,
    fontWeight: '600',
  },
});
