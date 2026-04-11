import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSkillProfile } from '../contexts/SkillProfileContext';
import { AuthController } from '../controllers/AuthController';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

const PHYSICAL_LIMITATIONS = [
  'No known limitations',
  'Knee injury / pain',
  'Back injury / pain',
  'Shoulder injury / pain',
  'Hip injury / pain',
  'Ankle injury / pain',
  'Wrist injury / pain',
  'Elbow injury / pain',
  'Neck injury / pain',
  'Chronic fatigue',
  'Heart condition',
  'Asthma / breathing issues',
  'Wheelchair user',
  'Upper limb difference / absence',
  'Lower limb difference / absence',
  'Joint hypermobility',
  'Arthritis',
  'Pregnancy',
] as const;

export default function SetupProfileScreen() {
  const router = useRouter();
  const { setPhysicalAttributes, physicalAttributes } = useSkillProfile();
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();

  // Check if user is admin and redirect
  useEffect(() => {
    const checkAdmin = async () => {
      const currentUser = await AuthController.getCurrentUser();
      if (currentUser && currentUser.role === 'admin') {
        router.replace('/(admin)/adminDashboard');
      }
    };
    checkAdmin();
  }, [router]);
  const [height, setHeight] = useState(physicalAttributes?.height?.toString() || '');
  const [weight, setWeight] = useState(physicalAttributes?.weight?.toString() || '');
  const [age, setAge] = useState(physicalAttributes?.age?.toString() || '');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | null>(physicalAttributes?.gender || null);
  const [selectedLimitations, setSelectedLimitations] = useState<string[]>(
    Array.isArray(physicalAttributes?.limitations)
      ? (physicalAttributes!.limitations as string[])
      : physicalAttributes?.limitations
        ? [physicalAttributes.limitations as unknown as string]
        : []
  );
  
  const [errors, setErrors] = useState({
    height: '',
    weight: '',
    age: '',
    gender: '',
  });

  // Realistic validation ranges (ages 4+)
  const validateHeight = (value: string): string => {
    if (!value) return 'Height is required';
    const num = Number(value);
    if (isNaN(num) || !/^\d*\.?\d*$/.test(value)) return 'Height must be a valid number';
    if (num < 80 || num > 250) return 'Height must be between 80-250 cm';
    return '';
  };

  const validateWeight = (value: string): string => {
    if (!value) return 'Weight is required';
    const num = Number(value);
    if (isNaN(num) || !/^\d*\.?\d*$/.test(value)) return 'Weight must be a valid number';
    if (num < 15 || num > 300) return 'Weight must be between 15-300 kg';
    return '';
  };

  const validateAge = (value: string): string => {
    if (!value) return 'Age is required';
    const num = Number(value);
    if (isNaN(num) || !/^\d+$/.test(value)) return 'Age must be a valid number';
    if (num < 4 || num > 120) return 'Age must be between 4-120 years';
    return '';
  };

  // Handle Next pressed
  const handleNext = () => {
    const heightError = validateHeight(height);
    const weightError = validateWeight(weight);
    const ageError = validateAge(age);
    const genderError = !gender ? 'Please select a gender' : '';

    const newErrors = {
      height: heightError,
      weight: weightError,
      age: ageError,
      gender: genderError,
    };

    setErrors(newErrors);

    const hasErrors = heightError || weightError || ageError || genderError;
    if (hasErrors) {
      showToast('Invalid inputs. Try again');
      return;
    }

    // Save to context
    setPhysicalAttributes({
      height: Number(height),
      weight: Number(weight),
      age: Number(age),
      gender: gender!,
      limitations: selectedLimitations.length > 0 ? selectedLimitations : undefined,
    });

    // Navigate to next screen
    router.push('/(tabs)/preferencesQuestions');
  };

  return (
    <View style={styles.wrapper}>
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
          onChangeText={(text) => {
            setHeight(text);
            if (errors.height) {
              setErrors(prev => ({ ...prev, height: '' }));
            }
          }}
          onBlur={() => {
            const error = validateHeight(height);
            setErrors(prev => ({ ...prev, height: error }));
          }}
          maxLength={3}
          selectionColor="#09AEC3"
        />
      </View>
      {errors.height ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errors.height}</Text>
        </View>
      ) : null}

      <View style={styles.inputWrapper}>
        <MaterialCommunityIcons name="weight-lifter" size={18} color="#FFF" style={styles.icon} />
        <TextInput
          placeholder="Weight (kg)"
          placeholderTextColor="#FFF"
          style={styles.input}
          keyboardType="numeric"
          value={weight}
          onChangeText={(text) => {
            setWeight(text);
            if (errors.weight) {
              setErrors(prev => ({ ...prev, weight: '' }));
            }
          }}
          onBlur={() => {
            const error = validateWeight(weight);
            setErrors(prev => ({ ...prev, weight: error }));
          }}
          maxLength={3}
          selectionColor="#09AEC3"
        />
      </View>
      {errors.weight ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errors.weight}</Text>
        </View>
      ) : null}

      <View style={styles.inputWrapper}>
        <FontAwesome5 name="birthday-cake" size={18} color="#FFF" style={styles.icon} />
        <TextInput
          placeholder="Age"
          placeholderTextColor="#FFF"
          style={styles.input}
          keyboardType="numeric"
          value={age}
          onChangeText={(text) => {
            setAge(text);
            if (errors.age) {
              setErrors(prev => ({ ...prev, age: '' }));
            }
          }}
          onBlur={() => {
            const error = validateAge(age);
            setErrors(prev => ({ ...prev, age: error }));
          }}
          maxLength={3}
          selectionColor="#09AEC3"
        />
      </View>
      {errors.age ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errors.age}</Text>
        </View>
      ) : null}

      {/* Gender */}
      <Text style={styles.genderLabel}>Gender</Text>
      <View style={styles.genderOptions}>
        {(['Male', 'Female', 'Other'] as const).map(option => {
          const selected = gender === option;
          return (
            <TouchableOpacity
              key={option}
              style={styles.genderOption}
              onPress={() => {
                setGender(option);
                if (errors.gender) {
                  setErrors(prev => ({ ...prev, gender: '' }));
                }
              }}
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
      {errors.gender ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errors.gender}</Text>
        </View>
      ) : null}

      {/* Physical Limitations */}
      <View style={styles.limitationsLabelWrapper}>
        <Ionicons name="warning-outline" size={20} color="#FFF" />
        <Text style={styles.limitationsLabel}>Physical Limitations (Optional)</Text>
      </View>
      <Text style={styles.limitationsHint}>Select all that apply</Text>
      <View style={styles.limitationsGrid}>
        {PHYSICAL_LIMITATIONS.map((item) => {
          const selected = selectedLimitations.includes(item);
          return (
            <TouchableOpacity
              key={item}
              style={[styles.limitationChip, selected && styles.limitationChipSelected]}
              onPress={() =>
                setSelectedLimitations((prev) =>
                  selected ? prev.filter((l) => l !== item) : [...prev, item]
                )
              }
              activeOpacity={0.7}
            >
              {selected && <Ionicons name="checkmark" size={12} color="#FFF" style={{ marginRight: 4 }} />}
              <Text style={[styles.limitationChipText, selected && styles.limitationChipTextSelected]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Next Button */}
      <TouchableOpacity style={styles.nextButton} activeOpacity={0.7} onPress={handleNext}>
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
    marginBottom: 4,
    gap: 8,
  },
  limitationsLabel: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  limitationsHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  limitationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    maxWidth: 340,
    width: '100%',
    marginBottom: 32,
  },
  limitationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#09AEC3',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  limitationChipSelected: {
    backgroundColor: '#09AEC3',
  },
  limitationChipText: {
    color: '#09AEC3',
    fontSize: 12,
    fontWeight: '500',
  },
  limitationChipTextSelected: {
    color: '#FFF',
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
  errorContainer: {
    width: '100%',
    maxWidth: 320,
    marginTop: -12,
    marginBottom: 8,
    paddingLeft: 12,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
  },
});