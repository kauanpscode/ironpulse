import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { workoutRepository, type UpdateSetPatch } from '../repositories';
import type { ActiveWorkoutFull, PostWorkoutSummary, SetType } from '../types';
import {
  hapticLight,
  hapticMedium,
  hapticSuccess,
  triggerRestTimerCompleteAlert,
} from '../utils';
import { useAppContext } from './AppProvider';
import { useAuth } from './AuthContext';

export interface RestTimerState {
  isRunning: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  exerciseName: string;
}

interface ActiveWorkoutContextValue {
  activeWorkout: ActiveWorkoutFull | null;
  elapsedSeconds: number;
  restTimer: RestTimerState;
  lastSummary: PostWorkoutSummary | null;
  isLoading: boolean;
  startFromRoutineDay: (routineDayId: string) => Promise<void>;
  startEmptyWorkout: (title?: string) => Promise<void>;
  refreshActiveWorkout: () => Promise<void>;
  updateSet: (setId: string, patch: UpdateSetPatch, triggerRestSeconds?: number, exerciseName?: string) => Promise<void>;
  addSet: (sessionExerciseId: string, setType?: SetType) => Promise<void>;
  deleteSet: (setId: string) => Promise<void>;
  addExercise: (exerciseId: string) => Promise<void>;
  removeExercise: (sessionExerciseId: string) => Promise<void>;
  substituteExercise: (sessionExerciseId: string, newExerciseId: string) => Promise<void>;
  finishWorkout: (notes?: string) => Promise<PostWorkoutSummary | null>;
  cancelWorkout: () => Promise<void>;
  clearLastSummary: () => void;
  startRestTimer: (seconds: number, exerciseName: string) => void;
  adjustRestTimer: (deltaSeconds: number) => void;
  skipRestTimer: () => void;
}

const INITIAL_REST: RestTimerState = {
  isRunning: false,
  remainingSeconds: 0,
  totalSeconds: 0,
  exerciseName: '',
};

const ActiveWorkoutContext = createContext<ActiveWorkoutContextValue | null>(null);

