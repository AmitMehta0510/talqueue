import prisma from "shared/database/prisma";
import { runAllScrapers } from "./hackathon-scraper.service";

async function main() {
  console.log("Starting manual scrape of all platforms...");
  try {
    const result = await runAllScrapers();
    console.log("Manual scrape completed successfully:");
    console.log(JSON.stringify(result, null, 2));
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Manual scrape failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
