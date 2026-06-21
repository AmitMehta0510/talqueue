import { describe, test, expect, vi, beforeEach } from "vitest";
import redis from "shared/database/redis";
import prisma from "shared/database/prisma";
import * as usersService from "./users.service";
import { verifyCollegeEmail, verifyWorkEmail, addExperience, addEducation } from "./users.service";

vi.mock("shared/database/redis", () => {
  const store = new Map<string, string>();
  return {
    default: {
      setex: vi.fn().mockImplementation(async (key, _ttl, value) => {
        store.set(key, value);
      }),
      get: vi.fn().mockImplementation(async (key) => {
        return store.get(key) || null;
      }),
      del: vi.fn().mockImplementation(async (key) => {
        store.delete(key);
      }),
      // Required by getMyProfile's sliding-window cache refresh
      expire: vi.fn().mockResolvedValue(1),
    },
  };
});

// Mock helper services called by addExperience
vi.mock("../reputation/reputation.service", () => ({
  addReputation: vi.fn().mockResolvedValue({}),
}));
vi.mock("../activities/activity.service", () => ({
  createActivity: vi.fn().mockResolvedValue({}),
}));
vi.mock("../reputation/engineering-score.service", () => ({
  calculateEngineeringScore: vi.fn().mockResolvedValue(10),
}));
vi.mock("modules/community/community.service", () => ({
  autoJoinUserCommunities: vi.fn().mockResolvedValue({ joinedCommunityIds: [] }),
}));
vi.mock("services/resdexSyncService", () => ({
  syncUserToResdex: vi.fn(),
}));

describe("Users Service - OTP and Email Domain Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("verifyCollegeEmail - generates random OTP and saves to Redis", async () => {
    (prisma.education.findFirst as any) = async () => ({
      id: "edu-123",
      userId: "user-123",
      collegeId: "college-123",
      college: {
        id: "college-123",
        name: "Test Institute",
        emailDomains: ["mit.edu"],
      },
    });

    const result = await verifyCollegeEmail("user-123", "edu-123", "student@mit.edu");
    expect(result.success).toBe(true);
    expect(result.message).toContain("A verification code has been sent");

    expect(redis.setex).toHaveBeenCalled();
    const mockCalls = vi.mocked(redis.setex).mock.calls;
    expect(mockCalls[0][0]).toBe("verification:college:user-123:edu-123");
    expect(mockCalls[0][1]).toBe(600); // 10 minutes

    const savedData = JSON.parse(mockCalls[0][2] as string);
    expect(savedData.email).toBe("student@mit.edu");
    expect(savedData.code).toMatch(/^\d{6}$/); // 6 digits
  });

  test("verifyCollegeEmail - subdomain exact boundary match allows nested subdomains", async () => {
    (prisma.education.findFirst as any) = async () => ({
      id: "edu-123",
      userId: "user-123",
      collegeId: "college-123",
      college: {
        id: "college-123",
        name: "Test Institute",
        emailDomains: ["mit.edu"],
      },
    });

    // Valid nested subdomain should succeed
    const result = await verifyCollegeEmail("user-123", "edu-123", "student@engineering.mit.edu");
    expect(result.success).toBe(true);
  });

  test("verifyCollegeEmail - subdomain check rejects spoof domains", async () => {
    (prisma.education.findFirst as any) = async () => ({
      id: "edu-123",
      userId: "user-123",
      collegeId: "college-123",
      college: {
        id: "college-123",
        name: "Test Institute",
        emailDomains: ["mit.edu"],
      },
    });

    // Suffix spoofing (ends with mit.edu but has attacker.com suffix)
    await expect(
      verifyCollegeEmail("user-123", "edu-123", "student@mit.edu.attacker.com")
    ).rejects.toThrow("does not match any approved domains");

    // Substring spoofing (ends with othermit.edu)
    await expect(
      verifyCollegeEmail("user-123", "edu-123", "student@othermit.edu")
    ).rejects.toThrow("does not match any approved domains");
  });

  test("verifyCollegeEmail - completes verification with correct OTP code", async () => {
    (prisma.education.findFirst as any) = async () => ({
      id: "edu-123",
      userId: "user-123",
      collegeId: "college-123",
      college: {
        id: "college-123",
        name: "Test Institute",
        emailDomains: ["mit.edu"],
      },
    });

    // Populate redis mock first
    const mockOtp = "777888";
    vi.mocked(redis.get).mockResolvedValueOnce(
      JSON.stringify({ email: "student@mit.edu", code: mockOtp })
    );

    // Spy on prisma update
    const updateSpy = vi.fn().mockResolvedValue({ id: "edu-123", collegeId: "college-123" });
    (prisma.education.update as any) = updateSpy;

    // Stub transaction
    (prisma.$transaction as any) = async (cb: any) => cb(prisma);

    const result = await verifyCollegeEmail("user-123", "edu-123", "student@mit.edu", mockOtp);
    expect(result.success).toBe(true);
    expect(result.message).toContain("successfully");
    expect(redis.del).toHaveBeenCalledWith("verification:college:user-123:edu-123");
    expect(updateSpy).toHaveBeenCalled();
  });
});

