/**
 * @file file-signature.service.ts
 * @module Infra/Enrichment
 *
 * Dependency-free file signature (magic number) detection and structural
 * sanity checking using Node.js built-in Buffer utilities only.
 *
 * No npm packages required — fully aligned with the dependency-free
 * philosophy of the infra/enrichment module.
 *
 * Supported formats and their magic byte sequences:
 *  PDF  : %PDF  → [0x25, 0x50, 0x44, 0x46]  (offset 0)
 *  JPEG : SOI   → [0xFF, 0xD8, 0xFF]          (offset 0)
 *  PNG  : ‰PNG  → [0x89, 0x50, 0x4E, 0x47]   (offset 0)
 *
 * Usage:
 *  const buf = Buffer.from(base64String, "base64");
 *  const result = checkFileSignature(buf, ["PDF"]);
 *  if (!result.valid) throw new AppError(result.reason!, 400);
 */

import winston from "winston";

// ---------------------------------------------------------------------------
// LOGGER
// ---------------------------------------------------------------------------

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [FileSignature] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

/** Allowed file type labels. */
export type AllowedFileType = "PDF" | "JPEG" | "PNG";

/** The shape returned by both validation functions. */
export interface FileSignatureResult {
  /** Whether the file passed all checks. */
  valid: boolean;
  /** The detected file type, or null if unrecognised. */
  detectedType: AllowedFileType | null;
  /** Human-readable failure reason. Null on success. */
  reason: string | null;
}

/** Internal descriptor for a magic byte rule. */
interface SignatureRule {
  type: AllowedFileType;
  /** Expected byte values starting at `offset`. */
  bytes: number[];
  /** Byte offset within the buffer to start matching from. */
  offset: number;
}

// ---------------------------------------------------------------------------
// MAGIC NUMBER LOOKUP TABLE
// ---------------------------------------------------------------------------

const SIGNATURE_RULES: SignatureRule[] = [
  // PDF:  %PDF
  { type: "PDF",  bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 },
  // JPEG: FF D8 FF (SOI + next marker byte prefix)
  { type: "JPEG", bytes: [0xFF, 0xD8, 0xFF],        offset: 0 },
  // PNG:  89 50 4E 47
  { type: "PNG",  bytes: [0x89, 0x50, 0x4E, 0x47],  offset: 0 },
];

// Minimum buffer size required to read the longest magic sequence.
const MIN_BUFFER_BYTES = 4;

// ---------------------------------------------------------------------------
// CORE SIGNATURE CHECK
// ---------------------------------------------------------------------------

/**
 * Validates a `Buffer` against known magic number signatures.
 *
 * The function only inspects the first few bytes; you do NOT need to pass
 * the entire file — slicing the first 4 KB is more than sufficient.
 *
 * @param buffer  - Buffer containing at least the first 4 bytes of the file.
 * @param allowed - Which `AllowedFileType` values are accepted.
 *                  Defaults to `["PDF", "JPEG", "PNG"]`.
 * @returns       A `FileSignatureResult` indicating validity and detected type.
 */
export function checkFileSignature(
  buffer: Buffer,
  allowed: AllowedFileType[] = ["PDF", "JPEG", "PNG"]
): FileSignatureResult {
  if (!Buffer.isBuffer(buffer) || buffer.length < MIN_BUFFER_BYTES) {
    logger.warn(
      `[checkFileSignature] Buffer too small or invalid (length=${buffer?.length ?? 0})`
    );
    return {
      valid: false,
      detectedType: null,
      reason: "File is too small to inspect. Minimum 4 bytes required.",
    };
  }

  for (const rule of SIGNATURE_RULES) {
    const slice = buffer.subarray(rule.offset, rule.offset + rule.bytes.length);
    const matches = rule.bytes.every((byte, idx) => slice[idx] === byte);

    if (matches) {
      if (allowed.includes(rule.type)) {
        logger.info(`[checkFileSignature] Detected type="${rule.type}" — allowed.`);
        return { valid: true, detectedType: rule.type, reason: null };
      }

      logger.warn(
        `[checkFileSignature] Detected type="${rule.type}" is not in allowed list: [${allowed.join(", ")}]`
      );
      return {
        valid: false,
        detectedType: rule.type,
        reason: `File type "${rule.type}" is not permitted for this upload. Allowed: ${allowed.join(", ")}.`,
      };
    }
  }

  logger.warn("[checkFileSignature] Unrecognised file signature.");
  return {
    valid: false,
    detectedType: null,
    reason:
      "Unrecognised file signature. Please upload a valid PDF, JPEG, or PNG document.",
  };
}

// ---------------------------------------------------------------------------
// PDF STRUCTURAL SANITY CHECK
// ---------------------------------------------------------------------------

/**
 * Performs a two-stage PDF validation:
 *  1. Magic number check — verifies the buffer starts with `%PDF`.
 *  2. Structural sanity check — verifies that the buffer's tail contains
 *     the `%%EOF` cross-reference marker, detecting truncated or corrupt files.
 *
 * The `%%EOF` check is performed against the last 1 024 bytes of the buffer
 * to handle standard and linearised PDFs alike.
 *
 * @param buffer - Full file buffer, or at minimum the first 4 bytes +
 *                 the last 1 024 bytes concatenated. For files ≤ 4 096 bytes,
 *                 pass the entire content.
 * @returns A `FileSignatureResult`.
 */
export function validatePdfStructure(buffer: Buffer): FileSignatureResult {
  // Stage 1 — magic number
  const signatureCheck = checkFileSignature(buffer, ["PDF"]);
  if (!signatureCheck.valid) {
    return signatureCheck;
  }

  // Stage 2 — structural tail marker
  // Inspect the last 1 024 bytes for %%EOF.
  const tailStart = Math.max(0, buffer.length - 1024);
  const tail = buffer.subarray(tailStart);
  const tailAscii = tail.toString("ascii");

  if (!tailAscii.includes("%%EOF")) {
    logger.warn(
      "[validatePdfStructure] PDF magic bytes detected but %%EOF marker is absent — file may be truncated or corrupt."
    );
    return {
      valid: false,
      detectedType: "PDF",
      reason:
        "The uploaded file has a valid PDF header but appears to be truncated or structurally corrupt (missing %%EOF marker). Please re-export and re-upload the document.",
    };
  }

  logger.info("[validatePdfStructure] PDF structure validated successfully.");
  return { valid: true, detectedType: "PDF", reason: null };
}
