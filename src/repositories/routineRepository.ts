import { getActiveUserId, getDatabase } from '../database';
import type {
  MuscleGroup,
  RoutineDayWithExercises,
  RoutineExerciseWithDetails,
  RoutineWithDays,
  SplitType,
  SyncStatus,
  WeightMode,
} from '../types';
import { generateId, nowIso } from '../utils';
import { exerciseRepository } from './exerciseRepository';

interface RoutineRow {
  id: string;
  name: string;
  split_type: string;
  description: string;
  is_active: number;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface RoutineDayRow {
  id: string;
  routine_id: string;
  name: string;
  day_order: number;
  focus_muscles: string;
  estimated_minutes: number;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface RoutineExerciseRow {
  id: string;
  routine_day_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  rest_seconds: number;
  weight_mode: string;
  notes: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function parseMuscles(raw: string): MuscleGroup[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MuscleGroup[]) : [];
  } catch {
    return [];
  }
}

export interface SaveRoutineExerciseInput {
  id?: string;
  exerciseId: string;
  targetSets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  weightMode: WeightMode;
  notes: string;
}

export interface SaveRoutineDayInput {
  id?: string;
  name: string;
  focusMuscles: MuscleGroup[];
  estimatedMinutes: number;
  exercises: SaveRoutineExerciseInput[];
}

export interface SaveRoutineInput {
  id?: string;
  name: string;
  splitType: SplitType;
  description: string;
  isActive: boolean;
  days: SaveRoutineDayInput[];
}

export const routineRepository = {
  async listWithDays(): Promise<RoutineWithDays[]> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const routineRows = await db.getAllAsync<RoutineRow>(
      `SELECT * FROM routines WHERE deleted_at IS NULL AND user_id = ? ORDER BY is_active DESC, updated_at DESC`,
      [userId]
    );
    if (routineRows.length === 0) return [];

    const dayRows = await db.getAllAsync<RoutineDayRow>(
      `SELECT * FROM routine_days WHERE deleted_at IS NULL ORDER BY day_order ASC`
    );
    const rxRows = await db.getAllAsync<RoutineExerciseRow>(
      `SELECT * FROM routine_exercises WHERE deleted_at IS NULL ORDER BY order_index ASC`
    );

    const uniqueExIds = Array.from(new Set(rxRows.map((r) => r.exercise_id)));
    const exercisesMap = await exerciseRepository.getByIds(uniqueExIds);

    const rxByDay = new Map<string, RoutineExerciseWithDetails[]>();
    for (const r of rxRows) {
      const exercise = exercisesMap.get(r.exercise_id);
      if (!exercise) continue;
      const list = rxByDay.get(r.routine_day_id) ?? [];
      list.push({
        id: r.id,
        routineDayId: r.routine_day_id,
        exerciseId: r.exercise_id,
        orderIndex: r.order_index,
        targetSets: r.target_sets,
        repMin: r.rep_min,
        repMax: r.rep_max,
        restSeconds: r.rest_seconds,
        weightMode: r.weight_mode === 'per_side' ? 'per_side' : 'total',
        notes: r.notes,
        syncStatus: r.sync_status as SyncStatus,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        deletedAt: r.deleted_at,
        exercise,
      });
      rxByDay.set(r.routine_day_id, list);
    }

    const daysByRoutine = new Map<string, RoutineDayWithExercises[]>();
    for (const d of dayRows) {
      const list = daysByRoutine.get(d.routine_id) ?? [];
      list.push({
        id: d.id,
        routineId: d.routine_id,
        name: d.name,
        dayOrder: d.day_order,
        focusMuscles: parseMuscles(d.focus_muscles),
        estimatedMinutes: d.estimated_minutes,
        syncStatus: d.sync_status as SyncStatus,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        deletedAt: d.deleted_at,
        exercises: rxByDay.get(d.id) ?? [],
      });
      daysByRoutine.set(d.routine_id, list);
    }

    return routineRows.map((row) => ({
      id: row.id,
      name: row.name,
      splitType: row.split_type as SplitType,
      description: row.description,
      isActive: row.is_active === 1,
      syncStatus: row.sync_status as SyncStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      days: daysByRoutine.get(row.id) ?? [],
    }));
  },

  async getById(id: string): Promise<RoutineWithDays | null> {
    const all = await this.listWithDays();
    return all.find((r) => r.id === id) ?? null;
  },

  async getActiveRoutine(): Promise<RoutineWithDays | null> {
    const all = await this.listWithDays();
    return all.find((r) => r.isActive) ?? all[0] ?? null;
  },