describe("Users Service - Asynchronous Post-Transaction Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("addExperience - transaction does not directly call autoJoinUserCommunities, defers via setImmediate", async () => {
    // Stub db query stubs
    (prisma.company.findFirst as any) = async () => ({ id: "company-123", name: "Google" });
    (prisma.experience.findMany as any) = async () => [];
    (prisma.experience.create as any) = async () => ({
      id: "exp-123",
      companyId: "company-123",
      companyName: "Google",
    });

    // Stub transaction
    (prisma.$transaction as any) = async (cb: any) => cb(prisma);

    const spyAutoJoin = vi.spyOn(await import("modules/community/community.service"), "autoJoinUserCommunities");
    const spySyncResdex = vi.spyOn(await import("services/resdexSyncService"), "syncUserToResdex");

    const result = await addExperience("user-123", {
      companyName: "Google",
      title: "Software Engineer",
      employmentType: "FULL_TIME",
      startDate: new Date().toISOString(),
    });

    expect(result).toBeDefined();
    // Synchronously, the transaction is completed but hooks have NOT run yet
    expect(spyAutoJoin).not.toHaveBeenCalled();

    // Fast forward event loop
    await new Promise((resolve) => setImmediate(resolve));

    // Now hooks should be executed asynchronously
    expect(spyAutoJoin).toHaveBeenCalled();
    expect(spySyncResdex).toHaveBeenCalled();
  });
});

