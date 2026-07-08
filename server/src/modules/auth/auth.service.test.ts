import { describe, test, expect, vi, beforeEach } from "vitest";
import { generateToken } from "shared/utils/jwt";
import {
  isTokenRevoked,
  logoutUser,
  registerUser,
  triggerEmailVerificationOTP,
  verifyOtpToken,
  initiateForgotPasswordFlow,
  executePasswordReset,
} from "./auth.service";
import prisma from "shared/database/prisma";
import redis from "shared/database/redis";

vi.mock("shared/database/redis", () => {
  return {
    default: {
      setex: vi.fn().mockResolvedValue("OK"),
      get: vi.fn().mockResolvedValue(null),
      del: vi.fn().mockResolvedValue(1),
    },
  };
});

describe("Auth Service Token Management", () => {
  test("should handle token lifecycle and revocation on logout", async () => {
    const userId = "test-user-id";
    const token = generateToken(userId);

    // Before logout: revocation key does not exist in Redis
    vi.mocked(redis.get).mockResolvedValueOnce(null);
    expect(await isTokenRevoked(token)).toBe(false);

    const logoutResult = await logoutUser(token);
    expect(logoutResult.loggedOut).toBe(true);
    // logoutUser should have written the revoked hash to Redis
    expect(redis.setex).toHaveBeenCalled();

    // After logout: simulate Redis returning the stored "1" sentinel
    vi.mocked(redis.get).mockResolvedValueOnce("1");
    expect(await isTokenRevoked(token)).toBe(true);
  });

  test("should set primaryRole to STUDENT on registration", async () => {
    const mockCreatedUser = {
      id: "mock-student-id",
      email: "mock-student@example.com",
      username: "mock-student",
      primaryRole: "STUDENT",
      status: "ACTIVE",
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.user.findFirst as any) = async () => null;
    (prisma.role.findUnique as any) = async () => ({ id: "role-student-id" });
    (prisma.user.create as any) = async (args: any) => {
      expect(args.data.primaryRole).toBe("STUDENT");
      return {
        ...mockCreatedUser,
        primaryRole: args.data.primaryRole,
      };
    };

    const result = await registerUser({
      email: "mock-student@example.com",
      username: "mock-student",
      password: "securepassword123",
      fullName: "Test Student",
      role: "STUDENT",
    });

    expect(result.user).toBeDefined();
    expect(result.user.primaryRole).toBe("STUDENT");
  });
});

describe("Auth Service OTP Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("triggerEmailVerificationOTP should save random code in Redis", async () => {
    const email = "user@example.com";
    const mockUser = { id: "user-id-123", email };

    (prisma.user.findUnique as any) = async () => mockUser;

    const result = await triggerEmailVerificationOTP(email);

    expect(result.success).toBe(true);
    expect(redis.setex).toHaveBeenCalled();
    const calls = vi.mocked(redis.setex).mock.calls;
    // Use the last call — ensures we target the OTP setex specifically
    // even if other setex calls have occurred in a prior test in this file.
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe(`otp:email:${email}`);
    expect(lastCall[1]).toBe(600); // 10 minutes TTL
    expect(lastCall[2]).toHaveLength(6); // 6-digit OTP
  });

  test("verifyOtpToken should update user's email verified status and delete OTP from Redis", async () => {
    const email = "user@example.com";
    const mockUser = { id: "user-id-123", email };
    const mockOtp = "999888";

    (prisma.user.findUnique as any) = async () => mockUser;
    (prisma.user.update as any) = vi.fn().mockResolvedValue(mockUser);
    vi.mocked(redis.get).mockResolvedValueOnce(mockOtp);

    const result = await verifyOtpToken(email, mockOtp);

    expect(result.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email },
      data: { isEmailVerified: true },
    });
    expect(redis.del).toHaveBeenCalledWith(`otp:email:${email}`);
  });

  test("verifyOtpToken should throw error on invalid/expired OTP", async () => {
    const email = "user@example.com";
    const mockUser = { id: "user-id-123", email };
    const mockOtp = "999888";

    (prisma.user.findUnique as any) = async () => mockUser;
    vi.mocked(redis.get).mockResolvedValueOnce("different_otp");

    await expect(verifyOtpToken(email, mockOtp)).rejects.toThrow("Invalid or expired OTP");
  });

  test("verifyOtpToken should bypass Redis and verify in non-production environments with 123456", async () => {
    const email = "user@example.com";
    const mockUser = { id: "user-id-123", email };
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    (prisma.user.findUnique as any) = async () => mockUser;
    (prisma.user.update as any) = vi.fn().mockResolvedValue(mockUser);

    const result = await verifyOtpToken(email, "123456");

    expect(result.success).toBe(true);
    expect(result.message).toContain("sandbox bypass");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email },
      data: { isEmailVerified: true },
    });

    process.env.NODE_ENV = originalNodeEnv;
  });
});

