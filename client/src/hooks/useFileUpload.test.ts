/**
 * @file useFileUpload.test.ts
 * @description Enterprise-grade test suite for the useFileUpload hook.
 *
 * Source hook: client/src/hooks/useFileUpload.ts
 *
 * Hook internals tested:
 *  - `upload(file, purpose)` — two-step pipeline:
 *      1. api.getPresignedUrl({ filename, contentType, purpose })
 *         → { key, uploadUrl, fileUrl }
 *      2. fetch(uploadUrl, { method: 'PUT', body: file })
 *  - State machine: uploading / error / returned UploadResult
 *
 * Mock architecture:
 *  - vi.mock("../lib/api")  — intercepts getPresignedUrl at module level
 *  - vi.spyOn(globalThis, "fetch") — intercepts S3 binary PUT at global level
 *  - vi.restoreAllMocks() + vi.clearAllMocks() in every beforeEach
 *  - renderHook() from @testing-library/react — React 19 compatible
 *  - No real network, no real AWS credentials, no real localStorage needed
 */

import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

// --------------------------------------------------------------------------
// Module-level mocks (hoisted before import resolution)
// --------------------------------------------------------------------------

vi.mock("../lib/api", () => ({
  api: {
    getPresignedUrl: vi.fn(),
  },
}));

// --------------------------------------------------------------------------
// Lazy imports (after mocks are registered)
// --------------------------------------------------------------------------

import { api } from "../lib/api";
import { useFileUpload, type UploadResult } from "./useFileUpload";

// --------------------------------------------------------------------------
// Typed mock alias
// --------------------------------------------------------------------------

const mockGetPresignedUrl = api.getPresignedUrl as MockedFunction<
  typeof api.getPresignedUrl
>;

// --------------------------------------------------------------------------
// Shared Fixtures
// --------------------------------------------------------------------------

/** Factory: creates a realistic File object with given name and MIME type */
function makeFile(
  name = "profile.png",
  type = "image/png",
  sizeBytes = 2048,
): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

/** Factory: standard presigned URL response payload from backend */
function makePresignedResponse(overrides?: Partial<{ key: string; uploadUrl: string; fileUrl: string }>) {
  return {
    success: true,
    message: "Presigned URL generated",
    data: {
      key: overrides?.key ?? "uploads/avatar/uuid-1234.png",
      uploadUrl:
        overrides?.uploadUrl ??
        "https://engineers-bucket.s3.amazonaws.com/uploads/avatar/uuid-1234.png?X-Amz-Signature=abc",
      fileUrl:
        overrides?.fileUrl ??
        "https://cdn.engineers.dev/uploads/avatar/uuid-1234.png",
    },
  } as const;
}

/** Creates a mock Response that simulates a successful S3 PUT (204 No Content) */
function makeS3OkResponse(): Response {
  return new Response(null, { status: 204, statusText: "No Content" });
}

/** Creates a mock Response that simulates an S3 failure */
function makeS3ErrorResponse(statusText = "Service Unavailable"): Response {
  return new Response(null, { status: 503, statusText });
}

// --------------------------------------------------------------------------
// Suite 1 — Absolute Upload Success Pathway
// --------------------------------------------------------------------------

