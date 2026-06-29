import { request } from "../../../core/api/client";

export const storageApi = {
  validateFile: (body: {
    fileBase64: string;
    purpose: "avatar" | "letterhead" | "attachment";
  }) =>
    request<{ detectedType: string; purpose: string }>(
      "/storage/validate",
      { method: "POST", body }
    ),

  getPresignedUrl: (body: {
    filename: string;
    contentType: string;
    purpose: "avatar" | "letterhead" | "attachment";
  }) =>
    request<{ key: string; uploadUrl: string; fileUrl: string }>(
      "/storage/presigned-url",
      { method: "POST", body }
    ),
};
