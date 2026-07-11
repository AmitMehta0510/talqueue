import { Request, Response, NextFunction } from "express";
import redis from "shared/database/redis";
import logger from "shared/logger";

/**
 * Creates an Express middleware for rate limiting using a sliding window
 * algorithm in Redis.
 *
 * For authenticated requests the limiter keys on `userId` (preventing
 * quota bypass by IP rotation). For anonymous requests it falls back to
 * the real client IP resolved via `trust proxy` (set in app.ts).
 *
 * @param tier          - Rate limit tier name (used in the Redis key).
 * @param limit         - Max requests allowed within the window.
 * @param windowSeconds - Sliding-window size in seconds.
 */
export function createRateLimiter(tier: string, limit: number, windowSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Prefer per-user key so auth'd users can't rotate IPs to bypass limits.
    const userId = (req as any).user?.id;
    const identifier = userId
      ? `uid:${userId}`
      : (req.ip || req.socket?.remoteAddress || "unknown");

    const key = `ratelimit:${tier}:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Member must be unique to avoid overwriting scores or collapsing
    // concurrent requests arriving in the same millisecond.
    const member = `${now}-${Math.random()}`;

    try {
      const pipeline = redis.multi();
      pipeline.zadd(key, now, member);
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zcount(key, windowStart, now);
      pipeline.expire(key, windowSeconds);

      const results = await pipeline.exec();

      if (!results) {
        throw new Error("Redis multi pipeline execution returned null or undefined results.");
      }

      // results is an array of [Error | null, result] tuples:
      // Index 0: ZADD  Index 1: ZREMRANGEBYSCORE  Index 2: ZCOUNT  Index 3: EXPIRE
      const zcountResult = results[2];
      if (!zcountResult) {
        throw new Error("Missing ZCOUNT command response in pipeline execution results.");
      }

      const [err, countVal] = zcountResult;
      if (err) {
        throw err;
      }

      const count = countVal as number;

      if (count > limit) {
        res.status(429).json({
          success: false,
          message: "Too many requests. Please try again later.",
        });
        return;
      }

      next();
    } catch (err: any) {
      // Fail-soft: log warning and proceed so rate limiter issues don't block access
      logger.warn({ key, err: err?.message }, "Rate limiter Redis failure — passing request through");
      next();
    }
  };
}

export const authRateLimiter = createRateLimiter("auth", 10, 60);
export const searchRateLimiter = createRateLimiter("search", 60, 60);
export const apiRateLimiter = createRateLimiter("api", 120, 60);

