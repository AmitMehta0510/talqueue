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

export async function request<T>(path: string, options: RequestOptions = {}) {
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
      body:
        body === undefined || typeof body === "string"
          ? body
          : JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : null;

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
