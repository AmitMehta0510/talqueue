type FeedItemType =
  | "POST"
  | "PROJECT"
  | "HACKATHON"
  | "JOB"
  | "COMPANY";

export const calculateFeedScore = (
  item: any,

  type: FeedItemType,

  context: {
    followingIds: string[];

    skillNames: string[];

    isFresher: boolean;

    interactionMap: Map<
      string,
      number
    >;

    affinityMap: Map<
      string,
      number
    >;
  }
) => {

  let score = 0;

  //
  // RECENCY BOOST
  //
  if (item.createdAt) {

    const hoursOld =
      (
        Date.now() -
        new Date(
          item.createdAt
        ).getTime()
      ) /
      (
        1000 *
        60 *
        60
      );

    score += Math.max(
      0,
      72 - hoursOld
    );
  }

  switch (type) {

    //
    // POSTS
    //
    case "POST":

      //
      // Following boost
      //
      if (
        context.followingIds.includes(
          item.authorId
        )
      ) {
        score += 120;
      }

      //
      // Engagement
      //
      score +=
        item._count.likes * 4;

      score +=
        item._count.comments * 6;

      //
      // Engineering authority
      //
      score +=
        (
          item.author
            ?.engineeringScore ||
          0
        ) * 0.08;

      //
      // Trust level
      //
      switch (
        item.author
          ?.trustLevel
      ) {

        case "ELITE":
          score += 100;
          break;

        case "ADVANCED":
          score += 70;
          break;

        case "VERIFIED":
          score += 40;
          break;
      }

      //
      // Skill overlap
      //
      const postContent =
        item.content?.toLowerCase() ||
        "";

      for (
        const skill of
        context.skillNames
      ) {

        if (
          postContent.includes(
            skill.toLowerCase()
          )
        ) {
          score += 15;
        }
      }

      //
      // Interaction memory
      //
      score +=
        (
          context.interactionMap.get(
            `POST:${item.id}`
          ) || 0
        ) * 5;

      //
      // Affinity boost
      //
      score +=
        context.affinityMap.get(
          item.authorId
        ) || 0;

      break;

    //
    // PROJECTS
    //
    case "PROJECT":

      //
      // Verified project
      //
      if (item.verified) {
        score += 100;
      }

      //
      // Live project
      //
      if (item.liveUrl) {
        score += 60;
      }

      //
      // Featured
      //
      if (item.featured) {
        score += 40;
      }

      //
      // GitHub quality
      //
      score += Math.min(
        item.starsCount * 2,
        100
      );

      score += Math.min(
        item.forksCount,
        40
      );

      score += Math.min(
        item.contributorsCount * 5,
        40
      );

      //
      // Looking for relevance
      //
      if (
        item.lookingFor
      ) {

        const lookingFor =
          item.lookingFor.toLowerCase();

        for (
          const skill of
          context.skillNames
        ) {

          if (
            lookingFor.includes(
              skill.toLowerCase()
            )
          ) {
            score += 30;
          }
        }
      }

      //
      // Tech stack overlap
      //
      const techStack =
        Array.isArray(
          item.techStack
        )
          ? item.techStack
          : [];

      const overlap =
        techStack.filter(
          (tech: any) =>
            typeof tech ===
              "string" &&
            context.skillNames.includes(
              tech.toLowerCase()
            )
        );

      score +=
        overlap.length * 35;

      //
      // Engineering strength
      //
      score +=
        (
          item.engineeringScore ||
          0
        ) * 0.3;

      //
      // Interaction memory
      //
      score +=
        (
          context.interactionMap.get(
            `PROJECT:${item.id}`
          ) || 0
        ) * 6;

      //
      // Owner affinity
      //
      score +=
        context.affinityMap.get(
          item.ownerId
        ) || 0;

      break;

    //
    // HACKATHONS
    //
    case "HACKATHON":

      score += 80;

      //
      // Verified
      //
      if (item.verified) {
        score += 60;
      }

      //
      // Featured
      //
      if (item.featured) {
        score += 60;
      }

      //
      // Deadline urgency
      //
      const daysLeft =
        (
          new Date(
            item.registrationDeadline
          ).getTime() -
          Date.now()
        ) /
        (
          1000 *
          60 *
          60 *
          24
        );

      score += Math.max(
        0,
        40 - daysLeft
      );

      //
      // Organizer quality
      //
      score +=
        (
          item.createdBy
            ?.engineeringScore ||
          0
        ) * 0.05;

      //
      // Interaction memory
      //
      score +=
        (
          context.interactionMap.get(
            `HACKATHON:${item.id}`
          ) || 0
        ) * 5;

      //
      // Organizer affinity
      //
      score +=
        context.affinityMap.get(
          item.createdById
        ) || 0;

      break;

    //
    // JOBS
    //
    case "JOB":

      //
      // Featured jobs
      //
      if (item.featured) {
        score += 80;
      }

      //
      // Skill overlap
      //
      const matchingSkills =
        item.skillsRequired.filter(
          (skill: string) =>
            context.skillNames.includes(
              skill.toLowerCase()
            )
        );

      score +=
        matchingSkills.length * 30;

      //
      // Internship boost
      //
      if (
        item.type ===
          "INTERNSHIP" &&
        context.isFresher
      ) {
        score += 120;
      }

      //
      // Application activity
      //
      score +=
        item.applicationsCount * 0.5;

      //
      // Views
      //
      score +=
        item.views * 0.1;

      //
      // Remote boost
      //
      if (
        item.workMode ===
        "REMOTE"
      ) {
        score += 20;
      }

      //
      // Interaction memory
      //
      score +=
        (
          context.interactionMap.get(
            `JOB:${item.id}`
          ) || 0
        ) * 6;

      break;

    //
    // COMPANIES
    //
    case "COMPANY":

      //
      // Hiring companies
      //
      if (
        item.hiringEnabled
      ) {
        score += 50;
      }

      //
      // Ratings
      //
      score +=
        item.totalRatings || 0;

      //
      // Interaction memory
      //
      score +=
        (
          context.interactionMap.get(
            `COMPANY:${item.id}`
          ) || 0
        ) * 5;

      break;
  }

  return Math.round(
    score
  );
};