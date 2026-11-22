import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getDatabase, seedDatabaseIfNeeded } from '../database';

interface AppContextValue {
  isReady: boolean;
  initError: string | null;
  dataVersion: number;
  bumpDataVersion: () => void;
}

const AppContext = createContext<AppContextValue>({
  isReady: false,
  initError: null,
  dataVersion: 0,
  bumpDataVersion: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  const bumpDataVersion = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function bootstrap(): Promise<void> {
      try {
        const db = await getDatabase();
        await seedDatabaseIfNeeded(db);
        if (mounted) {
          setIsReady(true);
        }
      } catch (err) {
        if (mounted) {
          setInitError(
            err instanceof Error ? err.message : 'Erro ao inicializar banco SQLite.'
          );
        }
      }
    }
    void bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppContext.Provider value={{ isReady, initError, dataVersion, bumpDataVersion }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  return useContext(AppContext);
}
