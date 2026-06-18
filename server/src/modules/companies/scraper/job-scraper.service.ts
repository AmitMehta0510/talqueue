import axios from "axios";
import slugify from "slugify";
import prisma from "shared/database/prisma";
import { JobType, WorkMode, JobStatus } from "@prisma/client";
import { syncJobToElastic } from "services/elasticSync";

// Mapping of seeded companies to their public Greenhouse board tokens
const GREENHOUSE_TOKENS: Record<string, string> = {
  "stripe": "stripe",
  "airbnb": "airbnb",
  "figma": "figma",
  "uber": "uber",
  "lyft": "lyft",
  "coinbase": "coinbase",
  "robinhood": "robinhood",
  "supabase": "supabase",
  "sentry": "sentry",
  "openai": "openai",
  "anthropic": "anthropic",
  "hugging-face": "huggingface",
  "scale-ai": "scaleai",
  "clerk": "clerk",
  "docker": "docker",
  "vercel": "vercel",
  "retool": "retool",
  "razorpay": "razorpay",
  "inmobi": "inmobi",
  "onetrust-india": "onetrust"
};

// Mapping of seeded companies to their public Ashby board tokens
const ASHBY_TOKENS: Record<string, string> = {
  "linear": "linear"
};

// Tech role keywords to filter out non-technical roles
const TECH_ROLE_KEYWORDS = [
  "engineer", "developer", "software", "backend", "frontend", "fullstack",
  "product manager", "designer", "data scientist", "data analyst", "devops",
  "sre", "architect", "machine learning", "ui/ux", "product design", "qa",
  "test engineer", "technical", "engineering", "programmer", "ml", "ai", "cloud"
];

// Helper to determine if a job is a tech/engineering role
function isTechRole(title: string): boolean {
  const t = title.toLowerCase();
  return TECH_ROLE_KEYWORDS.some(keyword => t.includes(keyword));
}

// Helper to parse job type from title
function parseJobType(title: string): JobType {
  const t = title.toLowerCase();
  if (t.includes("intern") || t.includes("co-op")) return "INTERNSHIP";
  if (t.includes("contract") || t.includes("contractor")) return "CONTRACT";
  if (t.includes("part-time") || t.includes("part time")) return "PART_TIME";
  if (t.includes("freelance")) return "FREELANCE";
  return "FULL_TIME";
}

// Helper to parse work mode from location
function parseWorkMode(location: string): WorkMode {
  const l = location.toLowerCase();
  if (l.includes("remote")) return "REMOTE";
  if (l.includes("hybrid")) return "HYBRID";
  if (l.includes("onsite") || l.includes("on-site") || l.includes("office")) return "ONSITE";
  return "HYBRID"; // default fallback
}

// Helper to extract skills from title and description
const SKILL_KEYWORDS = {
  "React": ["react", "frontend", "ui"],
  "TypeScript": ["typescript", "ts"],
  "Node.js": ["node.js", "nodejs", "node", "backend"],
  "Python": ["python", "django", "flask", "ml", "data science"],
  "Go": ["golang", " go "],
  "Rust": ["rust"],
  "PostgreSQL": ["postgres", "postgresql", "sql", "database"],
  "Docker": ["docker", "container", "devops"],
  "Kubernetes": ["kubernetes", "k8s"],
  "AWS": ["aws", "amazon web services", "cloud"],
  "GCP": ["gcp", "google cloud"],
  "Next.js": ["nextjs", "next.js"],
  "TailwindCSS": ["tailwind"],
  "GraphQL": ["graphql"],
};

function extractSkills(title: string, desc: string): string[] {
  const text = `${title} ${desc}`.toLowerCase();
  const skills: string[] = [];
  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      skills.push(skill);
    }
  }
  if (skills.length === 0) {
    skills.push("TypeScript", "Node.js");
  }
  return skills;
}

