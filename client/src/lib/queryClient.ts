import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      // Don't retry aborted requests — React StrictMode double-invokes effects,
      // which aborts the first fetch. Retrying it creates noise in logs and can
      // trigger the global error boundary before the second mount succeeds.
      retry: (failureCount, error: unknown) => {
        const err = error as Error;
        if (err?.name === "AbortError" || err?.name === "CanceledError") return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
