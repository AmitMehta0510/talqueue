import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, RoleName, User } from "../lib/api";
import { getErrorMessage } from "../lib/format";
import { queryKeys } from "../lib/queryKeys";
import { authStorage } from "../lib/storage";
import { useToast } from "./ToastContext";

type AuthContextValue = {
  user: User | null;
  apiOnline: boolean | null;
  loading: boolean;
  login: (body: { email: string; password: string }) => Promise<void>;
  register: (body: {
    email: string;
    username: string;
    password: string;
    fullName: string;
    role: RoleName;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const refreshUser = useCallback(async () => {
    if (!authStorage.getToken()) {
      setUser(null);
      return null;
    }

    const result = await api.me();
    setUser(result.data);
    return result.data;
  }, []);

  useEffect(() => {
    const boot = async () => {
      try {
        await api.health();
        setApiOnline(true);
      } catch {
        setApiOnline(false);
      }

      if (authStorage.getToken()) {
        try {
          await refreshUser();
        } catch {
          authStorage.clearToken();
          setUser(null);
        }
      }

      setLoading(false);
    };

    boot();
  }, [refreshUser]);

  const login = useCallback(
    async (body: { email: string; password: string }) => {
      const result = await api.login(body);
      authStorage.setToken(result.data.token);
      setUser(result.data.user);
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
    },
    [queryClient],
  );

  const register = useCallback(
    async (body: Parameters<typeof api.register>[0]) => {
      const result = await api.register(body);
      authStorage.setToken(result.data.token);
      setUser(result.data.user);
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      if (authStorage.getToken()) {
        await api.logout();
      }
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      authStorage.clearToken();
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient, showToast]);

  const value = useMemo(
    () => ({
      user,
      apiOnline,
      loading,
      login,
      register,
      logout,
      refreshUser,
      setUser,
    }),
    [apiOnline, loading, login, logout, refreshUser, register, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
