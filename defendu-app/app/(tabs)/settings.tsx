import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLogout } from '../../hooks/useLogout';
import {
  clampDailyModuleTarget,
  clampTrainingDaysPerWeek,
  clampTrainingProgramWeeks,
  computeWeeklyModuleTargetFromSchedule,
} from '../_utils/moduleTargets';
import { AuthController } from '../controllers/AuthController';

export default function SettingsPage() {
  const router = useRouter();
  const handleLogout = useLogout();

  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  const [heightInput, setHeightInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [dailyTarget, setDailyTarget] = useState(3);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [programWeeks, setProgramWeeks] = useState(8);
  const [saving, setSaving] = useState(false);

  const [baseline, setBaseline] = useState({
    height: '',
    weight: '',
    daily: 3,
    days: 3,
    weeks: 8,
  });

  const load = useCallback(async () => {
    try {
      const [user, profile] = await Promise.all([
        AuthController.getCurrentUser(),
        AuthController.getSkillProfile(),
      ]);
      if (user) {
        setUserEmail(user.email || '');
        setUserName(`${user.firstName} ${user.lastName}`.trim());
      }
      const prefs = profile?.preferences;
      const h = user?.height ?? profile?.physicalAttributes?.height;
      const w = user?.weight ?? profile?.physicalAttributes?.weight;
      const hs = h != null && Number.isFinite(Number(h)) ? String(h) : '';
      const ws = w != null && Number.isFinite(Number(w)) ? String(w) : '';
      const daily = clampDailyModuleTarget(prefs?.dailyModuleTarget ?? user?.dailyModuleTarget ?? 3);
      const weeklyStored = prefs?.weeklyModuleTarget ?? user?.weeklyModuleTarget ?? 7;
      let days =
        typeof prefs?.trainingDaysPerWeek === 'number'
          ? clampTrainingDaysPerWeek(prefs.trainingDaysPerWeek)
          : Math.min(7, Math.max(1, Math.round(weeklyStored / Math.max(1, daily))));
      const weeks =
        typeof prefs?.trainingProgramWeeks === 'number'
          ? clampTrainingProgramWeeks(prefs.trainingProgramWeeks)
          : clampTrainingProgramWeeks(user?.trainingProgramWeeks ?? 8);

      setHeightInput(hs);
      setWeightInput(ws);
      setDailyTarget(daily);
      setDaysPerWeek(days);
      setProgramWeeks(weeks);
      setBaseline({ height: hs, weight: ws, daily, days, weeks });
    } catch (e) {
      console.error('Error loading user:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const previewWeekly = computeWeeklyModuleTargetFromSchedule(dailyTarget, daysPerWeek);
  const hasChanges =
    heightInput !== baseline.height ||
    weightInput !== baseline.weight ||
    dailyTarget !== baseline.daily ||
    daysPerWeek !== baseline.days ||
    programWeeks !== baseline.weeks;

  const handleSaveBodyAndTraining = async () => {
    const h = heightInput.trim() ? Number(heightInput.trim()) : undefined;
    const w = weightInput.trim() ? Number(weightInput.trim()) : undefined;
    if (h !== undefined && (isNaN(h) || h < 50 || h > 250)) {
      Alert.alert('Invalid height', 'Please enter a height between 50 and 250 cm.');
      return;
    }
    if (w !== undefined && (isNaN(w) || w < 20 || w > 300)) {
      Alert.alert('Invalid weight', 'Please enter a weight between 20 and 300 kg.');
      return;
    }
    setSaving(true);
    try {
      await AuthController.updateSettingsBodyAndTrainingGoals({
        ...(h !== undefined && { height: h }),
        ...(w !== undefined && { weight: w }),
        dailyModuleTarget: dailyTarget,
        trainingDaysPerWeek: daysPerWeek,
        trainingProgramWeeks: programWeeks,
      });
      setBaseline({
        height: heightInput,
        weight: weightInput,
        daily: dailyTarget,
        days: daysPerWeek,
        weeks: programWeeks,
      });
      if (Platform.OS === 'web') {
        window.alert('Saved. Your weekly goal on the dashboard will use the new totals.');
      } else {
        Alert.alert('Saved', 'Your weekly goal on the dashboard will use the new totals.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save. Try again.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleResetProgress = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to reset all your training progress? This cannot be undone.')) {
        performResetProgress();
      }
    } else {
      Alert.alert(
        'Reset Progress',
        'Are you sure you want to reset all your training progress? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reset', style: 'destructive', onPress: performResetProgress },
        ]
      );
    }
  };

  const performResetProgress = async () => {
    try {
      await AuthController.resetUserProgress();
      if (Platform.OS === 'web') {
        window.alert('Progress has been reset successfully.');
      } else {
        Alert.alert('Success', 'Your training progress has been reset.');
      }
    } catch (e) {
      console.error('Error resetting progress:', e);
      if (Platform.OS === 'web') {
        window.alert('Failed to reset progress. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to reset progress. Please try again.');
      }
    }
  };

  const handleDeleteAccount = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete your account? This action is permanent and cannot be undone.')) {
        window.alert('Please contact support@defendu.com to complete account deletion.');
      }
    } else {
      Alert.alert(
        'Delete Account',
        'Are you sure you want to delete your account? This action is permanent and cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => Alert.alert('Contact Support', 'Please contact support@defendu.com to complete account deletion.'),
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#07bbc0" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#07bbc0" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{userName || 'Not set'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#07bbc0" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{userEmail || 'Not set'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body & weekly plan</Text>
          <View style={styles.card}>
            <Text style={styles.fieldHint}>Height, weight, and training rhythm feed your dashboard weekly goal.</Text>
            <View style={styles.hwRow}>
              <View style={styles.hwField}>
                <Text style={styles.inputLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={heightInput}
                  onChangeText={setHeightInput}
                  placeholder="e.g. 170"
                  placeholderTextColor="#6b8693"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.hwField}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.textInput}
                  value={weightInput}
                  onChangeText={setWeightInput}
                  placeholder="e.g. 70"
                  placeholderTextColor="#6b8693"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.subheading}>Modules per day</Text>
            <View style={styles.stepRow}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setDailyTarget((t) => Math.max(1, t - 1))}>
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{dailyTarget}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setDailyTarget((t) => Math.min(10, t + 1))}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.subheading}>Training days per week</Text>
            <View style={styles.stepRow}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setDaysPerWeek((t) => Math.max(1, t - 1))}>
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{daysPerWeek}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setDaysPerWeek((t) => Math.min(7, t + 1))}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.subheading}>Program length (weeks)</Text>
            <View style={styles.stepRow}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setProgramWeeks((t) => Math.max(1, t - 1))}>
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{programWeeks}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setProgramWeeks((t) => Math.min(52, t + 1))}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.weeklyPreview}>
              <Ionicons name="calendar-outline" size={18} color="#07bbc0" />
              <Text style={styles.weeklyPreviewText}>
                Weekly module goal: {previewWeekly} (modules/day × training days, max 20)
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
              onPress={handleSaveBodyAndTraining}
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <ActivityIndicator color="#041527" />
              ) : (
                <Text style={styles.saveBtnText}>Save body & training</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#ff6b6b' }]}>Danger Zone</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.dangerRow} onPress={handleResetProgress}>
              <Ionicons name="refresh-outline" size={20} color="#ff6b6b" />
              <Text style={styles.dangerText}>Reset Training Progress</Text>
              <Ionicons name="chevron-forward-outline" size={18} color="#ff6b6b" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.dangerRow} onPress={handleDeleteAccount}>
              <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
              <Text style={styles.dangerText}>Delete Account</Text>
              <Ionicons name="chevron-forward-outline" size={18} color="#ff6b6b" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Defendu v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#041527',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(7, 187, 192, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#07bbc0',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'rgba(7, 187, 192, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(7, 187, 192, 0.1)',
  },
  fieldHint: {
    color: 'rgba(107,134,147,0.9)',
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 20,
  },
  hwRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  hwField: {
    flex: 1,
  },
  inputLabel: {
    color: 'rgba(107,134,147,0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#021422',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(7,187,192,0.2)',
    color: '#FFFFFF',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  subheading: {
    color: '#e9f7ff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  stepBtn: {
    backgroundColor: 'rgba(7, 187, 192, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: '#07bbc0',
    fontSize: 20,
    fontWeight: '700',
  },
  stepValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
  weeklyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(7, 187, 192, 0.08)',
    borderRadius: 12,
  },
  weeklyPreviewText: {
    flex: 1,
    color: '#c8e8ee',
    fontSize: 13,
    lineHeight: 20,
  },
  saveBtn: {
    backgroundColor: '#07bbc0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    color: '#041527',
    fontWeight: '700',
    fontSize: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 14,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b8693',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(107, 134, 147, 0.15)',
    marginHorizontal: 16,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dangerText: {
    flex: 1,
    fontSize: 15,
    color: '#ff6b6b',
    fontWeight: '600',
    marginLeft: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff6b6b',
  },
  versionText: {
    textAlign: 'center',
    color: '#6b8693',
    fontSize: 13,
    marginTop: 20,
    fontWeight: '500',
  },
});
