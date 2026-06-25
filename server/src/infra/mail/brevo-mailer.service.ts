/**
 * @file brevo-mailer.service.ts
 * @module Infra/Mail
 *
 * Production-grade transactional email service backed by the Brevo v3 REST API.
 *
 * Design decisions:
 *  - Zero external npm dependencies — uses Node.js built-in `fetch` (Node 18+).
 *  - Dev-mode fail-soft: when BREVO_API_KEY is absent and NODE_ENV !== 'production',
 *    logs a Winston warning with the OTP (for local testing) and returns
 *    { sent: false }. The OTP is NEVER placed in the HTTP response body.
 *  - Prod-mode hard reject: when BREVO_API_KEY is absent in production,
 *    throws AppError(500) immediately to prevent silent claim flow failures.
 *  - All exported functions and types are fully typed — no implicit `any`.
 */

import winston from "winston";
import AppError from "shared/errors/AppError";

// ---------------------------------------------------------------------------
// LOGGER
// ---------------------------------------------------------------------------

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [BrevoMailer] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/** Platform sender identity — must match a verified sender in Brevo dashboard. */
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "noreply@engineers.dev";
const SENDER_NAME = process.env.BREVO_SENDER_NAME || "Engineers Platform";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface OtpEmailParams {
  /** Recipient business email address. */
  to: string;
  /** 6-digit numeric OTP string. */
  otp: string;
  /** Company name for personalisation. */
  companyName: string;
}

export interface OtpEmailResult {
  /** True when email was dispatched to Brevo successfully. */
  sent: boolean;
  /** Only present in dev-mode bypass (sent = false). Used for dev tooling only. */
  devOtp?: string;
}

// ---------------------------------------------------------------------------
// TEMPLATE RENDERER
// ---------------------------------------------------------------------------

/**
 * Renders a fully self-contained, responsive HTML email for OTP delivery.
 *
 * Pure function — no I/O, no disk reads, deterministic output.
 * Keeping the template inline:
 *  1. Eliminates `fs.readFileSync` latency under concurrent claim bursts.
 *  2. Makes unit-testing the output trivial (import → call → assert string).
 *  3. Zero templating-engine package overhead.
 *
 * @param otp         - The 6-digit OTP to embed.
 * @param companyName - Company name shown in the subject header.
 * @returns Inline HTML string.
 */
export function renderOtpTemplate(otp: string, companyName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Company Claim Verification</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f13;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f0f13;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0"
               style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);
                      border-radius:16px;overflow:hidden;border:1px solid #2a2a4a;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(90deg,#6366f1 0%,#8b5cf6 100%);
                        padding:28px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;color:#e0e0ff;
                         letter-spacing:3px;text-transform:uppercase;">
                Engineers Platform
              </p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;">
                Company Claim Verification
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 20px;font-size:15px;color:#a0a0c0;line-height:1.6;">
                Hello, you've initiated a claim request for
                <strong style="color:#e0e0ff;">${escapeHtml(companyName)}</strong>
                on Engineers Platform.
                Use the verification code below to complete the process.
              </p>

              <!-- OTP Box -->
              <div style="background:#0d0d1a;border:2px solid #6366f1;border-radius:12px;
                           padding:28px;text-align:center;margin:24px 0;">
                <p style="margin:0 0 10px;font-size:12px;font-weight:600;
                            color:#6366f1;letter-spacing:3px;text-transform:uppercase;">
                  Verification Code
                </p>
                <p style="margin:0;font-size:44px;font-weight:900;letter-spacing:12px;
                            color:#ffffff;font-family:'Courier New',Courier,monospace;">
                  ${escapeHtml(otp)}
                </p>
              </div>

              <!-- TTL Warning -->
              <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.3);
                           border-radius:8px;padding:14px 18px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#fbbf24;font-weight:600;">
                  ⏱ This code expires in <strong>10 minutes</strong>.
                </p>
                <p style="margin:4px 0 0;font-size:12px;color:#d4a017;">
                  After expiry, you must initiate a new claim request.
                </p>
              </div>

              <!-- Security Block -->
              <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);
                           border-radius:8px;padding:14px 18px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#f87171;font-weight:700;">
                  🔒 Security Warning
                </p>
                <p style="margin:6px 0 0;font-size:12px;color:#fca5a5;line-height:1.6;">
                  Never share this code with anyone — including Engineers Platform support.
                  If you did not initiate this request, please ignore this email.
                  Your account is safe and no changes have been made.
                </p>
              </div>

              <p style="margin:0;font-size:12px;color:#5a5a7a;line-height:1.6;">
                This email was sent because a company claim was initiated using this
                business email address. If this was not you, no action is required.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #2a2a4a;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#3a3a5a;">
                © ${new Date().getFullYear()} Engineers Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Minimal HTML escaper — prevents OTP or company-name injection into the template.
 * Only escapes the 5 characters that are meaningful inside HTML attribute/text contexts.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// MAIN SEND FUNCTION
