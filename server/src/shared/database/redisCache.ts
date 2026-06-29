import redis from "./redis";

/**
 * Generic helper to fetch data from Redis cache, or run the callback function
 * and store the serialized result in Redis if there's a cache miss.
 *
 * @param cacheKey - The unique key identifying the cache slot.
 * @param ttlSeconds - Cache expiry duration in seconds.
 * @param fetchFn - The database/computation function to query on cache miss.
 */
export async function getOrSetCache<T>(
  cacheKey: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  try {
    const cachedValue = await redis.get(cacheKey);
    if (cachedValue) {
      return JSON.parse(cachedValue) as T;
    }
  } catch (err) {
    console.warn(`[RedisCache] Cache read failed for key ${cacheKey}:`, err);
  }

  const freshData = await fetchFn();

  try {
    await redis.set(cacheKey, JSON.stringify(freshData), "EX", ttlSeconds);
  } catch (err) {
    console.warn(`[RedisCache] Cache write failed for key ${cacheKey}:`, err);
  }

  return freshData;
}

/**
 * Deletes a cache entry by its key.
 *
 * @param cacheKey - Target cache key.
 */
export async function bustCache(cacheKey: string): Promise<void> {
  try {
    await redis.del(cacheKey);
    console.log(`[RedisCache] Busted cache key: ${cacheKey}`);
  } catch (err) {
    console.error(`[RedisCache] Failed to bust cache key ${cacheKey}:`, err);
  }
}

/**
 * Deletes multiple cache entries matching a shell glob pattern (e.g. "companies:profile:uber:*").
 *
 * @param pattern - Glob query pattern.
 */
export async function bustCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
      console.log(`[RedisCache] Busted cache pattern: ${pattern} (removed ${keys.length} keys)`);
    }
  } catch (err) {
    console.error(`[RedisCache] Failed to bust cache pattern ${pattern}:`, err);
  }
}
