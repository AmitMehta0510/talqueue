import { describe, test, expect, vi, beforeEach } from "vitest";
import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import {
  createPost,
  updatePost,
  validateAndProcessMedia,
  extractAndProcessMedia,
  createComment,
  getFeed,
  toggleLike,
} from "./posts.service";

vi.mock("modules/notificatios/notifications.service", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "notification-1" }),
}));

describe("Posts Service - Media Processing", () => {
  test("should handle empty or null media", () => {
    expect(validateAndProcessMedia(null)).toEqual([]);
    expect(validateAndProcessMedia(undefined)).toEqual([]);
  });

  test("should process valid structured media object", () => {
    const mediaObj = {
      images: ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
      videos: ["https://example.com/vid1.mp4"],
    };
    const result = validateAndProcessMedia(mediaObj);
    expect(result).toEqual([
      "https://example.com/img1.jpg",
      "https://example.com/img2.jpg",
      "https://example.com/vid1.mp4",
    ]);
  });

  test("should support both videos array and single video string in payload", () => {
    const mediaObj = {
      images: ["https://example.com/img1.jpg"],
      video: "https://example.com/vid1.mp4",
    };
    const result = validateAndProcessMedia(mediaObj);
    expect(result).toEqual([
      "https://example.com/img1.jpg",
      "https://example.com/vid1.mp4",
    ]);
  });

  test("should throw AppError if images count exceeds 10", () => {
    const invalidObj = {
      images: Array(11).fill("https://example.com/img.jpg"),
    };
    expect(() => validateAndProcessMedia(invalidObj)).toThrow(AppError);
    expect(() => validateAndProcessMedia(invalidObj)).toThrow(
      "Maximum of 10 images are allowed"
    );
  });

  test("should throw AppError if videos count exceeds 1", () => {
    const invalidObj = {
      images: ["https://example.com/img1.jpg"],
      videos: ["https://example.com/vid1.mp4", "https://example.com/vid2.mp4"],
    };
    expect(() => validateAndProcessMedia(invalidObj)).toThrow(AppError);
    expect(() => validateAndProcessMedia(invalidObj)).toThrow(
      "Maximum of 1 video is allowed"
    );
  });

  test("should process flat array payload and classify files based on extensions", () => {
    const flatMedia = [
      "https://example.com/img1.jpg",
      "https://example.com/img2.png",
      "https://example.com/vid.mp4",
    ];
    const result = validateAndProcessMedia(flatMedia);
    expect(result).toEqual(flatMedia);
  });

  test("should throw AppError on flat array if limits are violated", () => {
    const tooManyImages = Array(11).fill("https://example.com/img.jpg");
    expect(() => validateAndProcessMedia(tooManyImages)).toThrow(AppError);

    const tooManyVideos = [
      "https://example.com/vid1.mp4",
      "https://example.com/vid2.mp4",
    ];
    expect(() => validateAndProcessMedia(tooManyVideos)).toThrow(AppError);
  });
});

