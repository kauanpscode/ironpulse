import * as SQLite from 'expo-sqlite';
import { ensureSchemaMigrations } from './migrations';
import { CURRENT_SCHEMA_VERSION, SCHEMA_STATEMENTS } from './schema';
import type { AppDatabase, SqlParam } from './types';

const DB_NAME = 'ironpulse_v1.db';

let dbInstance: AppDatabase | null = null;
let initPromise: Promise<AppDatabase> | null = null;

function wrapNativeDb(nativeDb: SQLite.SQLiteDatabase): AppDatabase {
  return {
    execAsync: (source: string) => nativeDb.execAsync(source),
    runAsync: (source: string, params?: SqlParam[]) =>
      params ? nativeDb.runAsync(source, params) : nativeDb.runAsync(source),
    getFirstAsync: <T>(source: string, params?: SqlParam[]) =>
      params
        ? nativeDb.getFirstAsync<T>(source, params)
        : nativeDb.getFirstAsync<T>(source),
    getAllAsync: <T>(source: string, params?: SqlParam[]) =>
      params
        ? nativeDb.getAllAsync<T>(source, params)
        : nativeDb.getAllAsync<T>(source),
    withTransactionAsync: (task: () => Promise<void>) =>
      nativeDb.withTransactionAsync(task),
  };
}

export async function getDatabase(): Promise<AppDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  if (!initPromise) {
    initPromise = openAndMigrateDatabase();
  }
  dbInstance = await initPromise;
  return dbInstance;
}

async function openAndMigrateDatabase(): Promise<AppDatabase> {
  const raw = await SQLite.openDatabaseAsync(DB_NAME);
  const db = wrapNativeDb(raw);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  for (const statement of SCHEMA_STATEMENTS) {
    await db.execAsync(statement);
  }

  await ensureSchemaMigrations(db);

  await db.runAsync(
    `INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', ?)`,
    [String(CURRENT_SCHEMA_VERSION)]
  );

  return db;
}

export async function resetDatabaseSchema(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  const tables = [
    'workout_sets',
    'workout_session_exercises',
    'workout_sessions',
    'routine_exercises',
    'routine_days',
    'routines',
    'body_measurements',
    'cardio_sessions',
    'exercises',
    'schema_meta',
  ];
  for (const table of tables) {
    await db.execAsync(`DELETE FROM ${table};`);
  }
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.runAsync(
    `INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', ?)`,
    [String(CURRENT_SCHEMA_VERSION)]
  );
}
