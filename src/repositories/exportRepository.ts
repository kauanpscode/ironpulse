import { CURRENT_SCHEMA_VERSION, getActiveUserId, getDatabase } from '../database';
import type {
  BackupPayload,
  BodyMeasurement,
  CardioIntensity,
  CardioModality,
  CardioSession,
  CsvWorkoutRow,
  EquipmentType,
  Exercise,
  MuscleGroup,
  Routine,
  RoutineDay,
  RoutineExercise,
  SetType,
  SplitType,
  SyncStatus,
  WeightMode,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSet,
  WorkoutStatus,
} from '../types';
import { nowIso, toDateKey } from '../utils';

interface RawRecord {
  [key: string]: string | number | null;
}

function safeParseMuscles(raw: string | number | null): MuscleGroup[] {
  if (typeof raw !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MuscleGroup[]) : [];
  } catch {
    return [];
  }
}

export const exportRepository = {
  async getCsvWorkoutRows(): Promise<CsvWorkoutRow[]> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const rows = await db.getAllAsync<{
      started_at: string;
      session_title: string;
      exercise_name: string;
      muscle_group: string;
      equipment: string;
      set_order: number;
      set_type: string;
      weight: number;
      weight_mode: string;
      effective_weight: number;
      reps: number;
      rpe: number | null;
      rir: number | null;
      estimated_1rm: number;
      volume: number;
    }>(
      `SELECT
         ws.started_at,
         ws.title AS session_title,
         e.name AS exercise_name,
         e.muscle_group,
         e.equipment,
         wset.set_order,
         wset.set_type,
         wset.weight,
         wset.weight_mode,
         wset.effective_weight,
         wset.reps,
         wset.rpe,
         wset.rir,
         wset.estimated_1rm,
         wset.volume
       FROM workout_sets wset
       INNER JOIN workout_sessions ws ON ws.id = wset.session_id
       INNER JOIN exercises e ON e.id = wset.exercise_id
       WHERE ws.status = 'completed' AND ws.deleted_at IS NULL AND ws.user_id = ? AND wset.completed = 1
       ORDER BY ws.started_at DESC, wset.set_order ASC`,
      [userId]
    );

    return rows.map((r) => ({
      date: toDateKey(r.started_at),
      sessionTitle: r.session_title,
      exerciseName: r.exercise_name,
      muscleGroup: r.muscle_group,
      equipment: r.equipment,
      setOrder: r.set_order,
      setType: r.set_type,
      weightKg: r.weight,
      weightMode: r.weight_mode,
      effectiveWeightKg: r.effective_weight,
      reps: r.reps,
      rpe: r.rpe !== null ? String(r.rpe) : '',
      rir: r.rir !== null ? String(r.rir) : '',
      estimated1rmKg: r.estimated_1rm,
      volumeKg: r.volume,
    }));
  },

  async buildFullJsonBackup(): Promise<BackupPayload> {
    const db = await getDatabase();
    const userId = getActiveUserId();

    const exRows = await db.getAllAsync<RawRecord>(
      `SELECT * FROM exercises WHERE user_id IS NULL OR user_id = ?`,
      [userId]
    );
    const rRows = await db.getAllAsync<RawRecord>(
      `SELECT * FROM routines WHERE user_id = ?`,
      [userId]
    );
    const rdRows = await db.getAllAsync<RawRecord>(
      `SELECT rd.* FROM routine_days rd INNER JOIN routines r ON r.id = rd.routine_id WHERE r.user_id = ?`,
      [userId]
    );
    const rxRows = await db.getAllAsync<RawRecord>(
      `SELECT rx.* FROM routine_exercises rx
       INNER JOIN routine_days rd ON rd.id = rx.routine_day_id
       INNER JOIN routines r ON r.id = rd.routine_id
       WHERE r.user_id = ?`,
      [userId]
    );
    const wsRows = await db.getAllAsync<RawRecord>(
      `SELECT * FROM workout_sessions WHERE user_id = ?`,
      [userId]
    );
    const wseRows = await db.getAllAsync<RawRecord>(
      `SELECT wse.* FROM workout_session_exercises wse
       INNER JOIN workout_sessions ws ON ws.id = wse.session_id
       WHERE ws.user_id = ?`,
      [userId]
    );
    const setRows = await db.getAllAsync<RawRecord>(
      `SELECT wset.* FROM workout_sets wset
       INNER JOIN workout_sessions ws ON ws.id = wset.session_id
       WHERE ws.user_id = ?`,
      [userId]
    );
    const bmRows = await db.getAllAsync<RawRecord>(
      `SELECT * FROM body_measurements WHERE user_id = ?`,
      [userId]
    );
    const csRows = await db.getAllAsync<RawRecord>(
      `SELECT * FROM cardio_sessions WHERE user_id = ?`,
      [userId]
    );

    const exercises: Exercise[] = exRows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      muscleGroup: String(r.muscle_group) as MuscleGroup,
      secondaryMuscles: safeParseMuscles(r.secondary_muscles ?? null),
      equipment: String(r.equipment) as EquipmentType,
      defaultWeightMode: (r.default_weight_mode === 'per_side' ? 'per_side' : 'total') as WeightMode,
      isCustom: Number(r.is_custom) === 1,
      notes: String(r.notes ?? ''),
      syncStatus: String(r.sync_status) as SyncStatus,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      deletedAt: r.deleted_at ? String(r.deleted_at) : null,
    }));

    const routines: Routine[] = rRows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      splitType: String(r.split_type) as SplitType,
      description: String(r.description ?? ''),
      isActive: Number(r.is_active) === 1,
      syncStatus: String(r.sync_status) as SyncStatus,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      deletedAt: r.deleted_at ? String(r.deleted_at) : null,
    }));

    const routineDays: RoutineDay[] = rdRows.map((r) => ({
      id: String(r.id),
      routineId: String(r.routine_id),
      name: String(r.name),
      dayOrder: Number(r.day_order),
      focusMuscles: safeParseMuscles(r.focus_muscles ?? null),
      estimatedMinutes: Number(r.estimated_minutes),
      syncStatus: String(r.sync_status) as SyncStatus,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      deletedAt: r.deleted_at ? String(r.deleted_at) : null,
    }));

    const routineExercises: RoutineExercise[] = rxRows.map((r) => ({
      id: String(r.id),
      routineDayId: String(r.routine_day_id),
      exerciseId: String(r.exercise_id),
      orderIndex: Number(r.order_index),
      targetSets: Number(r.target_sets),
      repMin: Number(r.rep_min),
      repMax: Number(r.rep_max),
      restSeconds: Number(r.rest_seconds),
      weightMode: (r.weight_mode === 'per_side' ? 'per_side' : 'total') as WeightMode,
      notes: String(r.notes ?? ''),
      syncStatus: String(r.sync_status) as SyncStatus,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      deletedAt: r.deleted_at ? String(r.deleted_at) : null,
    }));

    const workoutSessions: WorkoutSession[] = wsRows.map((r) => ({
      id: String(r.id),
      routineId: r.routine_id ? String(r.routine_id) : null,
      routineDayId: r.routine_day_id ? String(r.routine_day_id) : null,
      title: String(r.title),
      startedAt: String(r.started_at),
      finishedAt: r.finished_at ? String(r.finished_at) : null,
      durationSeconds: Number(r.duration_seconds),
      totalTonnage: Number(r.total_tonnage),
      totalValidSets: Number(r.total_valid_sets),
      notes: String(r.notes ?? ''),
      status: String(r.status) as WorkoutStatus,
      syncStatus: String(r.sync_status) as SyncStatus,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      deletedAt: r.deleted_at ? String(r.deleted_at) : null,
    }));

    const workoutSessionExercises: WorkoutSessionExercise[] = wseRows.map((r) => ({
      id: String(r.id),
      sessionId: String(r.session_id),
      exerciseId: String(r.exercise_id),
      originalExerciseId: r.original_exercise_id ? String(r.original_exercise_id) : null,
      routineExerciseId: r.routine_exercise_id ? String(r.routine_exercise_id) : null,
      orderIndex: Number(r.order_index),
      targetSets: Number(r.target_sets),
      repMin: Number(r.rep_min),
      repMax: Number(r.rep_max),
      restSeconds: Number(r.rest_seconds),
      notes: String(r.notes ?? ''),
      syncStatus: String(r.sync_status) as SyncStatus,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));

    const workoutSets: WorkoutSet[] = setRows.map((r) => ({
      id: String(r.id),
      sessionId: String(r.session_id),
      sessionExerciseId: String(r.session_exercise_id),
      exerciseId: String(r.exercise_id),
      setOrder: Number(r.set_order),
      setType: String(r.set_type) as SetType,
      weight: Number(r.weight),
      weightMode: (r.weight_mode === 'per_side' ? 'per_side' : 'total') as WeightMode,
      effectiveWeight: Number(r.effective_weight),
      reps: Number(r.reps),
      rpe: r.rpe !== null ? Number(r.rpe) : null,
      rir: r.rir !== null ? Number(r.rir) : null,
      completed: Number(r.completed) === 1,
      completedAt: r.completed_at ? String(r.completed_at) : null,
      estimated1rm: Number(r.estimated_1rm),
      volume: Number(r.volume),
      isPrWeight: Number(r.is_pr_weight) === 1,
      isPr1rm: Number(r.is_pr_1rm) === 1,
      isPrVolume: Number(r.is_pr_volume) === 1,
      isPrReps: Number(r.is_pr_reps) === 1,
      syncStatus: String(r.sync_status) as SyncStatus,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));

    const bodyMeasurements: BodyMeasurement[] = bmRows.map((r) => ({
      id: String(r.id),
      measuredAt: String(r.measured_at),
      weightKg: Number(r.weight_kg),
      bodyFatPct: r.body_fat_pct !== null ? Number(r.body_fat_pct) : null,
      armCm: r.arm_cm !== null ? Number(r.arm_cm) : null,
      chestCm: r.chest_cm !== null ? Number(r.chest_cm) : null,
      waistCm: r.waist_cm !== null ? Number(r.waist_cm) : null,
      thighCm: r.thigh_cm !== null ? Number(r.thigh_cm) : null,
      notes: String(r.notes ?? ''),
      syncStatus: String(r.sync_status) as SyncStatus,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      deletedAt: r.deleted_at ? String(r.deleted_at) : null,
    }));

    const cardioSessions: CardioSession[] = csRows.map((r) => ({
      id: String(r.id),
      performedAt: String(r.performed_at),
      modality: String(r.modality) as CardioModality,
      durationMinutes: Number(r.duration_minutes),
      distanceKm: r.distance_km !== null ? Number(r.distance_km) : null,
      intensity: String(r.intensity) as CardioIntensity,
      caloriesEst: r.calories_est !== null ? Number(r.calories_est) : null,
      notes: String(r.notes ?? ''),
      syncStatus: String(r.sync_status) as SyncStatus,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      deletedAt: r.deleted_at ? String(r.deleted_at) : null,
    }));

    return {
      app: 'IronPulse',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: nowIso(),
      data: {
        exercises,
        routines,
        routineDays,
        routineExercises,
        workoutSessions,
        workoutSessionExercises,
        workoutSets,
        bodyMeasurements,
        cardioSessions,
      },
    };
  },

  async restoreFromJsonBackup(payload: BackupPayload): Promise<void> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const { data } = payload;

    await db.execAsync('PRAGMA foreign_keys = OFF;');
    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `DELETE FROM workout_sets WHERE session_id IN (SELECT id FROM workout_sessions WHERE user_id = ?)`,
          [userId]
        );
        await db.runAsync(
          `DELETE FROM workout_session_exercises WHERE session_id IN (SELECT id FROM workout_sessions WHERE user_id = ?)`,
          [userId]
        );
        await db.runAsync(`DELETE FROM workout_sessions WHERE user_id = ?`, [userId]);
        await db.runAsync(
          `DELETE FROM routine_exercises WHERE routine_day_id IN (SELECT id FROM routine_days WHERE routine_id IN (SELECT id FROM routines WHERE user_id = ?))`,
          [userId]
        );
        await db.runAsync(
          `DELETE FROM routine_days WHERE routine_id IN (SELECT id FROM routines WHERE user_id = ?)`,
          [userId]
        );
        await db.runAsync(`DELETE FROM routines WHERE user_id = ?`, [userId]);
        await db.runAsync(`DELETE FROM body_measurements WHERE user_id = ?`, [userId]);
        await db.runAsync(`DELETE FROM cardio_sessions WHERE user_id = ?`, [userId]);
        await db.runAsync(`DELETE FROM exercises WHERE user_id = ?`, [userId]);

        for (const e of data.exercises) {
          await db.runAsync(
            `INSERT OR REPLACE INTO exercises (
              id, user_id, name, muscle_group, secondary_muscles, equipment, default_weight_mode,
              is_custom, notes, sync_status, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              e.id,
              e.isCustom ? userId : null,
              e.name,
              e.muscleGroup,
              JSON.stringify(e.secondaryMuscles),
              e.equipment,
              e.defaultWeightMode,
              e.isCustom ? 1 : 0,
              e.notes,
              e.syncStatus,
              e.createdAt,
              e.updatedAt,
              e.deletedAt,
            ]
          );
        }

        for (const r of data.routines) {
          await db.runAsync(
            `INSERT OR REPLACE INTO routines (
              id, user_id, name, split_type, description, is_active, sync_status, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              r.id,
              userId,
              r.name,
              r.splitType,
              r.description,
              r.isActive ? 1 : 0,
              r.syncStatus,
              r.createdAt,
              r.updatedAt,
              r.deletedAt,
            ]
          );
        }

        for (const d of data.routineDays) {
          await db.runAsync(
            `INSERT OR REPLACE INTO routine_days (
              id, routine_id, name, day_order, focus_muscles, estimated_minutes,
              sync_status, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              d.id,
              d.routineId,
              d.name,
              d.dayOrder,
              JSON.stringify(d.focusMuscles),
              d.estimatedMinutes,
              d.syncStatus,
              d.createdAt,
              d.updatedAt,
              d.deletedAt,
            ]
          );
        }

        for (const rx of data.routineExercises) {
          await db.runAsync(
            `INSERT OR REPLACE INTO routine_exercises (
              id, routine_day_id, exercise_id, order_index, target_sets, rep_min, rep_max,
              rest_seconds, weight_mode, notes, sync_status, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              rx.id,
              rx.routineDayId,
              rx.exerciseId,
              rx.orderIndex,
              rx.targetSets,
              rx.repMin,
              rx.repMax,
              rx.restSeconds,
              rx.weightMode,
              rx.notes,
              rx.syncStatus,
              rx.createdAt,
              rx.updatedAt,
              rx.deletedAt,
            ]
          );
        }

        for (const ws of data.workoutSessions) {
          await db.runAsync(
            `INSERT OR REPLACE INTO workout_sessions (
              id, user_id, routine_id, routine_day_id, title, started_at, finished_at,
              duration_seconds, total_tonnage, total_valid_sets, notes, status,
              sync_status, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ws.id,
              userId,
              ws.routineId,
              ws.routineDayId,
              ws.title,
              ws.startedAt,
              ws.finishedAt,
              ws.durationSeconds,
              ws.totalTonnage,
              ws.totalValidSets,
              ws.notes,
              ws.status,
              ws.syncStatus,
              ws.createdAt,
              ws.updatedAt,
              ws.deletedAt,
            ]
          );
        }

        for (const wse of data.workoutSessionExercises) {
          await db.runAsync(
            `INSERT OR REPLACE INTO workout_session_exercises (
              id, session_id, exercise_id, original_exercise_id, routine_exercise_id,
              order_index, target_sets, rep_min, rep_max, rest_seconds, notes,
              sync_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              wse.id,
              wse.sessionId,
              wse.exerciseId,
              wse.originalExerciseId,
              wse.routineExerciseId,
              wse.orderIndex,
              wse.targetSets,
              wse.repMin,
              wse.repMax,
              wse.restSeconds,
              wse.notes,
              wse.syncStatus,
              wse.createdAt,
              wse.updatedAt,
            ]
          );
        }

        for (const s of data.workoutSets) {
          await db.runAsync(
            `INSERT OR REPLACE INTO workout_sets (
              id, session_id, session_exercise_id, exercise_id, set_order, set_type,
              weight, weight_mode, effective_weight, reps, rpe, rir, completed, completed_at,
              estimated_1rm, volume, is_pr_weight, is_pr_1rm, is_pr_volume, is_pr_reps,
              sync_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              s.id,
              s.sessionId,
              s.sessionExerciseId,
              s.exerciseId,
              s.setOrder,
              s.setType,
              s.weight,
              s.weightMode,
              s.effectiveWeight,
              s.reps,
              s.rpe,
              s.rir,
              s.completed ? 1 : 0,
              s.completedAt,
              s.estimated1rm,
              s.volume,
              s.isPrWeight ? 1 : 0,
              s.isPr1rm ? 1 : 0,
              s.isPrVolume ? 1 : 0,
              s.isPrReps ? 1 : 0,
              s.syncStatus,
              s.createdAt,
              s.updatedAt,
            ]
          );
        }

        for (const bm of data.bodyMeasurements) {
          await db.runAsync(
            `INSERT OR REPLACE INTO body_measurements (
              id, user_id, measured_at, weight_kg, body_fat_pct, arm_cm, chest_cm, waist_cm, thigh_cm,
              notes, sync_status, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              bm.id,
              userId,
              bm.measuredAt,
              bm.weightKg,
              bm.bodyFatPct,
              bm.armCm,
              bm.chestCm,
              bm.waistCm,
              bm.thighCm,
              bm.notes,
              bm.syncStatus,
              bm.createdAt,
              bm.updatedAt,
              bm.deletedAt,
            ]
          );
        }

        for (const c of data.cardioSessions) {
          await db.runAsync(
            `INSERT OR REPLACE INTO cardio_sessions (
              id, user_id, performed_at, modality, duration_minutes, distance_km, intensity,
              calories_est, notes, sync_status, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              c.id,
              userId,
              c.performedAt,
              c.modality,
              c.durationMinutes,
              c.distanceKm,
              c.intensity,
              c.caloriesEst,
              c.notes,
              c.syncStatus,
              c.createdAt,
              c.updatedAt,
              c.deletedAt,
            ]
          );
        }

        await db.runAsync(
          `INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('seeded_at', ?)`,
          [nowIso()]
        );
      });
    } finally {
      await db.execAsync('PRAGMA foreign_keys = ON;');
    }
  },
};
