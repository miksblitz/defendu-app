import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  label?: string;
  options: FilterOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export default function FilterBar({ label, options, selectedValue, onSelect }: FilterBarProps) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {options.map((option) => {
          const selected = option.value === selectedValue;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onSelect(option.value)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 7,
  },
  label: {
    color: '#9db3be',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  content: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(126, 153, 166, 0.5)',
    backgroundColor: 'transparent',
  },
  chipSelected: {
    borderColor: '#38a6de',
    backgroundColor: 'rgba(56, 166, 222, 0.22)',
  },
  chipText: {
    color: '#b2c6cf',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  chipTextSelected: {
    color: '#e8f4fa',
  },
});
