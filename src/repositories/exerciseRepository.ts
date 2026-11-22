import { getActiveUserId, getDatabase } from '../database';
import type {
  CreateExerciseInput,
  EquipmentType,
  Exercise,
  MuscleGroup,
  SyncStatus,
  WeightMode,
} from '../types';
import { generateId, nowIso } from '../utils';

interface ExerciseRow {
  id: string;
  name: string;
  muscle_group: string;
  secondary_muscles: string;
  equipment: string;
  default_weight_mode: string;
  is_custom: number;
  notes: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function parseJsonMuscleArray(raw: string): MuscleGroup[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is MuscleGroup => typeof v === 'string') as MuscleGroup[];
    }
    return [];
  } catch {
    return [];
  }
}

export function mapExerciseRow(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group as MuscleGroup,
    secondaryMuscles: parseJsonMuscleArray(row.secondary_muscles),
    equipment: row.equipment as EquipmentType,
    defaultWeightMode: (row.default_weight_mode === 'per_side' ? 'per_side' : 'total') as WeightMode,
    isCustom: row.is_custom === 1,
    notes: row.notes,
    syncStatus: row.sync_status as SyncStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export interface ExerciseFilter {
  search?: string;
  muscleGroup?: MuscleGroup | 'Todos';
  equipment?: EquipmentType | 'Todos';
  customOnly?: boolean;
}

export const exerciseRepository = {
  async list(filter?: ExerciseFilter): Promise<Exercise[]> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const conditions: string[] = [
      'deleted_at IS NULL',
      '(user_id IS NULL OR user_id = ?)',
    ];
    const params: (string | number)[] = [userId];

    if (filter?.muscleGroup && filter.muscleGroup !== 'Todos') {
      conditions.push('muscle_group = ?');
      params.push(filter.muscleGroup);
    }
    if (filter?.equipment && filter.equipment !== 'Todos') {
      conditions.push('equipment = ?');
      params.push(filter.equipment);
    }
    if (filter?.customOnly) {
      conditions.push('is_custom = 1');
    }
    if (filter?.search && filter.search.trim().length > 0) {
      conditions.push('LOWER(name) LIKE ?');
      params.push(`%${filter.search.trim().toLowerCase()}%`);
    }

    const rows = await db.getAllAsync<ExerciseRow>(
      `SELECT * FROM exercises WHERE ${conditions.join(' AND ')} ORDER BY is_custom DESC, muscle_group ASC, name ASC`,
      params
    );
    return rows.map(mapExerciseRow);
  },

  async getById(id: string): Promise<Exercise | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ExerciseRow>(
      `SELECT * FROM exercises WHERE id = ?`,
      [id]
    );
    return row ? mapExerciseRow(row) : null;
  },

  async getByIds(ids: string[]): Promise<Map<string, Exercise>> {
    const map = new Map<string, Exercise>();
    if (ids.length === 0) return map;
    const db = await getDatabase();
    const placeholders = ids.map(() => '?').join(', ');
    const rows = await db.getAllAsync<ExerciseRow>(
      `SELECT * FROM exercises WHERE id IN (${placeholders})`,
      ids
    );
    for (const row of rows) {
      map.set(row.id, mapExerciseRow(row));
    }
    return map;
  },

  async create(input: CreateExerciseInput): Promise<Exercise> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const id = generateId();
    const ts = nowIso();
    const secondary = input.secondaryMuscles ?? [];
    const defaultWeightMode: WeightMode = input.defaultWeightMode ?? 'total';
    const notes = input.notes?.trim() ?? '';

    await db.runAsync(
      `INSERT INTO exercises (
        id, user_id, name, muscle_group, secondary_muscles, equipment,
        default_weight_mode, is_custom, notes, sync_status, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 'pending', ?, ?, NULL)`,
      [
        id,
        userId,
        input.name.trim(),
        input.muscleGroup,
        JSON.stringify(secondary),
        input.equipment,
        defaultWeightMode,
        notes,
        ts,
        ts,
      ]
    );

    return {
      id,
      name: input.name.trim(),
      muscleGroup: input.muscleGroup,
      secondaryMuscles: secondary,
      equipment: input.equipment,
      defaultWeightMode,
      isCustom: true,
      notes,
      syncStatus: 'pending',
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    };
  },

  async softDeleteCustom(id: string): Promise<void> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const ts = nowIso();
    await db.runAsync(
      `UPDATE exercises SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ? AND is_custom = 1 AND user_id = ?`,
      [ts, ts, id, userId]
    );
  },
};
