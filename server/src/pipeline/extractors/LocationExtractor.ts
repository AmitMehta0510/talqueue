import type { StructuredLocation } from "../interfaces/ParsedJob";
import type { Extracted } from "../interfaces/ExtractionResult";

// ── Country data ──────────────────────────────────────────────────────────────

const COUNTRY_CODES: Record<string, string> = {
  // Major markets
  india: "IN", "united states": "US", usa: "US", "united kingdom": "UK",
  uk: "UK", germany: "DE", france: "FR", canada: "CA", australia: "AU",
  singapore: "SG", netherlands: "NL", sweden: "SE", norway: "NO",
  denmark: "DK", finland: "FI", switzerland: "CH", austria: "AT",
  spain: "ES", italy: "IT", poland: "PL", czech: "CZ", romania: "RO",
  ukraine: "UA", israel: "IL", uae: "AE", "united arab emirates": "AE",
  japan: "JP", "south korea": "KR", korea: "KR", china: "CN",
  brazil: "BR", mexico: "MX", argentina: "AR", colombia: "CO",
  portugal: "PT", belgium: "BE", ireland: "IE", "new zealand": "NZ",
  philippines: "PH", indonesia: "ID", malaysia: "MY", thailand: "TH",
  vietnam: "VN", bangladesh: "BD", pakistan: "PK", nigeria: "NG",
  kenya: "KE", "south africa": "ZA",
};

// Major Indian cities — expanded (currently only 17 in the old scraper)
const INDIA_CITIES = new Set([
  "bengaluru", "bangalore", "mumbai", "delhi", "new delhi", "hyderabad",
  "pune", "chennai", "kolkata", "noida", "gurgaon", "gurugram", "kochi",
  "coimbatore", "trivandrum", "thiruvananthapuram", "ahmedabad", "jaipur",
  "indore", "bhopal", "lucknow", "chandigarh", "nagpur", "surat",
  "vadodara", "agra", "visakhapatnam", "vijayawada", "mysuru", "mysore",
  "mangalore", "hubli", "belgaum", "bellary", "shimla", "dehradun",
  "guwahati", "bhubaneswar", "patna", "ranchi", "raipur", "jodhpur",
]);

const INDIA_STATES: Record<string, string> = {
  bengaluru: "Karnataka", bangalore: "Karnataka", mysuru: "Karnataka",
  mumbai: "Maharashtra", pune: "Maharashtra", nagpur: "Maharashtra",
  hyderabad: "Telangana", delhi: "Delhi", "new delhi": "Delhi",
  noida: "Uttar Pradesh", gurgaon: "Haryana", gurugram: "Haryana",
  kochi: "Kerala", trivandrum: "Kerala", thiruvananthapuram: "Kerala",
  chennai: "Tamil Nadu", coimbatore: "Tamil Nadu",
  ahmedabad: "Gujarat", surat: "Gujarat", vadodara: "Gujarat",
  kolkata: "West Bengal", jaipur: "Rajasthan", indore: "Madhya Pradesh",
  bhopal: "Madhya Pradesh", lucknow: "Uttar Pradesh",
  chandigarh: "Punjab", bhubaneswar: "Odisha", guwahati: "Assam",
};

/**
 * LocationExtractor — Stage 3d of the extraction pipeline.
 *
 * Produces a StructuredLocation from:
 *   1. The ATS-provided location string (most reliable source)
 *   2. Full text scanning for visa/relocation/remote signals
 *
 * Decomposes: "Bengaluru, Karnataka, India (Hybrid)" →
 *   { city: "Bengaluru", state: "Karnataka", country: "India", countryCode: "IN", isHybrid: true }
 */