export function ActiveWorkoutProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { isReady, bumpDataVersion } = useAppContext();
  const { user } = useAuth();
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutFull | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restTimer, setRestTimer] = useState<RestTimerState>(INITIAL_REST);
  const [lastSummary, setLastSummary] = useState<PostWorkoutSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const restNotifiedRef = useRef(false);

  const refreshActiveWorkout = useCallback(async () => {
    const id = await workoutRepository.getInProgressSessionId();
    if (!id) {
      setActiveWorkout(null);
      setElapsedSeconds(0);
      return;
    }
    const full = await workoutRepository.getFullSession(id);
    setActiveWorkout(full);
    if (full) {
      const startedMs = new Date(full.session.startedAt).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedMs) / 1000)));
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      setActiveWorkout(null);
      setElapsedSeconds(0);
      setRestTimer(INITIAL_REST);
      setLastSummary(null);
      return;
    }
    void refreshActiveWorkout();
  }, [isReady, user?.id, refreshActiveWorkout]);

  // Global workout stopwatch
  useEffect(() => {
    if (!activeWorkout) return;
    const startedMs = new Date(activeWorkout.session.startedAt).getTime();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedMs) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout?.session.id, activeWorkout?.session.startedAt]);

  // Global rest countdown timer
  useEffect(() => {
    if (!restTimer.isRunning) return;
    const interval = setInterval(() => {
      setRestTimer((prev) => {
        if (!prev.isRunning) return prev;
        if (prev.remainingSeconds <= 1) {
          if (!restNotifiedRef.current) {
            restNotifiedRef.current = true;
            void triggerRestTimerCompleteAlert();
          }
          return { ...INITIAL_REST };
        }
        return {
          ...prev,
          remainingSeconds: prev.remainingSeconds - 1,
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimer.isRunning]);

  const startRestTimer = useCallback((seconds: number, exerciseName: string) => {
    const safe = Math.max(10, Math.round(seconds));
    restNotifiedRef.current = false;
    setRestTimer({
      isRunning: true,
      remainingSeconds: safe,
      totalSeconds: safe,
      exerciseName,
    });
  }, []);

  const adjustRestTimer = useCallback((deltaSeconds: number) => {
    void hapticLight();
    setRestTimer((prev) => {
      if (!prev.isRunning) return prev;
      const nextRemaining = Math.max(5, prev.remainingSeconds + deltaSeconds);
      const nextTotal = Math.max(prev.totalSeconds, nextRemaining);
      return {
        ...prev,
        remainingSeconds: nextRemaining,
        totalSeconds: nextTotal,
      };
    });
  }, []);

  const skipRestTimer = useCallback(() => {
    void hapticLight();
    setRestTimer(INITIAL_REST);
  }, []);

  const startFromRoutineDay = useCallback(async (routineDayId: string) => {
    setIsLoading(true);
    try {
      const existingId = await workoutRepository.getInProgressSessionId();
      if (existingId) {
        const existing = await workoutRepository.getFullSession(existingId);
        if (existing) {
          setActiveWorkout(existing);
          return;
        }
      }
      const created = await workoutRepository.startFromRoutineDay(routineDayId);
      setActiveWorkout(created);
      setElapsedSeconds(0);
      setRestTimer(INITIAL_REST);
      void hapticMedium();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startEmptyWorkout = useCallback(async (title?: string) => {
    setIsLoading(true);
    try {
      const existingId = await workoutRepository.getInProgressSessionId();
      if (existingId) {
        const existing = await workoutRepository.getFullSession(existingId);
        if (existing) {
          setActiveWorkout(existing);
          return;
        }
      }
      const created = await workoutRepository.startEmptyWorkout(title);
      setActiveWorkout(created);
      setElapsedSeconds(0);
      setRestTimer(INITIAL_REST);
      void hapticMedium();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSet = useCallback(
    async (
      setId: string,
      patch: UpdateSetPatch,
      triggerRestSeconds?: number,
      exerciseName?: string
    ) => {
      const updated = await workoutRepository.updateSet(setId, patch);
      if (!updated) return;

      if (patch.completed === true) {
        if (updated.isPrWeight || updated.isPr1rm) {
          void hapticSuccess();
        } else {
          void hapticMedium();
        }
        if (triggerRestSeconds && triggerRestSeconds > 0) {
          startRestTimer(triggerRestSeconds, exerciseName ?? 'Descanso');
        }
      }

      setActiveWorkout((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) => ({
            ...ex,
            sets: ex.sets.map((s) => (s.id === setId ? updated : s)),
          })),
        };
      });
    },
    [startRestTimer]
  );

  const addSet = useCallback(
    async (sessionExerciseId: string, setType: SetType = 'N') => {
      void hapticLight();
      const created = await workoutRepository.addSet(sessionExerciseId, setType);
      if (!created) return;
      setActiveWorkout((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex.id === sessionExerciseId
              ? { ...ex, sets: [...ex.sets, created] }
              : ex
          ),
        };
      });
    },
    []
  );

  const deleteSet = useCallback(async (setId: string) => {
    void hapticLight();
    await workoutRepository.deleteSet(setId);
    await refreshActiveWorkout();
  }, [refreshActiveWorkout]);

  const addExercise = useCallback(
    async (exerciseId: string) => {
      if (!activeWorkout) return;
      void hapticLight();
      await workoutRepository.addExerciseToSession(activeWorkout.session.id, exerciseId);
      await refreshActiveWorkout();
    },
    [activeWorkout, refreshActiveWorkout]
  );

  const removeExercise = useCallback(
    async (sessionExerciseId: string) => {
      void hapticLight();
      await workoutRepository.removeExerciseFromSession(sessionExerciseId);
      await refreshActiveWorkout();
    },
    [refreshActiveWorkout]
  );

  const substituteExercise = useCallback(
    async (sessionExerciseId: string, newExerciseId: string) => {
      void hapticMedium();
      await workoutRepository.substituteExercise(sessionExerciseId, newExerciseId);
      await refreshActiveWorkout();
    },
    [refreshActiveWorkout]
  );

  const finishWorkout = useCallback(
    async (notes = ''): Promise<PostWorkoutSummary | null> => {
      if (!activeWorkout) return null;
      const summary = await workoutRepository.finishWorkout(
        activeWorkout.session.id,
        elapsedSeconds,
        notes
      );
      void hapticSuccess();
      setActiveWorkout(null);
      setRestTimer(INITIAL_REST);
      setElapsedSeconds(0);
      setLastSummary(summary);
      bumpDataVersion();
      return summary;
    },
    [activeWorkout, elapsedSeconds, bumpDataVersion]
  );

  const cancelWorkout = useCallback(async () => {
    if (!activeWorkout) return;
    await workoutRepository.cancelWorkout(activeWorkout.session.id);
    setActiveWorkout(null);
    setRestTimer(INITIAL_REST);
    setElapsedSeconds(0);
    bumpDataVersion();
  }, [activeWorkout, bumpDataVersion]);

  const clearLastSummary = useCallback(() => {
    setLastSummary(null);
  }, []);

  return (
    <ActiveWorkoutContext.Provider
      value={{
        activeWorkout,
        elapsedSeconds,
        restTimer,
        lastSummary,
        isLoading,
        startFromRoutineDay,
        startEmptyWorkout,
        refreshActiveWorkout,
        updateSet,
        addSet,
        deleteSet,
        addExercise,
        removeExercise,
        substituteExercise,
        finishWorkout,
        cancelWorkout,
        clearLastSummary,
        startRestTimer,
        adjustRestTimer,
        skipRestTimer,
      }}
    >
      {children}
    </ActiveWorkoutContext.Provider>
  );
}

export function useActiveWorkout(): ActiveWorkoutContextValue {
  const ctx = useContext(ActiveWorkoutContext);
  if (!ctx) {
    throw new Error('useActiveWorkout must be used within ActiveWorkoutProvider');
  }
  return ctx;
}
