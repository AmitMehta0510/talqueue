import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";
import { addReputation } from "modules/reputation/reputation.service";
import { queuePostForSync } from "services/forumSyncService";

import { createActivity } from "modules/activities/activity.service";

import { calculateUserAffinity } from "modules/affinity/affinity.service";

import { createNotification } from "modules/notificatios/notifications.service";
import { trackInteraction } from "modules/interaction/interaction-tracking.service";

const DEFAULT_FEED_LIMIT = 20;
const MAX_FEED_LIMIT = 50;
const DEFAULT_COMMENT_LIMIT = 20;
const MAX_COMMENT_LIMIT = 50;
const DEFAULT_REPLY_LIMIT = 3;
const MAX_REPLY_LIMIT = 10;

const clampLimit = (limit: number | undefined, fallback: number, max: number) =>
  Math.min(max, Math.max(1, limit || fallback));

const runAffinityUpdates = (pairs: Array<[string, string]>) => {
  Promise.all(
    pairs
      .filter(([sourceUserId, targetUserId]) => sourceUserId !== targetUserId)
      .map(([sourceUserId, targetUserId]) =>
        calculateUserAffinity(sourceUserId, targetUserId),
      ),
  ).catch(console.error);
};

const compactPostAuthorSelect = {
  id: true,
  username: true,
  verifiedEngineer: true,
  primaryRole: true,
  profile: {
    select: {
      fullName: true,
      avatarUrl: true,
      headline: true,
    },
  },
};

const compactCommentAuthorSelect = {
  id: true,
  username: true,
  profile: {
    select: {
      fullName: true,
      avatarUrl: true,
    },
  },
};

const serializePostPreview = (post: any) => {
  const { likes, savedBy, ...rest } = post;

  return {
    ...rest,
    isLiked: likes?.length > 0,
    isSaved: savedBy?.length > 0,
  };
};

export const validateAndProcessMedia = (media: any): string[] => {
  if (!media) return [];

  if (Array.isArray(media)) {
    const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv", ".wmv", ".m4v"];
    const isVideo = (url: string) => {
      try {
        const parsedUrl = new URL(url);
        const pathname = parsedUrl.pathname.toLowerCase();
        return videoExtensions.some(ext => pathname.endsWith(ext));
      } catch (e) {
        return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
      }
    };

    const images: string[] = [];
    const videos: string[] = [];

    for (const item of media) {
      if (typeof item === "string") {
        if (isVideo(item)) {
          videos.push(item);
        } else {
          images.push(item);
        }
      }
    }

    if (images.length > 10) {
      throw new AppError("Maximum of 10 images are allowed", 400);
    }
    if (videos.length > 1) {
      throw new AppError("Maximum of 1 video is allowed", 400);
    }
    return media;
  }

  if (typeof media === "object") {
    let images: string[] = [];
    let videos: string[] = [];

    if (Array.isArray(media.images)) {
      images = media.images.filter((item: any) => typeof item === "string");
    }

    if (Array.isArray(media.videos)) {
      videos = media.videos.filter((item: any) => typeof item === "string");
    } else if (typeof media.videos === "string") {
      videos = [media.videos];
    }

    if (media.video) {
      if (Array.isArray(media.video)) {
        videos = [...videos, ...media.video.filter((item: any) => typeof item === "string")];
      } else if (typeof media.video === "string") {
        videos.push(media.video);
      }
    }

    videos = Array.from(new Set(videos));

    if (images.length > 10) {
      throw new AppError("Maximum of 10 images are allowed", 400);
    }

    if (videos.length > 1) {
      throw new AppError("Maximum of 1 video is allowed", 400);
    }

    return [...images, ...videos];
  }

  return [];
};

export const extractAndProcessMedia = (data: any): string[] => {
  let mediaPayload = data.media;
  if (!mediaPayload && (data.images || data.videos || data.video)) {
    mediaPayload = {
      images: data.images,
      videos: data.videos,
      video: data.video,
    };
  }
  return validateAndProcessMedia(mediaPayload);
};

