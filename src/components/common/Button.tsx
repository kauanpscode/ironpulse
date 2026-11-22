import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing } from '../../theme';
import { hapticLight } from '../../utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

const GRADIENT_MAP: Partial<Record<ButtonVariant, readonly [string, string]>> = {
  primary: ['#FB923C', '#EA580C'],
  secondary: ['#A3E635', '#65A30D'],
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  fullWidth = false,
}: ButtonProps): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (): void => {
    if (disabled || loading) return;
    Animated.spring(scale, {
      toValue: 0.965,
      useNativeDriver: true,
      speed: 45,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = (): void => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 35,
      bounciness: 6,
    }).start();
  };

  const handlePress = (): void => {
    if (disabled || loading) return;
    void hapticLight();
    onPress();
  };

  const gradientColors = GRADIENT_MAP[variant];

  const innerContent = loading ? (
    <ActivityIndicator
      size="small"
      color={
        variant === 'primary' || variant === 'secondary'
          ? colors.textInverse
          : colors.primary
      }
    />
  ) : (
    <View style={styles.content}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text
        style={[
          styles.label,
          styles[`label_${size}`],
          styles[`labelVariant_${variant}`],
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
  );

  return (
    <Animated.View
      style={[
        { transform: [{ scale }] },
        fullWidth && styles.fullWidth,
        variant === 'primary' && !disabled && styles.primaryGlow,
        style,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.pressable,
          fullWidth && styles.fullWidth,
          disabled && styles.disabled,
        ]}
      >
        {gradientColors ? (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.base, styles[`size_${size}`], fullWidth && styles.fullWidth]}
          >
            {innerContent}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.base,
              styles[`size_${size}`],
              styles[`variant_${variant}`],
              fullWidth && styles.fullWidth,
            ]}
          >
            {innerContent}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  base: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  primaryGlow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  size_sm: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  size_md: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  size_lg: {
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  variant_primary: {
    backgroundColor: colors.primary,
  },
  variant_secondary: {
    backgroundColor: colors.secondary,
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  variant_ghost: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  variant_danger: {
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  disabled: {
    opacity: 0.45,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    marginRight: spacing.sm,
  },
  label: {
    fontWeight: '800',
  },
  label_sm: {
    fontSize: 13,
  },
  label_md: {
    fontSize: 15,
  },
  label_lg: {
    fontSize: 16,
    letterSpacing: 0.2,
  },
  labelVariant_primary: {
    color: colors.textInverse,
  },
  labelVariant_secondary: {
    color: colors.textInverse,
  },
  labelVariant_outline: {
    color: colors.textPrimary,
  },
  labelVariant_ghost: {
    color: colors.textPrimary,
  },
  labelVariant_danger: {
    color: colors.danger,
  },
});
