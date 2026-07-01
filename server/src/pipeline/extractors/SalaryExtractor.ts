import type { SectionMap } from "../interfaces/SectionMap";
import type { SalaryRange } from "../interfaces/ParsedJob";
import type { Extracted } from "../interfaces/ExtractionResult";

/**
 * SalaryExtractor — Stage 3c of the extraction pipeline.
 *
 * Extracts salary ranges from job descriptions using multi-currency regex patterns.
 * Searches the compensation section first (if present), then falls back to
 * the first 2000 chars of the full text.
 *
 * Supports:
 *   USD:  $120,000-$180,000 | $120K-$180K | 120k USD
 *   INR:  ₹20-30 LPA | 20 to 30 LPA | INR 20L-30L | 25 LPA
 *   EUR:  €60,000 | €60K-€80K | 60,000 EUR
 *   GBP:  £50,000-£70,000 | 50k GBP
 *   CAD:  CAD 80,000-120,000
 */
export class SalaryExtractor {
  private readonly CURRENCY_PATTERNS: Array<{
    pattern: RegExp;
    currency: string;
    multiplier?: (match: string) => number;
  }> = [
    // USD: "$120,000 - $180,000" / "$120K - $180K" / "120k-180k USD"
    {
      pattern:
        /\$\s*(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?)\s*[kK]?\s*(?:[-–to]+\s*\$?\s*(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?)\s*[kK]?)?(?:\s*(?:USD|usd|per\s+year|annually|\/yr|\/year))?/g,
      currency: "USD",
    },
    // INR: "₹20 LPA" / "20-30 LPA" / "INR 20L" / "20 to 30 lakhs"
    {
      pattern:
        /(?:₹|INR\s*|Rs\.?\s*)(\d+(?:\.\d+)?)\s*(?:[-–to]+\s*(\d+(?:\.\d+)?))?(?:\s*(?:L|lac|lakh|LPA|CTC))?(?:\s*(?:per\s+annum|annually|\/year))?/gi,
      currency: "INR",
    },
    {
      pattern:
        /(\d+(?:\.\d+)?)\s*(?:[-–to]+\s*(\d+(?:\.\d+)?))?(?:\s*)(?:LPA|L\s*(?:per\s+annum|CTC|PA)|lakh(?:s)?\s+(?:per\s+annum|CTC)|lac(?:s)?\s+(?:per\s+annum|CTC))/gi,
      currency: "INR",
    },
    // EUR: "€60,000" / "€60K-€80K"
    {
      pattern:
        /€\s*(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?)\s*[kK]?(?:\s*[-–to]+\s*€?\s*(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?)\s*[kK]?)?(?:\s*(?:EUR|per\s+year|annually))?/g,
      currency: "EUR",
    },
    // GBP: "£50,000-£70,000"
    {
      pattern:
        /£\s*(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?)\s*[kK]?(?:\s*[-–to]+\s*£?\s*(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?)\s*[kK]?)?(?:\s*(?:GBP|per\s+year|annually))?/g,
      currency: "GBP",
    },
    // Bare number followed by explicit currency mention
    {
      pattern:
        /(\d{2,3}(?:,\d{3})+|\d{5,})\s*[-–to]+\s*(\d{2,3}(?:,\d{3})+|\d{5,})\s*(?:USD|CAD|AUD|SGD)/gi,
      currency: "USD", // defaults, overridden by suffix below
    },
  ];

  extract(sections: SectionMap, fullText: string): Extracted<SalaryRange | null> {
    // Search compensation section first (highest signal density)
    const compensationText = [
      ...(sections.get("compensation") ?? []),
      ...(sections.get("benefits") ?? []),
    ]
      .map((s) => s.body)
      .join("\n");

    const searchText = compensationText
      ? `${compensationText}\n${fullText.slice(0, 2000)}`
      : fullText.slice(0, 2000);

    for (const { pattern, currency } of this.CURRENCY_PATTERNS) {
      pattern.lastIndex = 0;
      const m = pattern.exec(searchText);
      if (!m) continue;

      const parsed = this.parseNumbers(m, currency, m[0]);
      if (parsed) {
        return {
          value: parsed,
          confidence: compensationText ? 0.92 : 0.78,
          source: "regex",
          raw: m[0],
        };
      }
    }

    return { value: null, confidence: 1.0, source: "regex" };
  }

  private parseNumbers(
    m: RegExpMatchArray,
    defaultCurrency: string,
    fullMatch: string,
  ): SalaryRange | null {
    const raw1 = m[1]?.replace(/,/g, "");
    if (!raw1) return null;

    const num1 = parseFloat(raw1);
    const num2 = m[2] ? parseFloat(m[2].replace(/,/g, "")) : null;

    if (isNaN(num1) || num1 <= 0) return null;

    const isK = /\d\s*[kK]/.test(fullMatch);
    const isLPA = /lpa|lakh|lac/i.test(fullMatch);

    const normalize = (v: number): number => {
      if (isK) return v * 1000;
      if (isLPA) return v * 100_000; // 1 LPA = ₹100,000
      // If number looks like thousands already (> 10000), don't multiply
      if (v < 1000 && defaultCurrency !== "INR") return v * 1000;
      return v;
    };

    // Detect explicit currency from full match
    let currency = defaultCurrency;
    if (/CAD/i.test(fullMatch)) currency = "CAD";
    else if (/AUD/i.test(fullMatch)) currency = "AUD";
    else if (/SGD/i.test(fullMatch)) currency = "SGD";
    else if (/EUR/i.test(fullMatch)) currency = "EUR";
    else if (/GBP/i.test(fullMatch)) currency = "GBP";
    else if (/USD/i.test(fullMatch)) currency = "USD";
    else if (/INR|₹|Rs\.|LPA|lakh|lac/i.test(fullMatch)) currency = "INR";

    const min = normalize(num1);
    const max = num2 ? normalize(num2) : null;

    // Sanity check: salary should be a reasonable amount
    if (min < 1000 && currency !== "INR") return null;
    if (min > 10_000_000) return null; // > 10M → likely not a salary

    return { min, max, currency, period: "annual" };
  }
}
