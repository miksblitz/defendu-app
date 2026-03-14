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
      <Ionicons name="search" size={18} color="#7e99a6" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
        placeholder={placeholder}
        placeholderTextColor="#6b8693"
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearButton}>
          <Ionicons name="close-circle" size={18} color="#7e99a6" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#102d44',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(126, 153, 166, 0.38)',
    paddingHorizontal: 14,
    minHeight: 46,
    flex: 1,
  },
  input: {
    flex: 1,
    marginLeft: 9,
    color: '#e7f1f6',
    fontSize: 15,
    paddingVertical: 10,
  },
  clearButton: {
    padding: 4,
  },
});