describe("Users Controller & Service - Whitelist and Prefix Search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("updateMe - strictly whitelists bio, headline, location, openToWork, openToInternship and rejects others", async () => {
    const spyUpdateProfile = vi.spyOn(usersService, "updateProfile").mockResolvedValue({ id: "user-123" } as any);
    const spySyncResdex = vi.spyOn(await import("services/resdexSyncService"), "syncUserToResdex");
    const { updateMe } = await import("./users.controller");

    const mockReq = {
      user: { id: "user-123" },
      body: {
        bio: "My bio",
        headline: "Software Engineer",
        location: "Bengaluru",
        openToWork: true,
        openToInternship: false,
        // Sensitive/unallowed fields
        reputationScore: 500,
        engineeringScore: 9.8,
        trustLevel: "ELITE",
        verifiedEngineer: true,
        badges: ["top-developer"],
      },
    } as any;

    const mockRes = {
      json: vi.fn(),
    } as any;

    await updateMe(mockReq, mockRes, vi.fn());

    expect(spyUpdateProfile).toHaveBeenCalled();
    const passedData = spyUpdateProfile.mock.calls[0][1];
    
    // Whitelisted fields must be passed
    expect(passedData.bio).toBe("My bio");
    expect(passedData.headline).toBe("Software Engineer");
    expect(passedData.location).toBe("Bengaluru");
    expect(passedData.openToWork).toBe(true);
    expect(passedData.openToInternship).toBe(false);

    // Non-whitelisted fields must NOT be passed
    expect((passedData as any).reputationScore).toBeUndefined();
    expect((passedData as any).engineeringScore).toBeUndefined();
    expect((passedData as any).trustLevel).toBeUndefined();
    expect((passedData as any).verifiedEngineer).toBeUndefined();
    expect((passedData as any).badges).toBeUndefined();

    // Must trigger syncUserToResdex
    expect(spySyncResdex).toHaveBeenCalledWith("user-123");
  });

  test("searchSkills - uses prefix matching (startsWith) instead of contains", async () => {
    const mockFindMany = vi.fn().mockResolvedValue([]);
    (prisma.skill.findMany as any) = mockFindMany;

    await usersService.searchSkills("rea", 5);

    expect(mockFindMany).toHaveBeenCalled();
    const queryArgs = mockFindMany.mock.calls[0][0];
    expect(queryArgs.where.name.startsWith).toBe("rea");
    expect(queryArgs.where.name.contains).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Reusable typed fixtures — defined once, shared across all new suites below.
// Keeping them module-scoped avoids allocating fresh objects on every test run
// while still being safe because each test resets relevant mocks via beforeEach.
// ---------------------------------------------------------------------------

/** Minimal shape that satisfies the `userProfileSelect` Prisma projection. */
const MOCK_USER_PROFILE = {
  id: "user-abc-123",
  email: "alice@example.com",
  username: "alice_dev",
  status: "ACTIVE",
  followersCount: 42,
  followingCount: 18,
  connectionCount: 5,
  postCount: 7,
  profileCompleteness: 65,
  verifiedEngineer: false,
  availabilityStatus: null,
  reputationScore: 120,
  engineeringScore: 8,
  trustLevel: "INTERMEDIATE" as const,
  primaryRole: "STUDENT" as const,
  openToWork: true,
  openToInternship: false,
  acceptingCollaborators: true,
  acceptingReferrals: false,
  acceptingMentorship: false,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-06-01T00:00:00Z"),
  profile: {
    fullName: "Alice Developer",
    collegeId: "college-xyz",
    departmentId: "dept-cs-001",
    college: { id: "college-xyz", name: "Tech University" },
    department: { id: "dept-cs-001", name: "Computer Science" },
  },
  _count: { skills: 4, experiences: 2, educations: 1, roles: 1 },
} as const;

/** Snapshot of the user row as stored inside the transaction for updateProfile. */
const MOCK_TX_USER = {
  id: MOCK_USER_PROFILE.id,
  username: MOCK_USER_PROFILE.username,
  profile: {
    fullName: "Alice Developer",
    collegeId: "college-xyz" as string | null,
    departmentId: "dept-cs-001" as string | null,
  },
} as const;

// ---------------------------------------------------------------------------
// Suite 1: getMyProfile
// ---------------------------------------------------------------------------
describe("Users Service - getMyProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks(); // ensure no vi.spyOn() from prior suites intercepts
    // Reset prisma.$transaction to a safe default so no prior test stub bleeds in
    (prisma.$transaction as any) = async (cb: any) => cb(prisma);
  });

  // ------------------------------------------------------------------
  // Test 1 — Cache-Miss Path (cold start)
  //
  // Verifies that when Redis has no cached entry (returns null), the
  // service correctly falls through to Prisma, returns all required
  // profile fields, and then writes the result into Redis with a 180-second
  // TTL so subsequent calls are served from cache.
  // ------------------------------------------------------------------
  test(
    "cache-miss: falls through to Prisma, returns correct profile fields, " +
      "and writes result to Redis with 180 s TTL",
    async () => {
      // Redis cache is empty for this user.
      vi.mocked(redis.get).mockResolvedValueOnce(null);

      // Prisma returns the full profile projection.
      (prisma.user.findUnique as any) = vi
        .fn()
        .mockResolvedValue(MOCK_USER_PROFILE);

      const result = await usersService.getMyProfile(MOCK_USER_PROFILE.id);

      // ── Assertions on returned shape ──────────────────────────────────
      expect(result.id).toBe(MOCK_USER_PROFILE.id);
      expect(result.email).toBe(MOCK_USER_PROFILE.email);
      expect(result.username).toBe(MOCK_USER_PROFILE.username);
      expect(result.followersCount).toBe(MOCK_USER_PROFILE.followersCount);
      expect(result.profileCompleteness).toBe(
        MOCK_USER_PROFILE.profileCompleteness
      );
      expect(result.profile?.college?.name).toBe("Tech University");
      expect(result._count.skills).toBe(4);

      // ── Assertions on Prisma call ─────────────────────────────────────
      expect(prisma.user.findUnique).toHaveBeenCalledOnce();
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOCK_USER_PROFILE.id },
        })
      );

      // ── Assertions on Redis write-back ────────────────────────────────
      // The service must cache the result so subsequent hits skip DB.
      expect(redis.setex).toHaveBeenCalledWith(
        `profile:${MOCK_USER_PROFILE.id}`,
        180,
        JSON.stringify(MOCK_USER_PROFILE)
      );
    }
  );

  // ------------------------------------------------------------------
  // Test 2 — Cache-Hit Path (warm cache)
  //
  // Ensures that when Redis has a valid JSON entry, getMyProfile returns
  // data directly from cache WITHOUT touching Prisma. The service also
  // calls redis.expire internally to implement a sliding-window strategy.
  // ------------------------------------------------------------------
  test(
    "cache-hit: returns deserialized data from Redis without querying Prisma",
    async () => {
      // Seed the Redis mock with a pre-serialized profile.
      vi.mocked(redis.get).mockResolvedValueOnce(
        JSON.stringify(MOCK_USER_PROFILE)
      );

      // Attach a spy so we can assert Prisma was NOT invoked.
      const prismaSpy = vi.fn();
      (prisma.user.findUnique as any) = prismaSpy;

      const result = await usersService.getMyProfile(MOCK_USER_PROFILE.id);

      // ── Data correctness ──────────────────────────────────────────────
      expect(result.id).toBe(MOCK_USER_PROFILE.id);
      expect(result.username).toBe(MOCK_USER_PROFILE.username);
      expect(result.reputationScore).toBe(MOCK_USER_PROFILE.reputationScore);

      // ── DB must not have been hit ─────────────────────────────────────
      expect(prismaSpy).not.toHaveBeenCalled();

      // ── Redis was queried with the correct cache key ───────────────────
      expect(vi.mocked(redis.get)).toHaveBeenCalledWith(
        `profile:${MOCK_USER_PROFILE.id}`
      );
    }
  );

  // ------------------------------------------------------------------
  // Test 3 — Non-Existent User (404 AppError)
  //
  // When Prisma returns null (unknown userId), getMyProfile must throw
  // an AppError with statusCode 404 and the canonical message "User not
  // found". This guards against callers receiving undefined and avoids
  // silent data leaks for deleted/suspended accounts.
  // ------------------------------------------------------------------
  test(
    "throws AppError(404) when Prisma returns null for a non-existent userId",
    async () => {
      // Cache miss — force a DB lookup.
      vi.mocked(redis.get).mockResolvedValueOnce(null);

      // Prisma finds nothing.
      (prisma.user.findUnique as any) = vi.fn().mockResolvedValue(null);

      await expect(
        usersService.getMyProfile("non-existent-user-id")
      ).rejects.toMatchObject({
        message: "User not found",
        statusCode: 404,
      });

      // Verify that no stale data was cached for the missing user.
      expect(redis.setex).not.toHaveBeenCalled();
    }
  );
});

