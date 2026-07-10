# Frontend Product Experience Report: Engineers Platform
**Date:** July 1, 2026  
**Role:** Senior UX Architect, Product Manager & Information Architect  
**Audience:** Incoming CTO, Product Managers, Product Designers, and Engineering Team  

---

## 1. Product Experience & Design System

The frontend of **Engineers Platform** is built using React (Vite-based), React Router v6, TailwindCSS utilities combined with CSS variables, Lucide React icons, and a custom animation layer.

### 1.1 Visual & UX Themes
* **Glassmorphism:** Navigation menus, headers, and floating overlays leverage blur filters (`backdrop-filter: blur(20px)`) combined with semitransparent borders (`border-color: var(--border)`) to overlay content layers cleanly.
* **Dynamic Dark Mode:** System-wide dark/light synchronization via media listeners (`prefers-color-scheme`) writing classes directly to the `<html>` root, adjusting color tokens (`--bg-base`, `--bg-surface`, `--text-primary`, `--border`) instantly.
* **Micro-Animations:** Page transitions are wrapped in animated containers (`page-enter` fade-in) triggered on route modifications to reduce perceived wait times.

---

## 2. Actor Screens & Experience Matrices

The platform implements strict client-side role-based routing (RequireAuth, RequireRecruiter, RequireTpo, RequirePlatformAdmin) and conditional UI rendering.

| User Role | Navigation Options Available | Protected Dashboards Accessed | Exclusive Actionable Views |
| :--- | :--- | :--- | :--- |
| **Student** | Home, Discover, Network, Jobs, Referrals, Events, Projects, Hackathons, Interviews, Placements | Placement Dashboard (`/placements`) | Edit profile, Sync GitHub, submit hackathon project, request referral. |
| **Recruiter** | Home, Discover, Jobs, Network, Chats, Recruiting | Recruiter Console (`/recruiter`), Live Drive Page (`/recruiter/drive/:id`) | Search Resdex, view applicant pipelines, move applicant round stages, invite colleges. |
| **Company Admin** | Home, Discover, Jobs, Network, Chats, Console | Company Admin Console (`/companies/:slug/admin`) | Approve recruiters, configure office locations, manage company departments. |
| **College Admin / TPO** | Home, Discover, Network, Colleges, Admin Console | TPO Dashboard (`/tpo-dashboard`), College Page (`/colleges/:slug`) | Verify student profiles, approve CDCRs, initiate campus drives, invite recruiters. |
| **CDCR Member** | Home, Discover, Network, Colleges, CDCR Dashboard | CDCR Console under (`/colleges/:slug`) | Register students for drives, coordinate interview rounds, update round shortlist. |
| **Professional** | Home, Discover, Network, Jobs, Referrals, Chats | Profile Console (`/profile`) | Review student referral requests, issue referral approvals, publish prep resources. |
| **Professor** | Home, Discover, Network, Colleges | College Department Page | Audit and verify student projects, endorse skill badges. |
| **Judge** | Home, Discover, Hackathons | Hackathon Evaluation Panel | Score team submissions on digital scorecards. |
| **Organizer** | Home, Discover, Events, Hackathons | Organizer Dashboard | Create events, schedule webinars, configure hackathon rules. |
| **Platform Admin** | Home, Discover, Full Navigation Sidebar, Admin Console | Admin Panel (`/admin`) | Approve college onboarding requests, verify company claim requests, moderation panel. |

---

## 3. End-to-End User Experience Journeys

### 3.1 Student Registration-to-Placement Journey
```
[Auth Signin / OAuth] -> [Fill profile & link GitHub] -> [Verify College Enrollment]
                                                                  |
                                                                  v
[Get Placed at Stripe] <- [Shortlisted in Round 3] <- [Eligibility Pass for Drive]
```

### 3.2 Recruiter Talent Ingestion & Shortlisting Journey
```
[Join Company Portal] -> [Verify Work Domain] -> [Query Resdex Engine]
                                                        |
                                                        v
[Hire Candidate] <- [Move Candidate (Rounds 1-3)] <- [Review Verified Profile/GitHub Stats]
```

