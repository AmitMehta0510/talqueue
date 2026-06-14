import { runCompanySeed } from "./company-scraper.service";

async function main() {
  console.log("Starting manual seeding of top companies...");
  try {
    const result = await runCompanySeed();
    console.log("Manual seeding completed successfully:");
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error("Manual seeding failed:", error);
    process.exit(1);
  }
}

main();