// CREATE POST
export const createPost = async (userId: string, data: any) => {
  const processedMedia = extractAndProcessMedia(data);

  const post = await prisma.post.create({
    data: {
      authorId: userId,

      content: data.content,

      type: data.type,

      media: processedMedia,

      attachments: data.attachments,

      thumbnailUrl: data.thumbnailUrl,

      mentions: data.mentions || [],

      visibility: data.visibility || "PUBLIC",

      collegeId: data.collegeId,

      departmentId: data.departmentId,

      communityId: data.companyCommunityId,

      projectId: data.projectId,

      hackathonId: data.hackathonId,

      tags: {
        create: (data.tags || []).map((tag: string) => ({
          tag: tag.toLowerCase(),
        })),
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
    setImmediate(() => {
      Promise.all(
        data.mentions.map((mentionedUserId: string) => {
          if (mentionedUserId === userId) {
            return null;
          }

          return createNotification({
            userId: mentionedUserId,

            actorId: userId,

            type: "POST_MENTION",

            title: "Mentioned in a post",

            message: `${post.author.profile?.fullName || post.author.username} mentioned you in a post`,

            entityType: "POST",

            entityId: post.id,

            actionUrl: `/posts/${post.id}`,

            metadata: {
              postId: post.id,
            },

            groupKey: `post-mention-${post.id}`,
          });
        }),
      ).catch((err) => {
        console.error("Asynchronous post mention notifications failed:", err);
      });
    });
  }

  //
  // Lightweight reputation
  //
  addReputation(userId, "POST_CREATED", 1, "Created a post", {
    postId: post.id,
  }).catch(console.error);

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
    },
  ).catch(console.error);

  //
  // Affinity updates for mentions
  //
  if (data.mentions?.length) {
    runAffinityUpdates(
      data.mentions.map((mentionedUserId: string) => [userId, mentionedUserId]),
    );
  }

  // Hook for Elasticsearch forum posts synchronization
  queuePostForSync(post.id, "INDEX");

  return post;
};

// GET FEED
export const getFeed = async (
  userId?: string,
  params: {
    cursor?: string;
    limit?: number;
  } = {},
) => {
  const limit = clampLimit(params.limit, DEFAULT_FEED_LIMIT, MAX_FEED_LIMIT);

  const posts = await prisma.post.findMany({
    where: {
      deletedAt: null,
    },

    orderBy: [
      {
        pinned: "desc",
      },

      {
        trendingScore: "desc",
      },

      {
        createdAt: "desc",
      },

      {
        id: "desc",
      },
    ],

    select: {
      id: true,
      authorId: true,
      content: true,
      type: true,
      media: true,
      attachments: true,
      thumbnailUrl: true,
      mentions: true,
      visibility: true,
      pinned: true,
      featured: true,
      shareCount: true,
      saveCount: true,
      commentsCount: true,
      likesCount: true,
      impressionCount: true,
      engagementScore: true,
      trendingScore: true,
      createdAt: true,
      updatedAt: true,

      author: {
        select: compactPostAuthorSelect,
      },

      tags: true,
    },

    ...(params.cursor
      ? {
        cursor: {
          id: params.cursor,
        },

        skip: 1,
      }
      : {}),

    take: limit + 1,
  });

  const hasNextPage = posts.length > limit;

  const pagePosts = hasNextPage ? posts.slice(0, limit) : posts;

  let likedPostIds = new Set<string>();
  let savedPostIds = new Set<string>();

  if (userId && pagePosts.length > 0) {
    const postIds = pagePosts.map((post) => post.id);
    const [likes, saved] = await Promise.all([
      prisma.like.findMany({
        where: {
          userId,
          postId: {
            in: postIds,
          },
        },
        select: {
          postId: true,
        },
      }),
      prisma.savedPost.findMany({
        where: {
          userId,
          postId: {
            in: postIds,
          },
        },
        select: {
          postId: true,
        },
      }),
    ]);

    likedPostIds = new Set(likes.map((l) => l.postId));
    savedPostIds = new Set(saved.map((s) => s.postId));
  }

  const serializedPosts = pagePosts.map((post) => {
    return {
      ...post,
      isLiked: likedPostIds.has(post.id),
      isSaved: savedPostIds.has(post.id),
    };
  });

  return {
    posts: serializedPosts,
    nextCursor: hasNextPage ? pagePosts[pagePosts.length - 1]?.id : null,
    hasNextPage,
    limit,
  };
};

// GET POST
export const getPostById = async (
  userId: string | undefined,
  postId: string,
  params: {
    commentsLimit?: number;
    repliesLimit?: number;
  } = {},
) => {
  const commentsLimit = clampLimit(
    params.commentsLimit,
    DEFAULT_COMMENT_LIMIT,
    MAX_COMMENT_LIMIT,
  );

  const repliesLimit = clampLimit(
    params.repliesLimit,
    DEFAULT_REPLY_LIMIT,
    MAX_REPLY_LIMIT,
  );

  const post = await prisma.post.findUnique({
    where: {
      id: postId,
    },

    select: {
      id: true,
      authorId: true,
      content: true,
      type: true,
      media: true,
      attachments: true,
      thumbnailUrl: true,
      mentions: true,
      visibility: true,
      pinned: true,
      featured: true,
      shareCount: true,
      saveCount: true,
      commentsCount: true,
      likesCount: true,
      impressionCount: true,
      engagementScore: true,
      trendingScore: true,
      createdAt: true,
      updatedAt: true,

      author: {
        select: compactPostAuthorSelect,
      },

      tags: true,

      likes: userId
        ? {
          where: {
            userId,
          },

          select: {
            id: true,
          },

          take: 1,
        }
        : false,

      savedBy: userId
        ? {
          where: {
            userId,
          },

          select: {
            id: true,
          },

          take: 1,
        }
        : false,

      comments: {
        where: {
          deletedAt: null,

          parentCommentId: null,
        },

        select: {
          id: true,
          postId: true,
          authorId: true,
          content: true,
          attachments: true,
          mentions: true,
          parentCommentId: true,
          createdAt: true,
          editedAt: true,

          author: {
            select: compactCommentAuthorSelect,
          },

          replies: {
            where: {
              deletedAt: null,
            },

            select: {
              id: true,
              postId: true,
              authorId: true,
              content: true,
              attachments: true,
              mentions: true,
              parentCommentId: true,
              createdAt: true,
              editedAt: true,

              author: {
                select: compactCommentAuthorSelect,
              },
            },

            orderBy: {
              createdAt: "asc",
            },

            take: repliesLimit,
          },

          _count: {
            select: {
              replies: true,
            },
          },
        },

        orderBy: {
          createdAt: "asc",
        },

        take: commentsLimit,
      },
    },
  });

  if (!post) {
    throw new AppError("Post not found", 404);
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

  if (userId) {
    trackInteraction(userId, {
      targetId: postId,
      targetType: "POST",
      interactionType: "VIEW",
    }).catch(console.error);
  }

  return {
    ...serializePostPreview(post),
    commentsLimit,
    repliesLimit,
  };
};

// UPDATE POST
export const updatePost = async (userId: string, postId: string, data: any) => {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      deletedAt: null,
    },
  });

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  if (post.authorId !== userId) {
    throw new AppError("Unauthorized", 403);
  }

  let processedMedia: string[] | undefined = undefined;
  let removedMedia: string[] = [];

  const hasMediaPayload =
    data.media !== undefined ||
    data.images !== undefined ||
    data.videos !== undefined ||
    data.video !== undefined;

  if (hasMediaPayload) {
    processedMedia = extractAndProcessMedia(data);

    let oldMedia: string[] = [];
    if (post.media && Array.isArray(post.media)) {
      oldMedia = post.media.map((item: any) => String(item));
    }

    removedMedia = oldMedia.filter((url) => !processedMedia!.includes(url));
  }

  const parsedTags: string[] | undefined = Array.isArray(data.tags)
    ? Array.from(
      new Set(
        data.tags
          .map((t: any) => String(t).trim().toLowerCase())
          .filter(Boolean),
      ),
    )
    : undefined;

  const updatedPost = await prisma.$transaction(async (tx) => {
    if (parsedTags !== undefined) {
      await tx.postTag.deleteMany({
        where: {
          postId,
        },
      });
    }

    return tx.post.update({
      where: {
        id: postId,
      },

      data: {
        content: data.content,

        media: processedMedia,

        attachments: data.attachments,

        thumbnailUrl: data.thumbnailUrl,

        visibility: data.visibility,

        tags:
          parsedTags !== undefined
            ? {
              create: parsedTags.map((tag: string) => ({
                tag,
              })),
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
  });

  // Hook for Elasticsearch forum posts synchronization
  queuePostForSync(updatedPost.id, "INDEX");

  return { post: updatedPost, removedMedia };
};

// DELETE POST
export const deletePost = async (userId: string, postId: string) => {
  const post = await prisma.post.findUnique({
    where: {
      id: postId,
    },
  });

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  if (post.authorId !== userId) {
    throw new AppError("Unauthorized", 403);
  }

  await prisma.post.update({
    where: {
      id: postId,
    },

    data: {
      deletedAt: new Date(),
    },
  });

  // Hook for Elasticsearch forum posts synchronization
  queuePostForSync(postId, "DELETE");

  return {
    success: true,
  };
};

// COMMENT
export const createComment = async (
  userId: string,
  postId: string,
  data: any,
) => {
  const post = await prisma.post.findUnique({
    where: {
      id: postId,
    },

    select: {
      id: true,
      authorId: true,
    },
  });

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  const comment = await prisma.comment.create({
    data: {
      postId,

      authorId: userId,

      content: data.content,

      attachments: data.attachments,

      mentions: data.mentions || [],

      parentCommentId: data.parentCommentId,
    },

    include: {
      author: {
        select: compactCommentAuthorSelect,
      },

      _count: {
        select: {
          replies: true,
        },
      },
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
  addReputation(userId, "COMMENT_CREATED", 1, "Commented on a post", {
    postId,
  }).catch(console.error);

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
    },
  ).catch(console.error);

  //
  // Affinity with post author
  //
  if (post.authorId !== userId) {
    calculateUserAffinity(userId, post.authorId).catch(console.error);
  }

  //
  // Notify author
  //
  if (post.authorId !== userId) {
    createNotification({
      userId: post.authorId,

      actorId: userId,

      type: "COMMENT",

      title: "New Comment",

      message: `${comment.author.profile?.fullName || comment.author.username} commented on your post`,

      entityType: "POST",

      entityId: postId,

      actionUrl: `/posts/${postId}`,

      metadata: {
        postId,
      },

      groupKey: `post-comment-${postId}`,
    }).catch(console.error);
  }

  //
  // Reply notification
  //
  if (data.parentCommentId) {
    const parentComment = await prisma.comment.findUnique({
      where: {
        id: data.parentCommentId,
      },

      select: {
        id: true,
        authorId: true,
      },
    });

    if (parentComment && parentComment.authorId !== userId) {
      createNotification({
        userId: parentComment.authorId,

        actorId: userId,

        type: "COMMENT_REPLY",

        title: "New Reply",

        message: `${comment.author.profile?.fullName || comment.author.username} replied to your comment`,

        entityType: "COMMENT",

        entityId: parentComment.id,

        actionUrl: `/posts/${postId}`,

        metadata: {
          postId,

          commentId: parentComment.id,
        },

        groupKey: `comment-reply-${parentComment.id}`,
      }).catch(console.error);

      //
      // Affinity
      //
      calculateUserAffinity(userId, parentComment.authorId).catch(
        console.error,
      );
    }
  }

  //
  // Mention notifications
  //
  if (data.mentions?.length) {
    setImmediate(() => {
      Promise.all(
        data.mentions.map((mentionedUserId: string) => {
          if (mentionedUserId === userId) {
            return null;
          }

          return createNotification({
            userId: mentionedUserId,

            actorId: userId,

            type: "COMMENT_MENTION",

            title: "Mentioned in a comment",

            message: `${comment.author.profile?.fullName || comment.author.username} mentioned you in a comment`,

            entityType: "COMMENT",

            entityId: comment.id,

            actionUrl: `/posts/${postId}`,

            metadata: {
              postId,

              commentId: comment.id,
            },

            groupKey: `comment-mention-${comment.id}`,
          });
        }),
      ).catch((err) => {
        console.error("Asynchronous comment mention notifications failed:", err);
      });
    });

    //
    // Affinity
    //
    runAffinityUpdates(
      data.mentions.map((mentionedUserId: string) => [userId, mentionedUserId]),
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
export const toggleLike = async (userId: string, postId: string) => {
  const post = await prisma.post.findUnique({
    where: {
      id: postId,
    },

    select: {
      id: true,
      authorId: true,
    },
  });

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.like.create({
        data: {
          postId,
          userId,
        },
      });

      await tx.post.update({
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
    });

    //
    // Affinity
    //
    if (post.authorId !== userId) {
      runAffinityUpdates([
        [userId, post.authorId],
        [post.authorId, userId],
      ]);
    }

    //
    // Notify
    //
    if (post.authorId !== userId) {
      createNotification({
        userId: post.authorId,

        actorId: userId,

        type: "LIKE",

        title: "New Like",

        message: "Someone liked your post",

        entityType: "POST",

        entityId: postId,

        actionUrl: `/posts/${postId}`,

        metadata: {
          postId,
        },

        groupKey: `post-like-${postId}`,
      }).catch(console.error);
    }

    //
    // Track interaction
    //
    trackInteraction(userId, {
      targetId: postId,

      targetType: "POST",

      interactionType: "LIKE",
    }).catch(console.error);

    return {
      liked: true,
    };
  } catch (error: any) {
    if (error.code === "P2002") {
      // Unique constraint collision means already liked; trigger unlike fallback transaction
      await prisma.$transaction(async (tx) => {
        await tx.like.delete({
          where: {
            postId_userId: {
              postId,
              userId,
            },
          },
        });

        await tx.post.update({
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
      });

      return {
        liked: false,
      };
    }
    throw error;
  };
};

// REPOST POST
export const repostPost = async (
  userId: string,
  postId: string,
  caption?: string,
) => {
  const post = await prisma.post.findUnique({
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
    throw new AppError("Post not found", 404);
  }

  const existingShare = await prisma.postShare.findUnique({
    where: {
      postId_userId: {
        postId,
        userId,
      },
    },
  });

  if (existingShare) {
    throw new AppError("Already reposted", 400);
  }

  const repost = await prisma.postShare.create({
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
  addReputation(userId, "POST_SHARED", 1, "Reposted a post", {
    postId,
  }).catch(console.error);

  //
  // Activity
  //
  createActivity(userId, "POST_SHARED", "Reposted a post", "Shared a post", {
    postId,
  }).catch(console.error);

  //
  // Affinity
  //
  calculateUserAffinity(userId, post.authorId).catch(console.error);

  //
  // Notification
  //
  if (post.authorId !== userId) {
    createNotification({
      userId: post.authorId,

      actorId: userId,

      type: "POST_SHARED",

      title: "Post Reposted",

      message: `${repost.user.profile?.fullName || repost.user.username} reposted your post`,

      entityType: "POST",

      entityId: postId,

      actionUrl: `/posts/${postId}`,

      metadata: {
        postId,
      },

      groupKey: `post-share-${postId}`,
    }).catch(console.error);
  }

  return repost;
};

// SAVE POST
export const toggleSavePost = async (userId: string, postId: string) => {
  const post = await prisma.post.findUnique({
    where: {
      id: postId,
    },

    select: {
      id: true,
      authorId: true,
    },
  });

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  const existingSave = await prisma.savedPost.findUnique({
    where: {
      userId_postId: {
        userId,
        postId,
      },
    },

    select: {
      id: true,
    },
  });

  //
  // UNSAVE
  //
  if (existingSave) {
    await prisma.savedPost.delete({
      where: {
        id: existingSave.id,
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
  if (post.authorId !== userId) {
    runAffinityUpdates([
      [userId, post.authorId],
      [post.authorId, userId],
    ]);
  }

  //
  // Track interaction
  //
  trackInteraction(userId, {
    targetId: postId,

    targetType: "POST",

    interactionType: "SAVE",
  }).catch(console.error);

  //
  // Advanced notification
  //
  if (post.authorId !== userId) {
    createNotification({
      userId: post.authorId,

      actorId: userId,

      type: "SAVE",

      title: "Post Saved",

      message: "Someone saved your post",

      entityType: "POST",

      entityId: postId,

      actionUrl: `/posts/${postId}`,

      metadata: {
        postId,
      },

      groupKey: `post-save-${postId}`,
    }).catch(console.error);
  }

  return {
    saved: true,
  };
};

// DELETE COMMENT
export const deleteComment = async (userId: string, commentId: string) => {
  const comment = await prisma.comment.findUnique({
    where: {
      id: commentId,
    },
  });

  if (!comment) {
    throw new AppError("Comment not found", 404);
  }

  if (comment.authorId !== userId) {
    throw new AppError("Unauthorized", 403);
  }

  await prisma.comment.update({
    where: {
      id: commentId,
    },

    data: {
      deletedAt: new Date(),
    },
  });

  await prisma.post.update({
    where: {
      id: comment.postId,
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
