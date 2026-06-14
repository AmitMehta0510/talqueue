import prisma from "shared/database/prisma";
import { stripHtml } from "./scraper.utils";


async function main() {
  console.log("[Maintenance] Starting database cleanup...");
  
  const hackathons = await prisma.hackathon.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      shortDescription: true,
      status: true,
      startDate: true,
      endDate: true,
    }
  });

  console.log(`[Maintenance] Total hackathons to inspect: ${hackathons.length}`);
  
  const now = new Date();
  let cleanCount = 0;
  let statusUpdateCount = 0;

  for (const h of hackathons) {
    const cleanTitle = stripHtml(h.title);
    const cleanDescription = stripHtml(h.description);
    const cleanShortDescription = h.shortDescription ? stripHtml(h.shortDescription) : null;
    
    // Check if status needs to be updated
    let cleanStatus = h.status;
    if (["OPEN", "LIVE"].includes(h.status)) {
      if (now > h.endDate) {
        cleanStatus = "COMPLETED";
      } else if (h.status === "OPEN" && now >= h.startDate) {
        cleanStatus = "LIVE";
      }
    }

    const needsUpdate = 
      cleanTitle !== h.title || 
      cleanDescription !== h.description || 
      cleanShortDescription !== h.shortDescription ||
      cleanStatus !== h.status;

    if (needsUpdate) {
      await prisma.hackathon.update({
        where: { id: h.id },
        data: {
          title: cleanTitle,
          description: cleanDescription,
          shortDescription: cleanShortDescription,
          status: cleanStatus,
        }
      });

      if (cleanTitle !== h.title || cleanDescription !== h.description || cleanShortDescription !== h.shortDescription) {
        cleanCount++;
      }
      if (cleanStatus !== h.status) {
        statusUpdateCount++;
      }
      console.log(`- Updated: "${cleanTitle}" (HTML cleaned: ${cleanTitle !== h.title || cleanDescription !== h.description}, Status: ${h.status} -> ${cleanStatus})`);
    }
  }

  console.log(`[Maintenance] Database cleanup finished.`);
  console.log(`[Maintenance] Cleaned HTML tags in ${cleanCount} records.`);
  console.log(`[Maintenance] Corrected status in ${statusUpdateCount} records.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("[Maintenance] Database cleanup failed:", error);
  process.exit(1);
});
