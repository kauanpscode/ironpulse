export const CURRENT_SCHEMA_VERSION = 3;

export const SCHEMA_STATEMENTS: readonly string[] = [
  `PRAGMA foreign_keys = ON;`,

  `CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    goal TEXT NOT NULL DEFAULT 'Hipertrofia',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    last_active_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    name TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    secondary_muscles TEXT NOT NULL DEFAULT '[]',
    equipment TEXT NOT NULL,
    default_weight_mode TEXT NOT NULL DEFAULT 'total',
    is_custom INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    sync_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS routines (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    name TEXT NOT NULL,
    split_type TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS routine_days (
    id TEXT PRIMARY KEY NOT NULL,
    routine_id TEXT NOT NULL,
    name TEXT NOT NULL,
    day_order INTEGER NOT NULL,
    focus_muscles TEXT NOT NULL DEFAULT '[]',
    estimated_minutes INTEGER NOT NULL DEFAULT 60,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS routine_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    routine_day_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    target_sets INTEGER NOT NULL DEFAULT 3,
    rep_min INTEGER NOT NULL DEFAULT 8,
    rep_max INTEGER NOT NULL DEFAULT 12,
    rest_seconds INTEGER NOT NULL DEFAULT 90,
    weight_mode TEXT NOT NULL DEFAULT 'total',
    notes TEXT NOT NULL DEFAULT '',
    sync_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (routine_day_id) REFERENCES routine_days(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
  );`,

  `CREATE TABLE IF NOT EXISTS workout_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    routine_id TEXT,
    routine_day_id TEXT,
    title TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    total_tonnage REAL NOT NULL DEFAULT 0,
    total_valid_sets INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'in_progress',
    sync_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (routine_id) REFERENCES routines(id),
    FOREIGN KEY (routine_day_id) REFERENCES routine_days(id)
  );`,

  `CREATE TABLE IF NOT EXISTS workout_session_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    original_exercise_id TEXT,
    routine_exercise_id TEXT,
    order_index INTEGER NOT NULL,
    target_sets INTEGER NOT NULL DEFAULT 3,
    rep_min INTEGER NOT NULL DEFAULT 8,
    rep_max INTEGER NOT NULL DEFAULT 12,
    rest_seconds INTEGER NOT NULL DEFAULT 90,
    notes TEXT NOT NULL DEFAULT '',
    sync_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id),
    FOREIGN KEY (original_exercise_id) REFERENCES exercises(id),
    FOREIGN KEY (routine_exercise_id) REFERENCES routine_exercises(id)
  );`,

  `CREATE TABLE IF NOT EXISTS workout_sets (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL,
    session_exercise_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    set_order INTEGER NOT NULL,
    set_type TEXT NOT NULL DEFAULT 'N',
    weight REAL NOT NULL DEFAULT 0,
    weight_mode TEXT NOT NULL DEFAULT 'total',
    effective_weight REAL NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0,
    rpe REAL,
    rir INTEGER,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    estimated_1rm REAL NOT NULL DEFAULT 0,
    volume REAL NOT NULL DEFAULT 0,
    is_pr_weight INTEGER NOT NULL DEFAULT 0,
    is_pr_1rm INTEGER NOT NULL DEFAULT 0,
    is_pr_volume INTEGER NOT NULL DEFAULT 0,
    is_pr_reps INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (session_exercise_id) REFERENCES workout_session_exercises(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
  );`,

  `CREATE TABLE IF NOT EXISTS body_measurements (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    measured_at TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    body_fat_pct REAL,
    arm_cm REAL,
    chest_cm REAL,
    waist_cm REAL,
    thigh_cm REAL,
    notes TEXT NOT NULL DEFAULT '',
    sync_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS cardio_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    performed_at TEXT NOT NULL,
    modality TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    distance_km REAL,
    intensity TEXT NOT NULL,
    calories_est INTEGER,
    notes TEXT NOT NULL DEFAULT '',
    sync_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );`,

  // Performance indexes for auth, analytics & active workout lookups
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
  `CREATE INDEX IF NOT EXISTS idx_auth_sessions_active ON auth_sessions(is_active, last_active_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises(muscle_group) WHERE deleted_at IS NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_routine_days_routine ON routine_days(routine_id, day_order);`,
  `CREATE INDEX IF NOT EXISTS idx_routine_exercises_day ON routine_exercises(routine_day_id, order_index);`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_status_date ON workout_sessions(status, started_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON workout_session_exercises(session_id, order_index);`,
  `CREATE INDEX IF NOT EXISTS idx_sets_session_exercise ON workout_sets(session_exercise_id, set_order);`,
  `CREATE INDEX IF NOT EXISTS idx_sets_exercise_completed ON workout_sets(exercise_id, completed, completed_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_body_measurements_date ON body_measurements(measured_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_cardio_sessions_date ON cardio_sessions(performed_at DESC);`,
];
