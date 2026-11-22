import initSqlJs, { type SqlDatabase } from 'sql.js/dist/sql-wasm-browser.js';
import { ensureSchemaMigrations } from './migrations';
import { CURRENT_SCHEMA_VERSION, SCHEMA_STATEMENTS } from './schema';
import type { AppDatabase, SqlParam } from './types';

const STORAGE_KEY = 'ironpulse_sqlite_v1_b64';

interface BrowserGlobalScope {
  localStorage?: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
  };
  atob?: (data: string) => string;
  btoa?: (data: string) => string;
}

function getBrowserScope(): BrowserGlobalScope {
  return globalThis as unknown as BrowserGlobalScope;
}

function uint8ToBase64(bytes: Uint8Array): string {
  const scope = getBrowserScope();
  if (!scope.btoa) return '';
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return scope.btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array | null {
  const scope = getBrowserScope();
  if (!scope.atob) return null;
  try {
    const binary = scope.atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function persistToStorage(db: SqlDatabase): void {
  const scope = getBrowserScope();
  if (!scope.localStorage) return;
  try {
    const data = db.export();
    scope.localStorage.setItem(STORAGE_KEY, uint8ToBase64(data));
  } catch {
    // Ignore storage quota errors
  }
}

function loadFromStorage(): Uint8Array | null {
  const scope = getBrowserScope();
  if (!scope.localStorage) return null;
  const raw = scope.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return base64ToUint8(raw);
}

class WebSqlJsDatabase implements AppDatabase {
  private db: SqlDatabase;
  private inTransaction = false;

  constructor(db: SqlDatabase) {
    this.db = db;
  }

  private saveIfNotInTx(): void {
    if (!this.inTransaction) {
      persistToStorage(this.db);
    }
  }

  async execAsync(source: string): Promise<void> {
    this.db.run(source);
    if (!/^\s*PRAGMA\b/i.test(source)) {
      this.saveIfNotInTx();
    }
  }

  async runAsync(source: string, params?: SqlParam[]): Promise<unknown> {
    if (params && params.length > 0) {
      this.db.run(source, params);
    } else {
      this.db.run(source);
    }
    this.saveIfNotInTx();
    return { changes: this.db.getRowsModified() };
  }

  async getFirstAsync<T>(source: string, params?: SqlParam[]): Promise<T | null> {
    const rows = await this.getAllAsync<T>(source, params);
    return rows[0] ?? null;
  }

  async getAllAsync<T>(source: string, params?: SqlParam[]): Promise<T[]> {
    const stmt = this.db.prepare(source);
    try {
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      const results: T[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as unknown as T);
      }
      return results;
    } finally {
      stmt.free();
    }
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    const nested = this.inTransaction;
    if (!nested) {
      this.inTransaction = true;
      this.db.run('BEGIN TRANSACTION;');
    }
    try {
      await task();
      if (!nested) {
        this.db.run('COMMIT;');
        this.inTransaction = false;
        persistToStorage(this.db);
      }
    } catch (err) {
      if (!nested) {
        try {
          this.db.run('ROLLBACK;');
        } catch {
          // Ignore rollback error
        }
        this.inTransaction = false;
      }
      throw err;
    }
  }
}

let dbInstance: AppDatabase | null = null;
let initPromise: Promise<AppDatabase> | null = null;

export async function getDatabase(): Promise<AppDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  if (!initPromise) {
    initPromise = openAndMigrateWebDatabase();
  }
  dbInstance = await initPromise;
  return dbInstance;
}

async function openAndMigrateWebDatabase(): Promise<AppDatabase> {
  const SQL = await initSqlJs({
    locateFile: () => '/sql-wasm-browser.wasm',
  });

  const saved = loadFromStorage();
  const rawDb = saved ? new SQL.Database(saved) : new SQL.Database();
  const db = new WebSqlJsDatabase(rawDb);

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
