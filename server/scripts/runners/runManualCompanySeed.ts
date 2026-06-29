import { runCompanySeed } from "../../src/modules/companies/scraper/company-scraper.service";

async function main() {
  console.log("Starting manual seeding of companies directory...");
  try {
    const result = await runCompanySeed();
    console.log("Manual company seeding completed successfully:");
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error("Manual company seeding failed:", error);
    process.exit(1);
  }
}

main();
