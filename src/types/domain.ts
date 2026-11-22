export type SyncStatus = 'synced' | 'pending' | 'conflict';

export interface SyncMetadata {
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export const MUSCLE_GROUPS = [
  'Peito',
  'Costas',
  'Quadríceps',
  'Posteriores',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Panturrilhas',
  'Abdômen',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT_TYPES = [
  'Barra',
  'Halter',
  'Polia',
  'Máquina',
  'Peso Corporal',
] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const SPLIT_TYPES = [
  'Upper/Lower',
  'PPL',
  'ABC',
  'Full Body',
  'Custom',
] as const;

export type SplitType = (typeof SPLIT_TYPES)[number];

export type WeightMode = 'total' | 'per_side';

export type SetType = 'W' | 'N' | 'D' | 'F';

export type WorkoutStatus = 'in_progress' | 'completed' | 'cancelled';

export const CARDIO_MODALITIES = [
  'Corrida',
  'Bike',
  'Escada',
  'Caminhada Inclinada',
  'Elíptico',
  'HIIT',
  'Remo',
] as const;

export type CardioModality = (typeof CARDIO_MODALITIES)[number];

export const CARDIO_INTENSITIES = ['Leve', 'Moderada', 'Alta'] as const;

export type CardioIntensity = (typeof CARDIO_INTENSITIES)[number];

export interface Exercise extends SyncMetadata {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentType;
  defaultWeightMode: WeightMode;
  isCustom: boolean;
  notes: string;
}

export interface CreateExerciseInput {
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  equipment: EquipmentType;
  defaultWeightMode?: WeightMode;
  notes?: string;
}

export interface Routine extends SyncMetadata {
  id: string;
  name: string;
  splitType: SplitType;
  description: string;
  isActive: boolean;
}

export interface RoutineDay extends SyncMetadata {
  id: string;
  routineId: string;
  name: string;
  dayOrder: number;
  focusMuscles: MuscleGroup[];
  estimatedMinutes: number;
}

export interface RoutineExercise extends SyncMetadata {
  id: string;
  routineDayId: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  weightMode: WeightMode;
  notes: string;
}

export interface RoutineExerciseWithDetails extends RoutineExercise {
  exercise: Exercise;
}

export interface RoutineDayWithExercises extends RoutineDay {
  exercises: RoutineExerciseWithDetails[];
}

export interface RoutineWithDays extends Routine {
  days: RoutineDayWithExercises[];
}

export interface WorkoutSession extends SyncMetadata {
  id: string;
  routineId: string | null;
  routineDayId: string | null;
  title: string;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number;
  totalTonnage: number;
  totalValidSets: number;
  notes: string;
  status: WorkoutStatus;
}

export interface WorkoutSessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  originalExerciseId: string | null;
  routineExerciseId: string | null;
  orderIndex: number;
  targetSets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  notes: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSet {
  id: string;
  sessionId: string;
  sessionExerciseId: string;
  exerciseId: string;
  setOrder: number;
  setType: SetType;
  weight: number;
  weightMode: WeightMode;
  effectiveWeight: number;
  reps: number;
  rpe: number | null;
  rir: number | null;
  completed: boolean;
  completedAt: string | null;
  estimated1rm: number;
  volume: number;
  isPrWeight: boolean;
  isPr1rm: boolean;
  isPrVolume: boolean;
  isPrReps: boolean;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GhostSetReference {
  setOrder: number;
  weight: number;
  weightMode: WeightMode;
  effectiveWeight: number;
  reps: number;
  rpe: number | null;
  setType: SetType;
  performedAt: string;
}

export interface ActiveSessionExercise extends WorkoutSessionExercise {
  exercise: Exercise;
  originalExerciseName: string | null;
  sets: WorkoutSet[];
  ghostSets: GhostSetReference[];
}

export interface ActiveWorkoutFull {
  session: WorkoutSession;
  exercises: ActiveSessionExercise[];
}

export interface BodyMeasurement extends SyncMetadata {
  id: string;
  measuredAt: string;
  weightKg: number;
  bodyFatPct: number | null;
  armCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  thighCm: number | null;
  notes: string;
}

export interface CreateBodyMeasurementInput {
  measuredAt: string;
  weightKg: number;
  bodyFatPct?: number | null;
  armCm?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  thighCm?: number | null;
  notes?: string;
}

export interface CardioSession extends SyncMetadata {
  id: string;
  performedAt: string;
  modality: CardioModality;
  durationMinutes: number;
  distanceKm: number | null;
  intensity: CardioIntensity;
  caloriesEst: number | null;
  notes: string;
}

export interface CreateCardioSessionInput {
  performedAt: string;
  modality: CardioModality;
  durationMinutes: number;
  distanceKm?: number | null;
  intensity: CardioIntensity;
  caloriesEst?: number | null;
  notes?: string;
}
