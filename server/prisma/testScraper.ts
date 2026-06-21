/// <reference types="node" />

import "../src/shared/config/loadEnv";
import { runAllScrapers } from "../src/modules/hackathons/scraper/hackathon-scraper.service";
import prisma from "../src/shared/database/prisma";


async function main() {
  console.log("Running all hackathon scrapers...\n");

  const result = await runAllScrapers();

  console.log("\n--- Scraper Result ---");
  console.log(`Total fetched:      ${result.totalFetched}`);
  console.log(`Created (new):     ${result.created}`);
  console.log(`Updated (existing):${result.updated}`);
  console.log(`Errors:            ${result.errors}`);

  const count = await prisma.hackathon.count();
  console.log(`\nTotal hackathons in DB: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

