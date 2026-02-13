// app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: Platform.select({
          ios: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#E5E5EA',
            height: 88,
            paddingBottom: 28,
            paddingTop: 8,
          },
          android: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#E5E5EA',
            height: 64,
            paddingBottom: 8,
            paddingTop: 8,
          },
          default: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#E5E5EA',
          },
        }),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      {/* Dashboard Tab */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Trainer Tab */}
      <Tabs.Screen
        name="trainer"
        options={{
          title: 'Trainers',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell" size={size} color={color} />
          ),
        }}
      />

      {/* Messages Tab */}
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />

      {/* Hide other screens from tabs */}
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide from tabs
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Hide from tabs
        }}
      />
      <Tabs.Screen
        name="editprofile"
        options={{
          href: null, // Hide from tabs
        }}
      />
      <Tabs.Screen
        name="edit-trainer-profile"
        options={{
          href: null, // Hide from tabs
        }}
      />
      <Tabs.Screen
        name="trainer-registration"
        options={{
          href: null, // Hide from tabs
        }}
      />
      <Tabs.Screen
        name="publish-module"
        options={{
          href: null, // Hide from tabs
        }}
      />
      <Tabs.Screen
        name="view-module"
        options={{
          href: null, // Hide from tabs
        }}
      />
      <Tabs.Screen
        name="fitnessCapabilitiesQuestion"
        options={{
          href: null, // Hide from tabs
        }}
      />
      <Tabs.Screen
        name="pastexperienceQuestion"
        options={{
          href: null, // Hide from tabs
        }}
      />
      <Tabs.Screen
        name="physicalAttributesQuestion"
        options={{
          href: null, // Hide from tabs
        }}
      />
      <Tabs.Screen
        name="preferencesQuestions"
        options={{
          href: null, // Hide from tabs
        }}
      />
    </Tabs>
  );
}
