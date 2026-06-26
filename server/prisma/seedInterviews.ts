import "../src/shared/config/loadEnv";
import { runInterviewSeed } from "../src/modules/interviews/interviews.scraper";
import prisma from "../src/shared/database/prisma";

async function main() {
  console.log("🚀 Starting manual seeding of interview resources...");
  try {
    const result = await runInterviewSeed();
    console.log(`🎉 Interview seed complete — created: ${result.created}, updated: ${result.updated}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Interview seeding failed:", error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
