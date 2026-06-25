/**
 * @file company-enrichment.service.ts
 * @module Infra/Enrichment
 *
 * 3-stage fail-soft metadata enrichment pipeline for auto-discovered companies.
 *
 * Pipeline (short-circuits on first successful hit):
 *  1. Clearbit Company API — fires only if CLEARBIT_API_KEY is set.
 *     Maps: description, tagline, size, industry, logoUrl, totalEmployees.
 *  2. Homepage meta-tag scraper — native fetch on https://<domain>.
 *     Extracts: og:description, og:title, meta[name=description], og:image.
 *  3. Gemini AI parser — fires if key fields remain empty after stages 1+2.
 *     Calls generativelanguage.googleapis.com to produce a clean JSON summary.
 *
 * Fail-soft contract:
 *  - Every stage is wrapped in try/catch.
 *  - Partial enrichment is valid (e.g., description from meta-tags, no Gemini).
 *  - The top-level `enrichCompanyMeta()` NEVER throws — always returns a
 *    (possibly empty) EnrichedCompanyMeta object.
 */

import winston from "winston";
import { CompanyType, CompanySize } from "@prisma/client";

// ---------------------------------------------------------------------------
// LOGGER
// ---------------------------------------------------------------------------

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [Enrichment] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const CLEARBIT_API_BASE = "https://company.clearbit.com/v2/companies/find";
const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

/** Request timeout in ms for external HTTP calls. */
const FETCH_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface EnrichedCompanyMeta {
  /** Full logo URL (CDN or Clearbit). */
  logoUrl?: string;
  /** Short one-liner tagline from Clearbit/Gemini. */
  tagline?: string;
  /** Paragraph-length company description. */
  description?: string;
  /** Mapped Prisma CompanyType enum. */
  type?: CompanyType;
  /** Mapped Prisma CompanySize enum. */
  size?: CompanySize;
  /** Industry string (free-form, matches schema). */
  industry?: string;
  /** Approximate headcount. */
  totalEmployees?: number;
}

// ---------------------------------------------------------------------------
// UTILITIES
// ---------------------------------------------------------------------------

/**
 * Wraps a native fetch with an AbortController timeout.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Maps a Clearbit `metrics.employeesRange` string (e.g. "51-250") to a
 * Prisma `CompanySize` enum value.
 */
function mapClearbitSizeToEnum(range: string | undefined): CompanySize | undefined {
  if (!range) return undefined;
  const parts = range.split("-").map(Number);
  const upper = parts[1] ?? parts[0];
  if (upper <= 10) return CompanySize.SOLO;
  if (upper <= 50) return CompanySize.SMALL;
  if (upper <= 500) return CompanySize.MEDIUM;
  if (upper <= 5000) return CompanySize.LARGE;
  return CompanySize.ENTERPRISE;
}

/**
 * Converts a Clearbit `type` value to a Prisma `CompanyType` enum.
 * Clearbit types: "private", "public", "non_profit", "government", "education"
 */
function mapClearbitTypeToEnum(clearbitType: string | undefined): CompanyType | undefined {
  if (!clearbitType) return undefined;
  const t = clearbitType.toLowerCase();
  if (t === "public") return CompanyType.ENTERPRISE;
  if (t === "private") return CompanyType.PRODUCT_BASED;
  return undefined;
}

/**
 * Parses a minimal HTML string and extracts key meta-tag content via simple
 * regex matching (no DOM parser dependency — keep it dependency-free).
 */