describe("Posts Service - createPost and updatePost Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("createPost should process media and save properly", async () => {
    const mockCreatedPost = {
      id: "post-1",
      authorId: "user-1",
      content: "Hello World",
      media: ["https://example.com/img1.jpg"],
      author: { profile: { fullName: "John Doe" } },
      tags: [],
    };

    (prisma.post.create as any) = vi.fn().mockResolvedValue(mockCreatedPost);

    const result = await createPost("user-1", {
      content: "Hello World",
      type: "GENERAL",
      images: ["https://example.com/img1.jpg"],
    });

    expect(prisma.post.create).toHaveBeenCalled();
    expect(result.media).toEqual(["https://example.com/img1.jpg"]);
  });

  test("updatePost should calculate diff array for removed media and transactionally update tags", async () => {
    const mockExistingPost = {
      id: "post-1",
      authorId: "user-1",
      content: "Hello World",
      media: ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
    };

    const mockUpdatedPost = {
      id: "post-1",
      authorId: "user-1",
      content: "Updated Hello World",
      media: ["https://example.com/img1.jpg"],
      author: { profile: { fullName: "John Doe" } },
      tags: [{ id: "tag-1", tag: "tech" }],
    };

    (prisma.post.findFirst as any) = vi.fn().mockResolvedValue(mockExistingPost);

    // Mock prisma.$transaction to behave like an interactive transaction
    const mockTx = {
      postTag: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      post: {
        update: vi.fn().mockResolvedValue(mockUpdatedPost),
      },
    };
    (prisma.$transaction as any) = vi
      .fn()
      .mockImplementation((callback) => callback(mockTx));

    const result = await updatePost("user-1", "post-1", {
      content: "Updated Hello World",
      images: ["https://example.com/img1.jpg"], // removed img2
      tags: ["Tech ", "tech", "  "], // should trim, lowercase, deduplicate, filter empty
    });

    expect(prisma.post.findFirst).toHaveBeenCalledWith({
      where: {
        id: "post-1",
        deletedAt: null,
      },
    });
    expect(mockTx.postTag.deleteMany).toHaveBeenCalledWith({
      where: { postId: "post-1" },
    });
    expect(mockTx.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          media: ["https://example.com/img1.jpg"],
          tags: {
            create: [{ tag: "tech" }],
          },
        }),
      })
    );

    expect(result.removedMedia).toEqual(["https://example.com/img2.jpg"]);
    expect(result.post.id).toBe("post-1");
  });

  test("updatePost should throw AppError 404 if post is soft-deleted (deletedAt is not null)", async () => {
    (prisma.post.findFirst as any) = vi.fn().mockResolvedValue(null);

    await expect(
      updatePost("user-1", "post-1", {
        content: "Updated Hello World",
      })
    ).rejects.toThrow(AppError);

    expect(prisma.post.findFirst).toHaveBeenCalledWith({
      where: {
        id: "post-1",
        deletedAt: null,
      },
    });
  });

  test("createPost should process mentions asynchronously using setImmediate", async () => {
    const mockCreatedPost = {
      id: "post-1",
      authorId: "user-1",
      content: "Hello World",
      media: [],
      author: { profile: { fullName: "John Doe" } },
      tags: [],
    };

    (prisma.post.create as any) = vi.fn().mockResolvedValue(mockCreatedPost);
    const { createNotification } = await import("modules/notificatios/notifications.service");

    await createPost("user-1", {
      content: "Hello World @user-2",
      type: "GENERAL",
      mentions: ["user-2"],
    });

    expect(prisma.post.create).toHaveBeenCalled();
    await new Promise((resolve) => setImmediate(resolve));

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-2",
        actorId: "user-1",
        type: "POST_MENTION",
      })
    );
  });

  test("createComment should process mentions asynchronously using setImmediate", async () => {
    const mockPost = { id: "post-1", authorId: "user-2" };
    const mockComment = {
      id: "comment-1",
      postId: "post-1",
      authorId: "user-1",
      content: "Nice post @user-3",
      author: { username: "johndoe", profile: { fullName: "John Doe" } },
      _count: { replies: 0 },
    };

    (prisma.post.findUnique as any) = vi.fn().mockResolvedValue(mockPost);
    (prisma.comment.create as any) = vi.fn().mockResolvedValue(mockComment);
    (prisma.post.update as any) = vi.fn().mockResolvedValue({});
    const { createNotification } = await import("modules/notificatios/notifications.service");

    await createComment("user-1", "post-1", {
      content: "Nice post @user-3",
      mentions: ["user-3"],
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-3",
        actorId: "user-1",
        type: "COMMENT_MENTION",
      })
    );
  });

  test("getFeed should batch query likes and saves and map them to isLiked and isSaved", async () => {
    const mockPosts = [
      { id: "post-1", authorId: "user-2", content: "Post 1" },
      { id: "post-2", authorId: "user-2", content: "Post 2" },
    ];
    (prisma.post.findMany as any) = vi.fn().mockResolvedValue(mockPosts);
    (prisma.like.findMany as any) = vi.fn().mockResolvedValue([{ postId: "post-1" }]);
    (prisma.savedPost.findMany as any) = vi.fn().mockResolvedValue([{ postId: "post-2" }]);

    const result = await getFeed("user-1", { limit: 10 });

    expect(prisma.post.findMany).toHaveBeenCalled();
    expect(prisma.like.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          postId: { in: ["post-1", "post-2"] },
        },
      })
    );
    expect(prisma.savedPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          postId: { in: ["post-1", "post-2"] },
        },
      })
    );

    expect(result.posts[0].isLiked).toBe(true);
    expect(result.posts[0].isSaved).toBe(false);
    expect(result.posts[1].isLiked).toBe(false);
    expect(result.posts[1].isSaved).toBe(true);
  });

  test("toggleLike should perform atomic like creation successfully on first call", async () => {
    const mockPost = { id: "post-1", authorId: "user-2" };
    (prisma.post.findUnique as any) = vi.fn().mockResolvedValue(mockPost);

    const mockTx = {
      like: {
        create: vi.fn().mockResolvedValue({}),
      },
      post: {
        update: vi.fn().mockResolvedValue({}),
      },
    };
    (prisma.$transaction as any) = vi.fn().mockImplementation((callback) => callback(mockTx));

    const result = await toggleLike("user-1", "post-1");

    expect(prisma.post.findUnique).toHaveBeenCalledWith({
      where: { id: "post-1" },
      select: { id: true, authorId: true },
    });
    expect(mockTx.like.create).toHaveBeenCalledWith({
      data: { postId: "post-1", userId: "user-1" },
    });
    expect(mockTx.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: {
        likesCount: { increment: 1 },
        engagementScore: { increment: 1 },
      },
    });
    expect(result.liked).toBe(true);
  });

  test("toggleLike should fallback to deleting like on P2002 constraint collision error", async () => {
    const mockPost = { id: "post-1", authorId: "user-2" };
    (prisma.post.findUnique as any) = vi.fn().mockResolvedValue(mockPost);

    const createErr = new Error("Unique constraint violation");
    (createErr as any).code = "P2002";

    const mockTxFirst = {
      like: {
        create: vi.fn().mockRejectedValue(createErr),
      },
      post: {
        update: vi.fn(),
      },
    };

    const mockTxSecond = {
      like: {
        delete: vi.fn().mockResolvedValue({}),
      },
      post: {
        update: vi.fn().mockResolvedValue({}),
      },
    };

    let txCount = 0;
    (prisma.$transaction as any) = vi.fn().mockImplementation((callback) => {
      txCount++;
      if (txCount === 1) {
        return callback(mockTxFirst);
      } else {
        return callback(mockTxSecond);
      }
    });

    const result = await toggleLike("user-1", "post-1");

    expect(mockTxFirst.like.create).toHaveBeenCalled();
    expect(mockTxSecond.like.delete).toHaveBeenCalledWith({
      where: {
        postId_userId: {
          postId: "post-1",
          userId: "user-1",
        },
      },
    });
    expect(mockTxSecond.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: {
        likesCount: { decrement: 1 },
        engagementScore: { decrement: 1 },
      },
    });
    expect(result.liked).toBe(false);
  });
});
