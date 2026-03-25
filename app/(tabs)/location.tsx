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
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AuthController } from '../_controllers/AuthController';

export default function LocationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [initialCity, setInitialCity] = useState('');
  const [initialCountry, setInitialCountry] = useState('');
  const [initialAddress, setInitialAddress] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);

  useEffect(() => {
    const loadLocation = async () => {
      try {
        const user = await AuthController.getCurrentUser();
        if (!user) {
          router.replace('/(auth)/login');
          return;
        }

        // Load structured location from Firebase
        const loc = await AuthController.loadUserLocation();
        setAddress(loc.address);
        setCity(loc.city);
        setCountry(loc.country);
        setInitialAddress(loc.address);
        setInitialCity(loc.city);
        setInitialCountry(loc.country);
      } catch (e) {
        console.error('Error loading location:', e);
      } finally {
        setLoading(false);
      }
    };
    loadLocation();
  }, []);

  const hasChanges = city !== initialCity || country !== initialCountry || address !== initialAddress;

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    try {
      if (Platform.OS === 'web' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
              );
              const data = await response.json();
              if (data.address) {
                setCity(data.address.city || data.address.town || data.address.village || '');
                setCountry(data.address.country || '');
                setAddress(data.address.road ? `${data.address.house_number || ''} ${data.address.road}`.trim() : '');
              }
            } catch (e) {
              console.error('Reverse geocoding error:', e);
              showAlert('Error', 'Could not determine your address. Please enter it manually.');
            } finally {
              setDetectingLocation(false);
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            showAlert('Location Error', 'Could not access your location. Please check browser permissions and try again.');
            setDetectingLocation(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        showAlert('Not Supported', 'Location detection is not supported on this device. Please enter your location manually.');
        setDetectingLocation(false);
      }
    } catch (e) {
      console.error('Location detection error:', e);
      setDetectingLocation(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSave = async () => {
    if (!city.trim() && !country.trim() && !address.trim()) {
      showAlert('Missing Info', 'Please enter at least a city or country.');
      return;
    }

    setSaving(true);
    try {
      // Save structured location to Firebase
      await AuthController.saveUserLocation({
        address: address.trim(),
        city: city.trim(),
        country: country.trim(),
      });
      setInitialCity(city);
      setInitialCountry(country);
      setInitialAddress(address);
      showAlert('Saved', 'Your location has been updated successfully.');
    } catch (e) {
      console.error('Error saving location:', e);
      showAlert('Error', 'Could not save your location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenMap = () => {
    const query = [address, city, country].filter(Boolean).join(', ');
    if (query) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        Linking.openURL(url);
      }
    } else {
      showAlert('No Location', 'Please enter a location first.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#07bbc0" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#07bbc0" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Location</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Detect Location */}
        <TouchableOpacity
          style={styles.detectButton}
          onPress={handleDetectLocation}
          disabled={detectingLocation}
        >
          {detectingLocation ? (
            <ActivityIndicator size="small" color="#041527" />
          ) : (
            <Ionicons name="navigate-outline" size={20} color="#041527" />
          )}
          <Text style={styles.detectButtonText}>
            {detectingLocation ? 'Detecting...' : 'Detect My Location'}
          </Text>
        </TouchableOpacity>

        {/* Location Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Location</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Street Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="home-outline" size={18} color="#6b8693" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="e.g. 123 Main St"
                  placeholderTextColor="#4a6070"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>City</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="business-outline" size={18} color="#6b8693" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Manila"
                  placeholderTextColor="#4a6070"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Country</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="globe-outline" size={18} color="#6b8693" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={country}
                  onChangeText={setCountry}
                  placeholder="e.g. Philippines"
                  placeholderTextColor="#4a6070"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Map Preview */}
        {(city || country || address) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Map</Text>
            <TouchableOpacity style={styles.mapCard} onPress={handleOpenMap}>
              <Ionicons name="map-outline" size={32} color="#07bbc0" />
              <Text style={styles.mapText}>
                {[address, city, country].filter(Boolean).join(', ')}
              </Text>
              <Text style={styles.mapSubtext}>Tap to open in Google Maps</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Nearby Trainers Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Set Your Location?</Text>
          <View style={styles.card}>
            <View style={styles.benefitRow}>
              <Ionicons name="people-outline" size={22} color="#07bbc0" />
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Find Nearby Trainers</Text>
                <Text style={styles.benefitDesc}>Discover trainers in your area for in-person sessions</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.benefitRow}>
              <Ionicons name="location-outline" size={22} color="#07bbc0" />
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Local Training Groups</Text>
                <Text style={styles.benefitDesc}>Connect with other learners near you</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.benefitRow}>
              <Ionicons name="calendar-outline" size={22} color="#07bbc0" />
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Event Recommendations</Text>
                <Text style={styles.benefitDesc}>Get notified about self-defense events nearby</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, (!hasChanges || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Location'}</Text>
        </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07bbc0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 10,
  },
  detectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#041527',
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b8693',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 14, 28, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(107, 134, 147, 0.3)',
  },
  inputIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  mapCard: {
    backgroundColor: 'rgba(7, 187, 192, 0.05)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(7, 187, 192, 0.15)',
    alignItems: 'center',
    gap: 8,
  },
  mapText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 4,
  },
  mapSubtext: {
    fontSize: 13,
    color: '#07bbc0',
    fontWeight: '500',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    gap: 14,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  benefitDesc: {
    fontSize: 13,
    color: '#6b8693',
    marginTop: 2,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(107, 134, 147, 0.15)',
    marginHorizontal: 12,
  },
  saveButton: {
    backgroundColor: '#07bbc0',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#041527',
  },
});
