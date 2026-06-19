import { describe, test, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { createRateLimiter } from "./rateLimiter";
import redis from "shared/database/redis";

// Mock the Redis database client
vi.mock("shared/database/redis", () => {
  const mockMulti = {
    zadd: vi.fn().mockReturnThis(),
    zremrangebyscore: vi.fn().mockReturnThis(),
    zcount: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn(),
  };

  return {
    default: {
      multi: vi.fn(() => mockMulti),
    },
  };
});

describe("Sliding Window Rate Limiter Middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      ip: "127.0.0.1",
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  test("should allow requests under the limit and call next()", async () => {
    const mockMulti = redis.multi();
    // mock exec to return count = 5, which is under limit of 10
    vi.mocked(mockMulti.exec).mockResolvedValueOnce([
      [null, 1], // zadd
      [null, 0], // zremrangebyscore
      [null, 5], // zcount (under limit)
      [null, 1], // expire
    ]);

    const limiter = createRateLimiter("test_auth", 10, 60);
    await limiter(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();

    // Verify Redis commands called
    expect(redis.multi).toHaveBeenCalled();
    expect(mockMulti.zadd).toHaveBeenCalledWith(
      expect.stringContaining("ratelimit:test_auth:127.0.0.1"),
      expect.any(Number),
      expect.any(String)
    );
  });

  test("should return 429 when rate limit is exceeded", async () => {
    const mockMulti = redis.multi();
    // mock exec to return count = 11, which exceeds limit of 10
    vi.mocked(mockMulti.exec).mockResolvedValueOnce([
      [null, 1], // zadd
      [null, 0], // zremrangebyscore
      [null, 11], // zcount (exceeded)
      [null, 1], // expire
    ]);

    const limiter = createRateLimiter("test_auth", 10, 60);
    await limiter(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  });

  test("should fail-soft (call next) if Redis throws an error", async () => {
    const mockMulti = redis.multi();
    vi.mocked(mockMulti.exec).mockRejectedValueOnce(new Error("Redis connection lost"));

    const limiter = createRateLimiter("test_auth", 10, 60);
    await limiter(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
