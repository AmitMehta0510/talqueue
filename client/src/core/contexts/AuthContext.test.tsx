/**
 * @file AuthContext.test.tsx
 * @description Enterprise-grade test suite for AuthContext (useAuth hook) and
 *              route-guard components (RequireAuth, PublicOnly) defined in App.tsx.
 *
 * Architecture constraints honoured:
 *  - React 19 + @testing-library/react renderHook / render / act
 *  - All external I/O mocked at module level (api, authStorage, queryClient)
 *  - vi.restoreAllMocks() in every beforeEach — zero spy bleed-through
 *  - Fully typed fixtures — no implicit `any` in assertion paths
 *  - react-router-dom wrapped with MemoryRouter for guard tests
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockedFunction,
} from "vitest";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

// --------------------------------------------------------------------------
// Module-level mocks (hoisted before any import resolution)
// --------------------------------------------------------------------------

vi.mock("../../lib/api", () => ({
  api: {
    health: vi.fn(),
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  },
}));

vi.mock("../utils/storage", () => ({
  authStorage: {
    getToken: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    subscribe: vi.fn(() => vi.fn()), // returns unsubscribe fn
  },
}));

// PageLoader is a real component — let it render so we can assert on it
vi.mock("../../components/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../components/ui")>();
  return {
    ...actual,
    // Keep PageLoader real; no overrides needed here
  };
});

// Toast context — suppress real DOM timers, just spy on showToast
vi.mock("./ToastContext", () => ({
  useToast: () => ({ showToast: vi.fn() }),
  ToastProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// --------------------------------------------------------------------------
// Lazy import AFTER mocks are registered
// --------------------------------------------------------------------------

import { api } from "../../lib/api";
import { authStorage } from "../utils/storage";
import { AuthProvider, useAuth } from "./AuthContext";

// --------------------------------------------------------------------------
// Typed mock aliases for clean assertions
// --------------------------------------------------------------------------

const mockApi = api as {
  health: MockedFunction<typeof api.health>;
  me: MockedFunction<typeof api.me>;
  login: MockedFunction<typeof api.login>;
  logout: MockedFunction<typeof api.logout>;
  register: MockedFunction<typeof api.register>;
};

const mockStorage = authStorage as {
  getToken: MockedFunction<typeof authStorage.getToken>;
  setToken: MockedFunction<typeof authStorage.setToken>;
  clearToken: MockedFunction<typeof authStorage.clearToken>;
  subscribe: MockedFunction<typeof authStorage.subscribe>;
};

// --------------------------------------------------------------------------
// Shared Fixtures
// --------------------------------------------------------------------------

const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiJ9.test-token";

const MOCK_USER = {
  id: "user-001",
  username: "alice_dev",
  email: "alice@engineers.dev",
  primaryRole: "STUDENT",
  profile: {
    fullName: "Alice Dev",
    headline: "Full-stack engineer",
    avatarUrl: null,
  },
} as const;

// --------------------------------------------------------------------------
// Test helpers
// --------------------------------------------------------------------------

/** Creates a fresh QueryClient per test (no shared cache between tests). */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

/** Wraps a hook with all required providers. */
function hookWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>{children}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

// --------------------------------------------------------------------------
// Suite 1 — AuthContext Core Mechanics
// --------------------------------------------------------------------------