describe("Suite 1 — Absolute Upload Success Pathway", () => {
  let fetchSpy: MockedFunction<typeof globalThis.fetch>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    // Spy on global fetch (S3 binary PUT)
    fetchSpy = vi.spyOn(globalThis, "fetch") as MockedFunction<typeof globalThis.fetch>;
  });

  // -------------------------------------------------------------------------
  // Test 1.1 — Full upload lifecycle: state machine transitions
  // -------------------------------------------------------------------------
  it("upload() — state flows: uploading=true → success → uploading=false, error=null, returns fileUrl", async () => {
    const presigned = makePresignedResponse();
    mockGetPresignedUrl.mockResolvedValueOnce(presigned);
    fetchSpy.mockResolvedValueOnce(makeS3OkResponse());

    const { result } = renderHook(() => useFileUpload());

    // Initial state: idle
    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBeNull();

    let uploadResult: UploadResult | undefined;

    await act(async () => {
      uploadResult = await result.current.upload(makeFile(), "avatar");
    });

    // Final state: uploading reset to false
    expect(result.current.uploading).toBe(false);

    // Error must remain null on success path
    expect(result.current.error).toBeNull();

    // Return value must contain the correct key and fileUrl from presigned response
    expect(uploadResult).toEqual({
      key: presigned.data.key,
      fileUrl: presigned.data.fileUrl,
    });
  });

  // -------------------------------------------------------------------------
  // Test 1.2 — api.getPresignedUrl called with correct payload (all purposes)
  // -------------------------------------------------------------------------
  it.each([
    { purpose: "avatar" as const, filename: "avatar.jpg", type: "image/jpeg" },
    { purpose: "letterhead" as const, filename: "header.png", type: "image/png" },
    { purpose: "attachment" as const, filename: "resume.pdf", type: "application/pdf" },
  ])(
    "upload() — purpose='$purpose': getPresignedUrl called with correct filename, contentType, purpose",
    async ({ purpose, filename, type }) => {
      mockGetPresignedUrl.mockResolvedValueOnce(makePresignedResponse());
      fetchSpy.mockResolvedValueOnce(makeS3OkResponse());

      const file = makeFile(filename, type);
      const { result } = renderHook(() => useFileUpload());

      await act(async () => {
        await result.current.upload(file, purpose);
      });

      // Verify the exact payload sent to backend
      expect(mockGetPresignedUrl).toHaveBeenCalledOnce();
      expect(mockGetPresignedUrl).toHaveBeenCalledWith({
        filename,
        contentType: type,
        purpose,
      });
    },
  );

  // -------------------------------------------------------------------------
  // Test 1.3 — S3 PUT request uses correct method, headers, and body
  // -------------------------------------------------------------------------
  it("upload() — S3 fetch PUT is called with uploadUrl, Content-Type header, and file as body", async () => {
    const presigned = makePresignedResponse();
    mockGetPresignedUrl.mockResolvedValueOnce(presigned);
    fetchSpy.mockResolvedValueOnce(makeS3OkResponse());

    const file = makeFile("photo.png", "image/png");
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.upload(file, "avatar");
    });

    // Verify fetch was called exactly once with correct args
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(presigned.data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/png" },
      body: file,
    });
  });

  // -------------------------------------------------------------------------
  // Test 1.4 — Returned UploadResult contains key and fileUrl, not uploadUrl
  // -------------------------------------------------------------------------
  it("upload() — returned object contains key and fileUrl (uploadUrl is NOT exposed)", async () => {
    const presigned = makePresignedResponse({
      key: "uploads/attachment/doc-xyz.pdf",
      uploadUrl: "https://s3.amazonaws.com/private-presigned",
      fileUrl: "https://cdn.engineers.dev/uploads/attachment/doc-xyz.pdf",
    });
    mockGetPresignedUrl.mockResolvedValueOnce(presigned);
    fetchSpy.mockResolvedValueOnce(makeS3OkResponse());

    const { result } = renderHook(() => useFileUpload());

    let uploadResult: UploadResult | undefined;
    await act(async () => {
      uploadResult = await result.current.upload(makeFile("doc.pdf", "application/pdf"), "attachment");
    });

    expect(uploadResult?.key).toBe("uploads/attachment/doc-xyz.pdf");
    expect(uploadResult?.fileUrl).toBe("https://cdn.engineers.dev/uploads/attachment/doc-xyz.pdf");

    // uploadUrl (presigned) must NOT leak into the return value
    expect(uploadResult).not.toHaveProperty("uploadUrl");
  });

  // -------------------------------------------------------------------------
  // Test 1.5 — uploading state is true during the async pipeline
  // -------------------------------------------------------------------------
  it("upload() — uploading=true is set synchronously at the start of the upload pipeline", async () => {
    // getPresignedUrl pauses so we can observe intermediate state
    let resolvePresigned!: (v: ReturnType<typeof makePresignedResponse>) => void;
    const presignedPromise = new Promise<ReturnType<typeof makePresignedResponse>>(
      (res) => { resolvePresigned = res; },
    );

    mockGetPresignedUrl.mockReturnValueOnce(presignedPromise);
    fetchSpy.mockResolvedValueOnce(makeS3OkResponse());

    const { result } = renderHook(() => useFileUpload());

    // Start upload without awaiting
    let uploadPromise: Promise<UploadResult>;
    act(() => {
      uploadPromise = result.current.upload(makeFile(), "avatar");
    });

    // uploading must be true while presigned promise is pending
    await waitFor(() => expect(result.current.uploading).toBe(true));

    // Now let the rest complete
    act(() => resolvePresigned(makePresignedResponse()));
    await act(async () => { await uploadPromise; });

    expect(result.current.uploading).toBe(false);
  });
});

// --------------------------------------------------------------------------
// Suite 2 — Exception Frameworks & Failure Rollbacks
// --------------------------------------------------------------------------

