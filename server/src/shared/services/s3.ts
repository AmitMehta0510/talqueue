import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "shared/config/env";

const isConfigured = Boolean(env.AWS_S3_BUCKET_NAME);

// Initialize S3Client. If credentials are not provided explicitly,
// the SDK fallback sequence will check IAM roles / environment.
const s3Client = isConfigured
  ? new S3Client({
      region: env.AWS_REGION,
      ...(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
        ? {
            credentials: {
              accessKeyId: env.AWS_ACCESS_KEY_ID,
              secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            },
          }
        : {}),
    })
  : null;

/**
 * Parses an S3 URL or S3 Key to extract the raw key path.
 * E.g., "https://my-bucket.s3.amazonaws.com/avatars/user123.jpg" -> "avatars/user123.jpg"
 */
export const extractS3Key = (keyOrUrl: string): string => {
  if (!keyOrUrl) return "";
  
  // If it's a full URL, strip off the bucket origin details
  if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) {
    try {
      const url = new URL(keyOrUrl);
      // Remove leading slash to get the key
      return url.pathname.substring(1);
    } catch {
      return keyOrUrl;
    }
  }
  return keyOrUrl;
};

/**
 * Generate a pre-signed URL to PUT (upload) a file directly to S3.
 */
export const getPresignedUploadUrl = async (
  key: string,
  contentType: string,
  expiresInSeconds = 3600,
): Promise<string> => {
  const bucketName = env.AWS_S3_BUCKET_NAME;

  if (!isConfigured || !s3Client || !bucketName) {
    // Graceful fallback for local development & tests
    console.warn("[S3 Service] S3 bucket is not configured. Returning local mock upload URL.");
    return `https://mock-s3.local/${bucketName || "mock-bucket"}/${key}?contentType=${encodeURIComponent(contentType)}`;
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
};

/**
 * Generate a pre-signed URL to GET (download) a private file from S3.
 * If the input is already a fully qualified public HTTP/HTTPS URL not originating from S3, 
 * or if S3 is not configured, it returns the input string unmodified.
 */
export const getPresignedDownloadUrl = async (
  keyOrUrl: string,
  expiresInSeconds = 3600,
): Promise<string> => {
  if (!keyOrUrl) return "";

  // If it's already a full non-S3 URL or an external resource, return as-is
  const isExternal =
    (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) &&
    !keyOrUrl.includes("s3.amazonaws.com") &&
    !keyOrUrl.includes(".s3.");

  if (isExternal) {
    return keyOrUrl;
  }

  const bucketName = env.AWS_S3_BUCKET_NAME;

  if (!isConfigured || !s3Client || !bucketName) {
    // Return keyOrUrl as-is or simulated mock url
    return keyOrUrl;
  }

  const key = extractS3Key(keyOrUrl);

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  try {
    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  } catch (error) {
    console.error("[S3 Service] Failed to generate presigned download URL:", error);
    return keyOrUrl;
  }
};

/**
 * Returns the public URL endpoint for a given key after it is uploaded.
 */
export const getPublicFileUrl = (key: string): string => {
  const bucketName = env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    return `https://mock-s3.local/mock-bucket/${key}`;
  }
  return `https://${bucketName}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
};