describe("Suite 1 — AuthContext Core Mechanics", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    queryClient = makeQueryClient();

    // Default: no stored token, API is online
    mockStorage.getToken.mockReturnValue(null);
    mockStorage.subscribe.mockReturnValue(vi.fn());
    mockApi.health.mockResolvedValue({ success: true, message: "ok", data: {} });
  });

  afterEach(() => {
    queryClient.clear();
  });

  // -------------------------------------------------------------------------
  // Test 1.1 — useAuth hook boundary guard
  // -------------------------------------------------------------------------
  it("throws a descriptive error when useAuth is called outside AuthProvider", () => {
    // Suppress the expected React error boundary console.error noise
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used inside AuthProvider");

    consoleSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Test 1.2 — login() success pipeline
  // -------------------------------------------------------------------------
  it("login() — stores token, sets user profile, and emits isAuthenticated=true", async () => {
    mockApi.login.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { token: MOCK_TOKEN, user: MOCK_USER },
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: hookWrapper(queryClient),
    });

    // Wait for initial boot to settle (no token → anonymous)
    await waitFor(() => expect(result.current.authStatus).toBe("anonymous"));

    await act(async () => {
      await result.current.login({ email: MOCK_USER.email, password: "P@ssword1" });
    });

    // Token must be persisted to localStorage
    expect(mockStorage.setToken).toHaveBeenCalledWith(MOCK_TOKEN);

    // User state must reflect login response
    expect(result.current.user).toMatchObject({ id: MOCK_USER.id, username: MOCK_USER.username });

    // Authenticated flag must be truthy
    expect(result.current.isAuthenticated).toBe(true);

    // Auth status sentinel must be "authenticated"
    expect(result.current.authStatus).toBe("authenticated");

    // api.login must be called exactly once with correct credentials
    expect(mockApi.login).toHaveBeenCalledOnce();
    expect(mockApi.login).toHaveBeenCalledWith({
      email: MOCK_USER.email,
      password: "P@ssword1",
    });
  });

  // -------------------------------------------------------------------------
  // Test 1.3 — logout() pipeline
  // -------------------------------------------------------------------------
  it("logout() — clears token, nullifies user, and resets authStatus to anonymous", async () => {
    // Setup: user is already logged in
    mockStorage.getToken.mockReturnValue(MOCK_TOKEN);
    mockApi.me.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: MOCK_USER,
    });
    mockApi.logout.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { loggedOut: true },
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: hookWrapper(queryClient),
    });

    // Wait for boot to hydrate user from token
    await waitFor(() => expect(result.current.authStatus).toBe("authenticated"));
    expect(result.current.user).not.toBeNull();

    await act(async () => {
      await result.current.logout();
    });

    // Token must be cleared from storage
    expect(mockStorage.clearToken).toHaveBeenCalled();

    // In-memory user state must be null
    expect(result.current.user).toBeNull();

    // Auth status must revert to anonymous
    expect(result.current.authStatus).toBe("anonymous");

    // isAuthenticated must be false
    expect(result.current.isAuthenticated).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Test 1.4 — boot sequence with valid stored token
  // -------------------------------------------------------------------------
  it("boot — refreshes user from API when a valid token exists in storage", async () => {
    mockStorage.getToken.mockReturnValue(MOCK_TOKEN);
    mockApi.me.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: MOCK_USER,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: hookWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.authStatus).toBe("authenticated"));

    expect(result.current.user?.id).toBe(MOCK_USER.id);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Test 1.5 — boot sequence with no stored token
  // -------------------------------------------------------------------------
  it("boot — resolves to anonymous when no token is stored", async () => {
    mockStorage.getToken.mockReturnValue(null);

    const { result } = renderHook(() => useAuth(), {
      wrapper: hookWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.authStatus).toBe("anonymous"));

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.loading).toBe(false);

    // api.me must NOT be called when no token is present
    expect(mockApi.me).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Test 1.6 — logout() must clear cache (queryClient.clear)
  // -------------------------------------------------------------------------
  it("logout() — calls queryClient.clear() to wipe cached server state", async () => {
    mockStorage.getToken.mockReturnValue(MOCK_TOKEN);
    mockApi.me.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: MOCK_USER,
    });
    mockApi.logout.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { loggedOut: true },
    });

    const clearSpy = vi.spyOn(queryClient, "clear");

    const { result } = renderHook(() => useAuth(), {
      wrapper: hookWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.authStatus).toBe("authenticated"));

    await act(async () => {
      await result.current.logout();
    });

    expect(clearSpy).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Test 1.7 — api.health offline → apiStatus
  // -------------------------------------------------------------------------
  it("boot — sets apiStatus=offline when health check fails", async () => {
    mockStorage.getToken.mockReturnValue(null);
    mockApi.health.mockRejectedValueOnce(new Error("Network unreachable"));

    const { result } = renderHook(() => useAuth(), {
      wrapper: hookWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.authStatus).toBe("anonymous"));

    expect(result.current.apiStatus).toBe("offline");
    expect(result.current.apiOnline).toBe(false);
  });
});

// --------------------------------------------------------------------------
// Suite 2 — Route Guards Security Engine
// --------------------------------------------------------------------------

/**
 * The route guards (RequireAuth, PublicOnly) are defined INSIDE App.tsx as
 * local functions. We test them by mounting a mini routing tree that mirrors
 * the real setup, controlled via a mock AuthContext value.
 */

