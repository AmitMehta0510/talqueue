// Sentry MUST be imported before any other module for auto-instrumentation
import "shared/sentry";
import "shared/config/loadEnv";
import app from "./app";
import http from "http";

// ─── Critical Startup Guards ────────────────────────────────────────────────
// Fail immediately with a clear message if any secret required for secure
// operation is absent. This runs before any network sockets are opened so
// an improperly configured deployment never accepts public traffic.
const REQUIRED_ENV: Record<string, string | undefined> = {
  JWT_SECRET: process.env.JWT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
};

for (const [key, value] of Object.entries(REQUIRED_ENV)) {
  if (!value || value.trim() === "") {
    console.error(
      `\n[FATAL] Required environment variable "${key}" is not set.\n` +
      `Set it in your .env file or container environment and restart the server.\n`
    );
    process.exit(1);
  }
}
// ────────────────────────────────────────────────────────────────────────────

import { initializeSocket } from "modules/chat/socket";
import { checkElasticsearchHealth } from "services/elasticClient";
import { initElasticsearchIndices } from "services/elasticIndexManager";
import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import { ensureCoreCommunitiesExist } from "modules/community/community.service";
import { startMailWorker } from "services/mailQueue";
import { startEventWorker, stopEventWorker } from "services/eventWorker";
import { startInterestAggregatorCron, stopInterestAggregatorCron } from "modules/feed/interest-aggregator.cron";
import { startFeedInteractionArchiver, stopFeedInteractionArchiver } from "modules/feed/feed-interaction-archiver.cron";
import { startAnalyticsWriter, stopAnalyticsWriter } from "services/analytics/analyticsWriter";
import logger from "shared/logger";

const PORT = process.env.PORT || 5000;

const server =
  http.createServer(app);

initializeSocket(server);

server.listen(PORT, async () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV }, `Server listening on port ${PORT}`);

  const isHealthy = await checkElasticsearchHealth();
  if (isHealthy) {
    await initElasticsearchIndices();
  } else {
    logger.warn("Elasticsearch health check failed — skipping index initialization");
  }

  // Ensure core communities (general, sde-prep, etc.) exist — idempotent
  await ensureCoreCommunitiesExist().catch((err) =>
    logger.error({ err }, "Community bootstrap failed")
  );

  // Start background workers
  startMailWorker();
  startEventWorker();
  startInterestAggregatorCron();
  startFeedInteractionArchiver();
  startAnalyticsWriter();
  logger.info("Background workers started (mailWorker, eventWorker, interestAggregatorCron, feedArchiver, analyticsWriter)");
});

// ─── Graceful Shutdown ─────────────────────────────────────────────────────────
// Handles SIGTERM (Docker/Kubernetes pod eviction) and SIGINT (Ctrl+C).
// Sequence: stop HTTP intake → disconnect Prisma pool → quit Redis socket.
// Forced exit after 10 s in case graceful drain hangs (e.g. stuck keep-alive).
const gracefulShutdown = (signal: string) => {
  logger.info({ signal }, "Graceful shutdown initiated");

  // Force-exit fallback — prevents infinite hang
  const forceExitTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out after 10s — forcing exit");
    process.exit(1);
  }, 10_000);

  // Do not keep the process alive just for this timer
  forceExitTimer.unref();

  // 1. Stop accepting new HTTP connections
  server.close(async () => {
    logger.info("HTTP server closed");

    try {
      // 2. Stop event worker gracefully (drain in-flight jobs)
      await stopEventWorker();
      logger.info("Event worker stopped");

      // 2b. Stop interest aggregator cron
      stopInterestAggregatorCron();
      stopFeedInteractionArchiver();

      // 2c. Flush remaining analytics events
      await stopAnalyticsWriter();

      // 3. Release Prisma connection pool
      await prisma.$disconnect();
      logger.info("Prisma disconnected");

      // 4. Release Redis socket
      await redis.quit();
      logger.info("Redis disconnected. Shutdown complete.");

      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error during shutdown cleanup");
      process.exit(1);
    }
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error({ err }, "UNCAUGHT EXCEPTION — shutting down");
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "UNHANDLED REJECTION — shutting down");
  gracefulShutdown("UNHANDLED_REJECTION");
});