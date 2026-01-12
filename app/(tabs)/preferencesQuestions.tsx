import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSkillProfile } from '../contexts/SkillProfileContext';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

export default function SelfDefensePreferencesScreen() {
  const router = useRouter();
  const { setPreferences, preferences } = useSkillProfile();
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();
  // Handle both array and string formats for backward compatibility
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>(
    preferences?.preferredTechnique 
      ? (Array.isArray(preferences.preferredTechnique) ? preferences.preferredTechnique : [preferences.preferredTechnique])
      : []
  );
  const [selectedGoals, setSelectedGoals] = useState<string[]>(
    preferences?.trainingGoal
      ? (Array.isArray(preferences.trainingGoal) ? preferences.trainingGoal : [preferences.trainingGoal])
      : []
  );
  const [errors, setErrors] = useState({
    technique: '',
    goal: '',
  });

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
    <View style={styles.wrapper}>
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
      <TouchableOpacity style={styles.backRow} activeOpacity={0.7} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="#09AEC3" />
        <Text style={styles.backText}>Self-Defense Preferences</Text>
      </TouchableOpacity>

      {/* Subtitle */}
      <Text style={styles.subtitle}>Choose your preferred training focus</Text>

      {/* Preferred Techniques */}
      <Text style={styles.sectionTitle}>Preferred Techniques</Text>
      <View style={styles.optionsColumn}>
        {preferredTechniques.map(({ key, icon }) => {
          const selected = selectedTechniques.includes(key);
          return (
            <TouchableOpacity
              key={key}
              style={styles.optionRow}
              onPress={() => {
                if (selected) {
                  setSelectedTechniques(selectedTechniques.filter(t => t !== key));
                } else {
                  setSelectedTechniques([...selectedTechniques, key]);
                }
                if (errors.technique) {
                  setErrors(prev => ({ ...prev, technique: '' }));
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.checkboxOuter, selected && styles.checkboxSelected]}>
                {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <View style={styles.iconContainer}>{icon}</View>
              <Text style={styles.optionText}>{key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {errors.technique ? <Text style={styles.errorText}>{errors.technique}</Text> : null}

      {/* Training Goals */}
      <Text style={styles.sectionTitle}>Training Goals</Text>
      <View style={styles.optionsColumn}>
        {trainingGoals.map(({ key, icon }) => {
          const selected = selectedGoals.includes(key);
          return (
            <TouchableOpacity
              key={key}
              style={styles.optionRow}
              onPress={() => {
                if (selected) {
                  setSelectedGoals(selectedGoals.filter(g => g !== key));
                } else {
                  setSelectedGoals([...selectedGoals, key]);
                }
                if (errors.goal) {
                  setErrors(prev => ({ ...prev, goal: '' }));
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.checkboxOuter, selected && styles.checkboxSelected]}>
                {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <View style={styles.iconContainer}>{icon}</View>
              <Text style={styles.optionText}>{key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {errors.goal ? <Text style={styles.errorText}>{errors.goal}</Text> : null}

      {/* Next Button */}
      <TouchableOpacity
        style={styles.nextButton}
        activeOpacity={0.7}
        onPress={() => {
          const techniqueError = selectedTechniques.length === 0 ? 'Please select at least one preferred technique' : '';
          const goalError = selectedGoals.length === 0 ? 'Please select at least one training goal' : '';
          
          const newErrors = {
            technique: techniqueError,
            goal: goalError,
          };
          setErrors(newErrors);

          if (techniqueError || goalError) {
            showToast('Invalid inputs. Try again');
            return;
          }

          setPreferences({
            preferredTechnique: selectedTechniques,
            trainingGoal: selectedGoals,
          });
          router.push('/(tabs)/pastexperienceQuestion');
        }}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>

    </ScrollView>
      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={hideToast}
        duration={3000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#041527',
  },
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
  checkboxOuter: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#09AEC3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: '#09AEC3',
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
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    alignSelf: 'center',
    maxWidth: 320,
  },
});