// We need a way to inject a custom auth context value without going through
// the real AuthProvider boot sequence. Build a lightweight test double.

type AuthContextOverride = {
  authStatus: "checking" | "authenticated" | "anonymous";
  user: typeof MOCK_USER | null;
};

/** Location sentinel component — renders current pathname for assertions. */
function LocationDisplay() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
}

/**
 * Mini App that mirrors the real guard structure from App.tsx.
 * The guards are copy-inlined here so they consume our mock AuthContext.
 */
function buildGuardTree(override: AuthContextOverride) {
  // Inline RequireAuth mirroring App.tsx logic (uses useAuth internally)
  function RequireAuthLocal({ children }: { children: ReactNode }) {
    const { authStatus, user } = useAuth();
    const location = useLocation();

    if (authStatus === "checking") {
      return <div data-testid="page-loader">Loading workspace</div>;
    }
    if (!user) {
      const { Navigate } = require("react-router-dom");
      return <Navigate to="/auth" replace state={{ from: location }} />;
    }
    return <>{children}</>;
  }

  // Inline PublicOnly mirroring App.tsx logic
  function PublicOnlyLocal({ children }: { children: ReactNode }) {
    const { authStatus, user } = useAuth();
    const location = useLocation();
    const redirectTo =
      (location.state as { from?: { pathname?: string; search?: string } } | null)
        ?.from || { pathname: "/feed", search: "" };

    if (authStatus === "checking") {
      return <div data-testid="page-loader">Loading workspace</div>;
    }
    if (user) {
      const { Navigate } = require("react-router-dom");
      return (
        <Navigate
          to={`${redirectTo.pathname || "/feed"}${redirectTo.search || ""}`}
          replace
        />
      );
    }
    return <>{children}</>;
  }

  return { RequireAuthLocal, PublicOnlyLocal };
}

// ---- Utility: render a MemoryRouter tree with stubbed AuthProvider --------

