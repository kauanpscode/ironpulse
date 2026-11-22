const MONTHS_PT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

export function nowIso(): string {
  return new Date().toISOString();
}

export function toDateKey(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysAgoDate(daysAgo: number, hour = 18, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(toDateKey(isoA));
  const b = new Date(toDateKey(isoB));
  const diffMs = Math.abs(b.getTime() - a.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS_PT[date.getMonth()] ?? 'jan';
  return `${day} ${month}`;
}

export function formatDayMonthNumeric(iso: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export function formatWeekdayShort(iso: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return WEEKDAYS_PT[date.getDay()] ?? 'Seg';
}

export function formatDurationClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatDurationMinutesLabel(totalSeconds: number): string {
  const mins = Math.max(1, Math.round(totalSeconds / 60));
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  return `${mins} min`;
}

export function formatTonnage(kg: number): string {
  if (kg >= 10000) {
    return `${(kg / 1000).toFixed(1)}t`;
  }
  return `${Math.round(kg).toLocaleString('pt-BR')} kg`;
}

export function getStartOfWindowIso(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function getLastNDates(totalDays: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  for (let i = totalDays - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(toDateKey(d));
  }
  return dates;
}

/**
 * Computes current & best streak allowing up to 1 rest day between training sessions
 * (standard strength training cadence) or consecutive active days.
 * Here we compute strict weekly/active cadence: consecutive days with a workout OR
 * consecutive training days where rest gap <= 1 day (so 4x/week lifters maintain a realistic streak).
 */
export function computeStreaks(activeDateKeys: string[]): {
  currentStreak: number;
  bestStreak: number;
} {
  if (activeDateKeys.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const uniqueSorted = Array.from(new Set(activeDateKeys)).sort();
  let bestStreak = 1;
  let running = 1;

  for (let i = 1; i < uniqueSorted.length; i += 1) {
    const prev = uniqueSorted[i - 1];
    const curr = uniqueSorted[i];
    if (!prev || !curr) continue;
    const gap = daysBetween(prev, curr);
    if (gap <= 2) {
      // Allow 1 rest day between workouts in hypertrophy splits
      running += 1;
      if (running > bestStreak) {
        bestStreak = running;
      }
    } else {
      running = 1;
    }
  }

  const todayKey = toDateKey(new Date());
  const latestKey = uniqueSorted[uniqueSorted.length - 1];
  const daysSinceLatest = latestKey ? daysBetween(latestKey, todayKey) : 99;

  const currentStreak = daysSinceLatest <= 2 ? running : 0;

  return { currentStreak, bestStreak };
}
