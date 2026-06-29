import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// Mock auth middleware blocks
vi.mock("modules/auth/auth.middleware", () => ({
  protect: vi.fn((req, res, next) => next()),
}));

vi.mock("shared/middleware/requirePlatformAdmin", () => ({
  requirePlatformAdmin: vi.fn((req, res, next) => next()),
}));

import { protect } from "modules/auth/auth.middleware";
import { requirePlatformAdmin } from "shared/middleware/requirePlatformAdmin";
import { scraperAuthMiddleware } from "./scraper-auth.middleware";

describe("Scraper Authorization Middleware", () => {
  let req: any;
  let res: any;
  let next: any;
  const originalKey = process.env.SCRAPER_CRON_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      headers: {},
    };
    res = {};
    next = vi.fn();
    process.env.SCRAPER_CRON_KEY = "test-secret-key";
  });

  afterEach(() => {
    process.env.SCRAPER_CRON_KEY = originalKey;
  });

  test("should authorize if header x-scraper-cron-key matches secret", () => {
    req.headers["x-scraper-cron-key"] = "test-secret-key";

    scraperAuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(protect).not.toHaveBeenCalled();
    expect(requirePlatformAdmin).not.toHaveBeenCalled();
  });

  test("should fallback to platform session auth if cron key matches mismatch", () => {
    req.headers["x-scraper-cron-key"] = "wrong-key";

    scraperAuthMiddleware(req, res, next);

    expect(protect).toHaveBeenCalled();
  });

  test("should fallback to platform session auth if cron key is absent", () => {
    delete req.headers["x-scraper-cron-key"];

    scraperAuthMiddleware(req, res, next);

    expect(protect).toHaveBeenCalled();
  });
});
