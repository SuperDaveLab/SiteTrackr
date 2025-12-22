import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { loginRequest, type LoginPayload, type LoginResponse } from '../api/authApi';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY } from '../../../lib/storageKeys';

interface AuthContextValue {
  token: string | null;
  user: LoginResponse['user'] | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readStoredUser = (): LoginResponse['user'] | null => {
  const raw = localStorage.getItem(USER_INFO_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as LoginResponse['user'];
  } catch (error) {
    localStorage.removeItem(USER_INFO_KEY);
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [user, setUser] = useState<LoginResponse['user'] | null>(() => readStoredUser());

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await loginRequest(payload);
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(response.user));
    setToken(response.accessToken);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, isAuthenticated: Boolean(token), login, logout }),
    [token, user, login, logout]
  );

  return createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
