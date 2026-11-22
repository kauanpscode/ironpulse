import type { MuscleGroup, RoutineDayWithExercises, WeightMode } from './domain';

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  workoutCount: number;
  cardioCount: number;
  totalTonnage: number;
  intensityLevel: 0 | 1 | 2 | 3 | 4;
}

export interface StreakSummary {
  currentStreak: number;
  bestStreak: number;
  totalWorkouts30d: number;
  totalWorkoutsAllTime: number;
  activeDaysThisWeek: number;
}

export type VolumeZoneStatus = 'under' | 'optimal' | 'high';

export interface WeeklyMuscleVolume {
  muscleGroup: MuscleGroup;
  validSets: number;
  targetMin: number;
  targetMax: number;
  status: VolumeZoneStatus;
  tonnage: number;
}

export interface NextWorkoutRecommendation {
  routineId: string;
  routineName: string;
  day: RoutineDayWithExercises;
  lastPerformedAt: string | null;
  daysSinceLast: number | null;
}

export interface ExerciseSessionStats {
  sessionId: string;
  sessionTitle: string;
  performedAt: string;
  maxEffectiveWeight: number;
  maxRawWeight: number;
  weightMode: WeightMode;
  bestEstimated1rm: number;
  totalVolume: number;
  validSetsCount: number;
  totalReps: number;
  avgRpe: number | null;
  topSetSummary: string;
  repMin: number;
  repMax: number;
  workingSetReps: number[];
}

export type ExerciseChartMetric = 'estimated1rm' | 'maxWeight' | 'totalVolume';

export interface PlateauDetection {
  isPlateau: boolean;
  stagnantSessions: number;
  referenceWeight: number;
  referenceReps: number;
  message: string;
}

export interface ProgressionSignal {
  isReadyToProgress: boolean;
  repMaxTarget: number;
  suggestedIncrementKg: number;
  currentWorkingWeight: number;
  suggestedNextWeight: number;
  message: string;
}

export interface ExerciseAnalyticsSummary {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sessions: ExerciseSessionStats[];
  best1rmAllTime: number;
  bestWeightAllTime: number;
  bestVolumeSessionAllTime: number;
  plateau: PlateauDetection;
  progression: ProgressionSignal;
}

export interface PRBadge {
  exerciseId: string;
  exerciseName: string;
  type: 'weight' | '1rm' | 'volume' | 'reps';
  label: string;
  value: number;
  previousBest: number | null;
  unit: string;
}

export interface PostWorkoutSummary {
  sessionId: string;
  title: string;
  durationSeconds: number;
  totalTonnage: number;
  totalValidSets: number;
  totalExercises: number;
  avgRpe: number | null;
  musclesTrained: MuscleGroup[];
  records: PRBadge[];
  previousSessionTonnage: number | null;
}

export type ReportPeriod = 'weekly' | 'monthly';

export interface MuscleTrainingRank {
  muscleGroup: MuscleGroup;
  validSets: number;
  tonnage: number;
}

export interface PeriodComparisonReport {
  period: ReportPeriod;
  periodLabel: string;
  currentTonnage: number;
  previousTonnage: number;
  tonnageDeltaPct: number | null;
  currentWorkouts: number;
  previousWorkouts: number;
  currentValidSets: number;
  previousValidSets: number;
  currentCardioMinutes: number;
  previousCardioMinutes: number;
  mostTrainedMuscles: MuscleTrainingRank[];
  leastTrainedMuscles: MuscleTrainingRank[];
  averageSessionMinutes: number;
}

export type BodyMetricKey =
  | 'weightKg'
  | 'bodyFatPct'
  | 'armCm'
  | 'chestCm'
  | 'waistCm'
  | 'thighCm';
