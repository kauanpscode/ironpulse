import { getActiveUserId, getDatabase } from '../database';
import type {
  ActiveSessionExercise,
  ActiveWorkoutFull,
  GhostSetReference,
  MuscleGroup,
  PostWorkoutSummary,
  PRBadge,
  SetType,
  SyncStatus,
  WeightMode,
  WorkoutSession,
  WorkoutSet,
  WorkoutStatus,
} from '../types';
import {
  computeEffectiveWeight,
  computeEpley1RM,
  computeSetVolume,
  estimateRirFromRpe,
  generateId,
  isWorkingSet,
  nowIso,
  round2,
} from '../utils';
import { exerciseRepository } from './exerciseRepository';
import { routineRepository } from './routineRepository';

interface SessionRow {
  id: string;
  routine_id: string | null;
  routine_day_id: string | null;
  title: string;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number;
  total_tonnage: number;
  total_valid_sets: number;
  notes: string;
  status: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface SessionExerciseRow {
  id: string;
  session_id: string;
  exercise_id: string;
  original_exercise_id: string | null;
  routine_exercise_id: string | null;
  order_index: number;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  rest_seconds: number;
  notes: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

interface WorkoutSetRow {
  id: string;
  session_id: string;
  session_exercise_id: string;
  exercise_id: string;
  set_order: number;
  set_type: string;
  weight: number;
  weight_mode: string;
  effective_weight: number;
  reps: number;
  rpe: number | null;
  rir: number | null;
  completed: number;
  completed_at: string | null;
  estimated_1rm: number;
  volume: number;
  is_pr_weight: number;
  is_pr_1rm: number;
  is_pr_volume: number;
  is_pr_reps: number;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

function mapSessionRow(row: SessionRow): WorkoutSession {
  return {
    id: row.id,
    routineId: row.routine_id,
    routineDayId: row.routine_day_id,
    title: row.title,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationSeconds: row.duration_seconds,
    totalTonnage: row.total_tonnage,
    totalValidSets: row.total_valid_sets,
    notes: row.notes,
    status: row.status as WorkoutStatus,
    syncStatus: row.sync_status as SyncStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapSetRow(row: WorkoutSetRow): WorkoutSet {
  return {
    id: row.id,
    sessionId: row.session_id,
    sessionExerciseId: row.session_exercise_id,
    exerciseId: row.exercise_id,
    setOrder: row.set_order,
    setType: row.set_type as SetType,
    weight: row.weight,
    weightMode: row.weight_mode === 'per_side' ? 'per_side' : 'total',
    effectiveWeight: row.effective_weight,
    reps: row.reps,
    rpe: row.rpe,
    rir: row.rir,
    completed: row.completed === 1,
    completedAt: row.completed_at,
    estimated1rm: row.estimated_1rm,
    volume: row.volume,
    isPrWeight: row.is_pr_weight === 1,
    isPr1rm: row.is_pr_1rm === 1,
    isPrVolume: row.is_pr_volume === 1,
    isPrReps: row.is_pr_reps === 1,
    syncStatus: row.sync_status as SyncStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface UpdateSetPatch {
  setType?: SetType;
  weight?: number;
  weightMode?: WeightMode;
  reps?: number;
  rpe?: number | null;
  rir?: number | null;
  completed?: boolean;
}

export const workoutRepository = {
  async getGhostSetsForExercise(
    exerciseId: string,
    excludeSessionId?: string
  ): Promise<GhostSetReference[]> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const lastSession = await db.getFirstAsync<{ session_id: string; started_at: string }>(
      `SELECT ws.id AS session_id, ws.started_at
       FROM workout_sessions ws
       INNER JOIN workout_sets wset ON wset.session_id = ws.id
       WHERE ws.status = 'completed'
         AND ws.deleted_at IS NULL
         AND ws.user_id = ?
         AND wset.exercise_id = ?
         AND wset.completed = 1
         AND (? IS NULL OR ws.id != ?)
       ORDER BY ws.started_at DESC
       LIMIT 1`,
      [userId, exerciseId, excludeSessionId ?? null, excludeSessionId ?? null]
    );

    if (!lastSession) return [];

    const setRows = await db.getAllAsync<WorkoutSetRow>(
      `SELECT * FROM workout_sets
       WHERE session_id = ? AND exercise_id = ? AND completed = 1
       ORDER BY set_order ASC`,
      [lastSession.session_id, exerciseId]
    );

    return setRows.map((row) => ({
      setOrder: row.set_order,
      weight: row.weight,
      weightMode: row.weight_mode === 'per_side' ? 'per_side' : 'total',
      effectiveWeight: row.effective_weight,
      reps: row.reps,
      rpe: row.rpe,
      setType: row.set_type as SetType,
      performedAt: lastSession.started_at,
    }));
  },

  async getInProgressSessionId(): Promise<string | null> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const row = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM workout_sessions WHERE status = 'in_progress' AND deleted_at IS NULL AND user_id = ? ORDER BY started_at DESC LIMIT 1`,
      [userId]
    );
    return row?.id ?? null;
  },

  async getFullSession(sessionId: string): Promise<ActiveWorkoutFull | null> {
    const db = await getDatabase();
    const sessionRow = await db.getFirstAsync<SessionRow>(
      `SELECT * FROM workout_sessions WHERE id = ? AND deleted_at IS NULL`,
      [sessionId]
    );
    if (!sessionRow) return null;

    const exRows = await db.getAllAsync<SessionExerciseRow>(
      `SELECT * FROM workout_session_exercises WHERE session_id = ? ORDER BY order_index ASC`,
      [sessionId]
    );
    const setRows = await db.getAllAsync<WorkoutSetRow>(
      `SELECT * FROM workout_sets WHERE session_id = ? ORDER BY set_order ASC`,
      [sessionId]
    );

    const exIds = Array.from(
      new Set([
        ...exRows.map((e) => e.exercise_id),
        ...exRows
          .map((e) => e.original_exercise_id)
          .filter((id): id is string => id !== null),
      ])
    );
    const exerciseMap = await exerciseRepository.getByIds(exIds);

    const setsBySessionEx = new Map<string, WorkoutSet[]>();
    for (const s of setRows) {
      const list = setsBySessionEx.get(s.session_exercise_id) ?? [];
      list.push(mapSetRow(s));
      setsBySessionEx.set(s.session_exercise_id, list);
    }

    const exercises: ActiveSessionExercise[] = [];
    for (const row of exRows) {
      const exercise = exerciseMap.get(row.exercise_id);
      if (!exercise) continue;
      const original = row.original_exercise_id
        ? exerciseMap.get(row.original_exercise_id)?.name ?? null
        : null;
      const ghostSets = await this.getGhostSetsForExercise(row.exercise_id, sessionId);

      exercises.push({
        id: row.id,
        sessionId: row.session_id,
        exerciseId: row.exercise_id,
        originalExerciseId: row.original_exercise_id,
        routineExerciseId: row.routine_exercise_id,
        orderIndex: row.order_index,
        targetSets: row.target_sets,
        repMin: row.rep_min,
        repMax: row.rep_max,
        restSeconds: row.rest_seconds,
        notes: row.notes,
        syncStatus: row.sync_status as SyncStatus,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        exercise,
        originalExerciseName: original,
        sets: setsBySessionEx.get(row.id) ?? [],
        ghostSets,
      });
    }

    return {
      session: mapSessionRow(sessionRow),
      exercises,
    };
  },

  async startFromRoutineDay(routineDayId: string): Promise<ActiveWorkoutFull> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const day = await routineRepository.getDayWithExercises(routineDayId);
    const ts = nowIso();
    const sessionId = generateId();

    const title = day?.name ?? 'Treino Livre';
    const routineId = day?.routineId ?? null;

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO workout_sessions (
          id, user_id, routine_id, routine_day_id, title, started_at, finished_at,
          duration_seconds, total_tonnage, total_valid_sets, notes, status,
          sync_status, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, 0, 0, 0, '', 'in_progress', 'pending', ?, ?, NULL)`,
        [sessionId, userId, routineId, day?.id ?? null, title, ts, ts, ts]
      );

      if (day) {
        for (let idx = 0; idx < day.exercises.length; idx += 1) {
          const rx = day.exercises[idx];
          if (!rx) continue;

          const sessionExId = generateId();
          await db.runAsync(
            `INSERT INTO workout_session_exercises (
              id, session_id, exercise_id, original_exercise_id, routine_exercise_id,
              order_index, target_sets, rep_min, rep_max, rest_seconds, notes,
              sync_status, created_at, updated_at
            ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
            [
              sessionExId,
              sessionId,
              rx.exerciseId,
              rx.id,
              idx,
              rx.targetSets,
              rx.repMin,
              rx.repMax,
              rx.restSeconds,
              rx.notes,
              ts,
              ts,
            ]
          );

          const ghostSets = await this.getGhostSetsForExercise(rx.exerciseId, sessionId);
          const workingGhosts = ghostSets.filter((g) => g.setType !== 'W');
          const initialCount = Math.max(rx.targetSets, workingGhosts.length > 0 ? rx.targetSets : 3);

          for (let s = 0; s < initialCount; s += 1) {
            const ghost = workingGhosts[s] ?? workingGhosts[workingGhosts.length - 1];
            const preWeight = ghost?.weight ?? 0;
            const preReps = ghost?.reps ?? rx.repMin;
            const mode = ghost?.weightMode ?? rx.weightMode;
            const effW = computeEffectiveWeight(preWeight, mode);
            const vol = computeSetVolume(preWeight, mode, preReps);
            const est1rm = computeEpley1RM(effW, preReps);

            await db.runAsync(
              `INSERT INTO workout_sets (
                id, session_id, session_exercise_id, exercise_id, set_order, set_type,
                weight, weight_mode, effective_weight, reps, rpe, rir, completed, completed_at,
                estimated_1rm, volume, is_pr_weight, is_pr_1rm, is_pr_volume, is_pr_reps,
                sync_status, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, 'N', ?, ?, ?, ?, NULL, NULL, 0, NULL, ?, ?, 0, 0, 0, 0, 'pending', ?, ?)`,
              [
                generateId(),
                sessionId,
                sessionExId,
                rx.exerciseId,
                s + 1,
                preWeight,
                mode,
                effW,
                preReps,
                est1rm,
                vol,
                ts,
                ts,
              ]
            );
          }
        }
      }
    });

    const full = await this.getFullSession(sessionId);
    if (!full) {
      throw new Error('Falha ao inicializar sessão de treino.');
    }
    return full;
  },

  async startEmptyWorkout(title = 'Treino Livre'): Promise<ActiveWorkoutFull> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const ts = nowIso();
    const sessionId = generateId();

    await db.runAsync(
      `INSERT INTO workout_sessions (
        id, user_id, routine_id, routine_day_id, title, started_at, finished_at,
        duration_seconds, total_tonnage, total_valid_sets, notes, status,
        sync_status, created_at, updated_at, deleted_at
      ) VALUES (?, ?, NULL, NULL, ?, ?, NULL, 0, 0, 0, '', 'in_progress', 'pending', ?, ?, NULL)`,
      [sessionId, userId, title, ts, ts, ts]
    );

    const full = await this.getFullSession(sessionId);
    if (!full) {
      throw new Error('Falha ao criar treino livre.');
    }
    return full;
  },

  async addExerciseToSession(
    sessionId: string,
    exerciseId: string
  ): Promise<void> {
    const db = await getDatabase();
    const exercise = await exerciseRepository.getById(exerciseId);
    if (!exercise) return;

    const maxOrder = await db.getFirstAsync<{ max_idx: number | null }>(
      `SELECT MAX(order_index) AS max_idx FROM workout_session_exercises WHERE session_id = ?`,
      [sessionId]
    );
    const nextOrder = (maxOrder?.max_idx ?? -1) + 1;
    const ts = nowIso();
    const sessionExId = generateId();
    const ghostSets = await this.getGhostSetsForExercise(exerciseId, sessionId);
    const workingGhosts = ghostSets.filter((g) => g.setType !== 'W');

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO workout_session_exercises (
          id, session_id, exercise_id, original_exercise_id, routine_exercise_id,
          order_index, target_sets, rep_min, rep_max, rest_seconds, notes,
          sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, NULL, NULL, ?, 3, 8, 12, 90, '', 'pending', ?, ?)`,
        [sessionExId, sessionId, exerciseId, nextOrder, ts, ts]
      );

      for (let s = 0; s < 3; s += 1) {
        const ghost = workingGhosts[s] ?? workingGhosts[workingGhosts.length - 1];
        const w = ghost?.weight ?? 0;
        const r = ghost?.reps ?? 10;
        const mode = ghost?.weightMode ?? exercise.defaultWeightMode;
        const effW = computeEffectiveWeight(w, mode);

        await db.runAsync(
          `INSERT INTO workout_sets (
            id, session_id, session_exercise_id, exercise_id, set_order, set_type,
            weight, weight_mode, effective_weight, reps, rpe, rir, completed, completed_at,
            estimated_1rm, volume, is_pr_weight, is_pr_1rm, is_pr_volume, is_pr_reps,
            sync_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'N', ?, ?, ?, ?, NULL, NULL, 0, NULL, ?, ?, 0, 0, 0, 0, 'pending', ?, ?)`,
          [
            generateId(),
            sessionId,
            sessionExId,
            exerciseId,
            s + 1,
            w,
            mode,
            effW,
            r,
            computeEpley1RM(effW, r),
            computeSetVolume(w, mode, r),
            ts,
            ts,
          ]
        );
      }
    });
  },

  async removeExerciseFromSession(sessionExerciseId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM workout_session_exercises WHERE id = ?`, [
      sessionExerciseId,
    ]);
  },

  /**
   * Mid-workout exercise substitution WITHOUT mutating routine_exercises.
   */
  async substituteExercise(
    sessionExerciseId: string,
    newExerciseId: string
  ): Promise<void> {
    const db = await getDatabase();
    const current = await db.getFirstAsync<SessionExerciseRow>(
      `SELECT * FROM workout_session_exercises WHERE id = ?`,
      [sessionExerciseId]
    );
    const newEx = await exerciseRepository.getById(newExerciseId);
    if (!current || !newEx) return;

    const originalId = current.original_exercise_id ?? current.exercise_id;
    const ts = nowIso();
    const ghostSets = await this.getGhostSetsForExercise(newExerciseId, current.session_id);
    const workingGhosts = ghostSets.filter((g) => g.setType !== 'W');

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE workout_session_exercises
         SET exercise_id = ?, original_exercise_id = ?, updated_at = ?, sync_status = 'pending'
         WHERE id = ?`,
        [newExerciseId, originalId, ts, sessionExerciseId]
      );

      const existingSets = await db.getAllAsync<WorkoutSetRow>(
        `SELECT * FROM workout_sets WHERE session_exercise_id = ? ORDER BY set_order ASC`,
        [sessionExerciseId]
      );

      for (let i = 0; i < existingSets.length; i += 1) {
        const setRow = existingSets[i];
        if (!setRow) continue;
        const ghost = workingGhosts[i] ?? workingGhosts[workingGhosts.length - 1];
        const nextWeight = setRow.completed === 1 ? setRow.weight : ghost?.weight ?? 0;
        const nextReps = setRow.completed === 1 ? setRow.reps : ghost?.reps ?? current.rep_min;
        const nextMode = ghost?.weightMode ?? newEx.defaultWeightMode;
        const effW = computeEffectiveWeight(nextWeight, nextMode);

        await db.runAsync(
          `UPDATE workout_sets
           SET exercise_id = ?, weight = ?, weight_mode = ?, effective_weight = ?,
               reps = ?, estimated_1rm = ?, volume = ?, updated_at = ?, sync_status = 'pending'
           WHERE id = ?`,
          [
            newExerciseId,
            nextWeight,
            nextMode,
            effW,
            nextReps,
            computeEpley1RM(effW, nextReps),
            computeSetVolume(nextWeight, nextMode, nextReps),
            ts,
            setRow.id,
          ]
        );
      }
    });
  },

  async addSet(sessionExerciseId: string, setType: SetType = 'N'): Promise<WorkoutSet | null> {
    const db = await getDatabase();
    const exRow = await db.getFirstAsync<SessionExerciseRow>(
      `SELECT * FROM workout_session_exercises WHERE id = ?`,
      [sessionExerciseId]
    );
    if (!exRow) return null;

    const lastSet = await db.getFirstAsync<WorkoutSetRow>(
      `SELECT * FROM workout_sets WHERE session_exercise_id = ? ORDER BY set_order DESC LIMIT 1`,
      [sessionExerciseId]
    );
    const exercise = await exerciseRepository.getById(exRow.exercise_id);

    const nextOrder = (lastSet?.set_order ?? 0) + 1;
    const weight = lastSet?.weight ?? 0;
    const weightMode: WeightMode =
      lastSet?.weight_mode === 'per_side'
        ? 'per_side'
        : exercise?.defaultWeightMode ?? 'total';
    const reps = lastSet?.reps ?? exRow.rep_min;
    const effectiveWeight = computeEffectiveWeight(weight, weightMode);
    const volume = computeSetVolume(weight, weightMode, reps);
    const est1rm = computeEpley1RM(effectiveWeight, reps);
    const id = generateId();
    const ts = nowIso();

    await db.runAsync(
      `INSERT INTO workout_sets (
        id, session_id, session_exercise_id, exercise_id, set_order, set_type,
        weight, weight_mode, effective_weight, reps, rpe, rir, completed, completed_at,
        estimated_1rm, volume, is_pr_weight, is_pr_1rm, is_pr_volume, is_pr_reps,
        sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, NULL, ?, ?, 0, 0, 0, 0, 'pending', ?, ?)`,
      [
        id,
        exRow.session_id,
        sessionExerciseId,
        exRow.exercise_id,
        nextOrder,
        setType,
        weight,
        weightMode,
        effectiveWeight,
        reps,
        est1rm,
        volume,
        ts,
        ts,
      ]
    );

    const created = await db.getFirstAsync<WorkoutSetRow>(
      `SELECT * FROM workout_sets WHERE id = ?`,
      [id]
    );
    return created ? mapSetRow(created) : null;
  },

  async deleteSet(setId: string): Promise<void> {
    const db = await getDatabase();
    const target = await db.getFirstAsync<WorkoutSetRow>(
      `SELECT * FROM workout_sets WHERE id = ?`,
      [setId]
    );
    if (!target) return;

    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM workout_sets WHERE id = ?`, [setId]);
      const remaining = await db.getAllAsync<WorkoutSetRow>(
        `SELECT * FROM workout_sets WHERE session_exercise_id = ? ORDER BY set_order ASC`,
        [target.session_exercise_id]
      );
      for (let i = 0; i < remaining.length; i += 1) {
        const s = remaining[i];
        if (!s) continue;
        await db.runAsync(`UPDATE workout_sets SET set_order = ? WHERE id = ?`, [
          i + 1,
          s.id,
        ]);
      }
    });
  },

  async updateSet(setId: string, patch: UpdateSetPatch): Promise<WorkoutSet | null> {
    const db = await getDatabase();
    const current = await db.getFirstAsync<WorkoutSetRow>(
      `SELECT * FROM workout_sets WHERE id = ?`,
      [setId]
    );
    if (!current) return null;

    const setType: SetType = patch.setType ?? (current.set_type as SetType);
    const weight = patch.weight !== undefined ? Math.max(0, patch.weight) : current.weight;
    const weightMode: WeightMode =
      patch.weightMode ?? (current.weight_mode === 'per_side' ? 'per_side' : 'total');
    const reps = patch.reps !== undefined ? Math.max(0, Math.round(patch.reps)) : current.reps;
    const rpe = patch.rpe !== undefined ? patch.rpe : current.rpe;
    const rir =
      patch.rir !== undefined
        ? patch.rir
        : patch.rpe !== undefined
        ? estimateRirFromRpe(patch.rpe)
        : current.rir;
    const completed = patch.completed !== undefined ? patch.completed : current.completed === 1;

    const effectiveWeight = computeEffectiveWeight(weight, weightMode);
    const volume = computeSetVolume(weight, weightMode, reps);
    const est1rm = computeEpley1RM(effectiveWeight, reps);
    const ts = nowIso();
    const completedAt = completed ? current.completed_at ?? ts : null;

    let isPrWeight = 0;
    let isPr1rm = 0;
    let isPrVolume = 0;
    let isPrReps = 0;

    if (completed && isWorkingSet(setType) && reps > 0) {
      const userId = getActiveUserId();
      const hist = await db.getFirstAsync<{
        max_weight: number | null;
        max_1rm: number | null;
        max_volume: number | null;
        max_reps: number | null;
        total_prev: number;
      }>(
        `SELECT
           MAX(wset.effective_weight) AS max_weight,
           MAX(wset.estimated_1rm) AS max_1rm,
           MAX(wset.volume) AS max_volume,
           MAX(wset.reps) AS max_reps,
           COUNT(*) AS total_prev
         FROM workout_sets wset
         INNER JOIN workout_sessions ws ON ws.id = wset.session_id
         WHERE wset.exercise_id = ?
           AND wset.completed = 1
           AND wset.set_type != 'W'
           AND ws.status = 'completed'
           AND ws.deleted_at IS NULL
           AND ws.user_id = ?
           AND ws.id != ?`,
        [current.exercise_id, userId, current.session_id]
      );

      if (hist && hist.total_prev > 0) {
        if (effectiveWeight > 0 && effectiveWeight > (hist.max_weight ?? 0)) {
          isPrWeight = 1;
        }
        if (est1rm > 0 && est1rm > (hist.max_1rm ?? 0) + 0.1) {
          isPr1rm = 1;
        }
        if (volume > 0 && volume > (hist.max_volume ?? 0)) {
          isPrVolume = 1;
        }
        if (
          effectiveWeight >= (hist.max_weight ?? 0) &&
          reps > (hist.max_reps ?? 0)
        ) {
          isPrReps = 1;
        }
      }
    }

    await db.runAsync(
      `UPDATE workout_sets
       SET set_type = ?, weight = ?, weight_mode = ?, effective_weight = ?,
           reps = ?, rpe = ?, rir = ?, completed = ?, completed_at = ?,
           estimated_1rm = ?, volume = ?,
           is_pr_weight = ?, is_pr_1rm = ?, is_pr_volume = ?, is_pr_reps = ?,
           updated_at = ?, sync_status = 'pending'
       WHERE id = ?`,
      [
        setType,
        weight,
        weightMode,
        effectiveWeight,
        reps,
        rpe,
        rir,
        completed ? 1 : 0,
        completedAt,
        est1rm,
        volume,
        isPrWeight,
        isPr1rm,
        isPrVolume,
        isPrReps,
        ts,
        setId,
      ]
    );

    const updated = await db.getFirstAsync<WorkoutSetRow>(
      `SELECT * FROM workout_sets WHERE id = ?`,
      [setId]
    );
    return updated ? mapSetRow(updated) : null;
  },

  async finishWorkout(
    sessionId: string,
    durationSeconds: number,
    notes = ''
  ): Promise<PostWorkoutSummary> {
    const db = await getDatabase();
    const full = await this.getFullSession(sessionId);
    if (!full) {
      throw new Error('Sessão não encontrada.');
    }

    const finishedAt = nowIso();
    let totalTonnage = 0;
    let totalValidSets = 0;
    let rpeSum = 0;
    let rpeCount = 0;
    const musclesSet = new Set<MuscleGroup>();
    const records: PRBadge[] = [];

    for (const exItem of full.exercises) {
      const completedWorking = exItem.sets.filter(
        (s) => s.completed && isWorkingSet(s.setType)
      );
      if (completedWorking.length > 0) {
        musclesSet.add(exItem.exercise.muscleGroup);
      }

      let bestWeightInSession = 0;
      let best1rmInSession = 0;
      let bestSetVolInSession = 0;
      let bestRepsInSession = 0;
      let hasWeightPr = false;
      let has1rmPr = false;
      let hasVolumePr = false;
      let hasRepsPr = false;

      for (const s of completedWorking) {
        totalTonnage += s.volume;
        totalValidSets += 1;
        if (s.rpe !== null) {
          rpeSum += s.rpe;
          rpeCount += 1;
        }
        if (s.effectiveWeight > bestWeightInSession) bestWeightInSession = s.effectiveWeight;
        if (s.estimated1rm > best1rmInSession) best1rmInSession = s.estimated1rm;
        if (s.volume > bestSetVolInSession) bestSetVolInSession = s.volume;
        if (s.reps > bestRepsInSession) bestRepsInSession = s.reps;
        if (s.isPrWeight) hasWeightPr = true;
        if (s.isPr1rm) has1rmPr = true;
        if (s.isPrVolume) hasVolumePr = true;
        if (s.isPrReps) hasRepsPr = true;
      }

      if (hasWeightPr || has1rmPr || hasVolumePr || hasRepsPr) {
        const userId = getActiveUserId();
        const prevHist = await db.getFirstAsync<{
          max_w: number | null;
          max_1rm: number | null;
          max_vol: number | null;
          max_reps: number | null;
        }>(
          `SELECT
             MAX(wset.effective_weight) AS max_w,
             MAX(wset.estimated_1rm) AS max_1rm,
             MAX(wset.volume) AS max_vol,
             MAX(wset.reps) AS max_reps
           FROM workout_sets wset
           INNER JOIN workout_sessions ws ON ws.id = wset.session_id
           WHERE wset.exercise_id = ?
             AND wset.completed = 1
             AND wset.set_type != 'W'
             AND ws.status = 'completed'
             AND ws.deleted_at IS NULL
             AND ws.user_id = ?
             AND ws.id != ?`,
          [exItem.exerciseId, userId, sessionId]
        );

        if (hasWeightPr) {
          records.push({
            exerciseId: exItem.exerciseId,
            exerciseName: exItem.exercise.name,
            type: 'weight',
            label: 'PR de Carga',
            value: round2(bestWeightInSession),
            previousBest: prevHist?.max_w ?? null,
            unit: 'kg',
          });
        }
        if (has1rmPr) {
          records.push({
            exerciseId: exItem.exerciseId,
            exerciseName: exItem.exercise.name,
            type: '1rm',
            label: 'PR de 1RM Est.',
            value: round2(best1rmInSession),
            previousBest: prevHist?.max_1rm ? round2(prevHist.max_1rm) : null,
            unit: 'kg',
          });
        }
        if (hasVolumePr && !hasWeightPr) {
          records.push({
            exerciseId: exItem.exerciseId,
            exerciseName: exItem.exercise.name,
            type: 'volume',
            label: 'PR de Volume/Série',
            value: round2(bestSetVolInSession),
            previousBest: prevHist?.max_vol ? round2(prevHist.max_vol) : null,
            unit: 'kg',
          });
        }
        if (hasRepsPr && !hasWeightPr) {
          records.push({
            exerciseId: exItem.exerciseId,
            exerciseName: exItem.exercise.name,
            type: 'reps',
            label: 'PR de Reps',
            value: bestRepsInSession,
            previousBest: prevHist?.max_reps ?? null,
            unit: 'reps',
          });
        }
      }
    }

    let previousSessionTonnage: number | null = null;
    if (full.session.routineDayId) {
      const userId = getActiveUserId();
      const prevSession = await db.getFirstAsync<{ total_tonnage: number }>(
        `SELECT total_tonnage FROM workout_sessions
         WHERE routine_day_id = ? AND user_id = ? AND status = 'completed' AND deleted_at IS NULL AND id != ?
         ORDER BY started_at DESC LIMIT 1`,
        [full.session.routineDayId, userId, sessionId]
      );
      previousSessionTonnage = prevSession?.total_tonnage ?? null;
    }

    const roundedTonnage = round2(totalTonnage);
    await db.runAsync(
      `UPDATE workout_sessions
       SET status = 'completed', finished_at = ?, duration_seconds = ?,
           total_tonnage = ?, total_valid_sets = ?, notes = ?,
           updated_at = ?, sync_status = 'pending'
       WHERE id = ?`,
      [
        finishedAt,
        Math.max(1, durationSeconds),
        roundedTonnage,
        totalValidSets,
        notes.trim(),
        finishedAt,
        sessionId,
      ]
    );

    return {
      sessionId,
      title: full.session.title,
      durationSeconds: Math.max(1, durationSeconds),
      totalTonnage: roundedTonnage,
      totalValidSets,
      totalExercises: full.exercises.filter((e) => e.sets.some((s) => s.completed)).length,
      avgRpe: rpeCount > 0 ? round2(rpeSum / rpeCount) : null,
      musclesTrained: Array.from(musclesSet),
      records,
      previousSessionTonnage,
    };
  },

  async cancelWorkout(sessionId: string): Promise<void> {
    const db = await getDatabase();
    const ts = nowIso();
    await db.runAsync(
      `UPDATE workout_sessions SET status = 'cancelled', deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`,
      [ts, ts, sessionId]
    );
  },

  async listRecentCompleted(limit = 12): Promise<WorkoutSession[]> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const rows = await db.getAllAsync<SessionRow>(
      `SELECT * FROM workout_sessions
       WHERE status = 'completed' AND deleted_at IS NULL AND user_id = ?
       ORDER BY started_at DESC LIMIT ?`,
      [userId, limit]
    );
    return rows.map(mapSessionRow);
  },
};
