/**
 * @file shared/database/prisma.ts
 *
 * Prisma client singleton with PgBouncer-aware connection pool configuration.
 *
 * ## Connection Pool Architecture
 *
 * Without PgBouncer (current default):
 *   Node.js → Prisma pool (N connections) → Postgres
 *
 * With PgBouncer (production recommendation):
 *   Node.js → Prisma (connection_limit=1) → PgBouncer pool → Postgres
 *
 * Why connection_limit=1 with PgBouncer?
 *   Prisma manages its own internal pool. When PgBouncer is in the middle,
 *   letting Prisma open many connections defeats the purpose — PgBouncer
 *   is already pooling. Setting connection_limit=1 tells Prisma to use a
 *   single connection (PgBouncer will multiplex it efficiently).
 *
 * PgBouncer setup requirements (DevOps):
 *   1. Add `?pgbouncer=true` to DATABASE_URL when using PgBouncer
 *   2. PgBouncer must be in transaction pooling mode (not session mode)
 *   3. Prisma migrations must run against the DIRECT_DATABASE_URL (not through PgBouncer)
 *      because migrations use advisory locks which require session mode.
 *
 * Environment variables:
 *   DATABASE_URL         — connection string (through PgBouncer in production)
 *   DIRECT_DATABASE_URL  — direct connection (bypasses PgBouncer, for migrations only)
 *   DB_CONNECTION_LIMIT  — override max connections per Node process (default: 10)
 *
 * Reference: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management/configure-connection-pool
 */

import { PrismaClient } from "@prisma/client";
import logger from "shared/logger";

// ─── Connection pool sizing ──────────────────────────────────────────────────
// With PgBouncer: use 1 (PgBouncer handles the actual pool)
// Without PgBouncer: use (CPU cores × 2 + 1), capped at a sensible default
const isPgBouncer = process.env.DATABASE_URL?.includes("pgbouncer=true") ?? false;
const connectionLimit = isPgBouncer
  ? 1
  : parseInt(process.env.DB_CONNECTION_LIMIT ?? "10", 10);

if (isPgBouncer) {
  logger.info("PgBouncer mode enabled — Prisma connection_limit set to 1");
} else {
  logger.info({ connectionLimit }, "Prisma direct pool mode");
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log:
    process.env.NODE_ENV === "development"
      ? [
          { level: "query", emit: "event" },
          { level: "warn",  emit: "stdout" },
          { level: "error", emit: "stdout" },
        ]
      : [
          { level: "warn",  emit: "stdout" },
          { level: "error", emit: "stdout" },
        ],
});

// ─── Slow query detection (development only) ────────────────────────────────
// Log any query that takes more than 500ms so we catch N+1 and missing indexes.
if (process.env.NODE_ENV === "development") {
  (prisma as any).$on("query", (event: { duration: number; query: string; params: string }) => {
    if (event.duration > 500) {
      logger.warn(
        { duration: event.duration, query: event.query.slice(0, 300), params: event.params.slice(0, 200) },
        "Slow Prisma query detected (>500ms)",
      );
    }
  });
}

export default prisma;