describe("Suite 2 — Exception Frameworks & Failure Rollbacks", () => {
  let fetchSpy: MockedFunction<typeof globalThis.fetch>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    fetchSpy = vi.spyOn(globalThis, "fetch") as MockedFunction<typeof globalThis.fetch>;
  });

  // -------------------------------------------------------------------------
  // Test 2.1 — getPresignedUrl API crash → error state set, not frozen
  // -------------------------------------------------------------------------
  it("upload() — getPresignedUrl failure: uploading=false, error message set, upload throws", async () => {
    const apiError = new Error("500: Internal Server Error");
    mockGetPresignedUrl.mockRejectedValueOnce(apiError);

    const { result } = renderHook(() => useFileUpload());

    // Capture thrown error; wrap in act so React state flushes after rejection
    let caughtError: unknown;
    await act(async () => {
      try {
        await result.current.upload(makeFile(), "avatar");
      } catch (e) {
        caughtError = e;
      }
    });

    // upload() must re-throw the original error
    expect(caughtError).toBe(apiError);

    // Hook must NOT be frozen in uploading state
    expect(result.current.uploading).toBe(false);

    // Error boundary state must capture the message
    expect(result.current.error).toBe("500: Internal Server Error");

    // S3 fetch must NEVER be called when presign fails
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Test 2.2 — getPresignedUrl network timeout → generic message
  // -------------------------------------------------------------------------
  it("upload() — getPresignedUrl network timeout: error captured, uploading reset", async () => {
    mockGetPresignedUrl.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      try {
        await result.current.upload(makeFile(), "letterhead");
      } catch {
        // expected — let state flush
      }
    });

    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBe("Failed to fetch");
  });

  // -------------------------------------------------------------------------
  // Test 2.3 — S3 binary upload HTTP 503 error → rollback, error message
  // -------------------------------------------------------------------------
  it("upload() — S3 503 response: uploading=false, error='S3 upload failed: Service Unavailable'", async () => {
    mockGetPresignedUrl.mockResolvedValueOnce(makePresignedResponse());
    // S3 returns non-ok HTTP response
    fetchSpy.mockResolvedValueOnce(makeS3ErrorResponse("Service Unavailable"));

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      try {
        await result.current.upload(makeFile(), "attachment");
      } catch {
        // expected — let state flush
      }
    });

    // State rollback must be clean
    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBe("S3 upload failed: Service Unavailable");
  });

  // -------------------------------------------------------------------------
  // Test 2.4 — S3 fetch network crash (TypeError) → rollback + generic message
  // -------------------------------------------------------------------------
  it("upload() — S3 network crash (TypeError): uploading=false, error set to crash message", async () => {
    mockGetPresignedUrl.mockResolvedValueOnce(makePresignedResponse());
    // Simulate network-level crash (no response at all)
    fetchSpy.mockRejectedValueOnce(new TypeError("Network request failed"));

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      try {
        await result.current.upload(makeFile(), "avatar");
      } catch {
        // expected — let state flush
      }
    });

    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBe("Network request failed");
  });

  // -------------------------------------------------------------------------
  // Test 2.5 — Non-Error object thrown → hook falls back to "Upload failed"
  // -------------------------------------------------------------------------
  it("upload() — non-Error thrown (string): error state defaults to 'Upload failed'", async () => {
    // Simulate a rogue rejection with a plain string (not an Error instance)
    mockGetPresignedUrl.mockRejectedValueOnce("unauthorized");

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      try {
        await result.current.upload(makeFile(), "avatar");
      } catch {
        // expected — let state flush
      }
    });

    expect(result.current.uploading).toBe(false);
    // The hook's fallback branch: `err instanceof Error ? err.message : "Upload failed"`
    expect(result.current.error).toBe("Upload failed");
  });

  // -------------------------------------------------------------------------
  // Test 2.6 — Sequential upload: state resets correctly between calls
  // -------------------------------------------------------------------------
  it("upload() — sequential calls: error from first call is cleared before second call", async () => {
    // First call: S3 crash
    mockGetPresignedUrl.mockResolvedValueOnce(makePresignedResponse());
    fetchSpy.mockResolvedValueOnce(makeS3ErrorResponse("Bad Gateway"));

    const { result } = renderHook(() => useFileUpload());

    // First upload fails — use try/catch inside act so state flushes
    await act(async () => {
      try {
        await result.current.upload(makeFile(), "avatar");
      } catch {
        // expected
      }
    });

    // Error must be populated after first failure
    expect(result.current.error).not.toBeNull();
    expect(result.current.error).toBe("S3 upload failed: Bad Gateway");

    // Second call: fully successful
    mockGetPresignedUrl.mockResolvedValueOnce(makePresignedResponse());
    fetchSpy.mockResolvedValueOnce(makeS3OkResponse());

    await act(async () => {
      await result.current.upload(makeFile("new.png"), "avatar");
    });

    // Error must be cleared at the start of the second call
    expect(result.current.error).toBeNull();
    expect(result.current.uploading).toBe(false);
  });
});
