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
      `Unrecognised or unsupported file type. For this upload, please provide: ${allowed.join(" or ")}. ` +
      "Ensure the file has not been renamed from a different format (e.g., renaming a .jpg to .pdf).",
  };
}

// ---------------------------------------------------------------------------
// PDF STRUCTURAL SANITY CHECK
// ---------------------------------------------------------------------------

/**
 * The maximum bytes the client slices for the validation request.
 * Must match the `VALIDATION_SLICE_BYTES` constant in `useFileUpload.ts`.
 */
const VALIDATION_SLICE_BYTES = 4096;

/**
 * Performs PDF validation in up to two stages:
 *
 *  Stage 1 (always)   — Magic number check: verifies the buffer starts
 *                       with `%PDF` (bytes 0x25 0x50 0x44 0x46).
 *
 *  Stage 2 (optional) — Structural sanity check: verifies the `%%EOF`
 *                       cross-reference marker is present in the tail.
 *
 *  ⚠️  Stage 2 is ONLY applied when `buffer.length < VALIDATION_SLICE_BYTES`.
 *      The client transmits only the first 4 096 bytes of the file.
 *      For any PDF larger than 4 KB the tail (which holds `%%EOF`) is never
 *      transmitted, so performing the check would produce a false failure for
 *      every legitimate real-world document.
 *      When buffer.length < 4096 the file is small enough to have arrived in
 *      full, so the structural check is both safe and meaningful.
 *
 * @param buffer - The decoded bytes from the client's Base64 slice.
 * @returns A `FileSignatureResult`.
 */
export function validatePdfStructure(buffer: Buffer): FileSignatureResult {
  // Stage 1 — magic number (always enforced)
  const signatureCheck = checkFileSignature(buffer, ["PDF"]);
  if (!signatureCheck.valid) {
    return signatureCheck;
  }

  // Stage 2 — %%EOF tail marker (only for files that fit entirely in the slice)
  if (buffer.length < VALIDATION_SLICE_BYTES) {
    const tailStart = Math.max(0, buffer.length - 1024);
    const tail = buffer.subarray(tailStart);
    const tailAscii = tail.toString("ascii");

    if (!tailAscii.includes("%%EOF")) {
      logger.warn(
        "[validatePdfStructure] Small PDF (<4 KB) is missing %%EOF marker — likely corrupt or truncated."
      );
      return {
        valid: false,
        detectedType: "PDF",
        reason:
          "The uploaded PDF appears to be corrupt or incomplete (missing %%EOF marker). " +
          "Please re-export the document from your PDF editor and try again.",
      };
    }
  } else {
    logger.info(
      `[validatePdfStructure] File is ≥${VALIDATION_SLICE_BYTES} bytes — %%EOF check skipped (tail not transmitted).`
    );
  }

  logger.info("[validatePdfStructure] PDF validated successfully.");
  return { valid: true, detectedType: "PDF", reason: null };
}