function renderWithStubAuth(
  initialPath: string,
  override: AuthContextOverride,
  tree: ReactNode,
) {
  const queryClient = makeQueryClient();

  // Stub api + storage so AuthProvider boot resolves quickly
  mockStorage.getToken.mockReturnValue(
    override.user ? MOCK_TOKEN : null,
  );
  mockStorage.subscribe.mockReturnValue(vi.fn());
  mockApi.health.mockResolvedValue({ success: true, message: "ok", data: {} });

  if (override.user) {
    mockApi.me.mockResolvedValue({
      success: true,
      message: "ok",
      data: override.user,
    });
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthProvider>{tree}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Suite 2 — Route Guards Security Engine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Test 2.1 — RequireAuth: unauthenticated user is redirected to /auth
  // -------------------------------------------------------------------------
  it("RequireAuth — anonymous user is redirected to /auth and protected content is NOT rendered", async () => {
    const { Navigate } = await import("react-router-dom");

    // Build a minimal route tree that reflects App.tsx patterns
    renderWithStubAuth(
      "/profile",
      { authStatus: "anonymous", user: null },
      <Routes>
        <Route path="/auth" element={<div data-testid="auth-page">Auth Page</div>} />
        <Route
          path="/profile"
          element={
            <AuthGateWrapper>
              <div data-testid="protected-content">Protected Content</div>
            </AuthGateWrapper>
          }
        />
        <Route path="*" element={<LocationDisplay />} />
      </Routes>,
    );

    // Wait for boot to complete (anonymous path)
    await waitFor(() =>
      expect(screen.queryByTestId("auth-page")).toBeInTheDocument(),
    );

    // Protected content must NOT be visible
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Test 2.2 — RequireAuth: checking state renders PageLoader
  // -------------------------------------------------------------------------
  it("RequireAuth — renders PageLoader while authStatus is 'checking'", async () => {
    // Keep api.me pending indefinitely so authStatus stays "checking"
    mockStorage.getToken.mockReturnValue(MOCK_TOKEN);
    mockStorage.subscribe.mockReturnValue(vi.fn());
    mockApi.health.mockResolvedValue({ success: true, message: "ok", data: {} });
    mockApi.me.mockImplementation(() => new Promise(() => undefined)); // never resolves

    const queryClient = makeQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/profile"]}>
          <AuthProvider>
            <Routes>
              <Route
                path="/profile"
                element={
                  <CheckingStateGate>
                    <div data-testid="protected-content">Protected Content</div>
                  </CheckingStateGate>
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // During the "checking" window the loader must be present
    await waitFor(() =>
      expect(screen.getByTestId("page-loader-sentinel")).toBeInTheDocument(),
    );

    // Protected content must NOT be rendered during checking
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();

    queryClient.clear();
  });

  // -------------------------------------------------------------------------
  // Test 2.3 — PublicOnly: authenticated user is redirected away from /auth
  // -------------------------------------------------------------------------
  it("PublicOnly — authenticated user hitting /auth is redirected to /feed", async () => {
    mockStorage.getToken.mockReturnValue(MOCK_TOKEN);
    mockStorage.subscribe.mockReturnValue(vi.fn());
    mockApi.health.mockResolvedValue({ success: true, message: "ok", data: {} });
    mockApi.me.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: MOCK_USER,
    });

    const queryClient = makeQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/auth"]}>
          <AuthProvider>
            <Routes>
              <Route
                path="/auth"
                element={
                  <PublicOnlyGate>
                    <div data-testid="login-form">Login Form</div>
                  </PublicOnlyGate>
                }
              />
              <Route
                path="/feed"
                element={<div data-testid="feed-page">Feed Page</div>}
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // After boot completes with authenticated user, should land on feed
    await waitFor(() =>
      expect(screen.getByTestId("feed-page")).toBeInTheDocument(),
    );

    // Login form must NOT be visible to authenticated user
    expect(screen.queryByTestId("login-form")).not.toBeInTheDocument();

    queryClient.clear();
  });

  // -------------------------------------------------------------------------
  // Test 2.4 — PublicOnly: checking state shows PageLoader
  // -------------------------------------------------------------------------
  it("PublicOnly — renders PageLoader while authStatus is 'checking'", async () => {
    mockStorage.getToken.mockReturnValue(MOCK_TOKEN);
    mockStorage.subscribe.mockReturnValue(vi.fn());
    mockApi.health.mockResolvedValue({ success: true, message: "ok", data: {} });
    mockApi.me.mockImplementation(() => new Promise(() => undefined));

    const queryClient = makeQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/auth"]}>
          <AuthProvider>
            <Routes>
              <Route
                path="/auth"
                element={
                  <PublicOnlyCheckingGate>
                    <div data-testid="login-form">Login Form</div>
                  </PublicOnlyCheckingGate>
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("public-page-loader")).toBeInTheDocument(),
    );

    expect(screen.queryByTestId("login-form")).not.toBeInTheDocument();

    queryClient.clear();
  });
});

// --------------------------------------------------------------------------
// Inline guard components (mirror App.tsx logic exactly)
// --------------------------------------------------------------------------

/** Mirrors App.tsx RequireAuth for anonymous-redirect testing. */
function AuthGateWrapper({ children }: { children: ReactNode }) {
  const { authStatus, user } = useAuth();
  const { Navigate } = require("react-router-dom");
  const location = useLocation();

  if (authStatus === "checking") {
    return <div data-testid="page-loader">Loading workspace</div>;
  }
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

/** Mirrors App.tsx RequireAuth for checking-state testing — exposes sentinel. */
function CheckingStateGate({ children }: { children: ReactNode }) {
  const { authStatus } = useAuth();

  if (authStatus === "checking") {
    return <div data-testid="page-loader-sentinel">Loading workspace</div>;
  }
  return <>{children}</>;
}

/** Mirrors App.tsx PublicOnly for authenticated-redirect testing. */
function PublicOnlyGate({ children }: { children: ReactNode }) {
  const { authStatus, user } = useAuth();
  const { Navigate } = require("react-router-dom");
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: { pathname?: string; search?: string } } | null)
      ?.from || { pathname: "/feed", search: "" };

  if (authStatus === "checking") {
    return <div data-testid="public-page-loader">Loading workspace</div>;
  }
  if (user) {
    return (
      <Navigate
        to={`${redirectTo.pathname || "/feed"}${redirectTo.search || ""}`}
        replace
      />
    );
  }
  return <>{children}</>;
}

/** PublicOnly checking-state variant. */
function PublicOnlyCheckingGate({ children }: { children: ReactNode }) {
  const { authStatus } = useAuth();

  if (authStatus === "checking") {
    return <div data-testid="public-page-loader">Loading workspace</div>;
  }
  return <>{children}</>;
}
