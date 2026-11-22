import type {
  ExerciseSessionStats,
  PlateauDetection,
  ProgressionSignal,
  SetType,
  VolumeZoneStatus,
  WeightMode,
} from '../types';

export const HYPERTROPHY_WEEKLY_SETS_MIN = 10;
export const HYPERTROPHY_WEEKLY_SETS_MAX = 20;

/**
 * Computes real effective weight moved.
 * If weightMode === 'per_side', multiplies by 2 (e.g., 16kg dumbbell per hand = 32kg total).
 */
export function computeEffectiveWeight(weight: number, weightMode: WeightMode): number {
  const safeWeight = Number.isFinite(weight) && weight > 0 ? weight : 0;
  return weightMode === 'per_side' ? round2(safeWeight * 2) : round2(safeWeight);
}

/**
 * Computes set volume (tonnage): effectiveWeight * reps.
 */
export function computeSetVolume(
  weight: number,
  weightMode: WeightMode,
  reps: number
): number {
  const effective = computeEffectiveWeight(weight, weightMode);
  const safeReps = Number.isFinite(reps) && reps > 0 ? reps : 0;
  return round2(effective * safeReps);
}

/**
 * Epley 1RM formula: weight * (1 + reps / 30).
 * For 1 rep, returns weight directly.
 */
export function computeEpley1RM(effectiveWeight: number, reps: number): number {
  if (effectiveWeight <= 0 || reps <= 0) {
    return 0;
  }
  if (reps === 1) {
    return round2(effectiveWeight);
  }
  return round2(effectiveWeight * (1 + reps / 30));
}

/**
 * Returns true if the set counts as a valid hypertrophy working set (not warm-up).
 */
export function isWorkingSet(setType: SetType): boolean {
  return setType !== 'W';
}

export function classifyVolumeZone(
  validSets: number,
  targetMin = HYPERTROPHY_WEEKLY_SETS_MIN,
  targetMax = HYPERTROPHY_WEEKLY_SETS_MAX
): VolumeZoneStatus {
  if (validSets < targetMin) {
    return 'under';
  }
  if (validSets > targetMax) {
    return 'high';
  }
  return 'optimal';
}

/**
 * Detects plateau when the last 3+ consecutive sessions show no increase
 * in max effective weight AND no increase in total reps / top-set 1RM.
 */
export function detectPlateau(sessionsAsc: ExerciseSessionStats[]): PlateauDetection {
  if (sessionsAsc.length < 3) {
    return {
      isPlateau: false,
      stagnantSessions: 0,
      referenceWeight: 0,
      referenceReps: 0,
      message: 'Registre pelo menos 3 sessões para análise de platô.',
    };
  }

  const latest = sessionsAsc[sessionsAsc.length - 1];
  if (!latest) {
    return {
      isPlateau: false,
      stagnantSessions: 0,
      referenceWeight: 0,
      referenceReps: 0,
      message: '',
    };
  }

  let stagnantCount = 1;
  const latestAvgReps =
    latest.workingSetReps.length > 0
      ? latest.workingSetReps.reduce((acc, r) => acc + r, 0) / latest.workingSetReps.length
      : 0;

  for (let i = sessionsAsc.length - 2; i >= 0; i -= 1) {
    const prev = sessionsAsc[i];
    if (!prev) break;

    const prevAvgReps =
      prev.workingSetReps.length > 0
        ? prev.workingSetReps.reduce((acc, r) => acc + r, 0) / prev.workingSetReps.length
        : 0;

    const sameOrLowerWeight = latest.maxEffectiveWeight <= prev.maxEffectiveWeight + 0.01;
    const sameOrLowerReps = latestAvgReps <= prevAvgReps + 0.05;
    const sameOrLower1rm = latest.bestEstimated1rm <= prev.bestEstimated1rm + 0.25;

    if (sameOrLowerWeight && sameOrLowerReps && sameOrLower1rm) {
      stagnantCount += 1;
    } else {
      break;
    }
  }

  const isPlateau = stagnantCount >= 3;
  const refReps = Math.round(latestAvgReps);

  return {
    isPlateau,
    stagnantSessions: stagnantCount,
    referenceWeight: latest.maxRawWeight,
    referenceReps: refReps,
    message: isPlateau
      ? `Platô detectado: carga (${latest.maxRawWeight}kg) e reps (~${refReps}) estagnadas há ${stagnantCount} sessões. Considere deload, microcarga ou variação de estímulo.`
      : 'Evolução saudável sem sinais de estagnação.',
  };
}

/**
 * Progression Signal: triggered when the user hits the ceiling of the target rep range
 * (reps >= repMax) across ALL completed working sets in their most recent session.
 */
export function detectProgressionSignal(
  sessionsAsc: ExerciseSessionStats[]
): ProgressionSignal {
  const latest = sessionsAsc[sessionsAsc.length - 1];
  if (!latest || latest.workingSetReps.length === 0 || latest.repMax <= 0) {
    return {
      isReadyToProgress: false,
      repMaxTarget: 12,
      suggestedIncrementKg: 2.5,
      currentWorkingWeight: 0,
      suggestedNextWeight: 0,
      message: '',
    };
  }

  const allHitCeiling = latest.workingSetReps.every((reps) => reps >= latest.repMax);
  const increment = latest.weightMode === 'per_side' ? 1 : latest.maxRawWeight >= 60 ? 2.5 : 2;
  const nextWeight = round2(latest.maxRawWeight + increment);

  return {
    isReadyToProgress: allHitCeiling,
    repMaxTarget: latest.repMax,
    suggestedIncrementKg: increment,
    currentWorkingWeight: latest.maxRawWeight,
    suggestedNextWeight: nextWeight,
    message: allHitCeiling
      ? `Pronto para progredir! Você atingiu ${latest.repMax}+ reps em todas as ${latest.workingSetReps.length} séries válidas. Suba para ${nextWeight}kg${latest.weightMode === 'per_side' ? '/lado' : ''} no próximo treino.`
      : `Continue buscando ${latest.repMax} reps limpas em todas as séries antes de aumentar a carga.`,
  };
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computePercentDelta(current: number, previous: number): number | null {
  if (previous <= 0) {
    return current > 0 ? 100 : null;
  }
  return round2(((current - previous) / previous) * 100);
}

export function estimateRirFromRpe(rpe: number | null): number | null {
  if (rpe === null || !Number.isFinite(rpe)) return null;
  return Math.max(0, Math.min(5, Math.round(10 - rpe)));
}

export function estimateRpeFromRir(rir: number | null): number | null {
  if (rir === null || !Number.isFinite(rir)) return null;
  return Math.max(5, Math.min(10, 10 - rir));
}
