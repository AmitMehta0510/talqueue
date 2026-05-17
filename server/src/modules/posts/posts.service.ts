import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";
import { addReputation } from "modules/reputation/reputation.service";

import { createActivity } from "modules/activities/activity.service";

import { calculateUserAffinity } from "modules/affinity/affinity.service";

import { createNotification } from "modules/notificatios/notifications.service";
import { trackInteraction } from "modules/interaction/interaction-tracking.service";

// CREATE POST
export const createPost = async (
  userId: string,
  data: any
) => {

  const post =  await prisma.post.create({

      data: {

        authorId:
          userId,

        content:
          data.content,

        type:
          data.type,

        media:
          data.media,

        attachments:
          data.attachments,

        thumbnailUrl:
          data.thumbnailUrl,

        mentions:
          data.mentions || [],

        visibility:
          data.visibility || "PUBLIC",

        collegeId:
          data.collegeId,

        departmentId:
          data.departmentId,

        companyCommunityId:
          data.companyCommunityId,

        projectId:
          data.projectId,

        hackathonId:
          data.hackathonId,

        tags: {

          create:
            (data.tags || []).map(
              (tag: string) => ({
                tag:
                  tag.toLowerCase(),
              })
            ),
        },
      },

      include: {
        author: {
          include: {
            profile: true,
          },
        },

        tags: true,
      },
    });

  //
  // Mention notifications
  //
  if (data.mentions?.length) {

    await Promise.all(
      data.mentions.map(
        (mentionedUserId: string) => {

          if (
            mentionedUserId ===
            userId
          ) {
            return null;
          }

          return createNotification({

  userId:
    mentionedUserId,

  actorId:
    userId,

  type:
    "POST_MENTION",

  title:
    "Mentioned in a post",

  message:
    `${post.author.profile?.fullName || post.author.username} mentioned you in a post`,

  entityType:
    "POST",

  entityId:
    post.id,

  actionUrl:
    `/posts/${post.id}`,

  metadata: {
    postId:
      post.id,
  },

  groupKey:
    `post-mention-${post.id}`,
});
        }
      )
    );
  }

  //
// Lightweight reputation
//
addReputation(
  userId,
  "POST_CREATED",
  1,
  "Created a post",
  {
    postId: post.id,
  }
).catch(console.error);

//
// Activity
//
createActivity(
  userId,
  "POST_CREATED",
  "Created a post",
  "Published a new post",
  {
    postId: post.id,
  }
).catch(console.error);

//
// Affinity updates for mentions
//
if (data.mentions?.length) {

  await Promise.all(
    data.mentions.map(
      (mentionedUserId: string) =>
        calculateUserAffinity(
          userId,
          mentionedUserId
        )
    )
  );
}

  return post;
};

// GET FEED
export const getFeed = async (
  userId?: string
) => {

  return prisma.post.findMany({

    where: {
      deletedAt: null,
    },

    orderBy: [
      {
        pinned:
          "desc",
      },

      {
        trendingScore:
          "desc",
      },

      {
        createdAt:
          "desc",
      },
    ],

    include: {

      author: {
        include: {
          profile: {
            include: {
              college: true,
              department: true,
            },
          },
        },
      },

      tags: true,

      _count: {
        select: {
          comments: true,
          likes: true,
          shares: true,
          savedBy: true,
        },
      },

      likes: userId
        ? {
            where: {
              userId,
            },
          }
        : false,
    },

    take: 50,
  });
};

// GET POST
export const getPostById = async (
  userId: string | undefined,
  postId: string
) => {

  const post =
    await prisma.post.findUnique({

      where: {
        id: postId,
      },

      include: {

        author: {
          include: {
            profile: {
              include: {
                college: true,
                department: true,
              },
            },
          },
        },

        tags: true,

        likes: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },

        comments: {

          where: {
            deletedAt: null,
          },

          include: {

            author: {
              include: {
                profile: true,
              },
            },

            replies: {
              include: {
                author: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },

          orderBy: {
            createdAt:
              "asc",
          },
        },

        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true,
            savedBy: true,
          },
        },
      },
    });

  if (!post) {
    throw new AppError(
      "Post not found",
      404
    );
  }

  //
  // Increment impressions
  //
  await prisma.post.update({
    where: {
      id: postId,
    },

    data: {
      impressionCount: {
        increment: 1,
      },
    },
  });

  if(userId){
    if (userId) {

  trackInteraction(userId, {
    targetId: postId,
    targetType: "POST",
    interactionType: "VIEW",
  }).catch(console.error);
}
  }

  return post;
};

