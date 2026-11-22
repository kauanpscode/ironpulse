import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, radii } from '../../theme';

interface AnimatedProgressBarProps {
  progress: number; // 0..1
  color: string;
  height?: number;
  trackColor?: string;
  idealStartPct?: number;
  idealWidthPct?: number;
  duration?: number;
}

export function AnimatedProgressBar({
  progress,
  color,
  height = 9,
  trackColor = colors.surfaceElevated,
  idealStartPct,
  idealWidthPct,
  duration = 420,
}: AnimatedProgressBarProps): React.JSX.Element {
  const clamped = Math.max(0, Math.min(1, progress));
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: clamped,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animVal, clamped, duration]);

  const widthInterpolated = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }]}>
      {idealStartPct !== undefined && idealWidthPct !== undefined ? (
        <View
          style={[
            styles.idealZone,
            {
              left: `${idealStartPct}%`,
              width: `${idealWidthPct}%`,
            },
          ]}
        />
      ) : null}
      <Animated.View
        style={[
          styles.fill,
          {
            width: widthInterpolated,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: radii.pill,
    overflow: 'hidden',
    position: 'relative',
  },
  idealZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(132, 204, 22, 0.14)',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(132, 204, 22, 0.35)',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
});