  async getDayWithExercises(routineDayId: string): Promise<RoutineDayWithExercises | null> {
    const all = await this.listWithDays();
    for (const r of all) {
      const found = r.days.find((d) => d.id === routineDayId);
      if (found) return found;
    }
    return null;
  },

  async setActiveRoutine(routineId: string): Promise<void> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const ts = nowIso();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE routines SET is_active = 0, updated_at = ?, sync_status = 'pending' WHERE deleted_at IS NULL AND user_id = ?`,
        [ts, userId]
      );
      await db.runAsync(
        `UPDATE routines SET is_active = 1, updated_at = ?, sync_status = 'pending' WHERE id = ? AND user_id = ?`,
        [ts, routineId, userId]
      );
    });
  },

  async saveRoutine(input: SaveRoutineInput): Promise<string> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const ts = nowIso();
    const routineId = input.id ?? generateId();

    await db.withTransactionAsync(async () => {
      if (input.isActive) {
        await db.runAsync(
          `UPDATE routines SET is_active = 0, updated_at = ?, sync_status = 'pending' WHERE deleted_at IS NULL AND user_id = ?`,
          [ts, userId]
        );
      }

      const existing = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM routines WHERE id = ? AND user_id = ?`,
        [routineId, userId]
      );

      if (existing) {
        await db.runAsync(
          `UPDATE routines SET name = ?, split_type = ?, description = ?, is_active = ?, updated_at = ?, sync_status = 'pending' WHERE id = ? AND user_id = ?`,
          [
            input.name.trim(),
            input.splitType,
            input.description.trim(),
            input.isActive ? 1 : 0,
            ts,
            routineId,
            userId,
          ]
        );
        // Soft-delete previous days and exercises for clean re-sync
        await db.runAsync(
          `UPDATE routine_exercises SET deleted_at = ?, updated_at = ?, sync_status = 'pending'
           WHERE routine_day_id IN (SELECT id FROM routine_days WHERE routine_id = ?) AND deleted_at IS NULL`,
          [ts, ts, routineId]
        );
        await db.runAsync(
          `UPDATE routine_days SET deleted_at = ?, updated_at = ?, sync_status = 'pending'
           WHERE routine_id = ? AND deleted_at IS NULL`,
          [ts, ts, routineId]
        );
      } else {
        await db.runAsync(
          `INSERT INTO routines (
            id, user_id, name, split_type, description, is_active, sync_status, created_at, updated_at, deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL)`,
          [
            routineId,
            userId,
            input.name.trim(),
            input.splitType,
            input.description.trim(),
            input.isActive ? 1 : 0,
            ts,
            ts,
          ]
        );
      }

      for (let dIdx = 0; dIdx < input.days.length; dIdx += 1) {
        const day = input.days[dIdx];
        if (!day) continue;
        const dayId = generateId();

        await db.runAsync(
          `INSERT INTO routine_days (
            id, routine_id, name, day_order, focus_muscles, estimated_minutes,
            sync_status, created_at, updated_at, deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL)`,
          [
            dayId,
            routineId,
            day.name.trim() || `Treino ${String.fromCharCode(65 + dIdx)}`,
            dIdx,
            JSON.stringify(day.focusMuscles),
            day.estimatedMinutes || 60,
            ts,
            ts,
          ]
        );

        for (let eIdx = 0; eIdx < day.exercises.length; eIdx += 1) {
          const rx = day.exercises[eIdx];
          if (!rx) continue;
          const rxId = generateId();
          await db.runAsync(
            `INSERT INTO routine_exercises (
              id, routine_day_id, exercise_id, order_index, target_sets,
              rep_min, rep_max, rest_seconds, weight_mode, notes,
              sync_status, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL)`,
            [
              rxId,
              dayId,
              rx.exerciseId,
              eIdx,
              Math.max(1, rx.targetSets),
              Math.max(1, rx.repMin),
              Math.max(rx.repMin, rx.repMax),
              Math.max(15, rx.restSeconds),
              rx.weightMode,
              rx.notes.trim(),
              ts,
              ts,
            ]
          );
        }
      }
    });

    return routineId;
  },

  async deleteRoutine(routineId: string): Promise<void> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const ts = nowIso();
    await db.runAsync(
      `UPDATE routines SET deleted_at = ?, is_active = 0, updated_at = ?, sync_status = 'pending' WHERE id = ? AND user_id = ?`,
      [ts, ts, routineId, userId]
    );
  },
};
