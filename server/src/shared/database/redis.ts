import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export const acquireLock = async (lockKey: string, ttlSeconds: number): Promise<boolean> => {
  try {
    const res = await redis.set(lockKey, "locked", "EX", ttlSeconds, "NX");
    return res === "OK";
  } catch (err) {
    console.error(`[RedisLock] Failed to acquire lock for key ${lockKey}:`, err);
    return false;
  }
};

export const releaseLock = async (lockKey: string): Promise<void> => {
  try {
    await redis.del(lockKey);
  } catch (err) {
    console.error(`[RedisLock] Failed to release lock for key ${lockKey}:`, err);
  }
};

export default redis;
