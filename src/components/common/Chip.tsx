import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { hapticLight } from '../../utils';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accentColor?: string;
}

export function Chip({
  label,
  selected,
  onPress,
  accentColor = colors.primary,
}: ChipProps): React.JSX.Element {
  return (
    <Pressable
      onPress={() => {
        void hapticLight();
        onPress();
      }}
      style={[
        styles.chip,
        selected && {
          backgroundColor: accentColor,
          borderColor: accentColor,
        },
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.textInverse,
    fontWeight: '700',
  },
});
