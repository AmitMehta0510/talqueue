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

export const userHeadline = (user?: User | null) =>
  user?.profile?.headline || user?.primaryRole || user?.roles?.[0]?.role?.name;

export const formatCount = (value?: number) =>
  new Intl.NumberFormat("en", { notation: "compact" }).format(value || 0);

export const formatDate = (value?: string) => {
  if (!value) return "";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
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
