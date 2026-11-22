export type SqlParam = string | number | null;

export interface AppDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params?: SqlParam[]): Promise<unknown>;
  getFirstAsync<T>(source: string, params?: SqlParam[]): Promise<T | null>;
  getAllAsync<T>(source: string, params?: SqlParam[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
