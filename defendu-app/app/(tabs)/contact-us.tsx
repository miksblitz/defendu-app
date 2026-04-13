import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const SUPPORT_EMAIL = 'support@defendu.com';

export default function ContactUsPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');

  const submitSupport = () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert('Missing details', 'Please complete name, email, and message.');
      return;
    }
    Alert.alert(
      'Request sent',
      'Thanks for contacting DEFENDU. Our team will review your request and follow up soon.'
    );
    setName('');
    setEmail('');
    setTopic('');
    setMessage('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#dff7ff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Contact DEFENDU</Text>
          <Text style={styles.heroSubtitle}>
            Need help, have a bug report, or want to suggest a feature? Reach out and our team will respond.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Support Details</Text>

          <View style={styles.contactRowStatic}>
            <View style={[styles.iconWrap, styles.iconMail]}>
              <Ionicons name="mail-outline" size={20} color="#062232" />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.rowTitle}>Email Support</Text>
              <Text style={styles.rowDesc}>{SUPPORT_EMAIL}</Text>
            </View>
          </View>

          <View style={styles.contactRowStatic}>
            <View style={[styles.iconWrap, styles.iconHours]}>
              <Ionicons name="time-outline" size={20} color="#062232" />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.rowTitle}>Response Time</Text>
              <Text style={styles.rowDesc}>Usually within 24-48 hours (Mon-Fri).</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>How to Get Faster Help</Text>
          <Text style={styles.tip}>- Mention your account email</Text>
          <Text style={styles.tip}>- Include screenshots and steps to reproduce issues</Text>
          <Text style={styles.tip}>- Tell us your device and app platform (web / mobile)</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Send a Support Request</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#6e95a8"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Your email"
            placeholderTextColor="#6e95a8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Topic (optional)"
            placeholderTextColor="#6e95a8"
            value={topic}
            onChangeText={setTopic}
          />
          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Describe your concern..."
            placeholderTextColor="#6e95a8"
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity style={styles.submitBtn} onPress={submitSupport}>
            <Ionicons name="paper-plane-outline" size={16} color="#082033" style={{ marginRight: 6 }} />
            <Text style={styles.submitBtnText}>Submit Request</Text>
          </TouchableOpacity>
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
  contactRowStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 187, 192, 0.08)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconMail: { backgroundColor: '#36d6de' },
  iconHours: { backgroundColor: '#8be9bc' },
  textCol: { flex: 1, minWidth: 0 },
  rowTitle: { color: '#f3fcff', fontSize: 14, fontWeight: '700' },
  rowDesc: { color: '#9ec0cf', fontSize: 12, marginTop: 2 },
  tip: { color: '#9ec0cf', fontSize: 13, lineHeight: 19, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(53, 214, 222, 0.28)',
    backgroundColor: 'rgba(8, 33, 49, 0.95)',
    borderRadius: 10,
    color: '#e8f6fb',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  messageInput: {
    minHeight: 90,
  },
  submitBtn: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#36d6de',
    borderRadius: 10,
    paddingVertical: 11,
  },
  submitBtnText: {
    color: '#082033',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
