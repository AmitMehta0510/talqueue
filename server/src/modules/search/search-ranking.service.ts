export const calculateUserSearchScore = (
  user: any,
  context?: {
    skillNames?: string[];
    collegeId?: string;
  }
) => {

  let score = 0;

  //
  // ENGINEERING SCORE
  //
  score +=
    (user.engineeringScore || 0) *
    0.35;

  //
  // REPUTATION
  //
  score +=
    (user.reputationScore || 0) *
    0.15;

  //
  // TRUST LEVEL
  //
  switch (user.trustLevel) {

    case "ELITE":
      score += 250;
      break;

    case "ADVANCED":
      score += 180;
      break;

    case "VERIFIED":
      score += 120;
      break;

    case "EMERGING":
      score += 50;
      break;
  }

  //
  // OPEN TO COLLABORATION
  //
  if (
    user.acceptingCollaborators
  ) {
    score += 60;
  }

  //
  // OPEN TO REFERRALS
  //
  if (
    user.acceptingReferrals
  ) {
    score += 50;
  }

  //
  // OPEN TO WORK
  //
  if (user.openToWork) {
    score += 40;
  }

  //
  // SAME COLLEGE
  //
  if (
    context?.collegeId &&
    user.profile?.collegeId ===
      context.collegeId
  ) {
    score += 70;
  }

  //
  // SKILL MATCH
  //
  if (
    context?.skillNames?.length
  ) {

    const userSkillsSet = new Set<string>(
      user.skills.map(
        (s: any) =>
          s.skill.name.toLowerCase()
      )
    );

    const overlap =
      context.skillNames.filter(
        (skill) =>
          userSkillsSet.has(
            skill.toLowerCase()
          )
      );

    score += overlap.length * 40;
  }

  return Math.round(score);
};

export const calculateProjectSearchScore = (
  project: any,
  skillNames: string[] = []
) => {

  let score = 0;

  //
  // ENGINEERING SCORE
  //
  score +=
    (project.engineeringScore || 0) *
    0.4;

  //
  // VERIFIED
  //
  if (project.verified) {
    score += 200;
  }

  //
  // FEATURED
  //
  if (project.featured) {
    score += 120;
  }

  //
  // GITHUB QUALITY
  //
  score += Math.min(
    project.starsCount * 2,
    200
  );

  score += Math.min(
    project.forksCount,
    100
  );

  score += Math.min(
    project.contributorsCount * 10,
    120
  );

  //
  // COLLABORATION SCORE
  //
  score +=
    (project.collaborationScore ||
      0) * 0.5;

  //
  // TECH STACK MATCH
  //
  const techStack =
    Array.isArray(
      project.techStack
    )
      ? project.techStack
      : [];

  const skillNamesSet = new Set<string>(
    skillNames.map((s) => s.toLowerCase())
  );

  const overlap =
    techStack.filter(
      (tech: any) =>
        typeof tech ===
          "string" &&
        skillNamesSet.has(
          tech.toLowerCase()
        )
    );

  score += overlap.length * 50;

  return Math.round(score);
};

export const calculateHackathonSearchScore = (
  hackathon: any
) => {

  let score = 0;

  //
  // VERIFIED
  //
  if (hackathon.verified) {
    score += 180;
  }

  //
  // FEATURED
  //
  if (hackathon.featured) {
    score += 150;
  }

  //
  // POPULARITY
  //
  score +=
    hackathon.registrationCount *
    0.4;

  score +=
    hackathon.submissionCount *
    0.6;

  score +=
    hackathon.winnerCount * 10;

  //
  // SEARCH SCORE
  //
  score +=
    hackathon.searchScore || 0;

  //
  // URGENCY
  //
  const daysLeft =
    (
      new Date(
        hackathon.registrationDeadline
      ).getTime() - Date.now()
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

  return Math.round(score);
};