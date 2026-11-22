export const TRAINING_GOALS = [
  'Hipertrofia',
  'Força',
  'Recomposição',
  'Condicionamento',
] as const;

export type TrainingGoal = (typeof TRAINING_GOALS)[number];

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  goal: TrainingGoal;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  goal: TrainingGoal;
  includeStarterRoutines: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  name: string;
  goal: TrainingGoal;
}
