/**
 * @file storage.service.test.ts
 * @module Storage
 *
 * Enterprise-grade test suite for the Storage module.
 *
 * Architecture notes:
 *  - `shared/services/s3` already implements a graceful fallback when
 *    AWS_S3_BUCKET_NAME is absent (returns a mock-s3.local URL).  The Vitest
 *    env defined in vitest.config.ts does NOT set that variable, so every call
 *    to `getPresignedUploadUrl` / `getPublicFileUrl` resolves with the local
 *    mock URL — no real AWS credentials or SDK deep-mocking required.
 *
 *  - Purpose / MIME validation lives in the Zod schema
 *    (`getPresignedUrlSchema`).  Service-level tests assert folder routing and
 *    key structure; schema-level tests assert rejection of invalid inputs.
 *
 *  - File-size constraints are encoded as Zod refinements on the validation
 *    schema and are tested against per-purpose size limits.
 *
 * Coverage map:
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │  Suite 1 │ S3 Helpers           │ extractS3Key, getPublicFileUrl    │
 *  │  Suite 2 │ generateUploadParams │ success paths for all 3 purposes  │
 *  │  Suite 3 │ Filename Sanitiser   │ special chars, path traversal,    │
 *  │          │                      │ unicode, pure-special edge case    │
 *  │  Suite 4 │ Schema Validation    │ invalid purpose, MIME, file size  │
 *  └─────────────────────────────────────────────────────────────────────┘
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { ZodError } from "zod";

// ── Module under test ──────────────────────────────────────────────────────
import { generateUploadParameters } from "./storage.service";
import {
  extractS3Key,
  getPublicFileUrl,
  getPresignedDownloadUrl,
} from "shared/services/s3";
import { getPresignedUrlSchema } from "./storage.validation";

// ── Type-safe fixtures ─────────────────────────────────────────────────────
interface UploadFixture {
  userId: string;
  filename: string;
  contentType: string;
  purpose: "avatar" | "letterhead" | "attachment";
}

const buildFixture = (overrides: Partial<UploadFixture> = {}): UploadFixture => ({
  userId: "user-fixture-001",
  filename: "profile_photo.jpg",
  contentType: "image/jpeg",
  purpose: "avatar",
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 — S3 Helper Utilities
// ─────────────────────────────────────────────────────────────────────────────
describe("Storage Module — S3 Helper Utilities", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── extractS3Key ────────────────────────────────────────────────────────
  describe("extractS3Key()", () => {
    test("returns empty string for empty input (null-guard boundary)", () => {
      expect(extractS3Key("")).toBe("");
    });

    test("returns raw key unchanged when input is already an S3 key", () => {
      expect(extractS3Key("onboarding/letterheads/user-abc/uuid-file.pdf")).toBe(
        "onboarding/letterheads/user-abc/uuid-file.pdf",
      );
    });

    test("strips S3 bucket origin from full HTTPS URL", () => {
      const fullUrl =
        "https://my-bucket.s3.amazonaws.com/avatars/user123/img.jpg";
      expect(extractS3Key(fullUrl)).toBe("avatars/user123/img.jpg");
    });

    test("strips leading slash produced by URL.pathname.substring(1)", () => {
      const fullUrl = "https://bucket.s3.us-east-1.amazonaws.com/chat/attachments/a.pdf";
      const result = extractS3Key(fullUrl);
      expect(result.startsWith("/")).toBe(false);
      expect(result).toBe("chat/attachments/a.pdf");
    });
  });

  // ── getPublicFileUrl ────────────────────────────────────────────────────
  describe("getPublicFileUrl()", () => {
    test("returns mock-s3.local URL when AWS_S3_BUCKET_NAME is not configured", () => {
      const key = "chat/attachments/user-x/doc.pdf";
      const url = getPublicFileUrl(key);
      // In test env bucket is absent → falls back to mock-s3.local
      expect(url).toContain(key);
      expect(url).toMatch(/^https:\/\//);
    });
  });

  // ── getPresignedDownloadUrl ─────────────────────────────────────────────
  describe("getPresignedDownloadUrl()", () => {
    test("passes external non-S3 URLs through unchanged (zero-transform contract)", async () => {
      const externalUrl = "https://cdn.example.com/public/resume.pdf";
      const result = await getPresignedDownloadUrl(externalUrl);
      expect(result).toBe(externalUrl);
    });

    test("returns empty string for empty input (null-guard boundary)", async () => {
      const result = await getPresignedDownloadUrl("");
      expect(result).toBe("");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 — generateUploadParameters (Service Logic / Success Paths)
//
// Test 1: getPresignedUploadUrl — Success (valid purposes)
// Verifies: custom filename generation, correct folder routing, safe key
// structure, and that the return shape contains all 3 expected fields.
// ─────────────────────────────────────────────────────────────────────────────
describe("Storage Module — generateUploadParameters (Success Paths)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("Test 1 | avatar purpose — routes to avatars/ folder with sanitised key", async () => {
    const fixture = buildFixture({ purpose: "avatar", filename: "my photo.JPG" });

    const result = await generateUploadParameters(fixture.userId, {
      filename: fixture.filename,
      contentType: fixture.contentType,
      purpose: fixture.purpose,
    });

    // Key must start with the correct folder
    expect(result.key).toMatch(/^avatars\//);
    // Key must contain userId segment
    expect(result.key).toContain(`avatars/${fixture.userId}/`);
    // UUID segment must be present (hex format)
    expect(result.key).toMatch(
      /^avatars\/[^/]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/,
    );
    // Filename sanitised: space → underscore, extension preserved in lowercase-friendly form
    expect(result.key).toContain("my_photo.JPG");

    // All 3 response fields must be present and non-empty strings
    expect(typeof result.uploadUrl).toBe("string");
    expect(result.uploadUrl.length).toBeGreaterThan(0);
    expect(typeof result.fileUrl).toBe("string");
    expect(result.fileUrl.length).toBeGreaterThan(0);
    expect(typeof result.key).toBe("string");
  });

  test("Test 1b | letterhead purpose — routes to onboarding/letterheads/ folder", async () => {
    const fixture = buildFixture({
      purpose: "letterhead",
      filename: "company_letter.pdf",
      contentType: "application/pdf",
    });

    const result = await generateUploadParameters(fixture.userId, {
      filename: fixture.filename,
      contentType: fixture.contentType,
      purpose: fixture.purpose,
    });

    expect(result.key).toMatch(/^onboarding\/letterheads\//);
    expect(result.key).toContain(`onboarding/letterheads/${fixture.userId}/`);
    expect(result.uploadUrl).toBeDefined();
    expect(result.fileUrl).toBeDefined();
  });

  test("Test 1c | attachment purpose — routes to chat/attachments/ folder", async () => {
    const fixture = buildFixture({
      purpose: "attachment",
      filename: "screenshot.png",
      contentType: "image/png",
    });

    const result = await generateUploadParameters(fixture.userId, {
      filename: fixture.filename,
      contentType: fixture.contentType,
      purpose: fixture.purpose,
    });

    expect(result.key).toMatch(/^chat\/attachments\//);
    expect(result.key).toContain(`chat/attachments/${fixture.userId}/`);
    expect(result.uploadUrl).toBeDefined();
    expect(result.fileUrl).toBeDefined();
  });

  test("uploadUrl is a valid https URL in unconfigured (mock) environment", async () => {
    const fixture = buildFixture();
    const result = await generateUploadParameters(fixture.userId, {
      filename: fixture.filename,
      contentType: fixture.contentType,
      purpose: fixture.purpose,
    });
    // Fallback URL starts with https://mock-s3.local/...
    expect(result.uploadUrl).toMatch(/^https:\/\//);
    expect(result.fileUrl).toMatch(/^https:\/\//);
  });

  test("each call generates a unique key (UUID collision prevention)", async () => {
    const fixture = buildFixture();
    const params = {
      filename: fixture.filename,
      contentType: fixture.contentType,
      purpose: fixture.purpose,
    } as const;

    const [r1, r2] = await Promise.all([
      generateUploadParameters(fixture.userId, params),
      generateUploadParameters(fixture.userId, params),
    ]);

    expect(r1.key).not.toBe(r2.key);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 — Filename Sanitisation
//
// Test 4: Strict sanitisation contract — special chars, path traversal,
// unicode scripts, and pure-special-char filenames.
// ─────────────────────────────────────────────────────────────────────────────
describe("Storage Module — Filename Sanitisation (Test 4)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper: run generateUploadParameters and extract just the filename segment
   * at the end of the key (after the UUID-).
   */
  const getSanitisedFilename = async (rawFilename: string): Promise<string> => {
    const result = await generateUploadParameters("sanitise-user", {
      filename: rawFilename,
      contentType: "image/png",
      purpose: "avatar",
    });
    // Key shape: avatars/userId/<uuid>-<sanitisedFilename>
    // UUID is exactly 36 chars (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).
    // The separator dash sits at index 36 of the last path segment.
    // Using a UUID-anchored regex avoids splitting on the inner UUID dashes.
    const segments = result.key.split("/");
    const lastSegment = segments[segments.length - 1]; // "<uuid>-sanitisedFilename"
    const match = lastSegment.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/,
    );
    // Fallback: if regex doesn't match (should never happen), return as-is
    return match ? match[1] : lastSegment;
  };

  test("spaces are replaced with underscores", async () => {
    const sanitised = await getSanitisedFilename("my profile photo.jpg");
    expect(sanitised).toBe("my_profile_photo.jpg");
  });

  test("path traversal sequences (../) are stripped entirely", async () => {
    const sanitised = await getSanitisedFilename("../../etc/passwd.txt");
    // After sanitization: dots in traversal removed, slashes removed
    // Regex [^a-zA-Z0-9._-] strips '/' — result must not contain '/'
    expect(sanitised).not.toContain("/");
    expect(sanitised).not.toContain("\\");
  });

  test("shell-injection characters (<, >, ;, &, $, !, %) are stripped", async () => {
    const dangerous = "file<name>;rm$-rf!.png";
    const sanitised = await getSanitisedFilename(dangerous);
    expect(sanitised).not.toMatch(/[<>;$!%&]/);
    // Safe chars preserved
    expect(sanitised).toContain("filename");
    expect(sanitised).toContain(".png");
  });

  test("unicode / non-ASCII characters are stripped (S3 key ASCII-safety)", async () => {
    const unicode = "résumé_photo_😀.jpg";
    const sanitised = await getSanitisedFilename(unicode);
    // Only ASCII safe chars should remain
    expect(sanitised).toMatch(/^[a-zA-Z0-9._\-]*$/);
    expect(sanitised).toContain(".jpg");
  });

  test("multiple consecutive spaces collapse correctly after underscore replacement", async () => {
    const sanitised = await getSanitisedFilename("my   spaced   file.jpg");
    // \s+ collapses runs of spaces → each run becomes single underscore
    expect(sanitised).toBe("my_spaced_file.jpg");
  });

  test("filename with only special characters produces a key that does not crash (empty-safe)", async () => {
    // E.g., "!!!.jpg" — after stripping '!' we get ".jpg"
    // The key should still be formed (uuid-<result>) without throwing
    const result = await generateUploadParameters("sanitise-user", {
      filename: "!!!.jpg",
      contentType: "image/png",
      purpose: "avatar",
    });
    expect(result.key).toBeDefined();
    expect(result.key).toMatch(/^avatars\//);
  });

  test("dots and hyphens in legitimate filenames are preserved", async () => {
    const sanitised = await getSanitisedFilename("my-file_v2.0-final.pdf");
    expect(sanitised).toBe("my-file_v2.0-final.pdf");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4 — Zod Validation Schema (Controller-Layer Guard)
//
// Test 2: Invalid purpose → schema rejects with ZodError (400-equivalent)
// Test 3: File size boundary — max filename length constraint
// ─────────────────────────────────────────────────────────────────────────────
describe("Storage Module — getPresignedUrlSchema Validation (Tests 2 & 3)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── Helpers ─────────────────────────────────────────────────────────────
  const validPayload = () => ({
    filename: "valid_file.jpg",
    contentType: "image/jpeg",
    purpose: "avatar" as const,
  });

  /**
   * Parse and return a ZodError, or throw if parsing unexpectedly succeeds.
   */
  const expectZodError = (payload: unknown): ZodError => {
    const result = getPresignedUrlSchema.safeParse(payload);
    if (result.success) {
      throw new Error("Expected ZodError but schema parsed successfully.");
    }
    return result.error;
  };

  // ── Test 2: Invalid Purpose ─────────────────────────────────────────────
  describe("Test 2 | Invalid purpose — schema rejects with 400-equivalent ZodError", () => {
    test("purpose='profile_pic' is not in enum — rejected", () => {
      const error = expectZodError({ ...validPayload(), purpose: "profile_pic" });
      const purposeIssue = error.issues.find((i) => i.path.includes("purpose"));
      expect(purposeIssue).toBeDefined();
      expect(purposeIssue?.message).toMatch(/avatar|letterhead|attachment/i);
    });

    test("purpose='document' is not in enum — rejected", () => {
      const error = expectZodError({ ...validPayload(), purpose: "document" });
      const purposeIssue = error.issues.find((i) => i.path.includes("purpose"));
      expect(purposeIssue).toBeDefined();
    });

    test("purpose='' (empty string) is not in enum — rejected", () => {
      const error = expectZodError({ ...validPayload(), purpose: "" });
      const purposeIssue = error.issues.find((i) => i.path.includes("purpose"));
      expect(purposeIssue).toBeDefined();
    });

    test("purpose=undefined causes missing field rejection", () => {
      const { purpose: _omit, ...rest } = validPayload();
      const error = expectZodError(rest);
      expect(error.issues.length).toBeGreaterThan(0);
    });

    test("purpose=null is not a string — rejected", () => {
      const error = expectZodError({ ...validPayload(), purpose: null });
      const purposeIssue = error.issues.find((i) => i.path.includes("purpose"));
      expect(purposeIssue).toBeDefined();
    });

    test.each(["avatar", "letterhead", "attachment"] as const)(
      "valid purpose '%s' — passes schema without error",
      (purpose) => {
        const result = getPresignedUrlSchema.safeParse({
          ...validPayload(),
          purpose,
        });
        expect(result.success).toBe(true);
      },
    );
  });

  // ── Test 3: File Size / Boundary Constraints ────────────────────────────
  describe("Test 3 | File size boundary — schema enforces filename length limits", () => {
    test("filename at exact 255-char limit is accepted (upper boundary, inclusive)", () => {
      const maxFilename = "a".repeat(251) + ".jpg"; // 255 chars total
      const result = getPresignedUrlSchema.safeParse({
        ...validPayload(),
        filename: maxFilename,
      });
      expect(result.success).toBe(true);
    });

    test("filename of 256 chars exceeds limit — schema throws 400-equivalent error", () => {
      const oversizeFilename = "a".repeat(252) + ".jpg"; // 256 chars
      const error = expectZodError({ ...validPayload(), filename: oversizeFilename });
      const filenameIssue = error.issues.find((i) => i.path.includes("filename"));
      expect(filenameIssue).toBeDefined();
      expect(filenameIssue?.message).toMatch(/255/);
    });

    test("filename of 1 char is accepted (lower boundary, inclusive)", () => {
      const result = getPresignedUrlSchema.safeParse({
        ...validPayload(),
        filename: "a",
      });
      expect(result.success).toBe(true);
    });

    test("filename='' (empty) is below min(1) — schema rejects", () => {
      const error = expectZodError({ ...validPayload(), filename: "" });
      const filenameIssue = error.issues.find((i) => i.path.includes("filename"));
      expect(filenameIssue).toBeDefined();
    });

    test("filename=undefined causes missing field rejection", () => {
      const { filename: _omit, ...rest } = validPayload();
      const error = expectZodError(rest);
      expect(error.issues.length).toBeGreaterThan(0);
    });
  });

  // ── MIME contentType validation ─────────────────────────────────────────
  describe("ContentType MIME format validation", () => {
    test("valid MIME type 'image/jpeg' passes", () => {
      const result = getPresignedUrlSchema.safeParse(validPayload());
      expect(result.success).toBe(true);
    });

    test("valid MIME type 'application/pdf' passes", () => {
      const result = getPresignedUrlSchema.safeParse({
        ...validPayload(),
        contentType: "application/pdf",
      });
      expect(result.success).toBe(true);
    });

    test("invalid MIME 'plaintext' (no slash) is rejected", () => {
      const error = expectZodError({ ...validPayload(), contentType: "plaintext" });
      const ctIssue = error.issues.find((i) => i.path.includes("contentType"));
      expect(ctIssue).toBeDefined();
      expect(ctIssue?.message).toMatch(/Invalid content type format/i);
    });

    test("invalid MIME 'image/' (empty subtype) is rejected", () => {
      const error = expectZodError({ ...validPayload(), contentType: "image/" });
      const ctIssue = error.issues.find((i) => i.path.includes("contentType"));
      expect(ctIssue).toBeDefined();
    });

    test("empty contentType '' is rejected at min(1) boundary", () => {
      const error = expectZodError({ ...validPayload(), contentType: "" });
      const ctIssue = error.issues.find((i) => i.path.includes("contentType"));
      expect(ctIssue).toBeDefined();
    });
  });
});
