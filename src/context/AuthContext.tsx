import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { setActiveUserId } from '../database';
import { authRepository } from '../repositories';
import type {
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  UserAccount,
} from '../types';
import { hapticMedium, hapticSuccess } from '../utils';
import { useAppContext } from './AppProvider';

interface AuthContextValue {
  user: UserAccount | null;
  isAuthLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { isReady, bumpDataVersion } = useAppContext();
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    let mounted = true;
    async function restoreSession(): Promise<void> {
      try {
        const sessionUser = await authRepository.getCurrentSessionUser();
        if (mounted) {
          setActiveUserId(sessionUser?.id ?? null);
          setUser(sessionUser);
        }
      } finally {
        if (mounted) {
          setIsAuthLoading(false);
        }
      }
    }
    void restoreSession();
    return () => {
      mounted = false;
    };
  }, [isReady]);

  const login = useCallback(
    async (input: LoginInput) => {
      const account = await authRepository.login(input);
      setActiveUserId(account.id);
      setUser(account);
      void hapticSuccess();
      bumpDataVersion();
    },
    [bumpDataVersion]
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const account = await authRepository.register(input);
      setActiveUserId(account.id);
      setUser(account);
      void hapticSuccess();
      bumpDataVersion();
    },
    [bumpDataVersion]
  );

  const loginDemo = useCallback(async () => {
    const account = await authRepository.loginDemo();
    setActiveUserId(account.id);
    setUser(account);
    void hapticSuccess();
    bumpDataVersion();
  }, [bumpDataVersion]);

  const logout = useCallback(async () => {
    void hapticMedium();
    await authRepository.logout();
    setActiveUserId(null);
    setUser(null);
    bumpDataVersion();
  }, [bumpDataVersion]);

  const updateProfile = useCallback(
    async (input: UpdateProfileInput) => {
      if (!user) return;
      const updated = await authRepository.updateProfile(user.id, input);
      setUser(updated);
      void hapticSuccess();
      bumpDataVersion();
    },
    [user, bumpDataVersion]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user) return;
      await authRepository.changePassword(user.id, currentPassword, newPassword);
      void hapticSuccess();
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthLoading,
        login,
        register,
        loginDemo,
        logout,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
