/**
 * @file growth-loops.controller.test.ts
 * @module GrowthLoops
 *
 * Unit test suite for the Growth Loops controller.
 *
 * Architecture notes:
 *  - Prisma and Redis are fully mocked — no real DB or Redis connections.
 *  - Express Request/Response are hand-crafted mocks.
 *  - Each handler (claimInitiateHandler, claimVerifyHandler, tpoOnboardCollegeHandler)
 *    is tested against the 3 core paths: success, domain mismatch (403),
 *    OTP expired (410), OTP invalid (401), and conflict/duplicate (409).
 *
 * Coverage map:
 *  ┌────────────────────────────────────────────────────────────────────────────┐
 *  │  Suite 1 │ claimInitiateHandler  │ domain match → OTP, mismatch → 403    │
 *  │  Suite 2 │ claimVerifyHandler    │ success, expired OTP, invalid OTP      │
 *  │  Suite 3 │ tpoOnboardCollegeHandler │ success, duplicate request → 409   │
 *  └────────────────────────────────────────────────────────────────────────────┘
 */

import { describe, test, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that use these modules
// ---------------------------------------------------------------------------

vi.mock("shared/database/prisma", () => ({
  default: {
    company: {
      findUnique: vi.fn(),
    },
    collegeRequest: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    companyRequest: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    userRole: {
      findMany: vi.fn(),
    },
    college: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("shared/database/redis", () => ({
  default: {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("modules/notificatios/notifications.service", () => ({
  createNotification: vi.fn().mockResolvedValue({}),
}));

// asyncHandler passes the inner fn through so we can call handlers directly
vi.mock("shared/utils/asyncHandler", () => ({
  default: (fn: any) =>
    async (req: any, res: any, next: any) => {
      try {
        await fn(req, res, next);
      } catch (err) {
        next(err);
      }
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

// Mock Brevo mailer — prevents real HTTP calls and controls emailSent flag
vi.mock("infra/mail/brevo-mailer.service", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue({ sent: false, devOtp: "123456" }),
}));

// Import after mocks
import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import {
  claimInitiateHandler,
  claimVerifyHandler,
  tpoOnboardCollegeHandler,
} from "./growth-loops.controller";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Build a minimal Express-like mock request. */
function mockReq(body: Record<string, unknown> = {}, user = { id: "user-001" }) {
  return { body, user } as any;
}

/** Build a chainable Express-like mock response. */
function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const mockNext = vi.fn();

// ---------------------------------------------------------------------------
// Suite 1 — claimInitiateHandler
// ---------------------------------------------------------------------------

describe("claimInitiateHandler", () => {
  const companyId = "a1b2c3d4-e5f6-4789-abcd-ef1234567890"; // valid UUID v4

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.userRole.findMany as any).mockResolvedValue([]);
  });

  test("returns 200 and OTP when businessEmail domain matches company emailDomains", async () => {
    (prisma.company.findUnique as any).mockResolvedValue({
      id: companyId,
      name: "Acme Corp",
      emailDomains: ["acme.com"],
      verificationStatus: "UNVERIFIED",
      claimedAt: null,
    });
    (redis.set as any).mockResolvedValue("OK");

    const req = mockReq({ companyId, businessEmail: "recruiter@acme.com" });
    const res = mockRes();

    await claimInitiateHandler(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId,
          companyName: "Acme Corp",
          businessEmail: "recruiter@acme.com",
        }),
      })
    );
    // Redis should have stored the OTP
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining(`company-claim:${companyId}:`),
      expect.any(String),
      "EX",
      600
    );
  });

  test("throws 403 when businessEmail domain does NOT match company emailDomains", async () => {
    (prisma.company.findUnique as any).mockResolvedValue({
      id: companyId,
      name: "Acme Corp",
      emailDomains: ["acme.com"],
      verificationStatus: "UNVERIFIED",
      claimedAt: null,
    });

    const req = mockReq({ companyId, businessEmail: "hacker@evil.com" });
    const res = mockRes();

    await claimInitiateHandler(req, res, mockNext);

    // Handler uses asyncHandler which calls next(err) on throw
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );
    expect(redis.set).not.toHaveBeenCalled();
  });

  test("throws 404 when company does not exist", async () => {
    (prisma.company.findUnique as any).mockResolvedValue(null);

    // Use a valid UUID that simply won't be found in the mock
    const req = mockReq({ companyId: "00000000-0000-4000-8000-000000000001", businessEmail: "a@b.com" });
    const res = mockRes();

    await claimInitiateHandler(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 })
    );
  });

  test("throws 409 when company is already verified and claimed", async () => {
    (prisma.company.findUnique as any).mockResolvedValue({
      id: companyId,
      name: "Acme Corp",
      emailDomains: ["acme.com"],
      verificationStatus: "VERIFIED",
      claimedAt: new Date(),
    });

    const req = mockReq({ companyId, businessEmail: "recruiter@acme.com" });
    const res = mockRes();

    await claimInitiateHandler(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409 })
    );
  });

  test("throws 403 when company has empty emailDomains array", async () => {
    (prisma.company.findUnique as any).mockResolvedValue({
      id: companyId,
      name: "Acme Corp",
      emailDomains: [], // no domains registered
      verificationStatus: "UNVERIFIED",
      claimedAt: null,
    });

    // Valid UUID companyId — domain check fails because emailDomains is empty
    const req = mockReq({ companyId, businessEmail: "recruiter@acme.com" });
    const res = mockRes();

    await claimInitiateHandler(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — claimVerifyHandler
// ---------------------------------------------------------------------------

describe("claimVerifyHandler", () => {
  const companyId = "b2c3d4e5-f6a7-4890-bcde-f01234567891"; // valid UUID v4
  const validOtp = "123456";

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.userRole.findMany as any).mockResolvedValue([]);
  });

  test("returns 201 and creates CompanyRequest on correct OTP", async () => {
    (redis.get as any).mockResolvedValue(validOtp);
    (redis.del as any).mockResolvedValue(1);
    (prisma.company.findUnique as any).mockResolvedValue({
      id: companyId,
      name: "Beta Corp",
      verificationStatus: "UNVERIFIED",
    });
    (prisma.companyRequest.findFirst as any).mockResolvedValue(null);
    (prisma.companyRequest.create as any).mockResolvedValue({
      id: "req-001",
      companyName: "Beta Corp",
      requestType: "COMPANY_CLAIM",
      status: "PENDING",
      createdAt: new Date(),
    });

    const req = mockReq({ companyId, otp: validOtp });
    const res = mockRes();

    await claimVerifyHandler(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(prisma.companyRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId,
          requestType: "COMPANY_CLAIM",
          status: "PENDING",
        }),
      })
    );
    // OTP should be consumed (deleted from Redis)
    expect(redis.del).toHaveBeenCalledWith(
      expect.stringContaining(`company-claim:${companyId}:`)
    );
  });

  test("throws 410 (Gone) when OTP has expired (Redis key missing)", async () => {
    (redis.get as any).mockResolvedValue(null); // key not found / expired

    const req = mockReq({ companyId, otp: validOtp });
    const res = mockRes();

    await claimVerifyHandler(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 410 })
    );
    expect(prisma.companyRequest.create).not.toHaveBeenCalled();
  });

  test("throws 401 when OTP does not match stored value", async () => {
    (redis.get as any).mockResolvedValue("999999"); // stored OTP differs

    const req = mockReq({ companyId, otp: "111111" }); // wrong OTP
    const res = mockRes();

    await claimVerifyHandler(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 })
    );
    // Redis key should NOT be deleted on wrong OTP
    expect(redis.del).not.toHaveBeenCalled();
  });

  test("throws 409 when a pending claim already exists for this user/company", async () => {
    (redis.get as any).mockResolvedValue(validOtp);
    (redis.del as any).mockResolvedValue(1);
    (prisma.company.findUnique as any).mockResolvedValue({
      id: companyId,
      name: "Beta Corp",
      verificationStatus: "UNVERIFIED",
    });
    (prisma.companyRequest.findFirst as any).mockResolvedValue({
      id: "existing-req-001", // existing pending claim
    });

    const req = mockReq({ companyId, otp: validOtp });
    const res = mockRes();

    await claimVerifyHandler(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409 })
    );
    expect(prisma.companyRequest.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — tpoOnboardCollegeHandler
// ---------------------------------------------------------------------------

describe("tpoOnboardCollegeHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.userRole.findMany as any).mockResolvedValue([]);
    (prisma.college.findFirst as any).mockResolvedValue(null);
  });

  test("returns 201 and creates a CollegeRequest on valid input", async () => {
    (prisma.collegeRequest.findFirst as any).mockResolvedValue(null);
    (prisma.collegeRequest.create as any).mockResolvedValue({
      id: "req-college-001",
      name: "IIT Bombay",
      status: "PENDING",
      officialEmail: "tpo@iitb.ac.in",
      aisheCode: "C-12345",
      createdAt: new Date(),
    });

    const req = mockReq({
      collegeName: "IIT Bombay",
      officialEmail: "tpo@iitb.ac.in",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      aisheCode: "C-12345",
    });
    const res = mockRes();

    await tpoOnboardCollegeHandler(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(prisma.collegeRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "IIT Bombay",
          officialEmail: "tpo@iitb.ac.in",
          status: "PENDING",
        }),
      })
    );
  });

  test("throws 409 when a PENDING request for the same college already exists", async () => {
    (prisma.collegeRequest.findFirst as any).mockResolvedValue({
      id: "existing-req",
      status: "PENDING",
    });

    const req = mockReq({
      collegeName: "IIT Delhi",
      officialEmail: "tpo@iitd.ac.in",
    });
    const res = mockRes();

    await tpoOnboardCollegeHandler(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409 })
    );
    expect(prisma.collegeRequest.create).not.toHaveBeenCalled();
  });

  test("throws 400 for invalid officialEmail", async () => {
    const req = mockReq({
      collegeName: "BITS Pilani",
      officialEmail: "not-an-email",
    });
    const res = mockRes();

    await tpoOnboardCollegeHandler(req, res, mockNext);

    // Zod validation failure → next called with error
    expect(mockNext).toHaveBeenCalled();
    expect(prisma.collegeRequest.create).not.toHaveBeenCalled();
  });
});
