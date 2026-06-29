import fs from "fs";
import path from "path";
import slugify from "slugify";
import prisma from "shared/database/prisma";
import { CompanyType, CompanySize } from "@prisma/client";
import { generateRandomAlphanumeric } from "shared/utils/random";

interface CompanySeedData {
  name: string;
  websiteUrl?: string;
  logoUrl?: string;
  tagline?: string;
  description?: string;
  headquarters?: string;
  country?: string;
  industry?: string;
  type?: CompanyType;
  size?: CompanySize;
  linkedinUrl?: string;
  githubUrl?: string;
  careersPageUrl?: string;
}

/**
 * Runs the seeding process for top companies.
 * Reads data from top-companies.json and upserts into the database.
 * Optimized for production: processes records in batches of 50 with a staggered delay
 * to avoid database load spikes, and skips redundant updates if values are unchanged.
 */
export async function runCompanySeed() {
  console.log("[Company Seed] Starting company seeding...");
  
  const jsonPath = path.join(__dirname, "data", "top-companies.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Top companies seed data file not found at: ${jsonPath}`);
  }

  const fileContent = fs.readFileSync(jsonPath, "utf-8");
  const topCompanies: CompanySeedData[] = JSON.parse(fileContent);

  let created = 0;
  let updated = 0;
  const total = topCompanies.length;
  const CHUNK_SIZE = 50;
  const DELAY_MS = 800; // Delay in ms between chunks to prevent PostgreSQL connection saturation

  for (let i = 0; i < topCompanies.length; i += CHUNK_SIZE) {
    const chunk = topCompanies.slice(i, i + CHUNK_SIZE);

    await Promise.all(
      chunk.map(async (comp) => {
        try {
          const existing = await prisma.company.findUnique({
            where: { name: comp.name },
            select: {
              id: true,
              websiteUrl: true,
              logoUrl: true,
              linkedinUrl: true,
              githubUrl: true,
              careersPageUrl: true,
              description: true,
              tagline: true,
              headquarters: true,
              country: true,
              industry: true,
              type: true,
              size: true,
            },
          });

          if (existing) {
            // Optimize database writes: check if any target field has actually changed
            const needsUpdate =
              existing.websiteUrl !== (comp.websiteUrl || null) ||
              existing.logoUrl !== (comp.logoUrl || null) ||
              existing.linkedinUrl !== (comp.linkedinUrl || null) ||
              existing.githubUrl !== (comp.githubUrl || null) ||
              existing.careersPageUrl !== (comp.careersPageUrl || null) ||
              existing.description !== (comp.description || null) ||
              existing.tagline !== (comp.tagline || null) ||
              existing.headquarters !== (comp.headquarters || null) ||
              existing.country !== (comp.country || null) ||
              existing.industry !== (comp.industry || null) ||
              existing.type !== (comp.type || null) ||
              existing.size !== (comp.size || null);

            if (needsUpdate) {
              await prisma.company.update({
                where: { id: existing.id },
                data: {
                  websiteUrl: comp.websiteUrl || null,
                  logoUrl: comp.logoUrl || null,
                  linkedinUrl: comp.linkedinUrl || null,
                  githubUrl: comp.githubUrl || null,
                  careersPageUrl: comp.careersPageUrl || null,
                  description: comp.description || null,
                  tagline: comp.tagline || null,
                  headquarters: comp.headquarters || null,
                  country: comp.country || null,
                  industry: comp.industry || null,
                  type: comp.type || null,
                  size: comp.size || null,
                  verified: true,
                },
              });
              updated++;
            }
          } else {
            // Create new company
            const baseSlug = slugify(comp.name, { lower: true, strict: true, trim: true }) || `company-${Date.now()}`;
            const slug = `${baseSlug}-${generateRandomAlphanumeric(5)}`;

            await prisma.company.create({
              data: {
                name: comp.name,
                slug,
                websiteUrl: comp.websiteUrl || null,
                logoUrl: comp.logoUrl || null,
                linkedinUrl: comp.linkedinUrl || null,
                githubUrl: comp.githubUrl || null,
                careersPageUrl: comp.careersPageUrl || null,
                description: comp.description || null,
                tagline: comp.tagline || null,
                headquarters: comp.headquarters || null,
                country: comp.country || null,
                industry: comp.industry || null,
                type: comp.type || null,
                size: comp.size || null,
                verified: true,
              },
            });
            created++;
          }
        } catch (err) {
          console.error(`[Company Seed] Failed to upsert company ${comp.name}:`, err);
        }
      })
    );

    console.log(`[Company Seed] Processed ${Math.min(i + CHUNK_SIZE, total)} / ${total} companies...`);

    if (i + CHUNK_SIZE < total) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log(`[Company Seed] Completed. Total: ${total}, Created: ${created}, Updated: ${updated}`);
  return {
    total,
    created,
    updated,
  };
}
