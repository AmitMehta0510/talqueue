/**
 * @file shared/sentry.ts
 *
 * Sentry error tracking initialisation.
 *
 * This module must be imported ONCE, at the very top of server.ts,
 * BEFORE any other application code — Sentry needs to instrument
 * the Node.js runtime before modules are loaded.
 *
 * Usage in server.ts:
 *   import "./shared/sentry";   // ← must be first import
 *   import app from "./app";
 *   ...
 *
 * If SENTRY_DSN is not set, the module exits silently — the platform
 * continues to function normally without remote error reporting.
 *
 * Captured automatically:
 *  - Unhandled promise rejections
 *  - Uncaught exceptions
 *  - Express request errors (via Sentry.setupExpressErrorHandler)
 *  - Console.error calls (optional, configurable)
 *
 * Breadcrumbs (automatic):
 *  - HTTP outbound requests
 *  - Database queries (via Prisma integration)
 *  - Redis commands
 */

import * as Sentry from "@sentry/node";
import logger from "shared/logger";

const dsn = process.env.SENTRY_DSN;

if (!dsn) {
  if (process.env.NODE_ENV === "production") {
    logger.warn(
      "SENTRY_DSN is not set. Error tracking is disabled. " +
      "Set SENTRY_DSN to enable Sentry in production.",
    );
  }
} else {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",

    // Capture 100% of errors always
    // Adjust tracesSampleRate for performance monitoring (0.1 = 10% of requests)
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Capture 100% of sessions for release health
    // Lower this in production if you have high traffic
    profilesSampleRate: 0.1,

    // Capture release version for source map tracking
    // Set via CI: SENTRY_RELEASE=$(git rev-parse --short HEAD)
    release: process.env.SENTRY_RELEASE,

    // Never send PII to Sentry (email addresses, IPs, etc.)
    sendDefaultPii: false,

    // Integrations
    integrations: [
      // Capture unhandled promise rejections
      Sentry.captureConsoleIntegration({ levels: ["error"] }),
    ],

    // Scrub sensitive data before sending
    beforeSend(event) {
      // Remove password fields from request bodies if they leak through
      if (event.request?.data) {
        const data = event.request.data as Record<string, unknown>;
        if (data.password) data.password = "[FILTERED]";
        if (data.token) data.token = "[FILTERED]";
        if (data.refreshToken) data.refreshToken = "[FILTERED]";
      }
      return event;
    },
  });

  logger.info({ dsn: dsn.replace(/\/\d+$/, "/[PROJECT_ID]") }, "Sentry initialised");
}

export { Sentry };
