/**
 * testScraper.ts — one-off manual scraper test
 * Run: npx ts-node -r tsconfig-paths/register prisma/testScraper.ts
 */

import "shared/config/loadEnv";
import { runDevpostScraper } from "../src/modules/hackathons/scraper/hackathon-scraper.service";
import prisma from "shared/database/prisma";

async function main() {
  console.log("Running Devpost scraper (test run)...\n");

  const result = await runDevpostScraper();

  console.log("\n--- Scraper Result ---");
  console.log(`Total fetched from Devpost: ${result.totalFetched}`);
  console.log(`Created (new):             ${result.created}`);
  console.log(`Updated (existing):        ${result.updated}`);
  console.log(`Errors:                    ${result.errors}`);

  const count = await prisma.hackathon.count({ where: { sourcePlatform: "Devpost" } });
  console.log(`\nTotal Devpost hackathons in DB: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
