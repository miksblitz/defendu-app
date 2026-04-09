// app/(tabs)/top-up.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { getExpoApiBaseUrl } from '../../constants/apiBaseUrl';
import { formatCredits, formatPHP, TOP_UP_PACKAGES } from '../../constants/credits';
import { PaymentMethod, TopUpPackage } from '../_models/Wallet';
import { WalletController } from '../controllers/WalletController';

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string; color: string }[] = [
  { id: 'gcash', label: 'GCash', icon: 'phone-portrait-outline', color: '#007DFE' },
  { id: 'maya', label: 'Maya', icon: 'card-outline', color: '#2FC86E' },
  { id: 'card', label: 'Credit/Debit Card', icon: 'card-outline', color: '#FF9800' },
];

export default function TopUpPage() {
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState<TopUpPackage | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [balance, setBalance] = useState(0);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    WalletController.getWallet()
      .then(w => setBalance(w.balance))
      .catch(e => console.error('Error loading wallet:', e));
  }, []);

  const handlePurchase = async () => {
    if (!selectedPackage || !selectedPayment) return;

    try {
      setProcessing(true);

      const apiBaseUrl = getExpoApiBaseUrl();
      const { currentUser } = await import('../config/firebaseConfig').then(m => m.auth);
      if (!currentUser) throw new Error('Not authenticated');

      const response = await fetch(`${apiBaseUrl}/api/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          credits: selectedPackage.credits,
          pricePHP: selectedPackage.pricePHP,
          paymentMethod: selectedPayment,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create payment');
      }

      const { checkoutUrl } = await response.json();

      // Open payment checkout in browser
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(checkoutUrl, '_blank', 'noopener');
      } else {
        await Linking.openURL(checkoutUrl);
      }

      // Show info alert
      const infoMsg = 'Complete the payment in the opened window. Your credits will be added automatically after successful payment.';
      if (Platform.OS === 'web') {
        window.alert(infoMsg);
      } else {
        Alert.alert('Payment Opened', infoMsg);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      const errMsg = error.message || 'Failed to initiate payment. Please try again.';
      if (Platform.OS === 'web') {
        window.alert(errMsg);
      } else {
        Alert.alert('Error', errMsg);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#07bbc0" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Top Up Credits</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Current balance */}
        <View style={styles.balanceBanner}>
          <Ionicons name="wallet-outline" size={20} color="#07bbc0" />
          <Text style={styles.balanceText}>Current Balance: </Text>
          <Text style={styles.balanceValue}>{formatCredits(balance)}</Text>
        </View>

        {/* Step 1: Select Package */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.stepNumber}>1 </Text>
            Select Package
          </Text>
          <View style={styles.packagesGrid}>
            {TOP_UP_PACKAGES.map(pkg => (
              <TouchableOpacity
                key={pkg.id}
                style={[
                  styles.packageCard,
                  selectedPackage?.id === pkg.id && styles.packageSelected,
                  pkg.popular && styles.packagePopular,
                ]}
                onPress={() => setSelectedPackage(pkg)}
                activeOpacity={0.7}
              >
                {pkg.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>BEST VALUE</Text>
                  </View>
                )}
                <Text style={styles.packageCredits}>{pkg.credits.toLocaleString()}</Text>
                <Text style={styles.packageCreditsLabel}>credits</Text>
                <Text style={styles.packagePrice}>{formatPHP(pkg.pricePHP)}</Text>
                {pkg.pricePHP < pkg.credits && (
                  <Text style={styles.packageSave}>
                    Save {Math.round((1 - pkg.pricePHP / pkg.credits) * 100)}%
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Step 2: Select Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.stepNumber}>2 </Text>
            Payment Method
          </Text>
          <View style={styles.card}>
            {PAYMENT_METHODS.map((pm, idx) => (
              <React.Fragment key={pm.id}>
                {idx > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={[
                    styles.paymentRow,
                    selectedPayment === pm.id && styles.paymentSelected,
                  ]}
                  onPress={() => setSelectedPayment(pm.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.paymentIcon, { backgroundColor: pm.color + '18' }]}>
                    <Ionicons name={pm.icon as any} size={22} color={pm.color} />
                  </View>
                  <Text style={styles.paymentLabel}>{pm.label}</Text>
                  <View style={[
                    styles.radioOuter,
                    selectedPayment === pm.id && styles.radioOuterActive,
                  ]}>
                    {selectedPayment === pm.id && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Summary & Pay */}
        {selectedPackage && selectedPayment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.card}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Credits</Text>
                <Text style={styles.summaryValue}>{formatCredits(selectedPackage.credits)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Payment</Text>
                <Text style={styles.summaryValue}>
                  {PAYMENT_METHODS.find(p => p.id === selectedPayment)?.label}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { fontWeight: '700', color: '#fff' }]}>Total</Text>
                <Text style={[styles.summaryValue, { color: '#07bbc0', fontSize: 18 }]}>
                  {formatPHP(selectedPackage.pricePHP)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.payButton,
            (!selectedPackage || !selectedPayment || processing) && styles.payButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={!selectedPackage || !selectedPayment || processing}
          activeOpacity={0.8}
        >
          {processing ? (
            <ActivityIndicator color="#041527" size="small" />
          ) : (
            <>
              <Ionicons name="flash" size={20} color="#041527" />
              <Text style={styles.payButtonText}>
                {selectedPackage
                  ? `Pay ${formatPHP(selectedPackage.pricePHP)}`
                  : 'Select a package'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          One-time purchase. Credits never expire.{'\n'}
          Powered by PayMongo. Secure payment processing.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#041527' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 24, paddingTop: 10,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(7, 187, 192, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  // Balance banner
  balanceBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(7, 187, 192, 0.08)',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
    marginBottom: 24, gap: 6,
    borderWidth: 1, borderColor: 'rgba(7, 187, 192, 0.15)',
  },
  balanceText: { color: '#6b8693', fontSize: 14, fontWeight: '500' },
  balanceValue: { color: '#07bbc0', fontSize: 16, fontWeight: '700' },
  // Sections
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#07bbc0',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12, marginLeft: 4,
  },
  stepNumber: { fontSize: 16, fontWeight: '700' },
  // Packages grid
  packagesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  packageCard: {
    backgroundColor: 'rgba(7, 187, 192, 0.05)',
    borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: 'rgba(7, 187, 192, 0.1)',
    alignItems: 'center', minWidth: '30%', flex: 1,
  },
  packageSelected: {
    borderColor: '#07bbc0',
    backgroundColor: 'rgba(7, 187, 192, 0.12)',
  },
  packagePopular: {
    borderColor: 'rgba(255, 152, 0, 0.5)',
  },
  popularBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
    marginBottom: 8,
  },
  popularText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  packageCredits: { color: '#fff', fontSize: 28, fontWeight: '700' },
  packageCreditsLabel: { color: '#6b8693', fontSize: 11, marginBottom: 6 },
  packagePrice: { color: '#07bbc0', fontSize: 16, fontWeight: '700' },
  packageSave: { color: '#4CAF50', fontSize: 11, fontWeight: '600', marginTop: 4 },
  // Card & rows
  card: {
    backgroundColor: 'rgba(7, 187, 192, 0.05)',
    borderRadius: 16, padding: 4,
    borderWidth: 1, borderColor: 'rgba(7, 187, 192, 0.1)',
  },
  divider: { height: 1, backgroundColor: 'rgba(107, 134, 147, 0.15)', marginHorizontal: 16 },
  // Payment method rows
  paymentRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
    borderRadius: 12,
  },
  paymentSelected: {
    backgroundColor: 'rgba(7, 187, 192, 0.08)',
  },
  paymentIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  paymentLabel: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(107,134,147,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: '#07bbc0' },
  radioInner: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#07bbc0',
  },
  // Summary
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16,
  },
  summaryLabel: { color: '#6b8693', fontSize: 14, fontWeight: '500' },
  summaryValue: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // Pay button
  payButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#07bbc0', borderRadius: 16, paddingVertical: 16,
    gap: 8, marginTop: 8,
  },
  payButtonDisabled: { opacity: 0.4 },
  payButtonText: { color: '#041527', fontSize: 17, fontWeight: '600' },
  disclaimer: {
    textAlign: 'center', color: '#6b8693', fontSize: 12,
    marginTop: 16, lineHeight: 18,
  },
});
