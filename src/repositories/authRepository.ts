import {
  createStarterRoutinesForUser,
  DEMO_USER_EMAIL,
  DEMO_USER_PASSWORD,
  ensureDemoUserExists,
  getDatabase,
} from '../database';
import type {
  LoginInput,
  RegisterInput,
  TrainingGoal,
  UpdateProfileInput,
  UserAccount,
} from '../types';
import {
  generateId,
  generateSalt,
  hashPassword,
  isValidEmail,
  normalizeEmail,
  nowIso,
  verifyPassword,
} from '../utils';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  password_salt: string;
  goal: string;
  created_at: string;
  updated_at: string;
}

function mapUserRow(row: UserRow): UserAccount {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    goal: row.goal as TrainingGoal,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export const authRepository = {
  async getCurrentSessionUser(): Promise<UserAccount | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<UserRow>(
      `SELECT u.*
       FROM auth_sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.is_active = 1
       ORDER BY s.last_active_at DESC
       LIMIT 1`
    );
    if (!row) return null;

    await db.runAsync(
      `UPDATE auth_sessions SET last_active_at = ? WHERE user_id = ? AND is_active = 1`,
      [nowIso(), row.id]
    );
    return mapUserRow(row);
  },

  async createSessionForUser(userId: string): Promise<void> {
    const db = await getDatabase();
    const ts = nowIso();
    await db.withTransactionAsync(async () => {
      await db.runAsync(`UPDATE auth_sessions SET is_active = 0 WHERE is_active = 1`);
      await db.runAsync(
        `INSERT INTO auth_sessions (id, user_id, token, is_active, created_at, last_active_at)
         VALUES (?, ?, ?, 1, ?, ?)`,
        [generateId(), userId, `local_${generateId()}`, ts, ts]
      );
    });
  },

  async register(input: RegisterInput): Promise<UserAccount> {
    const name = input.name.trim();
    const email = normalizeEmail(input.email);
    const password = input.password;

    if (name.length < 2) {
      throw new AuthError('Informe seu nome (mínimo 2 caracteres).');
    }
    if (!isValidEmail(email)) {
      throw new AuthError('Informe um e-mail válido.');
    }
    if (password.length < 6) {
      throw new AuthError('A senha deve ter pelo menos 6 caracteres.');
    }

    const db = await getDatabase();
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM users WHERE email = ?`,
      [email]
    );
    if (existing) {
      throw new AuthError('Já existe uma conta cadastrada com este e-mail.');
    }

    const userId = generateId();
    const ts = nowIso();
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    await db.runAsync(
      `INSERT INTO users (id, name, email, password_hash, password_salt, goal, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, email, passwordHash, salt, input.goal, ts, ts]
    );

    if (input.includeStarterRoutines) {
      await createStarterRoutinesForUser(db, userId);
    }

    await this.createSessionForUser(userId);

    return {
      id: userId,
      name,
      email,
      goal: input.goal,
      createdAt: ts,
      updatedAt: ts,
    };
  },

  async login(input: LoginInput): Promise<UserAccount> {
    const email = normalizeEmail(input.email);
    const password = input.password;

    if (!isValidEmail(email)) {
      throw new AuthError('Informe um e-mail válido.');
    }
    if (!password) {
      throw new AuthError('Informe sua senha.');
    }

    const db = await getDatabase();
    if (email === DEMO_USER_EMAIL) {
      await ensureDemoUserExists(db);
    }

    const userRow = await db.getFirstAsync<UserRow>(
      `SELECT * FROM users WHERE email = ?`,
      [email]
    );

    if (!userRow || !verifyPassword(password, userRow.password_salt, userRow.password_hash)) {
      throw new AuthError('E-mail ou senha incorretos.');
    }

    await this.createSessionForUser(userRow.id);
    return mapUserRow(userRow);
  },

  async loginDemo(): Promise<UserAccount> {
    return this.login({
      email: DEMO_USER_EMAIL,
      password: DEMO_USER_PASSWORD,
    });
  },

  async logout(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`UPDATE auth_sessions SET is_active = 0 WHERE is_active = 1`);
  },

  async updateProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<UserAccount> {
    const name = input.name.trim();
    if (name.length < 2) {
      throw new AuthError('O nome deve ter pelo menos 2 caracteres.');
    }

    const db = await getDatabase();
    const ts = nowIso();
    await db.runAsync(
      `UPDATE users SET name = ?, goal = ?, updated_at = ? WHERE id = ?`,
      [name, input.goal, ts, userId]
    );

    const updated = await db.getFirstAsync<UserRow>(
      `SELECT * FROM users WHERE id = ?`,
      [userId]
    );
    if (!updated) {
      throw new AuthError('Conta não encontrada.');
    }
    return mapUserRow(updated);
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    if (newPassword.length < 6) {
      throw new AuthError('A nova senha deve ter pelo menos 6 caracteres.');
    }

    const db = await getDatabase();
    const userRow = await db.getFirstAsync<UserRow>(
      `SELECT * FROM users WHERE id = ?`,
      [userId]
    );
    if (!userRow) {
      throw new AuthError('Conta não encontrada.');
    }

    if (!verifyPassword(currentPassword, userRow.password_salt, userRow.password_hash)) {
      throw new AuthError('A senha atual está incorreta.');
    }

    const newSalt = generateSalt();
    const newHash = hashPassword(newPassword, newSalt);
    await db.runAsync(
      `UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?`,
      [newHash, newSalt, nowIso(), userId]
    );
  },
};
