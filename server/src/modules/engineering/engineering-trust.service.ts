import prisma from "shared/database/prisma";

export const calculateTrustLevel =  async (
    userId: string
  ) => {

    //
    // USER
    //
    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        include: {
          experiences: true,

          badges: true,

          projectMemberships: {
            include: {
              project: true,
            },
          },
        },
      });

    if (!user) {
      return "BEGINNER";
    }

    //
    // VERIFIED PROJECTS
    //
    const verifiedProjects =
      user.projectMemberships.filter(
        (membership) =>
          membership.project
            .verified
      ).length;

    // COMPLETED PROJECTS
    const completedProjects =
      user.projectMemberships.filter(
        (membership) =>
          membership.project
            .status ===
          "COMPLETED"
      ).length;

    // VERIFIED EXPERIENCES
    const verifiedExperiences =
      user.experiences.filter(
        (experience) =>
          experience.verified
      ).length;

    // HACKATHON WINS
    const hackathonWins =
      await prisma.hackathonWinner.count({
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

    // VERIFIED HACKATHON WINS
    const verifiedHackathonWins =
      await prisma.hackathonWinner.count({
        where: {

          hackathon: {
            verified: true,
          },

          team: {
            members: {
              some: {
                userId,
              },
            },
          },
        },
      });

    // ENGINEERING SCORE
    const engineeringScore =
      user.engineeringScore;

    // REPUTATION
    const reputationScore =
      user.reputationScore;

    // TRUST LEVEL
    let trustLevel:
      | "BEGINNER"
      | "EMERGING"
      | "VERIFIED"
      | "ADVANCED"
      | "ELITE" =
      "BEGINNER";

    // EMERGING
    if (
      engineeringScore >= 100 ||
      completedProjects >= 1
    ) {

      trustLevel =
        "EMERGING";
    }

    // VERIFIED
    if (

      verifiedProjects >= 1 ||

      verifiedExperiences >= 1 ||

      hackathonWins >= 1 ||

      verifiedHackathonWins >= 1
    ) {

      trustLevel =
        "VERIFIED";
    }

    // ADVANCED
    if (

      engineeringScore >= 500 &&

      (
        verifiedProjects >= 2 ||

        verifiedExperiences >= 1 ||

        verifiedHackathonWins >= 2
      )
    ) {

      trustLevel =
        "ADVANCED";
    }

    // ELITE
    if (

      engineeringScore >= 1200 &&

      verifiedProjects >= 4 &&

      (
        verifiedExperiences >= 1 ||

        verifiedHackathonWins >= 3
      ) &&

      reputationScore >= 500
    ) {

      trustLevel =
        "ELITE";
    }

    // PERSIST
    await prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        trustLevel,
      },
    });

    return trustLevel;
  };