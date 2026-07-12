-- ─── PlatformEvent: TimescaleDB hypertable for analytics ─────────────────────
--
-- This table captures raw platform events in an append-only time-series format.
-- It's decoupled from the main OLTP database read/write path.
--
-- If TimescaleDB is installed, the SELECT create_hypertable call at the bottom
-- converts this to a time-series hypertable with automatic chunk management.
-- If TimescaleDB is NOT installed, this is still a valid Postgres table — the
-- analytics writer will insert rows normally, and you can enable hypertable
-- later without changing application code.
--
-- Run after `prisma migrate dev`:
--   psql $DATABASE_URL -f prisma/migrations/manual/timescale_platform_events.sql
--
-- Or apply via Docker Compose init scripts in production.

CREATE TABLE IF NOT EXISTS "PlatformEvent" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "time"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "event_type"  TEXT        NOT NULL,  -- e.g. 'feed.impression', 'job.view', 'post.like'
  "user_id"     UUID,                  -- NULL for anonymous events
  "entity_type" TEXT,                  -- 'JOB', 'POST', 'PROJECT', 'HACKATHON', etc.
  "entity_id"   UUID,
  "properties"  JSONB       NOT NULL DEFAULT '{}',
  "session_id"  TEXT,                  -- for session-level analytics

  PRIMARY KEY ("id", "time")          -- composite PK required for TimescaleDB
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS "PlatformEvent_time_idx"         ON "PlatformEvent" ("time"        DESC);
CREATE INDEX IF NOT EXISTS "PlatformEvent_user_time_idx"    ON "PlatformEvent" ("user_id",    "time" DESC);
CREATE INDEX IF NOT EXISTS "PlatformEvent_type_time_idx"    ON "PlatformEvent" ("event_type", "time" DESC);
CREATE INDEX IF NOT EXISTS "PlatformEvent_entity_time_idx"  ON "PlatformEvent" ("entity_type","entity_id", "time" DESC);

-- ─── TimescaleDB hypertable conversion (idempotent) ───────────────────────────
-- If TimescaleDB extension is not installed, this will fail silently — the table
-- already exists as a regular Postgres table and analytics will still work.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
  ) THEN
    PERFORM create_hypertable(
      '"PlatformEvent"',
      'time',
      chunk_time_interval => INTERVAL '1 week',
      if_not_exists       => TRUE
    );

    -- Compress chunks older than 7 days (requires TimescaleDB >= 2.0)
    ALTER TABLE "PlatformEvent" SET (
      timescaledb.compress,
      timescaledb.compress_segmentby = 'event_type, user_id'
    );

    PERFORM add_compression_policy('"PlatformEvent"', INTERVAL '7 days', if_not_exists => TRUE);

    RAISE NOTICE 'TimescaleDB hypertable enabled for PlatformEvent';
  ELSE
    RAISE NOTICE 'TimescaleDB not installed — PlatformEvent is a regular Postgres table. Enable later with create_hypertable().';
  END IF;
END $$;
