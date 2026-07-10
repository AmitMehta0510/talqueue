# Product Workflow & Architecture Report: Engineers Platform
**Date:** July 1, 2026  
**Role:** Senior Product & Solution Architect  
**Audience:** Incoming CTO, Executive Leadership, and Engineering Team  

---

## 1. Product Vision & Market Differentiation

### 1.1 Core Business Problem
Traditional professional networks (e.g., LinkedIn) rely on self-reported, unverified claims of competence. General job portals (e.g., Indeed, traditional portals) act as high-noise resume repositories, while university management systems (e.g., Superset) focus on placement administration without evaluating technical skills. GitHub shows raw code but lacks company recruitment workflows or networking context. 

**Engineers Platform** solves the trust and discovery gap in technical recruitment. It is a verified, gamified ecosystem connecting students, academic institutions, industry professionals, and corporate recruiters. Every engineering project, skill claim, and resume bullet is linked to verifiable data—such as GitHub activity, coding challenges, peer evaluations, and automated verification services.

```
+-------------------------------------------------------------+
|                     ENGINEERS PLATFORM                      |
+------------------------------+------------------------------+
|     VERIFIED PORTFOLIO       |     ACADEMIC ALIGNMENT       |
|  - Real GitHub Commit Audits |  - University TPO Portals    |
|  - Peer-Reviewed Projects    |  - Placement Drive Workflows |
+------------------------------+------------------------------+
|     REPUTATION ENGINE        |     TARGETED RECRUITMENT     |
|  - Dynamic Engineering Score |  - Resdex Resume Searching   |
|  - Automated Verifications   |  - Pipeline V2 Enrichment   |
+------------------------------+------------------------------+
```

### 1.2 Differentiators

| Dimension | LinkedIn | GitHub | Superset / Unstop | Engineers Platform |
| :--- | :--- | :--- | :--- | :--- |
| **Trust Factor** | Low (Self-reported text) | Medium (Raw code, no business context) | Medium (Academic verification only) | **High (GitHub Audited, Verified Projects, Skills Verified)** |
| **Recruitment Context** | General/Broad | Developer-only (no workflows) | University placements only | **Hybrid (Public Jobs + Campus Drives + Structured ATS Webhooks)** |
| **Reputation System** | Influencer-based (likes) | Star/Contribution-based | Leaderboards (competitions only) | **Verified Engineering Score (gamified badges + activity)** |
| **Campus Integration** | None | None | Administration focused | **TPO & CDCR Dashboards + Automated Shortlisting rounds** |

---

## 2. User Actors & Lifecycles

### 2.1 Student
* **Capabilities:** Register, build a profile, sync GitHub projects, form/join teams, participate in communities, register for events/hackathons, request recommendations/referrals, view/apply for jobs, and join campus placement drives.
* **Lifecycle:** 
  1. Register via university email or public domain.
  2. Input academic metrics (GPA, Graduation Year) and link GitHub profile.
  3. Earn reputation points and skill badges through code verification and hackathons.
  4. Participate in Campus Placement Drives organized by their college.
  5. Apply to public jobs, receive referrals from Professionals, and transition to **Alumni** status upon graduation.

### 2.2 Professor
* **Capabilities:** Create courses/events, review and verify student projects, endorse student skills, organize academic coding panels, and provide academic recommendations.
* **Lifecycle:**
  1. Registered by college master admin or verified via academic domain.
  2. Review portfolios of students registered under their department.
  3. Approve/Verify academic project milestones to boost students' reputation scores.

### 2.3 Professional (Alumni / Mentor / Referrer)
* **Capabilities:** Share industry posts, review student projects, grant referrals, host mock interviews, list engineering resources, and match with students for mentoring.
* **Lifecycle:**
  1. Verify employment through domain matching or verification links.
  2. Review incoming referral/mentorship requests from students.
  3. Post job opportunities or share interview resources.

### 2.4 Recruiter
* **Capabilities:** Search candidates via Resdex, view verified candidate profiles, post jobs, manage job applications, invite colleges to placement drives, and move candidates through recruitment stages.
* **Lifecycle:**
  1. Create account under a corporate domain.
  2. Request to claim or join a Company profile.
  3. Once verified, post jobs and launch Placement Drives targeting specific colleges.

### 2.5 Company Admin
* **Capabilities:** Manage company details, approve/remove recruiters under the company, view candidate analytics, and manage company offices/departments.
* **Lifecycle:**
  1. Claim company page through email verification or admin approval.
  2. Onboard and manage recruiters, review applicant channels, and analyze company recruitment performance.

### 2.6 Master College Admin
* **Capabilities:** Manage college profiles, onboard departments, approve/onboard TPOs and CDCR members, and view overall college performance reports.
* **Lifecycle:**
  1. Verified by Platform Admin.
  2. Onboard college departments, standard curriculums, and manage staff permissions.

### 2.7 Training & Placement Officer (TPO)
* **Capabilities:** Create and manage Placement Drives, invite companies, approve/reject students for drives, view analytics, and publish shortlists.
* **Lifecycle:**
  1. Appointed by Master College Admin.
  2. Run the college placement office—managing schedules, coordinating drive invites, and verifying student eligibility.

