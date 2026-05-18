import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

export const getOwnedProject = async (
  ownerId: string,
  projectId: string,
) => {
  const project =
    await prisma.project.findFirst({
      where: {
        id: projectId,

        ownerId,
      },
    });

  if (!project) {
    throw new AppError(
      "Project not found or unauthorized",
      404,
    );
  }

  return project;
};