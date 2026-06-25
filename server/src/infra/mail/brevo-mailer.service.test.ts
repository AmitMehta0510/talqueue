/**
 * @file brevo-mailer.service.test.ts
 * @description Unit tests for the Brevo transactional email service.
 *
 * Mocking strategy:
 *  - `shared/errors/AppError` — real import (tiny class, no side effects).
 *  - `fetch`    — mocked via `vi.stubGlobal` to intercept HTTP calls.
 *  - `winston`  — mocked to prevent console noise and allow spy assertions.
 *  - All tests restore env vars / mocks in beforeEach to avoid cross-test pollution.
 *
 * Suites:
 *  1. renderOtpTemplate — content assertions (OTP, company name, expiry, security block).
 *  2. sendOtpEmail — dev-mode (no API key) → fail-soft, no fetch call.
 *  3. sendOtpEmail — prod-mode (no API key) → AppError 500.
 *  4. sendOtpEmail — success path → fetch called with correct shape, returns { sent: true }.
 *  5. sendOtpEmail — Brevo non-2xx → AppError 502 with message.
 *  6. sendOtpEmail — network error → AppError 502.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// ---------------------------------------------------------------------------
// Infrastructure mocks — BEFORE module import
// ---------------------------------------------------------------------------

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

vi.mock("shared/errors/AppError", () => {
  return {
    default: class AppError extends Error {
      public statusCode: number;
      constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.name = "AppError";
      }
    },
  };
});

// ---------------------------------------------------------------------------
// Subject under test
// ---------------------------------------------------------------------------

import { renderOtpTemplate, sendOtpEmail } from "./brevo-mailer.service";
import AppError from "shared/errors/AppError";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a minimal fetch mock that returns the given status/body. */
function makeFetchMock(status: number, body: unknown): Mock {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(String(body)),
  });
}

// ---------------------------------------------------------------------------
// Suite 1 — renderOtpTemplate
// ---------------------------------------------------------------------------

