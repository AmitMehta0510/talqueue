import type { ParsedJob, CategorizedSkill, ExperienceRequirement } from "../interfaces/ParsedJob";
import type { ConfidenceReport } from "../confidence/ConfidenceScorer";

/**
 * LLM Fallback Gate — Stage 5 of the extraction pipeline.
 *
 * Cost-controlled LLM invocation for jobs that deterministic parsing couldn't
 * extract with sufficient confidence.
 *
 * Cost model (with default limits):
 *   - GPT-4o-mini: ~$0.00091 per call (4500 tokens avg)
 *   - 500 calls/day × $0.00091 = ~$0.46/day = ~$14/month
 *   - LLM is invoked for only ~5-10% of jobs
 *
 * The gate checks:
 *   1. Daily call limit (hard budget cap)
 *   2. Whether the confidence report flags the job as needing LLM review
 *
 * If the gate is closed (budget exhausted), the job is flagged with
 * needsLLMReview = true in the final output for later async processing.
 */

interface LLMResponse {
  skills?: string[];
  responsibilities?: string[];
  requirements?: string[];
  benefits?: string[];
  experience?: { minYears: number | null; maxYears: number | null; label: string };
  salary?: { min: number; max: number | null; currency: string } | null;
}

export interface LLMFallbackGateOptions {
  /** Daily hard limit for LLM calls. Default: 500 */
  dailyLimit?: number;

  /** LLM provider: 'openai' | 'anthropic'. Default: 'openai' */
  provider?: "openai" | "anthropic";

  /** API key for the LLM provider. Required when not using environment variable. */
  apiKey?: string;

  /** Model to use. Default: 'gpt-4o-mini' (cheapest quality model) */
  model?: string;
}

export class LLMFallbackGate {
  private dailyCallCount = 0;
  private dailyResetTime = Date.now();
  private readonly dailyLimit: number;
  private readonly provider: "openai" | "anthropic";
  private readonly model: string;
  private readonly apiKey: string;

  constructor(options: LLMFallbackGateOptions = {}) {
    this.dailyLimit = options.dailyLimit ?? 500;
    this.provider = options.provider ?? "openai";
    this.model = options.model ?? "gpt-4o-mini";
    this.apiKey =
      options.apiKey ??
      process.env.OPENAI_API_KEY ??
      process.env.ANTHROPIC_API_KEY ??
      "";
  }

  /**
   * Returns true if the LLM gate is open for this job.
   * The gate closes when the daily budget is exhausted.
   */
  isOpen(report: ConfidenceReport): boolean {
    this.resetDailyCounterIfNeeded();
    if (!report.needsLLMReview) return false;
    if (!this.apiKey) return false;
    return this.dailyCallCount < this.dailyLimit;
  }

  /**
   * Enhance a partially-parsed job using the LLM.
   * Only called when isOpen() returns true.
   *
   * Builds a targeted prompt that asks ONLY for the low-confidence fields —
   * never re-extracts high-confidence fields (cost optimization).
   */
  async enhance(
    parsed: Partial<ParsedJob>,
    report: ConfidenceReport,
    plainText: string,
  ): Promise<Partial<ParsedJob>> {
    if (!this.isOpen(report)) return parsed;

    this.dailyCallCount++;

    const fieldsToExtract = report.lowConfidenceFields;
    const prompt = this.buildPrompt(
      plainText.slice(0, 4000),
      fieldsToExtract,
    );

    try {
      const raw = await this.callLLM(prompt);
      return this.mergeResults(parsed, raw, fieldsToExtract);
    } catch (err: any) {
      console.warn("[LLM Fallback] Failed, using deterministic result:", err?.message ?? err);
      return parsed;
    }
  }

  /** Current daily call count — for monitoring dashboards. */
  get currentDailyUsage(): number {
    return this.dailyCallCount;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private resetDailyCounterIfNeeded(): void {
    if (Date.now() - this.dailyResetTime > 86_400_000) {
      this.dailyCallCount = 0;
      this.dailyResetTime = Date.now();
    }
  }

  private buildPrompt(text: string, fields: string[]): string {
    const fieldInstructions = fields
      .map((f) => {
        switch (f) {
          case "skills":
            return `"requiredSkills": ["Technology1", "Technology2"] — exact tech names only, no soft skills`;
          case "responsibilities":
            return `"responsibilities": ["bullet1", "bullet2"] — max 10 items, each < 150 chars`;
          case "experience":
            return `"experience": {"minYears": number|null, "maxYears": number|null, "label": "Entry Level|Mid Level|Senior|Staff / Principal|Director+|Unknown"}`;
          case "sections":
            return `"requirements": ["req1", "req2"] — list of requirements, max 10 items`;
          default:
            return `"${f}": extracted value or null`;
        }
      })
      .join(",\n  ");

    return `You are a precise job description parser. Extract ONLY the following fields as valid JSON:

{
  ${fieldInstructions}
}

Rules:
- Return ONLY the JSON object, no explanation
- For skills: include ONLY technology/tool names (languages, frameworks, databases, cloud services)
- Do NOT include soft skills like "communication" or "teamwork"
- If a field is not mentioned, return null or an empty array
- Do NOT invent or hallucinate information not present in the text

Job Description:
${text}`;
  }

  private async callLLM(prompt: string): Promise<LLMResponse> {
    if (this.provider === "openai") {
      return this.callOpenAI(prompt);
    }
    return this.callAnthropic(prompt);
  }

  private async callOpenAI(prompt: string): Promise<LLMResponse> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1, // Low temperature for deterministic extraction
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content ?? "{}";
    return JSON.parse(content) as LLMResponse;
  }

  private async callAnthropic(prompt: string): Promise<LLMResponse> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model || "claude-haiku-4-5",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json() as any;
    const content = data.content?.[0]?.text ?? "{}";
    // Strip markdown code blocks if present
    const cleaned = content.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(cleaned) as LLMResponse;
  }

  private mergeResults(
    parsed: Partial<ParsedJob>,
    llm: LLMResponse,
    fields: string[],
  ): Partial<ParsedJob> {
    const result = { ...parsed };

    // Only merge fields that were requested AND are present in the LLM response
    if (fields.includes("skills") && llm.skills?.length) {
      const llmSkills: CategorizedSkill[] = llm.skills.map((s) => ({
        name: s,
        raw: s,
        category: "Other" as const,
        isRequired: true,
        confidence: 0.85,
      }));
      result.requiredSkills = {
        value: [
          ...(parsed.requiredSkills?.value ?? []),
          ...llmSkills.filter(
            (ls) => !parsed.requiredSkills?.value?.some((ps) => ps.name === ls.name),
          ),
        ],
        confidence: 0.85,
        source: "llm",
      };
    }

    if (fields.includes("responsibilities") && llm.responsibilities?.length) {
      result.responsibilities = {
        value: llm.responsibilities,
        confidence: 0.85,
        source: "llm",
      };
    }

    if (fields.includes("experience") && llm.experience) {
      result.experience = {
        value: {
          minYears: llm.experience.minYears,
          maxYears: llm.experience.maxYears,
          label: llm.experience.label,
          signals: ["llm_extracted"],
        },
        confidence: 0.82,
        source: "llm",
      };
    }

    return result;
  }
}
