/**
 * Project verification and engineering scoring.
 * Scores reflect real-world signal quality — author verification and
 * plagiarism risk are factored in to prevent gaming.
 */

interface ProjectVerificationInput {
  githubUrl?: string | null;
  liveUrl?: string | null;
  contributorsCount?: number;
  starsCount?: number;
  repoUpdatedAt?: string | Date | null;
  /** True when the project owner's GitHub handle was found in contributors list */
  commitAuthorVerified?: boolean;
  /** Plagiarism risk level from fork/commit density analysis */
  plagiarismRiskLevel?: "LOW" | "MEDIUM" | "HIGH";
}

interface ProjectEngineeringInput extends ProjectVerificationInput {
  verified?: boolean;
  forksCount?: number;
  commitCount?: number;
  repoVisibility?: string;
}

export const calculateProjectVerificationScore = (project: ProjectVerificationInput): number => {
  let score = 0;

  // Base signals
  if (project.githubUrl) score += 20;
  if (project.liveUrl) score += 30;
  if ((project.contributorsCount ?? 0) >= 2) score += 10;
  if ((project.starsCount ?? 0) >= 5) score += 10;

  // Activity freshness
  if (project.repoUpdatedAt) {
    const diffDays = Math.floor(
      (Date.now() - new Date(project.repoUpdatedAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays <= 30) score += 10;
  }

  // Trust signals: authorship confirmation
  if (project.commitAuthorVerified === true) score += 20;

  // Trust penalty: plagiarism risk
  if (project.plagiarismRiskLevel === "HIGH") score -= 40;
  else if (project.plagiarismRiskLevel === "MEDIUM") score -= 15;

  return Math.max(0, score);
};

export const calculateProjectEngineeringScore = (project: ProjectEngineeringInput): number => {
  let score = 0;

  if (project.verified) score += 25;
  if (project.liveUrl) score += 20;

  score += Math.min((project.contributorsCount ?? 0) * 5, 20);
  score += Math.min((project.starsCount ?? 0) * 0.5, 15);
  score += Math.min((project.forksCount ?? 0) * 0.3, 10);
  score += Math.min((project.commitCount ?? 0) * 0.05, 20);

  if (project.repoVisibility === "PUBLIC") score += 5;

  if (project.repoUpdatedAt) {
    const diffDays = Math.floor(
      (Date.now() - new Date(project.repoUpdatedAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays >= 0 && diffDays <= 30) score += 10;
  }

  // Trust bonus / penalty
  if (project.commitAuthorVerified === true) score += 10;
  if (project.plagiarismRiskLevel === "HIGH") score -= 40;
  else if (project.plagiarismRiskLevel === "MEDIUM") score -= 10;

  return Math.max(0, Math.min(Math.round(score), 100));
};