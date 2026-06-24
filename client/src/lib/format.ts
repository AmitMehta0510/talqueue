import { ApiError, FeedItem, FeedPost, User } from "./api";

export const titleCase = (value?: string | null) =>
  value
    ? value
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "";

export const initials = (name?: string | null) => {
  if (!name) return "EP";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

export const userName = (user?: User | null) =>
  user?.profile?.fullName || user?.username || "Engineer";

// Priority order for platform roles — highest first
const ROLE_PRIORITY = [
  "SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "COLLEGE_ADMIN",
  "COMPANY_ADMIN",
  "COLLEGE_DIRECTOR",
];

/**
 * Returns the highest-privilege platform role name from the user's roles[] array.
 * Falls back to primaryRole (the static DB column) if no platform role is found.
 */
export const getHighestPrivilegeRole = (user?: User | null): string | undefined => {
  if (!user?.roles || user.roles.length === 0) return user?.primaryRole ?? undefined;
  for (const roleName of ROLE_PRIORITY) {
    if (user.roles.some((ur: any) => ur.role?.name === roleName)) return roleName;
  }
  // No recognised platform role — fall back to primaryRole
  return user.primaryRole ?? undefined;
};

export const userHeadline = (user?: User | null) =>
  user?.profile?.headline || getHighestPrivilegeRole(user) || user?.roles?.[0]?.role?.name;

export const formatCount = (value?: number) =>
  new Intl.NumberFormat("en", { notation: "compact" }).format(value || 0);

export const formatDate = (value?: string, includeYear = true) => {
  if (!value) return "";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  }).format(new Date(value));
};

export const STATUS_CHIP_CLASSES: Record<string, string> = {
  LIVE: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  OPEN: "bg-blue-50 text-blue-700 border border-blue-200",
  COMPLETED: "bg-slate-100 text-slate-500 border border-slate-200",
  DRAFT: "bg-amber-50 text-amber-700 border border-amber-200",
  ARCHIVED: "bg-rose-50 text-rose-600 border border-rose-200",
};


/** Returns time only, e.g. "5:37 PM" — used inside message bubbles */
export const formatMessageTime = (value?: string | null): string => {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
};

/** Returns a human-readable day label for chat date dividers: "Today", "Yesterday", or "Jun 8" */
export const formatRelativeDate = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
};

/** Returns "Last active X ago" style string for chat headers */
export const formatLastActive = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "Active just now";
  if (diffMins < 60) return `Active ${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Active ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Active yesterday";
  return `Active ${diffDays}d ago`;
};

export const formatMonthYear = (value?: string | null) => {
  if (!value) return "Present";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

export const splitCsv = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const compactPayload = <T extends Record<string, unknown>>(payload: T) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== "" && value !== undefined),
  ) as Partial<T>;

export const tagValues = (tags?: FeedPost["tags"]) =>
  (tags || [])
    .map((tag) => (typeof tag === "string" ? tag : tag.tag))
    .filter(Boolean) as string[];

export const extractFeedItems = (items: Array<FeedItem | FeedPost>) =>
  items.map((item) => {
    if ("data" in item && "type" in item) {
      return {
        wrapper: item,
        item: item.data,
        itemType: item.type,
        reason: item.reason,
        score: item.score,
      };
    }

    const nested = item.item;

    return {
      wrapper: item,
      item:
        nested && typeof nested === "object"
          ? ({ ...nested, itemType: item.itemType, reason: item.reason } as FeedPost)
          : item,
      itemType: item.itemType || item.type || "POST",
      reason: item.reason,
      score: item.score,
    };
  });

const HTTP_MESSAGES: Record<number, string> = {
  400: "The request couldn't be understood. Please check your input and try again.",
  401: "You need to sign in to do that.",
  403: "You don't have permission to perform this action.",
  404: "We couldn't find what you're looking for.",
  409: "This already exists — try a different name or value.",
  422: "Some information you entered isn't valid. Please check and try again.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again in a moment.",
  502: "Our server is temporarily unavailable. Please try again shortly.",
  503: "The service is currently down for maintenance. Please check back soon.",
};

/** Returns a user-friendly, plain-English error message. */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.errors && error.errors.length > 0) {
      return error.errors
        .map((e) => {
          const field = e.path ? titleCase(e.path) : "";
          return field ? `${field}: ${e.message}` : e.message;
        })
        .join("\n");
    }

    // Prefer the server's own message when it's meaningful (not a raw status text)
    const serverMsg = error.message;
    const isGeneric =
      !serverMsg ||
      serverMsg === "Request failed" ||
      serverMsg.toLowerCase() === "internal server error" ||
      serverMsg.toLowerCase() === "bad gateway";

    if (!isGeneric) return serverMsg;
    return HTTP_MESSAGES[error.status] ?? "Something went wrong. Please try again.";
  }

  if (error instanceof Error) {
    if (error.name === "AbortError" || error.message.includes("aborted"))
      return "The request took too long. Please check your connection and try again.";
    if (error.message.toLowerCase().includes("network") || error.message.toLowerCase().includes("fetch"))
      return "No internet connection. Check your network and try again.";
    if (error.message) return error.message;
  }

  return "Something went wrong. Please try again.";
};

/**
 * Substitutes defunct/legacy logo hosting services (like Clearbit)
 * with free, live ones (like Hunter.io) to prevent broken/invisible logos.
 */
export const cleanLogoUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.includes("logo.clearbit.com")) {
    return url.replace("logo.clearbit.com", "logos.hunter.io");
  }
  return url;
};

