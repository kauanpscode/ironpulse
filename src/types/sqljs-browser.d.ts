declare module 'sql.js/dist/sql-wasm-browser.js' {
  export type SqlBindValue = string | number | null | Uint8Array;

  export interface SqlStatement {
    bind(values?: SqlBindValue[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, SqlBindValue>;
    free(): boolean;
  }

  export interface SqlDatabase {
    run(sql: string, params?: SqlBindValue[]): SqlDatabase;
    prepare(sql: string): SqlStatement;
    export(): Uint8Array;
    getRowsModified(): number;
    close(): void;
  }

  export interface SqlJsStatic {
    Database: new (data?: Uint8Array) => SqlDatabase;
  }

  export interface SqlJsBrowserConfig {
    locateFile?: (filename: string, prefix?: string) => string;
  }

  export default function initSqlJs(config?: SqlJsBrowserConfig): Promise<SqlJsStatic>;
}
