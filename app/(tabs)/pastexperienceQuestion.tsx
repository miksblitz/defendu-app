import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, FontAwesome } from '@expo/vector-icons';

export default function PastExperienceScreen() {
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);
  const [martialArtsBackground, setMartialArtsBackground] = useState('');
  const [previousTrainingDetails, setPreviousTrainingDetails] = useState('');

  const experienceLevels = [
    { title: 'Complete Beginner', subtitle: 'New to Self Defense' },
    { title: 'Some Experience', subtitle: 'Basic Knowledge' },
    { title: 'Experienced', subtitle: 'Regular Training' },
    { title: 'Expert/Instructor', subtitle: 'Teaching Others' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Setup Profile</Text>
        <Text style={styles.progress}>3 of 4</Text>
      </View>
      <View style={styles.progressBarBackground}>
        <View style={styles.progressBarFill} />
      </View>

      {/* Back Arrow & Title */}
      <TouchableOpacity style={styles.backRow} activeOpacity={0.7} onPress={() => {/* Add back navigation */}}>
        <Ionicons name="arrow-back" size={20} color="#09AEC3" />
        <Text style={styles.backText}>Past Experience</Text>
      </TouchableOpacity>

      <Text style={styles.subTitleText}>Tell us about your training background</Text>

      {/* Experience Level */}
      <Text style={styles.sectionTitle}>Experience Level</Text>
      <View style={styles.optionsContainer}>
        {experienceLevels.map(({ title, subtitle }) => {
          const selected = selectedExperience === title;
          return (
            <TouchableOpacity
              key={title}
              style={styles.optionRow}
              onPress={() => setSelectedExperience(title)}
              activeOpacity={0.7}
            >
              <View style={[styles.radioOuterCircle, selected && styles.radioCircleSelected]}>
                {selected && <View style={styles.radioInnerCircle} />}
              </View>
              <View>
                <Text style={styles.optionTitle}>{title}</Text>
                <Text style={styles.optionSubtitle}>{subtitle}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Martial Arts Background */}
      <Text style={styles.sectionTitle}>Martial Arts Background</Text>
      <TextInput
        style={styles.textArea}
        placeholder="List any martial arts or self-defense training you’ve had..."
        placeholderTextColor="#FFFFFF"
        multiline
        numberOfLines={4}
        maxLength={300}
        value={martialArtsBackground}
        onChangeText={setMartialArtsBackground}
      />

      {/* Previous Training Details */}
      <Text style={styles.sectionTitle}>Previous Training Details</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Describe your previous training experience, duration, achievements..."
        placeholderTextColor="#FFFFFF"
        multiline
        numberOfLines={4}
        maxLength={300}
        value={previousTrainingDetails}
        onChangeText={setPreviousTrainingDetails}
      />

      {/* Next Button */}
      <TouchableOpacity style={styles.nextButton} activeOpacity={0.7} onPress={() => {/* Add next navigation */}}>
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#041527',
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
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
    width: '75%',  // 3 of 4 progress
    borderRadius: 4,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  subTitleText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionsContainer: {
    marginBottom: 32,
    width: '100%',
    maxWidth: 320,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  radioOuterCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#09AEC3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  optionTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  optionSubtitle: {
    color: '#cccccc',
    fontSize: 13,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#09AEC3',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 14,
    maxWidth: 320,
    width: '100%',
    marginBottom: 40,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  nextButton: {
    backgroundColor: '#09AEC3',
    paddingVertical: 12,
    borderRadius: 25,
    width: 180,
    alignSelf: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});