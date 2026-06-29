import { useState, useCallback } from "react";
import { api } from "../lib/api";
import { useToast } from "../contexts/ToastContext";

type UploadPurpose = "avatar" | "letterhead" | "attachment";

export interface UploadResult {
  key: string;
  fileUrl: string;
}

// ---------------------------------------------------------------------------
// INTERNAL HELPERS
// ---------------------------------------------------------------------------

/**
 * Reads the first 4KB of a File, encodes it as a Base64 string, and executes
 * the validateFile API request.
 *
 * Pipeline:
 *   File.slice(0, 4096)          → Blob  (no memory penalty on large files)
 *   FileReader.readAsArrayBuffer → ArrayBuffer
 *   new Uint8Array(buffer)       → byte array (strictly typed, no `any`)
 *   for-loop                     → binary string (high-performance memory loop)
 *   btoa(binaryString)           → Base64 string
 *
 * @param file    - The browser File object.
 * @param purpose - The purpose of the upload.
 * @returns       A Promise resolving to true if validated, or throwing an error.
 */
export async function verifyFileSignature(file: File, purpose: string): Promise<boolean> {
  const slice: Blob = file.slice(0, 4096);
  const reader = new FileReader();

  const fileBase64 = await new Promise<string>((resolve, reject) => {
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const result = event.target?.result;
      if (!(result instanceof ArrayBuffer)) {
        reject(new Error("FileReader did not return an ArrayBuffer."));
        return;
      }
      const bytes: Uint8Array = new Uint8Array(result);
      let binaryString = "";
      const len = bytes.length;
      for (let i = 0; i < len; i++) {
        binaryString += String.fromCharCode(bytes[i]);
      }
      resolve(btoa(binaryString));
    };

    reader.onerror = () => {
      reject(new Error("FileReader failed while reading the file slice."));
    };

    reader.readAsArrayBuffer(slice);
  });

  try {
    await api.validateFile({ fileBase64, purpose: purpose as any });
    return true;
  } catch (err: any) {
    const message = err?.message || "Invalid file signature";
    throw new Error(message);
  }
}

// ---------------------------------------------------------------------------
// HOOK
// ---------------------------------------------------------------------------

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const upload = useCallback(
    async (file: File, purpose: UploadPurpose): Promise<UploadResult> => {
      setUploading(true);
      setError(null);

      try {
        // ── Step 0: Pre-upload file signature validation ──────────────────────
        // Slice the first 4 096 bytes, encode as Base64, and ask the server to
        // inspect the magic number bytes. This runs BEFORE requesting a presigned
        // URL so that invalid or malicious files never reach S3.
        try {
          await verifyFileSignature(file, purpose);
        } catch (validationErr: any) {
          const validationMsg = validationErr instanceof Error ? validationErr.message : "File signature validation failed";
          showToast("error", validationMsg);
          throw validationErr; // Completely abort the transaction (do NOT fetch presigned URL or push bytes to S3)
        }

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
    [showToast]
  );

  return { upload, uploading, error };
}