// Helper to generate realistic tech descriptions
function getJobDescription(title: string, companyName: string): { description: string, requirements: string, responsibilities: string } {
  const isLead = title.toLowerCase().includes("senior") || title.toLowerCase().includes("lead") || title.toLowerCase().includes("staff");
  
  const responsibilities = [
    `Design, build, and maintain efficient, reusable, and reliable code at ${companyName}.`,
    `Collaborate with product managers, designers, and fellow engineers to ship high-impact features.`,
    isLead 
      ? "Mentor junior team members and guide overall technical architecture decisions." 
      : "Participate actively in code reviews and team design discussions.",
    "Identify bottlenecks and bugs, and devise solutions to mitigate these issues."
  ].join("\n");

  const requirements = [
    `Strong background in computer science or equivalent engineering experience.`,
    `Experience working in modern software development teams and version control systems.`,
    isLead 
      ? "5+ years of software engineering experience in similar high-scale environments."
      : "2+ years of software engineering experience.",
    "Familiarity with containerization, cloud systems, and database management."
  ].join("\n");

  const description = `We are looking for a talented ${title} to join our engineering division at ${companyName}. You will play a crucial role in building the next generation of our platforms, designing scalable backend systems or intuitive frontend interfaces, and driving overall product excellence.`;

  return {
    description,
    requirements,
    responsibilities
  };
}

// Local mock templates for non-ATS companies
const MOCK_JOBS_TEMPLATES = [
  { title: "Software Engineer II, Product", type: "FULL_TIME", workMode: "HYBRID" },
  { title: "Senior Software Engineer, Core Systems", type: "FULL_TIME", workMode: "HYBRID" },
  { title: "Staff DevOps Engineer, Infrastructure", type: "FULL_TIME", workMode: "REMOTE" },
  { title: "Product Manager, Developer Experience", type: "FULL_TIME", workMode: "HYBRID" },
  { title: "Frontend Engineer, Design Systems", type: "FULL_TIME", workMode: "HYBRID" },
  { title: "Software Engineering Intern", type: "INTERNSHIP", workMode: "HYBRID" }
];

/**
 * Runs the job scraping and seeding process.
 */