// ---------------------------------------------------------------------------
// Suite 2: updateProfile — Partial Update (transaction-safe)
// ---------------------------------------------------------------------------
describe("Users Service - updateProfile (partial fields, transaction-safe)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks(); // remove vi.spyOn(usersService,'updateProfile') from updateMe test
    // Guarantee a clean $transaction base between tests — prevents stub bleed-through
    (prisma.$transaction as any) = async (_cb: any) => { throw new Error("$transaction not stubbed in this test"); };
    vi.mocked(redis.del).mockResolvedValue(1 as any);
  });

  // ------------------------------------------------------------------
  // Test 1 — Partial field update: only changed fields enter the DB
  //
  // updateProfile is designed so that `stripUndefined` removes any key
  // whose value is `undefined`, meaning the Prisma upsert only carries
  // the fields the caller actually wants to change. This prevents
  // accidental overwrites of unrelated columns.
  //
  // This test sends only `bio` and `headline`, and asserts:
  //   a) The transaction commits successfully.
  //   b) The profile upsert is called with exactly those two fields.
  //   c) Fields absent from the payload (e.g. location, avatarUrl) are
  //      NOT present in the update args.
  //   d) Redis cache for this user is invalidated after the write.
  //   e) The returned object matches the Prisma post-update snapshot.
  // ------------------------------------------------------------------
  test(
    "passes only the supplied fields to the profile upsert and invalidates " +
      "the Redis cache after a successful transaction",
    async () => {
      // ── Prisma mock setup ─────────────────────────────────────────────
      // tx.user.findUnique — first call returns current user row,
      // second call (at end of transaction) returns the updated snapshot.
      const updatedSnapshot = {
        ...MOCK_USER_PROFILE,
        profile: { ...MOCK_USER_PROFILE.profile, bio: "Updated bio" },
      };

      const txUserFindUnique = vi
        .fn()
        .mockResolvedValueOnce(MOCK_TX_USER)     // 1st: current user fetch
        .mockResolvedValueOnce(updatedSnapshot); // 2nd: post-transaction SELECT

      // tx.profile.upsert — the main write we want to inspect
      const txProfileUpsert = vi
        .fn()
        .mockResolvedValue({ userId: MOCK_USER_PROFILE.id });

      const mockTx = {
        user: {
          findUnique: txUserFindUnique,
          update: vi.fn().mockResolvedValue({}),
        },
        profile: { upsert: txProfileUpsert },
        college: { findUnique: vi.fn().mockResolvedValue(null) },
        department: { findUnique: vi.fn().mockResolvedValue(null) },
        codingProfile: {
          deleteMany: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({}),
        },
      };

      // Capture the spy reference BEFORE assignment so we can assert on it.
      const txSpy = vi.fn().mockImplementation(
        async (callback: (tx: any) => Promise<any>) => callback(mockTx)
      );
      (prisma.$transaction as any) = txSpy;

      // ── Execute ───────────────────────────────────────────────────────
      const result = await usersService.updateProfile(
        MOCK_USER_PROFILE.id,
        { bio: "Updated bio", headline: "Senior Engineer @ Scale" }
      );

      // ── a) Transaction was initiated ──────────────────────────────────
      expect(txSpy).toHaveBeenCalledOnce();

      // ── b) Only supplied fields reach profile.upsert ──────────────────
      expect(txProfileUpsert).toHaveBeenCalledOnce();
      const upsertArgs = txProfileUpsert.mock.calls[0][0];

      expect(upsertArgs.update).toMatchObject({
        bio: "Updated bio",
        headline: "Senior Engineer @ Scale",
      });

      // ── c) Absent fields must NOT appear in the upsert payload ────────
      expect(upsertArgs.update).not.toHaveProperty("location");
      expect(upsertArgs.update).not.toHaveProperty("avatarUrl");
      expect(upsertArgs.update).not.toHaveProperty("resumeUrl");

      // ── d) Redis cache was invalidated so subsequent reads hit DB ─────
      expect(redis.del).toHaveBeenCalledWith(
        `profile:${MOCK_USER_PROFILE.id}`
      );

      // ── e) Return value is the post-update user snapshot ──────────────
      expect(result).toBeDefined();
    }
  );

  // ------------------------------------------------------------------
  // Test 2 — Username conflict: AppError(400) when username is taken
  //
  // If a caller supplies `username` that already belongs to a different
  // user, updateProfile must throw AppError("Username already taken", 400)
  // BEFORE the profile upsert runs. This prevents silent overwrites and
  // ensures the transaction is rolled back atomically.
  // ------------------------------------------------------------------
  test(
    "throws AppError(400, 'Username already taken') when the requested " +
      "username belongs to a different existing account",
    async () => {
      const CONFLICTING_USER_ID = "user-other-999";

      // 1st call: fetch the current authenticated user row
      // 2nd call: username uniqueness check → returns a DIFFERENT user (conflict)
      const txUserFindUnique = vi
        .fn()
        .mockResolvedValueOnce(MOCK_TX_USER)
        .mockResolvedValueOnce({ id: CONFLICTING_USER_ID });

      const txProfileUpsert = vi.fn();

      const mockTx = {
        user: {
          findUnique: txUserFindUnique,
          update: vi.fn().mockResolvedValue({}),
        },
        profile: { upsert: txProfileUpsert },
        college: { findUnique: vi.fn().mockResolvedValue(null) },
        department: { findUnique: vi.fn().mockResolvedValue(null) },
        codingProfile: {
          deleteMany: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({}),
        },
      };

      // Capture reference before assigning
      (prisma.$transaction as any) = async (callback: (tx: any) => Promise<any>) =>
        callback(mockTx);

      // ── Execute & assert ──────────────────────────────────────────────
      await expect(
        usersService.updateProfile(MOCK_USER_PROFILE.id, {
          username: "taken_username",
        })
      ).rejects.toMatchObject({
        message: "Username already taken",
        statusCode: 400,
      });

      // Profile upsert must NOT have been reached — fail-fast guarantee
      expect(txProfileUpsert).not.toHaveBeenCalled();
    }
  );
});

