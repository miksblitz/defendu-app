import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type StatusTone =
  | 'active'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'disabled'
  | 'draft'
  | 'info';

const toneMap: Record<StatusTone, { bg: string; text: string; border: string }> = {
  active: { bg: 'rgba(46, 204, 113, 0.15)', text: '#43d17f', border: 'rgba(67, 209, 127, 0.4)' },
  pending: { bg: 'rgba(243, 156, 18, 0.15)', text: '#ffbe55', border: 'rgba(255, 190, 85, 0.4)' },
  approved: { bg: 'rgba(56, 166, 222, 0.14)', text: '#4bb9f0', border: 'rgba(75, 185, 240, 0.45)' },
  rejected: { bg: 'rgba(231, 76, 60, 0.14)', text: '#ff6c61', border: 'rgba(255, 108, 97, 0.45)' },
  disabled: { bg: 'rgba(127, 140, 141, 0.15)', text: '#bcc5c7', border: 'rgba(188, 197, 199, 0.4)' },
  draft: { bg: 'rgba(108, 122, 137, 0.18)', text: '#c2ccd1', border: 'rgba(194, 204, 209, 0.4)' },
  info: { bg: 'rgba(56, 166, 222, 0.14)', text: '#4bb9f0', border: 'rgba(75, 185, 240, 0.45)' },
};

interface StatusBadgeProps {
  status: string;
  tone?: StatusTone;
}

const normalizeTone = (status: string): StatusTone => {
  const value = status.toLowerCase();
  if (value.includes('active')) return 'active';
  if (value.includes('pending') || value.includes('awaiting')) return 'pending';
  if (value.includes('approve')) return 'approved';
  if (value.includes('reject')) return 'rejected';
  if (value.includes('disable') || value.includes('block')) return 'disabled';
  if (value.includes('draft')) return 'draft';
  return 'info';
};

export default function StatusBadge({ status, tone }: StatusBadgeProps) {
  const resolvedTone = tone ?? normalizeTone(status);
  const colors = toneMap[resolvedTone];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.text, { color: colors.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
