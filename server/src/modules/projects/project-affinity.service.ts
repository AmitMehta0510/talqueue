import {
  calculateUserAffinity,
} from "modules/affinity/affinity.service";

import {
  getProjectMembers,
} from "./project.helpers";

export const recalculateProjectAffinities =
  async (
    projectId: string,

    excludeUserId?: string,
  ) => {
    const members =
      await getProjectMembers(projectId);

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
  };