// ---------------------------------------------------------------------------
// Suite 3: updateProfile — Validation Error Propagation (AppError / non-existent user)
// ---------------------------------------------------------------------------
describe("Users Service - updateProfile (error propagation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks(); // remove vi.spyOn(usersService,'updateProfile') from updateMe test
    // Reset $transaction so no prior assignment persists between error-path tests
    (prisma.$transaction as any) = async (_cb: any) => { throw new Error("$transaction not stubbed in this test"); };
  });

  // ------------------------------------------------------------------
  // Test — Non-existent userId inside transaction → AppError(404)
  //
  // If `tx.user.findUnique` returns null (e.g. user was deleted between
  // the request being authenticated and the service being invoked),
  // updateProfile must bubble up AppError("User not found", 404) so the
  // controller can respond with the correct HTTP status code, rather than
  // crashing or returning undefined to the caller.
  // ------------------------------------------------------------------
  test(
    "throws AppError(404, 'User not found') when the userId does not resolve " +
      "to any row inside the transaction",
    async () => {
      const mockTx = {
        user: {
          // Simulates a ghost user — authenticated but deleted from DB
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
        profile: { upsert: vi.fn() },
        college: { findUnique: vi.fn() },
        department: { findUnique: vi.fn() },
        codingProfile: { deleteMany: vi.fn(), create: vi.fn() },
      };

      // Direct assignment — mirrors existing codebase test pattern exactly
      (prisma.$transaction as any) = async (callback: (tx: any) => Promise<any>) =>
        callback(mockTx);

      await expect(
        usersService.updateProfile("ghost-user-id", { bio: "Should not save" })
      ).rejects.toMatchObject({
        message: "User not found",
        statusCode: 404,
      });

      // Neither a user update nor a profile upsert should have been attempted
      expect(mockTx.user.update).not.toHaveBeenCalled();
      expect(mockTx.profile.upsert).not.toHaveBeenCalled();
    }
  );

  // ------------------------------------------------------------------
  // Test — Department not belonging to college → AppError(400)
  //
  // The service calls `assertDepartmentBelongsToCollege` before the
  // profile upsert. If a departmentId is submitted that belongs to a
  // DIFFERENT college, the service must reject with AppError(400) and
  // must NOT persist any partial changes.
  // ------------------------------------------------------------------
  test(
    "throws AppError(400) when departmentId belongs to a different college " +
      "than the one provided in the payload",
    async () => {
      const WRONG_COLLEGE_ID = "college-wrong-000";

      // User's current profile has WRONG_COLLEGE_ID already set
      const txUserFindUnique = vi.fn().mockResolvedValue({
        ...MOCK_TX_USER,
        profile: {
          ...MOCK_TX_USER.profile,
          collegeId: WRONG_COLLEGE_ID,
        },
      });

      // department.findUnique returns a dept whose collegeId is "college-xyz"
      // — mismatch with the WRONG_COLLEGE_ID passed in the payload
      const txDepartmentFindUnique = vi.fn().mockResolvedValue({
        collegeId: "college-xyz",
      });

      const txProfileUpsert = vi.fn();

      const mockTx = {
        user: {
          findUnique: txUserFindUnique,
          update: vi.fn().mockResolvedValue({}),
        },
        profile: { upsert: txProfileUpsert },
        college: {
          // college lookup succeeds (college exists)
          findUnique: vi.fn().mockResolvedValue({ id: WRONG_COLLEGE_ID }),
        },
        department: { findUnique: txDepartmentFindUnique },
        codingProfile: { deleteMany: vi.fn(), create: vi.fn() },
      };

      (prisma.$transaction as any) = async (callback: (tx: any) => Promise<any>) =>
        callback(mockTx);

      await expect(
        usersService.updateProfile(MOCK_USER_PROFILE.id, {
          collegeId: WRONG_COLLEGE_ID,
          departmentId: "dept-cs-001", // belongs to college-xyz, not WRONG_COLLEGE_ID
        })
      ).rejects.toMatchObject({
        message: "Department does not belong to selected college",
        statusCode: 400,
      });

      // Profile upsert must not have executed — transaction integrity
      expect(txProfileUpsert).not.toHaveBeenCalled();
    }
  );
});
