import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

export default function SetupProfileScreen() {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | null>(null);
  const [limitations, setLimitations] = useState('');

  // Validation
  const validateNumberInput = (value: string, fieldName: string, min: number, max: number) => {
    const num = Number(value);
    if (!value) return `${fieldName} is required`;
    if (isNaN(num)) return `${fieldName} must be a number`;
    if (num < min || num > max) return `${fieldName} must be between ${min} and ${max}`;
    if (!/^\d*\.?\d*$/.test(value)) return `${fieldName} must be a valid positive number`;
    return '';
  };

  // Handle Next pressed
  const handleNext = () => {
    const heightError = validateNumberInput(height, 'Height', 30, 300);     // cm
    const weightError = validateNumberInput(weight, 'Weight', 1, 500);      // kg
    const ageError = validateNumberInput(age, 'Age', 1, 120);

    if (heightError || weightError || ageError) {
      Alert.alert('Validation Error', `${heightError}\n${weightError}\n${ageError}`);
      return;
    }
    if (!gender) {
      Alert.alert('Validation Error', 'Please select a gender');
      return;
    }

    Alert.alert('Success', 'Profile setup validated!');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Setup Profile</Text>
        <Text style={styles.progress}>1 of 4</Text>
      </View>
      <View style={styles.progressBarBackground}>
        <View style={styles.progressBarFill} />
      </View>

      {/* Section Title */}
      <Text style={styles.sectionTitle}>Physical Attributes</Text>
      <Text style={styles.sectionSubtitle}>Help us personalize your training experience</Text>

      {/* Inputs */}
      <View style={styles.inputWrapper}>
        <Ionicons name="resize" size={18} color="#FFF" style={styles.icon} />
        <TextInput
          placeholder="Height (cm)"
          placeholderTextColor="#FFF"
          style={styles.input}
          keyboardType="numeric"
          value={height}
          onChangeText={setHeight}
          maxLength={3}
          selectionColor="#09AEC3"
        />
      </View>

      <View style={styles.inputWrapper}>
        <MaterialCommunityIcons name="weight-lifter" size={18} color="#FFF" style={styles.icon} />
        <TextInput
          placeholder="Weight (kg)"
          placeholderTextColor="#FFF"
          style={styles.input}
          keyboardType="numeric"
          value={weight}
          onChangeText={setWeight}
          maxLength={3}
          selectionColor="#09AEC3"
        />
      </View>

      <View style={styles.inputWrapper}>
        <FontAwesome5 name="birthday-cake" size={18} color="#FFF" style={styles.icon} />
        <TextInput
          placeholder="Age"
          placeholderTextColor="#FFF"
          style={styles.input}
          keyboardType="numeric"
          value={age}
          onChangeText={setAge}
          maxLength={3}
          selectionColor="#09AEC3"
        />
      </View>

      {/* Gender */}
      <Text style={styles.genderLabel}>Gender</Text>
      <View style={styles.genderOptions}>
        {(['Male', 'Female', 'Other'] as const).map(option => {
          const selected = gender === option;
          return (
            <TouchableOpacity
              key={option}
              style={styles.genderOption}
              onPress={() => setGender(option)}
              activeOpacity={0.7}
            >
              <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
                {selected && <View style={styles.radioInnerCircle} />}
              </View>
              <Text style={styles.genderOptionText}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Physical Limitations */}
      <View style={styles.limitationsLabelWrapper}>
        <Ionicons name="warning-outline" size={20} color="#FFF" />
        <Text style={styles.limitationsLabel}>Physical Limitations (Optional)</Text>
      </View>

      <TextInput
        style={styles.limitationsInput}
        placeholder="Any injuries or physical limitations we should know about..."
        placeholderTextColor="#FFF"
        multiline
        numberOfLines={4}
        value={limitations}
        onChangeText={setLimitations}
        selectionColor="#09AEC3"
      />

      {/* Next Button */}
      <TouchableOpacity style={styles.nextButton} activeOpacity={0.7} onPress={handleNext}>
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
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  progress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    opacity: 0.5,
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
    width: '25%',
    borderRadius: 4,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#FFF',
    fontSize: 12,
    maxWidth: 320,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#09AEC3',
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 40,
    maxWidth: 320,
    width: '100%',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    paddingVertical: 0,
  },
  genderLabel: {
    color: '#FFF',
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  genderOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 24,
    marginBottom: 32,
    width: '100%',
    maxWidth: 320,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    height: 18,
    width: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#09AEC3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioCircleSelected: {
    borderColor: '#09AEC3',
  },
  radioInnerCircle: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#09AEC3',
  },
  genderOptionText: {
    color: '#FFF',
    fontSize: 14,
  },
  limitationsLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  limitationsLabel: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  limitationsInput: {
    borderColor: '#FFF',
    borderWidth: 1,
    borderRadius: 15,
    height: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFF',
    fontSize: 14,
    maxWidth: 320,
    textAlignVertical: 'top',
    marginBottom: 40,
    width: '100%',
  },
  nextButton: {
    backgroundColor: '#09AEC3',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 260,
    width: '85%',
    alignSelf: 'center',
  },
  nextButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 18,
  },
});