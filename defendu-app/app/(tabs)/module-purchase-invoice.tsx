// app/(tabs)/module-purchase-invoice.tsx
// Receipt shown after a user spends credits to access a module.

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} – ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default function ModulePurchaseInvoicePage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    transactionId: string;
    moduleTitle: string;
    difficultyLevel: string;
    creditsDeducted: string;
    balanceAfter: string;
    createdAt: string;
    moduleId: string;
  }>();

  const creditsDeducted = Number(params.creditsDeducted ?? 0);
  const balanceAfter = Number(params.balanceAfter ?? 0);
  const createdAt = Number(params.createdAt ?? Date.now());
  const moduleTitle = params.moduleTitle ?? 'Module';
  const difficulty = params.difficultyLevel
    ? params.difficultyLevel.charAt(0).toUpperCase() + params.difficultyLevel.slice(1)
    : '—';
  const invoiceId = params.transactionId ?? '—';

  const rows: { label: string; value: string; highlight?: boolean }[] = [
    { label: 'Reference No.', value: invoiceId.slice(-10).toUpperCase() },
    { label: 'Date', value: formatDate(createdAt) },
    { label: 'Module', value: moduleTitle },
    { label: 'Difficulty', value: difficulty },
    { label: 'Credits Spent', value: `-${creditsDeducted.toLocaleString()} cr`, highlight: true },
    { label: 'Remaining Balance', value: `${balanceAfter.toLocaleString()} cr` },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="trophy" size={36} color="#fff" />
        </View>

        <Text style={styles.heading}>Module Unlocked!</Text>
        <Text style={styles.subheading}>Credits have been deducted from your wallet.</Text>

        {/* Receipt card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Purchase Receipt</Text>
          {rows.map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={[styles.rowValue, row.highlight && styles.rowValueHighlight]}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.doneBtn}
          activeOpacity={0.8}
          onPress={() => {
            if (params.moduleId) {
              router.replace({ pathname: '/(tabs)/view-module', params: { moduleId: params.moduleId } });
            } else {
              router.replace('/(tabs)/dashboard');
            }
          }}
        >
          <Text style={styles.doneBtnText}>Continue Training</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dashBtn}
          activeOpacity={0.8}
          onPress={() => router.replace('/(tabs)/dashboard')}
        >
          <Text style={styles.dashBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#041527',
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#09AEC3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heading: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subheading: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#07263d',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    marginBottom: 32,
  },
  cardTitle: {
    color: '#09AEC3',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  rowLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
  },
  rowValue: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  rowValueHighlight: {
    color: '#FF6B6B',
    fontSize: 15,
  },
  doneBtn: {
    backgroundColor: '#09AEC3',
    borderRadius: 30,
    paddingVertical: 14,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    marginBottom: 12,
  },
  doneBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  dashBtn: {
    borderWidth: 1,
    borderColor: '#09AEC3',
    borderRadius: 30,
    paddingVertical: 14,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  dashBtnText: {
    color: '#09AEC3',
    fontWeight: '600',
    fontSize: 16,
  },
});