export async function runJobScrape() {
  console.log("[Job Scraper] Starting job scraping and seeding...");
  
  // Fetch all companies from database
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true, headquarters: true, country: true, websiteUrl: true }
  });

  let created = 0;
  let updated = 0;
  let staleArchived = 0;
  let totalProcessed = 0;

  for (const company of companies) {
    const greenhouseToken = GREENHOUSE_TOKENS[company.slug];
    const ashbyToken = ASHBY_TOKENS[company.slug];
    const activeSlugs: string[] = [];

    try {
      if (greenhouseToken) {
        // Fetch from Greenhouse API
        const response = await axios.get(`https://boards-api.greenhouse.io/v1/boards/${greenhouseToken}/jobs`, {
          timeout: 10000
        });
        const rawJobs = response.data.jobs || [];
        const techJobs = rawJobs.filter((job: any) => isTechRole(job.title)).slice(0, 12);

        for (const job of techJobs) {
          const jobTitle = job.title;
          const externalId = `greenhouse-${job.id}`;
          const slug = slugify(`${company.slug}-${jobTitle}-${job.id}`, { lower: true, strict: true }) || `job-${job.id}`;
          activeSlugs.push(slug);

          const { description, requirements, responsibilities } = getJobDescription(jobTitle, company.name);
          const type = parseJobType(jobTitle);
          const locationName = job.location?.name || company.headquarters || "Remote";
          const workMode = parseWorkMode(locationName);
          const skillsRequired = extractSkills(jobTitle, description);

          const existing = await prisma.job.findUnique({
            where: { slug },
            select: { id: true }
          });

          if (existing) {
            await prisma.job.update({
              where: { id: existing.id },
              data: {
                title: jobTitle,
                description,
                requirements,
                responsibilities,
                location: locationName,
                type,
                workMode,
                applyUrl: job.absolute_url || `https://boards.greenhouse.io/${greenhouseToken}/jobs/${job.id}`,
                skillsRequired,
                status: "OPEN"
              }
            });
            syncJobToElastic(existing.id);
            updated++;
          } else {
            const newJob = await prisma.job.create({
              data: {
                companyId: company.id,
                title: jobTitle,
                slug,
                description,
                requirements,
                responsibilities,
                location: locationName,
                type,
                workMode,
                applyUrl: job.absolute_url || `https://boards.greenhouse.io/${greenhouseToken}/jobs/${job.id}`,
                skillsRequired,
                status: "OPEN",
                externalJobId: externalId
              }
            });
            syncJobToElastic(newJob.id);
            created++;
          }
        }
      } else if (ashbyToken) {
        // Fetch from Ashby API
        const response = await axios.post(`https://api.ashbyhq.com/posting-api/job-board/${ashbyToken}`, {}, {
          timeout: 10000
        });
        const rawJobs = response.data.jobs || [];
        const techJobs = rawJobs.filter((job: any) => isTechRole(job.title)).slice(0, 12);

        for (const job of techJobs) {
          const jobTitle = job.title;
          const externalId = `ashby-${job.id}`;
          const slug = slugify(`${company.slug}-${jobTitle}-${job.id}`, { lower: true, strict: true }) || `job-${job.id}`;
          activeSlugs.push(slug);

          const descPlain = job.descriptionPlain || "";
          const requirements = job.requirementsPlain || "";
          const responsibilities = job.responsibilitiesPlain || "";
          const type = parseJobType(jobTitle);
          const locationName = job.location || company.headquarters || "Remote";
          const workMode = parseWorkMode(locationName);
          const skillsRequired = extractSkills(jobTitle, `${descPlain} ${jobTitle}`);

          const existing = await prisma.job.findUnique({
            where: { slug },
            select: { id: true }
          });

          if (existing) {
            await prisma.job.update({
              where: { id: existing.id },
              data: {
                title: jobTitle,
                description: descPlain || jobTitle,
                requirements: requirements || null,
                responsibilities: responsibilities || null,
                location: locationName,
                type,
                workMode,
                applyUrl: job.jobUrl || `https://jobs.ashbyhq.com/${ashbyToken}/${job.id}`,
                skillsRequired,
                status: "OPEN"
              }
            });
            syncJobToElastic(existing.id);
            updated++;
          } else {
            const newJob = await prisma.job.create({
              data: {
                companyId: company.id,
                title: jobTitle,
                slug,
                description: descPlain || jobTitle,
                requirements: requirements || null,
                responsibilities: responsibilities || null,
                location: locationName,
                type,
                workMode,
                applyUrl: job.jobUrl || `https://jobs.ashbyhq.com/${ashbyToken}/${job.id}`,
                skillsRequired,
                status: "OPEN",
                externalJobId: externalId
              }
            });
            syncJobToElastic(newJob.id);
            created++;
          }
        }
      } else {
        // Fallback: Template mock jobs generator
        const numJobs = 3 + (company.name.length % 3); // 3 to 5 jobs
        for (let i = 0; i < numJobs; i++) {
          const template = MOCK_JOBS_TEMPLATES[i % MOCK_JOBS_TEMPLATES.length];
          const jobTitle = template.title;
          const externalId = `mock-${company.slug}-${i}`;
          const slug = slugify(`${company.slug}-${jobTitle}-${i}`, { lower: true, strict: true });
          activeSlugs.push(slug);

          const { description, requirements, responsibilities } = getJobDescription(jobTitle, company.name);
          const locationName = company.headquarters || "Remote";
          const skillsRequired = extractSkills(jobTitle, description);

          const existing = await prisma.job.findUnique({
            where: { slug },
            select: { id: true }
          });

          if (existing) {
            await prisma.job.update({
              where: { id: existing.id },
              data: {
                title: jobTitle,
                description,
                requirements,
                responsibilities,
                location: locationName,
                type: template.type as JobType,
                workMode: template.workMode as WorkMode,
                applyUrl: company.websiteUrl ? `${company.websiteUrl}/careers` : "https://google.com/careers",
                skillsRequired,
                status: "OPEN"
              }
            });
            syncJobToElastic(existing.id);
            updated++;
          } else {
            const newJob = await prisma.job.create({
              data: {
                companyId: company.id,
                title: jobTitle,
                slug,
                description,
                requirements,
                responsibilities,
                location: locationName,
                type: template.type as JobType,
                workMode: template.workMode as WorkMode,
                applyUrl: company.websiteUrl ? `${company.websiteUrl}/careers` : "https://google.com/careers",
                skillsRequired,
                status: "OPEN",
                externalJobId: externalId
              }
            });
            syncJobToElastic(newJob.id);
            created++;
          }
        }
      }

      // Cleanup stale jobs for this company
      const deletedResult = await prisma.job.deleteMany({
        where: {
          companyId: company.id,
          slug: { notIn: activeSlugs },
          // Only delete external/scraped jobs, don't delete manually added jobs by users
          externalJobId: { not: null }
        }
      });
      staleArchived += deletedResult.count;
      totalProcessed++;

    } catch (err) {
      console.error(`[Job Scraper] Failed to process jobs for company ${company.name}:`, err);
    }
  }

  console.log(`[Job Scraper] Seeding complete. Processed: ${totalProcessed} companies. Created: ${created}, Updated: ${updated}, Stale Cleaned: ${staleArchived}`);
  return {
    totalProcessed,
    created,
    updated,
    staleArchived
  };
}
