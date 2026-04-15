import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface SearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}

export default function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search',
}: SearchInputProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="search" size={18} color="#9ec7dd" />
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
        placeholder={placeholder}
        placeholderTextColor="#6b8693"
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearButton}>
          <Ionicons name="close-circle" size={18} color="#9ec7dd" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f3048',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(103, 188, 233, 0.38)',
    paddingHorizontal: 12,
    minHeight: 54,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(56, 166, 222, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: '#e7f1f6',
    fontSize: 15,
    paddingVertical: 13,
  },
  clearButton: {
    marginLeft: 6,
    padding: 4,
  },
});
