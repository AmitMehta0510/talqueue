/**
 * Resilient HTTP utilities shared across all scraper services.
 *
 * Extracted from company-discovery.service.ts so both the discovery
 * service and job-scraper.service.ts can use the same UA-rotation,
 * jitter, and exponential-backoff layer.
 */
import axios from "axios";

// ---------------------------------------------------------------------------
// BOT DETECTION SURVIVAL — UA pool, jitter, exponential backoff
// ---------------------------------------------------------------------------

/**
 * Rotating User-Agent pool — mimics real browser sessions across 2K+ requests.
 * Prevents fingerprinting from a static UA string that Cloudflare/Lever detect.
 */
export const UA_POOL: string[] = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.207 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.122 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
];

/** Returns a pseudo-random User-Agent string from the pool. */
export function pickRandomUA(): string {
  return UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
}

/**
 * Sleeps for `baseMs` ± half of `windowMs` milliseconds.
 * Replaces all static `sleep(REQUEST_DELAY_MS)` calls in scraper loops.
 * Minimum enforced delay: 80ms (prevents accidental sub-100ms burst).
 *
 * @param baseMs   Centre of the delay window (ms).
 * @param windowMs Total width of the jitter window (ms). Default 400.
 */
export function jitteredDelay(baseMs: number, windowMs = 400): Promise<void> {
  const jitter = Math.floor(Math.random() * windowMs) - windowMs / 2;
  const delay = Math.max(80, baseMs + jitter);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/** Browser-like headers attached to every resilient request. */
const BROWSER_HEADERS = {
  Accept:           "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Connection:       "keep-alive",
  "Cache-Control":  "no-cache",
};

/**
 * Resilient HTTP GET with:
 *  - Randomised User-Agent header on every request (from UA_POOL)
 *  - Browser-like Accept/Accept-Language/Cache-Control headers
 *  - Exponential backoff on HTTP 429 (rate-limited) and 503 (service unavailable)
 *  - Hard-throw on non-retriable errors (other 4xx, network errors)
 *
 * @param url     Full URL to GET.
 * @param retries Max retry attempts on 429/503. Default: 3.
 * @returns       Axios response object.
 * @throws        On max retries exceeded or non-retriable error.
 */
export async function resilientGet(url: string, retries = 3): Promise<any> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await axios.get(url, {
        timeout: 10000,
        headers: { "User-Agent": pickRandomUA(), ...BROWSER_HEADERS },
      });
    } catch (err: any) {
      const status: number | undefined = err?.response?.status;
      if ((status === 429 || status === 503) && attempt < retries) {
        const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(
          `[resilientGet] HTTP ${status} on ${url} — ` +
          `retry ${attempt + 1}/${retries} after ${Math.round(backoff)}ms`
        );
        await new Promise((r) => setTimeout(r, backoff));
        attempt++;
        continue;
      }
      throw err;
    }
  }
  throw new Error(`[resilientGet] max retries (${retries}) exceeded for ${url}`);
}

/**
 * Resilient HTTP POST with the same UA-rotation and exponential-backoff
 * as resilientGet. Used for ATS endpoints that require POST (e.g. Ashby).
 *
 * @param url     Full URL to POST.
 * @param body    Request body (will be JSON-serialised by axios).
 * @param retries Max retry attempts on 429/503. Default: 3.
 */
export async function resilientPost(url: string, body: unknown = {}, retries = 3): Promise<any> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await axios.post(url, body, {
        timeout: 10000,
        headers: {
          "User-Agent":   pickRandomUA(),
          "Content-Type": "application/json",
          ...BROWSER_HEADERS,
        },
      });
    } catch (err: any) {
      const status: number | undefined = err?.response?.status;
      if ((status === 429 || status === 503) && attempt < retries) {
        const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(
          `[resilientPost] HTTP ${status} on ${url} — ` +
          `retry ${attempt + 1}/${retries} after ${Math.round(backoff)}ms`
        );
        await new Promise((r) => setTimeout(r, backoff));
        attempt++;
        continue;
      }
      throw err;
    }
  }
  throw new Error(`[resilientPost] max retries (${retries}) exceeded for ${url}`);
}