### 2.8 Career Development & Placement Representative (CDCR)
* **Capabilities:** Assist TPOs in coordinating drives, updating student eligibility, and publishing round status.
* **Lifecycle:**
  1. Student coordinator nominated by TPO.
  2. Limited write permissions to update candidate status during live campus drives.

### 2.9 Platform Admin / Super Admin
* **Capabilities:** Full system read/write access, manual auditing, college/company verification approvals, system settings management, and overall platform analytics.
* **Lifecycle:**
  1. Seeded via system initialization configs.
  2. Resolve security disputes, approve large corporate claiming workflows, and inspect global health logs.

### 2.10 Judge & Event Organizer
* **Capabilities:** Grade hackathon submissions, create scorecards, host panels, and configure hackathon winner slots.
* **Lifecycle:**
  1. Appointed by hackathon host.
  2. Evaluate assigned teams based on code quality, execution, and presentation.

---

## 3. End-to-End User Journeys

### 3.1 Student Campus-to-Corporate Journey
```
[Auth Register] -> [Verify College Email] -> [Sync GitHub]
                                                 |
                                                 v
[Campus Placement Drive] <- [Build Reputation / Earn Badges]
        |
        +--> [Round 1: Online Coding Test]
        +--> [Round 2: Shortlist Evaluation]
        +--> [Round 3: Live Interview Room] -> [Offer Received] -> [Alumni Role]
```

### 3.2 Recruiter Talent Ingestion Journey
```
[Company Claim] -> [Search Resdex (Boolean/Skills)] -> [View Verified Portfolios]
                                                                |
                                                                v
[Move Candidate: Offered] <- [Conduct Technical Interview] <- [Invite to Job/Drive]
```

### 3.3 TPO Campus Placements Coordination Journey
```
[Onboard Departments] -> [Invite Company to Placement Drive] -> [Filter Eligible Students]
                                                                        |
                                                                        v
[Publish Final Placed List] <- [Coordinate Rounds / Shortlists] <- [Review Candidate Resumes]
```

---

## 4. Platform Modules: Detailed Breakdown

This section covers all 38 subdirectories present under `server/src/modules/` mapping the backend capability stack.

---

### 4.1 Users Module
* **Why it exists:** Core profile management for all user roles.
* **Database Models:** `User`, `Profile`, `CodingProfile`, `UserSkill`, `Education`, `Experience`.
* **Main APIs:** `GET /api/users/:id`, `PATCH /api/users/profile`, `POST /api/users/skills`.
* **RBAC:** Users manage their own profiles; TPOs/Recruiters can view student profiles.
* **Workflow:** Collects personal, education, employment, and external coding profiles (LeetCode/CodeForces). Handles skill tagging.
* **Notifications/Emails/Sockets:** Real-time profile view alert socket events.
* **Redis/Elasticsearch:** Syncs profile details to Elasticsearch index (`users`) for search. Caches profile views in Redis.
* **Cron Jobs:** Syncs external coding profiles nightly.
* **Dependencies:** `Auth`, `Storage` (profile picture).
* **Future Dependents:** `Recommendations`, `Search`, `PlacementDrives`.

---

