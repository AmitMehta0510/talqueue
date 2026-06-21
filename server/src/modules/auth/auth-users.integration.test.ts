/**
 * @file auth-users.integration.test.ts
 * @description Phase 3 — Integration Tests: Auth + Users combined workflow.
 *
 * Strategy (Integration vs Unit):
 *   - auth.service  &  users.service  ← REAL source code, no mocking of these
 *   - prisma client                   ← MOCKED (deterministic, no DB connection)
 *   - redis client                    ← MOCKED (deterministic, no Redis connection)
 *
 * Business Journeys Covered:
 *   1. End-to-End Registration Success Flow
 *   2. Duplicate Account Identity Guard (email & username conflicts)
 *   3. OTP Validation Lifecycle Sync (trigger → store → verify → cleanup)
 *   4. Profile Hydration Sync (register → getMyProfile structural contract)
 *
 * Architecture constraints:
 *   - vi.restoreAllMocks() + vi.clearAllMocks() before every test
 *   - Typed deterministic fixtures — zero implicit `any` in assertion paths
 *   - Both auth.service and users.service are real imports (no vi.mock on them)
 *   - Only shared/database/prisma, shared/database/redis, and bcryptjs.compare are mocked at module level
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import AppError from "shared/errors/AppError";

// ---------------------------------------------------------------------------
// Module-level infrastructure mocks (must precede all service imports)
// ---------------------------------------------------------------------------

vi.mock("shared/database/redis", () => ({
  default: {
    setex: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  },
}));

// Prisma mock must be declared as a factory so vi.fn() references are stable
vi.mock("shared/database/prisma", () => {
  return {
    default: {
      user: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      role: {
        findUnique: vi.fn(),
      },
      experience: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  };
});

// Heavy service dependencies that are not under test — stub to no-ops
vi.mock("services/resdexSyncService", () => ({
  syncUserToResdex: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("modules/community/community.service", () => ({
  autoJoinUserCommunities: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("modules/colleges/colleges.service", () => ({
  ensureOfficialDepartmentCommunity: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../reputation/reputation.service", () => ({
  addReputation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../activities/activity.service", () => ({
  createActivity: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../reputation/engineering-score.service", () => ({
  calculateEngineeringScore: vi.fn().mockResolvedValue(0),
}));

// bcryptjs: hash runs real implementation (so registration tests assert real $2b$ output);
// compare is a vi.fn() that defaults to true — individual tests can override per scenario.
const bcryptCompareMock = vi.fn().mockResolvedValue(true);
vi.mock("bcryptjs", async (importOriginal) => {
  const real = await importOriginal<typeof import("bcryptjs")>();
  return {
    ...real,
    default: {
      ...real,
      compare: (...args: Parameters<typeof real.compare>) =>
        bcryptCompareMock(...args),
    },
  };
});

// ---------------------------------------------------------------------------
// Lazy imports (after mocks are registered)
// ---------------------------------------------------------------------------

import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import { registerUser, triggerEmailVerificationOTP, verifyOtpToken, loginUser } from "./auth.service";
import { getMyProfile } from "../users/users.service";

// ---------------------------------------------------------------------------
// Deterministic test fixtures
// ---------------------------------------------------------------------------

/** Full authUserSelect-shaped user returned by prisma.user.create */
const makeRegisteredUser = (overrides: Record<string, unknown> = {}) => ({
  id: "usr-001-integration",
  email: "alice@engineers.dev",
  username: "alice_dev",
  status: "ACTIVE",
  primaryRole: "STUDENT",
  isEmailVerified: false,
  followersCount: 0,
  followingCount: 0,
  connectionCount: 0,
  postCount: 0,
  profileCompleteness: 0,
  verifiedEngineer: false,
  availabilityStatus: null,
  reputationScore: 0,
  engineeringScore: 0,
  trustLevel: "BEGINNER",
  openToWork: false,
  openToInternship: false,
  acceptingCollaborators: true,
  acceptingReferrals: false,
  acceptingMentorship: false,
  createdAt: new Date("2026-01-15T10:00:00Z"),
  updatedAt: new Date("2026-01-15T10:00:00Z"),
  profile: {
    id: "prof-001",
    userId: "usr-001-integration",
    fullName: "Alice Dev",
    bio: null,
    avatarUrl: null,
    headline: null,
    location: null,
    resumeUrl: null,
    bannerUrl: null,
    availabilityText: null,
    githubUrl: null,
    linkedinUrl: null,
    portfolioUrl: null,
    collegeId: null,
    departmentId: null,
    graduationYear: null,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
  },
  roles: [
    {
      id: "ur-001",
      roleId: "role-student-id",
      createdAt: new Date("2026-01-15T10:00:00Z"),
      role: {
        id: "role-student-id",
        name: "STUDENT",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    },
  ],
  companyAdminships: [],
  collegeAdminships: [],
  cdcrMemberships: [],
  ...overrides,
});

/** getMyProfile-shaped user returned by prisma.user.findUnique */
const makeProfileUser = (overrides: Record<string, unknown> = {}) => ({
  id: "usr-001-integration",
  email: "alice@engineers.dev",
  username: "alice_dev",
  status: "ACTIVE",
  primaryRole: "STUDENT",
  followersCount: 0,
  followingCount: 0,
  connectionCount: 0,
  postCount: 0,
  profileCompleteness: 0,
  verifiedEngineer: false,
  availabilityStatus: null,
  reputationScore: 0,
  engineeringScore: 0,
  trustLevel: "BEGINNER",
  openToWork: false,
  openToInternship: false,
  acceptingCollaborators: true,
  acceptingReferrals: false,
  acceptingMentorship: false,
  createdAt: new Date("2026-01-15T10:00:00Z"),
  updatedAt: new Date("2026-01-15T10:00:00Z"),
  profile: {
    id: "prof-001",
    userId: "usr-001-integration",
    fullName: "Alice Dev",
    bio: null,
    avatarUrl: null,
    headline: null,
    college: null,
    department: null,
  },
  _count: { skills: 0, experiences: 0, educations: 0, roles: 1 },
  ...overrides,
});

const REGISTER_INPUT = {
  email: "alice@engineers.dev",
  username: "alice_dev",
  password: "SecurePass123!",
  fullName: "Alice Dev",
  role: "STUDENT" as const,
};

// ---------------------------------------------------------------------------
// Suite 1 — End-to-End Registration Success Flow
// ---------------------------------------------------------------------------

describe("Integration: Auth + Users — Registration Success Flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    // No pre-existing user
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    // Role lookup succeeds
    (prisma.role.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "role-student-id",
    });
    // User creation returns full authUserSelect-shaped object
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeRegisteredUser()
    );
  });

  it("registerUser() creates user with STUDENT primaryRole, returns valid JWT token and user object", async () => {
    const result = await registerUser(REGISTER_INPUT);

    // Token must be a non-empty string
    expect(typeof result.token).toBe("string");
    expect(result.token.length).toBeGreaterThan(20);

    // User structure must match authUserSelect contract
    expect(result.user).toBeDefined();
    expect(result.user.id).toBe("usr-001-integration");
    expect(result.user.email).toBe("alice@engineers.dev");
    expect(result.user.username).toBe("alice_dev");
  });

  it("registerUser() assigns primaryRole = STUDENT automatically from input role field", async () => {
    const result = await registerUser(REGISTER_INPUT);

    expect(result.user.primaryRole).toBe("STUDENT");

    // Verify prisma.user.create was called with correct primaryRole binding
    const createCall = (prisma.user.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(createCall.data.primaryRole).toBe("STUDENT");
  });

  it("registerUser() passes fullName to profile.create nested write in Prisma", async () => {
    await registerUser(REGISTER_INPUT);

    const createCall = (prisma.user.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(createCall.data.profile.create.fullName).toBe("Alice Dev");
  });

  it("registerUser() assigns the resolved roleId to roles.create nested write", async () => {
    await registerUser(REGISTER_INPUT);

    const createCall = (prisma.user.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(createCall.data.roles.create.roleId).toBe("role-student-id");
  });

  it("registerUser() hashes password before storing — plaintext is never persisted", async () => {
    await registerUser(REGISTER_INPUT);

    const createCall = (prisma.user.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    // The stored password must differ from the plaintext
    expect(createCall.data.password).not.toBe(REGISTER_INPUT.password);
    // bcrypt hashes begin with $2b$
    expect(createCall.data.password).toMatch(/^\$2[ab]\$/);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Duplicate Account Identity Guard
// ---------------------------------------------------------------------------

describe("Integration: Auth + Users — Duplicate Account Guard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("registerUser() throws AppError(400) when email already exists in the system", async () => {
    // Simulate existing user with same email
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      email: REGISTER_INPUT.email,
      username: "different_user",
    });
    (prisma.role.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "role-student-id",
    });

    await expect(registerUser(REGISTER_INPUT)).rejects.toThrow(AppError);
    await expect(registerUser(REGISTER_INPUT)).rejects.toThrow(
      "User already exists"
    );
  });

  it("registerUser() throws AppError(400) when username is already taken", async () => {
    // Different email, same username conflict
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      email: "other@engineers.dev",
      username: REGISTER_INPUT.username,
    });
    (prisma.role.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "role-student-id",
    });

    await expect(registerUser(REGISTER_INPUT)).rejects.toThrow(AppError);
    await expect(registerUser(REGISTER_INPUT)).rejects.toThrow(
      "Username already taken"
    );
  });

  it("registerUser() does NOT call prisma.user.create when duplicate email detected", async () => {
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      email: REGISTER_INPUT.email,
      username: "another_user",
    });
    (prisma.role.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "role-student-id",
    });

    try {
      await registerUser(REGISTER_INPUT);
    } catch {
      // expected to throw
    }

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("registerUser() throws AppError(403) when a non-public role is requested (e.g. PLATFORM_ADMIN)", async () => {
    await expect(
      registerUser({ ...REGISTER_INPUT, role: "PLATFORM_ADMIN" as any })
    ).rejects.toThrow("This role cannot be selected during public signup");
  });

  it("registerUser() throws AppError(400) when role does not exist in Prisma roles table", async () => {
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    // Role not found
    (prisma.role.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(registerUser(REGISTER_INPUT)).rejects.toThrow("Invalid role");
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — OTP Validation Lifecycle Sync
// ---------------------------------------------------------------------------

describe("Integration: Auth + Users — OTP Lifecycle (trigger → verify → cleanup)", () => {
  const OTP_EMAIL = "alice@engineers.dev";
  const MOCK_USER = { id: "usr-001-integration", email: OTP_EMAIL };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      MOCK_USER
    );
    (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...MOCK_USER,
      isEmailVerified: true,
    });
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (redis.setex as ReturnType<typeof vi.fn>).mockResolvedValue("OK");
    (redis.del as ReturnType<typeof vi.fn>).mockResolvedValue(1);
  });

  it("triggerEmailVerificationOTP() stores a 6-digit OTP in Redis under otp:email:<email> key with 600s TTL", async () => {
    const result = await triggerEmailVerificationOTP(OTP_EMAIL);

    expect(result.success).toBe(true);

    // Redis setex must have been called
    expect(redis.setex).toHaveBeenCalled();

    const [redisKey, ttl, otpCode] = (
      redis.setex as ReturnType<typeof vi.fn>
    ).mock.calls[0];

    // Key format contract
    expect(redisKey).toBe(`otp:email:${OTP_EMAIL}`);
    // TTL must be exactly 600 seconds (10 minutes)
    expect(ttl).toBe(600);
    // OTP must be a 6-digit numeric string
    expect(otpCode).toMatch(/^\d{6}$/);
  });

  it("verifyOtpToken() with matching OTP → sets isEmailVerified=true in DB and deletes OTP from Redis", async () => {
    const correctOtp = "748291";
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(correctOtp);

    const result = await verifyOtpToken(OTP_EMAIL, correctOtp);

    expect(result.success).toBe(true);

    // DB must be updated with isEmailVerified = true
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email: OTP_EMAIL },
      data: { isEmailVerified: true },
    });

    // OTP Redis key must be deleted after successful verification
    expect(redis.del).toHaveBeenCalledWith(`otp:email:${OTP_EMAIL}`);
  });

  it("verifyOtpToken() with wrong OTP → throws AppError(400) and does NOT update DB", async () => {
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce("111111");

    await expect(verifyOtpToken(OTP_EMAIL, "999999")).rejects.toThrow(
      "Invalid or expired OTP"
    );

    // DB must NOT be updated
    expect(prisma.user.update).not.toHaveBeenCalled();
    // Redis key must NOT be deleted
    expect(redis.del).not.toHaveBeenCalled();
  });

  it("verifyOtpToken() with null Redis response (expired OTP) → throws AppError(400)", async () => {
    // Redis returns null → OTP expired
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    await expect(verifyOtpToken(OTP_EMAIL, "748291")).rejects.toThrow(
      "Invalid or expired OTP"
    );
  });

  it("verifyOtpToken() sandbox bypass ('123456') in non-production → skips Redis and verifies directly", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const result = await verifyOtpToken(OTP_EMAIL, "123456");

    expect(result.success).toBe(true);
    expect(result.message).toContain("sandbox bypass");

    // DB update must happen even without Redis OTP
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email: OTP_EMAIL },
      data: { isEmailVerified: true },
    });

    // Redis.get must NOT be called (bypassed)
    expect(redis.get).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it("triggerEmailVerificationOTP() throws AppError(404) when email is not registered", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      null
    );

    await expect(
      triggerEmailVerificationOTP("ghost@engineers.dev")
    ).rejects.toThrow("User not found");

    // Redis must not be touched for unknown user
    expect(redis.setex).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — Profile Hydration Sync (register → getMyProfile contract)
