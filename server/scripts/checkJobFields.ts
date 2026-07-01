import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      "pipelineVersion",
      "parserConfidence",
      "rawHtml" IS NOT NULL AS "hasRawHtml",
      "parsedSectionsJson" IS NOT NULL AS "hasParsedSections",
      "techStackJson" IS NOT NULL AS "hasTechStack"
    FROM "Job"
    WHERE "pipelineVersion" IS NOT NULL
    LIMIT 10;
  `);

  if (result.length === 0) {
    console.log("No jobs found with pipelineVersion v2. Have you run the scraper yet?");
    return;
  }

  console.table(result);
}

main()
  .catch((e) => {
    console.error("Error executing query:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
