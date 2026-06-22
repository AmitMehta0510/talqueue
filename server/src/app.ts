import express from "express";
import cors from "cors";

import errorMiddleware from "shared/middleware/errorMiddleware";
import { successResponse } from "shared/utils/apiResponse";
import { startTrendingCron } from "modules/trending/trending.cron";
import { startProjectSyncCron } from "modules/projects/projects.cron";
import { startSkillVerificationCron } from "modules/users/skill-verification.cron";
import { registerApiRoutes } from "./routes";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

registerApiRoutes(app);

// Lightweight crons — statically imported, minimal startup overhead
startTrendingCron();
startProjectSyncCron();
startSkillVerificationCron();

// Heavy scraper crons — dynamically imported via setImmediate so their
// dependency chains (axios, job-scraper, hackathon-scraper, company-discovery)
// are NOT loaded into the Node heap during the critical startup path.
setImmediate(async () => {
  const { startJobScraperCron } = await import("modules/jobs/jobs.cron");
  startJobScraperCron();
});

setImmediate(async () => {
  const { startHackathonScraperCron } = await import("modules/hackathons/scraper/hackathon-scraper.cron");
  startHackathonScraperCron();
});

setImmediate(async () => {
  const { startCompanyDiscoveryCron } = await import("modules/companies/scraper/company-discovery.cron");
  startCompanyDiscoveryCron();
});

app.get("/", (req, res) => {
  res.json(
    successResponse({
      name: "Engineering Platform API",
      status: "ok",
      api: "/api/v1",
    }),
  );
});

app.use(errorMiddleware);

export default app;