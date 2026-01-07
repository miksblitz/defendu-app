import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const animation = useRef(new Animated.Value(1)).current; // initial opacity and scale to 1

  const handleGetStarted = () => {
    // Animate scale & fade out
    Animated.timing(animation, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      // navigate after animation completes
      router.push('/(auth)/login');
    });
  };

  return (
    <Animated.View
      style={[styles.container, {
        opacity: animation,
        transform: [{ scale: animation }],
      }]}
    >
      {/* Placeholder for logo image */}
      <View style={styles.logoPlaceholder}>
        <Text style={styles.logoPlaceholderText}>LOGO</Text>
      </View>

      {/* App name */}
      <Text style={styles.appName}>DEFENDU</Text>

      {/* Get Started button */}
      <TouchableOpacity 
        style={styles.button} 
        activeOpacity={0.8} 
        onPress={handleGetStarted}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#04294F', // Dark blue background
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#008A9E', // Teal circle
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoPlaceholderText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 24,
  },
  appName: {
    color: '#00AABB',
    fontWeight: '700',
    fontSize: 28,
    letterSpacing: 6,
    marginBottom: 48,
  },
  button: {
    backgroundColor: '#008A9E', // Teal button background
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 32,
    alignItems: 'center',
    minWidth: '60%',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
});