### 3.3 TPO Campus Placements Journey
```
[Onboard University] -> [Authorize CDCR Student Coordinators] -> [Launch Placement Drive]
                                                                        |
                                                                        v
[Publish Final Shortlists] <- [Verify Student GPA / Skill Profiles] <- [Accept Recruiter Slots]
```

---

## 4. Comprehensive Page-by-Page Deep Dive

---

### 4.1 Authentication Page (`/auth`)
* **Purpose:** User registration, password authentication, and GitHub OAuth onboarding.
* **Primary Users:** Guest Users, New Users, Returning Users.
* **Entry Point / Path:** Direct link from Landing page header or redirects from protected routes.
* **Actions Available:** Register account, Login (credentials), GitHub SSO link, Password recovery.
* **Information Displayed:** Login forms, registration roles selector, security error highlights.
* **Dependencies / Connected APIs:** `POST /api/auth/register`, `POST /api/auth/login`.
* **Role Restrictions:** Public only. Signed-in users redirect to `/feed`.
* **User Goal:** Secure a session token and enter the core dashboard.

---

### 4.2 Home / Social Feed Page (`/feed`)
* **Purpose:** Central timeline of posts, code releases, and peer activities.
* **Primary Users:** Students, Professionals, Recruiters.
* **Entry Point / Path:** App header link "Home" (Root `/`).
* **Actions Available:** Write a post, like, comment, share, click user profiles, filter by tags.
* **Information Displayed:** Infinite feed of posts, trending tags panel, active connection suggestions.
* **Dependencies / Connected APIs:** `GET /api/feed`, `POST /api/posts`.
* **Role Restrictions:** None for viewing; posting requires authentication.
* **User Goal:** Consume engineering updates and engage with connections.

---

### 4.3 Profile Page (`/profile`)
* **Purpose:** Consolidated portfolio displaying verified achievements and resumes.
* **Primary Users:** Currently logged-in user (Student, Professional, Recruiter).
* **Entry Point / Path:** Header dropdown -> "View Profile" or bottom tab "Me".
* **Actions Available:** Edit personal info, upload resume PDF, sync GitHub repositories, update education/experience records, request peer skill validations.
* **Information Displayed:** Name, bio, badge case, GitHub commit charts, list of projects, resumes.
* **Dependencies / Connected APIs:** `GET /api/users/profile`, `POST /api/resume/upload-parse`.
* **Role Restrictions:** Owner only (write access).
* **User Goal:** Maintain an updated portfolio.

---

### 4.4 User Profile View Page (`/users/:username`)
* **Purpose:** Public profile card view for external discovery.
* **Primary Users:** Recruiters, TPOs, Students.
* **Entry Point / Path:** Click username or avatar anywhere on the platform (Feed, Search, Resdex).
* **Actions Available:** Send Connection request, follow user, open private Chat room, endorse skills, request resume access.
* **Information Displayed:** Candidate credentials, badges, engineering scores, verified projects list.
* **Dependencies / Connected APIs:** `GET /api/users/:username`, `POST /api/social/connect`.
* **Role Restrictions:** Authenticated users.
* **User Goal:** Evaluate a developer's portfolio or initiate contact.

---

### 4.5 Discover Page (`/discover`)
* **Purpose:** Explore recommendations for developers, repositories, communities, and companies.
* **Primary Users:** Students, Recruiters.
* **Entry Point / Path:** Header -> "Discover" or Mobile bottom tab -> "Discover".
* **Actions Available:** Swipe/Browse recommendation cards, join suggested communities, follow users, view recommended companies.
* **Information Displayed:** Categorized carousels of recommended developers, popular repositories, and trending tags.
* **Dependencies / Connected APIs:** `GET /api/discovery/recommendations`.
* **Role Restrictions:** None.
* **User Goal:** Discover relevant connections.

