#!/bin/sh
# ─── Production Entrypoint ───────────────────────────────────────────────────
# 1. Runs Prisma migrate deploy (applies pending migrations — safe, no data loss)
# 2. Starts the compiled Node.js server
# Executed inside the runner stage of Dockerfile.prod on every container start.
set -e

echo "[Entrypoint] Running Prisma migrations..."
npx prisma migrate deploy

echo "[Entrypoint] Starting server..."
exec node dist/server.js
