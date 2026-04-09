import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/** A single shimmering placeholder rectangle. */
export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: 'rgba(7,187,192,0.12)', opacity },
        style,
      ]}
    />
  );
}

/** Skeleton that looks like a module card. */
export function ModuleCardSkeleton({ cardWidth }: { cardWidth: number }) {
  return (
    <View style={[skeletonStyles.card, { width: cardWidth }]}>  
      <Skeleton width="100%" height={160} borderRadius={16} />
      <View style={skeletonStyles.cardBody}>
        <Skeleton width="60%" height={12} />
        <Skeleton width="90%" height={14} style={{ marginTop: 8 }} />
        <Skeleton width="40%" height={10} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

/** Row of module card skeletons. */
export function ModuleGridSkeleton({ columns, cardWidth }: { columns: number; cardWidth: number }) {
  return (
    <View style={skeletonStyles.grid}>
      {Array.from({ length: columns * 2 }).map((_, i) => (
        <ModuleCardSkeleton key={i} cardWidth={cardWidth} />
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    marginRight: 12,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(4,21,39,0.7)',
  },
  cardBody: {
    padding: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