---

### 4.6 Search Results Page (`/search`)
* **Purpose:** Displays results for search queries.
* **Primary Users:** All users.
* **Entry Point / Path:** Input search text in header query field and press enter.
* **Actions Available:** Filter results by type (Users, Projects, Jobs, Companies, Posts), click matching cards.
* **Information Displayed:** Categorized lists of search matches.
* **Dependencies / Connected APIs:** `GET /api/search?q=query`.
* **Role Restrictions:** None.
* **User Goal:** Find a specific user, company, project, or job listing.

---

### 4.7 Jobs Page (`/jobs`)
* **Purpose:** Search and apply for active job openings.
* **Primary Users:** Students, Professionals.
* **Entry Point / Path:** Header -> "Jobs".
* **Actions Available:** Filter by title, tech stack, location, experience level; save job; submit job applications.
* **Information Displayed:** Split pane view with job lists on the left and selected job details (description, requirements, recruiter details) on the right.
* **Dependencies / Connected APIs:** `GET /api/jobs`, `POST /api/jobApplications`.
* **Role Restrictions:** Applying requires login.
* **User Goal:** Find and apply to relevant job openings.

---

### 4.8 Chats Page (`/chat` & `/chat/:conversationId`)
* **Purpose:** Instant messaging interface.
* **Primary Users:** All authenticated users.
* **Entry Point / Path:** Header -> "Chats".
* **Actions Available:** View chat threads, select conversation, send message, add reactions, attach media files.
* **Information Displayed:** Left column sidebar showing conversations list; main window displaying conversation messages and dynamic status indicators.
* **Dependencies / Connected APIs:** `GET /api/chat/conversations`, Socket.io connections.
* **Role Restrictions:** Authenticated users only.
* **User Goal:** Communicate with team members, mentors, or recruiters.

---

### 4.9 Projects Page (`/projects` & `/projects/:projectSlug`)
* **Purpose:** Publish, review, and collaborate on software projects.
* **Primary Users:** Students, Professionals.
* **Entry Point / Path:** "More" dropdown -> "Projects".
* **Actions Available:** Create project card, submit project join requests, accept member invitations, link GitHub repo.
* **Information Displayed:** Grid of active projects with tags, github star counts, and contributor lists.
* **Dependencies / Connected APIs:** `GET /api/projects`, `POST /api/projects/:id/join`.
* **Role Restrictions:** None for browsing.
* **User Goal:** Showcase technical projects and find collaborators.

---

### 4.10 Teams Page (`/teams` & `/teams/:teamId`)
* **Purpose:** Collaborative team management for hackathons and projects.
* **Primary Users:** Students.
* **Entry Point / Path:** "More" dropdown -> "Teams".
* **Actions Available:** Register a new team, send member invite, accept join requests, link to active projects.
* **Information Displayed:** User's teams dashboard, active member lists, pending invitations.
* **Dependencies / Connected APIs:** `GET /api/teams`, `POST /api/teams/:id/invite`.
* **Role Restrictions:** Authenticated users.
* **User Goal:** Assemble teams for hackathons or projects.

---

### 4.11 Hackathons Page (`/hackathons` & `/hackathons/:hackathonSlug`)
* **Purpose:** Browse, register, and submit projects for hackathons.
* **Primary Users:** Students, Judges, Organizers.
* **Entry Point / Path:** "More" dropdown -> "Hackathons".
* **Actions Available:** Register team, view evaluation criteria, submit project links, review judge scores.
* **Information Displayed:** Timeline of upcoming hackathons, registration metrics, requirements, submissions gallery.
* **Dependencies / Connected APIs:** `GET /api/hackathons`, `POST /api/hackathons/:id/submit`.
* **Role Restrictions:** Submissions require team registrations.
* **User Goal:** Participate in hackathons to showcase skills and build projects.

---

