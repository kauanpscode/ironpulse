import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { formatDurationClock } from '../../utils';
import type { RestTimerState } from '../../context';
import { AnimatedProgressBar, PulseDot } from '../common';

interface RestTimerBarProps {
  timer: RestTimerState;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
}

export function RestTimerBar({
  timer,
  onAdjust,
  onSkip,
}: RestTimerBarProps): React.JSX.Element | null {
  if (!timer.isRunning) return null;

  const progress =
    timer.totalSeconds > 0
      ? Math.max(0, Math.min(1, timer.remainingSeconds / timer.totalSeconds))
      : 0;

  return (
    <View style={styles.container}>
      <AnimatedProgressBar
        progress={progress}
        color={colors.primary}
        height={4}
        trackColor={colors.surfaceElevated}
        duration={250}
      />

      <View style={styles.body}>
        <View style={styles.left}>
          <View style={styles.clockRow}>
            <PulseDot color={colors.primary} size={7} />
            <Text style={styles.clockText}>
              {formatDurationClock(timer.remainingSeconds)}
            </Text>
          </View>
          <Text style={styles.subText} numberOfLines={1}>
            Descanso • {timer.exerciseName}
          </Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={() => onAdjust(-15)}
            style={({ pressed }) => [styles.ctrlBtn, pressed && styles.pressed]}
          >
            <Text style={styles.ctrlLabel}>-15s</Text>
          </Pressable>
          <Pressable
            onPress={() => onAdjust(15)}
            style={({ pressed }) => [styles.ctrlBtn, pressed && styles.pressed]}
          >
            <Text style={styles.ctrlLabel}>+15s</Text>
          </Pressable>
          <Pressable
            onPress={onSkip}
            style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
          >
            <Text style={styles.skipLabel}>Pular</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1B1918',
    borderTopWidth: 1,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  left: {
    flex: 1,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clockText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  subText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ctrlBtn: {
    minWidth: 50,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  ctrlLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  skipBtn: {
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  skipLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textInverse,
  },
  pressed: {
    opacity: 0.75,
  },
});
