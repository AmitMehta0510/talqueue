import { Express, Router } from "express";

import activityRoutes from "modules/activities/activity.routes";
import affinityRoutes from "modules/affinity/affinity.routes";
import candidateRankingRoutes from "modules/analytics/candidate-ranking.routes";
import leaderboardRoutes from "modules/analytics/leaderboard.routes";
import adminRoutes from "modules/admin/admin.routes";
import authRoutes from "modules/auth/auth.routes";
import chatRoutes from "modules/chat/chat.routes";
import collegeRoutes from "modules/colleges/colleges.routes";
import communityRoutes from "modules/community/community.routes";
import companyRoutes from "modules/companies/companies.routes";
import discoveryRoutes from "modules/discovery/discovery.routes";
import engineeringRoutes from "modules/engineering/engineering.routes";
import feedRoutes from "modules/feed/feed.routes";
import hackathonRoutes from "modules/hackathons/hackathons.routes";
import interactionTrackingRoutes from "modules/interaction/interaction-tracking.routes";
import jobApplicationRoutes from "modules/jobApplications/jobApplications.routes";
import jobRoutes from "modules/jobs/jobs.routes";
import notificationRoutes from "modules/notificatios/notifications.routes";
import postRoutes from "modules/posts/posts.routes";
import projectRoutes from "modules/projects/projects.routes";
import recommendationRoutes from "modules/recommendations/recommendations.routes";
import recruiterDashboardRoutes from "modules/recruiter/recruiter-dashboard.routes";
import referralRoutes from "modules/referrals/referrals.routes";
import reputationRoutes from "modules/reputation/reputation.routes";
import searchRoutes from "modules/search/search.routes";
import socialRoutes from "modules/social/social.routes";
import teamRoutes from "modules/teams/teams.routes";
import trendingRoutes from "modules/trending/trending.routes";
import userRoutes from "modules/users/users.routes";
import eventRoutes from "modules/events/events.routes";
import externalApplicationRoutes from "modules/externalApplications/externalApplications.routes";
import placementDriveRoutes from "modules/placementDrives/placementDrives.routes";
import driveInviteRoutes from "modules/driveInvites/driveInvites.routes";
import resumeRoutes from "modules/resume/resume.routes";
import resdexRoutes from "modules/resdex/resdex.routes";
import forumRoutes from "routes/forum.routes";
import { successResponse } from "shared/utils/apiResponse";
import { authRateLimiter, searchRateLimiter, apiRateLimiter } from "shared/middleware/rateLimiter";

export const API_PREFIX = "/api/v1";

type ApiRouteEntry = {
  key: string;
  path: string;
  router: Router;
};

export const apiRouteEntries: ApiRouteEntry[] = [
  { key: "auth", path: "/auth", router: authRoutes },
  { key: "admin", path: "/admin", router: adminRoutes },
  { key: "users", path: "/users", router: userRoutes },
  { key: "colleges", path: "/colleges", router: collegeRoutes },
  { key: "posts", path: "/posts", router: postRoutes },
  { key: "notifications", path: "/notifications", router: notificationRoutes },
  { key: "projects", path: "/projects", router: projectRoutes },
  { key: "teams", path: "/teams", router: teamRoutes },
  { key: "hackathons", path: "/hackathons", router: hackathonRoutes },
  { key: "chat", path: "/chat", router: chatRoutes },
  { key: "search", path: "/search", router: searchRoutes },
  { key: "social", path: "/social", router: socialRoutes },
  { key: "referrals", path: "/referrals", router: referralRoutes },
  { key: "companies", path: "/companies", router: companyRoutes },
  { key: "jobs", path: "/jobs", router: jobRoutes },
  {
    key: "jobApplications",
    path: "/job-applications",
    router: jobApplicationRoutes,
  },
  { key: "recommendations", path: "/recommendations", router: recommendationRoutes },
  { key: "feed", path: "/feed", router: feedRoutes },
  { key: "reputation", path: "/reputation", router: reputationRoutes },
  { key: "activities", path: "/activities", router: activityRoutes },
  { key: "recruiter", path: "/recruiter", router: recruiterDashboardRoutes },
  { key: "leaderboards", path: "/leaderboards", router: leaderboardRoutes },
  { key: "interactions", path: "/interactions", router: interactionTrackingRoutes },
  { key: "affinity", path: "/affinity", router: affinityRoutes },
  { key: "analytics", path: "/analytics", router: candidateRankingRoutes },
  { key: "engineering", path: "/engineering", router: engineeringRoutes },
  { key: "discovery", path: "/discovery", router: discoveryRoutes },
  { key: "trending", path: "/trending", router: trendingRoutes },
  { key: "communities", path: "/communities", router: communityRoutes },
  { key: "events", path: "/events", router: eventRoutes },
  { key: "externalApplications", path: "/external-applications", router: externalApplicationRoutes },
  { key: "placementDrives", path: "/placement-drives", router: placementDriveRoutes },
  { key: "driveInvites", path: "/drive-invites", router: driveInviteRoutes },
  { key: "resume", path: "/resume", router: resumeRoutes },
  { key: "resdex", path: "/resdex", router: resdexRoutes },
  { key: "forum", path: "/forum", router: forumRoutes },
];

export const apiRouteMap = Object.fromEntries(
  apiRouteEntries.map(({ key, path }) => [key, `${API_PREFIX}${path}`]),
);

export const registerApiRoutes = (app: Express) => {
  app.get(API_PREFIX, (req, res) => {
    res.json(
      successResponse(
        {
          name: "Engineering Platform API",
          version: "v1",
          status: "ok",
          routes: apiRouteMap,
        },
        "API ready",
      ),
    );
  });

  for (const { key, path, router } of apiRouteEntries) {
    let rateLimiter;
    if (key === "auth") {
      rateLimiter = authRateLimiter;
    } else if (key === "search" || key === "resdex") {
      rateLimiter = searchRateLimiter;
    } else {
      rateLimiter = apiRateLimiter;
    }
    app.use(`${API_PREFIX}${path}`, rateLimiter, router);
  }
};