### 4.12 Colleges Directory Page (`/colleges` & `/colleges/:collegeSlug`)
* **Purpose:** Directory of colleges and college profile pages.
* **Primary Users:** Students, TPOs, Recruiters.
* **Entry Point / Path:** "More" dropdown -> "Colleges".
* **Actions Available:** Register departments, manage staff, view batch listings.
* **Information Displayed:** College catalog, department lists, student enrollment directories, current placement statistics.
* **Dependencies / Connected APIs:** `GET /api/colleges`, `GET /api/colleges/:slug`.
* **Role Restrictions:** Administrative options visible only to authorized College Admins/TPOs.
* **User Goal:** Manage college profiles or browse student batches.

---

### 4.13 Placement Dashboard Page (`/placements`)
* **Purpose:** Student placements dashboard.
* **Primary Users:** Students.
* **Entry Point / Path:** Profile dropdown -> "Placements Dashboard".
* **Actions Available:** View invitation requests, apply for drive slots, check round evaluation schedules.
* **Information Displayed:** Application statuses (Screening, Coding Round, HR Interview) and current placement status.
* **Dependencies / Connected APIs:** `GET /api/placement-drives/applications`.
* **Role Restrictions:** Only users with `STUDENT` role.
* **User Goal:** Track active placement applications and prepare for rounds.

---

### 4.14 Recruiter Console Page (`/recruiter`)
* **Purpose:** Recruiters dashboard.
* **Primary Users:** Recruiters.
* **Entry Point / Path:** Profile dropdown -> "Recruiter Console" or sidebar tab.
* **Actions Available:** View applicant pipelines, search Resdex, post job listings, initiate campus placement drives.
* **Information Displayed:** Active openings, applicant funnel charts, pending drive invitations.
* **Dependencies / Connected APIs:** `GET /api/recruiters/dashboard`.
* **Role Restrictions:** `RECRUITER` role only.
* **User Goal:** Source candidates, manage jobs, and coordinate interviews.

---

### 4.15 Recruiter Drive Page (`/recruiter/drive/:driveId`)
* **Purpose:** Placement drive candidate selection dashboard.
* **Primary Users:** Recruiters.
* **Entry Point / Path:** Recruiter Console -> Click Placement Drive.
* **Actions Available:** Review student profiles, move candidates to round shortlists, record round evaluation scores.
* **Information Displayed:** Round timelines, candidate tables with shortlists.
* **Dependencies / Connected APIs:** `GET /api/placement-drives/:id`.
* **Role Restrictions:** Only verified Recruiters assigned to the drive.
* **User Goal:** Manage placement rounds and select candidates.

---

### 4.16 TPO Dashboard Page (`/tpo-dashboard`)
* **Purpose:** Placement officer placement drive console.
* **Primary Users:** TPOs, CDCR Members.
* **Entry Point / Path:** Profile dropdown -> "TPO Console".
* **Actions Available:** Create placement drive, invite company recruiters, verify student eligibility, approve CDCR student coordinators.
* **Information Displayed:** College placement metrics, drive calendars, applicant lists.
* **Dependencies / Connected APIs:** `GET /api/tpo/dashboard`.
* **Role Restrictions:** `TPO` or `COLLEGE_ADMIN` roles only.
* **User Goal:** Coordinate campus drives and track student placement rates.

---

### 4.17 Business Onboarding Page (`/business`)
* **Purpose:** Onboards new colleges and company pages.
* **Primary Users:** New TPOs, Company Admins, College Admins.
* **Entry Point / Path:** Top nav header button "Business".
* **Actions Available:** Register a College, Claim/Register a Company, upload verification documents.
* **Information Displayed:** Multi-step onboarding forms.
* **Dependencies / Connected APIs:** `POST /api/colleges/request`, `POST /api/companies/request`.
* **Role Restrictions:** Authenticated users.
* **User Goal:** Setup college portal or claim company profile page.

---

