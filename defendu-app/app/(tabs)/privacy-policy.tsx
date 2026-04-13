import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#dff7ff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Privacy Policy</Text>
          <Text style={styles.heroSubtitle}>
            DEFENDU respects your privacy. This page explains what data we collect and how we use it to keep your
            training experience secure and personalized.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>What We Collect</Text>
          <Text style={styles.bodyText}>- Profile details (name, photo, preferences)</Text>
          <Text style={styles.bodyText}>- Training progress and module completion</Text>
          <Text style={styles.bodyText}>- Trainer interaction and communication records</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>How We Use It</Text>
          <Text style={styles.bodyText}>- Recommend training modules suited to your goals</Text>
          <Text style={styles.bodyText}>- Help you connect with the right DEFENDU trainers</Text>
          <Text style={styles.bodyText}>- Improve app safety, reliability, and user experience</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Your Controls</Text>
          <Text style={styles.bodyText}>- Update or remove profile info anytime from Profile</Text>
          <Text style={styles.bodyText}>- Contact support for privacy questions or deletion requests</Text>
          <Text style={styles.bodyText}>- Reset your training progress directly in-app</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Data Retention</Text>
          <Text style={styles.bodyText}>- Account profile data: kept while your account is active.</Text>
          <Text style={styles.bodyText}>- Activity and progress logs: kept to support recommendations and continuity.</Text>
          <Text style={styles.bodyText}>- Support messages: retained for service quality and incident follow-up.</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Security Commitments</Text>
          <View style={styles.securityRow}>
            <Ionicons name="lock-closed-outline" size={16} color="#7de8be" />
            <Text style={styles.securityText}>Protected account access and role-based permissions</Text>
          </View>
          <View style={styles.securityRow}>
            <Ionicons name="cloud-done-outline" size={16} color="#7de8be" />
            <Text style={styles.securityText}>Secure media storage and controlled profile updates</Text>
          </View>
          <View style={styles.securityRow}>
            <Ionicons name="eye-off-outline" size={16} color="#7de8be" />
            <Text style={styles.securityText}>No public exposure of private trainer application records</Text>
          </View>
          <Text style={styles.updatedText}>Last updated: DEFENDU policy revision 2026-04</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#041527' },
  container: { flex: 1 },
  content: { padding: 18, paddingBottom: 40 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  backText: { color: '#dff7ff', fontSize: 15, fontWeight: '700' },
  heroCard: {
    backgroundColor: '#0b2b42',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(53, 214, 222, 0.42)',
    padding: 16,
    marginBottom: 12,
  },
  heroTitle: { color: '#f3fcff', fontSize: 24, fontWeight: '800', marginBottom: 6 },
  heroSubtitle: { color: '#9fc7d8', fontSize: 13, lineHeight: 19 },
  sectionCard: {
    backgroundColor: '#072236',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(53, 214, 222, 0.2)',
    padding: 14,
    marginBottom: 10,
  },
  sectionTitle: { color: '#dff7ff', fontSize: 16, fontWeight: '800', marginBottom: 10 },
  bodyText: { color: '#9ec0cf', fontSize: 13, lineHeight: 20, marginBottom: 5 },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingVertical: 6,
  },
  securityText: { color: '#b3d7e6', fontSize: 13, flex: 1 },
  updatedText: {
    marginTop: 8,
    color: '#7ca2b3',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
