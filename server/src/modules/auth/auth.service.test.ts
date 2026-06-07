import { describe, test, expect } from "vitest";
import { generateToken } from "shared/utils/jwt";
import { isTokenRevoked, logoutUser, registerUser } from "./auth.service";
import prisma from "shared/database/prisma";

describe("Auth Service Token Management", () => {
  test("should handle token lifecycle and revocation on logout", async () => {
    const userId = "test-user-id";
    const token = generateToken(userId);

    expect(isTokenRevoked(token)).toBe(false);

    const logoutResult = await logoutUser(token);
    expect(logoutResult.loggedOut).toBe(true);

    expect(isTokenRevoked(token)).toBe(true);
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

