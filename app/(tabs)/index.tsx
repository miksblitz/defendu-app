import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TILE_ROWS = 8;
const TILE_COLS = 8;
const TILE_WIDTH = SCREEN_WIDTH / TILE_COLS;
const TILE_HEIGHT = SCREEN_HEIGHT / TILE_ROWS;

interface TileData {
  anim: Animated.Value;
  rotation: number;
  translateX: number;
  translateY: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const [tiles, setTiles] = useState<TileData[][]>([]);

  // Initialize tiles with random values
  useEffect(() => {
    const tileData: TileData[][] = [];
    for (let row = 0; row < TILE_ROWS; row++) {
      tileData[row] = [];
      for (let col = 0; col < TILE_COLS; col++) {
        tileData[row][col] = {
          anim: new Animated.Value(1),
          rotation: Math.random() * 360,
          translateX: (Math.random() - 0.5) * SCREEN_WIDTH * 1.5,
          translateY: (Math.random() - 0.5) * SCREEN_HEIGHT * 1.5,
        };
      }
    }
    setTiles(tileData);

    const startTilesTransition = (tileData: TileData[][]) => {
      const animations: Animated.CompositeAnimation[] = [];

      // Create staggered animations for each tile
      for (let row = 0; row < TILE_ROWS; row++) {
        for (let col = 0; col < TILE_COLS; col++) {
          const delay = (row * TILE_COLS + col) * 15; // Stagger delay in ms
          
          animations.push(
            Animated.timing(tileData[row][col].anim, {
              toValue: 0,
              duration: 400,
              delay: delay,
              useNativeDriver: true,
            })
          );
        }
      }

      // Start all animations in parallel
      Animated.parallel(animations).start(() => {
        // Wait 5 seconds after animation completes before navigating
        setTimeout(() => {
          router.push('/(auth)/login');
        }, 5000);
      });
    };

    // Start transition after 2 seconds
    const timer = setTimeout(() => {
      startTilesTransition(tileData);
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      {/* Logo Image */}
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/defendulogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Tiles overlay for transition effect */}
      {tiles.length > 0 && (
        <View style={styles.tilesContainer} pointerEvents="none">
          {tiles.map((row, rowIndex) =>
            row.map((tile, colIndex) => (
              <Animated.View
                key={`${rowIndex}-${colIndex}`}
                style={[
                  styles.tile,
                  {
                    left: colIndex * TILE_WIDTH,
                    top: rowIndex * TILE_HEIGHT,
                    opacity: tile.anim,
                    transform: [
                      {
                        scale: tile.anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1],
                        }),
                      },
                      {
                        rotate: tile.anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [`${tile.rotation}deg`, '0deg'],
                        }),
                      },
                      {
                        translateX: tile.anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [tile.translateX, 0],
                        }),
                      },
                      {
                        translateY: tile.anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [tile.translateY, 0],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Black background to match logo
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '90%',
    height: '90%',
    maxWidth: 400,
    maxHeight: 400,
  },
  tilesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  tile: {
    position: 'absolute',
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    backgroundColor: '#000000',
  },
});