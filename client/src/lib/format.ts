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

export const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
};