### 4.18 Company Admin Page (`/companies/:companySlug/admin`)
* **Purpose:** Corporate profile administration panel.
* **Primary Users:** Company Admins.
* **Entry Point / Path:** Profile dropdown -> "Company Console".
* **Actions Available:** Update company profile details, verify recruiters, manage office branch configurations.
* **Information Displayed:** Company details, recruiter registration logs.
* **Dependencies / Connected APIs:** `GET /api/companies/:slug/admin`.
* **Role Restrictions:** Verified `COMPANY_ADMIN` only.
* **User Goal:** Verify recruiters and manage company page details.

---

### 4.19 Super Admin Console Page (`/admin`)
* **Purpose:** Platform administration portal.
* **Primary Users:** Super Admins, Platform Admins.
* **Entry Point / Path:** Profile dropdown -> "Super Admin Console".
* **Actions Available:** Onboard colleges, approve company claims, moderate reports, view system metrics.
* **Information Displayed:** Tabbed panels: Overview, Onboarding Requests, Moderation, Users, Companies, Colleges, Jobs, Hackathons.
* **Dependencies / Connected APIs:** `GET /api/admin/metrics`, `POST /api/admin/approve`.
* **Role Restrictions:** `SUPER_ADMIN` or `PLATFORM_ADMIN` roles only.
* **User Goal:** Monitor platform health and resolve administrative reviews.

---

### 4.20 Reputation Catalog Page (`/reputation`)
* **Purpose:** Gamification portal and badge display screen.
* **Primary Users:** Students.
* **Entry Point / Path:** Profile dropdown -> "Unlocked Badges Catalog".
* **Actions Available:** View unlocked badges, review badge criteria, check leaderboard standing.
* **Information Displayed:** Unlocked badges, leaderboard, achievements checklists.
* **Dependencies / Connected APIs:** `GET /api/reputation/score`, `GET /api/reputation/leaderboard`.
* **Role Restrictions:** Authenticated users.
* **User Goal:** Monitor achievements and track reputation scores.

---

### 4.21 Referrals Center Page (`/referrals`)
* **Purpose:** Secure professional referrals for open job listings.
* **Primary Users:** Students, Professionals.
* **Entry Point / Path:** Header -> "Referrals".
* **Actions Available:** Request referrals for specific jobs; view incoming referral requests.
* **Information Displayed:** List of referral requests.
* **Dependencies / Connected APIs:** `GET /api/referrals`.
* **Role Restrictions:** Authenticated users.
* **User Goal:** Request or grant job referrals.

---

### 4.22 Interviews Hub Page (`/interviews`)
* **Purpose:** Mock interview preparation library.
* **Primary Users:** Students, Professionals.
* **Entry Point / Path:** "More" dropdown -> "Interviews".
* **Actions Available:** Browse preparation resources, save interview resources, join live WebRTC interview rooms.
* **Information Displayed:** Guides, active room lists, preparation resources.
* **Dependencies / Connected APIs:** `GET /api/interviews`.
* **Role Restrictions:** None.
* **User Goal:** Practice mock interviews and access resources.

---

### 4.23 Events Page (`/events`)
* **Purpose:** Discover webinars, hackathons, and campus coding contests.
* **Primary Users:** All users.
* **Entry Point / Path:** "More" dropdown -> "Events".
* **Actions Available:** Browse events, RSVP, save event details.
* **Information Displayed:** Grid of active events.
* **Dependencies / Connected APIs:** `GET /api/events`, `POST /api/events/:id/rsvp`.
* **Role Restrictions:** RSVPs require login.
* **User Goal:** Discover and register for events.

---

### 4.24 Social/Network Page (`/social`)
* **Purpose:** Connection request management and network builder.
* **Primary Users:** All authenticated users.
* **Entry Point / Path:** Header -> "Network".
* **Actions Available:** Approve connection requests, withdraw requests, find connection recommendations.
* **Information Displayed:** Grid of current connections, pending connection logs, connection recommendations.
* **Dependencies / Connected APIs:** `GET /api/social/connections`.
* **Role Restrictions:** Authenticated users.
* **User Goal:** Manage connection network.

---