// ---------------------------------------------------------------------------

describe("Integration: Auth + Users — Profile Hydration Sync", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    // Redis miss → force DB fetch path in getMyProfile
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (redis.setex as ReturnType<typeof vi.fn>).mockResolvedValue("OK");
  });

  it("getMyProfile() after registration returns a user object with structural consistency matching registered user id", async () => {
    const profileUser = makeProfileUser();

    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      profileUser
    );

    const profile = await getMyProfile("usr-001-integration");

    // Core identity fields must match registered user
    expect(profile.id).toBe("usr-001-integration");
    expect(profile.email).toBe("alice@engineers.dev");
    expect(profile.username).toBe("alice_dev");
    expect(profile.primaryRole).toBe("STUDENT");
  });

  it("getMyProfile() includes nested profile object with fullName from registration", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeProfileUser()
    );

    const profile = await getMyProfile("usr-001-integration");

    expect(profile.profile).toBeDefined();
    expect((profile.profile as any).fullName).toBe("Alice Dev");
  });

  it("getMyProfile() returns freshly initialized counters matching registration defaults", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeProfileUser()
    );

    const profile = await getMyProfile("usr-001-integration");

    expect(profile.followersCount).toBe(0);
    expect(profile.followingCount).toBe(0);
    expect(profile.connectionCount).toBe(0);
    expect(profile.postCount).toBe(0);
    expect(profile.reputationScore).toBe(0);
    expect(profile.trustLevel).toBe("BEGINNER");
  });

  it("getMyProfile() caches the result in Redis with setex after a DB fetch", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeProfileUser()
    );

    await getMyProfile("usr-001-integration");

    // Redis cache set must be triggered after successful DB read
    expect(redis.setex).toHaveBeenCalled();
    const [cacheKey, ttl] = (redis.setex as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(cacheKey).toBe("profile:usr-001-integration");
    expect(typeof ttl).toBe("number");
    expect(ttl).toBeGreaterThan(0);
  });

  it("getMyProfile() returns cached profile from Redis on second call (skips DB)", async () => {
    const cachedProfile = makeProfileUser();
    // First call: Redis has the profile cached already
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify(cachedProfile)
    );

    const profile = await getMyProfile("usr-001-integration");

    expect(profile.id).toBe("usr-001-integration");

    // DB must NOT be queried when Redis cache hits
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("getMyProfile() throws AppError(404) when user id does not exist in DB", async () => {
    // Redis miss
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    // DB miss
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      null
    );

    await expect(getMyProfile("nonexistent-user-id")).rejects.toThrow(
      "User not found"
    );
  });

  it("loginUser() after registration returns token and same user id as registration", async () => {
    const hashedPassword =
      "$2b$12$exampleHashedPasswordForAliceDev.exampleHashedPasswordForAliceDev";

    // loginUser fetches user with password field included
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...makeRegisteredUser(),
      password: hashedPassword,
    });

    // bcryptCompareMock is already set to resolve `true` by default (see module-level mock).
    // Explicitly confirm this for the integration contract assertion.
    bcryptCompareMock.mockResolvedValueOnce(true);

    const loginResult = await loginUser({
      email: REGISTER_INPUT.email,
      password: REGISTER_INPUT.password,
    });

    expect(typeof loginResult.token).toBe("string");
    expect(loginResult.token.length).toBeGreaterThan(20);
    expect(loginResult.user.id).toBe("usr-001-integration");
    expect(loginResult.user.email).toBe("alice@engineers.dev");
    // Password must never be included in the returned user object
    expect((loginResult.user as any).password).toBeUndefined();
  });
});
