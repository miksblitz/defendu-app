import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface DefaultModuleBackgroundProps {
  category?: string;
}

export const DefaultModuleBackground: React.FC<DefaultModuleBackgroundProps> = ({ category }) => {
  // Different colors based on category
  const getBackgroundColor = () => {
    const categoryLower = category?.toLowerCase() || '';
    
    if (categoryLower.includes('punch') || categoryLower.includes('striking')) {
      return '#283593';
    } else if (categoryLower.includes('kick')) {
      return '#c62828';
    } else if (categoryLower.includes('defense') || categoryLower.includes('block')) {
      return '#2e7d32';
    } else if (categoryLower.includes('grappl') || categoryLower.includes('throw')) {
      return '#6a1b9a';
    } else {
      return '#0277bd';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <View style={styles.overlay} />
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>🥋</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 60,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  icon: {
    fontSize: 50,
  },
});
