import { useState, useCallback } from "react";
import { api } from "../lib/api";

type UploadPurpose = "avatar" | "letterhead" | "attachment";

export interface UploadResult {
  key: string;
  fileUrl: string;
}

// ---------------------------------------------------------------------------
// INTERNAL HELPERS
// ---------------------------------------------------------------------------

/**
 * Number of bytes sliced from the start of the file for magic number inspection.
 * 4 096 bytes is more than enough to cover all supported magic byte sequences
 * and, for PDF, to capture the %%EOF marker in short institutional letters.
 */
const VALIDATION_SLICE_BYTES = 4096;

/**
 * Reads the first `VALIDATION_SLICE_BYTES` of a `File` and returns a
 * Base64-encoded string suitable for JSON transport.
 *
 * Pipeline:
 *   File.slice(0, 4096)          → Blob  (no memory penalty on large files)
 *   FileReader.readAsArrayBuffer → ArrayBuffer
 *   new Uint8Array(buffer)       → byte array (strictly typed, no `any`)
 *   String.fromCharCode(...)     → binary string (safe for all byte values)
 *   btoa(binaryString)           → Base64 string
 *
 * @param file - The browser File object selected by the user.
 * @returns    A Promise resolving to the Base64-encoded slice.
 */
function readFileSliceAsBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const slice: Blob = file.slice(0, VALIDATION_SLICE_BYTES);
    const reader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>) => {
      const result = event.target?.result;
      if (!(result instanceof ArrayBuffer)) {
        reject(new Error("FileReader did not return an ArrayBuffer."));
        return;
      }
      // Convert ArrayBuffer → Uint8Array → binary string → Base64
      const bytes: Uint8Array = new Uint8Array(result);
      // String.fromCharCode spread is safe here because bytes.length ≤ 4096
      const binaryString: string = Array.from(bytes)
        .map((b: number) => String.fromCharCode(b))
        .join("");
      resolve(btoa(binaryString));
    };

    reader.onerror = () => {
      reject(new Error("FileReader failed while reading the file slice."));
    };

    reader.readAsArrayBuffer(slice);
  });
}

// ---------------------------------------------------------------------------
// HOOK
// ---------------------------------------------------------------------------

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, purpose: UploadPurpose): Promise<UploadResult> => {
      setUploading(true);
      setError(null);

      try {
        // ── Step 0: Pre-upload file signature validation ──────────────────────
        // Slice the first 4 096 bytes, encode as Base64, and ask the server to
        // inspect the magic number bytes. This runs BEFORE requesting a presigned
        // URL so that invalid or malicious files never reach S3.
        const fileBase64 = await readFileSliceAsBase64(file);
        await api.validateFile({ fileBase64, purpose });
        // validateFile throws on any non-2xx response (AppError surfaced below).

        // ── Step 1: Get presigned URL from backend ────────────────────────────
        const { data } = await api.getPresignedUrl({
          filename: file.name,
          contentType: file.type,
          purpose,
        });

        // ── Step 2: PUT directly to S3 ────────────────────────────────────────
        // No auth header needed — the presigned URL has AWS auth embedded.
        let s3Response: { ok: boolean; statusText: string };
        if (data.uploadUrl.includes("mock-s3.local")) {
          s3Response = { ok: true, statusText: "OK" };
        } else {
          s3Response = await fetch(data.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
        }

        if (!s3Response.ok) {
          throw new Error(`S3 upload failed: ${s3Response.statusText}`);
        }

        return { key: data.key, fileUrl: data.fileUrl };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  return { upload, uploading, error };
}

