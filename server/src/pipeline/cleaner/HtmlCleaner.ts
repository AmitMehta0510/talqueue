import * as cheerio from "cheerio";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CheerioRoot = ReturnType<typeof cheerio.load>;

export interface CleanedHtml {
  /** Tag-stripped plain text with meaningful line breaks preserved. */
  plainText: string;

  /**
   * Whitespace-normalized, contraction-expanded version of plainText.
   * Used as the primary search corpus for all extractors.
   */
  normalizedText: string;

  /** Cheerio DOM instance for structured element access by section parsers. */
  $: CheerioRoot;
}

/**
 * HtmlCleaner — Stage 1 of the extraction pipeline.
 *
 * Uses Cheerio's DOM parser (not regex) for correct HTML handling.
 * Preserves structural semantics (bullet points, headings, paragraphs)
 * while eliminating all tags, scripts, styles, and noise.
 */
export class HtmlCleaner {
  /**
   * Clean raw ATS HTML into a structured plain-text result.
   * Returns the Cheerio DOM for downstream structural parsing.
   */
  clean(html: string): CleanedHtml {
    if (!html?.trim()) {
      return { plainText: "", normalizedText: "", $: cheerio.load("") };
    }

    const $ = cheerio.load(html);

    // ── Remove noise elements ────────────────────────────────────────────────
    $("script, style, meta, head, noscript, iframe, svg, path, img").remove();

    // ── Inject structural newlines BEFORE stripping tags ────────────────────
    // This preserves meaning: paragraphs, list items, and heading breaks.
    $("br").replaceWith("\n");
    $("p, div, section, article, main, aside").each((_i: number, el: any) => {
      $(el).before("\n").after("\n");
    });
    $("li").each((_i: number, el: any) => {
      const text = $(el).text().trim();
      if (text) $(el).replaceWith(`\n• ${text}`);
    });
    $("h1, h2, h3, h4, h5, h6").each((_i: number, el: any) => {
      const text = $(el).text().trim();
      if (text) $(el).replaceWith(`\n\n${text}\n`);
    });

    // ── Extract plain text ───────────────────────────────────────────────────
    const rawText = $.text();

    // ── Normalize whitespace ─────────────────────────────────────────────────
    const plainText = rawText
      .replace(/[ \t]+/g, " ")         // collapse horizontal whitespace
      .replace(/\n{4,}/g, "\n\n\n")    // max 3 newlines
      .replace(/^\s+|\s+$/gm, "")      // trim each line
      .trim();

    // ── Normalize text for NLP extraction ───────────────────────────────────
    const normalizedText = this.normalize(plainText);

    return { plainText, normalizedText, $: cheerio.load(html) };
  }

  /**
   * Apply NLP normalization: expand contractions, normalize punctuation,
   * and collapse excess whitespace.
   */
  private normalize(text: string): string {
    return text
      .replace(/you'll/gi, "you will")
      .replace(/you're/gi, "you are")
      .replace(/you've/gi, "you have")
      .replace(/you'd/gi, "you would")
      .replace(/we'll/gi, "we will")
      .replace(/we're/gi, "we are")
      .replace(/we've/gi, "we have")
      .replace(/it's/gi, "it is")
      .replace(/don't/gi, "do not")
      .replace(/can't/gi, "cannot")
      .replace(/won't/gi, "will not")
      .replace(/isn't/gi, "is not")
      .replace(/aren't/gi, "are not")
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/–|—/g, "-")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  /**
   * Extract bullet items from a plain-text section body.
   * Handles: •, -, *, and numbered lists (1. 2. etc.)
   */
  static extractBullets(text: string): string[] {
    const lines = text.split("\n");
    const bullets: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/^[•\-\*▸▶◆◉○●]?\s*(\d+\.\s+)?(.{10,})/);
      if (match) {
        const content = (match[2] || match[0]).trim();
        if (content.length >= 10 && content.length <= 500) {
          bullets.push(content);
        }
      }
    }
    return bullets;
  }

  /**
   * Extract paragraph-length blocks from a plain-text section body.
   * Paragraphs are blocks with > 60 chars that are not bullets.
   */
  static extractParagraphs(text: string): string[] {
    return text
      .split(/\n{2,}/)
      .map((p) => p.replace(/\n/g, " ").trim())
      .filter(
        (p) =>
          p.length > 60 &&
          p.length < 1000 &&
          !/^[•\-\*▸▶◆◉○●]/.test(p) &&
          !/^\d+\./.test(p),
      );
  }
}
