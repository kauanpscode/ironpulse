import { getActiveUserId, getDatabase } from '../database';
import type {
  BodyMeasurement,
  CreateBodyMeasurementInput,
  SyncStatus,
} from '../types';
import { generateId, nowIso } from '../utils';

interface BodyRow {
  id: string;
  measured_at: string;
  weight_kg: number;
  body_fat_pct: number | null;
  arm_cm: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  thigh_cm: number | null;
  notes: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapBodyRow(row: BodyRow): BodyMeasurement {
  return {
    id: row.id,
    measuredAt: row.measured_at,
    weightKg: row.weight_kg,
    bodyFatPct: row.body_fat_pct,
    armCm: row.arm_cm,
    chestCm: row.chest_cm,
    waistCm: row.waist_cm,
    thighCm: row.thigh_cm,
    notes: row.notes,
    syncStatus: row.sync_status as SyncStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export const bodyRepository = {
  async list(): Promise<BodyMeasurement[]> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const rows = await db.getAllAsync<BodyRow>(
      `SELECT * FROM body_measurements WHERE deleted_at IS NULL AND user_id = ? ORDER BY measured_at DESC, created_at DESC`,
      [userId]
    );
    return rows.map(mapBodyRow);
  },

  async create(input: CreateBodyMeasurementInput): Promise<BodyMeasurement> {
    const db = await getDatabase();
    const userId = getActiveUserId();
    const id = generateId();
    const ts = nowIso();
    const notes = input.notes?.trim() ?? '';

    await db.runAsync(
      `INSERT INTO body_measurements (
        id, user_id, measured_at, weight_kg, body_fat_pct, arm_cm, chest_cm, waist_cm, thigh_cm,
        notes, sync_status, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL)`,
      [
        id,
        userId,
        input.measuredAt,
        input.weightKg,
        input.bodyFatPct ?? null,
        input.armCm ?? null,
        input.chestCm ?? null,
        input.waistCm ?? null,
        input.thighCm ?? null,
        notes,
        ts,
        ts,
      ]
    );

    return {
      id,
      measuredAt: input.measuredAt,
      weightKg: input.weightKg,
      bodyFatPct: input.bodyFatPct ?? null,
      armCm: input.armCm ?? null,
      chestCm: input.chestCm ?? null,
      waistCm: input.waistCm ?? null,
      thighCm: input.thighCm ?? null,
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
      `UPDATE body_measurements SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ? AND user_id = ?`,
      [ts, ts, id, userId]
    );
  },
};
