import {
  DeploymentStatus,
  ProjectVisibility,
  ProjectStatus,
} from "@prisma/client";

export interface CreateProjectData {
  teamId?: string;

  title: string;

  description: string;

  shortDescription?: string;

  githubUrl?: string;

  liveUrl?: string;

  videoDemoUrl?: string;

  screenshots?: string[];

  techStack?: string[];

  deploymentStatus?: DeploymentStatus;

  visibility?: ProjectVisibility;

  lookingFor?: string;
}

export interface UpdateProjectData {
  title?: string;

  description?: string;

  shortDescription?: string;

  githubUrl?: string;

  liveUrl?: string;

  videoDemoUrl?: string;

  screenshots?: string[];

  techStack?: string[];

  deploymentStatus?: DeploymentStatus;

  visibility?: ProjectVisibility;

  lookingFor?: string;

  featured?: boolean;

  status?: ProjectStatus;
}