describe("renderOtpTemplate", () => {
  it("includes the OTP in a large monospace display", () => {
    const html = renderOtpTemplate("123456", "Acme Corp");
    expect(html).toContain("123456");
  });

  it("includes the company name", () => {
    const html = renderOtpTemplate("000000", "DeepMind");
    expect(html).toContain("DeepMind");
  });

  it("includes a 10-minute expiry notice", () => {
    const html = renderOtpTemplate("999999", "TestCo");
    expect(html).toContain("10 minutes");
  });

  it("includes a security warning block", () => {
    const html = renderOtpTemplate("111111", "SecureCorp");
    expect(html.toLowerCase()).toContain("security");
    expect(html.toLowerCase()).toContain("never share");
  });

  it("escapes HTML in company name to prevent injection", () => {
    const html = renderOtpTemplate("222222", "<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("returns a string starting with <!DOCTYPE html>", () => {
    const html = renderOtpTemplate("333333", "Corp");
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — sendOtpEmail: dev-mode (no API key)
// ---------------------------------------------------------------------------

describe("sendOtpEmail — dev mode (no BREVO_API_KEY)", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let fetchMock: Mock;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.BREVO_API_KEY;
    process.env.NODE_ENV = "development";

    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns { sent: false } without calling fetch", async () => {
    const result = await sendOtpEmail({
      to: "dev@company.io",
      otp: "456789",
      companyName: "Acme",
    });

    expect(result.sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("exposes the OTP in devOtp for dev tooling", async () => {
    const result = await sendOtpEmail({
      to: "dev@company.io",
      otp: "654321",
      companyName: "Acme",
    });

    expect(result.devOtp).toBe("654321");
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — sendOtpEmail: prod-mode (no API key) → hard reject
// ---------------------------------------------------------------------------

describe("sendOtpEmail — prod mode (no BREVO_API_KEY)", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.BREVO_API_KEY;
    process.env.NODE_ENV = "production";
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("throws AppError 500 when API key is absent in production", async () => {
    await expect(
      sendOtpEmail({ to: "recruiter@corp.com", otp: "112233", companyName: "CorpX" })
    ).rejects.toMatchObject({ statusCode: 500 });
  });

  it("error message mentions email service configuration", async () => {
    await expect(
      sendOtpEmail({ to: "recruiter@corp.com", otp: "998877", companyName: "CorpX" })
    ).rejects.toThrow(/email service/i);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — sendOtpEmail: success path
// ---------------------------------------------------------------------------

describe("sendOtpEmail — success (API key present)", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let fetchMock: Mock;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.BREVO_API_KEY = "test-brevo-key-abc123";
    process.env.NODE_ENV = "development";

    fetchMock = makeFetchMock(201, { messageId: "abc-123" });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns { sent: true }", async () => {
    const result = await sendOtpEmail({
      to: "alice@company.io",
      otp: "778899",
      companyName: "Awesome Corp",
    });
    expect(result.sent).toBe(true);
  });

  it("calls fetch exactly once", async () => {
    await sendOtpEmail({ to: "alice@company.io", otp: "778899", companyName: "Awesome Corp" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends to the Brevo v3 SMTP endpoint", async () => {
    await sendOtpEmail({ to: "alice@company.io", otp: "778899", companyName: "Awesome Corp" });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
  });

  it("sets api-key header from env var", async () => {
    await sendOtpEmail({ to: "alice@company.io", otp: "778899", companyName: "Awesome Corp" });
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["api-key"]).toBe("test-brevo-key-abc123");
  });

  it("sets content-type to application/json", async () => {
    await sendOtpEmail({ to: "alice@company.io", otp: "778899", companyName: "Awesome Corp" });
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["content-type"]).toBe("application/json");
  });

  it("sends to the correct recipient email", async () => {
    await sendOtpEmail({ to: "alice@company.io", otp: "778899", companyName: "Awesome Corp" });
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.to).toEqual(expect.arrayContaining([{ email: "alice@company.io" }]));
  });

  it("embeds OTP in the htmlContent", async () => {
    await sendOtpEmail({ to: "alice@company.io", otp: "778899", companyName: "Awesome Corp" });
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.htmlContent).toContain("778899");
  });

  it("includes the company name in subject", async () => {
    await sendOtpEmail({ to: "alice@company.io", otp: "778899", companyName: "Awesome Corp" });
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.subject).toContain("Awesome Corp");
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — sendOtpEmail: Brevo API error (non-2xx)
// ---------------------------------------------------------------------------

describe("sendOtpEmail — Brevo API non-2xx response", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.BREVO_API_KEY = "valid-key";
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("throws AppError 502 when Brevo returns 401", async () => {
    vi.stubGlobal("fetch", makeFetchMock(401, { message: "Invalid API key" }));

    await expect(
      sendOtpEmail({ to: "x@corp.com", otp: "000001", companyName: "Corp" })
    ).rejects.toMatchObject({ statusCode: 502 });
  });

  it("error message includes Brevo's error message", async () => {
    vi.stubGlobal("fetch", makeFetchMock(429, { message: "Rate limit exceeded" }));

    await expect(
      sendOtpEmail({ to: "x@corp.com", otp: "000002", companyName: "Corp" })
    ).rejects.toThrow(/Rate limit exceeded/);
  });

  it("throws AppError 502 on a Brevo 500 error", async () => {
    vi.stubGlobal("fetch", makeFetchMock(500, { message: "Internal server error" }));

    await expect(
      sendOtpEmail({ to: "x@corp.com", otp: "000003", companyName: "Corp" })
    ).rejects.toMatchObject({ statusCode: 502 });
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — sendOtpEmail: network-level failure
// ---------------------------------------------------------------------------

describe("sendOtpEmail — network error", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.BREVO_API_KEY = "valid-key";
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("throws AppError 502 when fetch throws a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed: ECONNREFUSED"))
    );

    await expect(
      sendOtpEmail({ to: "x@corp.com", otp: "000004", companyName: "Corp" })
    ).rejects.toMatchObject({ statusCode: 502 });
  });

  it("error message mentions failure to reach email service", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("ECONNREFUSED"))
    );

    await expect(
      sendOtpEmail({ to: "x@corp.com", otp: "000005", companyName: "Corp" })
    ).rejects.toThrow(/Failed to reach email service/i);
  });
});
