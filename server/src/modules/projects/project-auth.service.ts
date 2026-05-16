export const calculateProjectVerificationScore =
  (
    project: any
  ) => {

    let score = 0;

    //
    // GitHub repo
    //
    if (project.githubUrl) {
      score += 20;
    }

    //
    // Live deployment
    //
    if (project.liveUrl) {
      score += 30;
    }

    //
    // Contributors
    //
    if (
      project.contributorsCount >= 2
    ) {
      score += 10;
    }

    //
    // Stars
    //
    if (
      project.starsCount >= 5
    ) {
      score += 10;
    }

    //
    // Activity freshness
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

    return score;
  };

  export const calculateProjectEngineeringScore =
  (
    project: any
  ) => {

    let score = 0;

    //
    // Verified
    //
    if (project.verified) {
      score += 25;
    }

    //
    // Live deployment
    //
    if (project.liveUrl) {
      score += 20;
    }

    //
    // Contributors
    //
    score += Math.min(
      (
        project.contributorsCount ||
        0
      ) * 5,
      20
    );

    //
    // GitHub stars
    //
    score += Math.min(
      (
        project.starsCount ||
        0
      ) * 0.5,
      15
    );

    //
    // Forks
    //
    score += Math.min(
      (
        project.forksCount ||
        0
      ) * 0.3,
      10
    );

    //
    // Commits
    //
    score += Math.min(
      (
        project.commitCount ||
        0
      ) * 0.05,
      20
    );

    //
    // Open source bonus
    //
    if (
      project.repoVisibility ===
      "PUBLIC"
    ) {
      score += 5;
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

    //
    // Clamp
    //
    return Math.min(
      Math.round(score),
      100
    );
  };