import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock redis database before import
vi.mock("./redis", () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
  },
}));

import redis from "./redis";
import { getOrSetCache, bustCache, bustCachePattern } from "./redisCache";

describe("Redis Cache Service Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("getOrSetCache should return cached value if present", async () => {
    vi.mocked(redis.get).mockResolvedValue(JSON.stringify({ value: "cached" }));
    const dbQueryFn = vi.fn().mockResolvedValue({ value: "fresh" });

    const result = await getOrSetCache("test-key", 3600, dbQueryFn);

    expect(result).toEqual({ value: "cached" });
    expect(redis.get).toHaveBeenCalledWith("test-key");
    expect(dbQueryFn).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  test("getOrSetCache should query DB and save to cache on miss", async () => {
    vi.mocked(redis.get).mockResolvedValue(null);
    const dbQueryFn = vi.fn().mockResolvedValue({ value: "fresh" });

    const result = await getOrSetCache("test-key", 3600, dbQueryFn);

    expect(result).toEqual({ value: "fresh" });
    expect(redis.get).toHaveBeenCalledWith("test-key");
    expect(dbQueryFn).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalledWith("test-key", JSON.stringify({ value: "fresh" }), "EX", 3600);
  });

  test("bustCache should delete cache key", async () => {
    await bustCache("test-key");
    expect(redis.del).toHaveBeenCalledWith("test-key");
  });

  test("bustCachePattern should delete all keys matching the glob pattern", async () => {
    vi.mocked(redis.keys).mockResolvedValue(["key-1", "key-2"]);

    await bustCachePattern("key-*");

    expect(redis.keys).toHaveBeenCalledWith("key-*");
    expect(redis.del).toHaveBeenCalledWith(["key-1", "key-2"]);
  });
});
