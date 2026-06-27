import { describe, test, expect, vi, beforeEach } from "vitest";
import redis from "shared/database/redis";
import { sendMail } from "infra/mail/brevo-mailer.service";
import { enqueueEmail, startMailWorker } from "./mailQueue";

vi.mock("shared/database/redis", () => {
  return {
    default: {
      lpush: vi.fn(),
      rpop: vi.fn(),
      pipeline: vi.fn(),
    },
  };
});

vi.mock("infra/mail/brevo-mailer.service", () => {
  return {
    sendMail: vi.fn().mockResolvedValue({ sent: true }),
    sendOtpEmail: vi.fn().mockResolvedValue({ sent: true }),
  };
});

describe("Redis Asynchronous Mail Queue", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("should push email job payload into redis list when calling enqueueEmail", async () => {
    const to = "student@example.com";
    const subject = "Interview Invitation";
    const htmlContent = "<p>Please join our interview session.</p>";

    vi.mocked(redis.lpush).mockResolvedValue(1);

    await enqueueEmail(to, subject, htmlContent);

    expect(redis.lpush).toHaveBeenCalledWith(
      "queue:emails",
      JSON.stringify({ to, subject, htmlContent })
    );
  });

  test("should fallback to direct send if redis lpush fails to prevent losing notifications", async () => {
    const to = "student@example.com";
    const subject = "Interview Invitation";
    const htmlContent = "<p>Fallback check</p>";

    vi.mocked(redis.lpush).mockRejectedValue(new Error("Redis connection lost"));

    await enqueueEmail(to, subject, htmlContent);

    expect(redis.lpush).toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledWith({ to, subject, htmlContent });
  });
});
