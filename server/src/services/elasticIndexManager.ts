import elasticClient from "./elasticClient";

interface IndexConfig {
  name: string;
  settings: {
    number_of_shards: number;
    number_of_replicas: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analysis?: Record<string, any>;
  };
  mappings: {
    properties: Record<string, any>;
  };
}

const INDICES_CONFIGS: IndexConfig[] = [
  {
    name: "hackathons",
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
    },
    mappings: {
      properties: {
        // Text Search fields using Standard Analyzer
        title: { type: "text", analyzer: "standard" },
        description: { type: "text", analyzer: "standard" },
        shortDescription: { type: "text", analyzer: "standard" },
        organizerName: { type: "text", analyzer: "standard" },
        
        // Keyword fields for filtering tags and status
        status: { type: "keyword" },
        mode: { type: "keyword" },
        location: { type: "keyword" },
        difficultyLevel: { type: "keyword" },
        tags: { type: "keyword" },
        
        // Optional tracking / sorting fields
        createdAt: { type: "date" },
        startDate: { type: "date" },
        endDate: { type: "date" },
      },
    },
  },
  {
    name: "jobs",
    settings: {
      number_of_shards: 3,    // Scale for millions of documents
      number_of_replicas: 1,  // High availability
      analysis: {
        analyzer: {
          // Skills-aware analyzer: synonym expansion + lowercase
          skill_analyzer: {
            type: "custom",
            tokenizer: "standard",
            filter: ["lowercase", "skill_synonyms"],
          },
          // English analyzer with stemming for description/responsibility text
          english_analyzer: {
            type: "custom",
            tokenizer: "standard",
            filter: ["lowercase", "english_stop", "english_stemmer"],
          },
        },
        filter: {
          skill_synonyms: {
            type: "synonym",
            synonyms: [
              "js, javascript",
              "ts, typescript",
              "k8s, kubernetes",
              "ml, machine learning",
              "ai, artificial intelligence",
              "node, nodejs, node.js",
              "pg, postgresql, postgres",
              "aws, amazon web services",
              "gcp, google cloud",
              "otel, opentelemetry, open telemetry",
              "grpc, gRPC",
              "llm, large language model",
              "rag, retrieval augmented generation",
            ],
          },
          english_stemmer: { type: "stemmer", language: "english" },
          english_stop: { type: "stop", stopwords: "_english_" },
        },
      },
    },
    mappings: {
      properties: {
        // ── Full-text search fields ───────────────────────────────────────────────────
        title: {
          type: "text", analyzer: "english_analyzer",
          fields: { keyword: { type: "keyword", ignore_above: 256 } },
          copy_to: "all_text",
        },
        description:      { type: "text", analyzer: "english_analyzer", copy_to: "all_text" },
        responsibilities: { type: "text", analyzer: "english_analyzer", copy_to: "all_text" },
        requirements:     { type: "text", analyzer: "english_analyzer", copy_to: "all_text" },
        benefits:         { type: "text", analyzer: "english_analyzer", copy_to: "all_text" },
        companyName: {
          type: "text", analyzer: "standard",
          fields: { keyword: { type: "keyword" } },
        },
        // Combined cross-field search target
        all_text: { type: "text", analyzer: "english_analyzer" },

        // ── Skills ──────────────────────────────────────────────────────────────
        requiredSkills: {
          type: "keyword",
          fields: { text: { type: "text", analyzer: "skill_analyzer" } },
        },
        preferredSkills: { type: "keyword" },
        techStack: {
          type: "object",
          properties: {
            languages:    { type: "keyword" },
            frameworks:   { type: "keyword" },
            cloud:        { type: "keyword" },
            databases:    { type: "keyword" },
            devops:       { type: "keyword" },
            ai_ml:        { type: "keyword" },
            observability:{ type: "keyword" },
            testing:      { type: "keyword" },
            other:        { type: "keyword" },
          },
        },

        // ── Keyword filter fields ───────────────────────────────────────────────
        status:          { type: "keyword" },
        type:            { type: "keyword" },
        workMode:        { type: "keyword" },
        experienceLevel: { type: "keyword" },
        department:      { type: "keyword" },
        atsSource:       { type: "keyword" },

        // ── Location ─────────────────────────────────────────────────────────
        location:            { type: "keyword" },
        locationCity:        { type: "keyword" },
        locationState:       { type: "keyword" },
        locationCountry:     { type: "keyword" },
        locationCountryCode: { type: "keyword" },
        visaSponsorship:     { type: "boolean" },
        relocationAssistance:{ type: "boolean" },

        // ── Experience & Education ─────────────────────────────────────────
        experienceMinYears: { type: "short" },
        experienceMaxYears: { type: "short" },
        educationDegree:    { type: "keyword" },

        // ── Compensation ──────────────────────────────────────────────────
        salaryMin:   { type: "integer" },
        salaryMax:   { type: "integer" },
        currency:    { type: "keyword" },
        salaryPeriod:{ type: "keyword" },

        // ── Booleans & Dates ──────────────────────────────────────────────
        featured:          { type: "boolean" },
        isPromoted:        { type: "boolean" },
        hasActiveAd:       { type: "boolean" },
        ppoOffered:        { type: "boolean" },
        needsLLMReview:    { type: "boolean" },
        createdAt:         { type: "date" },
        postedAt:          { type: "date" },

        // ── Relevance signals ──────────────────────────────────────────────
        parserConfidence:  { type: "float" },
        applicationsCount: { type: "integer" },
        views:             { type: "integer" },
      },
    },
  },
  {
    name: "users_resdex",
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
    },
    mappings: {
      properties: {
        // Text fields with standard analyzer
        fullName: { type: "text", analyzer: "standard" },
        about: { type: "text", analyzer: "standard" },
        
        // Nested structures for education and experience arrays
        education: {
          type: "nested",
          properties: {
            collegeName: { type: "text", analyzer: "standard" },
          },
        },
        experience: {
          type: "nested",
          properties: {
            companyName: { type: "text", analyzer: "standard" },
          },
        },
        
        // Verified skills (array of strings)
        verified_skills: { type: "keyword" },
        
        // Floating point field for CGPA range queries
        cgpa: { type: "float" },
        
        // Integer numbers
        graduationYear: { type: "integer" },
        experienceYears: { type: "integer" },
      },
    },
  },
  {
    name: "forum_posts",
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
    },
    mappings: {
      properties: {
        // Text Search fields with standard analyzer for fuzzy/full-text search
        title: { type: "text", analyzer: "standard" },
        content: { type: "text", analyzer: "standard" },

        // Keyword fields for exact filtering and aggregations
        tags: { type: "keyword" },
        authorId: { type: "keyword" },
        category: { type: "keyword" },

        // Contextual filters — community scoping and post type
        communityId: { type: "keyword" },
        postType: { type: "keyword" },

        // Date field for range queries and time-based sorting
        createdAt: { type: "date" },
      },
    },
  },
];

/**
 * Checks if 'hackathons' and 'jobs' indices exist in Elasticsearch.
 * If they do not exist, it creates them with specified settings and mappings.
 * Fail-soft: Logs errors if indices creation fails, but does not crash process.
 */
export async function initElasticsearchIndices(): Promise<void> {
  console.log("Checking and initializing Elasticsearch indices...");
  
  for (const config of INDICES_CONFIGS) {
    try {
      const exists = await elasticClient.indices.exists({ index: config.name });
      
      if (!exists) {
        console.log(`Index '${config.name}' does not exist. Creating...`);
        await elasticClient.indices.create({
          index: config.name,
          settings: config.settings,
          mappings: config.mappings,
        });
        console.log(`Index '${config.name}' created successfully.`);
      } else {
        console.log(`Index '${config.name}' already exists.`);
      }
    } catch (error: any) {
      console.error(
        `Failed to verify or create Elasticsearch index '${config.name}':`,
        error?.message || error
      );
    }
  }
}
