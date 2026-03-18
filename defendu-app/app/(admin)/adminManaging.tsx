import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Image,
    ImageBackground,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLogout } from '../../hooks/useLogout';

const adminCards = [
  {
    id: 1,
    label: 'Manage Trainer Applications',
    route: '/trainer-applications',
    image: require('../../assets/images/managetrainerapplicationpic.png'),
  },
  {
    id: 2,
    label: 'Manage Users',
    route: '/manage-users',
    image: require('../../assets/images/manageuserpic.png'),
  },
  {
    id: 3,
    label: 'Manage Modules',
    route: '/modules',
    image: require('../../assets/images/managemodulepic.png'),
  },
];

export default function AdminManaging() {
  const router = useRouter();
  const handleLogout = useLogout();
  const [showMenu, setShowMenu] = useState(false);
  
  // Animation refs
  const headerAnim = useRef(new Animated.Value(0)).current;
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card3Anim = useRef(new Animated.Value(0)).current;
  const card1Scale = useRef(new Animated.Value(1)).current;
  const card2Scale = useRef(new Animated.Value(1)).current;
  const card3Scale = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.stagger(150, [
        Animated.timing(card1Anim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(card2Anim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(card3Anim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);
  
  const handleCardHover = (scale: Animated.Value, isHovering: boolean) => {
    Animated.spring(scale, {
      toValue: isHovering ? 1.08 : 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  const handleCardPress = (route: string) => {
    if (route === '/manage-users') {
      router.push('/(admin)/manage-users');
    } else if (route === '/trainer-applications') {
      router.push('/(admin)/manage-trainers');
    } else if (route === '/modules') {
      router.push('/(admin)/manage-modules');
    } else {
      console.log('Navigate to:', route);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Left Navigation Bar */}
        <View style={styles.leftNavBar}>
          {/* Hamburger Menu */}
          <TouchableOpacity 
            style={styles.navMenuButton}
            onPress={() => setShowMenu(true)}
          >
            <Ionicons name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          {/* Bottom Icons - One Box */}
          <View style={styles.navBottomIcons}>
            <View style={styles.navIconsBox}>
              <TouchableOpacity 
                style={styles.navIconActiveButton}
                onPress={() => {}}
                disabled={true}
              >
                <Image
                  source={require('../../assets/images/adminmanageicon.png')}
                  style={styles.navIconImage}
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => router.push('/(admin)/adminDashboard')}
              >
                <Image
                  source={require('../../assets/images/homeicon.png')}
                  style={styles.navIconImage}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Header with DEFENDU Logo and Admin */}
        <Animated.View style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [{
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            }],
          },
        ]}>
          <View style={styles.headerContent}>
            <Image
              source={require('../../assets/images/defendudashboardlogo.png')}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
            <Text style={styles.headerAdminText}>Admin</Text>
          </View>
        </Animated.View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Cards Section */}
          <View style={styles.cardsWrapper}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsContainer}
              style={styles.cardsScrollView}
            >
            {adminCards.map((card, index) => {
              const cardAnims = [card1Anim, card2Anim, card3Anim];
              const cardScales = [card1Scale, card2Scale, card3Scale];
              const animValue = cardAnims[index];
              const scaleValue = cardScales[index];
              
              return (
                <Animated.View
                  key={card.id}
                  style={[
                    {
                      opacity: animValue,
                      transform: [
                        {
                          translateY: animValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [50, 0],
                          }),
                        },
                        {
                          scale: Animated.multiply(animValue, scaleValue),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.card}
                    onPress={() => handleCardPress(card.route)}
                    onPressIn={() => handleCardHover(scaleValue, true)}
                    onPressOut={() => handleCardHover(scaleValue, false)}
                    activeOpacity={0.9}
                  >
                    <ImageBackground
                      source={card.image}
                      style={styles.cardBackground}
                      imageStyle={styles.cardBackgroundImage}
                    >
                      <View style={styles.cardOverlay}>
                        <View style={styles.cardLabelContainer}>
                          <Text style={styles.cardLabel}>{card.label}</Text>
                        </View>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Pop-up Menu */}
      {showMenu && (
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => { setShowMenu(false); handleLogout(); }}
            >
              <Image
                source={require('../../assets/images/logouticon.png')}
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b1625',
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  leftNavBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#000E1C',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 30,
    zIndex: 10,
  },
  navMenuButton: {
    padding: 12,
    cursor: 'pointer',
  },
  navBottomIcons: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  navIconsBox: {
    backgroundColor: 'rgba(56, 166, 222, 0.1)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 166, 222, 0.2)',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
  },
  navIconImage: {
    width: 28,
    height: 28,
    tintColor: '#38a6de',
    resizeMode: 'contain',
  },
  navIconActiveButton: {
    backgroundColor: '#024446',
    borderRadius: 8,
    padding: 8,
    width: '100%',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 100,
    paddingRight: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'column',
  },
  headerLogoImage: {
    width: 180,
    height: 60,
    marginBottom: 4,
  },
  headerAdminText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    paddingLeft: 100,
    paddingRight: 20,
    paddingTop: 20,
  },
  cardsWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsScrollView: {
    flexGrow: 0,
  },
  cardsContainer: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  card: {
    width: 300,
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 20,
    cursor: 'pointer',
  },
  cardBackground: {
    width: '100%',
    height: '100%',
  },
  cardBackgroundImage: {
    resizeMode: 'cover',
  },
  cardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 22, 37, 0.7)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 12,
  },
  cardLabelContainer: {
    backgroundColor: 'rgba(51, 51, 51, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 0,
  },
  cardLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'system-ui',
    letterSpacing: 0.3,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 14, 28, 0.75)',
  },
  menuContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: '#000E1C',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#6b8693',
    paddingVertical: 10,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    cursor: 'pointer',
  },
  menuIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    resizeMode: 'contain',
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