function extractMetaTags(html: string): {
  description?: string;
  title?: string;
  imageUrl?: string;
} {
  const getContent = (regex: RegExp): string | undefined => {
    const m = html.match(regex);
    return m?.[1]?.trim() || undefined;
  };

  const description =
    getContent(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
    getContent(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i) ||
    getContent(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    getContent(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
    getContent(/<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i);

  const title =
    getContent(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    getContent(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
    getContent(/<title>([^<]+)<\/title>/i);

  const imageUrl =
    getContent(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    getContent(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

  return { description, title, imageUrl };
}

/**
 * Attempts to map a Gemini-returned JSON `companySize` string to a Prisma
 * `CompanySize` enum. Returns undefined if unmappable.
 */
function mapGeminiSize(raw: string | undefined): CompanySize | undefined {
  if (!raw) return undefined;
  const v = raw.toUpperCase().trim() as keyof typeof CompanySize;
  return Object.values(CompanySize).includes(v as CompanySize)
    ? (v as CompanySize)
    : undefined;
}

/**
 * Attempts to map a Gemini-returned JSON `companyType` string to a Prisma
 * `CompanyType` enum. Returns undefined if unmappable.
 */
function mapGeminiType(raw: string | undefined): CompanyType | undefined {
  if (!raw) return undefined;
  const v = raw.toUpperCase().trim() as keyof typeof CompanyType;
  return Object.values(CompanyType).includes(v as CompanyType)
    ? (v as CompanyType)
    : undefined;
}

// ---------------------------------------------------------------------------
// STAGE 1 — CLEARBIT COMPANY API
// ---------------------------------------------------------------------------

/**
 * Fetches metadata from the Clearbit Company API.
 * Only executes when CLEARBIT_API_KEY is set.
 * Returns null on any failure or when key is absent.
 */
async function fetchFromClearbit(domain: string): Promise<EnrichedCompanyMeta | null> {
  const apiKey = process.env.CLEARBIT_API_KEY;
  if (!apiKey) {
    logger.debug(`[Clearbit] Skipped — CLEARBIT_API_KEY not set for domain "${domain}"`);
    return null;
  }

  try {
    const url = `${CLEARBIT_API_BASE}?domain=${encodeURIComponent(domain)}`;
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      },
      FETCH_TIMEOUT_MS
    );

    if (!res.ok) {
      logger.warn(`[Clearbit] Non-OK response for "${domain}": HTTP ${res.status}`);
      return null;
    }

    const data: any = await res.json();

    const meta: EnrichedCompanyMeta = {};

    if (data.logo) meta.logoUrl = data.logo;
    if (data.description) meta.description = data.description;
    if (data.tags?.[0]) meta.tagline = data.tags[0];
    if (data.category?.industry) meta.industry = data.category.industry;
    if (data.metrics?.employees) meta.totalEmployees = data.metrics.employees;

    const sizeEnum = mapClearbitSizeToEnum(data.metrics?.employeesRange);
    if (sizeEnum) meta.size = sizeEnum;

    const typeEnum = mapClearbitTypeToEnum(data.type);
    if (typeEnum) meta.type = typeEnum;

    logger.info(`[Clearbit] Enriched "${domain}" — fields: ${Object.keys(meta).join(", ")}`);
    return meta;
  } catch (err: any) {
    logger.warn(`[Clearbit] Fetch error for "${domain}": ${err?.message || String(err)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// STAGE 2 — HOMEPAGE META-TAG SCRAPER
// ---------------------------------------------------------------------------

/**
 * Fetches the company homepage and extracts meta-tag content.
 * Returns null on any failure (network error, timeout, non-HTML, etc.).
 */
async function fetchFromMetaTags(domain: string): Promise<EnrichedCompanyMeta | null> {
  try {
    const url = `https://${domain}`;
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          // Pretend to be a standard browser so sites don't block us
          "User-Agent":
            "Mozilla/5.0 (compatible; EngineersPlatformBot/1.0; +https://engineers.dev)",
          Accept: "text/html,application/xhtml+xml",
        },
      },
      FETCH_TIMEOUT_MS
    );

    if (!res.ok) {
      logger.debug(`[MetaTags] Non-OK response for "${domain}": HTTP ${res.status}`);
      return null;
    }

    // Only read the first 64 KB — enough for <head> content, avoids full body load
    const reader = res.body?.getReader();
    if (!reader) return null;

    let html = "";
    let bytesRead = 0;
    const MAX_BYTES = 64 * 1024;

    while (bytesRead < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      bytesRead += value.byteLength;
      // Stop once we've passed </head> — no need to read the entire body
      if (html.includes("</head>")) break;
    }

    reader.cancel().catch(() => {});

    const tags = extractMetaTags(html);
    if (!tags.description && !tags.title) {
      logger.debug(`[MetaTags] No useful meta tags found for "${domain}"`);
      return null;
    }

    const meta: EnrichedCompanyMeta = {};
    if (tags.description) meta.description = tags.description.slice(0, 800);
    if (tags.title) meta.tagline = tags.title.slice(0, 120);

    logger.info(`[MetaTags] Extracted meta for "${domain}" — fields: ${Object.keys(meta).join(", ")}`);
    return meta;
  } catch (err: any) {
    logger.debug(`[MetaTags] Fetch error for "${domain}": ${err?.message || String(err)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// STAGE 3 — GEMINI AI PARSER
// ---------------------------------------------------------------------------

/**
 * Calls the Gemini generative language API to produce a structured company
 * summary from the provided raw text context (meta-tag content or domain).
 *
 * Only executes when GEMINI_API_KEY is set AND key fields are still empty.
 * Returns null on any failure.
 */
async function fetchFromGemini(
  domain: string,
  contextText: string
): Promise<EnrichedCompanyMeta | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.debug(`[Gemini] Skipped — GEMINI_API_KEY not set for domain "${domain}"`);
    return null;
  }

  const prompt = `You are a company metadata extractor. Given the following text about a company (domain: ${domain}), extract and return ONLY a valid JSON object with these keys:
- "tagline": a one-sentence (max 120 chars) marketing tagline
- "description": a 2-3 sentence description of what the company does
- "companyType": one of STARTUP, PRODUCT_BASED, SERVICE_BASED, ENTERPRISE, MNC, OTHER
- "companySize": one of SOLO, SMALL, MEDIUM, LARGE, ENTERPRISE
- "industry": a concise industry label (e.g. "Software", "Fintech", "Healthcare")

If you cannot determine a field with confidence, omit it from the JSON.
Return ONLY the raw JSON object, no markdown fences, no explanation.

Company context:
${contextText.slice(0, 1200)}`;

  try {
    const url = `${GEMINI_API_BASE}?key=${apiKey}`;
    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 256,
          },
        }),
      },
      8_000 // Gemini can be slower — give it 8s
    );

    if (!res.ok) {
      logger.warn(`[Gemini] Non-OK response for "${domain}": HTTP ${res.status}`);
      return null;
    }

    const body: any = await res.json();
    const rawText: string =
      body?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!rawText) {
      logger.debug(`[Gemini] Empty response for "${domain}"`);
      return null;
    }

    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);

    const meta: EnrichedCompanyMeta = {};
    if (typeof parsed.tagline === "string") meta.tagline = parsed.tagline.slice(0, 120);
    if (typeof parsed.description === "string") meta.description = parsed.description.slice(0, 800);

    const sizeEnum = mapGeminiSize(parsed.companySize);
    if (sizeEnum) meta.size = sizeEnum;

    const typeEnum = mapGeminiType(parsed.companyType);
    if (typeEnum) meta.type = typeEnum;

    if (typeof parsed.industry === "string") meta.industry = parsed.industry;

    logger.info(`[Gemini] Enriched "${domain}" — fields: ${Object.keys(meta).join(", ")}`);
    return meta;
  } catch (err: any) {
    logger.warn(`[Gemini] Error for "${domain}": ${err?.message || String(err)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// MAIN ENRICHMENT FUNCTION
// ---------------------------------------------------------------------------

/**
 * Runs the 3-stage enrichment pipeline for a given company domain.
 *
 * Stages:
 *  1. Clearbit Company API (if CLEARBIT_API_KEY is set)
 *  2. Homepage meta-tag scraper
 *  3. Gemini AI parser (if GEMINI_API_KEY is set AND description/tagline still empty)
 *
 * Merges results across stages: later-stage fields only fill in gaps left by
 * earlier stages (never overwrite a field already set).
 *
 * @param domain - e.g. "stripe.com" — no protocol prefix
 * @returns A (possibly empty) EnrichedCompanyMeta object. Never throws.
 */
export async function enrichCompanyMeta(domain: string): Promise<EnrichedCompanyMeta> {
  const merged: EnrichedCompanyMeta = {};

  try {
    // STAGE 1 — Clearbit
    const clearbit = await fetchFromClearbit(domain);
    if (clearbit) {
      Object.assign(merged, clearbit);
    }

    // Check if we still need critical fields
    const needsDescription = !merged.description;
    const needsTagline = !merged.tagline;
    const needsSize = !merged.size;

    if (needsDescription || needsTagline || needsSize) {
      // STAGE 2 — Meta-tag scraper
      const metaTags = await fetchFromMetaTags(domain);
      if (metaTags) {
        if (needsDescription && metaTags.description) merged.description = metaTags.description;
        if (needsTagline && metaTags.tagline) merged.tagline = metaTags.tagline;
        // logoUrl from meta-tags (og:image) is a bonus — only use as fallback
        if (!merged.logoUrl && metaTags.logoUrl) merged.logoUrl = metaTags.logoUrl;
      }

      // Still missing description or tagline? Try Gemini
      const stillNeedsText = !merged.description || !merged.tagline;
      if (stillNeedsText) {
        const contextText = [
          merged.description || "",
          merged.tagline || "",
          `Domain: ${domain}`,
        ]
          .filter(Boolean)
          .join("\n");

        const gemini = await fetchFromGemini(domain, contextText);
        if (gemini) {
          if (!merged.description && gemini.description) merged.description = gemini.description;
          if (!merged.tagline && gemini.tagline) merged.tagline = gemini.tagline;
          if (!merged.size && gemini.size) merged.size = gemini.size;
          if (!merged.type && gemini.type) merged.type = gemini.type;
          if (!merged.industry && gemini.industry) merged.industry = gemini.industry;
        }
      }
    }

    const fieldCount = Object.keys(merged).length;
    logger.info(
      `[Enrichment] Completed for "${domain}" — ${fieldCount} field(s) enriched: ${Object.keys(merged).join(", ") || "none"}`
    );
  } catch (err: any) {
    // This outer catch should never fire since each stage handles its own errors.
    // It exists purely as a safety net.
    logger.error(`[Enrichment] Unexpected error for "${domain}": ${err?.message || String(err)}`);
  }

  return merged;
}
