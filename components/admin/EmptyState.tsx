import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface EmptyStateProps {
  title: string;
  description?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
}

export default function EmptyState({ title, description, iconName = 'folder-open-outline' }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconName} size={26} color="#6b8693" />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 20,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(107, 134, 147, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#eaf2f6',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    color: '#91a7b3',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 460,
    lineHeight: 20,
  },
});
