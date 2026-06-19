import {
  calculateUserAffinity,
} from "modules/affinity/affinity.service";

import {
  getProjectMembers,
} from "./project.helpers";

export const recalculateProjectAffinities = (
  projectId: string,

  excludeUserId?: string,
): Promise<void> => {
  return new Promise<void>((resolve) => {
    setImmediate(async () => {
      try {
        const members = await getProjectMembers(projectId);

        const promises: Promise<any>[] = [];

        for (const member of members) {
          if (
            excludeUserId &&
            member.userId === excludeUserId
          ) {
            continue;
          }

          for (const other of members) {
            if (
              member.userId === other.userId
            ) {
              continue;
            }

            promises.push(
              calculateUserAffinity(
                member.userId,
                other.userId,
              ),
            );
          }
        }

        await Promise.all(promises);
      } catch (error) {
        console.error("recalculateProjectAffinities failed", error);
      } finally {
        resolve();
      }
    });
  });
};