import { describe, test, expect } from "vitest";
import { generateToken } from "shared/utils/jwt";
import { isTokenRevoked, logoutUser } from "./auth.service";

describe("Auth Service Token Management", () => {
  test("should handle token lifecycle and revocation on logout", async () => {
    const userId = "test-user-id";
    const token = generateToken(userId);

    expect(isTokenRevoked(token)).toBe(false);

    const logoutResult = await logoutUser(token);
    expect(logoutResult.loggedOut).toBe(true);

    expect(isTokenRevoked(token)).toBe(true);
  });
});