// UPDATE POST
export const updatePost = async (
  userId: string,
  postId: string,
  data: any
) => {

  const post =
    await prisma.post.findUnique({
      where: {
        id: postId,
      },
    });

  if (!post) {
    throw new AppError(
      "Post not found",
      404
    );
  }

  if (
    post.authorId !== userId
  ) {
    throw new AppError(
      "Unauthorized",
      403
    );
  }

  //
  // Replace tags
  //
  if (data.tags) {

    await prisma.postTag.deleteMany({
      where: {
        postId,
      },
    });
  }

  return prisma.post.update({

    where: {
      id: postId,
    },

    data: {

      content:
        data.content,

      media:
        data.media,

      attachments:
        data.attachments,

      thumbnailUrl:
        data.thumbnailUrl,

      visibility:
        data.visibility,

      tags: data.tags
        ? {
            create:
              data.tags.map(
                (tag: string) => ({
                  tag:
                    tag.toLowerCase(),
                })
              ),
          }
        : undefined,
    },

    include: {
      author: {
        include: {
          profile: true,
        },
      },

      tags: true,
    },
  });
};

// DELETE POST
export const deletePost = async (
  userId: string,
  postId: string
) => {

  const post =
    await prisma.post.findUnique({
      where: {
        id: postId,
      },
    });

  if (!post) {
    throw new AppError(
      "Post not found",
      404
    );
  }

  if (
    post.authorId !== userId
  ) {
    throw new AppError(
      "Unauthorized",
      403
    );
  }

  await prisma.post.update({
    where: {
      id: postId,
    },

    data: {
      deletedAt:
        new Date(),
    },
  });

  return {
    success: true,
  };
};

// COMMENT
export const createComment = async (
  userId: string,
  postId: string,
  data: any
) => {

  const post =  await prisma.post.findUnique({

      where: {
        id: postId,
      },

      select: {
        id: true,
        authorId: true,
      },
    });

  if (!post) {
    throw new AppError(
      "Post not found",
      404
    );
  }

  const comment =  await prisma.comment.create({

      data: {

        postId,

        authorId:
          userId,

        content:
          data.content,

        attachments:
          data.attachments,

        mentions:
          data.mentions || [],

        parentCommentId:
          data.parentCommentId,
      },

      include: {

        author: {
          include: {
            profile: true,
          },
        },

        replies: true,
      },
    });

//
// Increase engagement
//
await prisma.post.update({
  where: {
    id: postId,
  },

  data: {

    commentsCount: {
      increment: 1,
    },

    engagementScore: {
      increment: 2,
    },

    trendingScore: {
      increment: 1,
    },
  },
});

//
// Reputation
//
addReputation(
  userId,
  "COMMENT_CREATED",
  1,
  "Commented on a post",
  {
    postId,
  }
).catch(console.error);

//
// Activity
//
createActivity(
  userId,
  "COMMENT_CREATED",
  "Commented on a post",
  "Added a comment",
  {
    postId,
  }
).catch(console.error);

//
// Affinity with post author
//
if (post.authorId !== userId) {

  calculateUserAffinity(
    userId,
    post.authorId
  ).catch(console.error);
}

  //
  // Notify author
  //
  if (
    post.authorId !== userId
  ) {

    createNotification({

  userId:
    post.authorId,

  actorId:
    userId,

  type:
    "COMMENT",

  title:
    "New Comment",

  message:
    `${comment.author.profile?.fullName || comment.author.username} commented on your post`,

  entityType:
    "POST",

  entityId:
    postId,

  actionUrl:
    `/posts/${postId}`,

  metadata: {
    postId,
  },

  groupKey:
    `post-comment-${postId}`,
}).catch(console.error);
  }

  //
// Reply notification
//
if (data.parentCommentId) {

  const parentComment =  await prisma.comment.findUnique({

      where: {
        id: data.parentCommentId,
      },

      include: {
        author: {
          include: {
            profile: true,
          },
        },
      },
    });

  if (
    parentComment &&
    parentComment.authorId !== userId
  ) {

    createNotification({

  userId:
    parentComment.authorId,

  actorId:
    userId,

  type:
    "COMMENT_REPLY",

  title:
    "New Reply",

  message:
    `${comment.author.profile?.fullName || comment.author.username} replied to your comment`,

  entityType:
    "COMMENT",

  entityId:
    parentComment.id,

  actionUrl:
    `/posts/${postId}`,

  metadata: {

    postId,

    commentId:
      parentComment.id,
  },

  groupKey:
    `comment-reply-${parentComment.id}`,
}).catch(console.error);

    //
    // Affinity
    //
    calculateUserAffinity(
      userId,
      parentComment.authorId
    ).catch(console.error);
  }
}

//
// Mention notifications
//
if (data.mentions?.length) {

  await Promise.all(
    data.mentions.map(
      (mentionedUserId: string) => {

        if (
          mentionedUserId === userId
        ) {
          return null;
        }

        return createNotification({

  userId:
    mentionedUserId,

  actorId:
    userId,

  type:
    "COMMENT_MENTION",

  title:
    "Mentioned in a comment",

  message:
    `${comment.author.profile?.fullName || comment.author.username} mentioned you in a comment`,

  entityType:
    "COMMENT",

  entityId:
    comment.id,

  actionUrl:
    `/posts/${postId}`,

  metadata: {

    postId,

    commentId:
      comment.id,
  },

  groupKey:
    `comment-mention-${comment.id}`,
});
      }
    )
  );

  //
  // Affinity
  //
  await Promise.all(
    data.mentions.map(
      (mentionedUserId: string) =>
        calculateUserAffinity(
          userId,
          mentionedUserId
        )
    )
  );
}

if (userId) {

  trackInteraction(userId, {
    targetId: postId,
    targetType: "POST",
    interactionType: "COMMENT",
  }).catch(console.error);
}

  return comment;
};