### 4.25 Communities Page (`/communities` & `/communities/:communitySlug`)
* **Purpose:** Browse interest groups and campus communities.
* **Primary Users:** All users.
* **Entry Point / Path:** "More" dropdown -> "Communities".
* **Actions Available:** Join community, post updates, browse community threads.
* **Information Displayed:** Community card grids, member counts, community feed.
* **Dependencies / Connected APIs:** `GET /api/communities`, `GET /api/communities/:slug`.
* **Role Restrictions:** None for public communities; posting requires membership.
* **User Goal:** Connect and share updates in interest groups.

---

### 4.26 Notifications Page (`/notifications`)
* **Purpose:** Notification history list.
* **Primary Users:** Authenticated users.
* **Entry Point / Path:** Notification Bell -> "View All".
* **Actions Available:** Clear notifications, mark as read, click notifications to redirect to source pages.
* **Information Displayed:** Timeline list of notifications.
* **Dependencies / Connected APIs:** `GET /api/notifications`.
* **Role Restrictions:** Authenticated users.
* **User Goal:** Review and clear notification alerts.

---

### 4.27 Public Batch Page (`/colleges/:collegeSlug/batch/:graduationYear`)
* **Purpose:** Public graduation yearbook list of students.
* **Primary Users:** Recruiters, Students.
* **Entry Point / Path:** College profile -> Click graduation batch.
* **Actions Available:** Filter students by department, click candidate profiles.
* **Information Displayed:** Year, department filters, list of students.
* **Dependencies / Connected APIs:** `GET /api/colleges/:slug/batch/:year`.
* **Role Restrictions:** None.
* **User Goal:** Browse graduates of a university batch.

---

### 4.28 Business Onboarding Success / Status Panels
* **Purpose:** Track verification statuses for newly registered companies/colleges.
* **Primary Users:** Onboarding users.
* **Entry Point / Path:** Business Page -> Click status tracking.
* **Actions Available:** Upload supplementary files.
* **Information Displayed:** Verification checklist, verification status (Pending, Under Review, Approved).
* **Dependencies / Connected APIs:** `GET /api/colleges/request/:id`.
* **Role Restrictions:** Onboarding users.
* **User Goal:** Complete verification steps.

---

## 5. Information Architecture & Navigation

```
                                  [App Header]
                                        |
       +--------------------+-----------+-----------+--------------------+
       |                    |                       |                    |
   [Home Feed]          [Discover]               [Network]            [Jobs]
   (/feed)              (/discover)              (/social)            (/jobs)
       |                    |                       |                    |
   [Posts]              [Recommendations]        [Connections]        [Applications]
                        |                       |
                 +------+------+                |
                 |             |                |
             [Projects]    [Hackathons]         v
             (/projects)   (/hackathons)   [Chats] (/chat)
```

### 5.1 Main Sidebar / Dropdown Organization
* **Pinned Top Nav:** Fast access to everyday channels (`Home`, `Discover`, `Network`, `Referrals`, `Chats`, `Jobs`).
* **Secondary Nav (More Menu):** Segmented developer channels (`Projects`, `Hackathons`, `Interviews`, `Events`, `Communities`, `Teams`, `Colleges`, `Companies`, `Reputation`).
* **Role-based Profile Dropdown Options:** Conditionally links to dashboards: `Placements Dashboard` (Student), `Recruiter Console` (Recruiter), `TPO Console` (College TPO), `Super Admin Console` (Super Admin).
* **Mobile Navbar:** Fixed bottom tab bar exposing five key entry routes: `Home`, `Discover`, `Jobs`, `Chats`, `Profile`.

---

## 6. Feature Discoverability

### 6.1 Instantly Discoverable Features
* **Feed & Posting:** Center feed with formatting input block.
* **Job Board:** Simple list view.
* **Discover Swipes:** Visually prominent carousels.