### 4.2 Auth Module
* **Why it exists:** Secure registration, token issuing, and permission checks.
* **Database Models:** `User`, `Role`, `UserRole`.
* **Main APIs:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh-token`.
* **RBAC:** Publicly accessible endpoints.
* **Workflow:** Registers users, hashes passwords, handles OAuth (GitHub), generates JWT access/refresh tokens.
* **Notifications/Emails/Sockets:** Sends email validation and password reset links.
* **Redis/Elasticsearch:** Revoked tokens blacklisted in Redis.
* **Cron Jobs:** None.
* **Dependencies:** None.
* **Future Dependents:** All modules requiring authenticated requests.

---

### 4.3 Projects Module
* **Why it exists:** Allows developers to display and collaborate on projects.
* **Database Models:** `Project`, `ProjectMember`, `ProjectJoinRequest`, `ProjectInvite`, `ProjectView`.
* **Main APIs:** `POST /api/projects`, `POST /api/projects/:id/join`, `POST /api/projects/:id/invite`.
* **RBAC:** Authors control project settings. Public/Private visibility rules.
* **Workflow:** User posts a project, links to GitHub repo, and invites team members. Other users request to join.
* **Notifications/Emails/Sockets:** Triggers socket and push notifications for join requests and collaboration invites.
* **Redis/Elasticsearch:** Projects indexed in Elasticsearch (`projects`) for discovery.
* **Cron Jobs:** Periodic updates of repository statistics.
* **Dependencies:** `GitHub`, `Users`.
* **Future Dependents:** `Reputation` (score projects), `Recommendations` (feed match).

---

### 4.4 GitHub Module
* **Why it exists:** Verifies software engineering contributions directly from the source.
* **Database Models:** None directly (updates `UserSkill` and `Project` meta).
* **Main APIs:** `POST /api/github/sync`, `GET /api/github/repos`.
* **RBAC:** Authenticated users who link GitHub.
* **Workflow:** Pulls repository list, commit histories, lines of code, and PR statistics via GitHub API to verify portfolio claims.
* **Notifications/Emails/Sockets:** Updates user profile sync status in real time via sockets.
* **Redis/Elasticsearch:** Caches GitHub API responses in Redis to avoid rate limits.
* **Cron Jobs:** Nightly portfolio stats refresh.
* **Dependencies:** `Users`.
* **Future Dependents:** `Reputation` (validates coding scores).

---

### 4.5 Placement Drives Module
* **Why it exists:** Solves the coordination and execution of university campus hiring.
* **Database Models:** `PlacementDrive`, `PlacementDriveApplication`, `PlacementDriveInvite`, `PlacementDriveRound`, `PlacementDriveRoundShortlist`.
* **Main APIs:** `POST /api/drives`, `POST /api/drives/:id/invite`, `POST /api/drives/:id/rounds/:roundId/shortlist`.
* **RBAC:** TPOs create drives. Recruiters join/invite. Students apply.
* **Workflow:**
  1. TPO initiates placement drive and invites companies.
  2. Company accepts and posts job roles.
  3. TPO filters eligible students (GPA/Reputation) who apply.
  4. Recruiter reviews applications and conducts evaluation rounds (Aptitude, Coding, Technical, HR).
  5. Shortlist published at each round until candidates are selected.
* **Notifications/Emails/Sockets:** Critical email alerts and real-time socket updates for round shortlists.
* **Redis/Elasticsearch:** None.
* **Cron Jobs:** Automated round reminder crons.
* **Dependencies:** `Colleges`, `Companies`, `Jobs`, `Users`.
* **Future Dependents:** `Analytics` (placement rate metrics).

---

### 4.6 Resdex Module
* **Why it exists:** Resume search index dashboard for corporate recruiters.
* **Database Models:** None (reads from `User` & `Profile` via Elasticsearch).
* **Main APIs:** `GET /api/resdex/search`, `POST /api/resdex/save-search`.
* **RBAC:** Only Recruiters/Company Admins.
* **Workflow:** Provides complex search filters (skills, experience, college tier, reputation score, graduation year) for finding candidates.
* **Notifications/Emails/Sockets:** None.
* **Redis/Elasticsearch:** Heavily queries Elasticsearch `users` index.
* **Cron Jobs:** None.
* **Dependencies:** `Search`, `Users`.
* **Future Dependents:** `Analytics`.

---

### 4.7 Reputation Module
* **Why it exists:** Gamification and score system that represents technical and community impact.
* **Database Models:** `ReputationEvent`, `Badge`, `UserBadge`.
* **Main APIs:** `GET /api/reputation/score`, `GET /api/reputation/leaderboard`.
* **RBAC:** Authenticated users.
* **Workflow:** Listens for platform actions (submitting project, passing coding challenge, peer endorsement) and adjusts the user's "Engineering Score" and badges accordingly.
* **Notifications/Emails/Sockets:** Real-time socket badge allocation notifications.
* **Redis/Elasticsearch:** High-performance leaderboard scores cached in Redis sorted sets (`leaderboard:global`).
* **Cron Jobs:** Weekly badge recalculations.
* **Dependencies:** `Users`, `Activities`.
* **Future Dependents:** `Search` (ranking signals), `PlacementDrives` (eligibility criteria).

---

### 4.8 Teams Module
* **Why it exists:** Facilitates group project coordination and hackathon participation.
* **Database Models:** `Team`, `TeamMember`, `TeamInvite`.
* **Main APIs:** `POST /api/teams`, `POST /api/teams/:id/invite`, `POST /api/teams/:id/members`.
* **RBAC:** Team creator controls membership.
* **Workflow:** Create team, send collaboration invites, and submit team registration to hackathons.
* **Notifications/Emails/Sockets:** Sockets notify users of team invitations.
* **Redis/Elasticsearch:** None.
* **Cron Jobs:** None.
* **Dependencies:** `Users`.
* **Future Dependents:** `Hackathons`, `Projects`.

---

### 4.9 Hackathons Module
* **Why it exists:** Host developer hackathons for product building and talent sourcing.
* **Database Models:** `Hackathon`, `HackathonRegistration`, `HackathonSubmission`, `HackathonJudge`, `HackathonEvaluation`, `HackathonWinner`.
* **Main APIs:** `POST /api/hackathons`, `POST /api/hackathons/:id/register`, `POST /api/hackathons/:id/submit`.
* **RBAC:** Organizers manage hackathons. Judges grade submissions. Teams register and submit.
* **Workflow:**
  1. Organizer publishes hackathon timeline, criteria, and judges.
  2. Teams register.
  3. Teams submit project repository links and demo URLs.
  4. Judges grade submissions on custom scorecards.
  5. Winners declared.
* **Notifications/Emails/Sockets:** Sockets update leaderboard during evaluations.
* **Redis/Elasticsearch:** Caches live scores in Redis.
* **Cron Jobs:** Automation of hackathon stage transitions (Registration Closed, Evaluation Started, etc.).
* **Dependencies:** `Teams`, `Projects`, `Users`.
* **Future Dependents:** `Reputation` (assigns hackathon winner badges).

---

### 4.10 Jobs Module
* **Why it exists:** Core job listing and search board.
* **Database Models:** `Job`, `SavedJob`.
* **Main APIs:** `GET /api/jobs`, `POST /api/jobs` (admin), `POST /api/jobs/:id/save`.
* **RBAC:** Public view; Company Admins/Recruiters create; Students apply.
* **Workflow:** Recruiters list openings. Runs shadow pipeline V2 parsing to extract technical stack, location details, and confidence values.
* **Notifications/Emails/Sockets:** Real-time job matching alert sockets.
* **Redis/Elasticsearch:** Jobs are indexed in Elasticsearch (`jobs`) with custom synonym analyzers for skill queries.
* **Cron Jobs:** Daily close criteria check for stale jobs.
* **Dependencies:** `Companies`, `Users`.
* **Future Dependents:** `JobApplications`, `Recommendations`.

---

### 4.11 Job Applications Module
* **Why it exists:** Tracks job seekers through the recruitment pipeline.
* **Database Models:** `JobApplication`.
* **Main APIs:** `POST /api/applications`, `PATCH /api/applications/:id/status`.
* **RBAC:** Applicants view their applications. Recruiters manage applications for their job postings.
* **Workflow:**
  1. Student applies with profile & resume.
  2. Application enters `APPLIED` state.
  3. Recruiter moves applicant to `SCREENING` -> `INTERVIEW` -> `OFFERED` / `REJECTED`.
* **Notifications/Emails/Sockets:** Emails/sockets alert students of interview invitations and status changes.
* **Redis/Elasticsearch:** None.
* **Cron Jobs:** None.
* **Dependencies:** `Jobs`, `Resume`, `Users`.
* **Future Dependents:** `Analytics` (conversion funnels).

---

### 4.12 Colleges Module
* **Why it exists:** Manages university profiles and coordinates staff.
* **Database Models:** `College`, `Department`, `CollegeAdmin`, `CdcrMember`, `CollegeTpo`.
* **Main APIs:** `GET /api/colleges`, `POST /api/colleges/departments`, `POST /api/colleges/staff`.
* **RBAC:** Master College Admin manages college. TPOs manage departments and placement settings.
* **Workflow:** Configures academic catalog, maps student registries, and authorizes placement officers.
* **Notifications/Emails/Sockets:** Emails for TPO onboarding confirmation.
* **Redis/Elasticsearch:** Colleges indexed for selection list search.
* **Cron Jobs:** None.
* **Dependencies:** `Users`.
* **Future Dependents:** `PlacementDrives`.

---

### 4.13 Communities Module
* **Why it exists:** Social interest groups and campus communities.
* **Database Models:** `Community`, `CommunityMember`.
* **Main APIs:** `POST /api/communities`, `POST /api/communities/:id/join`.
* **RBAC:** Admins manage settings. Members view content.
* **Workflow:** Setup group, invite users, post discussions, and link to community events.
* **Notifications/Emails/Sockets:** Event posts emit notifications to members.
* **Redis/Elasticsearch:** Search index for community discovery.
* **Cron Jobs:** None.
* **Dependencies:** `Users`, `Posts`.
* **Future Dependents:** `Feed`.

---

### 4.14 Chat Module
* **Why it exists:** Direct messaging and team coordination.
* **Database Models:** `Conversation`, `ConversationParticipant`, `Message`, `MessageReaction`.
* **Main APIs:** `GET /api/chat/conversations`, `POST /api/chat/messages`.
* **RBAC:** Chat participants only.
* **Workflow:** Creates direct messages or group chats (hackathons/projects). Direct messaging sends realtime packet.
* **Notifications/Emails/Sockets:** Socket.io delivers chat events instantly. Fallback offline push notification.
* **Redis/Elasticsearch:** Message history cached in Redis for fast rendering.
* **Cron Jobs:** None.
* **Dependencies:** `Users`.
* **Future Dependents:** None.

---

### 4.15 Posts Module
* **Why it exists:** Allow community updates, articles, and text feeds.
* **Database Models:** `Post`, `PostShare`, `SavedPost`, `PostTag`, `Comment`, `Like`.
* **Main APIs:** `POST /api/posts`, `POST /api/posts/:id/comment`, `POST /api/posts/:id/like`.
* **RBAC:** Public/Authenticated users. Creators delete/edit.
* **Workflow:** User posts content with tags. Others comment, share, or like.
* **Notifications/Emails/Sockets:** Real-time socket events for comment/like actions.
* **Redis/Elasticsearch:** Indexed in Elasticsearch `posts` index.
* **Cron Jobs:** None.
* **Dependencies:** `Users`.
* **Future Dependents:** `Feed` (AI scoring input).

---

### 4.16 Feed Module
* **Why it exists:** Renders a customized algorithmic home feed.
* **Database Models:** `FeedInteraction`, `FeedAnalytics`.
* **Main APIs:** `GET /api/feed`.
* **RBAC:** Authenticated users.
* **Workflow:** Collects recent posts and engineering activities, applies score ranking (recency, tag affinity, creator score), and returns an individualized activity river.
* **Redis/Elasticsearch:** Ranks content via Redis user affinity maps.
* **Cron Jobs:** Feed analytic updates.
* **Dependencies:** `Posts`, `Activities`, `Affinity`.
* **Future Dependents:** `Recommendations`.

---

### 4.17 Discovery Module
* **Why it exists:** Recommends relevant candidates to recruiters and communities to users.
* **Database Models:** `UserRecommendation`, `RecommendationSnapshot`.
* **Main APIs:** `GET /api/discovery/recommendations`.
* **RBAC:** recruiters and users.
* **Workflow:** Computes multi-factor matches (skill alignment, geographic proximity, community interests) and outputs cards for discovery swipe feeds.
* **Redis/Elasticsearch:** Caches recommendation lists in Redis.
* **Cron Jobs:** Computes recommendation maps in background.
* **Dependencies:** `Users`, `Search`, `Affinity`.
* **Future Dependents:** `Recruiter`.

---

### 4.18 Referral Module
* **Why it exists:** Student talent sourcing via trusted corporate professional referrals.
* **Database Models:** `ReferralRequest`.
* **Main APIs:** `POST /api/referrals`, `PATCH /api/referrals/:id/status`.
* **RBAC:** Students request. Verified corporate professionals review and issue.
* **Workflow:** Student requests referral for a company job role. Professional reviews verified portfolio/GitHub achievements and logs a formal system referral.
* **Notifications/Emails/Sockets:** Real-time system referral confirmation push.
* **Redis/Elasticsearch:** None.
* **Cron Jobs:** Expiry checks.
* **Dependencies:** `Users`, `Jobs`, `Companies`.
* **Future Dependents:** `JobApplications` (boosts application ranking).

---

### 4.19 Analytics Module
* **Why it exists:** Provides insights for college placements, recruiter funnels, and user profiles.
* **Database Models:** `ProfileView`, `ProjectView`, `FeedAnalytics`.
* **Main APIs:** `GET /api/analytics/placements`, `GET /api/analytics/recruiter`.
* **RBAC:** Admin/TPO/Recruiters for dashboards; users for personal views.
* **Workflow:** Aggregates views, click logs, placement ratios, and hiring funnels into charts.
* **Redis/Elasticsearch:** Aggregated from interaction events logged in Redis.
* **Cron Jobs:** Nightly data rollup.
* **Dependencies:** `Interaction`, `Users`.
* **Future Dependents:** None.

---

### 4.20 Search Module
* **Why it exists:** Unified search interface for the platform.
* **Database Models:** None (abstract search orchestration).
* **Main APIs:** `GET /api/search?q=query`.
* **RBAC:** Authenticated search.
* **Workflow:** Routes search request to Elasticsearch with specific booster functions (boosting by Engineering score or Verified flag).
* **Redis/Elasticsearch:** Core driver for Elasticsearch integration.
* **Cron Jobs:** None.
* **Dependencies:** None.
* **Future Dependents:** `Resdex`, `Discovery`.

---

### 4.21 Resume Module
* **Why it exists:** Parses resumes and extracts structured profile data.
* **Database Models:** None (updates Profile model).
* **Main APIs:** `POST /api/resume/upload-parse`.
* **RBAC:** Users upload their own resume.
* **Workflow:** Uploader sends PDF. Pipeline extracts text, parses sections (Experience, Projects, Education, Skills) and populates Profile schema.
* **Notifications/Emails/Sockets:** Direct socket updates.
* **Redis/Elasticsearch:** Extracted resume text index updated in Elasticsearch.
* **Cron Jobs:** None.
* **Dependencies:** `Storage`, `Users`.
* **Future Dependents:** `Resdex` (structured search query matches).

---

### 4.22 Drive Invites Module
* **Why it exists:** Placement drive invitation coordination between TPOs and corporate recruiting agents.
* **Database Models:** `PlacementDriveInvite`.
* **Main APIs:** `POST /api/drive-invites`, `PATCH /api/drive-invites/:id`.
* **RBAC:** TPOs send to companies; Recruiters send to colleges.
* **Workflow:** Invites sent to initiate university-recruiter hiring programs. Once accepted, drives are instantiated.
* **Notifications/Emails/Sockets:** Invitation alerts.
* **Redis/Elasticsearch:** None.
* **Cron Jobs:** Expiration cleanups.
* **Dependencies:** `PlacementDrives`, `Colleges`, `Companies`.
* **Future Dependents:** `Analytics`.

---

### 4.23 Engineering Module
* **Why it exists:** Validates technical portfolios (e.g., GitHub, GitLab) and builds candidate trust metrics.
* **Database Models:** Updates `CodingProfile`.
* **Main APIs:** `POST /api/engineering/audit`, `GET /api/engineering/trust-score`.
* **RBAC:** Authenticated users.
* **Workflow:** Examines commit histories, repository contributions, and calculates a technical "Trust Score" representing proof-of-work.
* **Notifications/Emails/Sockets:** Real-time progress updates on sync.
* **Redis/Elasticsearch:** None.
* **Cron Jobs:** Periodic auditing tasks.
* **Dependencies:** `GitHub`, `Users`.
* **Future Dependents:** `Reputation`.

---

### 4.24 Events Module
* **Why it exists:** Community event coordination, webinar bookings, and campus coding contests.
* **Database Models:** `Event`, `EventRSVP`.
* **Main APIs:** `POST /api/events`, `POST /api/events/:id/rsvp`.
* **RBAC:** Authenticated RSVP; Staff/Admins create.
* **Workflow:** Organizers post schedules. Members RSVP to register interest.
* **Notifications/Emails/Sockets:** Calendar invites and reminders sent.
* **Redis/Elasticsearch:** None.
* **Cron Jobs:** Upcoming event alert triggers.
* **Dependencies:** `Users`, `Community`.
* **Future Dependents:** `Analytics`.

---

### 4.25 External Applications Module
* **Why it exists:** Allows students to keep a central tracker of all off-platform applications.
* **Database Models:** `ExternalJobApplication`.
* **Main APIs:** `POST /api/external-applications`.
* **RBAC:** Users track their own lists.
* **Workflow:** Simple tracking sheet for companies, roles, and status (Applied, Interviewing, Rejected) applied off-platform.
* **Notifications/Emails/Sockets:** None.
* **Redis/Elasticsearch:** None.
* **Cron Jobs:** None.
* **Dependencies:** `Users`.
* **Future Dependents:** `Analytics` (personal career dashboard).

---

### 4.26 Interaction Module
* **Why it exists:** Low-level event logger for feed and recommendation training.
* **Database Models:** `FeedInteraction`, `ProfileView`, `ProjectView`.
* **Main APIs:** `POST /api/interactions/log`.
* **RBAC:** System internally writes.
* **Workflow:** Captures clicks, views, scroll actions, and dwell time, pushing telemetry data to queue.
* **Notifications/Emails/Sockets:** None.
* **Redis/Elasticsearch:** Intermediary buffer storage in Redis before DB flush.
* **Cron Jobs:** None.
* **Dependencies:** None.
* **Future Dependents:** `Feed`, `Recommendations` (tuning models).

---

### 4.27 Interviews Module
* **Why it exists:** Provides mock technical interview rooms and learning banks.
* **Database Models:** `InterviewResource`, `SavedInterviewResource`, `InterviewRoom`.
* **Main APIs:** `POST /api/interviews/mock`, `POST /api/interviews/rooms/join`.
* **RBAC:** Candidates and interviewer roles.
* **Workflow:** Facilitates setup of a visual live interview room with collaborative code editor (via Socket.io). Contains resource list library.
* **Notifications/Emails/Sockets:** Real-time collaboration sockets.
* **Redis/Elasticsearch:** Caches code editor states in Redis.
* **Cron Jobs:** None.
* **Dependencies:** `Users`, `Chat`.
* **Future Dependents:** `PlacementDrives`.

---

### 4.28 Notifications Module
* **Why it exists:** Centralized alert dispatcher.
* **Database Models:** `Notification`.
* **Main APIs:** `GET /api/notifications`, `PATCH /api/notifications/read`.
* **RBAC:** Authenticated users retrieve their own notifications.
* **Workflow:** Standard dispatcher exposed to other modules to handle system, socket, push, and email notification outputs.
* **Notifications/Emails/Sockets:** Core delivery module.
* **Redis/Elasticsearch:** None.
* **Cron Jobs:** None.
* **Dependencies:** None.
* **Future Dependents:** All modules.

---

### 4.29 Recruiter Module
* **Why it exists:** Coordinates verification and onboarding of corporate recruitment personnel.
* **Database Models:** `CompanyAdmin`.
* **Main APIs:** `POST /api/recruiters/claim`, `GET /api/recruiters/dashboard`.
* **RBAC:** Recruiters.
* **Workflow:** Manages claim validation workflows and handles dashboard views of applicant pools.
* **Notifications/Emails/Sockets:** Recruiter verification emails.
* **Redis/Elasticsearch:** None.
* **Cron Jobs:** None.
* **Dependencies:** `Companies`, `Users`.
* **Future Dependents:** `PlacementDrives`, `Jobs`.

---

### 4.30 Social Module
* **Why it exists:** Manages connections, followers, and networking graph.
* **Database Models:** `Follow`, `Connection`.
* **Main APIs:** `POST /api/social/follow`, `POST /api/social/connect`.
* **RBAC:** Authenticated users.
* **Workflow:** Follow users or request connection. Handles graph operations.
* **Notifications/Emails/Sockets:** Sockets emit connection requests.
* **Redis/Elasticsearch:** None.
* **Cron Jobs:** None.
* **Dependencies:** `Users`.
* **Future Dependents:** `Feed` (first-degree connection content prioritization).

---

### 4.31 Storage Module
* **Why it exists:** Central cloud asset file manager.
* **Database Models:** None (interacts with S3).
* **Main APIs:** `POST /api/storage/upload`.
* **RBAC:** Authenticated users.
* **Workflow:** Handles local file uploads and routes them to AWS S3, returning CDN URLs.
* **Notifications/Emails/Sockets:** None.
* **Redis/Elasticsearch:** None.
* **Cron Jobs:** None.
* **Dependencies:** None.
* **Future Dependents:** `Users` (profile images), `Resume` (PDF upload).

---

### 4.32 TPO Module
* **Why it exists:** Custom coordinator dashboard for university placement cells.
* **Database Models:** `CollegeTpo`, `CdcrMember`.
* **Main APIs:** `GET /api/tpo/dashboard`, `GET /api/tpo/analytics`.
* **RBAC:** TPOs and CDCR members only.
* **Workflow:** Placement drive scheduling, company invite management, and student registries analytics dashboard.
* **Notifications/Emails/Sockets:** None.
* **Redis/Elasticsearch:** None.
* **Cron Jobs:** None.
* **Dependencies:** `PlacementDrives`, `Colleges`.
* **Future Dependents:** None.

---

### 4.33 Trending Module
* **Why it exists:** Captures popular posts and tags for explore page views.
* **Database Models:** `TrendingSnapshot`.
* **Main APIs:** `GET /api/trending`.
* **RBAC:** Public/Authenticated users.
* **Workflow:** Analyzes view/like metrics over the last 24-48 hours and produces lists of top posts.
* **Redis/Elasticsearch:** Caches lists in Redis.
* **Cron Jobs:** Hourly trending recalculation.
* **Dependencies:** `Posts`, `Interaction`.
* **Future Dependents:** `Feed`.

---

### 4.34 Activities Module
* **Why it exists:** Underpinning event pipeline mapping user behaviors.
* **Database Models:** `EngineeringActivity`.
* **Main APIs:** `GET /api/activities`.
* **RBAC:** Authenticated users.
* **Workflow:** System registers events (commit made, project posted, comment written) into EngineeringActivity.
* **Redis/Elasticsearch:** Feeds into Elasticsearch to build user profile timeline indexes.
* **Cron Jobs:** None.
* **Dependencies:** `Users`.
* **Future Dependents:** `Feed`, `Reputation`.

---

### 4.35 Affinity Module
* **Why it exists:** Tracks interactions to measure interest levels between entities.
* **Database Models:** `UserAffinity`.
* **Main APIs:** Internal engine query.
* **RBAC:** Internal only.
* **Workflow:** Compiles interaction counts (views, likes, chat messages) and computes affinity vectors.
* **Redis/Elasticsearch:** Caches vectors in Redis.
* **Cron Jobs:** Daily recalculation.
* **Dependencies:** `Interaction`.
* **Future Dependents:** `Feed`, `Recommendations`.

---

### 4.36 Analytics (Feed/Views) Module
* **Why it exists:** Track feed health, engagement times, and read telemetry.
* **Database Models:** `FeedAnalytics`.
* **Main APIs:** Internal dashboard logs.
* **RBAC:** Super Admin.
* **Workflow:** Standard analytics reports.
* **Redis/Elasticsearch:** None.
* **Cron Jobs:** None.
* **Dependencies:** `Feed`, `Interaction`.
* **Future Dependents:** None.

---

### 4.37 Companies Module
* **Why it exists:** Directory of engineering companies.
* **Database Models:** `Company`, `CompanyRequest`, `CompanyOffice`, `CompanyDepartment`.
* **Main APIs:** `GET /api/companies`, `POST /api/companies/claim`.
* **RBAC:** Public view, admin approval.
* **Workflow:** Directories are scraped/discovered via CRON or added by admins. Handles office branches and departments.
* **Notifications/Emails/Sockets:** On claim, sends verification alerts.
* **Redis/Elasticsearch:** Companies indexed in Elasticsearch.
* **Cron Jobs:** Discovery crawler script crons.
* **Dependencies:** None.
* **Future Dependents:** `Jobs`, `Recruiter`, `PlacementDrives`.

---

### 4.38 Discovery (Content/Users) Module
* **Why it exists:** Swipe recommendation deck.
* **Database Models:** None (orchestrates recommendation service).
* **Main APIs:** `GET /api/discovery/feed`.
* **RBAC:** Authenticated.
* **Workflow:** Returns personalized developer and project recommendations.
* **Redis/Elasticsearch:** Caches recommendation vectors.
* **Cron Jobs:** Pre-generates daily decks.
* **Dependencies:** `Recommendations`.
* **Future Dependents:** None.

---

## 5. Core Business Flows: Architectural Walkthrough

### 5.1 Placement Drive Evaluation Flow
The Placement Drive module is a core business feature. When a company (e.g., Stripe) launches a Placement Drive on campus, the pipeline executes as follows:

```
[Student Portfolios]
       |
       v