// ---------------------------------------------------------------------------

/**
 * Sends a transactional OTP email via Brevo v3 API.
 *
 * Behaviour matrix:
 * ┌─────────────────────┬──────────────┬────────────────────────────────────────┐
 * │ NODE_ENV            │ BREVO_API_KEY│ Behaviour                              │
 * ├─────────────────────┼──────────────┼────────────────────────────────────────┤
 * │ development / test  │ absent       │ Warn log + return { sent: false, devOtp}│
 * │ production          │ absent       │ Throw AppError(500)                     │
 * │ any                 │ present      │ POST to Brevo, return { sent: true }    │
 * │ any                 │ present, bad │ Throw AppError with Brevo error message │
 * └─────────────────────┴──────────────┴────────────────────────────────────────┘
 *
 * @param params - Recipient email, OTP, and company name.
 * @returns OtpEmailResult
 * @throws AppError on production misconfiguration or Brevo API error.
 */
export async function sendOtpEmail(params: OtpEmailParams): Promise<OtpEmailResult> {
  const { to, otp, companyName } = params;
  const apiKey = process.env.BREVO_API_KEY;
  const isProd = process.env.NODE_ENV === "production";

  // ── Key-absent guard ────────────────────────────────────────────────────────
  if (!apiKey) {
    if (isProd) {
      logger.error(
        `BREVO_API_KEY is not set. Cannot send OTP to ${to}. Blocking claim initiation in production.`
      );
      throw new AppError(
        "Email service is not configured. Please contact the platform administrator.",
        500
      );
    }

    // Dev/test: fail-soft — OTP is logged only (never in HTTP response)
    logger.warn(
      `[DEV MODE] BREVO_API_KEY not set. Skipping live email to ${to}. ` +
        `OTP for company "${companyName}": ${otp}`
    );
    return { sent: false, devOtp: otp };
  }

  // ── Build Brevo request payload ─────────────────────────────────────────────
  const htmlContent = renderOtpTemplate(otp, companyName);

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: to }],
    subject: `Your verification code for ${companyName} on Engineers Platform`,
    htmlContent,
  };

  // ── Call Brevo v3 REST API via native fetch ──────────────────────────────────
  logger.info(`Sending OTP email to ${to} for company "${companyName}" via Brevo.`);

  let response: Response;
  try {
    response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (networkErr: any) {
    logger.error(`Network error reaching Brevo API: ${networkErr.message}`);
    throw new AppError(
      `Failed to reach email service: ${networkErr.message}`,
      502
    );
  }

  // ── Handle non-2xx responses ─────────────────────────────────────────────────
  if (!response.ok) {
    let errorBody: string;
    try {
      const json = await response.json() as Record<string, unknown>;
      errorBody = (json.message as string) || JSON.stringify(json);
    } catch {
      errorBody = await response.text().catch(() => `HTTP ${response.status}`);
    }
    logger.error(`Brevo API error ${response.status}: ${errorBody}`);
    throw new AppError(`Email delivery failed: ${errorBody}`, 502);
  }

  logger.info(`OTP email successfully dispatched to ${to} (Brevo).`);
  return { sent: true };
}
