import type { SkillCategory } from "../interfaces/ParsedJob";

/**
 * BoundarySkillMatcher — supplementary fast-path skill extractor.
 *
 * Runs boundary-regex patterns against the full job text to catch skills that
 * the NER context-pattern approach in SkillExtractor may miss (e.g. skills
 * mentioned as standalone bullets without surrounding context verbs).
 *
 * Design intent:
 *   - Additive: results are MERGED into the NER output, never replacing it.
 *   - Word-boundary safe: all patterns use \b anchors to prevent false positives
 *     (e.g. "Java" must not match "JavaScript").
 *   - Language-specific disambiguation: ambiguous tokens like "Go", "C", "R"
 *     use tighter patterns requiring language context.
 *   - Normalized: every match maps to a canonical name via BOUNDARY_SKILL_MAP.
 *
 * Usage:
 *   const matcher = new BoundarySkillMatcher();
 *   const skills = matcher.match(fullText);  // returns CandidateSkill[]
 */

export interface BoundaryMatch {
  /** Canonical skill name, e.g. "TypeScript", "Node.js", "Kubernetes". */
  canonical: string;
  /** Raw token as it appeared in the text. */
  raw: string;
  /** Skill category for tech stack decomposition. */
  category: SkillCategory;
  /** Confidence — 0.9 for boundary patterns (high precision). */
  confidence: number;
}

// ── Boundary skill entry ──────────────────────────────────────────────────────

interface SkillEntry {
  pattern: RegExp;
  canonical: string;
  category: SkillCategory;
}

// ── Master boundary dictionary ────────────────────────────────────────────────
// Each entry uses word-boundary (\b) anchors and is tested against the full
// lowercased job text. Patterns are ordered from most-specific to least-specific
// within each category to avoid false positive category assignment.

