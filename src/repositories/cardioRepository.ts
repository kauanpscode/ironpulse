import { getActiveUserId, getDatabase } from '../database';
import type {
  CardioIntensity,
  CardioModality,
  CardioSession,
  CreateCardioSessionInput,
  SyncStatus,
} from '../types';
import { generateId, nowIso } from '../utils';

interface CardioRow {
  id: string;
  performed_at: string;
  modality: string;
  duration_minutes: number;
  distance_km: number | null;
  intensity: string;
  calories_est: number | null;
  notes: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapCardioRow(row: CardioRow): CardioSession {
  return {
    id: row.id,
    performedAt: row.performed_at,
    modality: row.modality as CardioModality,
    durationMinutes: row.duration_minutes,
    distanceKm: row.distance_km,
    intensity: row.intensity as CardioIntensity,
    caloriesEst: row.calories_est,
    notes: row.notes,
    syncStatus: row.sync_status as SyncStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export const cardioRepository = {
  async list(limit = 50): Promise<CardioSession[]> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const rows = await db.getAllAsync<CardioRow>(
      `SELECT * FROM cardio_sessions WHERE deleted_at IS NULL AND user_id = ? ORDER BY performed_at DESC LIMIT ?`,
      [userId, limit]
    );
    return rows.map(mapCardioRow);
  },

  async create(input: CreateCardioSessionInput): Promise<CardioSession> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const id = generateId();
    const ts = nowIso();
    const notes = input.notes?.trim() ?? '';

    const estimatedCalories =
      input.caloriesEst ??
      Math.round(
        input.durationMinutes *
          (input.intensity === 'Alta' ? 12 : input.intensity === 'Moderada' ? 9 : 6.5)
      );

    await db.runAsync(
      `INSERT INTO cardio_sessions (
        id, user_id, performed_at, modality, duration_minutes, distance_km, intensity,
        calories_est, notes, sync_status, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL)`,
      [
        id,
        userId,
        input.performedAt,
        input.modality,
        input.durationMinutes,
        input.distanceKm ?? null,
        input.intensity,
        estimatedCalories,
        notes,
        ts,
        ts,
      ]
    );

    return {
      id,
      performedAt: input.performedAt,
      modality: input.modality,
      durationMinutes: input.durationMinutes,
      distanceKm: input.distanceKm ?? null,
      intensity: input.intensity,
      caloriesEst: estimatedCalories,
      notes,
      syncStatus: 'pending',
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    };
  },

  async remove(id: string): Promise<void> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const ts = nowIso();
    await db.runAsync(
      `UPDATE cardio_sessions SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ? AND user_id = ?`,
      [ts, ts, id, userId]
    );
  },
};
