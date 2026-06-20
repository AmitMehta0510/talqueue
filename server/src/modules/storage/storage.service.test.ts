import { describe, test, expect, vi } from "vitest";
import { generateUploadParameters } from "./storage.service";
import { getPresignedDownloadUrl, extractS3Key, getPublicFileUrl } from "shared/services/s3";

describe("S3 Service and Presigned URL helpers", () => {
  test("extractS3Key parses key correctly", () => {
    expect(extractS3Key("")).toBe("");
    expect(extractS3Key("onboarding/letterhead.pdf")).toBe("onboarding/letterhead.pdf");
    expect(
      extractS3Key("https://my-bucket.s3.amazonaws.com/avatars/user1/image.jpg")
    ).toBe("avatars/user1/image.jpg");
  });

  test("getPublicFileUrl builds public URL appropriately", () => {
    const url = getPublicFileUrl("chat/123/file.png");
    expect(url).toContain("chat/123/file.png");
  });

  test("getPresignedDownloadUrl leaves external URLs alone", async () => {
    const externalUrl = "https://external-resource.com/doc.pdf";
    const result = await getPresignedDownloadUrl(externalUrl);
    expect(result).toBe(externalUrl);
  });
});

describe("Storage service logic", () => {
  test("generateUploadParameters builds structured S3 key and URL parameters", async () => {
    const userId = "test-user-id";
    const filename = "my avatar image.png";
    const contentType = "image/png";

    const result = await generateUploadParameters(userId, {
      filename,
      contentType,
      purpose: "avatar",
    });

    expect(result.key).toContain("avatars/test-user-id/");
    expect(result.key).toContain("my_avatar_image.png"); // verify space sanitisation
    expect(result.uploadUrl).toBeDefined();
    expect(result.fileUrl).toBeDefined();
  });
});
