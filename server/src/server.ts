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

const PORT = process.env.PORT || 5000;

const server =
  http.createServer(app);

initializeSocket(server);

server.listen(PORT, async () => {

  console.log(
    `Server is running on port ${PORT}`
  );
  const isHealthy = await checkElasticsearchHealth();
  if (isHealthy) {
    await initElasticsearchIndices();
  } else {
    console.warn("Skipping Elasticsearch index initialization because health check failed.");
  }

  // Ensure core communities (general, sde-prep, etc.) exist — idempotent
  await ensureCoreCommunitiesExist().catch((err) =>
    console.error("[Community Bootstrap] Failed:", err)
  );

  // Start background mail queue worker
  startMailWorker();
});

// ─── Graceful Shutdown ─────────────────────────────────────────────────────────
// Handles SIGTERM (Docker/Kubernetes pod eviction) and SIGINT (Ctrl+C).
// Sequence: stop HTTP intake → disconnect Prisma pool → quit Redis socket.
// Forced exit after 10 s in case graceful drain hangs (e.g. stuck keep-alive).
const gracefulShutdown = (signal: string) => {
  console.log(`\n[${signal}] Graceful shutdown initiated...`);

  // Force-exit fallback — prevents infinite hang
  const forceExitTimer = setTimeout(() => {
    console.error("Graceful shutdown timed out after 10s. Forcing exit.");
    process.exit(1);
  }, 10_000);

  // Do not keep the process alive just for this timer
  forceExitTimer.unref();

  // 1. Stop accepting new HTTP connections
  server.close(async () => {
    console.log("HTTP server closed.");

    try {
      // 2. Release Prisma connection pool
      await prisma.$disconnect();
      console.log("Prisma disconnected.");

      // 3. Release Redis socket
      await redis.quit();
      console.log("Redis disconnected.");

      console.log("Shutdown complete. Exiting.");
      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown cleanup:", err);
      process.exit(1);
    }
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  console.error("\n[CRITICAL] UNCAUGHT EXCEPTION: Shutting down server gracefully...", err);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason) => {
  console.error("\n[CRITICAL] UNHANDLED REJECTION: Shutting down server gracefully...", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});