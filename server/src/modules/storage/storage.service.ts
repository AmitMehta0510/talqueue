import crypto from "crypto";
import { getPresignedUploadUrl, getPublicFileUrl } from "shared/services/s3";

export interface GenerateUploadParams {
  filename: string;
  contentType: string;
  purpose: "avatar" | "letterhead" | "attachment";
}

export const generateUploadParameters = async (
  userId: string,
  params: GenerateUploadParams,
) => {
  const uuid = crypto.randomUUID();
  // Sanitize filename: replace spaces with underscores, allow only safe characters
  const safeFilename = params.filename
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");

  let folder = "general";
  if (params.purpose === "avatar") {
    folder = "avatars";
  } else if (params.purpose === "letterhead") {
    folder = "onboarding/letterheads";
  } else if (params.purpose === "attachment") {
    folder = "chat/attachments";
  }

  // Key structure: folder/userId/uuid-filename
  const key = `${folder}/${userId}/${uuid}-${safeFilename}`;

  const uploadUrl = await getPresignedUploadUrl(key, params.contentType);
  const fileUrl = getPublicFileUrl(key);

  return {
    key,
    uploadUrl,
    fileUrl,
  };
};
