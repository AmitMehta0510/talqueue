import { Response } from "express";
import puppeteer from "puppeteer";
import prisma from "shared/database/prisma";
import asyncHandler from "shared/utils/asyncHandler";
import AppError from "shared/errors/AppError";

// Premium print-friendly HTML/CSS layout generator
export const getResumeHtml = (data: any): string => {
  const { user, profile, experiences, educations, verifiedSkills, projects } = data;

  const fullName = profile?.fullName || user.username || "Candidate Name";
  const headline = profile?.headline || "Software Engineer";
  const bio = profile?.bio || "";
  const location = profile?.location || "";
  const email = user.email || "";
  
  const githubUrl = profile?.githubUrl || "";
  const linkedinUrl = profile?.linkedinUrl || "";
  const portfolioUrl = profile?.portfolioUrl || "";

  // Helper to format dates
  const formatDate = (dateStr: any) => {
    if (!dateStr) return "Present";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  // HTML parts
  const contactInfo = [
    email ? `<a href="mailto:${email}">${email}</a>` : "",
    githubUrl ? `<a href="${githubUrl}" target="_blank">GitHub</a>` : "",
    linkedinUrl ? `<a href="${linkedinUrl}" target="_blank">LinkedIn</a>` : "",
    portfolioUrl ? `<a href="${portfolioUrl}" target="_blank">Portfolio</a>` : "",
    location ? `<span>${location}</span>` : "",
  ].filter(Boolean).join(" &bull; ");

  const skillsHtml = verifiedSkills && verifiedSkills.length > 0 
    ? `<div class="section">
         <div class="section-title">Verified Skills</div>
         <div class="skills-container">
           ${verifiedSkills.map((us: any) => `<span class="skill-badge">${us.skill?.name || "Skill"}</span>`).join("")}
         </div>
       </div>`
    : "";

  const experienceHtml = experiences && experiences.length > 0
    ? `<div class="section">
         <div class="section-title">Professional Experience</div>
         ${experiences.map((exp: any) => `
           <div class="entry">
             <div class="entry-header">
               <div class="entry-title"><strong>${exp.title}</strong> at ${exp.companyName || exp.company?.name || "Company"}</div>
               <div class="entry-date">${formatDate(exp.startDate)} &ndash; ${exp.isCurrent ? "Present" : formatDate(exp.endDate)}</div>
             </div>
             ${exp.description ? `<p class="entry-desc">${exp.description}</p>` : ""}
             ${exp.techStack && Array.isArray(exp.techStack) && exp.techStack.length > 0 ? `
               <div class="tech-stack-labels">
                 <strong>Tech Stack:</strong> ${exp.techStack.map((s: string) => `<span class="label-tag">${s}</span>`).join(" ")}
               </div>
             ` : ""}
           </div>
         `).join("")}
       </div>`
    : "";

  const projectsHtml = projects && projects.length > 0
    ? `<div class="section">
         <div class="section-title">Projects</div>
         ${projects.map((proj: any) => `
           <div class="entry">
             <div class="entry-header">
               <div class="entry-title">
                 <strong>${proj.title}</strong>
                 ${proj.githubUrl ? `<span class="proj-link">(<a href="${proj.githubUrl}" target="_blank">GitHub</a>)</span>` : ""}
                 ${proj.liveUrl ? `<span class="proj-link">(<a href="${proj.liveUrl}" target="_blank">Live Demo</a>)</span>` : ""}
               </div>
             </div>
             ${proj.shortDescription || proj.description ? `<p class="entry-desc">${proj.shortDescription || proj.description}</p>` : ""}
             ${proj.techStack && Array.isArray(proj.techStack) && proj.techStack.length > 0 ? `
               <div class="tech-stack-labels">
                 <strong>Technologies:</strong> ${proj.techStack.map((s: string) => `<span class="label-tag">${s}</span>`).join(" ")}
               </div>
             ` : ""}
           </div>
         `).join("")}
       </div>`
    : "";

  const educationHtml = educations && educations.length > 0
    ? `<div class="section">
         <div class="section-title">Education</div>
         ${educations.map((edu: any) => `
           <div class="entry">
             <div class="entry-header">
               <div class="entry-title"><strong>${edu.degree || "Degree"} in ${edu.fieldOfStudy || "Field of Study"}</strong></div>
               <div class="entry-date">${edu.startYear || ""} &ndash; ${edu.current ? "Present" : (edu.endYear || "")}</div>
             </div>
             <div class="entry-subtitle">${edu.college?.name || edu.customCollegeName || "College"}</div>
             ${edu.cgpa !== null && edu.cgpa !== undefined ? `<div class="entry-gpa">GPA: ${edu.cgpa}</div>` : ""}
           </div>
         `).join("")}
       </div>`
    : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Resume - ${fullName}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Inter', -apple-system, sans-serif;
          color: #1e293b;
          background-color: #ffffff;
          line-height: 1.45;
          padding: 0;
          font-size: 11px;
        }
        a {
          color: #2563eb;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 15px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 12px;
        }
        .name {
          font-size: 22px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 2px;
          letter-spacing: -0.5px;
        }
        .headline {
          font-size: 13px;
          font-weight: 500;
          color: #475569;
          margin-bottom: 4px;
        }
        .contact {
          font-size: 9.5px;
          color: #64748b;
        }
        .bio {
          margin-bottom: 15px;
          color: #334155;
          font-style: italic;
          text-align: justify;
          font-size: 10px;
        }
        .section {
          margin-bottom: 15px;
        }
        .section-title {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #0f172a;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 3px;
          margin-bottom: 6px;
        }
        .entry {
          margin-bottom: 8px;
        }
        .entry:last-child {
          margin-bottom: 0;
        }
        .entry-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 1px;
        }
        .entry-title {
          font-size: 11px;
          color: #1e293b;
        }
        .entry-subtitle {
          font-size: 10px;
          color: #475569;
          font-weight: 500;
          margin-bottom: 1px;
        }
        .entry-date {
          font-size: 9.5px;
          color: #64748b;
          font-weight: 500;
        }
        .entry-desc {
          font-size: 9.5px;
          color: #475569;
          text-align: justify;
          margin-bottom: 2px;
        }
        .entry-gpa {
          font-size: 9.5px;
          font-weight: 500;
          color: #334155;
        }
        .tech-stack-labels {
          font-size: 9px;
          color: #475569;
        }
        .label-tag {
          background-color: #f1f5f9;
          color: #334155;
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 8.5px;
          margin-right: 2px;
          display: inline-block;
        }
        .proj-link {
          font-size: 9px;
          margin-left: 5px;
          font-weight: 400;
          display: inline-block;
        }
        .skills-container {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .skill-badge {
          background-color: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
          font-weight: 500;
          padding: 1px 6px;
          border-radius: 3px;
          font-size: 9px;
        }
        @media print {
          body {
            font-size: 10.5px;
          }
          .container {
            max-width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="name">${fullName}</div>
          <div class="headline">${headline}</div>
          <div class="contact">${contactInfo}</div>
        </div>
        ${bio ? `<div class="bio">${bio}</div>` : ""}
        ${skillsHtml}
        ${experienceHtml}
        ${projectsHtml}
        ${educationHtml}
      </div>
    </body>
    </html>
  `;
};

// Raw service function to generate PDF buffer (separating concern from Express)
export const buildResumePdf = async (userId: string): Promise<{ buffer: Buffer; username: string }> => {
  // Fetch the user, profile, experiences, educations, verified skills, and projects
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        include: {
          college: true,
          department: true,
        }
      },
      skills: {
        where: { verified: true },
        include: { skill: true },
      },
      experiences: {
        include: { company: true },
        orderBy: { startDate: "desc" },
      },
      educations: {
        include: { college: true },
        orderBy: { startYear: "desc" },
      },
      ownedProjects: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  // Map data structure
  const resumeData = {
    user,
    profile: user.profile,
    experiences: user.experiences,
    educations: user.educations,
    verifiedSkills: user.skills,
    projects: user.ownedProjects,
  };

  const htmlContent = getResumeHtml(resumeData);

  // Use Puppeteer to generate PDF
  let browser: any = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-zygote",
      ],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "load" });
    
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "35px",
        bottom: "35px",
        left: "35px",
        right: "35px",
      },
    });

    return {
      buffer: Buffer.from(pdfBuffer),
      username: user.username,
    };
  } catch (error: any) {
    console.error("PDF Generation failed:", error);
    throw new AppError(`Failed to generate PDF resume: ${error.message}`, 500);
  } finally {
    if (browser !== null) {
      await browser.close().catch((err: any) => {
        console.error("Failed to close puppeteer browser instance:", err);
      });
    }
  }
};

// Express handler
export const generateResumePdf = asyncHandler(async (req: any, res: Response) => {
  const userId = req.body.userId || req.params.userId;

  if (!userId) {
    throw new AppError("User ID is required.", 400);
  }

  const { buffer, username } = await buildResumePdf(userId);

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="resume_${username}.pdf"`,
    "Content-Length": buffer.length,
  });

  res.end(buffer);
});
