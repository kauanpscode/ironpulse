import { generateSalt, hashPassword, nowIso } from '../utils';
import {
  DEMO_USER_EMAIL,
  DEMO_USER_ID,
  DEMO_USER_NAME,
  DEMO_USER_PASSWORD,
} from './sessionState';
import type { AppDatabase } from './types';

interface TableInfoRow {
  name: string;
}

async function ensureColumn(
  db: AppDatabase,
  table: string,
  column: string,
  columnDef: string
): Promise<void> {
  const cols = await db.getAllAsync<TableInfoRow>(`PRAGMA table_info(${table});`);
  const exists = cols.some((c) => c.name === column);
  if (!exists) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${columnDef};`);
  }
}

export async function ensureDemoUserExists(db: AppDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM users WHERE id = ? OR email = ?`,
    [DEMO_USER_ID, DEMO_USER_EMAIL]
  );
  if (existing) return;

  const ts = nowIso();
  const salt = generateSalt();
  const passwordHash = hashPassword(DEMO_USER_PASSWORD, salt);

  await db.runAsync(
    `INSERT INTO users (id, name, email, password_hash, password_salt, goal, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'Hipertrofia', ?, ?)`,
    [DEMO_USER_ID, DEMO_USER_NAME, DEMO_USER_EMAIL, passwordHash, salt, ts, ts]
  );
}

/**
 * Safely migrates any existing v1 database (without user_id columns or users table)
 * to v2 without losing existing workout history.
 */
export async function ensureSchemaMigrations(db: AppDatabase): Promise<void> {
  await ensureColumn(db, 'exercises', 'user_id', 'TEXT');
  await ensureColumn(db, 'routines', 'user_id', 'TEXT');
  await ensureColumn(db, 'workout_sessions', 'user_id', 'TEXT');
  await ensureColumn(db, 'body_measurements', 'user_id', 'TEXT');
  await ensureColumn(db, 'cardio_sessions', 'user_id', 'TEXT');

  await ensureDemoUserExists(db);

  // Backfill any v1 rows that predate user accounts to the Demo User
  await db.runAsync(
    `UPDATE routines SET user_id = ? WHERE user_id IS NULL`,
    [DEMO_USER_ID]
  );
  await db.runAsync(
    `UPDATE workout_sessions SET user_id = ? WHERE user_id IS NULL`,
    [DEMO_USER_ID]
  );
  await db.runAsync(
    `UPDATE body_measurements SET user_id = ? WHERE user_id IS NULL`,
    [DEMO_USER_ID]
  );
  await db.runAsync(
    `UPDATE cardio_sessions SET user_id = ? WHERE user_id IS NULL`,
    [DEMO_USER_ID]
  );
  await db.runAsync(
    `UPDATE exercises SET user_id = ? WHERE is_custom = 1 AND user_id IS NULL`,
    [DEMO_USER_ID]
  );

  // Migration v3: replace legacy default routines (Upper/Lower + PPL) with the single default routine
  const migratedV3 = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM schema_meta WHERE key = 'default_routine_v3'`
  );
  const alreadySeeded = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM schema_meta WHERE key = 'seeded_at'`
  );

  if (!migratedV3 && alreadySeeded) {
    const {
      createStarterRoutinesForUser,
      ensurePrepopulatedExercises,
      runRealisticSeed,
    } = await import('./seed');

    await ensurePrepopulatedExercises(db);
    const ts = nowIso();

    // Soft-delete legacy default routines for all existing users
    const legacyNames = [
      'Upper / Lower 4x — Hipertrofia',
      'Push / Pull / Legs (PPL)',
    ];
    await db.runAsync(
      `UPDATE routines SET deleted_at = ?, is_active = 0, updated_at = ?
       WHERE deleted_at IS NULL AND name IN (?, ?)`,
      [ts, ts, legacyNames[0]!, legacyNames[1]!]
    );

    // Refresh Demo User's 4-week demo sessions to match the new default routine
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `DELETE FROM workout_sets WHERE session_id IN (SELECT id FROM workout_sessions WHERE user_id = ?)`,
        [DEMO_USER_ID]
      );
      await db.runAsync(
        `DELETE FROM workout_session_exercises WHERE session_id IN (SELECT id FROM workout_sessions WHERE user_id = ?)`,
        [DEMO_USER_ID]
      );
      await db.runAsync(`DELETE FROM workout_sessions WHERE user_id = ?`, [DEMO_USER_ID]);
      await db.runAsync(
        `DELETE FROM routine_exercises WHERE routine_day_id IN (SELECT id FROM routine_days WHERE routine_id IN (SELECT id FROM routines WHERE user_id = ?))`,
        [DEMO_USER_ID]
      );
      await db.runAsync(
        `DELETE FROM routine_days WHERE routine_id IN (SELECT id FROM routines WHERE user_id = ?)`,
        [DEMO_USER_ID]
      );
      await db.runAsync(`DELETE FROM routines WHERE user_id = ?`, [DEMO_USER_ID]);
      await db.runAsync(`DELETE FROM body_measurements WHERE user_id = ?`, [DEMO_USER_ID]);
      await db.runAsync(`DELETE FROM cardio_sessions WHERE user_id = ?`, [DEMO_USER_ID]);
    });
    await runRealisticSeed(db, DEMO_USER_ID);

    // For any other non-demo registered users, add the new single default routine if they have no active routine
    const otherUsers = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM users WHERE id != ?`,
      [DEMO_USER_ID]
    );
    for (const u of otherUsers) {
      const hasActive = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM routines WHERE user_id = ? AND deleted_at IS NULL AND is_active = 1 LIMIT 1`,
        [u.id]
      );
      if (!hasActive) {
        await createStarterRoutinesForUser(db, u.id);
      }
    }

    await db.runAsync(
      `INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('default_routine_v3', ?)`,
      [ts]
    );
  }
}
