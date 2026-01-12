import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';

const circleSize = 40;
const strokeWidth = 4;
const radius = (circleSize - strokeWidth) / 2;
const circumference = 2 * Math.PI * radius;

const trainingModules = [
  { key: 'Module 1' },
  { key: 'Module 2' },
  { key: 'Module 3' },
  { key: 'Module 4' },
  { key: 'Module 5' },
];

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const progressValues = Array(days.length).fill(0); // 0% progress for each day

export default function DashboardScreen() {
  const [selectedDay, setSelectedDay] = useState(0);
  const router = useRouter();

  const CircularProgress = ({ progress }: { progress: number }) => {
    const strokeDashoffset = circumference * (1 - progress);
    return (
      <Svg height={circleSize} width={circleSize}>
        <Circle
          stroke="#0a3645"
          fill="none"
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke="#07bbc0"
          fill="none"
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${circleSize / 2}, ${circleSize / 2}`}
        />
      </Svg>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Fixed Sidebar - always visible */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarIconsBottom}>
            <TouchableOpacity 
              style={styles.sidebarButton}
              onPress={() => router.push('/profile')}
            >
              <Image
                source={require('../../assets/images/blueprofileicon.png')}
                style={styles.iconImage}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarButton}>
              <Image
                source={require('../../assets/images/trainericon.png')}
                style={styles.iconImage}
              />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.sidebarButton, styles.sidebarActive]}>
              <Image
                source={require('../../assets/images/homeicon.png')}
                style={styles.iconImage}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <Image
            source={require('../../assets/images/defendudashboardlogo.png')}
            style={styles.logoImage}
          />

          {/* Weekly Goal */}
          <View style={styles.weeklyGoalContainer}>
            <Text style={styles.weeklyGoalTitle}>Weekly Goal</Text>
            <Text style={styles.weeklyGoalSubtitle}>
              Track your training progress
            </Text>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: '5%' }]} />
            </View>
            <View style={styles.weekDaysContainer}>
              {days.map((day, i) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => setSelectedDay(i)}
                  style={styles.dayProgressContainer}
                  accessibilityRole="button"
                  accessibilityLabel={`Select day ${day}`}
                  accessibilityState={{ selected: selectedDay === i }}
                >
                  <CircularProgress progress={progressValues[i]} />
                  <View
                    style={[
                      styles.dayLabelContainer,
                      i === selectedDay && styles.dayLabelContainerSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayLabel,
                        i === selectedDay && styles.dayLabelActive,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Training Modules */}
          <Text style={styles.trainingTitle}>TRAINING</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.modulesContainer}
          >
            {trainingModules.map(({ key }) => (
              <TouchableOpacity
                key={key}
                style={styles.moduleCard}
                accessibilityRole="button"
                accessibilityLabel={`Open training module ${key}`}
              >
                <View style={styles.moduleHeader}>
                  <Text style={styles.moduleHeaderText}>{key}</Text>
                </View>
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>Image Placeholder</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#041527' },
  container: { flex: 1, flexDirection: 'row' },
  sidebar: {
    backgroundColor: '#031A23',
    width: 80,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
    justifyContent: 'flex-end', // Moves icons to bottom
  },
  sidebarIconsBottom: {
    flexDirection: 'column',
    width: '100%',
    alignItems: 'center',
  },
  sidebarButton: {
    paddingVertical: 20,
    width: '100%',
    alignItems: 'center',
  },
  sidebarActive: {
    backgroundColor: '#024446',
  },
  iconImage: {
    width: 28,
    height: 28,
    tintColor: '#07bbc0',
    resizeMode: 'contain',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 30,
    paddingVertical: 25,
  },
  logoImage: {
    width: 180,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 30,
    alignSelf: 'flex-start',
  },
  weeklyGoalContainer: {
    backgroundColor: '#041527',
    borderRadius: 25,
    padding: 25,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#000E1C',
  },
  weeklyGoalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  weeklyGoalSubtitle: {
    fontSize: 14,
    color: '#6b8693',
    marginBottom: 10,
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: '#0a3645',
    borderRadius: 6,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#07bbc0',
    borderRadius: 6,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  dayProgressContainer: {
    alignItems: 'center',
  },
  dayLabelContainer: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dayLabelContainerSelected: {
    backgroundColor: '#0097A7',
  },
  dayLabel: {
    color: '#6b8693',
    fontSize: 14,
  },
  dayLabelActive: {
    color: '#041527',
  },
  trainingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#07bbc0',
    letterSpacing: 2,
    marginBottom: 15,
  },
  modulesContainer: {
    paddingLeft: 12,
  },
  moduleCard: {
    width: 120,
    height: 210,
    borderRadius: 15,
    backgroundColor: '#011f36',
    overflow: 'hidden',
    marginRight: 15,
  },
  moduleHeader: {
    backgroundColor: '#062731',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  moduleHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#0a3645',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  imagePlaceholderText: {
    color: '#6b8693',
    fontSize: 10,
    textAlign: 'center',
  },
});