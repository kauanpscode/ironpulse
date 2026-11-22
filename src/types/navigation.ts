import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Routines: undefined;
  Analytics: undefined;
  BodyAndCardio: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  ActiveWorkout: {
    routineDayId?: string;
    sessionId?: string;
  };
  RoutineEditor: {
    routineId?: string;
  };
  ExerciseLibrary: {
    selectionMode?: boolean;
    onSelectKey?: string;
  };
  ExerciseDetail: {
    exerciseId: string;
  };
  ReportsExport: undefined;
  Account: undefined;
};
