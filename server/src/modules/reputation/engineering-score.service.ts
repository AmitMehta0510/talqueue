import prisma from "shared/database/prisma";
import { calculateTrustLevel } from "../engineering/engineering-trust.service";

export const calculateEngineeringScore = async (
    userId: string
  ) => {

    // USER PROJECTS
    const projects =  await prisma.project.findMany({
        where: {
          members: {
            some: {
              userId,
            },
          },

          deletedAt: null,
        },
      });

    // EXPERIENCES
    const experiences =  await prisma.experience.findMany({
        where: {
          userId,
        },
      });

    // HACKATHON WINS
    const hackathonWins =  await prisma.hackathonWinner.count({
        where: {
          team: {
            members: {
              some: {
                userId,
              },
            },
          },
        },
      });

    // HACKATHON SUBMISSIONS
    const submissions =  await prisma.hackathonSubmission.findMany({
        where: {
          team: {
            members: {
              some: {
                userId,
              },
            },
          },
        },
      });

    // START SCORE
    let score = 0;

    // PROJECT SCORING
    for (const project of projects) {

      //
      // Verified project
      //
      if (project.verified) {
        score += 25;
      }

      //
      // Completed project
      //
      if (
        project.status ===
        "COMPLETED"
      ) {
        score += 20;
      }

      //
      // Live deployment
      //
      if (
        project.deploymentStatus ===
        "LIVE"
      ) {
        score += 15;
      }

      //
      // GitHub stars
      //
      score += Math.min(
        project.starsCount * 0.5,
        20
      );

      //
      // Forks
      //
      score += Math.min(
        project.forksCount * 0.3,
        10
      );

      //
      // Contributors
      //
      score += Math.min(
        project.contributorsCount * 2,
        20
      );

      //
      // Commit activity
      //
      score += Math.min(
        project.commitCount * 0.05,
        25
      );

      //
      // Featured project
      //
      if (project.featured) {
        score += 15;
      }

      //
      // Fresh repo activity
      //
      if (
        project.repoUpdatedAt
      ) {

        const diffDays =
          Math.floor(
            (
              Date.now() -
              new Date(
                project.repoUpdatedAt
              ).getTime()
            ) /
            (
              1000 *
              60 *
              60 *
              24
            )
          );

        if (diffDays <= 30) {
          score += 10;
        }
      }
    }

    // EXPERIENCE SCORING
    for (const experience of experiences) {

      let experienceScore = 0;

      //
      // Verified experience
      //
      if (experience.verified) {
        experienceScore += 20;
      }

      //
      // Work email verified
      //
      if (
        experience.workEmailVerified
      ) {
        experienceScore += 15;
      }

      //
      // Current engineering role
      //
      const engineeringKeywords = [
        "engineer",
        "developer",
        "backend",
        "frontend",
        "full stack",
        "software",
        "sde",
        "devops",
        "data",
        "ml",
        "ai",
      ];

      const title =
        experience.title.toLowerCase();

      const isEngineeringRole =
        engineeringKeywords.some(
          (keyword) =>
            title.includes(keyword)
        );

      if (isEngineeringRole) {
        experienceScore += 10;
      }

      //
      // Duration scoring
      //
      const endDate =
        experience.endDate ||
        new Date();

      const months =
        (
          (
            endDate.getTime() -
            experience.startDate.getTime()
          ) /
          (
            1000 *
            60 *
            60 *
            24 *
            30
          )
        );

      //
      // Ignore suspiciously short experiences
      //
      if (months >= 3) {
        experienceScore +=
          Math.min(
            months * 0.8,
            20
          );
      }

      //
      // Tech stack exists
      //
      if (
        experience.techStack &&
        Array.isArray(
          experience.techStack
        )
      ) {
        experienceScore += 5;
      }

      //
      // Skills used
      //
      if (
        experience.skillsUsed &&
        Array.isArray(
          experience.skillsUsed
        )
      ) {
        experienceScore += 5;
      }

      //
      // Suspicious penalty
      //
      if (
        experience.suspicious
      ) {
        experienceScore -= 25;
      }

      //
      // Cap per experience
      //
      experienceScore =
        Math.min(
          experienceScore,
          60
        );

      score += experienceScore;
    }
    //Hackathon wins
    
    score +=
      hackathonWins * 40;

    // Submission engineering scores
    for (  const submission of submissions ) {

      score +=
        (
          submission.engineeringScore ||
          0
        ) * 0.5;

      //
      // Verified project
      //
      if (
        submission.verifiedProject
      ) {
        score += 10;
      }
    }

    // Clamp
    score = Math.min(
      Math.round(score),
      10000
    );

    // Persist
    await prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        engineeringScore:
          score,
      },
    });


// Recalculate trust level

await calculateTrustLevel(
  userId
);

    return score;
  };