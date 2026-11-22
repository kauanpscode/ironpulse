import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  accentBorder?: string;
  padded?: boolean;
}

export function Card({
  children,
  style,
  elevated = false,
  accentBorder,
  padded = true,
}: CardProps): React.JSX.Element {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        padded && styles.padded,
        accentBorder ? { borderColor: accentBorder } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 3,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
  },
  padded: {
    padding: spacing.lg,
  },
});
