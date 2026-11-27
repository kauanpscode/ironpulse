import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import {
  ActiveWorkoutProvider,
  AppProvider,
  AuthProvider,
  useAppContext,
  useAuth,
} from './src/context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors, spacing, typography } from './src/theme';

function AuthGate(): React.JSX.Element {
  const { isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.brand}>IRONPULSE</Text>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.spinner}
        />
        <Text style={styles.loadingText}>Verificando sessão...</Text>
      </View>
    );
  }

  return (
    <ActiveWorkoutProvider>
      <AppNavigator />
    </ActiveWorkoutProvider>
  );
}

function RootContent(): React.JSX.Element {
  const { isReady, initError } = useAppContext();

  if (initError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Erro ao iniciar banco local</Text>
        <Text style={styles.errorSub}>{initError}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.center}>
        <Image
          source={require('./assets/icon.png')}
          style={styles.bootIcon}
          resizeMode="cover"
        />
        <Text style={styles.brand}>IRONPULSE</Text>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.spinner}
        />
        <Text style={styles.loadingText}>
          Preparando seus treinos offline...
        </Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

export default function App(): React.JSX.Element {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <RootContent />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  bootIcon: {
    width: 84,
    height: 84,
    borderRadius: 24,
    marginBottom: spacing.md,
  },
  brand: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.primary,
  },
  spinner: {
    marginVertical: spacing.lg,
  },
  loadingText: {
    ...typography.caption,
    textAlign: 'center',
  },
  errorTitle: {
    ...typography.title,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  errorSub: {
    ...typography.caption,
    textAlign: 'center',
  },
});
