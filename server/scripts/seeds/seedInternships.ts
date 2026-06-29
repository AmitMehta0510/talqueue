/**
 * Seed Real Internship Postings
 * Inserts 15 curated, real-company internship listings that are stable
 * and well-known to engineering students. These are seeded with direct
 * apply URLs so students can actually apply.
 *
 * Run: npx ts-node -r tsconfig-paths/register prisma/seedInternships.ts
 */
import prisma from "shared/database/prisma";
import { syncJobsToElasticBulk } from "services/elasticSync";
import slugify from "slugify";

const INTERNSHIPS: Array<{
  companySlug: string;
  companyName: string;
  title: string;
  location: string;
  workMode: "ONSITE" | "HYBRID" | "REMOTE";
  applyUrl: string;
  description: string;
  requirements: string;
  skills: string[];
}> = [
  {
    companySlug: "google",
    companyName: "Google",
    title: "Software Engineering Intern, Summer 2026",
    location: "Mountain View, CA",
    workMode: "HYBRID",
    applyUrl: "https://careers.google.com/jobs/results/?category=ENGINEERING_AND_TECHNOLOGY&employment_type=INTERN",
    description: "As a Software Engineer Intern at Google, you will work with a team of engineers on real Google products and infrastructure. You'll participate in the full software development lifecycle — design, develop, test, deploy, maintain and improve software across Google's systems.",
    requirements: "Currently pursuing a BS, MS, or PhD in Computer Science or a related technical field. Experience with data structures, algorithms, or systems programming. Strong coding skills in one or more general purpose languages (Java, Python, C++, Go, etc.).",
    skills: ["Python", "Java", "Go", "Algorithms", "System Design"],
  },
  {
    companySlug: "microsoft",
    companyName: "Microsoft",
    title: "Software Engineering Intern – Explore Program",
    location: "Redmond, WA",
    workMode: "HYBRID",
    applyUrl: "https://careers.microsoft.com/students/us/en/usexploremicrosoftprogram",
    description: "The Microsoft Explore Program is a 12-week summer internship program designed for first and second year college students. You will be placed in a team working on real products and will learn software development concepts including coding, testing, and user interface development.",
    requirements: "First or second year undergraduate student pursuing a BS in Computer Science or related field. Proficiency in at least one programming language. No prior internship experience required.",
    skills: ["TypeScript", "C++", "Python", "Azure", "React"],
  },
  {
    companySlug: "meta",
    companyName: "Meta",
    title: "Software Engineering Intern",
    location: "Menlo Park, CA",
    workMode: "HYBRID",
    applyUrl: "https://www.metacareers.com/careerprograms/students",
    description: "Meta Platforms is seeking Software Engineering Interns to join our teams across infrastructure, backend systems, mobile, and AI. As an intern, you will work on impactful projects and ship real code to billions of users worldwide.",
    requirements: "Currently enrolled in a BS or MS program in Computer Science or equivalent. Experience in algorithms, data structures, and at least one programming language. Passion for building products at scale.",
    skills: ["Python", "React", "C++", "Hack", "GraphQL"],
  },
  {
    companySlug: "amazon",
    companyName: "Amazon",
    title: "SDE Intern – Summer 2026",
    location: "Seattle, WA",
    workMode: "HYBRID",
    applyUrl: "https://www.amazon.jobs/en/jobs/search/?category=software-development&type=intern",
    description: "Amazon's Software Development Engineer (SDE) Intern program places you on a team building world-class solutions. You will own a project from design through delivery, with the support of a mentor and your team.",
    requirements: "Currently pursuing a BS or MS in Computer Science or closely related field. Experience with object-oriented programming (Java, C++, Python). Familiarity with distributed systems and database concepts.",
    skills: ["Java", "AWS", "Python", "Distributed Systems", "Node.js"],
  },
  {
    companySlug: "apple",
    companyName: "Apple",
    title: "Software Engineering Internship",
    location: "Cupertino, CA",
    workMode: "ONSITE",
    applyUrl: "https://jobs.apple.com/en-us/search?team=internships-STDNT-INTRN",
    description: "Apple internships are full-time opportunities for students to work on the same projects and initiatives as Apple's full-time engineers. From iOS to macOS, from Swift to machine learning — you'll push the boundaries of what's possible.",
    requirements: "Currently pursuing a BS or MS in Computer Science, Electrical Engineering, or equivalent. Proficiency in Swift, Objective-C, or C/C++. Strong fundamentals in data structures and algorithms.",
    skills: ["Swift", "Objective-C", "C++", "CoreML", "Xcode"],
  },
  {
    companySlug: "stripe",
    companyName: "Stripe",
    title: "Software Engineering Intern",
    location: "San Francisco, CA",
    workMode: "HYBRID",
    applyUrl: "https://stripe.com/jobs/search?query=intern",
    description: "Stripe's engineering internships place you on a product team where you'll work on real infrastructure that processes hundreds of billions of dollars a year. You'll ship production code, collaborate with world-class engineers, and own meaningful projects.",
    requirements: "Pursuing a BS or MS in Computer Science or related technical field. Strong coding skills in any language. Interest in financial infrastructure, APIs, and distributed systems.",
    skills: ["Ruby", "Go", "TypeScript", "PostgreSQL", "Distributed Systems"],
  },
  {
    companySlug: "airbnb",
    companyName: "Airbnb",
    title: "Software Engineer Intern",
    location: "San Francisco, CA",
    workMode: "HYBRID",
    applyUrl: "https://careers.airbnb.com/positions/?type=Intern",
    description: "Airbnb's engineering intern program gives you the opportunity to work on projects that directly impact millions of hosts and guests worldwide. You'll be embedded in a product team, attend intern events, and receive mentorship from experienced engineers.",
    requirements: "Currently pursuing a BS or MS in Computer Science or related field. Strong programming skills in one or more languages. Prior internship or project experience is a plus.",
    skills: ["React", "Java", "Python", "TypeScript", "GraphQL"],
  },
  {
    companySlug: "netflix",
    companyName: "Netflix",
    title: "Software Engineering Intern – Platform Engineering",
    location: "Los Gatos, CA",
    workMode: "HYBRID",
    applyUrl: "https://jobs.netflix.com/search?q=intern",
    description: "Netflix engineering interns work on the systems that stream entertainment to 270+ million members in 190+ countries. You'll contribute to our platform, data, or product teams and have a real impact on the Netflix experience.",
    requirements: "Pursuing a BS or MS in Computer Science. Strong programming fundamentals. Experience with distributed systems, backend development, or data engineering preferred.",
    skills: ["Java", "Python", "Go", "Kafka", "AWS"],
  },
  {
    companySlug: "linkedin",
    companyName: "LinkedIn",
    title: "Software Engineering Intern",
    location: "Sunnyvale, CA",
    workMode: "HYBRID",
    applyUrl: "https://careers.linkedin.com/students",
    description: "LinkedIn's internship program gives students the opportunity to create economic opportunity for the global workforce. You'll work on features used by 900+ million professionals worldwide, from our core product to our AI and data engineering platforms.",
    requirements: "Currently pursuing BS or MS in Computer Science or related field. Solid understanding of data structures, algorithms, and object-oriented programming.",
    skills: ["Java", "Python", "TypeScript", "Kafka", "Hadoop"],
  },
  {
    companySlug: "uber",
    companyName: "Uber",
    title: "Software Engineering Intern",
    location: "San Francisco, CA",
    workMode: "HYBRID",
    applyUrl: "https://www.uber.com/us/en/careers/list/?query=intern",
    description: "Uber interns work on complex distributed systems at massive scale across maps, rides, eats, freight, and more. You'll get real ownership of projects and mentorship from some of the best engineers in the world.",
    requirements: "Pursuing a BS/MS in Computer Science or equivalent. Proficiency in at least one programming language (Go, Java, Python, or C++). Strong problem-solving skills.",
    skills: ["Go", "Java", "Python", "Kubernetes", "PostgreSQL"],
  },
  {
    companySlug: "salesforce",
    companyName: "Salesforce",
    title: "Futureforce Software Engineering Intern",
    location: "San Francisco, CA",
    workMode: "HYBRID",
    applyUrl: "https://www.salesforce.com/futureforce/internships/",
    description: "The Salesforce Futureforce University Recruiting program is dedicated to attracting, retaining, and cultivating next generation talent. As an intern you'll work on real cloud products, get mentorship, and participate in our Ohana culture.",
    requirements: "Pursuing BS or MS in Computer Science or engineering. Experience with Java, Python, or JavaScript. Interest in cloud platforms and enterprise software.",
    skills: ["Java", "Python", "JavaScript", "Salesforce Platform", "SQL"],
  },
  {
    companySlug: "atlassian",
    companyName: "Atlassian",
    title: "Software Engineer Intern",
    location: "Remote",
    workMode: "REMOTE",
    applyUrl: "https://www.atlassian.com/company/careers/all-jobs?team=Internship",
    description: "Atlassian's engineering intern program is fully remote-first. You'll work on Jira, Confluence, Trello, or Bitbucket alongside world-class engineers. Atlassian believes internship projects should be real, impactful work — not busy work.",
    requirements: "Pursuing BS or MS in Computer Science. Proficient in at least one programming language. Familiarity with collaborative development tools (Git, CI/CD).",
    skills: ["TypeScript", "React", "Java", "Kotlin", "GraphQL"],
  },
  {
    companySlug: "adobe",
    companyName: "Adobe",
    title: "Software Engineer Intern",
    location: "San Jose, CA",
    workMode: "HYBRID",
    applyUrl: "https://www.adobe.com/careers/university.html",
    description: "Adobe interns work on creative software used by millions of creatives, marketers, and enterprises worldwide. You'll contribute to Photoshop, Illustrator, Acrobat, Creative Cloud, or Adobe Experience Cloud and ship real features.",
    requirements: "Pursuing BS or MS in Computer Science or a related field. Strong programming skills. Interest in creative tools, AI/ML, or cloud applications.",
    skills: ["C++", "Python", "TypeScript", "React", "AWS"],
  },
  {
    companySlug: "twilio",
    companyName: "Twilio",
    title: "Software Engineering Intern – Hatch Program",
    location: "Remote",
    workMode: "REMOTE",
    applyUrl: "https://www.twilio.com/company/jobs#search?q=intern",
    description: "Twilio Hatch is our award-winning internship program designed to give students real world experience building communications products. You'll ship production code, mentor with senior engineers, and attend learning sessions.",
    requirements: "Pursuing BS or MS in Computer Science. Coding experience in Python, Java, or JavaScript. Interest in communications APIs and developer tools.",
    skills: ["Python", "JavaScript", "Node.js", "REST APIs", "Twilio"],
  },
  {
    companySlug: "snowflake",
    companyName: "Snowflake",
    title: "Software Engineer Intern",
    location: "San Mateo, CA",
    workMode: "HYBRID",
    applyUrl: "https://careers.snowflake.com/us/en/search-results?qkeyword=intern",
    description: "Snowflake interns work on the Data Cloud — helping companies store, process, and analyze massive datasets. You'll work on the core query engine, storage, security, or developer experience teams alongside world-class engineers.",
    requirements: "Pursuing BS or MS in Computer Science. Strong background in data structures, algorithms, and systems. Experience with SQL and distributed computing a plus.",
    skills: ["Java", "Python", "SQL", "Distributed Systems", "Go"],
  },
];

