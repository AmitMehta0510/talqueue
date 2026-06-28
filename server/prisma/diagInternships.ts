/**
 * Scratch: DB + Elasticsearch Internship Diagnostic
 * Run: npx ts-node -r tsconfig-paths/register prisma/diagInternships.ts
 */
import prisma from "shared/database/prisma";
import axios from "axios";

async function main() {
  console.log("\n=== TASK 1A: PostgreSQL Job Type Counts ===\n");

  const total = await prisma.job.count();
  console.log(`Total jobs in DB: ${total}`);

  const byType = await prisma.job.groupBy({
    by: ["type"],
    _count: { type: true },
    orderBy: { _count: { type: "desc" } },
  });

  console.log("\nBreakdown by type:");
  for (const row of byType) {
    console.log(`  ${row.type.padEnd(15)} : ${row._count.type}`);
  }

  const internCount = await prisma.job.count({ where: { type: "INTERNSHIP" } });
  console.log(`\n[INTERNSHIP] Total: ${internCount}`);

  if (internCount > 0) {
    const sample = await prisma.job.findMany({
      where: { type: "INTERNSHIP" },
      select: { title: true, atsSource: true, status: true },
      take: 10,
    });
    console.log("Sample INTERNSHIP rows:");
    for (const j of sample) {
      console.log(`  [${j.atsSource}] ${j.title} (${j.status})`);
    }
  }

  console.log("\n--- Per ATS source ---");
  const bySource = await prisma.job.groupBy({
    by: ["atsSource"],
    _count: { atsSource: true },
    orderBy: { _count: { atsSource: "desc" } },
  });
  for (const row of bySource) {
    console.log(`  ${(row.atsSource ?? "null").padEnd(15)} : ${row._count.atsSource}`);
  }

  console.log("\n--- INTERNSHIP by ATS source ---");
  const internBySource = await prisma.job.groupBy({
    by: ["atsSource"],
    where: { type: "INTERNSHIP" },
    _count: { atsSource: true },
  });
  if (internBySource.length === 0) {
    console.log("  !! ZERO internship rows — all jobs were classified as FULL_TIME or other.");
  } else {
    for (const row of internBySource) {
      console.log(`  ${(row.atsSource ?? "null").padEnd(15)} : ${row._count.atsSource}`);
    }
  }

  console.log("\n--- Intern-titled jobs classified as FULL_TIME (misclassification check) ---");
  const misclassified = await prisma.job.findMany({
    where: { type: "FULL_TIME", title: { contains: "intern", mode: "insensitive" } },
    select: { title: true, atsSource: true, type: true },
    take: 15,
  });
  if (misclassified.length === 0) {
    console.log("  None found.");
  } else {
    console.log(`  Found ${misclassified.length} misclassified rows:`);
    for (const j of misclassified) console.log(`  [${j.atsSource}] ${j.title} -> ${j.type}`);
  }

  console.log("\n=== TASK 1B: Elasticsearch Internship Check ===\n");
  const ES_URL = process.env.ELASTICSEARCH_URL || "http://127.0.0.1:9200";
  try {
    const health = await axios.get(`${ES_URL}/_cluster/health`, { timeout: 5000 });
    console.log(`ES cluster: ${health.data.status}`);

    try {
      const total = await axios.get(`${ES_URL}/jobs/_count`, { timeout: 5000 });
      console.log(`ES jobs total: ${total.data.count}`);
    } catch (e: any) {
      console.log(`ES jobs index: ${e?.response?.status === 404 ? "NOT FOUND" : e.message}`);
    }

    const esIntern = await axios.post(
      `${ES_URL}/jobs/_count`,
      { query: { term: { type: "INTERNSHIP" } } },
      { timeout: 5000, headers: { "Content-Type": "application/json" } }
    );
    console.log(`ES INTERNSHIP count: ${esIntern.data.count}`);

    const esFt = await axios.post(
      `${ES_URL}/jobs/_count`,
      { query: { term: { type: "FULL_TIME" } } },
      { timeout: 5000, headers: { "Content-Type": "application/json" } }
    );
    console.log(`ES FULL_TIME count:   ${esFt.data.count}`);

    const mapping = await axios.get(`${ES_URL}/jobs/_mapping`, { timeout: 5000 });
    const typeField = mapping.data?.jobs?.mappings?.properties?.type;
    console.log(`ES 'type' field mapping: ${JSON.stringify(typeField)}`);
  } catch (e: any) {
    console.warn(`ES error: ${e.message}`);
  }

  console.log("\n=== Diagnostic complete ===\n");
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
