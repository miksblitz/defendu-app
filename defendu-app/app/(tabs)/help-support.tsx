import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HelpSupportPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#dff7ff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Help & Support</Text>
          <Text style={styles.heroSubtitle}>
            Welcome to DEFENDU support. Find answers fast, stay safe in training, and get help when you need it.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Help Topics</Text>
          <View style={styles.topicRow}>
            <View style={styles.topicIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#082033" />
            </View>
            <View style={styles.topicTextWrap}>
              <Text style={styles.topicTitle}>Account & Profile</Text>
              <Text style={styles.topicDesc}>Update your profile photo, cover photo, and personal details.</Text>
            </View>
          </View>
          <View style={styles.topicRow}>
            <View style={styles.topicIconWrap}>
              <Ionicons name="barbell-outline" size={18} color="#082033" />
            </View>
            <View style={styles.topicTextWrap}>
              <Text style={styles.topicTitle}>Training & Modules</Text>
              <Text style={styles.topicDesc}>Browse modules, follow trainer guidance, and track your progress.</Text>
            </View>
          </View>
          <View style={styles.topicRow}>
            <View style={styles.topicIconWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#082033" />
            </View>
            <View style={styles.topicTextWrap}>
              <Text style={styles.topicTitle}>Messaging Trainers</Text>
              <Text style={styles.topicDesc}>Connect with trainers directly for coaching and feedback.</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Safety First</Text>
          <Text style={styles.paragraph}>
            DEFENDU encourages safe, age-appropriate self-defense learning. Train in a controlled environment and
            consult a trusted adult, coach, or healthcare professional if you have injuries or health concerns.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Popular FAQs</Text>
          <View style={styles.faqItem}>
            <Text style={styles.faqQ}>How do I connect with a trainer?</Text>
            <Text style={styles.faqA}>Open the Trainers page, tap View on a coach, then use Contact Trainer.</Text>
          </View>
          <View style={styles.faqItem}>
            <Text style={styles.faqQ}>Why can’t I see some modules?</Text>
            <Text style={styles.faqA}>Modules are shown after approval. If a module is under review, it won’t appear yet.</Text>
          </View>
          <View style={styles.faqItem}>
            <Text style={styles.faqQ}>How do I update my profile photos?</Text>
            <Text style={styles.faqA}>Go to Profile and tap your cover or profile image to upload and preview.</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Support Workflow</Text>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
            <Text style={styles.stepText}>Describe the issue clearly (what happened + what you expected).</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
            <Text style={styles.stepText}>Include page name and device/platform (web/mobile).</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></View>
            <Text style={styles.stepText}>Use Contact Us page to submit the report and track updates.</Text>
          </View>
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
  topicRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
    backgroundColor: 'rgba(7, 187, 192, 0.08)',
    borderRadius: 12,
    padding: 10,
  },
  topicIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#36d6de',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicTextWrap: { flex: 1 },
  topicTitle: { color: '#eff9ff', fontSize: 14, fontWeight: '700' },
  topicDesc: { color: '#9ec0cf', fontSize: 12, lineHeight: 17, marginTop: 2 },
  paragraph: { color: '#9ec0cf', fontSize: 13, lineHeight: 20 },
  faqItem: {
    backgroundColor: 'rgba(7, 187, 192, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(53, 214, 222, 0.22)',
    padding: 10,
    marginBottom: 8,
  },
  faqQ: { color: '#ecfbff', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  faqA: { color: '#a9cddd', fontSize: 12, lineHeight: 18 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(7, 187, 192, 0.06)',
    borderRadius: 10,
    padding: 8,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#36d6de',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepBadgeText: { color: '#082033', fontSize: 12, fontWeight: '800' },
  stepText: { color: '#c0dcea', fontSize: 12, flex: 1, lineHeight: 17 },
});
