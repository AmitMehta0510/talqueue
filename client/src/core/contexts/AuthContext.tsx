import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, RoleName, User } from "../../lib/api";
import { getErrorMessage } from "../utils/format";
import { queryKeys } from "../../lib/queryKeys";
import { authStorage } from "../utils/storage";
import { useToast } from "./ToastContext";

type AuthStatus = "checking" | "authenticated" | "anonymous";
type ApiStatus = "checking" | "online" | "offline";

type AuthContextValue = {
  user: User | null;
  apiOnline: boolean | null;
  apiStatus: ApiStatus;
  authStatus: AuthStatus;
  loading: boolean;
  authError: string | null;
  isAuthenticated: boolean;
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
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const clearSession = useCallback(() => {
    authStorage.clearToken();
    setUser(null);
    setAuthStatus("anonymous");
    queryClient.clear();
  }, [queryClient]);

  const setAuthUser = useCallback((nextUser: User | null) => {
    setUser(nextUser);
    setAuthStatus(nextUser ? "authenticated" : "anonymous");
  }, []);

  const refreshUser = useCallback(async () => {
    if (!authStorage.getToken()) {
      setUser(null);
      setAuthStatus("anonymous");
      return null;
    }

    try {
      const result = await api.me();

      setUser(result.data);
      setAuthStatus("authenticated");
      setAuthError(null);
      return result.data;
    } catch (error) {
      authStorage.clearToken();
      setUser(null);
      setAuthStatus("anonymous");
      setAuthError(getErrorMessage(error));
      throw error;
    }
  }, []);

  useEffect(() => {
    let active = true;

    const boot = async () => {
      try {
        await api.health();
        if (active) setApiStatus("online");
      } catch {
        if (active) setApiStatus("offline");
      }

      if (authStorage.getToken()) {
        try {
          await refreshUser();
        } catch {
          if (active) {
            setUser(null);
            setAuthStatus("anonymous");
          }
        }
      } else if (active) {
        setAuthStatus("anonymous");
      }

      if (active) setLoading(false);
    };

    boot();

    return () => {
      active = false;
    };
  }, [refreshUser]);

  useEffect(
    () =>
      authStorage.subscribe((token) => {
        if (!token) {
          setUser(null);
          setAuthStatus("anonymous");
          queryClient.clear();
          return;
        }

        refreshUser().catch(() => {
          setUser(null);
          setAuthStatus("anonymous");
        });
      }),
    [queryClient, refreshUser],
  );

  // When the API client's refresh-token interceptor detects a fully-expired
  // session (RT gone), it dispatches "auth:expired" so we clear state here
  // without a page reload or circular import.
  useEffect(() => {
    const onExpired = () => clearSession();
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, [clearSession]);

  const login = useCallback(
    async (body: { email: string; password: string }) => {
      const result = await api.login(body);

      authStorage.setToken(result.data.token);
      setUser(result.data.user);
      setAuthStatus("authenticated");
      setAuthError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
    },
    [queryClient],
  );

  const register = useCallback(
    async (body: Parameters<typeof api.register>[0]) => {
      const result = await api.register(body);

      authStorage.setToken(result.data.token);
      setUser(result.data.user);
      setAuthStatus("authenticated");
      setAuthError(null);
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
      clearSession();
    }
  }, [clearSession, showToast]);

  const apiOnline =
    apiStatus === "checking" ? null : apiStatus === "online";

  const value = useMemo(
    () => ({
      user,
      apiOnline,
      apiStatus,
      authStatus,
      loading,
      authError,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
      setUser: setAuthUser,
    }),
    [
      apiOnline,
      apiStatus,
      authError,
      authStatus,
      loading,
      login,
      logout,
      refreshUser,
      register,
      setAuthUser,
      user,
    ],
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
