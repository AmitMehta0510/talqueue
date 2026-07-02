import { test, expect } from "@playwright/test";

// Artifacts directory for saving screenshots
const ARTIFACTS_DIR = "C:/Users/theme/.gemini/antigravity-ide/brain/610b361f-ac33-44b2-b90a-6a3c676f1f1f";

test.describe("Phase 4: E2E Browser Testing Layer", () => {
  // Before each test, setup mock API endpoints that are common
  test.beforeEach(async ({ page }) => {
    // Mock health check
    await page.route("**/api/v1/health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Healthy", data: { routes: {} } }),
      });
    });

    // Mock other feeds/leaderboard/etc to return empty lists/default data
    await page.route("**/api/v1/reputation/leaderboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.route("**/api/v1/reputation/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { reputationScore: 120, engineeringScore: 85, badges: [] },
        }),
      });
    });

    await page.route("**/api/v1/projects**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.route("**/api/v1/jobs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.route("**/api/v1/hackathons**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.route("**/api/v1/posts/feed**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.route("**/api/v1/feed**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });
  });

  test("Journey 1: Anonymous Route Redirect Guard Check", async ({ page }) => {
    // Mock /auth/me to return unauthorized (anonymous)
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Unauthorized", data: null }),
      });
    });

    // Clear cookies/localStorage to ensure clean anonymous state
    await page.context().clearCookies();
    
    // Visit protected route /profile
    await page.goto("/profile");

    // Wait for the URL to change to /auth
    await page.waitForURL("**/auth");
    
    // Assert redirect is complete
    expect(page.url()).toContain("/auth");
  });

  test("Journey 2: Authentic Forms Interactions (Error Path & Toast Screenshot)", async ({ page }) => {
    // Mock /auth/me as anonymous
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Unauthorized", data: null }),
      });
    });

    // Mock login failure response
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Invalid email or password", data: null }),
      });
    });

    // Clear cookies/localStorage
    await page.context().clearCookies();

    // Visit /auth page
    await page.goto("/auth");

    // Locate inputs and fill realistic parameters
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    await emailInput.fill("nonexistent@example.com");
    await passwordInput.fill("wrongpassword");

    // Locate and click submit button
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Check for inline error message element inside AuthPage
    const errorBlock = page.locator("div").filter({ hasText: "Invalid email or password" }).first();
    await expect(errorBlock).toBeVisible();

    // Capture screenshot of the error card to the artifacts directory
    await errorBlock.screenshot({ path: `${ARTIFACTS_DIR}/auth_error_alert.png` });
  });

  test("Journey 3: Post-Login Feed Landing Guard (Success path)", async ({ page }) => {
    // Mock login success response
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Welcome back!",
          data: {
            token: "mocked-jwt-token-12345",
            user: {
              id: "user-123",
              username: "testuser",
              email: "test@example.com",
              primaryRole: "STUDENT",
              profile: {
                fullName: "Test User E2E",
                headline: "E2E Testing Specialist",
                avatarUrl: null
              }
            }
          }
        }),
      });
    });

    // Once token is saved, auth context will fetch /auth/me. Mock successful session:
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Authenticated",
          data: {
            id: "user-123",
            username: "testuser",
            email: "test@example.com",
            primaryRole: "STUDENT",
            profile: {
              fullName: "Test User E2E",
              headline: "E2E Testing Specialist",
              avatarUrl: null
            }
          }
        }),
      });
    });

    // Clear cookies/localStorage
    await page.context().clearCookies();

    // Go to auth page
    await page.goto("/auth");

    // Locate form inputs and fill
    await page.locator('input[type="email"]').fill("test@example.com");
    await page.locator('input[type="password"]').fill("correctpassword");

    // Click submit
    await page.locator('button[type="submit"]').click();

    // Verify toast notification appears
    const toast = page.locator('[role="status"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Welcome, Engineer");

    // Capture snapshot/screenshot of the toast notification alert to the artifacts directory
    await toast.screenshot({ path: `${ARTIFACTS_DIR}/login_success_toast.png` });

    // Assert automatic redirect / routing transition to /feed
    await page.waitForURL("**/feed");
    expect(page.url()).toContain("/feed");

    // Verify profile panels render status in the feed sidebar
    const profileCard = page.locator('aside.lg\\:col-span-3').first();
    await expect(profileCard).toBeVisible();
    await expect(profileCard.locator('h2')).toContainText("Test User E2E");
    await expect(profileCard.locator("p").filter({ hasText: "@testuser" })).toBeVisible();
    await expect(profileCard.locator("p").filter({ hasText: "E2E Testing Specialist" })).toBeVisible();
  });
});
