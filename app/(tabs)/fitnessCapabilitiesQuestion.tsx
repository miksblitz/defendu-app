import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
  FontAwesome,
} from '@expo/vector-icons';

export default function FitnessCapabilitiesScreen() {
  const [selectedCurrentLevel, setSelectedCurrentLevel] = useState<string | null>(null);
  const [selectedTrainingFrequency, setSelectedTrainingFrequency] = useState<string | null>(null);
  const [injuries, setInjuries] = useState('');

  const currentFitnessLevels = [
    { key: 'Low', subtitle: 'Sedentary Lifestyle', icon: <Ionicons name="walk" size={16} color="#09AEC3" /> },
    { key: 'Moderate', subtitle: 'Some regular activity', icon: <Ionicons name="walk" size={16} color="#09AEC3" /> },
    { key: 'High', subtitle: 'Very Active', icon: <FontAwesome5 name="running" size={16} color="#09AEC3" /> },
    { key: 'Athlete', subtitle: 'Professional Level', icon: <MaterialCommunityIcons name="weight-lifter" size={16} color="#09AEC3" /> },
  ];

  const trainingFrequencies = [
    { key: 'Never', icon: <FontAwesome5 name="swimmer" size={16} color="#09AEC3" /> },
    { key: '1-2 times per week', icon: <Ionicons name="walk" size={16} color="#09AEC3" /> },
    { key: '3-4 times per week', icon: <FontAwesome5 name="running" size={16} color="#09AEC3" /> },
    { key: 'Daily', icon: <MaterialCommunityIcons name="weight-lifter" size={16} color="#09AEC3" /> },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Setup Profile</Text>
        <Text style={styles.progress}>4 of 4</Text>
      </View>
      <View style={styles.progressBarBackground}>
        <View style={styles.progressBarFill} />
      </View>

      {/* Back Arrow and Title */}
      <TouchableOpacity style={styles.backRow} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={20} color="#09AEC3" />
        <Text style={styles.backText}>Fitness Capabilities</Text>
      </TouchableOpacity>

      <Text style={styles.subtitle}>Help us match your fitness level</Text>

      {/* Current Fitness Level */}
      <Text style={styles.sectionTitle}>Current Fitness Level</Text>
      <View style={styles.optionsColumn}>
        {currentFitnessLevels.map(({ key, subtitle, icon }) => {
          const selected = selectedCurrentLevel === key;
          return (
            <TouchableOpacity
              key={key}
              style={styles.optionRow}
              onPress={() => setSelectedCurrentLevel(key)}
              activeOpacity={0.7}
            >
              <View style={[styles.radioOuterCircle, selected && styles.radioCircleSelected]}>
                {selected && <View style={styles.radioInnerCircle} />}
              </View>
              <View style={styles.iconContainer}>{icon}</View>
              <View style={styles.optionTextWrapper}>
                <Text style={styles.optionTitle}>{key}</Text>
                <Text style={styles.optionSubtitle}>{subtitle}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Training Frequency */}
      <Text style={styles.sectionTitle}>Training Frequency</Text>
      <View style={styles.optionsColumn}>
        {trainingFrequencies.map(({ key, icon }) => {
          const selected = selectedTrainingFrequency === key;
          return (
            <TouchableOpacity
              key={key}
              style={styles.optionRow}
              onPress={() => setSelectedTrainingFrequency(key)}
              activeOpacity={0.7}
            >
              <View style={[styles.radioOuterCircle, selected && styles.radioCircleSelected]}>
                {selected && <View style={styles.radioInnerCircle} />}
              </View>
              <View style={styles.iconContainer}>{icon}</View>
              <Text style={styles.optionTitle}>{key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Injuries or Concerns */}
      <Text style={styles.sectionTitle}>Current Injuries or Concerns</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Any current injuries or physical injuries..."
        placeholderTextColor="#fff"
        multiline
        numberOfLines={4}
        value={injuries}
        onChangeText={setInjuries}
      />

      {/* Complete Setup Button */}
      <TouchableOpacity style={styles.completeButton} activeOpacity={0.7}>
        <Text style={styles.completeButtonText}>Complete Setup</Text>
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
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  progress: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.6,
    alignSelf: 'center',
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
    width: '100%', // 4 of 4 steps completed
    borderRadius: 4,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backText: {
    marginLeft: 8,
    color: '#09AEC3',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
    marginBottom: 16,
    alignSelf: 'center',
  },
  optionsColumn: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 32,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  radioOuterCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#09AEC3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  optionTextWrapper: {
    justifyContent: 'center',
  },
  optionTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  optionSubtitle: {
    color: '#aaa',
    fontSize: 12,
  },
  textArea: {
    width: '100%',
    maxWidth: 320,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#09AEC3',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#fff',
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  completeButton: {
    backgroundColor: '#09AEC3',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 220,
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});