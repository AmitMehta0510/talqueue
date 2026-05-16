export const buildContainsQuery =
  (query: string) => ({
    contains: query,
    mode: "insensitive" as const,
  });