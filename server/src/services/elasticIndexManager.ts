import elasticClient from "./elasticClient";

interface IndexConfig {
  name: string;
  settings: {
    number_of_shards: number;
    number_of_replicas: number;
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
      number_of_shards: 1,
      number_of_replicas: 0,
    },
    mappings: {
      properties: {
        // Text Search fields using Standard Analyzer
        title: { type: "text", analyzer: "standard" },
        description: { type: "text", analyzer: "standard" },
        companyName: { type: "text", analyzer: "standard" },
        requirements: { type: "text", analyzer: "standard" },
        
        // Keyword fields for filtering tags and status
        status: { type: "keyword" },
        type: { type: "keyword" },
        workMode: { type: "keyword" },
        location: { type: "keyword" },
        experienceLevel: { type: "keyword" },
        skillsRequired: { type: "keyword" },
        
        // Optional numeric/date fields for range filtering/sorting
        salaryMin: { type: "integer" },
        salaryMax: { type: "integer" },
        ppoOffered: { type: "boolean" },
        featured: { type: "boolean" },
        createdAt: { type: "date" },
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
