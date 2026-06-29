import axios from "axios";
import prisma from "shared/database/prisma";
import slugify from "slugify";

/**
 * On-the-fly profile creation and enrichment using the Clearbit Company API.
 * Falls back gracefully if api keys are unconfigured or calls timeout.
 *
 * @param domain - The corporate email domain (e.g. "uber.com").
 * @param tx     - Optional Prisma Transaction client.
 * @returns The newly created or matched Company record.
 */
export async function enrichCompanyDomain(domain: string, tx?: any) {
  const db = tx ?? prisma;

  // 1. Check if the company already exists
  let company = await db.company.findFirst({
    where: {
      OR: [
        { websiteUrl: { contains: domain } },
        { slug: domain.split(".")[0] }
      ]
    }
  });

  if (company) {
    return company;
  }

  // 2. Default fallback information
  let name = domain.split(".")[0];
  name = name.charAt(0).toUpperCase() + name.slice(1);
  let logoUrl = `https://logo.clearbit.com/${domain}`;
  let description = `${name} is an enterprise operating in the digital solutions and technology sector.`;
  let industry = "Technology";

  // 3. Clearbit API query
  const clearbitKey = process.env.CLEARBIT_API_KEY;
  if (clearbitKey) {
    try {
      const response = await axios.get(
        `https://company.clearbit.com/v2/companies/find?domain=${domain}`,
        {
          headers: { Authorization: `Bearer ${clearbitKey}` },
          timeout: 5000,
        }
      );
      if (response.status === 200 && response.data) {
        name = response.data.name || name;
        logoUrl = response.data.logo || logoUrl;
        description = response.data.description || description;
        industry = response.data.category?.sector || industry;
      }
    } catch (err) {
      console.warn(`[Clearbit] Failed to enrich details for ${domain}:`, err);
    }
  }

  // 4. Create verified company record
  const slug = slugify(name, { lower: true, strict: true }) + "-" + Math.floor(100 + Math.random() * 900);

  company = await db.company.create({
    data: {
      name,
      slug,
      websiteUrl: `https://${domain}`,
      logoUrl,
      description,
      industry,
      verificationStatus: "VERIFIED",
      emailDomains: [domain],
    },
  });

  return company;
}
