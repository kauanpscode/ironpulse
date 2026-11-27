import React from 'react';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context';
import {
  AccountScreen,
  ActiveWorkoutScreen,
  AnalyticsScreen,
  BodyAndCardioScreen,
  ExerciseDetailScreen,
  ExerciseLibraryScreen,
  HomeScreen,
  LoginScreen,
  RegisterScreen,
  ReportsExportScreen,
  RoutineEditorScreen,
  RoutinesScreen,
} from '../screens';
import { colors } from '../theme';
import type {
  AuthStackParamList,
  MainTabParamList,
  RootStackParamList,
} from '../types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const APP_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.primary,
  },
};

function AuthNavigator(): React.JSX.Element {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade_from_bottom',
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(8, insets.bottom);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#131316',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + bottomPad,
          paddingTop: 6,
          paddingBottom: bottomPad,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'flame';
          if (route.name === 'Home') {
            iconName = focused ? 'flame' : 'flame-outline';
          } else if (route.name === 'Routines') {
            iconName = focused ? 'barbell' : 'barbell-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'BodyAndCardio') {
            iconName = focused ? 'body' : 'body-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Painel' }}
      />
      <Tab.Screen
        name="Routines"
        component={RoutinesScreen}
        options={{ title: 'Fichas' }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Evolução' }}
      />
      <Tab.Screen
        name="BodyAndCardio"
        component={BodyAndCardioScreen}
        options={{ title: 'Corpo' }}
      />
    </Tab.Navigator>
  );
}

function AuthenticatedNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 16 },
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ActiveWorkout"
        component={ActiveWorkoutScreen}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="RoutineEditor"
        component={RoutineEditorScreen}
        options={{ title: 'Editor de Ficha' }}
      />
      <Stack.Screen
        name="ExerciseLibrary"
        component={ExerciseLibraryScreen}
        options={{ title: 'Biblioteca de Exercícios' }}
      />
      <Stack.Screen
        name="ExerciseDetail"
        component={ExerciseDetailScreen}
        options={{ title: 'Evolução do Exercício' }}
      />
      <Stack.Screen
        name="ReportsExport"
        component={ReportsExportScreen}
        options={{ title: 'Relatórios & Exportação' }}
      />
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{ title: 'Minha Conta' }}
      />
    </Stack.Navigator>
  );
}

export function AppNavigator(): React.JSX.Element {
  const { user } = useAuth();
  return (
    <NavigationContainer theme={APP_THEME}>
      {user ? <AuthenticatedNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
