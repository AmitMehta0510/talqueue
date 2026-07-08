import { authStorage } from "../utils/storage";
import type { ApiEnvelope } from "../types/models";

export const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5000/api/v1";

export type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  timeoutMs?: number;
};

export type EndpointOptions = Pick<RequestOptions, "signal" | "timeoutMs">;

export const toQuery = (
  params: Record<string, string | number | boolean | undefined>,
) => {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `?${query}` : "";
};

export type CursorOptions = EndpointOptions & {
  cursor?: string;
};

export class ApiError extends Error {
  status: number;
  errors?: Array<{ path: string; message: string }>;

  constructor(message: string, status: number, errors?: Array<{ path: string; message: string }>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export const createRequestSignal = (
  signal?: AbortSignal | null,
  timeoutMs = 15000,
) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  const abort = () => controller.abort();

  if (signal?.aborted) {
    controller.abort();
  } else {
    signal?.addEventListener("abort", abort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abort);
    },
  };
};

// ─── Token Refresh ────────────────────────────────────────────────────────────
// Flag to prevent parallel refresh races: only one in-flight refresh allowed.
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Calls POST /auth/refresh (cookie-only) and returns the new access token,
 * or null if the refresh token is expired / invalid.
 */
async function attemptTokenRefresh(): Promise<string | null> {
  if (isRefreshing) {
    return refreshPromise!;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include", // Send the HttpOnly RT cookie
      });

      if (!res.ok) return null;

      const data = await res.json();
      const newToken: string = data?.data?.token;
      if (newToken) {
        authStorage.setToken(newToken);
        return newToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
// ─────────────────────────────────────────────────────────────────────────────

export async function request<T>(
  path: string,
  options: RequestOptions = {},
  _isRetry = false,
) {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers);
  const { body, signal: requestSignal, timeoutMs, ...fetchOptions } = options;
  const { signal, cleanup } = createRequestSignal(requestSignal, timeoutMs);

  if (!headers.has("Content-Type") && body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      signal,
      headers,
      // Send the HttpOnly RT cookie on every request so /auth/refresh works
      credentials: "include",
      body:
        body === undefined || typeof body === "string"
          ? body
          : JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : null;

    // ── Refresh token interceptor ─────────────────────────────────────────
    // On 401, attempt a silent token refresh and retry once.
    // /auth/refresh itself is excluded to prevent an infinite loop.
    if (
      response.status === 401 &&
      !_isRetry &&
      !path.includes("/auth/refresh")
    ) {
      const newToken = await attemptTokenRefresh();
      if (newToken) {
        // Retry original request with the fresh access token
        return request<T>(path, options, true);
      }

      // Refresh failed — session is truly expired. Notify AuthContext.
      authStorage.clearToken();
      window.dispatchEvent(new Event("auth:expired"));
    }
    // ─────────────────────────────────────────────────────────────────────

    if (!response.ok || payload?.success === false) {
      throw new ApiError(
        payload?.message || response.statusText || "Request failed",
        response.status,
        payload?.errors,
      );
    }

    return payload as ApiEnvelope<T>;
  } finally {
    cleanup();
  }
}
