import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, FontAwesome } from '@expo/vector-icons';

export default function SelfDefensePreferencesScreen() {
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const preferredTechniques = [
    { key: 'Punching', icon: <Ionicons name="flash" size={16} color="#09AEC3" /> },
    { key: 'Kicking', icon: <MaterialCommunityIcons name="human-handsup" size={16} color="#09AEC3" /> },
    { key: 'Palm Strikes', icon: <FontAwesome name="hand-paper-o" size={16} color="#09AEC3" /> },
    { key: 'Elbow Strikes', icon: <FontAwesome5 name="hands-helping" size={16} color="#09AEC3" /> },
    { key: 'Defensive Moves', icon: <FontAwesome5 name="shield-alt" size={16} color="#09AEC3" /> },
  ];

  const trainingGoals = [
    { key: 'Personal Safety', icon: <FontAwesome name="shield" size={16} color="#09AEC3" /> },
    { key: 'Fitness', icon: <FontAwesome5 name="dumbbell" size={16} color="#09AEC3" /> },
    { key: 'Confidence Building', icon: <FontAwesome5 name="trophy" size={16} color="#09AEC3" /> },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    {/* Header */}
<View style={styles.header}>
  <Text style={styles.headerTitle}>Setup Profile</Text>
  <Text style={styles.progress}>2 of 4</Text>
</View>
<View style={styles.progressBarBackground}>
  <View style={styles.progressBarFill} />
</View>

      {/* Back Arrow */}
      <TouchableOpacity style={styles.backRow} activeOpacity={0.7} onPress={() => {/* TODO: Add back navigation */}}>
        <Ionicons name="arrow-back" size={20} color="#09AEC3" />
        <Text style={styles.backText}>Self-Defense Preferences</Text>
      </TouchableOpacity>

      {/* Subtitle */}
      <Text style={styles.subtitle}>Choose your preferred training focus</Text>

      {/* Preferred Techniques */}
      <Text style={styles.sectionTitle}>Preferred Techniques</Text>
      <View style={styles.optionsColumn}>
        {preferredTechniques.map(({ key, icon }) => {
          const selected = selectedTechnique === key;
          return (
            <TouchableOpacity
              key={key}
              style={styles.optionRow}
              onPress={() => setSelectedTechnique(key)}
              activeOpacity={0.7}
            >
              <View style={[styles.radioOuterCircle, selected && styles.radioCircleSelected]}>
                {selected && <View style={styles.radioInnerCircle} />}
              </View>
              <View style={styles.iconContainer}>{icon}</View>
              <Text style={styles.optionText}>{key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Training Goals */}
      <Text style={styles.sectionTitle}>Training Goals</Text>
      <View style={styles.optionsColumn}>
        {trainingGoals.map(({ key, icon }) => {
          const selected = selectedGoal === key;
          return (
            <TouchableOpacity
              key={key}
              style={styles.optionRow}
              onPress={() => setSelectedGoal(key)}
              activeOpacity={0.7}
            >
              <View style={[styles.radioOuterCircle, selected && styles.radioCircleSelected]}>
                {selected && <View style={styles.radioInnerCircle} />}
              </View>
              <View style={styles.iconContainer}>{icon}</View>
              <Text style={styles.optionText}>{key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Next Button */}
      <TouchableOpacity style={styles.nextButton} activeOpacity={0.7} onPress={() => {/* TODO: Add next navigation */}}>
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#041527',
    paddingHorizontal: 24,
    paddingVertical: 30,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  progress: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.6,
    alignSelf: 'center',
  },
  divider: {
    height: 2,
    backgroundColor: '#078693',
    width: '100%',
    marginBottom: 20,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 12,
    textAlign: 'center',
  },
  optionsColumn: {
    flexDirection: 'column',
    marginBottom: 30,
    width: '100%',
    maxWidth: 320,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  radioOuterCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#09AEC3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#09AEC3',
  },
  radioInnerCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#09AEC3',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
  },
  optionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    textAlignVertical: 'center',
  },
  nextButton: {
    marginTop: 40,
    backgroundColor: '#09AEC3',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
    width: 170,
    alignSelf: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  progressBarBackground: {
  width: '100%',
  height: 4,
  backgroundColor: '#073741',
  borderRadius: 4,
  marginBottom: 32,
},
progressBarFill: {
  height: 4,
  backgroundColor: '#09AEC3',
  width: '50%', // 2 of 4 steps = 50%
  borderRadius: 4,
},
});