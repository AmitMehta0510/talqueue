export const applyFeedDiversity = async (
    items: any[]
  ) => {

    const diversified =
      [];

    const creatorCounts =
      new Map<string, number>();

    const typeCounts =
      new Map<string, number>();

    for (
      const item of items
    ) {

      const creatorId =
        item.data?.authorId ||
        item.data?.ownerId ||
        item.data?.createdById;

      const type =
        item.type;

      //
      // Creator diversity
      //
      const creatorCount =
        creatorCounts.get(
          creatorId
        ) || 0;

      if (
        creatorCount >= 2
      ) {
        continue;
      }

      //
      // Type diversity
      //
      const typeCount =
        typeCounts.get(
          type
        ) || 0;

      if (
        typeCount >= 15
      ) {
        continue;
      }

      diversified.push(
        item
      );

      creatorCounts.set(
        creatorId,
        creatorCount + 1
      );

      typeCounts.set(
        type,
        typeCount + 1
      );
    }

    return diversified;
  };