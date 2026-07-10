/**
 * @file shared/logger.ts
 *
 * Centralised Pino logger instance for the entire server.
 *
 * Usage:
 *   import logger from "shared/logger";
 *   logger.info("Server started");
 *   logger.error({ err }, "Unhandled error");
 *   logger.warn({ userId }, "Rate limit hit");
 *
 * In production, logs are emitted as JSON (structured, machine-readable).
 * In development, `pino-pretty` transport is used for human-friendly output.
 *
 * HTTP access logging is handled separately via `pino-http` middleware
 * in app.ts — this file is for application-level logs only.
 */

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),

  // ── Development transport ────────────────────────────────────────────────
  // pino-pretty formats JSON logs for readability in the local terminal.
  // This transport is NOT used in production — use a log aggregator (e.g.
  // Datadog, Grafana Loki) to consume the raw JSON instead.
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
        messageFormat: "[{module}] {msg}",
      },
    },
  }),

  // ── Production config ───────────────────────────────────────────────────
  // Emit structured JSON. Add base fields common to every log line.
  base: {
    env: process.env.NODE_ENV || "development",
    service: "forge-api",
  },

  // Redact sensitive fields if they appear anywhere in log objects.
  // This is a safety net — individual callers should not log raw passwords.
  redact: {
    paths: ["password", "token", "accessToken", "refreshToken", "apiKey", "*.password", "*.token"],
    censor: "[REDACTED]",
  },
});

export default logger;
