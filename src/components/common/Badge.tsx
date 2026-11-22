import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}

const TONE_MAP: Record<BadgeTone, { bg: string; fg: string }> = {
  primary: { bg: colors.primaryMuted, fg: colors.primary },
  success: { bg: colors.successMuted, fg: colors.success },
  warning: { bg: colors.warningMuted, fg: colors.warning },
  danger: { bg: colors.dangerMuted, fg: colors.danger },
  info: { bg: colors.infoMuted, fg: colors.info },
  purple: { bg: colors.purpleMuted, fg: colors.purple },
  neutral: { bg: colors.surfaceElevated, fg: colors.textSecondary },
};

export function Badge({ label, tone = 'neutral', style }: BadgeProps): React.JSX.Element {
  const palette = TONE_MAP[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, style]}>
      <Text style={[styles.text, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
