import { Response } from "express";
import winston from "winston";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import AppError from "shared/errors/AppError";
import { getPresignedUrlSchema, validateFileSchema } from "./storage.validation";
import { generateUploadParameters } from "./storage.service";
import {
  checkFileSignature,
  validatePdfStructure,
  type AllowedFileType,
} from "infra/enrichment/file-signature.service";

// ---------------------------------------------------------------------------
// LOGGER
// ---------------------------------------------------------------------------

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [StorageController] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// ---------------------------------------------------------------------------
// HANDLER: POST /api/v1/storage/presigned-url
// ---------------------------------------------------------------------------

export const getPresignedUrlHandler = asyncHandler(async (req: any, res: Response) => {
  const validatedData = getPresignedUrlSchema.parse(req.body);
  const userId = req.user.id;

  const result = await generateUploadParameters(userId, validatedData);

  res.status(200).json(
    successResponse(
      {
        uploadUrl: result.uploadUrl,
        fileUrl: result.fileUrl,
        key: result.key,
      },
      "Presigned URL generated successfully",
    ),
  );
});

// ---------------------------------------------------------------------------
// HANDLER: POST /api/v1/storage/validate
// ---------------------------------------------------------------------------

/**
 * Pre-upload file signature validation endpoint.
 *
 * Accepts the first 4 096 bytes of a file encoded as Base64, decodes them
 * into a Buffer, and validates the magic number signature against the
 * expected type for the given upload `purpose`.
 *
 * Purpose → enforcement:
 *  - "letterhead" → PDF only; full structural check (magic bytes + %%EOF).
 *  - "avatar"     → JPEG or PNG only.
 *  - "attachment" → PDF, JPEG, or PNG.
 *
 * The client must call this endpoint BEFORE uploading to the S3 presigned URL.
 * On success (HTTP 200) the client may proceed with the S3 PUT request.
 * On failure (HTTP 400) the upload must be aborted.
 */
export const validateFileHandler = asyncHandler(async (req: any, res: Response) => {
  const { fileBase64, purpose } = validateFileSchema.parse(req.body);
  const userId = req.user?.id ?? "anonymous";

  logger.info(`[validateFileHandler] user=${userId}, purpose="${purpose}", base64Length=${fileBase64.length}`);

  // Decode Base64 → raw Buffer (only the first 4 096 bytes from the client).
  const buffer = Buffer.from(fileBase64, "base64");

  if (buffer.length === 0) {
    throw new AppError("Decoded file buffer is empty. Ensure the fileBase64 field contains valid content.", 400);
  }

  let result;

  if (purpose === "letterhead") {
    // Institutional documents must be authentic PDFs with a valid structure.
    result = validatePdfStructure(buffer);
  } else if (purpose === "avatar") {
    // Profile pictures: JPEG or PNG only.
    const avatarAllowed: AllowedFileType[] = ["JPEG", "PNG"];
    result = checkFileSignature(buffer, avatarAllowed);
  } else {
    // Attachments: any supported format.
    const attachmentAllowed: AllowedFileType[] = ["PDF", "JPEG", "PNG"];
    result = checkFileSignature(buffer, attachmentAllowed);
  }

  if (!result.valid) {
    logger.warn(
      `[validateFileHandler] Validation failed — user=${userId}, purpose="${purpose}", reason="${result.reason}"`
    );
    throw new AppError(result.reason ?? "Invalid file signature.", 400);
  }

  logger.info(
    `[validateFileHandler] Validation passed — user=${userId}, purpose="${purpose}", detectedType="${result.detectedType}"`
  );

  return res.status(200).json(
    successResponse(
      {
        detectedType: result.detectedType,
        purpose,
      },
      "File signature is valid. You may proceed with the upload.",
    ),
  );
});

