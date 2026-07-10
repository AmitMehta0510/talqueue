/**
 * @file modules/location/location.service.ts
 *
 * Location normalization service.
 *
 * Converts free-text location strings ("Bangalore", "BLR", "Bengaluru, Karnataka")
 * into a canonical, searchable Location record in the database.
 *
 * Architecture:
 *   - Uses a curated alias map for major Indian + global cities (covers 90% of
 *     engineer profiles without an external API call)
 *   - Falls back to best-effort parsing for unknown locations
 *   - Upserts into Location table by (city, state, country) unique constraint
 *
 * Future enhancement:
 *   - Integrate Google Places API or OpenStreetMap Nominatim for unknowns
 *   - Add latitude/longitude for proximity search
 */

import prisma from "shared/database/prisma";
import logger from "shared/logger";

// ─── Alias maps ───────────────────────────────────────────────────────────────

const CITY_ALIASES: Record<string, { city: string; state: string; country: string; countryName: string; timezone: string }> = {
  // India — major tech hubs
  "bangalore":       { city: "Bengaluru", state: "Karnataka", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "bengaluru":       { city: "Bengaluru", state: "Karnataka", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "blr":             { city: "Bengaluru", state: "Karnataka", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "mumbai":          { city: "Mumbai",    state: "Maharashtra", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "bombay":          { city: "Mumbai",    state: "Maharashtra", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "bom":             { city: "Mumbai",    state: "Maharashtra", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "delhi":           { city: "Delhi",     state: "Delhi", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "new delhi":       { city: "Delhi",     state: "Delhi", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "ncr":             { city: "Delhi",     state: "Delhi", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "del":             { city: "Delhi",     state: "Delhi", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "hyderabad":       { city: "Hyderabad", state: "Telangana", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "hyd":             { city: "Hyderabad", state: "Telangana", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "pune":            { city: "Pune",      state: "Maharashtra", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "pnq":             { city: "Pune",      state: "Maharashtra", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "chennai":         { city: "Chennai",   state: "Tamil Nadu", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "madras":          { city: "Chennai",   state: "Tamil Nadu", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "maa":             { city: "Chennai",   state: "Tamil Nadu", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "kolkata":         { city: "Kolkata",   state: "West Bengal", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "calcutta":        { city: "Kolkata",   state: "West Bengal", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "ahmedabad":       { city: "Ahmedabad", state: "Gujarat", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "amd":             { city: "Ahmedabad", state: "Gujarat", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "noida":           { city: "Noida",     state: "Uttar Pradesh", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "gurgaon":         { city: "Gurugram",  state: "Haryana", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "gurugram":        { city: "Gurugram",  state: "Haryana", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "kochi":           { city: "Kochi",     state: "Kerala", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "cochin":          { city: "Kochi",     state: "Kerala", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "jaipur":          { city: "Jaipur",    state: "Rajasthan", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  "india":           { city: "India",     state: "", country: "IN", countryName: "India", timezone: "Asia/Kolkata" },
  // USA
  "san francisco":   { city: "San Francisco", state: "California", country: "US", countryName: "United States", timezone: "America/Los_Angeles" },
  "sf":              { city: "San Francisco", state: "California", country: "US", countryName: "United States", timezone: "America/Los_Angeles" },
  "new york":        { city: "New York",      state: "New York",   country: "US", countryName: "United States", timezone: "America/New_York" },
  "nyc":             { city: "New York",      state: "New York",   country: "US", countryName: "United States", timezone: "America/New_York" },
  "seattle":         { city: "Seattle",       state: "Washington", country: "US", countryName: "United States", timezone: "America/Los_Angeles" },
  "austin":          { city: "Austin",        state: "Texas",      country: "US", countryName: "United States", timezone: "America/Chicago" },
  "boston":          { city: "Boston",        state: "Massachusetts", country: "US", countryName: "United States", timezone: "America/New_York" },
  // Remote
  "remote":          { city: "Remote",    state: "", country: "XX", countryName: "Remote", timezone: "" },
  "anywhere":        { city: "Remote",    state: "", country: "XX", countryName: "Remote", timezone: "" },
  "worldwide":       { city: "Remote",    state: "", country: "XX", countryName: "Remote", timezone: "" },
};

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalizes a raw location string into a canonical Location record.
 * Returns the Location id, or null if the string cannot be resolved.
 *
 * Algorithm:
 *   1. Lowercase and trim the input
 *   2. Try alias map (covers 90%+ of Indian engineer profiles)
 *   3. Try to parse "City, State" or "City, Country" patterns
 *   4. Fall back to creating a generic entry with city = raw input
 */
export async function resolveLocation(rawLocation: string): Promise<string | null> {
  if (!rawLocation?.trim()) return null;

  const raw    = rawLocation.trim();
  const lower  = raw.toLowerCase().replace(/\s+/g, " ");

  // ── 1. Alias map lookup ──────────────────────────────────────────────────────
  // Try the full string first, then just the first part before comma
  const aliasMatch = CITY_ALIASES[lower] || CITY_ALIASES[lower.split(",")[0].trim()];

  if (aliasMatch) {
    return upsertLocation({
      city:        aliasMatch.city,
      state:       aliasMatch.state || null,
      country:     aliasMatch.country,
      countryName: aliasMatch.countryName,
      displayText: buildDisplayText(aliasMatch.city, aliasMatch.state, aliasMatch.countryName),
      timezone:    aliasMatch.timezone || null,
    });
  }

  // ── 2. Parse "City, State/Country" pattern ───────────────────────────────────
  const parts = raw.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    const city  = parts[0];
    const state = parts.length === 3 ? parts[1] : null;
    const countryRaw = parts[parts.length - 1];

    // Check if last part matches a country name or code
    const countryEntry = resolveCountry(countryRaw);
    if (countryEntry) {
      return upsertLocation({
        city,
        state,
        country:     countryEntry.code,
        countryName: countryEntry.name,
        displayText: buildDisplayText(city, state, countryEntry.name),
        timezone:    null,
      });
    }
  }

  // ── 3. Fallback: store as-is with unknown country ────────────────────────────
  return upsertLocation({
    city:        raw.split(",")[0].trim(),
    state:       null,
    country:     "UN", // Unknown
    countryName: "Unknown",
    displayText: raw,
    timezone:    null,
  });
}

// ─── Upsert helper ────────────────────────────────────────────────────────────

async function upsertLocation(data: {
  city:        string;
  state:       string | null;
  country:     string;
  countryName: string;
  displayText: string;
  timezone:    string | null;
}): Promise<string | null> {
  try {
    const loc = await prisma.location.upsert({
      where:  { city_state_country: { city: data.city, state: data.state ?? "", country: data.country } },
      create: { ...data, state: data.state ?? undefined },
      update: {},
      select: { id: true },
    });
    return loc.id;
  } catch (err: any) {
    logger.warn({ err, data }, "[LocationService] Failed to upsert location");
    return null;
  }
}

function buildDisplayText(city: string, state: string | null | undefined, country: string): string {
  const parts = [city, state, country].filter(Boolean);
  return parts.join(", ");
}

// ─── Country resolver ────────────────────────────────────────────────────────

const COUNTRY_MAP: Record<string, { code: string; name: string }> = {
  "india": { code: "IN", name: "India" },
  "in":    { code: "IN", name: "India" },
  "united states": { code: "US", name: "United States" },
  "usa":   { code: "US", name: "United States" },
  "us":    { code: "US", name: "United States" },
  "uk":    { code: "GB", name: "United Kingdom" },
  "united kingdom": { code: "GB", name: "United Kingdom" },
  "germany": { code: "DE", name: "Germany" },
  "de":    { code: "DE", name: "Germany" },
  "canada": { code: "CA", name: "Canada" },
  "ca":    { code: "CA", name: "Canada" },
  "australia": { code: "AU", name: "Australia" },
  "au":    { code: "AU", name: "Australia" },
  "singapore": { code: "SG", name: "Singapore" },
  "sg":    { code: "SG", name: "Singapore" },
  "uae":   { code: "AE", name: "United Arab Emirates" },
  "dubai": { code: "AE", name: "United Arab Emirates" },
};

function resolveCountry(raw: string): { code: string; name: string } | null {
  return COUNTRY_MAP[raw.toLowerCase()] ?? null;
}

// ─── Lookup helpers ────────────────────────────────────────────────────────────

/** Fetch all distinct locations for autocomplete (city + displayText). */
export async function getLocationSuggestions(query: string, limit = 10) {
  return prisma.location.findMany({
    where: {
      OR: [
        { city:        { contains: query, mode: "insensitive" } },
        { displayText: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, city: true, state: true, country: true, displayText: true },
    take:   limit,
    orderBy: { city: "asc" },
  });
}
