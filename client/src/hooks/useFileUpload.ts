import { useState, useCallback } from "react";
import { api } from "../lib/api";

type UploadPurpose = "avatar" | "letterhead" | "attachment";

export interface UploadResult {
  key: string;
  fileUrl: string;
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, purpose: UploadPurpose): Promise<UploadResult> => {
      setUploading(true);
      setError(null);

      try {
        // Step 1: Get presigned URL from backend
        const { data } = await api.getPresignedUrl({
          filename: file.name,
          contentType: file.type,
          purpose,
        });

        // Step 2: PUT directly to S3 — no auth header needed (presigned URL has auth embedded)
        const s3Response = await fetch(data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

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
