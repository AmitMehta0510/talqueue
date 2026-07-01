import * as cheerio from "cheerio";
import type { SectionMap, SectionType, Section } from "../interfaces/SectionMap";
import { HtmlCleaner } from "../cleaner/HtmlCleaner";

// Use ReturnType to get the correct cheerio API type
type CheerioRoot = ReturnType<typeof cheerio.load>;

// ─── Heading prototype patterns ────────────────────────────────────────────────
const SECTION_PROTOTYPES: Record<SectionType, string[]> = {
  responsibilities: [
    "responsibilities", "key responsibilities", "core responsibilities",
    "what you will do", "what you'll do", "your role", "in this role",
    "about the role", "the role", "key tasks", "day-to-day", "day to day",
    "your day", "expectations", "what we expect", "you will be",
    "what you'll be doing", "what you'll build", "what you will build",
    "your impact", "how you'll make an impact", "how you will make an impact",
    "success looks like", "the opportunity", "what excites you",
    "your first 90 days", "in your first", "what you'll own",
    "what you will own", "you'll be responsible", "you will be responsible",
    "what does this role involve", "what this role involves",
  ],
  requirements: [
    "requirements", "qualifications", "basic qualifications",
    "minimum qualifications", "what we look for", "what we're looking for",
    "who you are", "must have", "required", "skills required",
    "skills and experience", "your background", "about you", "what you bring",
    "you'll need", "you will need", "you should have", "you should know",
    "ideal candidate", "who we're looking for", "who were looking for",
    "the ideal candidate", "what you need", "what you need to bring",
    "your qualifications", "essential skills", "essential requirements",
    "experience required", "technical requirements",
  ],
  preferred_qualifications: [
    "preferred qualifications", "preferred experience", "preferred",
    "nice to have", "nice-to-have", "bonus", "bonus points", "plus if",
    "it would be great", "ideally", "strong plus", "desirable", "advantageous",
    "would love",
  ],
  benefits: [
    "benefits", "perks", "perks and benefits", "compensation and benefits",
    "what we offer", "why join", "why join us", "we offer", "total rewards",
    "total compensation", "package", "salary and benefits", "life at",
    "why work here", "our culture", "working here", "what makes us different",
    "our benefits", "employee benefits", "company perks",
  ],
  compensation: [
    "compensation", "salary", "pay", "remuneration", "base salary",
    "total comp", "equity", "stock", "rsu", "cash compensation",
  ],
  about_company: [
    "about us", "about the company", "about", "company overview",
    "our mission", "who we are", "our story",
  ],
  about_role: [
    "about the role", "the position", "about this position",
    "position overview", "role overview", "job summary", "overview",
    "job description", "the job", "about the position",
  ],
  intro: ["introduction", "summary", "position summary"],
  first_90_days: [
    "first 90 days", "first 30 days", "first 60 days", "your first 90",
    "your first 30", "onboarding",
  ],
  tech_stack: [
    "tech stack", "technologies", "tools and technologies", "tools we use",
    "our stack", "technology stack", "engineering tools", "systems",
  ],
  education: [
    "education", "educational requirements", "academic", "degree",
    "certifications",
  ],
  interview_process: [
    "interview", "interview process", "hiring process", "how we hire",
    "our process", "selection process",
  ],
  unknown: [],
};

/**
 * SemanticSectionParser — Stage 2 of the extraction pipeline.
 *
 * Classifies job description headings using a 2-tier strategy:
 *   Tier A (exact substring, confidence 0.95)
 *   Tier B (Jaccard token-overlap, confidence 0.3-0.75)
 */
