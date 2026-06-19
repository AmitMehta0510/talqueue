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

  for (const comp of topCompanies) {
    try {
      const existing = await prisma.company.findUnique({
        where: { name: comp.name },
        select: { id: true, slug: true, verified: true },
      });

      if (existing) {
        // Update existing record (do not overwrite slug)
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
      } else {
        // Create new company
        // Append a 5-char random alphanumeric token to the base slug so that
        // unique-constraint collisions are bypassed without any DB read loop.
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
  }

  console.log(`[Company Seed] Completed. Total: ${total}, Created: ${created}, Updated: ${updated}`);
  return {
    total,
    created,
    updated,
  };
}
