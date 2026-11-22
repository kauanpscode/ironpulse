import { getActiveUserId, getDatabase } from '../database';
import {
  MUSCLE_GROUPS,
  type ExerciseAnalyticsSummary,
  type ExerciseSessionStats,
  type HeatmapDay,
  type MuscleGroup,
  type MuscleTrainingRank,
  type NextWorkoutRecommendation,
  type PeriodComparisonReport,
  type ReportPeriod,
  type StreakSummary,
  type WeeklyMuscleVolume,
  type WeightMode,
} from '../types';
import {
  classifyVolumeZone,
  computePercentDelta,
  computeStreaks,
  daysBetween,
  detectPlateau,
  detectProgressionSignal,
  getLastNDates,
  getStartOfWindowIso,
  HYPERTROPHY_WEEKLY_SETS_MAX,
  HYPERTROPHY_WEEKLY_SETS_MIN,
  nowIso,
  round2,
  toDateKey,
} from '../utils';
import { exerciseRepository } from './exerciseRepository';
import { routineRepository } from './routineRepository';

export interface TrackedExerciseListItem {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  equipment: string;
  sessionCount: number;
  best1rm: number;
  bestWeight: number;
  isPlateau: boolean;
  isReadyToProgress: boolean;
}

export const analyticsRepository = {
  async getHeatmapData(weeks = 12): Promise<HeatmapDay[]> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const totalDays = weeks * 7;
    const sinceIso = getStartOfWindowIso(totalDays);
    const dateKeys = getLastNDates(totalDays);

    const workoutRows = await db.getAllAsync<{
      started_at: string;
      total_tonnage: number;
    }>(
      `SELECT started_at, total_tonnage FROM workout_sessions
       WHERE status = 'completed' AND deleted_at IS NULL AND user_id = ? AND started_at >= ?`,
      [userId, sinceIso]
    );

    const cardioRows = await db.getAllAsync<{ performed_at: string }>(
      `SELECT performed_at FROM cardio_sessions
       WHERE deleted_at IS NULL AND user_id = ? AND performed_at >= ?`,
      [userId, sinceIso]
    );

    const byDate = new Map<
      string,
      { workouts: number; cardio: number; tonnage: number }
    >();

    for (const w of workoutRows) {
      const key = toDateKey(w.started_at);
      const curr = byDate.get(key) ?? { workouts: 0, cardio: 0, tonnage: 0 };
      curr.workouts += 1;
      curr.tonnage += w.total_tonnage;
      byDate.set(key, curr);
    }

    for (const c of cardioRows) {
      const key = toDateKey(c.performed_at);
      const curr = byDate.get(key) ?? { workouts: 0, cardio: 0, tonnage: 0 };
      curr.cardio += 1;
      byDate.set(key, curr);
    }

    return dateKeys.map((date) => {
      const entry = byDate.get(date) ?? { workouts: 0, cardio: 0, tonnage: 0 };
      let intensityLevel: 0 | 1 | 2 | 3 | 4 = 0;
      if (entry.workouts > 0) {
        if (entry.tonnage >= 14000) intensityLevel = 4;
        else if (entry.tonnage >= 9000) intensityLevel = 3;
        else if (entry.tonnage >= 4500) intensityLevel = 2;
        else intensityLevel = 1;
      } else if (entry.cardio > 0) {
        intensityLevel = 1;
      }

      return {
        date,
        workoutCount: entry.workouts,
        cardioCount: entry.cardio,
        totalTonnage: round2(entry.tonnage),
        intensityLevel,
      };
    });
  },

  async getStreakSummary(): Promise<StreakSummary> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const rows = await db.getAllAsync<{ started_at: string }>(
      `SELECT started_at FROM workout_sessions
       WHERE status = 'completed' AND deleted_at IS NULL AND user_id = ?
       ORDER BY started_at ASC`,
      [userId]
    );

    const dateKeys = rows.map((r) => toDateKey(r.started_at));
    const { currentStreak, bestStreak } = computeStreaks(dateKeys);

    const cutoff30 = getStartOfWindowIso(30);
    const cutoff7 = getStartOfWindowIso(7);
    const totalWorkouts30d = rows.filter((r) => r.started_at >= cutoff30).length;
    const activeDaysThisWeek = new Set(
      rows.filter((r) => r.started_at >= cutoff7).map((r) => toDateKey(r.started_at))
    ).size;

    return {
      currentStreak,
      bestStreak,
      totalWorkouts30d,
      totalWorkoutsAllTime: rows.length,
      activeDaysThisWeek,
    };
  },

  async getWeeklyMuscleVolume(): Promise<WeeklyMuscleVolume[]> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const sinceIso = getStartOfWindowIso(7);

    const rows = await db.getAllAsync<{
      muscle_group: string;
      valid_sets: number;
      tonnage: number;
    }>(
      `SELECT e.muscle_group, COUNT(wset.id) AS valid_sets, COALESCE(SUM(wset.volume), 0) AS tonnage
       FROM workout_sets wset
       INNER JOIN workout_sessions ws ON ws.id = wset.session_id
       INNER JOIN exercises e ON e.id = wset.exercise_id
       WHERE ws.status = 'completed'
         AND ws.deleted_at IS NULL
         AND ws.user_id = ?
         AND ws.started_at >= ?
         AND wset.completed = 1
         AND wset.set_type != 'W'
       GROUP BY e.muscle_group`,
      [userId, sinceIso]
    );

    const map = new Map<string, { sets: number; tonnage: number }>();
    for (const r of rows) {
      map.set(r.muscle_group, { sets: r.valid_sets, tonnage: r.tonnage });
    }

    return MUSCLE_GROUPS.map((muscleGroup) => {
      const stat = map.get(muscleGroup) ?? { sets: 0, tonnage: 0 };
      return {
        muscleGroup,
        validSets: stat.sets,
        targetMin: HYPERTROPHY_WEEKLY_SETS_MIN,
        targetMax: HYPERTROPHY_WEEKLY_SETS_MAX,
        status: classifyVolumeZone(stat.sets),
        tonnage: round2(stat.tonnage),
      };
    });
  },

  async getNextWorkoutRecommendation(): Promise<NextWorkoutRecommendation | null> {
    const activeRoutine = await routineRepository.getActiveRoutine();
    if (!activeRoutine || activeRoutine.days.length === 0) {
      return null;
    }

    const db = await getDatabase();
    const userId = getActiveUserId();
    const lastCompleted = await db.getFirstAsync<{
      routine_day_id: string | null;
      started_at: string;
    }>(
      `SELECT routine_day_id, started_at FROM workout_sessions
       WHERE status = 'completed' AND deleted_at IS NULL AND user_id = ? AND routine_id = ?
       ORDER BY started_at DESC LIMIT 1`,
      [userId, activeRoutine.id]
    );

    let nextIndex = 0;
    if (lastCompleted?.routine_day_id) {
      const lastIdx = activeRoutine.days.findIndex(
        (d) => d.id === lastCompleted.routine_day_id
      );
      if (lastIdx >= 0) {
        nextIndex = (lastIdx + 1) % activeRoutine.days.length;
      }
    }

    const nextDay = activeRoutine.days[nextIndex];
    if (!nextDay) return null;

    const lastForThisDay = await db.getFirstAsync<{ started_at: string }>(
      `SELECT started_at FROM workout_sessions
       WHERE status = 'completed' AND deleted_at IS NULL AND user_id = ? AND routine_day_id = ?
       ORDER BY started_at DESC LIMIT 1`,
      [userId, nextDay.id]
    );

    const lastPerformedAt = lastForThisDay?.started_at ?? null;
    const daysSinceLast = lastPerformedAt ? daysBetween(lastPerformedAt, nowIso()) : null;

    return {
      routineId: activeRoutine.id,
      routineName: activeRoutine.name,
      day: nextDay,
      lastPerformedAt,
      daysSinceLast,
    };
  },

  async getExerciseAnalytics(exerciseId: string): Promise<ExerciseAnalyticsSummary | null> {
    const exercise = await exerciseRepository.getById(exerciseId);
    if (!exercise) return null;

    const db = await getDatabase();
    const userId = getActiveUserId();
    const rows = await db.getAllAsync<{
      session_id: string;
      session_title: string;
      started_at: string;
      weight: number;
      weight_mode: string;
      effective_weight: number;
      reps: number;
      rpe: number | null;
      estimated_1rm: number;
      volume: number;
      rep_min: number;
      rep_max: number;
    }>(
      `SELECT
         ws.id AS session_id,
         ws.title AS session_title,
         ws.started_at,
         wset.weight,
         wset.weight_mode,
         wset.effective_weight,
         wset.reps,
         wset.rpe,
         wset.estimated_1rm,
         wset.volume,
         wse.rep_min,
         wse.rep_max
       FROM workout_sets wset
       INNER JOIN workout_sessions ws ON ws.id = wset.session_id
       INNER JOIN workout_session_exercises wse ON wse.id = wset.session_exercise_id
       WHERE wset.exercise_id = ?
         AND wset.completed = 1
         AND wset.set_type != 'W'
         AND ws.status = 'completed'
         AND ws.deleted_at IS NULL
         AND ws.user_id = ?
       ORDER BY ws.started_at ASC, wset.set_order ASC`,
      [exerciseId, userId]
    );

    const grouped = new Map<
      string,
      {
        sessionTitle: string;
        performedAt: string;
        maxEffectiveWeight: number;
        maxRawWeight: number;
        weightMode: WeightMode;
        bestEstimated1rm: number;
        totalVolume: number;
        totalReps: number;
        rpeSum: number;
        rpeCount: number;
        topSetWeight: number;
        topSetReps: number;
        repMin: number;
        repMax: number;
        workingSetReps: number[];
      }
    >();

    for (const r of rows) {
      const curr = grouped.get(r.session_id) ?? {
        sessionTitle: r.session_title,
        performedAt: r.started_at,
        maxEffectiveWeight: 0,
        maxRawWeight: 0,
        weightMode: (r.weight_mode === 'per_side' ? 'per_side' : 'total') as WeightMode,
        bestEstimated1rm: 0,
        totalVolume: 0,
        totalReps: 0,
        rpeSum: 0,
        rpeCount: 0,
        topSetWeight: 0,
        topSetReps: 0,
        repMin: r.rep_min,
        repMax: r.rep_max,
        workingSetReps: [],
      };

      if (r.effective_weight > curr.maxEffectiveWeight) {
        curr.maxEffectiveWeight = r.effective_weight;
        curr.maxRawWeight = r.weight;
      }
      if (r.estimated_1rm > curr.bestEstimated1rm) {
        curr.bestEstimated1rm = r.estimated_1rm;
        curr.topSetWeight = r.weight;
        curr.topSetReps = r.reps;
      }
      curr.totalVolume += r.volume;
      curr.totalReps += r.reps;
      curr.workingSetReps.push(r.reps);
      if (r.rpe !== null) {
        curr.rpeSum += r.rpe;
        curr.rpeCount += 1;
      }

      grouped.set(r.session_id, curr);
    }

    const sessions: ExerciseSessionStats[] = Array.from(grouped.entries()).map(
      ([sessionId, item]) => ({
        sessionId,
        sessionTitle: item.sessionTitle,
        performedAt: item.performedAt,
        maxEffectiveWeight: round2(item.maxEffectiveWeight),
        maxRawWeight: round2(item.maxRawWeight),
        weightMode: item.weightMode,
        bestEstimated1rm: round2(item.bestEstimated1rm),
        totalVolume: round2(item.totalVolume),
        validSetsCount: item.workingSetReps.length,
        totalReps: item.totalReps,
        avgRpe: item.rpeCount > 0 ? round2(item.rpeSum / item.rpeCount) : null,
        topSetSummary: `${item.topSetWeight}kg${item.weightMode === 'per_side' ? '/lado' : ''} × ${item.topSetReps}`,
        repMin: item.repMin,
        repMax: item.repMax,
        workingSetReps: item.workingSetReps,
      })
    );

    const best1rmAllTime = sessions.reduce(
      (max, s) => (s.bestEstimated1rm > max ? s.bestEstimated1rm : max),
      0
    );
    const bestWeightAllTime = sessions.reduce(
      (max, s) => (s.maxEffectiveWeight > max ? s.maxEffectiveWeight : max),
      0
    );
    const bestVolumeSessionAllTime = sessions.reduce(
      (max, s) => (s.totalVolume > max ? s.totalVolume : max),
      0
    );

    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      sessions,
      best1rmAllTime: round2(best1rmAllTime),
      bestWeightAllTime: round2(bestWeightAllTime),
      bestVolumeSessionAllTime: round2(bestVolumeSessionAllTime),
      plateau: detectPlateau(sessions),
      progression: detectProgressionSignal(sessions),
    };
  },

  async listTrackedExercisesWithAlerts(): Promise<TrackedExerciseListItem[]> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const rows = await db.getAllAsync<{
      id: string;
      name: string;
      muscle_group: string;
      equipment: string;
      session_count: number;
    }>(
      `SELECT
         e.id, e.name, e.muscle_group, e.equipment,
         COUNT(DISTINCT ws.id) AS session_count
       FROM exercises e
       INNER JOIN workout_sets wset ON wset.exercise_id = e.id
       INNER JOIN workout_sessions ws ON ws.id = wset.session_id
       WHERE ws.status = 'completed'
         AND ws.deleted_at IS NULL
         AND ws.user_id = ?
         AND wset.completed = 1
         AND wset.set_type != 'W'
       GROUP BY e.id
       ORDER BY session_count DESC, e.name ASC`,
      [userId]
    );

    const results: TrackedExerciseListItem[] = [];
    for (const r of rows) {
      const detail = await this.getExerciseAnalytics(r.id);
      if (!detail) continue;
      results.push({
        exerciseId: r.id,
        exerciseName: r.name,
        muscleGroup: r.muscle_group as MuscleGroup,
        equipment: r.equipment,
        sessionCount: r.session_count,
        best1rm: detail.best1rmAllTime,
        bestWeight: detail.bestWeightAllTime,
        isPlateau: detail.plateau.isPlateau,
        isReadyToProgress: detail.progression.isReadyToProgress,
      });
    }

    // Surface alerts (plateau / ready to progress) near the top
    return results.sort((a, b) => {
      const scoreA = (a.isPlateau ? 2 : 0) + (a.isReadyToProgress ? 1 : 0);
      const scoreB = (b.isPlateau ? 2 : 0) + (b.isReadyToProgress ? 1 : 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.sessionCount - a.sessionCount;
    });
  },

  async getPeriodComparisonReport(
    period: ReportPeriod
  ): Promise<PeriodComparisonReport> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const windowDays = period === 'weekly' ? 7 : 30;
    const currentStartIso = getStartOfWindowIso(windowDays);
    const previousStartIso = getStartOfWindowIso(windowDays * 2);

    const currStats = await db.getFirstAsync<{
      workouts: number;
      tonnage: number;
      valid_sets: number;
      avg_dur: number;
    }>(
      `SELECT
         COUNT(*) AS workouts,
         COALESCE(SUM(total_tonnage), 0) AS tonnage,
         COALESCE(SUM(total_valid_sets), 0) AS valid_sets,
         COALESCE(AVG(duration_seconds), 0) AS avg_dur
       FROM workout_sessions
       WHERE status = 'completed' AND deleted_at IS NULL AND user_id = ? AND started_at >= ?`,
      [userId, currentStartIso]
    );

    const prevStats = await db.getFirstAsync<{
      workouts: number;
      tonnage: number;
      valid_sets: number;
    }>(
      `SELECT
         COUNT(*) AS workouts,
         COALESCE(SUM(total_tonnage), 0) AS tonnage,
         COALESCE(SUM(total_valid_sets), 0) AS valid_sets
       FROM workout_sessions
       WHERE status = 'completed' AND deleted_at IS NULL AND user_id = ?
         AND started_at >= ? AND started_at < ?`,
      [userId, previousStartIso, currentStartIso]
    );

    const currCardio = await db.getFirstAsync<{ mins: number }>(
      `SELECT COALESCE(SUM(duration_minutes), 0) AS mins
       FROM cardio_sessions WHERE deleted_at IS NULL AND user_id = ? AND performed_at >= ?`,
      [userId, currentStartIso]
    );

    const prevCardio = await db.getFirstAsync<{ mins: number }>(
      `SELECT COALESCE(SUM(duration_minutes), 0) AS mins
       FROM cardio_sessions WHERE deleted_at IS NULL AND user_id = ? AND performed_at >= ? AND performed_at < ?`,
      [userId, previousStartIso, currentStartIso]
    );

    const muscleRows = await db.getAllAsync<{
      muscle_group: string;
      valid_sets: number;
      tonnage: number;
    }>(
      `SELECT e.muscle_group, COUNT(wset.id) AS valid_sets, COALESCE(SUM(wset.volume), 0) AS tonnage
       FROM workout_sets wset
       INNER JOIN workout_sessions ws ON ws.id = wset.session_id
       INNER JOIN exercises e ON e.id = wset.exercise_id
       WHERE ws.status = 'completed' AND ws.deleted_at IS NULL AND ws.user_id = ?
         AND ws.started_at >= ? AND wset.completed = 1 AND wset.set_type != 'W'
       GROUP BY e.muscle_group`,
      [userId, currentStartIso]
    );

    const muscleMap = new Map<string, { sets: number; tonnage: number }>();
    for (const r of muscleRows) {
      muscleMap.set(r.muscle_group, { sets: r.valid_sets, tonnage: r.tonnage });
    }

    const allRanks: MuscleTrainingRank[] = MUSCLE_GROUPS.map((mg) => {
      const m = muscleMap.get(mg) ?? { sets: 0, tonnage: 0 };
      return {
        muscleGroup: mg,
        validSets: m.sets,
        tonnage: round2(m.tonnage),
      };
    });

    const sortedDesc = [...allRanks].sort((a, b) => b.validSets - a.validSets);
    const sortedAsc = [...allRanks].sort((a, b) => a.validSets - b.validSets);

    const currentTonnage = round2(currStats?.tonnage ?? 0);
    const previousTonnage = round2(prevStats?.tonnage ?? 0);

    return {
      period,
      periodLabel: period === 'weekly' ? 'Últimos 7 dias vs. anteriores' : 'Últimos 30 dias vs. anteriores',
      currentTonnage,
      previousTonnage,
      tonnageDeltaPct: computePercentDelta(currentTonnage, previousTonnage),
      currentWorkouts: currStats?.workouts ?? 0,
      previousWorkouts: prevStats?.workouts ?? 0,
      currentValidSets: currStats?.valid_sets ?? 0,
      previousValidSets: prevStats?.valid_sets ?? 0,
      currentCardioMinutes: currCardio?.mins ?? 0,
      previousCardioMinutes: prevCardio?.mins ?? 0,
      mostTrainedMuscles: sortedDesc.slice(0, 3),
      leastTrainedMuscles: sortedAsc.slice(0, 3),
      averageSessionMinutes: Math.round((currStats?.avg_dur ?? 0) / 60),
    };
  },
};