// TOGGLE LIKE
export const toggleLike = async (  userId: string, postId: string) => {

  const post =
    await prisma.post.findUnique({

      where: {
        id: postId,
      },

      select: {
        id: true,
        authorId: true,
      },
    });

  if (!post) {
    throw new AppError(
      "Post not found",
      404
    );
  }

  const existingLike =
    await prisma.like.findUnique({

      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

  //
  // UNLIKE
  //
  if (existingLike) {

    await prisma.like.delete({
      where: {
        id:
          existingLike.id,
      },
    });

    await prisma.post.update({
      where: {
        id: postId,
      },

      data: {

        likesCount: {
          decrement: 1,
        },

        engagementScore: {
          decrement: 1,
        },
      },
    });

    return {
      liked: false,
    };
  }
//
// LIKE
//
await prisma.like.create({
  data: {
    postId,
    userId,
  },
});

await prisma.post.update({

  where: {
    id: postId,
  },

  data: {

    likesCount: {
      increment: 1,
    },

    engagementScore: {
      increment: 1,
    },
  },
});

//
// Affinity
//
if (
  post.authorId !== userId
) {

  await calculateUserAffinity(
    userId,
    post.authorId
  );

  await calculateUserAffinity(
    post.authorId,
    userId
  );
}

//
// Notify
//
if (
  post.authorId !== userId
) {

  const liker =
    await prisma.user.findUnique({

      where: {
        id: userId,
      },

      include: {
        profile: true,
      },
    });

  createNotification({

    userId:
      post.authorId,

    actorId:
      userId,

    type:
      "LIKE",

    title:
      "New Like",

    message:
      `${liker?.profile?.fullName || liker?.username} liked your post`,

    entityType:
      "POST",

    entityId:
      postId,

    actionUrl:
      `/posts/${postId}`,

    metadata: {
      postId,
    },

    groupKey:
      `post-like-${postId}`,
  }).catch(console.error);
}

//
// Track interaction
//
trackInteraction(userId, {

  targetId:
    postId,

  targetType:
    "POST",

  interactionType:
    "LIKE",
}).catch(console.error);

return {
  liked: true,
};
};

// REPOST POST
export const repostPost =  async (
    userId: string,
    postId: string,
    caption?: string
  ) => {

    const post =
      await prisma.post.findUnique({

        where: {
          id: postId,
        },

        include: {
          author: {
            include: {
              profile: true,
            },
          },
        },
      });

    if (!post) {
      throw new AppError(
        "Post not found",
        404
      );
    }

    const existingShare =
      await prisma.postShare.findUnique({

        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      });

    if (existingShare) {

      throw new AppError(
        "Already reposted",
        400
      );
    }

    const repost =  await prisma.postShare.create({

        data: {

          userId,

          postId,

          caption,
        },

        include: {
          user: {
            include: {
              profile: true,
            },
          },

          post: true,
        },
      });

    await prisma.post.update({

      where: {
        id: postId,
      },

      data: {

        shareCount: {
          increment: 1,
        },

        engagementScore: {
          increment: 3,
        },

        trendingScore: {
          increment: 5,
        },
      },
    });

    //
    // Reputation
    //
    addReputation(
      userId,
      "POST_SHARED",
      1,
      "Reposted a post",
      {
        postId,
      }
    ).catch(console.error);

    //
    // Activity
    //
    createActivity(
      userId,
      "POST_SHARED",
      "Reposted a post",
      "Shared a post",
      {
        postId,
      }
    ).catch(console.error);

    //
    // Affinity
    //
    calculateUserAffinity(
      userId,
      post.authorId
    ).catch(console.error);

    //
    // Notification
    //
    if (
      post.authorId !== userId
    ) {

      createNotification({

  userId:
    post.authorId,

  actorId:
    userId,

  type:
    "POST_SHARED",

  title:
    "Post Reposted",

  message:
    `${repost.user.profile?.fullName || repost.user.username} reposted your post`,

  entityType:
    "POST",

  entityId:
    postId,

  actionUrl:
    `/posts/${postId}`,

  metadata: {
    postId,
  },

  groupKey:
    `post-share-${postId}`,
}).catch(console.error);
    }

    return repost;
  };

// SAVE POST
export const toggleSavePost =  async (
    userId: string,
    postId: string
  ) => {

    const post =
      await prisma.post.findUnique({
        where: {
          id: postId,
        },
      });

    if (!post) {
      throw new AppError(
        "Post not found",
        404
      );
    }

    const existingSave =
      await prisma.savedPost.findUnique({

        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      });

    //
    // UNSAVE
    //
    if (existingSave) {

      await prisma.savedPost.delete({
        where: {
          id:
            existingSave.id,
        },
      });

      await prisma.post.update({

        where: {
          id: postId,
        },

        data: {

          saveCount: {
            decrement: 1,
          },
        },
      });

      return {
        saved: false,
      };
    }

    //
// SAVE
//
await prisma.savedPost.create({
  data: {
    userId,
    postId,
  },
});

await prisma.post.update({

  where: {
    id: postId,
  },

  data: {

    saveCount: {
      increment: 1,
    },

    engagementScore: {
      increment: 2,
    },
  },
});

//
// Affinity
//
if (
  post.authorId !== userId
) {

  await calculateUserAffinity(
    userId,
    post.authorId
  );

  await calculateUserAffinity(
    post.authorId,
    userId
  );
}

//
// Track interaction
//
trackInteraction(userId, {

  targetId:
    postId,

  targetType:
    "POST",

  interactionType:
    "SAVE",
}).catch(console.error);

//
// Advanced notification
//
if (
  post.authorId !== userId
) {

  const saver =
    await prisma.user.findUnique({

      where: {
        id: userId,
      },

      include: {
        profile: true,
      },
    });

  createNotification({

    userId:
      post.authorId,

    actorId:
      userId,

    type:
      "SAVE",

    title:
      "Post Saved",

    message:
      `${saver?.profile?.fullName || saver?.username} saved your post`,

    entityType:
      "POST",

    entityId:
      postId,

    actionUrl:
      `/posts/${postId}`,

    metadata: {
      postId,
    },

    groupKey:
      `post-save-${postId}`,
  }).catch(console.error);
}

return {
  saved: true,
};


  };

// DELETE COMMENT
export const deleteComment =  async (
    userId: string,
    commentId: string
  ) => {

    const comment =
      await prisma.comment.findUnique({

        where: {
          id: commentId,
        },
      });

    if (!comment) {

      throw new AppError(
        "Comment not found",
        404
      );
    }

    if (
      comment.authorId !== userId
    ) {

      throw new AppError(
        "Unauthorized",
        403
      );
    }

    await prisma.comment.update({

      where: {
        id: commentId,
      },

      data: {
        deletedAt:
          new Date(),
      },
    });

    await prisma.post.update({

      where: {
        id:
          comment.postId,
      },

      data: {

        commentsCount: {
          decrement: 1,
        },
      },
    });

    return {
      success: true,
    };
  };