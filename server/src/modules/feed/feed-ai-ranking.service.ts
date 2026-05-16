import prisma from "shared/database/prisma";

type FeedItemType =
  | "POST"
  | "PROJECT"
  | "HACKATHON"
  | "JOB"
  | "COMPANY";

interface FeedItem {
  type: FeedItemType;
  score: number;
  data: any;
}

export const applyAiFeedRanking =  async (
    userId: string,
    feed: FeedItem[]
  ) => {

    //
    // USER INTEREST PROFILE
    //
    const interestProfile =
      await prisma.userInterestProfile.findUnique({
        where: {
          userId,
        },
      });

    //
    // USER AFFINITIES
    //
    const affinities =
      await prisma.userAffinity.findMany({
        where: {
          userId,
          score: {
            gt: 20,
          },
        },

        take: 100,
      });

    const affinityMap =
      new Map(
        affinities.map(
          (a) => [
            a.targetUserId,
            a.score,
          ]
        )
      );

    //
    // INTERACTION MEMORY
    //
    const interactions =
      await prisma.feedInteraction.findMany({
        where: {
          userId,
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 300,
      });

    //
    // BUILD INTERACTION PREFERENCES
    //
    const interactionPreferences =
      new Map<string, number>();

    for (
      const interaction of interactions
    ) {

      const key =
        `${interaction.targetType}:${interaction.targetId}`;

      const current =
        interactionPreferences.get(
          key
        ) || 0;

      let boost = 1;

      switch (
        interaction.interactionType
      ) {

        case "LIKE":
          boost = 6;
          break;

        case "SAVE":
          boost = 8;
          break;

        case "CLICK":
          boost = 3;
          break;

        case "APPLY":
          boost = 10;
          break;

        case "OPEN_PROJECT":
          boost = 5;
          break;

        case "OPEN_PROFILE":
          boost = 4;
          break;

        case "SHARE":
          boost = 9;
          break;

        default:
          boost = 1;
      }

      interactionPreferences.set(
        key,
        current + boost
      );
    }

    //
    // AI RE-RANKING
    //
    const rankedFeed =
      feed.map((item) => {

        let score =
          item.score;

        //
        // AUTHOR AFFINITY BOOST
        //
        const authorId =
          item.data.authorId ||
          item.data.ownerId ||
          item.data.createdById ||
          item.data.postedById;

        if (
          authorId &&
          affinityMap.has(
            authorId
          )
        ) {

          score +=
            (
              affinityMap.get(
                authorId
              ) || 0
            ) * 1.5;
        }

        //
        // INTERACTION MEMORY BOOST
        //
        const interactionKey =
          `${item.type}:${item.data.id}`;

        const interactionScore =
          interactionPreferences.get(
            interactionKey
          ) || 0;

        score +=
          interactionScore * 4;

        //
        // SKILL VECTOR BOOST
        //
        if (
          interestProfile
        ) {

          const preferredSkills =
            Array.isArray(
              interestProfile.interestedSkills
            )
              ? interestProfile.interestedSkills
              : [];

          //
          // POSTS
          //
          if (
            item.type ===
            "POST"
          ) {

            const content =
              item.data.content?.toLowerCase() ||
              "";

            for (
              const skill of preferredSkills
            ) {

              if (
                typeof skill ===
                  "string" &&
                content.includes(
                  skill.toLowerCase()
                )
              ) {
                score += 15;
              }
            }
          }

          //
          // PROJECTS
          //
          if (
            item.type ===
            "PROJECT"
          ) {

            const techStack =
              Array.isArray(
                item.data.techStack
              )
                ? item.data.techStack
                : [];

            const overlap =
              techStack.filter(
                (
                  tech: any
                ) =>
                  typeof tech ===
                    "string" &&
                  preferredSkills.includes(
                    tech
                      .toLowerCase()
                  )
              );

            score +=
              overlap.length * 18;
          }

          //
          // JOBS
          //
          if (
            item.type ===
            "JOB"
          ) {

            const overlap =
              item.data.skillsRequired.filter(
                (
                  skill: string
                ) =>
                  preferredSkills.includes(
                    skill.toLowerCase()
                  )
              );

            score +=
              overlap.length * 20;
          }
        }

        //
        // HIGH QUALITY CREATOR BOOST
        //
        const creatorEngineeringScore =
          item.data.author
            ?.engineeringScore ||
          item.data.owner
            ?.engineeringScore ||
          item.data.createdBy
            ?.engineeringScore ||
          0;

        score +=
          creatorEngineeringScore *
          0.04;

        //
        // DIVERSITY PENALTY
        //
        if (
          item.type ===
          "COMPANY"
        ) {
          score -= 20;
        }

        //
        // ELITE ENGINEERS BOOST
        //
        const creatorTrustLevel =
          item.data.author
            ?.trustLevel ||
          item.data.owner
            ?.trustLevel ||
          item.data.createdBy
            ?.trustLevel;

        if (
          creatorTrustLevel ===
          "ELITE"
        ) {
          score += 120;
        }

        if (
          creatorTrustLevel ===
          "ADVANCED"
        ) {
          score += 70;
        }

        return {
          ...item,
          aiScore:
            Math.round(score),
        };
      });

    //
    // FINAL AI SORT
    //
    rankedFeed.sort(
      (a, b) =>
        b.aiScore -
        a.aiScore
    );

    return rankedFeed;
  };