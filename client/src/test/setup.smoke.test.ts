/**
 * @file setup.smoke.test.ts
 * @description Infrastructure smoke test — verifies that the Vitest + jsdom +
 * @testing-library/jest-dom setup is correctly wired before real component
 * tests are written.
 *
 * This file can be safely deleted once the first real component test is added.
 */
import { describe, test, expect } from "vitest";

describe("Client Test Infrastructure — Smoke Tests", () => {
  // ── Test 1: Vitest globals are available ────────────────────────────────
  test("vitest globals (describe, test, expect) are available without imports when globals:true", () => {
    expect(true).toBe(true);
  });

  // ── Test 2: jsdom environment is active ─────────────────────────────────
  test("jsdom environment is active — window and document are defined", () => {
    expect(typeof window).toBe("object");
    expect(typeof document).toBe("object");
    expect(document.createElement("div")).toBeTruthy();
  });

  // ── Test 3: @testing-library/jest-dom matchers are loaded ───────────────
  test("@testing-library/jest-dom custom matchers are available (toBeInTheDocument)", () => {
    const div = document.createElement("div");
    div.textContent = "Hello Engineering Platform";
    document.body.appendChild(div);

    // toBeInTheDocument is a jest-dom custom matcher — if this passes,
    // the setup.ts import is correctly wired
    expect(div).toBeInTheDocument();
    expect(div).toHaveTextContent("Hello Engineering Platform");

    // Cleanup
    document.body.removeChild(div);
  });

  // ── Test 4: DOM cleanup between tests works ──────────────────────────────
  test("document.body starts clean in each test (no bleed-through from prior test)", () => {
    // The div from Test 3 was removed — body should be empty again
    expect(document.body.children).toHaveLength(0);
  });
});
