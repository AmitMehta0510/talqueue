import { describe, test, expect, vi, beforeEach } from "vitest";
import { mockDeep, mockReset, DeepMockProxy } from "vitest-mock-extended";
import { PrismaClient } from "@prisma/client";

// Mock the Prisma module before importing prisma
vi.mock("shared/database/prisma", () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import {
  createPost,
  updatePost,
  validateAndProcessMedia,
  createComment,
  getFeed,
  toggleLike,
} from "./posts.service";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

vi.mock("modules/notifications/notifications.service", () => ({
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
    mockReset(prismaMock);
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

    prismaMock.post.create.mockResolvedValue(mockCreatedPost as any);

    const result = await createPost("user-1", {
      content: "Hello World",
      type: "GENERAL",
      images: ["https://example.com/img1.jpg"],
    });

    expect(prismaMock.post.create).toHaveBeenCalled();
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

    prismaMock.post.findFirst.mockResolvedValue(mockExistingPost as any);

    const mockTx = {
      postTag: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      post: {
        update: vi.fn().mockResolvedValue(mockUpdatedPost),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback) => callback(mockTx as any));

    const result = await updatePost("user-1", "post-1", {
      content: "Updated Hello World",
      images: ["https://example.com/img1.jpg"], // removed img2
      tags: ["Tech ", "tech", "  "], // should trim, lowercase, deduplicate, filter empty
    });

    expect(prismaMock.post.findFirst).toHaveBeenCalledWith({
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
    prismaMock.post.findFirst.mockResolvedValue(null);

    await expect(
      updatePost("user-1", "post-1", {
        content: "Updated Hello World",
      })
    ).rejects.toThrow(AppError);

    expect(prismaMock.post.findFirst).toHaveBeenCalledWith({
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

    prismaMock.post.create.mockResolvedValue(mockCreatedPost as any);
    const { createNotification } = await import("modules/notifications/notifications.service");

    await createPost("user-1", {
      content: "Hello World @user-2",
      type: "GENERAL",
      mentions: ["user-2"],
    });

    expect(prismaMock.post.create).toHaveBeenCalled();
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

    prismaMock.post.findUnique.mockResolvedValue(mockPost as any);
    prismaMock.comment.create.mockResolvedValue(mockComment as any);
    prismaMock.post.update.mockResolvedValue({} as any);
    const { createNotification } = await import("modules/notifications/notifications.service");

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
    prismaMock.post.findMany.mockResolvedValue(mockPosts as any);
    prismaMock.like.findMany.mockResolvedValue([{ postId: "post-1" }] as any);
    prismaMock.savedPost.findMany.mockResolvedValue([{ postId: "post-2" }] as any);

    const result = await getFeed("user-1", { limit: 10 });

    expect(prismaMock.post.findMany).toHaveBeenCalled();
    expect(prismaMock.like.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          postId: { in: ["post-1", "post-2"] },
        },
      })
    );
    expect(prismaMock.savedPost.findMany).toHaveBeenCalledWith(
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
    prismaMock.post.findUnique.mockResolvedValue(mockPost as any);

    const mockTx = {
      like: {
        create: vi.fn().mockResolvedValue({}),
      },
      post: {
        update: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback) => callback(mockTx as any));

    const result = await toggleLike("user-1", "post-1");

    expect(prismaMock.post.findUnique).toHaveBeenCalledWith({
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
    prismaMock.post.findUnique.mockResolvedValue(mockPost as any);

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
    prismaMock.$transaction.mockImplementation(async (callback) => {
      txCount++;
      if (txCount === 1) {
        return callback(mockTxFirst as any);
      } else {
        return callback(mockTxSecond as any);
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