[TPO Eligibility Filter] (GPA > 8.0 & Reputation > 500)
       |
       v
[Placement Drive Invite] (Created by TPO, Accepted by Recruiter)
       |
       v
[Application Phase] (Eligible students apply)
       |
       v
[Evaluation Round 1] (Aptitude test: Recruiter inserts shortlists)
       |
       v
[Evaluation Round 2] (Coding test: Live technical challenge)
       |
       v
[Evaluation Round 3] (Live Interview Room: WebRTC room with collaborative editor)
       |
       v
[Shortlist Finalized] -> [System issues badge "Placed at Stripe"] -> [Profile synced]
```

### 5.2 Resume Parsing & Resdex Workflow
Recruiters search for candidates using Resdex. This process is powered by a parsing and indexing pipeline:

```
[Candidate PDF Upload] -> [Storage Service (S3)] -> [Resume Service (Textract/Parser)]
                                                                |
                                                                v
[Elasticsearch 'users'] <- [DB Update: Profile] <- [Extract Sections & Skills]
       |
  (Indexed)
       |
       +--> [Recruiter Boolean Search: "React AND Python AND Tier-1"]
       +--> [Engine performs Match and returns ranked candidate profiles]
```

### 5.3 Engineering Score & Reputation System
The **Engineering Score** is a trust metric that determines user positioning in search queries, placement eligibility, and job recommendations.

```
                  +--------------------------+
                  |  User Action / Event     |
                  +-------------+------------+
                                |
        +-----------------------+-----------------------+
        |                       |                       |
        v                       v                       v
