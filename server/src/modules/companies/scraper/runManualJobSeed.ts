import { runJobScrape } from "./job-scraper.service";

async function main() {
  console.log("Starting manual seeding of job openings...");
  try {
    const result = await runJobScrape();
    console.log("Manual job seeding completed successfully:");
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error("Manual job seeding failed:", error);
    process.exit(1);
  }
}

main();
