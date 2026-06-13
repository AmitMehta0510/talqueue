import express from "express";
import cors from "cors";

import errorMiddleware from "shared/middleware/errorMiddleware";
import { successResponse } from "shared/utils/apiResponse";
import { startTrendingCron } from "modules/trending/trending.cron";
import { startProjectSyncCron } from "modules/projects/projects.cron";
import { startHackathonScraperCron } from "modules/hackathons/scraper/hackathon-scraper.cron";
import { registerApiRoutes } from "./routes";

const app = express();

app.use(cors());
app.use(express.json());

registerApiRoutes(app);
startTrendingCron();
startProjectSyncCron();
startHackathonScraperCron();

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