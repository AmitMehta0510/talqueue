/**
 * @file daily-limits-reset.cron.test.ts
 * @description Unit tests for the daily referral count reset cron.
 *
 * Mocking strategy:
 *  - `shared/database/prisma` — vi.mock; controls updateMany return value.
 *  - `node-cron`              — vi.mock; prevents real timer registration.
 *  - `winston`               — vi.mock; suppresses console noise.
 *
 * We test `executeReset()` directly (the exported pure function) rather than
 * the scheduler, so tests never wait for real cron timers to fire.
 *
 * Suites:
 *  1. Happy path — calls updateMany with correct args, returns count.
 *  2. Return value — count is propagated back to the caller.
 *  3. Fail-soft — DB error is caught, logged, returns 0 (does not throw).
 *  4. startDailyLimitsResetCron — calls cron.schedule with correct expression.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// ---------------------------------------------------------------------------
// Infrastructure mocks — BEFORE module import
// ---------------------------------------------------------------------------

vi.mock("shared/database/prisma", () => ({
  default: {
    user: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn(),
  },
}));

vi.mock("winston", () => {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const format = {
    combine: vi.fn(() => ({})),
    timestamp: vi.fn(() => ({})),
    printf: vi.fn(() => ({})),
  };
  return {
    default: {
      createLogger: vi.fn(() => logger),
      format,
      transports: { Console: vi.fn() },
    },
  };
});

// ---------------------------------------------------------------------------
// Subject under test
// ---------------------------------------------------------------------------

import prisma from "shared/database/prisma";
import cron from "node-cron";
import { executeReset, startDailyLimitsResetCron } from "./daily-limits-reset.cron";

// ---------------------------------------------------------------------------
// Suite 1 — Happy path: prisma.user.updateMany called correctly
// ---------------------------------------------------------------------------

describe("executeReset — happy path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.updateMany as Mock).mockResolvedValue({ count: 5420 });
  });

  it("calls prisma.user.updateMany with { data: { dailyReferralCount: 0 } }", async () => {
    await executeReset();

    expect(prisma.user.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      data: { dailyReferralCount: 0 },
    });
  });

  it("does not pass a `where` clause — resets ALL users", async () => {
    await executeReset();

    const callArg = (prisma.user.updateMany as Mock).mock.calls[0][0];
    expect(callArg).not.toHaveProperty("where");
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Return value: count propagated
// ---------------------------------------------------------------------------

describe("executeReset — return value", () => {
  it("returns the Prisma-reported count of updated rows", async () => {
    (prisma.user.updateMany as Mock).mockResolvedValue({ count: 12345 });

    const count = await executeReset();
    expect(count).toBe(12345);
  });

  it("returns 0 when no rows exist (count: 0)", async () => {
    (prisma.user.updateMany as Mock).mockResolvedValue({ count: 0 });

    const count = await executeReset();
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — Fail-soft: DB error → returns 0, does NOT throw
// ---------------------------------------------------------------------------

describe("executeReset — fail-soft on DB error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.updateMany as Mock).mockRejectedValue(
      new Error("Connection refused by Postgres")
    );
  });

  it("does not throw when prisma.user.updateMany rejects", async () => {
    await expect(executeReset()).resolves.not.toThrow();
  });

  it("returns 0 on DB error", async () => {
    const count = await executeReset();
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — startDailyLimitsResetCron: schedules with correct cron expression
// ---------------------------------------------------------------------------

describe("startDailyLimitsResetCron — schedule registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls cron.schedule exactly once", () => {
    startDailyLimitsResetCron();
    expect(cron.schedule).toHaveBeenCalledTimes(1);
  });

  it("uses the `0 0 * * *` (midnight UTC) cron expression", () => {
    startDailyLimitsResetCron();

    const [cronExpression] = (cron.schedule as Mock).mock.calls[0];
    expect(cronExpression).toBe("0 0 * * *");
  });

  it("passes UTC timezone option to cron.schedule", () => {
    startDailyLimitsResetCron();

    const [, , options] = (cron.schedule as Mock).mock.calls[0];
    expect(options).toMatchObject({ timezone: "UTC" });
  });

  it("the registered callback is an async function", () => {
    startDailyLimitsResetCron();

    const [, callback] = (cron.schedule as Mock).mock.calls[0];
    expect(typeof callback).toBe("function");
    // Calling it returns a Promise (async function)
    (prisma.user.updateMany as Mock).mockResolvedValue({ count: 0 });
    const returnVal = callback();
    expect(returnVal).toBeInstanceOf(Promise);
  });
});