export class SemanticSectionParser {
  parse($: CheerioRoot, plainText: string): SectionMap {
    const sections: SectionMap = new Map();

    const headingSelector = "h1, h2, h3, h4, h5";
    const headingElements = $(headingSelector).toArray();

    for (let i = 0; i < headingElements.length; i++) {
      const headingEl = headingElements[i];
      const headingText = $(headingEl).text().trim();
      if (!headingText || headingText.length > 100) continue;

      const bodyHtml = this.extractBodyHtml($, headingEl, headingElements[i + 1]);
      const bodyText = this.htmlToText(bodyHtml);
      if (!bodyText || bodyText.length < 5) continue;

      const { type, confidence } = this.classifyHeading(headingText);
      this.addSection(sections, type, {
        type,
        heading: headingText,
        body: bodyText,
        confidence,
        bullets: HtmlCleaner.extractBullets(bodyText),
        paragraphs: HtmlCleaner.extractParagraphs(bodyText),
      });
    }

    // Extract intro (content before first heading)
    const firstHeadingIdx = plainText.search(/\n[A-Z][^\n]{2,80}\n/);
    if (firstHeadingIdx > 100) {
      const introText = plainText.slice(0, firstHeadingIdx).trim();
      if (introText) {
        this.addSection(sections, "intro", {
          type: "intro",
          heading: "Introduction",
          body: introText,
          confidence: 1.0,
          bullets: HtmlCleaner.extractBullets(introText),
          paragraphs: HtmlCleaner.extractParagraphs(introText),
        });
      }
    }

    // Fallback — if no sections detected, put everything in intro
    if (sections.size === 0) {
      this.addSection(sections, "intro", {
        type: "intro",
        heading: "Full Description",
        body: plainText,
        confidence: 0.5,
        bullets: HtmlCleaner.extractBullets(plainText),
        paragraphs: HtmlCleaner.extractParagraphs(plainText),
      });
    }

    return sections;
  }

  classifyHeading(heading: string): { type: SectionType; confidence: number } {
    const h = heading.toLowerCase().trim();

    // Tier A: exact substring matching
    for (const [type, patterns] of Object.entries(SECTION_PROTOTYPES)) {
      if (type === "unknown") continue;
      for (const pattern of patterns) {
        if (h.includes(pattern) || pattern.includes(h)) {
          return { type: type as SectionType, confidence: 0.95 };
        }
      }
    }

    // Tier B: Jaccard token-overlap
    const headingTokens = this.tokenize(h);
    if (headingTokens.size === 0) return { type: "unknown", confidence: 0 };

    let bestType: SectionType = "unknown";
    let bestScore = 0;

    for (const [type, patterns] of Object.entries(SECTION_PROTOTYPES)) {
      if (type === "unknown") continue;
      for (const pattern of patterns) {
        const patternTokens = this.tokenize(pattern);
        const score = this.jaccard(headingTokens, patternTokens);
        if (score > bestScore) {
          bestScore = score;
          bestType = type as SectionType;
        }
      }
    }

    if (bestScore >= 0.25) {
      return { type: bestType, confidence: Math.min(0.75, bestScore + 0.1) };
    }

    return { type: "unknown", confidence: 0 };
  }

  private addSection(map: SectionMap, type: SectionType, section: Section): void {
    if (!map.has(type)) map.set(type, []);
    map.get(type)!.push(section);
  }

  /**
   * Extract the HTML body between two heading elements.
   * Uses any type for cheerio element to remain compatible with cheerio 1.x.
   */
  private extractBodyHtml($: CheerioRoot, headingEl: any, nextHeadingEl?: any): string {
    const parts: string[] = [];
    let current = $(headingEl).next().get(0);

    while (current) {
      if (nextHeadingEl && current === nextHeadingEl) break;
      const tagName = (current as any).tagName?.toLowerCase();
      if (tagName && /^h[1-5]$/.test(tagName)) break;
      parts.push($.html(current as any) || "");
      current = $(current as any).next().get(0);
    }

    return parts.join("\n");
  }

  private htmlToText(html: string): string {
    const $ = cheerio.load(html);
    $("script, style").remove();
    $("li").each((_i: number, el: any) => {
      $(el).before("• ");
      $(el).after("\n");
    });
    $("br, p, div").after("\n");
    return $.text().replace(/\s{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }

  private tokenize(text: string): Set<string> {
    return new Set(
      text
        .toLowerCase()
        .split(/[\W_]+/)
        .filter((t) => t.length >= 3 && !STOP_WORDS.has(t)),
    );
  }

  private jaccard(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    const intersection = [...a].filter((t) => b.has(t)).length;
    const union = new Set([...a, ...b]).size;
    return intersection / union;
  }
}

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "that", "this", "with", "have", "will",
  "from", "you", "our", "your", "can", "what", "how", "who", "why",
  "when", "its",
]);
