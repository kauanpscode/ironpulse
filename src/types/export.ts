import type {
  BodyMeasurement,
  CardioSession,
  Exercise,
  Routine,
  RoutineDay,
  RoutineExercise,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSet,
} from './domain';

export interface BackupPayload {
  app: 'IronPulse';
  schemaVersion: number;
  exportedAt: string;
  data: {
    exercises: Exercise[];
    routines: Routine[];
    routineDays: RoutineDay[];
    routineExercises: RoutineExercise[];
    workoutSessions: WorkoutSession[];
    workoutSessionExercises: WorkoutSessionExercise[];
    workoutSets: WorkoutSet[];
    bodyMeasurements: BodyMeasurement[];
    cardioSessions: CardioSession[];
  };
}

export interface CsvWorkoutRow {
  date: string;
  sessionTitle: string;
  exerciseName: string;
  muscleGroup: string;
  equipment: string;
  setOrder: number;
  setType: string;
  weightKg: number;
  weightMode: string;
  effectiveWeightKg: number;
  reps: number;
  rpe: string;
  rir: string;
  estimated1rmKg: number;
  volumeKg: number;
}