[GitHub Sync Event]     [Peer Endorsement]     [Hackathon Win]
- Commit audit          - Skill verification   - Scorecard grade
- Code complexity       - Professional review  - Winner badge
        |                       |                       |
        +-----------------------+-----------------------+
                                |
                                v
                   [System Score Engine Update]
                                |
            +-------------------+-------------------+
            |                                       |
            v                                       v
[Badges Awarded (Redis)]                 [Engineering Score in DB]
(e.g., "GitHub Pro", "CodeMaster")       (e.g., 850 / 1000)
            |                                       |
            +-------------------+-------------------+
                                |
                                v
                 [Elasticsearch Rank Boosted]
```

---

## 6. System Relationship Map

```
             +---------------------+
             |        Auth         |
             +----------+----------+
                        |
                        v
             +---------------------+
             |        Users        |
             +----------+----------+
                        |
       +----------------+----------------+
       |                                 |
       v                                 v
+--------------+                 +--------------+
|   Projects   |                 |    Colleges  |
+------+-------+                 +------+-------+
       |                                 |
       v                                 v
+--------------+                 +--------------+
|    GitHub    |                 |  Placement   |
+------+-------+                 |    Drives    |
       |                         +------+-------+
       v                                 |
+--------------+                         |
|  Reputation  |<------------------------+
+------+-------+
       |
       v
