import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError("GEMINI_API_KEY environment variable is not configured.", 500);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new AppError(`AI API Request failed: ${errorText}`, 502);
  }

  const body: any = await response.json();
  const rawText = body?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  return rawText;
}

export const generateResumeReview = async (userId: string) => {
  // Fetch the user, profile, experiences, educations, verified skills, and projects
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      skills: { include: { skill: true } },
      experiences: { include: { company: true } },
      educations: { include: { college: true } },
      ownedProjects: true,
    },
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const profile = user.profile;
  const experiences = user.experiences;
  const educations = user.educations;
  const skills = user.skills;
  const projects = user.ownedProjects;

  const profileContext = {
    fullName: profile?.fullName || user.username,
    headline: profile?.headline || "",
    bio: profile?.bio || "",
    skills: skills.map((s) => s.skill.name),
    experiences: experiences.map((exp) => ({
      title: exp.title,
      company: exp.companyName || exp.company?.name,
      description: exp.description,
      techStack: exp.techStack,
    })),
    educations: educations.map((edu) => ({
      degree: edu.degree,
      fieldOfStudy: edu.fieldOfStudy,
      college: edu.college?.name || edu.customCollegeName,
      cgpa: edu.cgpa,
    })),
    projects: projects.map((proj) => ({
      title: proj.title,
      description: proj.description,
      techStack: proj.techStack,
    })),
  };

  const prompt = `You are an expert technical recruiter and resume auditor.
Review the following user profile and resume details:
${JSON.stringify(profileContext, null, 2)}

Provide a strict resume analysis report. Your output must be a valid JSON object only. Do not wrap in markdown code blocks or add any other text outside the JSON.

Required JSON format:
{
  "score": 85,
  "strengths": ["Clear work history", "Strong tech stack"],
  "suggestions": ["Add more details to project X", "Verify skill Y"],
  "keywordGaps": ["Docker", "CI/CD", "TypeScript"]
}
`;

  const rawResult = await callGemini(prompt);
  // Clean markdown JSON wrapper if present
  const cleanedText = rawResult.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();

  try {
    const feedback = JSON.parse(cleanedText);

    // Save the review to the database
    const review = await prisma.resumeReview.create({
      data: {
        userId,
        score: feedback.score || 0,
        feedback: {
          strengths: feedback.strengths || [],
          suggestions: feedback.suggestions || [],
          keywordGaps: feedback.keywordGaps || [],
        },
      },
    });

    return review;
  } catch (error) {
    console.error("Failed to parse Gemini response:", cleanedText);
    throw new AppError("Failed to parse AI review feedback. Please try again.", 500);
  }
};

export const getResumeReviews = async (userId: string) => {
  return prisma.resumeReview.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};
