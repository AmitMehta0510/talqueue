-- Migration: Add GIN/trigram indexes for company search and composite filter index
-- Addresses F-09: getCompanies 5-column ILIKE scan without index
--
-- All indexes use CONCURRENTLY — safe to apply on a live production database
-- without acquiring an exclusive table lock.
--
-- Prerequisites: pg_trgm extension must be enabled first.

-- Step 1: Enable pg_trgm extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 2: GIN trigram index on company name (primary search column)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_name_trgm
  ON "Company" USING GIN (name gin_trgm_ops);

-- Step 3: GIN trigram index on tagline
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_tagline_trgm
  ON "Company" USING GIN (tagline gin_trgm_ops);

-- Step 4: GIN trigram index on industry
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_industry_trgm
  ON "Company" USING GIN (industry gin_trgm_ops);

-- Step 5: GIN trigram index on headquarters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_headquarters_trgm
  ON "Company" USING GIN (headquarters gin_trgm_ops);

-- Step 6: Composite B-tree index for the common filter+sort combination:
--   verified DESC (pinned first), hiringEnabled (bool filter), createdAt DESC (default sort)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_verified_hiring_created
  ON "Company" (verified DESC, "hiringEnabled", "createdAt" DESC);

-- NOTE: The description column has been intentionally EXCLUDED from all indexes.
-- It is an unbounded TEXT column. ILIKE on it was the worst-case scan in the
-- getCompanies search path. Description search should be routed through
-- PostgreSQL full-text search (tsvector/GIN) or Elasticsearch if needed.
