import slugify from "slugify";

/**
 * Strips HTML tags and decodes common HTML entities to plain text.
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  const decoded = html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&bull;/g, "•");
  
  return decoded
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Utility function to sleep for a specified duration in milliseconds.
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Centralized function to generate slug for scraped hackathons.
 */
export function generateScraperSlug(title: string, platform: string, id: string | number): string {
  return slugify(`${title}-${platform}-${id}`, {
    lower: true,
    strict: true,
    trim: true,
  });
}

/**
 * Centralized function to calculate the hackathon status.
 */
export function calculateScraperStatus(
  startDate: Date,
  endDate: Date,
  isClosed = false,
): "COMPLETED" | "LIVE" | "OPEN" {
  const now = new Date();
  if (isClosed || now > endDate) {
    return "COMPLETED";
  }
  if (now >= startDate && now <= endDate) {
    return "LIVE";
  }
  return "OPEN";
}
