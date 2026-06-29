const TOKEN_KEY = "engineering_platform_token";

const canUseStorage = () =>
  typeof window !== "undefined" && Boolean(window.localStorage);

export const authStorage = {
  getToken() {
    if (!canUseStorage()) return null;

    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken(token: string) {
    if (!canUseStorage()) return;

    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Private browsing and strict storage policies can block writes.
    }
  },
  clearToken() {
    if (!canUseStorage()) return;

    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore storage failures; in-memory auth state is still cleared.
    }
  },
  subscribe(callback: (token: string | null) => void) {
    if (typeof window === "undefined") return () => undefined;

    const onStorage = (event: StorageEvent) => {
      if (event.key === TOKEN_KEY) {
        callback(event.newValue);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  },
};
