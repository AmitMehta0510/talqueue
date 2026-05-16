import prisma from "shared/database/prisma";

export const calculateJobRecommendationScore =  async (
    userId: string,
    job: any
  ) => {

    //
    // User
    //
    const user =
      await prisma.user.findUnique({

        where: {
          id: userId,
        },

        include: {

          skills: {
            include: {
              skill: true,
            },
          },

          experiences: true,

          projectMemberships: {
            include: {
              project: true,
            },
          },
        },
      });

    if (!user) {
      return 0;
    }

    let score = 0;

    //
    // Skills
    //
    const userSkills =
      user.skills.map(
        (s) =>
          s.skill.name
            .toLowerCase()
      );

    const requiredSkills =
      (
        job.skillsRequired ||
        []
      ).map(
        (skill: string) =>
          skill.toLowerCase()
      );

    const matchedSkills =
      requiredSkills.filter(
        (
          skill: string
        ) =>
          userSkills.includes(
            skill
          )
      );

    score +=
      matchedSkills.length *
      15;

    //
    // Engineering score
    //
    score += Math.min(
      user.engineeringScore *
        0.05,
      100
    );

    //
    // Trust level
    //
    const trustWeights = {

      BEGINNER: 5,

      EMERGING: 15,

      VERIFIED: 35,

      ADVANCED: 60,

      ELITE: 100,
    };

    score +=
      trustWeights[
        user.trustLevel
      ] || 0;

    //
    // Verified projects
    //
    const verifiedProjects =
      user.projectMemberships.filter(
        (membership) =>
          membership.project
            .verified
      ).length;

    score +=
      verifiedProjects * 20;

    //
    // Live projects
    //
    const liveProjects =
      user.projectMemberships.filter(
        (membership) =>
          membership.project
            .liveUrl
      ).length;

    score +=
      liveProjects * 10;

    //
    // GitHub strength
    //
    const totalStars =
      user.projectMemberships.reduce(
        (
          acc,
          membership
        ) =>
          acc +
          membership.project
            .starsCount,

        0
      );

    score += Math.min(
      totalStars * 0.5,
      50
    );

    //
    // Experience relevance
    //
    const yearsExperience =
      user.experiences.reduce(
        (
          acc,
          exp
        ) => {

          const end =
            exp.endDate ||
            new Date();

          const months =
            (
              end.getTime() -
              exp.startDate.getTime()
            ) /
            (
              1000 *
              60 *
              60 *
              24 *
              30
            );

          return (
            acc +
            months
          );
        },

        0
      ) / 12;

    score += Math.min(
      yearsExperience * 10,
      50
    );

    //
    // Clamp
    //
    return Math.min(
      Math.round(score),
      1000
    );
  };

export const recommendJobsForUserAdvanced =  async (
    userId: string,
    limit = 20
  ) => {

    //
    // Open jobs
    //
    const jobs =
      await prisma.job.findMany({

        where: {
          status: "OPEN",
        },

        include: {
          company: true,
        },

        take: 200,
      });

    //
    // Rank jobs
    //
    const ranked =
      await Promise.all(

        jobs.map(
          async (job) => {

            const recommendationScore =
              await calculateJobRecommendationScore(
                userId,
                job
              );

            return {

              ...job,

              recommendationScore,
            };
          }
        )
      );

    //
    // Sort
    //
    ranked.sort(
      (a, b) =>
        b.recommendationScore -
        a.recommendationScore
    );

    return ranked.slice(
      0,
      limit
    );
  };
  
export const recommendCollaborators =  async (
    userId: string,
    limit = 20
  ) => {

    //
    // Current user
    //
    const currentUser =
      await prisma.user.findUnique({

        where: {
          id: userId,
        },

        include: {

          skills: {
            include: {
              skill: true,
            },
          },
        },
      });

    if (!currentUser) {
      return [];
    }

    const currentSkills =
      currentUser.skills.map(
        (s) =>
          s.skill.name
            .toLowerCase()
      );

    //
    // Other engineers
    //
    const engineers =
      await prisma.user.findMany({

        where: {
          id: {
            not: userId,
          },
        },

        include: {

          profile: true,

          skills: {
            include: {
              skill: true,
            },
          },
        },

        take: 200,
      });

    //
    // Compatibility ranking
    //
    const ranked =
      engineers.map(
        (engineer) => {

          const skills =
            engineer.skills.map(
              (s) =>
                s.skill.name.toLowerCase()
            );

          //
          // Shared skills
          //
          const sharedSkills =
            skills.filter(
              (skill) =>
                currentSkills.includes(
                  skill
                )
            );

          let score = 0;

          //
          // Shared skills
          //
          score +=
            sharedSkills.length *
            15;

          //
          // Engineering strength
          //
          score +=
            engineer.engineeringScore *
            0.05;

          //
          // Trust
          //
          if (
            engineer.trustLevel ===
            "ELITE"
          ) {
            score += 50;
          }

          if (
            engineer.trustLevel ===
            "ADVANCED"
          ) {
            score += 30;
          }

          return {

            engineer,

            compatibilityScore:
              Math.round(
                score
              ),

            sharedSkills,
          };
        }
      );

    ranked.sort(
      (a, b) =>
        b.compatibilityScore -
        a.compatibilityScore
    );

    return ranked.slice(
      0,
      limit
    );
  };
  
export const recommendProjectsForUser =  async (
    userId: string,
    limit = 20
  ) => {

    //
    // User skills
    //
    const userSkills =
      await prisma.userSkill.findMany({

        where: {
          userId,
        },

        include: {
          skill: true,
        },
      });

    const skillNames =
      userSkills.map(
        (s) =>
          s.skill.name
            .toLowerCase()
      );

    //
    // Projects
    //
    const projects =
      await prisma.project.findMany({

        where: {
          deletedAt: null,

          visibility:
            "PUBLIC",
        },

        include: {

          owner: {
            include: {
              profile: true,
            },
          },
        },

        take: 200,
      });

    //
    // Ranking
    //
    const ranked =
      projects.map(
        (project) => {

          let score = 0;

          //
          // Verified
          //
          if (project.verified) {
            score += 50;
          }

          //
          // Live deployment
          //
          if (project.liveUrl) {
            score += 30;
          }

          //
          // GitHub metrics
          //
          score +=
            project.starsCount;

          score +=
            project.forksCount *
            0.5;

          //
          // Tech stack overlap
          //
          const techStack =
  Array.isArray(
    project.techStack
  )
    ? project.techStack.filter(
        (
          tech
        ): tech is string =>
          typeof tech ===
          "string"
      )
    : [];

const overlap =
  techStack.filter(
    (tech) =>
      skillNames.includes(
        tech.toLowerCase()
      )
  );

          score +=
            overlap.length * 15;

          return {

            ...project,

            recommendationScore:
              Math.round(
                score
              ),
          };
        }
      );

    ranked.sort(
      (a, b) =>
        b.recommendationScore -
        a.recommendationScore
    );

    return ranked.slice(
      0,
      limit
    );
  };
  
  