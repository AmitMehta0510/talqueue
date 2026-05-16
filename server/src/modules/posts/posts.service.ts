import prisma from "shared/database/prisma";
import { createNotification } from "modules/notificatios/notifications.service";
import AppError from "shared/errors/AppError"

export const createPost = async (
  userId: string,
  data: any
) => {
  return prisma.post.create({
    data: {
      authorId: userId,

      content: data.content,

      type: data.type,
    },

    include: {
      author: {
        include: {
          profile: true,
        },
      },
    },
  });
};

export const getFeed = async () => {
  return prisma.post.findMany({
    orderBy: {
      createdAt: "desc",
    },

    include: {
      author: {
        include: {
          profile: true,
        },
      },

      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },

    take: 50,
  });
};

export const getPostById = async (
  postId: string
) => {
  return prisma.post.findUnique({
    where: {
      id: postId,
    },

    include: {
      author: {
        include: {
          profile: true,
        },
      },

      comments: {
        include: {
          author: {
            include: {
              profile: true,
            },
          },
        },

        orderBy: {
          createdAt: "asc",
        },
      },

      likes: true,
    },
  });
};

export const createComment = async (
  userId: string,
  postId: string,
  data: any
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
    throw new AppError(
      "Post not found",
      404
    );
  }

  const comment = await prisma.comment.create({
    data: {
      postId,

      authorId: userId,

      content: data.content,
    },

    include: {
      author: {
        include: {
          profile: true,
        },
      },
    },
  });

  // Fire-and-forget notification
  if (post.authorId !== userId) {

    createNotification({
      userId: post.authorId,

      type: "COMMENT",

      title: "New Comment",

      message: "Someone commented on your post",
    }).catch((error) => {
      console.error(
        "Notification Error:",
        error
      );
    });
  }

  return comment;
};

export const toggleLike = async (
  userId: string,
  postId: string
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

  if (existingLike) {

    await prisma.like.delete({
      where: {
        id: existingLike.id,
      },
    });

    return {
      liked: false,
    };
  }

  await prisma.like.create({
    data: {
      postId,
      userId,
    },
  });

  // Fire-and-forget notification
  if (post.authorId !== userId) {

    createNotification({
      userId: post.authorId,

      type: "LIKE",

      title: "New Like",

      message: "Someone liked your post",
    }).catch((error) => {
      console.error(
        "Notification Error:",
        error
      );
    });
  }

  return {
    liked: true,
  };
};