+--------------+
|    Search    |
+--------------+
```

---

## 7. Global Data Flow Architecture

The step-by-step lifecycle of a client request (e.g., adding a project) is detailed below:

```
[Client App (Frontend)]
       |  (1. HTTPS POST /api/projects with body payload)
       v
[Nginx Reverse Proxy]
       |  (2. Forwards to Node.js backend port)
       v
[Projects Controller]
       |  (3. Checks auth middleware / grabs user details)
       v
[Projects Service]
       |  (4. Validates payload / calls GitHub sync module if linked)
       v
[Prisma Client]
       |  (5. Executes SQL transaction)
       +---> [PostgreSQL Database (Updates Project/Member tables)]
       |
       |  (6. Invalidates recommendation cache)
       v
[Redis Cache]
       |
       |  (7. Indexes new project keywords and repository details)
       v
[Elasticsearch Engine]
       |
       |  (8. Dispatches job to mailer queue for peer reviews)
       v
[Bull / Mail Queue] -> [AWS SES (Outgoing Email)]
       |
       |  (9. Broadcasts project announcement payload)
       v
[Socket.io Server] -> [Clients (Live feed update UI toast)]
```

---

## 8. Core Features Matrix

| Feature | Primary Purpose | Key User Roles | Critical Module Dependencies | Future System Expansion |
| :--- | :--- | :--- | :--- | :--- |
| **Placement Drives** | Organizes on-campus recruitment rounds. | Students, TPOs, CDCRs, Recruiters | `Colleges`, `Companies`, `Jobs`, `Users` | Automated online coding test engine integration. |
| **Resdex** | Search engine for recruiters to query developers. | Recruiters, Company Admins | `Search`, `Users`, `Storage` | AI-assisted search querying. |
| **GitHub Portfolio Sync** | Verifies technical competence with commit audits. | Students, Professionals | `GitHub`, `Engineering`, `Users` | GitLab and Bitbucket API support. |
| **Engineering Score** | Quantifies developer competence. | Students, Admins | `Reputation`, `Activities`, `Users` | Weighting score calculations based on project evaluations. |
| **Mock Interviews** | Live practice interview portal. | Students, Professionals | `Chat` (Socket.io WebRTC), `Users` | Auto-generation of feedback logs using LLMs. |

---

## 9. Undocumented & Critical Workflows

1. **Company Claim Loops:** When a recruiter registers with a corporate domain (e.g., `@stripe.com`), the system automatically flags matching unclaimed Company profiles (scraped from job listings). It routes domain emails to verify that the claiming user is a valid employee before handing over administrative access.
2. **S3 Fallback Loader:** If AWS S3 is down or credentials fail, the file upload system defaults to storing assets locally under a `/uploads` folder.
3. **Webhook Ingestors:** The `/api/jobs/ats-hooks` routes listen for direct payloads from Greenhouse and Lever ATS platforms. If a partner company closes a job on their Greenhouse board, the system intercepts the webhook and closes the job row in the database instantly.
4. **Proxy Rotator in Scrapers:** When scraping job boards from Workday or BambooHR, the system automatically uses a proxy rotatory config to bypass HTTP 429 rate limit blocks.

---

## 10. Product Vision: Inferred Long-Term Strategy

Based on the backend implementation, the long-term vision of the **Engineers Platform** is to build a **Verifiable Trust Network for Technical Talent**.

```
  Traditional Portals (High Noise)          Engineers Platform (High Signal)
+------------------------------------+    +------------------------------------+
|  [Resume Text] -> Self-reported    |    |  [Verified Code] -> GitHub Audited |
|  [Hiring]      -> Random outreach  | vs |  [Reputation]    -> Action-driven  |
|  [Placements]  -> Scattered spreadsheets|  [Placements]    -> Unified Drives |
+------------------------------------+    +------------------------------------+
```

### Core Strategy:
1. **Reduce Time-to-Hire:** Skip initial screening rounds by searching verified GitHub profiles and checking reputation scores directly on the platform.
2. **Standardize University Placements:** Transition colleges from spreadsheets to a digital coordination system for placement drives.
3. **Bridge Academia and Industry:** Build pathways for alumni to refer, mentor, and interview students.