### 6.2 Buried / Hidden Features
* **Resume Parse Upload:** Embedded within settings in the profile page rather than shown as a primary call to action (CTA).
* **Mock Interview Rooms:** Accessed via `/interviews`, which is placed under the "More" dropdown menu.
* **Company Page Claiming:** Placed under `/business` (Business link in header), which is not immediately clear to recruiters trying to claim a page.

---

## 7. Dashboard Diagnostics

```
+-----------------------------------------------------------------------------------+
|                            TPO PLACEMENT DASHBOARD                                |
+-----------------------------------------------------------------------------------+
|  [STATS] Placed Ratio: 78% | Drive Count: 14 | Active Recruiter Slots: 4          |
+-----------------------------------------------------------------------------------+
|  [INVITES PANEL]                                                                  |
|  - Google (Accepted) | Stripe (Pending) | Meta (Rejected)                         |
+-----------------------------------------------------------------------------------+
|  [ACTIVE DRIVES]                                                                  |
|  - Stripe Campus Drive 2026 -> [Manage Rounds] -> [Filter Eligibility]             |
+-----------------------------------------------------------------------------------+
```

### 7.1 Student Placements Dashboard (`/placements`)
* **Widget priority:**
  1. Active applications status tracker step-wizard.
  2. Incoming drive invitation requests checklist.
  3. Upcoming interview schedules.

### 7.2 Recruiter Console (`/recruiter`)
* **Widget priority:**
  1. Applicant pipeline stage stats (Screening, Interview, Offer).
  2. Resdex Quick search input.
  3. Active hiring programs lists.

### 7.3 TPO Console (`/tpo-dashboard`)
* **Widget priority:**
  1. Placement ratios and metrics charts.
  2. Campus drive invites management logs.
  3. CDCR authorizations checklist.

### 7.4 Super Admin Panel (`/admin`)
* **Widget priority:**
  1. Overview stats (Users, Colleges, Claims counts).
  2. College onboarding approval queue.
  3. Flagged content moderation panel.

---

## 8. Screen & Feature Relationship Maps

### 8.1 Projects & Portfolio Flow
```
[Discover / Feed] -> [Project Card] -> [Project Details Modal]
                                             |
                                             v
[Profile View] <- [Contributor Link] <- [GitHub Repository link]
```

### 8.2 Placements Coordination Flow
```
[TPO Dashboard] -> [Create Placement Drive] -> [Invite Companies]
                                                      |
                                                      v
[Round Shortlists] <- [Student Application Queue] <- [Publish Eligibility Filters]
```

---

## 9. Design System & UX Analysis

* **Theme Consistency:** The layout cleanly respects dark mode parameters via tailwind classes (`dark:bg-slate-900`, `dark:text-slate-100`).
* **Forms & CTAs:** Input fields use a standard styling block (`field`), and buttons are styled with standard sizes (`btn-primary`, `btn-secondary`).
* **Loading States:** Uses skeleton loader elements (shimmer state skeletons) on the feed and job search screens to prevent layout shifting during data fetching.
* **Empty States:** Features like Communities and Social lists display placeholder cards and illustration assets when lists are empty.
* **Dead Ends (Not Implemented):**
  * **Interviews Code Editor:** Visual code changes in mock rooms are cached but not automatically saved to projects.
  * **Event Ticket Downloads:** RSVPing generates success states but has **no ticket generation or calendar download (.ics) implementation**.

---

## 10. Founder Vision Extraction

Based on the frontend experience:
1. **The Core Product is Placements:** The TPO Dashboard, Placements Dashboard, Recruiter Consoles, and Drive Rounds shortlists are highly customized, suggesting this is a core business feature.
2. **Technical Portfolio Validation is the Key Value:** GitHub commit synchronizers, verified checkmark badges, and engineering scores are displayed prominently across profiles to build developer credibility.
3. **Daily Engagement Loop:** Users are expected to post updates on the Feed, solve challenges, and manage messaging conversations.
4. **Hiring is Targeted:** The Resdex search and Placement Drive matching engines are designed to optimize corporate candidate searches.