const BOUNDARY_SKILLS: SkillEntry[] = [
  // ── Languages ──────────────────────────────────────────────────────────────
  { pattern: /\b(c\+\+|cpp|c\+\+ programming)\b/i,                  canonical: "C++",        category: "Languages" },
  { pattern: /\b(typescript|\.ts\b|tsx)\b/i,                        canonical: "TypeScript",  category: "Languages" },
  { pattern: /\b(javascript|\.js\b|ecmascript|es6|es2015)\b/i,     canonical: "JavaScript",  category: "Languages" },
  { pattern: /\b(python|\.py\b|python3)\b/i,                        canonical: "Python",      category: "Languages" },
  // "Java" — must not match "JavaScript"; use negative lookahead
  { pattern: /\bjava(?!script|\.js|x)\b/i,                          canonical: "Java",        category: "Languages" },
  { pattern: /\b(kotlin)\b/i,                                        canonical: "Kotlin",      category: "Languages" },
  { pattern: /\b(scala)\b/i,                                         canonical: "Scala",       category: "Languages" },
  // "Go" — highly ambiguous; accept "golang", "go lang", "go language", "the go language"
  { pattern: /\b(golang|go\s+lang(?:uage)?)\b/i,                    canonical: "Go",          category: "Languages" },
  // "Go" as standalone word only in clearly technical context (e.g. "written in go", "using go")
  { pattern: /\b(?:written\s+in|using|built\s+with|experience\s+(?:with|in))\s+go\b/i, canonical: "Go", category: "Languages" },
  { pattern: /\b(rust(?:\s+programming)?)\b/i,                       canonical: "Rust",        category: "Languages" },
  { pattern: /\b(swift(?:\s+programming)?)\b/i,                     canonical: "Swift",       category: "Languages" },
  { pattern: /\b(ruby(?:\s+programming)?)\b/i,                      canonical: "Ruby",        category: "Languages" },
  { pattern: /\b(php)\b/i,                                           canonical: "PHP",         category: "Languages" },
  // C# — must not match CSS/C
  { pattern: /\bc#\b|\b(?:dotnet|\.net|asp\.net|csharp)\b/i,        canonical: "C#",          category: "Languages" },
  { pattern: /\b(elixir)\b/i,                                        canonical: "Elixir",      category: "Languages" },
  { pattern: /\b(clojure)\b/i,                                       canonical: "Clojure",     category: "Languages" },
  { pattern: /\b(haskell)\b/i,                                       canonical: "Haskell",     category: "Languages" },
  { pattern: /\b(dart)\b/i,                                          canonical: "Dart",        category: "Languages" },
  { pattern: /\b(r\s+programming|r\s+language|programming\s+in\s+r)\b/i, canonical: "R",      category: "Languages" },

  // ── Frameworks / Runtimes ──────────────────────────────────────────────────
  { pattern: /\b(node\.?js|nodejs|node\s+js)\b/i,                   canonical: "Node.js",     category: "Frameworks" },
  { pattern: /\b(react\.?js|reactjs|react\s+js)\b/i,                canonical: "React",       category: "Frameworks" },
  // "React" standalone — still safe because it's a proper noun in tech context
  { pattern: /\breact\b(?!\s+native)/i,                              canonical: "React",       category: "Frameworks" },
  { pattern: /\breact\s+native\b/i,                                  canonical: "React Native", category: "Frameworks" },
  { pattern: /\b(angular(?:js)?)\b/i,                                canonical: "Angular",     category: "Frameworks" },
  { pattern: /\b(next\.?js|nextjs)\b/i,                              canonical: "Next.js",     category: "Frameworks" },
  { pattern: /\b(vue\.?js|vuejs)\b/i,                                canonical: "Vue.js",      category: "Frameworks" },
  { pattern: /\b(svelte(?:kit)?)\b/i,                                canonical: "Svelte",      category: "Frameworks" },
  { pattern: /\b(express\.?js|expressjs)\b/i,                        canonical: "Express",     category: "Frameworks" },
  { pattern: /\b(fastapi|fast\s+api)\b/i,                            canonical: "FastAPI",     category: "Frameworks" },
  { pattern: /\b(django)\b/i,                                        canonical: "Django",      category: "Frameworks" },
  { pattern: /\b(flask)\b/i,                                         canonical: "Flask",       category: "Frameworks" },
  { pattern: /\b(spring\s+boot|springboot)\b/i,                      canonical: "Spring Boot", category: "Frameworks" },
  { pattern: /\b(spring(?!\s+boot))\b/i,                             canonical: "Spring",      category: "Frameworks" },
  { pattern: /\b(nestjs|nest\.?js)\b/i,                              canonical: "NestJS",      category: "Frameworks" },
  { pattern: /\b(fastify)\b/i,                                       canonical: "Fastify",     category: "Frameworks" },
  { pattern: /\b(rails|ruby\s+on\s+rails)\b/i,                      canonical: "Ruby on Rails", category: "Frameworks" },
  { pattern: /\b(laravel)\b/i,                                       canonical: "Laravel",     category: "Frameworks" },
  { pattern: /\b(flutter)\b/i,                                       canonical: "Flutter",     category: "Frameworks" },
  { pattern: /\b(tailwind(?:css)?)\b/i,                              canonical: "TailwindCSS", category: "Frontend" },
  { pattern: /\b(graphql)\b/i,                                       canonical: "GraphQL",     category: "Frameworks" },
  { pattern: /\b(grpc|protobuf)\b/i,                                 canonical: "gRPC",        category: "Frameworks" },
  { pattern: /\b(rest(?:ful)?\s+api|openapi|swagger)\b/i,            canonical: "REST API",    category: "Frameworks" },

  // ── Databases ──────────────────────────────────────────────────────────────
  { pattern: /\b(postgresql|postgres)\b/i,                           canonical: "PostgreSQL",  category: "Databases" },
  { pattern: /\b(mysql)\b/i,                                         canonical: "MySQL",       category: "Databases" },
  { pattern: /\b(mongodb|mongo(?:\s+db)?)\b/i,                       canonical: "MongoDB",     category: "Databases" },
  { pattern: /\b(redis)\b/i,                                         canonical: "Redis",       category: "Caching" },
  { pattern: /\b(cassandra)\b/i,                                     canonical: "Cassandra",   category: "Databases" },
  { pattern: /\b(dynamodb)\b/i,                                      canonical: "DynamoDB",    category: "Databases" },
  { pattern: /\b(elasticsearch|opensearch)\b/i,                      canonical: "Elasticsearch", category: "Databases" },
  { pattern: /\b(bigquery|big\s+query)\b/i,                          canonical: "BigQuery",    category: "Databases" },
  { pattern: /\b(snowflake)\b/i,                                     canonical: "Snowflake",   category: "Databases" },
  { pattern: /\b(sqlite)\b/i,                                        canonical: "SQLite",      category: "Databases" },
  { pattern: /\b(neo4j)\b/i,                                         canonical: "Neo4j",       category: "Databases" },
  { pattern: /\b(pinecone)\b/i,                                      canonical: "Pinecone",    category: "Databases" },

  // ── Cloud ──────────────────────────────────────────────────────────────────
  { pattern: /\b(aws|amazon\s+web\s+services)\b/i,                   canonical: "AWS",         category: "Cloud" },
  { pattern: /\b(gcp|google\s+cloud)\b/i,                            canonical: "GCP",         category: "Cloud" },
  { pattern: /\b(azure|microsoft\s+azure)\b/i,                       canonical: "Azure",       category: "Cloud" },

  // ── DevOps / Infrastructure ────────────────────────────────────────────────
  { pattern: /\b(docker(?:file)?)\b/i,                               canonical: "Docker",      category: "DevOps" },
  { pattern: /\b(kubernetes|k8s|kubectl|helm)\b/i,                   canonical: "Kubernetes",  category: "DevOps" },
  { pattern: /\b(terraform)\b/i,                                     canonical: "Terraform",   category: "Infrastructure" },
  { pattern: /\b(ansible)\b/i,                                       canonical: "Ansible",     category: "Infrastructure" },
  { pattern: /\b(ci\/cd|github\s+actions|jenkins|gitlab\s+ci|circleci|travis)\b/i, canonical: "CI/CD", category: "CI_CD" },
  { pattern: /\b(kafka|apache\s+kafka)\b/i,                          canonical: "Kafka",       category: "Messaging" },
  { pattern: /\b(rabbitmq)\b/i,                                       canonical: "RabbitMQ",   category: "Messaging" },
  { pattern: /\b(airflow|apache\s+airflow)\b/i,                      canonical: "Airflow",     category: "Infrastructure" },
  { pattern: /\b(spark|apache\s+spark|pyspark)\b/i,                  canonical: "Spark",       category: "Infrastructure" },
  { pattern: /\b(nginx)\b/i,                                          canonical: "Nginx",      category: "Infrastructure" },
  { pattern: /\b(linux|unix)\b/i,                                    canonical: "Linux",       category: "OperatingSystems" },

  // ── Version Control ────────────────────────────────────────────────────────
  { pattern: /\b(git(?:hub|lab)?)\b/i,                               canonical: "Git",         category: "VersionControl" },

  // ── AI / ML ────────────────────────────────────────────────────────────────
  { pattern: /\b(tensorflow|tf\.?keras)\b/i,                         canonical: "TensorFlow",  category: "AI_ML" },
  { pattern: /\b(pytorch|torch)\b/i,                                  canonical: "PyTorch",    category: "AI_ML" },
  { pattern: /\b(langchain|langgraph)\b/i,                            canonical: "LangChain",  category: "AI_ML" },
  { pattern: /\b(hugging\s*face|transformers)\b/i,                   canonical: "HuggingFace", category: "AI_ML" },
  { pattern: /\b(openai|gpt[-\s]?\d)\b/i,                            canonical: "OpenAI",      category: "AI_ML" },
  { pattern: /\b(mlflow|kubeflow)\b/i,                               canonical: "MLflow",      category: "AI_ML" },
  { pattern: /\b(pandas)\b/i,                                         canonical: "Pandas",     category: "AI_ML" },
  { pattern: /\b(numpy|scipy)\b/i,                                    canonical: "NumPy",      category: "AI_ML" },
  { pattern: /\b(scikit[-\s]?learn|sklearn)\b/i,                     canonical: "scikit-learn", category: "AI_ML" },

  // ── Testing ────────────────────────────────────────────────────────────────
  { pattern: /\b(jest(?:\.js)?)\b/i,                                  canonical: "Jest",       category: "Testing" },
  { pattern: /\b(pytest)\b/i,                                         canonical: "pytest",     category: "Testing" },
  { pattern: /\b(cypress)\b/i,                                        canonical: "Cypress",    category: "Testing" },
  { pattern: /\b(playwright)\b/i,                                     canonical: "Playwright", category: "Testing" },
  { pattern: /\b(vitest)\b/i,                                         canonical: "Vitest",     category: "Testing" },
  { pattern: /\b(selenium)\b/i,                                       canonical: "Selenium",   category: "Testing" },

  // ── Observability ──────────────────────────────────────────────────────────
  { pattern: /\b(datadog)\b/i,                                        canonical: "Datadog",    category: "Observability" },
  { pattern: /\b(grafana)\b/i,                                        canonical: "Grafana",    category: "Observability" },
  { pattern: /\b(prometheus)\b/i,                                     canonical: "Prometheus", category: "Observability" },
  { pattern: /\b(splunk)\b/i,                                         canonical: "Splunk",     category: "Observability" },
  { pattern: /\b(new\s+relic)\b/i,                                    canonical: "New Relic",  category: "Observability" },
  { pattern: /\b(sentry(?:\.io)?)\b/i,                                canonical: "Sentry",     category: "Observability" },
];

// ── BoundarySkillMatcher ──────────────────────────────────────────────────────

export class BoundarySkillMatcher {
  /**
   * Run all boundary patterns against the provided text.
   * Returns an array of unique canonical skill matches.
   *
   * @param text  Full lowercased job text (title + description + requirements)
   */
  match(text: string): BoundaryMatch[] {
    if (!text?.trim()) return [];

    const seen = new Set<string>();
    const results: BoundaryMatch[] = [];

    for (const entry of BOUNDARY_SKILLS) {
      const m = entry.pattern.exec(text);
      if (!m) continue;

      const canonical = entry.canonical;
      if (seen.has(canonical)) continue;
      seen.add(canonical);

      results.push({
        canonical,
        raw: m[0].trim(),
        category: entry.category,
        confidence: 0.9,
      });
    }

    return results;
  }
}
