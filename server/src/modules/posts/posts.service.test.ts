import { describe, test, expect, vi, beforeEach } from "vitest";
import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import {
  createPost,
  updatePost,
  validateAndProcessMedia,
  extractAndProcessMedia,
} from "./posts.service";

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

    (prisma.post.findUnique as any) = vi.fn().mockResolvedValue(mockExistingPost);

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

    expect(prisma.post.findUnique).toHaveBeenCalled();
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
});
