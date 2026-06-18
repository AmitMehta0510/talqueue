import { describe, test, expect, vi, beforeEach } from "vitest";
import redis from "shared/database/redis";
import prisma from "shared/database/prisma";
import * as usersService from "./users.service";
import { verifyCollegeEmail, verifyWorkEmail, addExperience, addEducation } from "./users.service";

vi.mock("shared/database/redis", () => {
  const store = new Map<string, string>();
  return {
    default: {
      setex: vi.fn().mockImplementation(async (key, ttl, value) => {
        store.set(key, value);
      }),
      get: vi.fn().mockImplementation(async (key) => {
        return store.get(key) || null;
      }),
      del: vi.fn().mockImplementation(async (key) => {
        store.delete(key);
      }),
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