export class LocationExtractor {
  extract(atsLocation: string | null | undefined, fullText: string): Extracted<StructuredLocation> {
    const raw = atsLocation?.trim() || "";
    const lower = raw.toLowerCase();
    const fullLower = fullText.slice(0, 3000).toLowerCase();

    // ── Work mode signals ─────────────────────────────────────────────────
    const isRemote =
      /\b(remote|anywhere|distributed|fully\s+remote|remote[-\s]first|work\s+from\s+home|wfh)\b/i.test(lower) ||
      (/\b(remote|anywhere|fully\s+remote|remote[-\s]first|work\s+from\s+home)\b/i.test(fullLower) &&
        !/\b(not\s+remote|no\s+remote|on[-\s]site\s+required)\b/i.test(fullLower));

    const isHybrid =
      /\bhybrid\b/i.test(lower) ||
      (/\bhybrid\b/i.test(fullLower) &&
        !/\b(not\s+hybrid|fully\s+remote|fully\s+onsite)\b/i.test(fullLower));

    const isOnsite =
      !isRemote && !isHybrid &&
      (/\b(on[-\s]?site|in[-\s]?office|in[-\s]?person|onsite)\b/i.test(lower) ||
        !isRemote);

    // ── Country detection ─────────────────────────────────────────────────
    let countryCode: string | null = null;
    let country: string | null = null;

    for (const [name, code] of Object.entries(COUNTRY_CODES)) {
      if (lower.includes(name) || fullLower.slice(0, 500).includes(name)) {
        countryCode = code;
        country = name.replace(/\b\w/g, (c) => c.toUpperCase());
        break;
      }
    }

    // ── India-specific decomposition ──────────────────────────────────────
    let city: string | null = null;
    let state: string | null = null;

    if (countryCode === "IN" || this.looksIndian(lower)) {
      countryCode = countryCode || "IN";
      country = country || "India";

      for (const cityName of INDIA_CITIES) {
        if (lower.includes(cityName)) {
          city = cityName.replace(/\b\w/g, (c) => c.toUpperCase());
          state = INDIA_STATES[cityName] || null;
          break;
        }
      }
    }

    // ── Generic city extraction from "City, Country" patterns ─────────────
    if (!city) {
      const cityMatch = raw.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*/);
      if (cityMatch) {
        city = cityMatch[1];
      }
    }

    // ── Remote countries (e.g., "Remote - US/Canada only") ────────────────
    const remoteCountries: string[] = [];
    const remoteCountryMatch = fullText.match(
      /remote\s*[-–:]\s*((?:[A-Z]{2}|[A-Z][a-z]+)(?:\s*[/,&+]\s*(?:[A-Z]{2}|[A-Z][a-z]+))*)/i,
    );
    if (remoteCountryMatch) {
      const parts = remoteCountryMatch[1].split(/\s*[/,&+]\s*/);
      for (const part of parts) {
        const code = COUNTRY_CODES[part.toLowerCase()] || (part.length === 2 ? part.toUpperCase() : null);
        if (code) remoteCountries.push(code);
      }
    }

    // ── Visa sponsorship ──────────────────────────────────────────────────
    const visaSponsorship = this.extractBooleanSignal(fullLower, [
      { positive: /\bvisa\s+sponsorship\s+(?:available|provided|offered)\b/i, negative: /\bno\s+visa\s+sponsorship\b|visa\s+sponsorship\s+(?:not|cannot|is\s+not)\b/i },
    ]);

    // ── Relocation assistance ─────────────────────────────────────────────
    const relocationAssistance = this.extractBooleanSignal(fullLower, [
      { positive: /\brelocation\s+(?:assistance|package|support|help)\s+(?:available|provided|offered)\b/i, negative: /\bno\s+relocation\b|relocation\s+(?:not|cannot|is\s+not)\b/i },
    ]);

    const location: StructuredLocation = {
      raw,
      city,
      state,
      country,
      countryCode,
      isRemote,
      isHybrid,
      isOnsite,
      remoteCountries,
      visaSponsorship,
      relocationAssistance,
    };

    const confidence = raw ? 0.85 : 0.4;

    return {
      value: location,
      confidence,
      source: "regex",
      raw,
    };
  }

  private looksIndian(lower: string): boolean {
    for (const city of INDIA_CITIES) {
      if (lower.includes(city)) return true;
    }
    return lower.includes("india") || lower.includes(" in,") || lower.endsWith(",in");
  }

  private extractBooleanSignal(
    text: string,
    signals: Array<{ positive: RegExp; negative: RegExp }>,
  ): boolean | null {
    for (const { positive, negative } of signals) {
      if (negative.test(text)) return false;
      if (positive.test(text)) return true;
    }
    return null;
  }
}