describe("Auth Service Forgot Password Flow", () => {
  test("initiateForgotPasswordFlow should generate and store a secure token in Redis with 900s TTL if user exists", async () => {
    const email = "user@example.com";
    const mockUser = { id: "user-id-123", email };

    (prisma.user.findUnique as any) = async () => mockUser;
    vi.mocked(redis.setex).mockClear();

    const result = await initiateForgotPasswordFlow(email);

    expect(result.success).toBe(true);
    expect(redis.setex).toHaveBeenCalled();
    const calls = vi.mocked(redis.setex).mock.calls;
    expect(calls[0][0]).toBe(`password:reset:${email}`);
    expect(calls[0][1]).toBe(900); // 15 minutes TTL
    expect(calls[0][2]).toHaveLength(32); // Hexadecimal string
  });

  test("initiateForgotPasswordFlow should NOT store token in Redis if user does not exist but still return success (user enumeration defense)", async () => {
    const email = "nonexistent@example.com";

    (prisma.user.findUnique as any) = async () => null;
    vi.mocked(redis.setex).mockClear();

    const result = await initiateForgotPasswordFlow(email);

    expect(result.success).toBe(true);
    expect(redis.setex).not.toHaveBeenCalled();
  });

  test("executePasswordReset should verify token from Redis, hash password, update DB, and delete token", async () => {
    const email = "user@example.com";
    const mockUser = { id: "user-id-123", email, password: "old_password" };
    const mockToken = "abcdefabcdefabcdefabcdefabcdef12";
    const newPassword = "new_secure_password_123";

    (prisma.user.findUnique as any) = async () => mockUser;
    (prisma.user.update as any) = vi.fn().mockResolvedValue(mockUser);
    vi.mocked(redis.get).mockResolvedValueOnce(mockToken);
    vi.mocked(redis.del).mockClear();

    const result = await executePasswordReset(email, mockToken, newPassword);

    expect(result.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalled();
    const updateCalls = vi.mocked(prisma.user.update).mock.calls;
    expect(updateCalls[0][0].where).toEqual({ email });
    expect(updateCalls[0][0].data.password).not.toBe(newPassword); // Should be hashed
    expect(redis.del).toHaveBeenCalledWith(`password:reset:${email}`);
  });

  test("executePasswordReset should throw 400 AppError on invalid or expired token", async () => {
    const email = "user@example.com";
    const mockUser = { id: "user-id-123", email };
    const token = "invalid_token";

    (prisma.user.findUnique as any) = async () => mockUser;
    vi.mocked(redis.get).mockResolvedValueOnce("stored_different_token");

    await expect(executePasswordReset(email, token, "newpassword123")).rejects.toThrow("Invalid or expired reset token");
  });

  test("executePasswordReset should bypass Redis in non-production environments with token 123456", async () => {
    const email = "user@example.com";
    const mockUser = { id: "user-id-123", email, password: "old_password" };
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    (prisma.user.findUnique as any) = async () => mockUser;
    (prisma.user.update as any) = vi.fn().mockResolvedValue(mockUser);

    const result = await executePasswordReset(email, "123456", "newpassword123");

    expect(result.success).toBe(true);
    expect(result.message).toContain("sandbox bypass");
    expect(prisma.user.update).toHaveBeenCalled();
    const updateCalls = vi.mocked(prisma.user.update).mock.calls;
    expect(updateCalls[0][0].where).toEqual({ email });
    expect(updateCalls[0][0].data.password).toBeDefined();

    process.env.NODE_ENV = originalNodeEnv;
  });
});