async function main() {
  console.log(`\n[SeedInternships] Starting — ${INTERNSHIPS.length} real internship listings\n`);

  const processedIds: string[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const intern of INTERNSHIPS) {
    // Find company by slug prefix
    const company = await prisma.company.findFirst({
      where: {
        OR: [
          { slug: { startsWith: intern.companySlug } },
          { name: { equals: intern.companyName, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, slug: true },
    });

    if (!company) {
      console.log(`  [SKIP] "${intern.companyName}" — not found in DB`);
      skipped++;
      continue;
    }

    const jobSlug = slugify(`${company.slug}-${intern.title}`, { lower: true, strict: true });

    const upserted = await prisma.job.upsert({
      where: { slug: jobSlug },
      create: {
        companyId: company.id,
        title: intern.title,
        slug: jobSlug,
        description: intern.description,
        requirements: intern.requirements,
        responsibilities: `Work on real production systems at ${company.name}. Collaborate with senior engineers. Own a project from design to deployment. Participate in code reviews and design docs.`,
        location: intern.location,
        type: "INTERNSHIP",
        workMode: intern.workMode,
        applyUrl: intern.applyUrl,
        skillsRequired: intern.skills,
        status: "OPEN",
        externalJobId: `seeded-intern-${company.slug}`,
        atsSource: "mock",
      },
      update: {
        title: intern.title,
        description: intern.description,
        requirements: intern.requirements,
        location: intern.location,
        type: "INTERNSHIP",
        workMode: intern.workMode,
        applyUrl: intern.applyUrl,
        skillsRequired: intern.skills,
        status: "OPEN",
        atsSource: "mock",
      },
    });

    processedIds.push(upserted.id);
    const isNew = upserted.createdAt.getTime() === upserted.updatedAt.getTime();
    if (isNew) { created++; console.log(`  [CREATE] ${company.name} — ${intern.title}`); }
    else        { updated++; console.log(`  [UPDATE] ${company.name} — ${intern.title}`); }
  }

  console.log(`\n[SeedInternships] Done — Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);

  if (processedIds.length > 0) {
    console.log(`\n[SeedInternships] Syncing ${processedIds.length} docs to Elasticsearch...`);
    await syncJobsToElasticBulk(processedIds);
    console.log("[SeedInternships] ES sync complete.");
  }

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
