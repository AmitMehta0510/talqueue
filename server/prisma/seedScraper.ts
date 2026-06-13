/**
 * seedScraper.ts
 *
 * Creates the system bot user used by the hackathon scraper
 * as the `createdById` for automatically imported hackathons.
 *
 * Run once:
 *   npx ts-node -r tsconfig-paths/register prisma/seedScraper.ts
 */

import "shared/config/loadEnv";
import prisma from "shared/database/prisma";

async function main() {
  const email = "scraper@platform.internal";
  const username = "system_scraper";

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`[seedScraper] System bot user already exists: ${existing.id}`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: "", // Cannot log in — no valid bcrypt hash
      profile: {
        create: {
          fullName: "Platform Scraper",
          bio: "Automated bot that imports public hackathons.",
        },
      },
    },
  });

  console.log(`[seedScraper] Created system bot user: ${user.id} (${email})`);
}

main()
  .catch((error) => {
    console.error("[seedScraper] Failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
