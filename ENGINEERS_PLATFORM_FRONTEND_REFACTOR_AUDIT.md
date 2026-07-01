# ENGINEERS PLATFORM — FRONTEND REFACTOR AUDIT
### Implementation Audit & Execution Roadmap

**Classification:** Engineering Execution Document  
**Status:** APPROVED FOR IMPLEMENTATION  
**Version:** 1.0 — Final  
**Audit Scope:** Full `client/src` codebase  
**Date:** 2026-07-01  
**Frozen Architecture Sources:** DSS (V3), NRS (V3.5), UI Screen Bible, IAW, Component Library Bible, Consistency Audit

---

## TABLE OF CONTENTS

```
SECTION 1  — Audit Methodology
SECTION 2  — Frontend Inventory (Complete File Register)
SECTION 3  — Architecture Assessment
SECTION 4  — Design System Compliance Audit
SECTION 5  — TypeScript Health Audit
SECTION 6  — Component Reuse Matrix
SECTION 7  — Page Complexity & Size Classification
SECTION 8  — State Management Audit
SECTION 9  — Data Fetching Layer Audit
SECTION 10 — Routing & Guard Audit
SECTION 11 — Performance Audit
SECTION 12 — Code Splitting Audit
SECTION 13 — Spring Cleaning List (Delete / Consolidate / Move)
SECTION 14 — Violations Register (Indexed)
SECTION 15 — Sprint Execution Plan (12 Sprints)
SECTION 16 — Implementation Rules (120 Rules)
APPENDIX A — Codebase Metrics
APPENDIX B — Dependency Inventory
APPENDIX C — Decision Log
```

---

## SECTION 1 — AUDIT METHODOLOGY

### 1.1 Scope

This audit covers every file under `client/src` as it exists at the time of the audit. The audit references the following frozen architecture sources to validate compliance:

| Source | Status |
|---|---|
| Design System Specification (DSS) | FROZEN |
| Navigation & Routing Specification (NRS) | FROZEN |
| UI Screen Bible | FROZEN |
| Information Architecture Wireframes (IAW) | FROZEN |
| Component Library Bible (CLB) | FROZEN |
| Architecture Consistency Audit | FROZEN |
| Product Blueprint (V1) | FROZEN |
| Experience Architecture (V2) | FROZEN |

### 1.2 Audit Dimensions

Each file in the frontend was evaluated across the following dimensions:

1. **Design system compliance** — Does it use CSS tokens and component classes from `index.css`?
2. **TypeScript health** — Does it use `any`, bypass types, or lack proper interfaces?
3. **Component size** — Is it too large to maintain? Does it need decomposition?
4. **State management** — Is local state appropriate, or does it need to be lifted/shared?
5. **Data fetching** — Does it use the established `usePlatformQueries` pattern?
6. **Reusability** — Is logic duplicated across pages?
7. **Performance** — Are heavy operations memoised? Are large bundles code-split?
8. **Routing compliance** — Does it match the NRS route table exactly?
9. **Role guard accuracy** — Are role checks correct and consistent?

### 1.3 Severity Scale

| Level | Label | Description |
|---|---|---|
| SEV-1 | CRITICAL | Blocks production quality. Must fix before any release. |
| SEV-2 | HIGH | Degrades maintainability or design system integrity. Fix in sprint. |
| SEV-3 | MEDIUM | Technical debt. Fix in planned refactor. |
| SEV-4 | LOW | Code smell. Fix opportunistically. |
| INFO | INFO | Observation. No action required but worth noting. |

---

## SECTION 2 — FRONTEND INVENTORY (COMPLETE FILE REGISTER)

### 2.1 Root Files

| File | Size | Role |
|---|---|---|
| `src/main.tsx` | 437 B | App entry point — React 19 root render |
| `src/App.tsx` | 12.7 KB | Route tree, auth guards, app shell |
| `src/index.css` | 9.0 KB | Design token system, component layer, utility layer |
| `src/vite-env.d.ts` | 39 B | Vite env type shim |

### 2.2 Layout

| File | Size | Role |
|---|---|---|
| `src/layout/AppLayout.tsx` | 30.4 KB | Shell: sidebar nav, topbar, mobile nav, notifications, profile dropdown |

### 2.3 Pages (28 files)

| File | Size (KB) | Role | Auth Guard |
|---|---|---|---|
| `AuthPage.tsx` | 19.1 | Login + register (tabs) | PublicOnly |
| `FeedPage.tsx` | 36.9 | Social feed | None |
| `DiscoverPage.tsx` | 28.7 | Discovery cards grid | None |
| `SearchResultsPage.tsx` | 22.7 | Global search results | RequireAuth |
| `ProfilePage.tsx` | 104.9 | Own profile + edit | RequireAuth |
| `UserProfilePage.tsx` | 40.7 | Public user profile view | RequireAuth |
| `PublicBatchPage.tsx` | 15.1 | College batch alumni roster | None |
| `JobsPage.tsx` | 80.2 | Jobs board + recruiter view + drives | None |
| `InterviewsPage.tsx` | 11.8 | Interview resources | None |
| `HackathonsPage.tsx` | 53.0 | Hackathon list + detail | None |
| `EventsPage.tsx` | 18.4 | Events list + RSVP | RequireAuth |
| `ProjectsPage.tsx` | 36.8 | Projects list + detail | None |
| `TeamsPage.tsx` | 35.9 | Teams list + detail | RequireAuth |
| `CommunitiesPage.tsx` | 70.0 | Communities list + detail | Mixed |
| `CollegesPage.tsx` | 90.4 | Colleges list + detail + placement ops | None |
| `CompaniesPage.tsx` | 49.9 | Companies list + detail | None |
| `ChatPage.tsx` | 59.3 | Full messaging UI | RequireAuth |
| `SocialPage.tsx` | 16.6 | Connections + followers | RequireAuth |
| `ReferralsPage.tsx` | 16.7 | Referrals sent/received | RequireAuth |
| `ReputationPage.tsx` | 11.5 | Reputation score + leaderboard | RequireAuth |
| `PlacementDashboardPage.tsx` | 23.5 | Student placement tracker | RequireAuth |
| `NotificationsPage.tsx` | 24.4 | Full notifications list | RequireAuth |
| `RecruiterPage.tsx` | 63.8 | Recruiter dashboard | RequireAuth+RequireRecruiter |
| `RecruiterDrivePage.tsx` | 20.6 | Drive detail (recruiter) | RequireAuth+RequireRecruiter |
| `TpoDashboardPage.tsx` | 62.7 | TPO operations dashboard | RequireAuth+RequireTpo |
| `BusinessOnboardingPage.tsx` | 55.0 | Business/recruiter onboarding | RequireAuth |
| `CompanyAdminPage.tsx` | 73.0 | Company admin panel | RequireAuth |
| `AdminPage.tsx` | 15.4 | Platform admin panel shell | RequirePlatformAdmin |

### 2.4 Admin Panels (15 files under `pages/AdminPages/`)

| File | Size (KB) | Role |
|---|---|---|
| `OverviewPanel.tsx` | 17.6 | Platform-wide metrics |
| `UsersPanel.tsx` | 13.6 | User search + role assignment |
| `CollegesPanel.tsx` | 28.6 | College CRUD + admin assignment |
| `CompaniesPanel.tsx` | 22.9 | Company CRUD + admin ops |
| `CompanyRequestsPanel.tsx` | 11.2 | Company verification queue |
| `DiscoveredCompaniesPanel.tsx` | 16.4 | Scraped company management |
| `JobsPanel.tsx` | 49.7 | Job moderation |
| `HackathonsPanel.tsx` | 19.8 | Hackathon CRUD |
| `EventsPanel.tsx` | 31.9 | Event CRUD |
| `InterviewPanel.tsx` | 11.9 | Interview resource CRUD |
| `CommunitiesPanel.tsx` | 5.3 | Community moderation |
| `ModerationPanel.tsx` | 13.4 | Post/content moderation |
| `OnboardingRequestsPanel.tsx` | 20.3 | Recruiter onboarding queue |
| `ReferralsPanel.tsx` | 3.2 | Referral oversight |
| `shared.tsx` | 12.5 | Shared admin UI primitives |

### 2.5 Components

#### `components/ui/`
| File | Size | Role |
|---|---|---|
| `ConfirmDialog.tsx` | 3.0 KB | Generic confirm dialog |

#### `components/ui.tsx` (single file — multiple exports)
| Export | Role |
|---|---|
| `Metric` | Numeric stat display |
| `Avatar` | User photo or initials |
| `EmptyState` | Empty/zero-state card |
| `InlineLoader` | Small spinner |
| `PageLoader` | Full-screen loading card |
| `ErrorState` | Error card with retry |
| `SkeletonBlock` | Generic shimmer block |
| `FeedCardSkeleton` | Feed card shimmer |
| `AppErrorBoundary` | Class-based error boundary |

#### `components/cards/`
| File | Size | Role |
|---|---|---|
| `FeedCard.tsx` | 12.3 KB | Feed post card (rich content) |
| `CompanyFeedCard.tsx` | 4.9 KB | Company-sourced post card |
| `HackathonCard.tsx` | 16.5 KB | Hackathon list card |
| `ProfileCards.tsx` | 21.2 KB | EducationCard, ExperienceCard, ProjectCard, CodingProfileCard |
| `ProjectCard.tsx` | 5.2 KB | Project list card |
| `SocialCards.tsx` | 11.6 KB | Follow/Connection/Mutual cards |

#### `components/forms/`
| File | Size | Role |
|---|---|---|
| `ComposePost.tsx` | 4.3 KB | Post composer |
| `CreateProjectForm.tsx` | 5.7 KB | New project modal form |
| `ExternalApplyModal.tsx` | 5.8 KB | External job application tracker |
| `JobPostModal.tsx` | 14.7 KB | Job posting form (recruiters) |
| `RequestReferralModal.tsx` | 9.0 KB | Referral request form |

#### `components/interviews/`
| File | Size | Role |
|---|---|---|
| `InterviewCardSkeleton.tsx` | 1.0 KB | Interview card shimmer |
| `InterviewFilterPanel.tsx` | 9.7 KB | Filter sidebar for interviews |
| `InterviewResourceCard.tsx` | 7.0 KB | Single interview resource card |
| `InterviewVideoModal.tsx` | 7.4 KB | Video resource modal |

#### `components/jobs/`
| File | Size | Role |
|---|---|---|
| `ApplicationKanbanBoard.tsx` | 12.7 KB | Student job application kanban |
| `CreateDriveModal.tsx` | 19.0 KB | Placement drive creation form |
| `DriveApplicantsModal.tsx` | 38.3 KB | Drive applicants list + round management |
| `DriveInviteModal.tsx` | 17.7 KB | Invite companies to drive |
| `PlacementDrivesTab.tsx` | 23.2 KB | Campus drives tab (JobsPage) |
| `TpoInviteCompanyModal.tsx` | 16.0 KB | TPO invite company to drive |

#### `components/recruiter/`
| File | Size | Role |
|---|---|---|
| `KanbanPipeline.tsx` | 30.6 KB | Recruiter hiring pipeline kanban |

#### `components/notifications/`
| File | Size | Role |
|---|---|---|
| `NotificationCenter.tsx` | 8.6 KB | Bell button + notification preview dropdown |

### 2.6 Hooks

| File | Size | Role |
|---|---|---|
| `usePlatformQueries.ts` | 182.7 KB | ALL server-state queries + mutations |
| `useChatSocket.ts` | 8.6 KB | WebSocket client for chat |
| `useNotificationSocket.ts` | 2.5 KB | WebSocket client for notifications |
| `useImpressionTracking.ts` | 1.3 KB | Intersection-observer impression hook |
| `usePlatformQueries.test.tsx` | 29.3 KB | Unit tests for queries |

### 2.7 Core Layer

| File | Size | Role |
|---|---|---|
| `core/api/client.ts` | 2.9 KB | HTTP request client, error handling |
| `core/contexts/AuthContext.tsx` | 5.5 KB | Global auth state + login/logout |
| `core/contexts/ToastContext.tsx` | 5.3 KB | Global toast notification system |
| `core/types/models.ts` | 38.7 KB | ALL domain type definitions |
| `core/utils/format.ts` | 8.9 KB | Utility functions (format, parse) |
| `core/utils/storage.ts` | 1.2 KB | localStorage token management |

### 2.8 Lib Layer

| File | Size | Role |
|---|---|---|
| `lib/api.ts` | 58.7 KB | API client — re-exports models + aggregates feature APIs |
| `lib/queryKeys.ts` | 9.2 KB | Centralised TanStack Query key factory |
| `lib/queryClient.ts` | 307 B | QueryClient singleton |
| `lib/types.ts` | 1.9 KB | Additional frontend-only types |

### 2.9 Feature Slices

| File | Role |
|---|---|
| `features/auth/services/auth.api.ts` | Auth API calls (login, register, logout) |
| `features/jobs/services/jobs.api.ts` | Jobs + placement drives API calls |
| `features/jobs/components/JobCard.tsx` | Job list card component |
| `features/jobs/components/JobDetailModal.tsx` | Job detail expand modal |
| `features/storage/services/storage.api.ts` | File upload API calls |
| `features/storage/hooks/useFileUpload.ts` | File upload hook |

### 2.10 Config Files

| File | Role |
|---|---|
| `tailwind.config.js` | Tailwind 3.x — brand palette, shadows, animations, keyframes |
| `tsconfig.json` | TypeScript config |
| `vite.config.ts` | Vite config |
| `eslint.config.js` | ESLint config |
| `postcss.config.js` | PostCSS config |

---

## SECTION 3 — ARCHITECTURE ASSESSMENT

### 3.1 What Exists

The current frontend is a **single-SPA Vite + React 19 application** with the following architectural layers:

```
App.tsx (Route Tree + Auth Guards)
    └── AppLayout.tsx (Shell + Navigation)
           └── [28 Page Components]
                    └── [Shared Components]
                    └── [Feature Components]
                    └── [usePlatformQueries] → [lib/api.ts] → [core/api/client.ts]
                    └── [Contexts: Auth, Toast]
```

### 3.2 Architectural Strengths

| Strength | Evidence |
|---|---|
| Centralised design token system | `index.css` — full CSS custom property system for light and dark mode |
| Single query hook file | `usePlatformQueries.ts` — all server state in one file, consistent pattern |
| Structured query key factory | `queryKeys.ts` — all query keys co-located, prevents key collisions |
| Clean auth flow | `AuthContext.tsx` — health check, token refresh, tab synchronisation |
| Dark mode via CSS class | `tailwind.config.js darkMode: "class"` — `DarkModeSync` in App.tsx |
| Route-level page transitions | `PageTransitionWrapper` — unified fade-up entry animation |
| Socket lifecycle management | `useChatSocket.ts` / `useNotificationSocket.ts` — auth-aware socket connect/disconnect |
| Error boundary | `AppErrorBoundary` in `ui.tsx` — catches render errors at the app root |

### 3.3 Architectural Weaknesses

| Weakness | Severity | Section |
|---|---|---|
| `usePlatformQueries.ts` is 182 KB in a single file | SEV-2 | 9.1 |
| `lib/api.ts` is 58 KB — monolithic API client | SEV-2 | 9.2 |
| 17 pages exceed 20 KB — no internal decomposition | SEV-2 | 7.1 |
| Zero code splitting (`React.lazy`) except FeedPage | SEV-2 | 12.1 |
| Role permission logic duplicated in every file that needs it | SEV-2 | 10.3 |
| `any` type used in all 41 page files | SEV-2 | 5.1 |
| Hardcoded hex colours bypass design token system | SEV-2 | 4.1 |
| `STATUS_CHIP_CLASSES` only used in 2 files — not adopted platform-wide | SEV-3 | 4.2 |
| `features/` slice pattern is partially implemented — only auth/jobs/storage | SEV-3 | 3.4 |
| No global error handling for failed mutations | SEV-3 | 9.3 |

### 3.4 Feature Slice Architecture (Partially Implemented)

The `features/` directory exists but is only populated for three slices:

```
features/
  auth/services/auth.api.ts          ✅ implemented
  jobs/services/jobs.api.ts          ✅ implemented
  jobs/components/JobCard.tsx        ✅ implemented
  jobs/components/JobDetailModal.tsx ✅ implemented
  storage/services/storage.api.ts    ✅ implemented
  storage/hooks/useFileUpload.ts     ✅ implemented
```

All other domain modules — `chat/`, `profile/`, `feed/`, `communities/`, `colleges/`, `companies/`, `hackathons/`, `events/`, `teams/`, `recruiter/`, `admin/` — do **not** have feature slices.

**Implication for refactor:** The refactor should expand this feature slice pattern to all domains. Currently, domain-specific logic lives inside monolithic page files.

---

## SECTION 4 — DESIGN SYSTEM COMPLIANCE AUDIT

### 4.1 Hardcoded Colour Violations

The following files contain hardcoded hex colour values that bypass the CSS token system defined in `index.css`.

| File | Line | Violation | Correct Token |
|---|---|---|---|
| `BusinessOnboardingPage.tsx` | 350 | `bg-[#0f0e2e]` | `var(--bg-surface)` or `bg-surface` |
| `BusinessOnboardingPage.tsx` | 376 | `hover:bg-[#11102a]/30` | `hover:bg-surface-3/30` |
| `BusinessOnboardingPage.tsx` | 400 | `hover:bg-[#161a35]/30` | `hover:bg-surface-3/30` |
| `BusinessOnboardingPage.tsx` | 424 | `hover:bg-[#0e2133]/30` | `hover:bg-surface-3/30` |
| `ToastContext.tsx` | 35 | `dark:bg-[#0e0d1f]` | `dark:bg-surface` via token |
| `ToastContext.tsx` | 43 | `dark:bg-[#1f0d0d]` | Semantic danger dark surface token |
| `ToastContext.tsx` | 51 | `dark:bg-[#1f1a0d]` | Semantic warning dark surface token |
| `ToastContext.tsx` | 59 | `dark:bg-[#0d1520]` | Semantic info dark surface token |
| `JobsPage.tsx` | 1138 | `style={{ color: "#3b82f6" }}` | `var(--brand)` or `text-brand` |
| `FeedPage.tsx` | 678 | `style={{ color: "#f59e0b" }}` | `var(--color-warning)` — missing token |

**Action:** All hardcoded hex values must be replaced with CSS custom property tokens. The `ToastContext.tsx` violations require adding semantic surface tokens (`--bg-surface-danger`, `--bg-surface-warning`, `--bg-surface-info`) to `index.css`.

### 4.2 Component Class Adoption

The DSS defines the following component classes in `index.css`:

| Class | Definition Location | Pages Using It | Pages Missing It |
|---|---|---|---|
| `.panel` | `index.css:201` | Most pages | `BusinessOnboardingPage.tsx` (uses ad-hoc `rounded-2xl border`) |
| `.glass` | `index.css:211` | `AppLayout`, `PageLoader` | Should be used in modal overlays |
| `.field` | `index.css:221` | Most forms | Some inline inputs not using it |
| `.btn-primary` | `index.css:238` | Most pages | Some inline `className` button overrides |
| `.btn-secondary` | `index.css:253` | Most pages | Inconsistent in admin panels |
| `.icon-btn` | `index.css:270` | `AppLayout`, some pages | Not consistently used in all icon actions |
| `.chip` | `index.css:284` | Used directly | Status chips often use ad-hoc classes |
| `.skeleton` | `index.css:292` | Via `SkeletonBlock` | Correct — all skeletons go through `SkeletonBlock` |
| `.page-enter` | `index.css:303` | `PageTransitionWrapper` | Correct — all pages wrapped |

### 4.3 STATUS_CHIP_CLASSES Token Non-Adoption

`STATUS_CHIP_CLASSES` is defined in `core/utils/format.ts` and used only in:
- `HackathonsPage.tsx`
- `components/cards/HackathonCard.tsx`

It is **not used** in:
- `AdminPages/JobsPanel.tsx` — uses ad-hoc status colours inline
- `CollegesPage.tsx` — uses ad-hoc status badges
- `RecruiterPage.tsx` — drive status rendered inline
- `TpoDashboardPage.tsx` — invite status rendered inline

**Action:** `STATUS_CHIP_CLASSES` must be extended to cover all drive/job/event/hackathon status variants and adopted uniformly.

### 4.4 Dark Mode Compliance

The CSS token system correctly handles dark mode via the `.dark` class on `<html>`. The `DarkModeSync` component in `App.tsx` applies `dark` based on `prefers-color-scheme`. However, the following issues exist:

| Issue | Location | Severity |
|---|---|---|
| Hardcoded dark background values in `ToastContext` bypass token system | `ToastContext.tsx:35,43,51,59` | SEV-2 |
| `BusinessOnboardingPage` uses hardcoded near-black hex values that only work in dark context | `BusinessOnboardingPage.tsx:350,376,400,424` | SEV-2 |
| User has no manual toggle to override OS preference | `App.tsx` — only OS sync | SEV-4 (DSS states OS sync only; no manual toggle in spec) |

### 4.5 Animation System Compliance

The `tailwind.config.js` defines the full animation library. Animations in use:

| Animation | Used Where |
|---|---|
| `fade-in` | Available — minimal direct use |
| `fade-up` | `page-enter` class → all page transitions |
| `slide-in-right` | `AppLayout` notification panel |
| `slide-in-up` | Modal overlays (some) |
| `shimmer` | All `SkeletonBlock` elements |
| `toast-in` / `toast-out` | `ToastContext` |
| `scale-in` | `PageLoader` |

No animation violations found. All custom animations are defined in `tailwind.config.js`.

---

## SECTION 5 — TYPESCRIPT HEALTH AUDIT

### 5.1 `any` Type Usage

All 41 page-level `.tsx` files contain at least one use of `any`. This is the highest-impact TypeScript hygiene issue in the codebase.

The most frequent pattern is role checking:

```typescript
// Pattern found in App.tsx, AppLayout.tsx, CollegesPage.tsx, etc.
user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN")
```

This occurs because the `User.roles` type in `models.ts` is defined as:
```typescript
roles?: Array<{ role?: { name?: string } }>;
```

While this is technically typed, the `(ur: any)` cast is unnecessary — the array item is already typed. This is a misuse of `any` from copy-paste patterns.

**Full List of Files with `any` Usage (41 files):**
```
AdminPage.tsx, AdminPages/CollegesPanel.tsx, AdminPages/CommunitiesPanel.tsx,
AdminPages/CompaniesPanel.tsx, AdminPages/CompanyRequestsPanel.tsx,
AdminPages/DiscoveredCompaniesPanel.tsx, AdminPages/EventsPanel.tsx,
AdminPages/HackathonsPanel.tsx, AdminPages/InterviewPanel.tsx,
AdminPages/JobsPanel.tsx, AdminPages/ModerationPanel.tsx,
AdminPages/OnboardingRequestsPanel.tsx, AdminPages/OverviewPanel.tsx,
AdminPages/ReferralsPanel.tsx, AdminPages/shared.tsx,
AdminPages/UsersPanel.tsx, BusinessOnboardingPage.tsx, ChatPage.tsx,
CollegesPage.tsx, CommunitiesPage.tsx, CompaniesPage.tsx,
CompanyAdminPage.tsx, DiscoverPage.tsx, EventsPage.tsx,
FeedPage.tsx, HackathonsPage.tsx, InterviewsPage.tsx,
JobsPage.tsx, PlacementDashboardPage.tsx, ProfilePage.tsx,
ProjectsPage.tsx, PublicBatchPage.tsx, RecruiterDrivePage.tsx,
RecruiterPage.tsx, ReferralsPage.tsx, ReputationPage.tsx,
SearchResultsPage.tsx, SocialPage.tsx, TeamsPage.tsx,
TpoDashboardPage.tsx, UserProfilePage.tsx
```

### 5.2 Type Safety Issues in Role Checks

The role-checking helper functions use `any` casting on already-typed user objects:

| Location | Issue |
|---|---|
| `App.tsx:93` | `(ur: any)` on typed `roles[]` |
| `App.tsx:112` | `(ur: any)` on typed `roles[]` |
| `AppLayout.tsx:97` | `(ur: any)` on typed `roles[]` |
| `CollegesPage.tsx:41` | `isSuperOrPlatformAdmin(user: any)` — accepts `any` |
| `CollegesPage.tsx:47` | `isCollegeAdminFor(user: any, ...)` — accepts `any` |
| `TpoDashboardPage.tsx:56` | `(user as any)?.collegeAdminships` — unsafe cast |

### 5.3 Missing Generic Types

| Location | Issue |
|---|---|
| `usePlatformQueries.ts` | Some mutation payloads use `Record<string, any>` rather than typed interfaces |
| `lib/types.ts` | Only 2 custom frontend types — most types live in `models.ts` |

### 5.4 Positive TypeScript Patterns

| Pattern | Location |
|---|---|
| `ApiEnvelope<T>` generic wrapper | `core/types/models.ts:1` |
| Full domain type definitions | `core/types/models.ts` — 1737 lines |
| Typed query key factory | `queryKeys.ts` — all keys `as const` |
| Typed hook returns | `usePlatformQueries.ts` — all queries properly typed |

---

## SECTION 6 — COMPONENT REUSE MATRIX

### 6.1 Classification Key

| Code | Meaning |
|---|---|
| ✅ KEEP | Well-implemented, production-ready |
| 🔧 REFACTOR | Needs decomposition or cleanup |
| 📦 EXTRACT | Logic should be extracted to a shared component |
| 🗑️ DELETE | Obsolete or superseded |
| 🆕 CREATE | Missing component that the CLB requires |

### 6.2 Shared UI Components (`components/ui.tsx`)

| Component | Status | Notes |
|---|---|---|
| `Metric` | ✅ KEEP | Small, focused, well-typed |
| `Avatar` | ✅ KEEP | Correct fallback logic |
| `EmptyState` | ✅ KEEP | Correct use of icon + title + text |
| `InlineLoader` | ✅ KEEP | Token-compliant |
| `PageLoader` | ✅ KEEP | Double-ring animation |
| `ErrorState` | ✅ KEEP | Wraps EmptyState correctly |
| `SkeletonBlock` | ✅ KEEP | Token-compliant shimmer |
| `FeedCardSkeleton` | ✅ KEEP | Well-structured |
| `AppErrorBoundary` | ✅ KEEP | Class component required for error boundaries |
| `ConfirmDialog` | ✅ KEEP | Generic — move to `ui.tsx` exports |

### 6.3 Card Components

| Component | Status | Notes |
|---|---|---|
| `FeedCard.tsx` | 🔧 REFACTOR | 12 KB — complex, has `FeedCard`, `CompanyFeedCard`, and `ReactionBar` inline — extract sub-components |
| `CompanyFeedCard.tsx` | ✅ KEEP | Focused purpose |
| `HackathonCard.tsx` | 🔧 REFACTOR | 16.5 KB — inline status/tag logic should use `STATUS_CHIP_CLASSES` |
| `ProfileCards.tsx` | 🔧 REFACTOR | 21.2 KB — 4 different card components in one file — split into separate files |
| `ProjectCard.tsx` | ✅ KEEP | Small, focused |
| `SocialCards.tsx` | ✅ KEEP | Well-scoped |

### 6.4 Form Components

| Component | Status | Notes |
|---|---|---|
| `ComposePost.tsx` | ✅ KEEP | Focused, small |
| `CreateProjectForm.tsx` | ✅ KEEP | Acceptable size |
| `ExternalApplyModal.tsx` | ✅ KEEP | Focused |
| `JobPostModal.tsx` | 🔧 REFACTOR | 14.7 KB — form logic could use `react-hook-form` schema |
| `RequestReferralModal.tsx` | ✅ KEEP | Acceptable size |

### 6.5 Interview Components

| Component | Status | Notes |
|---|---|---|
| `InterviewCardSkeleton.tsx` | ✅ KEEP | Correct skeleton |
| `InterviewFilterPanel.tsx` | ✅ KEEP | Focused |
| `InterviewResourceCard.tsx` | ✅ KEEP | Focused |
| `InterviewVideoModal.tsx` | ✅ KEEP | Focused |

### 6.6 Jobs Components

| Component | Status | Notes |
|---|---|---|
| `ApplicationKanbanBoard.tsx` | ✅ KEEP | Student-facing kanban |
| `CreateDriveModal.tsx` | 🔧 REFACTOR | 19 KB — complex form, should use `react-hook-form` |
| `DriveApplicantsModal.tsx` | 🔧 REFACTOR | 38.3 KB — LARGEST component file — must be decomposed into sub-components |
| `DriveInviteModal.tsx` | 🔧 REFACTOR | 17.7 KB — complex invite flow |
| `PlacementDrivesTab.tsx` | 🔧 REFACTOR | drives tab logic could be a feature slice |
| `TpoInviteCompanyModal.tsx` | ✅ KEEP | Focused enough |

### 6.7 Recruiter Components

| Component | Status | Notes |
|---|---|---|
| `KanbanPipeline.tsx` | 🔧 REFACTOR | 30.6 KB — complex pipeline logic — needs column/card decomposition |

### 6.8 Missing Components (Required by CLB)

| Missing Component | Required By | Priority |
|---|---|---|
| `Badge` — semantic status badge | CLB + DSS | HIGH |
| `Modal` — generic modal shell (backdrop + close) | CLB | HIGH |
| `Drawer` — slide-out panel | CLB | MEDIUM |
| `Tabs` — generic tab component | CLB | HIGH |
| `FilterChip` — dismissible filter | CLB | HIGH |
| `SearchInput` — styled search field | CLB | HIGH |
| `StatCard` — metric card with icon | CLB | MEDIUM |
| `Timeline` — vertical activity feed | CLB | LOW |
| `RoleGuard` — component-level role check | CLB | HIGH |

---

## SECTION 7 — PAGE COMPLEXITY & SIZE CLASSIFICATION

### 7.1 Mega-Pages (> 50 KB) — Must Decompose

These pages contain embedded sub-pages, inline components, and full tab systems that should be extracted.

| Page | Size | Lines | Internal Tabs | Action |
|---|---|---|---|---|
| `ProfilePage.tsx` | 104.9 KB | 2608 | 6+ (Overview, Skills, Experience, Education, Projects, Settings) | CRITICAL DECOMPOSE |
| `CollegesPage.tsx` | 90.4 KB | 1610 | 5+ (List, Detail, Students, Placement, Alumni) | DECOMPOSE |
| `JobsPage.tsx` | 80.2 KB | 1713 | 6 (Explore, Recommended, Applications, Saved, Recruiter, Campus) | DECOMPOSE |
| `CompanyAdminPage.tsx` | 73.0 KB | ~1500 | 4+ (Overview, Jobs, Team, Settings) | DECOMPOSE |
| `CommunitiesPage.tsx` | 70.0 KB | ~1400 | 3+ (List, Detail, Members) | DECOMPOSE |
| `RecruiterPage.tsx` | 63.8 KB | 1199 | 5 (Claim, Jobs, Apps, Campus, Search) | DECOMPOSE |
| `TpoDashboardPage.tsx` | 62.7 KB | 1140 | 7 (Overview, Students, Placements, Invites, Alumni, Recruiters, Activity) | DECOMPOSE |
| `ChatPage.tsx` | 59.3 KB | 1491 | N/A (Full split-pane UI) | PARTIAL DECOMPOSE |
| `BusinessOnboardingPage.tsx` | 55.0 KB | ~1100 | 3 (Role selection, Company form, Recruiter form) | DECOMPOSE |
| `HackathonsPage.tsx` | 53.0 KB | ~1050 | 3 (List, Detail, Leaderboard) | DECOMPOSE |
| `CompaniesPage.tsx` | 49.9 KB | ~1000 | 3 (List, Detail, Jobs) | DECOMPOSE |

### 7.2 Large Pages (20–50 KB) — Refactor as Needed

| Page | Size | Action |
|---|---|---|
| `UserProfilePage.tsx` | 40.7 KB | Partial decompose — extract section components |
| `ProjectsPage.tsx` | 36.8 KB | Extract ProjectDetail as separate component |
| `FeedPage.tsx` | 36.9 KB | Extract sidebar widgets |
| `TeamsPage.tsx` | 35.9 KB | Extract TeamDetail |
| `NotificationsPage.tsx` | 24.4 KB | Acceptable, extract NotificationItem |
| `PlacementDashboardPage.tsx` | 23.5 KB | Acceptable, extract drive cards |
| `DiscoverPage.tsx` | 28.7 KB | Extract suggestion cards |
| `SearchResultsPage.tsx` | 22.7 KB | Extract result-type renderers |
| `RecruiterDrivePage.tsx` | 20.6 KB | Acceptable |

### 7.3 Well-Scoped Pages (< 20 KB) — No Action Required

| Page | Size |
|---|---|
| `AuthPage.tsx` | 19.1 KB |
| `EventsPage.tsx` | 18.4 KB |
| `ReferralsPage.tsx` | 16.7 KB |
| `SocialPage.tsx` | 16.6 KB |
| `PublicBatchPage.tsx` | 15.1 KB |
| `AdminPage.tsx` | 15.4 KB |
| `InterviewsPage.tsx` | 11.8 KB |
| `ReputationPage.tsx` | 11.5 KB |

---

## SECTION 8 — STATE MANAGEMENT AUDIT

### 8.1 State Architecture Overview

The platform uses the following state layers:

| Layer | Technology | Scope |
|---|---|---|
| Server state (remote data) | TanStack Query v5 | All API data |
| Auth state | React Context (`AuthContext`) | Global |
| Toast state | React Context (`ToastContext`) | Global |
| UI state (modals, tabs, filters) | `useState` inside page components | Local |
| Socket state | Custom hooks (`useChatSocket`, `useNotificationSocket`) | Per-session |
| Persisted auth token | `localStorage` via `authStorage` | Cross-tab |

### 8.2 `useState` State Bloat in Large Pages

The following pages contain excessive `useState` declarations that should be consolidated or lifted:

| Page | Approximate `useState` Count | Issue |
|---|---|---|
| `ProfilePage.tsx` | 20+ | Edit forms, active tabs, modals — needs `useReducer` or sub-form hooks |
| `TpoDashboardPage.tsx` | 12+ | Tab state, filter state, invite modal state |
| `RecruiterPage.tsx` | 10+ | Tab state, modal state, search state |
| `ChatPage.tsx` | 14+ | Message state, attachment state, reply state, emoji state |
| `JobsPage.tsx` | 10+ | Tab state, filter state, modal state |
| `CollegesPage.tsx` | 12+ | Multi-tab, search, modal, filter state |

**Root Cause:** Large pages contain multiple logical views (tabs/sections) that should be separate components with their own localised state.

### 8.3 State Location Correctness

| State | Current Location | Correct Location |
|---|---|---|
| Active tab state per page | Page `useState` | Correct — but should be URL-synced (query params) |
| Filter state per page | Page `useState` | Should be URL-synced for shareability and back-button support |
| Modal open/close state | Page `useState` | Correct |
| Auth user | `AuthContext` | Correct |
| Notification count | `useNotificationSocket` → `AppLayout` | Correct |
| Kanban card state | `KanbanPipeline.tsx` local state | Correct — component-local |

### 8.4 Missing URL State Synchronisation

The following filter states are in-memory only. If the user navigates away and returns, all filters reset. This is a UX regression from the behaviour specified in the NRS.

| Page | Filter State Not in URL |
|---|---|
| `JobsPage.tsx` | `jobType`, `experience`, `salary`, `location`, `skills` |
| `HackathonsPage.tsx` | `status`, `mode`, `techStack` |
| `CollegesPage.tsx` | `search`, `state` |
| `CommunitiesPage.tsx` | `category`, `search` |
| `InterviewsPage.tsx` | `company`, `role`, `difficulty` |
| `DiscoverPage.tsx` | `role`, `skills`, `openTo` |

---

## SECTION 9 — DATA FETCHING LAYER AUDIT

### 9.1 `usePlatformQueries.ts` — Monolith Assessment

**File:** `hooks/usePlatformQueries.ts`  
**Size:** 182,689 bytes (182.7 KB) | 5,460 lines  
**Status:** SEV-2 — Must be split

This is the single largest file in the frontend. It contains every query hook and mutation hook for the entire platform. While the pattern is excellent (consistent, typed, co-located), the file size creates:

1. **Editor performance issues** — IDEs struggle with 5460-line files
2. **Git merge conflicts** — Any PR touching data fetching will conflict
3. **Onboarding friction** — New engineers cannot navigate the file
4. **Build analysis pollution** — Cannot tree-shake at the domain level

**Recommended Split:**

```
hooks/
  queries/
    useFeedQueries.ts
    useProfileQueries.ts
    useJobsQueries.ts
    usePlacementQueries.ts
    useCollegeQueries.ts
    useCompanyQueries.ts
    useCommunityQueries.ts
    useHackathonQueries.ts
    useEventQueries.ts
    useTeamQueries.ts
    useProjectQueries.ts
    useChatQueries.ts
    useNotificationQueries.ts
    useSocialQueries.ts
    useSearchQueries.ts
    useAdminQueries.ts
    useRecruiterQueries.ts
    useAnalyticsQueries.ts
    useReputationQueries.ts
    index.ts  ← re-exports all for backward compatibility
```

**Constraint:** All existing import paths must remain working via `index.ts` re-exports during the transition. No breaking changes.

### 9.2 `lib/api.ts` — Monolith Assessment

**File:** `lib/api.ts`  
**Size:** 58,705 bytes (58.7 KB) | 1,482 lines  
**Status:** SEV-3 — Refactor priority MEDIUM

`lib/api.ts` currently acts as a re-export hub and imports from the three feature API files:
- `features/auth/services/auth.api.ts`
- `features/jobs/services/jobs.api.ts`
- `features/storage/services/storage.api.ts`

The pattern is correct. The fix is to expand the feature slice APIs to cover all remaining domain API calls currently living directly in `lib/api.ts`.

### 9.3 Error Handling in Mutations

Current pattern — mutations call `useToast` and show errors in the `onError` callback. This is correct but inconsistently applied.

Observed inconsistency:

| Pattern | Files |
|---|---|
| Shows `useToast` on error | Most mutations in `usePlatformQueries.ts` |
| Silently swallows error | Some admin panel mutations |
| Re-throws error to page | Some form submissions in `ProfilePage.tsx` |

**Action:** Standardise all mutation `onError` handlers to call `showToast("error", getErrorMessage(error))`.

### 9.4 Query Invalidation Patterns

The codebase uses `queryClient.invalidateQueries` correctly in most mutations. No orphaned data patterns were found. The `queryKeys` factory ensures no key collisions.

**Positive finding:** The `clearSession()` in `AuthContext.tsx` calls `queryClient.clear()` — this correctly purges all cached data on logout.

---

## SECTION 10 — ROUTING & GUARD AUDIT

### 10.1 Implemented Routes (Evidence: `App.tsx`)

| Route Pattern | Component | Guard |
|---|---|---|
| `/auth` | `AuthPage` | `PublicOnly` |
| `/feed` | `FeedPage` | None |
| `/profile` | `ProfilePage` | `RequireAuth` |
| `/users/:username` | `UserProfilePage` | `RequireAuth` |
| `/discover` | `DiscoverPage` | None |
| `/search` | `SearchResultsPage` | None |
| `/colleges` | `CollegesPage` | None |
| `/colleges/:collegeSlug` | `CollegesPage` | None |
| `/colleges/:collegeSlug/batch/:graduationYear` | `PublicBatchPage` | None |
| `/companies` | `CompaniesPage` | None |
| `/companies/:companySlug` | `CompaniesPage` | None |
| `/companies/:companySlug/admin` | `CompanyAdminPage` | `RequireAuth` |
| `/communities` | `CommunitiesPage` | None |
| `/communities/:communitySlug` | `CommunitiesPage` | `RequireAuth` |
| `/chat` | `ChatPage` | `RequireAuth` |
| `/chat/:conversationId` | `ChatPage` | `RequireAuth` |
| `/projects` | `ProjectsPage` | None |
| `/projects/:projectSlug` | `ProjectsPage` | None |
| `/teams` | `TeamsPage` | `RequireAuth` |
| `/teams/:teamId` | `TeamsPage` | `RequireAuth` |
| `/social` | `SocialPage` | `RequireAuth` |
| `/hackathons` | `HackathonsPage` | None |
| `/hackathons/:hackathonSlug` | `HackathonsPage` | None |
| `/jobs` | `JobsPage` | None |
| `/interviews` | `InterviewsPage` | None |
| `/placements` | `PlacementDashboardPage` | `RequireAuth` |
| `/events` | `EventsPage` | `RequireAuth` |
| `/notifications` | `NotificationsPage` | `RequireAuth` |
| `/referrals` | `ReferralsPage` | `RequireAuth` |
| `/reputation` | `ReputationPage` | `RequireAuth` |
| `/recruiter` | `RecruiterPage` | `RequireAuth` + `RequireRecruiter` |
| `/recruiter/drive/:driveId` | `RecruiterDrivePage` | `RequireAuth` + `RequireRecruiter` |
| `/tpo-dashboard` | `TpoDashboardPage` | `RequireAuth` + `RequireTpo` |
| `/business` | `BusinessOnboardingPage` | `RequireAuth` |
| `/admin` | `AdminPage` | `RequirePlatformAdmin` |
| `*` | Redirect to `/feed` | None |

**Total Routes Implemented:** 36 (including parameterised variants)

### 10.2 Route Guards Implemented

| Guard | Logic | Issue |
|---|---|---|
| `RequireAuth` | Checks `user !== null` | ✅ Correct |
| `PublicOnly` | Redirects to `from.pathname` if logged in | ✅ Correct |
| `RequirePlatformAdmin` | Checks `PLATFORM_ADMIN` or `SUPER_ADMIN` | ✅ Correct |
| `RequireRecruiter` | Checks `primaryRole === "RECRUITER"` or role in `roles[]` | ✅ Correct |
| `RequireTpo` | Checks `TPO` or `COLLEGE_ADMIN` | ✅ Correct |

### 10.3 Role Check Duplication Problem

The role-checking logic is duplicated across:

| Location | Role Being Checked |
|---|---|
| `App.tsx:92-100` | `PLATFORM_ADMIN` / `SUPER_ADMIN` |
| `AppLayout.tsx:94-100` | `PLATFORM_ADMIN` / `SUPER_ADMIN` |
| `CollegesPage.tsx:40-60` | `SUPER_ADMIN`, `COLLEGE_ADMIN`, `TPO`, `CDCR` |
| `TpoDashboardPage.tsx:55-58` | TPO via `collegeAdminships` |
| `RecruiterPage.tsx:110-112` | `RECRUITER` |

**Required fix:** Create `src/core/utils/roles.ts` with a single set of exported helper functions:

```typescript
// roles.ts — proposed
export const isPlatformAdmin = (user: User | null): boolean => ...
export const isRecruiter = (user: User | null): boolean => ...
export const isTpo = (user: User | null, collegeId?: string): boolean => ...
export const isCollegeAdmin = (user: User | null, collegeId?: string): boolean => ...
export const isCdcr = (user: User | null, collegeId?: string): boolean => ...
export const isCompanyAdmin = (user: User | null, companyId?: string): boolean => ...
```

### 10.4 Missing Routes (Not Implemented)

Comparing the implemented routes against the NRS specification:

| Route | NRS Status | Implementation Status |
|---|---|---|
| `/settings` | Defined in NRS | Not Implemented — currently profile settings are a tab inside `ProfilePage` |
| `/hackathons/:id/submit` | Defined in NRS | Not Implemented — submission is a modal inside `HackathonsPage` |
| `/companies/:companySlug/jobs` | Defined in NRS | Not Implemented — company jobs shown inside `CompaniesPage` |

---

## SECTION 11 — PERFORMANCE AUDIT

### 11.1 Memoisation Usage

| Hook | Files Using It | Assessment |
|---|---|---|
| `useMemo` | 14 page files | ✅ Appropriate — filters, derived lists |
| `useCallback` | 9 page files | ✅ Appropriate — event handlers, socket callbacks |
| `memo()` | None | ⚠️ No pure component wrappers — card components re-render on parent change |

**Missing `memo()` candidates:**
- `FeedCard.tsx` — renders inside a large infinite list
- `HackathonCard.tsx` — renders in a grid
- `JobCard.tsx` — renders in a long jobs list
- `SocialCards.tsx` exports — render in a suggestion list

### 11.2 Impression Tracking

`useImpressionTracking.ts` exists (1.3 KB) and uses `IntersectionObserver`. However, it is **not imported in any page file** — it is an unused hook.

Evidence:
```bash
grep -r "useImpressionTracking" client/src → 0 results outside the hook file itself
```

**Action:** Either integrate `useImpressionTracking` into `FeedCard.tsx` and `JobCard.tsx` (as intended by the analytics architecture), or delete the file.

### 11.3 Re-render Risk in Large Pages

Large page components hold all tab/modal/filter state at the top level. When any of this state changes, the entire page component re-renders. This is a performance risk specifically for:

- `ProfilePage.tsx` — holds 20+ state variables, re-renders all 2608 lines
- `ChatPage.tsx` — holds message list + scroll ref + form state together
- `JobsPage.tsx` — filter state triggers re-render of entire 1713-line component

**Fix:** Decompose into tab sub-components with isolated state.

---

## SECTION 12 — CODE SPLITTING AUDIT

### 12.1 Current State

Only **one** page uses `React.lazy` for code splitting:

```typescript
// FeedPage.tsx
const ComposePost = lazy(() => import("../components/forms/ComposePost"));
```

**All 28 pages** are imported statically in `App.tsx`, meaning the **entire application is bundled into a single JS chunk**. This is a critical performance issue for initial load time.

The total page-level code is:
```
28 pages × avg ~30 KB = ~840 KB of page-level TSX
+ components: ~320 KB
+ hooks:      ~183 KB  
Total page code: ~1.3 MB before minification
```

### 12.2 Required Code Splitting

Every route in `App.tsx` should use `React.lazy`:

```typescript
// Target state — App.tsx
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const JobsPage = lazy(() => import("./pages/JobsPage"));
// ...all 28 pages

// Wrapped in Suspense with PageLoader fallback
<Suspense fallback={<PageLoader />}>
  <Routes>...</Routes>
</Suspense>
```

**Priority order for splitting (by page size):**

| Priority | Page | Size |
|---|---|---|
| 1 | `ProfilePage` | 104.9 KB |
| 2 | `CollegesPage` | 90.4 KB |
| 3 | `JobsPage` | 80.2 KB |
| 4 | `CompanyAdminPage` | 73.0 KB |
| 5 | `CommunitiesPage` | 70.0 KB |
| 6 | `RecruiterPage` | 63.8 KB |
| 7 | `TpoDashboardPage` | 62.7 KB |
| 8 | `ChatPage` | 59.3 KB |
| 9 | `BusinessOnboardingPage` | 55.0 KB |
| 10 | `HackathonsPage` | 53.0 KB |
| 11-28 | All remaining pages | — |

### 12.3 Admin Panel Code Splitting

`AdminPage.tsx` uses an internal panel router. The 15 admin panel components are imported statically inside `AdminPage.tsx`. Each panel should be lazy-loaded because admin users are a small fraction of total users.

---

## SECTION 13 — SPRING CLEANING LIST

### 13.1 Files to DELETE

No files were identified as fully obsolete. All existing files serve documented purposes.

### 13.2 Files to CONSOLIDATE

| From | Into | Reason |
|---|---|---|
| `components/ui/ConfirmDialog.tsx` | `components/ui.tsx` (new export) | Avoid `ui/` subdirectory with a single file |
| `lib/types.ts` | `core/types/models.ts` | Eliminate the second types file; two type files create confusion |
| `features/jobs/components/JobCard.tsx` | `components/cards/JobCard.tsx` | Align with the cards directory convention |
| `features/jobs/components/JobDetailModal.tsx` | `components/jobs/JobDetailModal.tsx` | Align with the jobs directory convention |

### 13.3 Files to MOVE

| From | To | Reason |
|---|---|---|
| `components/recruiter/KanbanPipeline.tsx` | `components/jobs/KanbanPipeline.tsx` | Recruiter pipeline is a jobs concern; recruiter/ directory would then be empty |
| `components/notifications/NotificationCenter.tsx` | Inline into `layout/` or `components/` root | Single-file directory adds no value |

### 13.4 Files to SPLIT

| File | New Files |
|---|---|
| `hooks/usePlatformQueries.ts` | Split into `hooks/queries/*.ts` (see Section 9.1) |
| `components/cards/ProfileCards.tsx` | `EducationCard.tsx`, `ExperienceCard.tsx`, `CodingProfileCard.tsx` |
| `pages/ProfilePage.tsx` | `ProfileOverview.tsx`, `ProfileSkills.tsx`, `ProfileExperience.tsx`, `ProfileEducation.tsx`, `ProfileProjects.tsx`, `ProfileSettings.tsx` |
| `pages/JobsPage.tsx` | `JobsExploreTab.tsx`, `JobsRecommendedTab.tsx`, `JobsApplicationsTab.tsx`, `JobsCampusTab.tsx` |
| `pages/CollegesPage.tsx` | `CollegeListView.tsx`, `CollegeDetailView.tsx`, `CollegePlacementView.tsx` |
| `pages/TpoDashboardPage.tsx` | `TpoOverviewTab.tsx`, `TpoStudentsTab.tsx`, `TpoPlacementsTab.tsx`, `TpoInvitesTab.tsx` |
| `pages/RecruiterPage.tsx` | `RecruiterJobsTab.tsx`, `RecruiterAppsTab.tsx`, `RecruiterCampusTab.tsx`, `RecruiterSearchTab.tsx` |

### 13.5 Files to CREATE (Missing Infrastructure)

| File | Purpose |
|---|---|
| `core/utils/roles.ts` | Single source of truth for role-checking helpers |
| `components/ui/Badge.tsx` | Semantic status badge component |
| `components/ui/Modal.tsx` | Generic modal shell (backdrop, close button, title) |
| `components/ui/Tabs.tsx` | Generic tab bar component |
| `components/ui/FilterChip.tsx` | Dismissible filter chip |
| `components/ui/SearchInput.tsx` | Standardised search input with icon |
| `components/ui/StatCard.tsx` | Metric + icon dashboard card |
| `components/ui/RoleGuard.tsx` | Inline role-based render guard component |

---

## SECTION 14 — VIOLATIONS REGISTER

Each violation is indexed for sprint planning reference.

| ID | File | Line | Severity | Category | Description |
|---|---|---|---|---|---|
| V-001 | `BusinessOnboardingPage.tsx` | 350 | SEV-2 | Design Token | `bg-[#0f0e2e]` bypasses token system |
| V-002 | `BusinessOnboardingPage.tsx` | 376 | SEV-2 | Design Token | `hover:bg-[#11102a]/30` hardcoded hex |
| V-003 | `BusinessOnboardingPage.tsx` | 400 | SEV-2 | Design Token | `hover:bg-[#161a35]/30` hardcoded hex |
| V-004 | `BusinessOnboardingPage.tsx` | 424 | SEV-2 | Design Token | `hover:bg-[#0e2133]/30` hardcoded hex |
| V-005 | `ToastContext.tsx` | 35 | SEV-2 | Design Token | `dark:bg-[#0e0d1f]` hardcoded |
| V-006 | `ToastContext.tsx` | 43 | SEV-2 | Design Token | `dark:bg-[#1f0d0d]` hardcoded |
| V-007 | `ToastContext.tsx` | 51 | SEV-2 | Design Token | `dark:bg-[#1f1a0d]` hardcoded |
| V-008 | `ToastContext.tsx` | 59 | SEV-2 | Design Token | `dark:bg-[#0d1520]` hardcoded |
| V-009 | `JobsPage.tsx` | 1138 | SEV-2 | Design Token | `color: "#3b82f6"` inline style |
| V-010 | `FeedPage.tsx` | 678 | SEV-2 | Design Token | `color: "#f59e0b"` inline style |
| V-011 | `ProfilePage.tsx` | — | SEV-2 | Architecture | 104.9 KB monolith — must decompose |
| V-012 | `CollegesPage.tsx` | — | SEV-2 | Architecture | 90.4 KB monolith — must decompose |
| V-013 | `JobsPage.tsx` | — | SEV-2 | Architecture | 80.2 KB monolith — must decompose |
| V-014 | `CompanyAdminPage.tsx` | — | SEV-2 | Architecture | 73.0 KB monolith — must decompose |
| V-015 | `CommunitiesPage.tsx` | — | SEV-2 | Architecture | 70.0 KB monolith — must decompose |
| V-016 | `RecruiterPage.tsx` | — | SEV-2 | Architecture | 63.8 KB monolith — must decompose |
| V-017 | `TpoDashboardPage.tsx` | — | SEV-2 | Architecture | 62.7 KB monolith — must decompose |
| V-018 | `ChatPage.tsx` | — | SEV-2 | Architecture | 59.3 KB monolith — must decompose |
| V-019 | `usePlatformQueries.ts` | — | SEV-2 | Architecture | 182 KB / 5460 lines — must split |
| V-020 | `lib/api.ts` | — | SEV-3 | Architecture | 58 KB API client — should split |
| V-021 | `App.tsx` | — | SEV-2 | Performance | 0 code-split routes — all pages imported statically |
| V-022 | All 41 page files | — | SEV-2 | TypeScript | `any` type used — remove unnecessary casts |
| V-023 | `App.tsx` | 93,112 | SEV-3 | TypeScript | `(ur: any)` on already-typed `roles[]` |
| V-024 | `AppLayout.tsx` | 97 | SEV-3 | TypeScript | `(ur: any)` on already-typed `roles[]` |
| V-025 | `CollegesPage.tsx` | 41,47 | SEV-3 | TypeScript | Role helpers accept `any` parameter |
| V-026 | `TpoDashboardPage.tsx` | 56 | SEV-3 | TypeScript | `(user as any)` unsafe cast |
| V-027 | 5 page files | — | SEV-3 | State | Filter state not URL-synced |
| V-028 | `useImpressionTracking.ts` | — | SEV-3 | Dead Code | Hook defined but never imported in any page |
| V-029 | `DriveApplicantsModal.tsx` | — | SEV-2 | Architecture | 38.3 KB component — largest non-page file |
| V-030 | `KanbanPipeline.tsx` | — | SEV-3 | Architecture | 30.6 KB — needs column/card decomposition |
| V-031 | Multiple pages | — | SEV-2 | Architecture | Role check logic duplicated — no shared `roles.ts` |
| V-032 | Multiple pages | — | SEV-3 | DS Compliance | `STATUS_CHIP_CLASSES` not adopted platform-wide |
| V-033 | Multiple pages | — | SEV-3 | Performance | `memo()` not applied to card components |
| V-034 | Multiple forms | — | SEV-4 | Libraries | Some forms use raw `useState` instead of `react-hook-form` (already a dep) |
| V-035 | `lib/types.ts` | — | SEV-4 | Architecture | Redundant types file alongside `models.ts` |
| V-036 | `ProfileCards.tsx` | — | SEV-3 | Architecture | 4 card components in one file — split |

---

## SECTION 15 — SPRINT EXECUTION PLAN

### Overview

| Sprint | Theme | Deliverables | Duration |
|---|---|---|---|
| 1 | Foundation & Token Fixes | Token violations, `roles.ts`, missing UI components | 1 week |
| 2 | TypeScript Health | Remove all `any`, typed role helpers, typed payloads | 1 week |
| 3 | Query Layer Split | Split `usePlatformQueries.ts` into domain query files | 1 week |
| 4 | Code Splitting | `React.lazy` all 28 pages, Suspense boundaries | 1 week |
| 5 | ProfilePage Decompose | Extract 6 section components from `ProfilePage.tsx` | 1 week |
| 6 | JobsPage Decompose | Extract 6 tab components from `JobsPage.tsx` | 1 week |
| 7 | CollegesPage Decompose | Extract list/detail/placement from `CollegesPage.tsx` | 1 week |
| 8 | Admin & Ops Pages | Decompose `TpoDashboard`, `RecruiterPage`, `CompanyAdminPage` | 1 week |
| 9 | Component Library | Split `ProfileCards`, create `Badge/Modal/Tabs/FilterChip` | 1 week |
| 10 | State & URL Sync | URL-sync filter state across Job/Hackathon/Interview pages | 1 week |
| 11 | Performance Pass | Apply `memo()` to cards, integrate `useImpressionTracking` | 1 week |
| 12 | Consolidation & QA | Move/merge files per Section 13, E2E test pass | 1 week |

---

### SPRINT 1 — Foundation & Token Fixes

**Goal:** Eliminate all hardcoded colour violations and build the shared utility infrastructure that all subsequent sprints depend on.

**Tasks:**

| # | Task | File(s) | Priority |
|---|---|---|---|
| 1.1 | Add semantic surface tokens to `index.css` | `index.css` | P0 |
| 1.2 | Fix `ToastContext.tsx` — replace 4 hardcoded hex bg values | `ToastContext.tsx:35,43,51,59` | P0 |
| 1.3 | Fix `BusinessOnboardingPage.tsx` — replace 4 hardcoded hex bg values | `BusinessOnboardingPage.tsx:350,376,400,424` | P0 |
| 1.4 | Fix `JobsPage.tsx` — replace inline `color: "#3b82f6"` | `JobsPage.tsx:1138` | P1 |
| 1.5 | Fix `FeedPage.tsx` — replace inline `color: "#f59e0b"` | `FeedPage.tsx:678` | P1 |
| 1.6 | Create `core/utils/roles.ts` with all role helper functions | NEW | P0 |
| 1.7 | Replace all duplicate role checks with `roles.ts` helpers | `App.tsx`, `AppLayout.tsx`, `CollegesPage.tsx`, `TpoDashboardPage.tsx` | P1 |
| 1.8 | Create `components/ui/Badge.tsx` | NEW | P1 |
| 1.9 | Create `components/ui/Modal.tsx` | NEW | P1 |
| 1.10 | Create `components/ui/Tabs.tsx` | NEW | P1 |
| 1.11 | Create `components/ui/FilterChip.tsx` | NEW | P2 |
| 1.12 | Create `components/ui/SearchInput.tsx` | NEW | P2 |
| 1.13 | Create `components/ui/StatCard.tsx` | NEW | P2 |
| 1.14 | Create `components/ui/RoleGuard.tsx` | NEW | P2 |
| 1.15 | Adopt `STATUS_CHIP_CLASSES` in `JobsPanel.tsx`, `CollegesPage.tsx`, `RecruiterPage.tsx`, `TpoDashboardPage.tsx` | Multiple | P2 |
| 1.16 | Move `ConfirmDialog.tsx` into `ui.tsx` exports or keep as-is but add re-export | `components/ui.tsx` | P3 |
| 1.17 | Consolidate `lib/types.ts` into `core/types/models.ts` | `lib/types.ts` | P3 |

**Acceptance Criteria:**
- Zero hardcoded hex colour values in `client/src`
- `roles.ts` exports 6+ helpers, all role checks import from it
- 8 new shared UI components created
- All colour-related ESLint custom rules pass

---

### SPRINT 2 — TypeScript Health

**Goal:** Eliminate all `any` type violations and establish strict type safety for role checking, API payloads, and component props.

**Tasks:**

| # | Task | File(s) | Priority |
|---|---|---|---|
| 2.1 | Fix `App.tsx` — remove `(ur: any)` from role checks | `App.tsx:93,112` | P0 |
| 2.2 | Fix `AppLayout.tsx` — remove `(ur: any)` from role checks | `AppLayout.tsx:97` | P0 |
| 2.3 | Fix `CollegesPage.tsx` — type `isSuperOrPlatformAdmin(user)` properly | `CollegesPage.tsx:41,47` | P0 |
| 2.4 | Fix `TpoDashboardPage.tsx` — remove `(user as any)` cast | `TpoDashboardPage.tsx:56` | P0 |
| 2.5 | Add `UserRoleEntry` type to `models.ts` for `roles[]` array items | `core/types/models.ts` | P0 |
| 2.6 | Audit and fix `any` usage in all 15 AdminPages | `AdminPages/*.tsx` | P1 |
| 2.7 | Audit and fix `any` usage in `usePlatformQueries.ts` — mutation payloads | `hooks/usePlatformQueries.ts` | P1 |
| 2.8 | Audit and fix `any` usage in remaining page files | All remaining pages | P2 |
| 2.9 | Enable `"strict": true` in `tsconfig.json` if not already set | `tsconfig.json` | P1 |
| 2.10 | Add types for `collegeAdminships`, `tpoMemberships`, `cdcrMemberships` to `User` | `models.ts` | P0 |

**Acceptance Criteria:**
- Zero `any` in `App.tsx` and `AppLayout.tsx`
- Zero `any` in `core/` directory
- `tsc --noEmit` passes with no new errors introduced

---

### SPRINT 3 — Query Layer Split

**Goal:** Decompose `usePlatformQueries.ts` (182 KB) into domain-specific query files without breaking any existing imports.

**Tasks:**

| # | Task | Details |
|---|---|---|
| 3.1 | Create `hooks/queries/` directory | New directory |
| 3.2 | Extract feed queries | `useFeedQueries.ts` |
| 3.3 | Extract profile queries | `useProfileQueries.ts` |
| 3.4 | Extract jobs queries | `useJobsQueries.ts` |
| 3.5 | Extract placement queries | `usePlacementQueries.ts` |
| 3.6 | Extract college queries | `useCollegeQueries.ts` |
| 3.7 | Extract company queries | `useCompanyQueries.ts` |
| 3.8 | Extract community queries | `useCommunityQueries.ts` |
| 3.9 | Extract hackathon queries | `useHackathonQueries.ts` |
| 3.10 | Extract event queries | `useEventQueries.ts` |
| 3.11 | Extract team queries | `useTeamQueries.ts` |
| 3.12 | Extract project queries | `useProjectQueries.ts` |
| 3.13 | Extract chat queries | `useChatQueries.ts` |
| 3.14 | Extract notification queries | `useNotificationQueries.ts` |
| 3.15 | Extract social queries | `useSocialQueries.ts` |
| 3.16 | Extract search queries | `useSearchQueries.ts` |
| 3.17 | Extract admin queries | `useAdminQueries.ts` |
| 3.18 | Extract recruiter queries | `useRecruiterQueries.ts` |
| 3.19 | Extract analytics queries | `useAnalyticsQueries.ts` |
| 3.20 | Extract reputation queries | `useReputationQueries.ts` |
| 3.21 | Create `hooks/queries/index.ts` — re-export all | Backward compat |
| 3.22 | Update `hooks/usePlatformQueries.ts` to be a re-export of index.ts | Keep file, change contents |
| 3.23 | Verify all tests in `usePlatformQueries.test.tsx` still pass | Run `npm test` |

**Acceptance Criteria:**
- `usePlatformQueries.ts` contains only re-exports (< 100 lines)
- No existing import path in any page file changes
- All query hook tests pass
- Each domain query file is < 500 lines

---

### SPRINT 4 — Code Splitting

**Goal:** Implement route-level code splitting for all 28 pages. The initial JS bundle must only include the shell (App, Layout, AuthContext, ToastContext, QueryClient).

**Tasks:**

| # | Task | Details |
|---|---|---|
| 4.1 | Convert all 28 page imports in `App.tsx` to `React.lazy` | Use `lazy(() => import(...))` |
| 4.2 | Wrap `<Routes>` in `<Suspense fallback={<PageLoader />}>` | In `AppRoutes()` function |
| 4.3 | Lazy-load all 15 admin panel components in `AdminPage.tsx` | Admin panels are low-traffic |
| 4.4 | Lazy-load `DriveApplicantsModal` (38.3 KB) | Heaviest component |
| 4.5 | Lazy-load `KanbanPipeline` (30.6 KB) | Heavy component |
| 4.6 | Run `vite build` and inspect chunk output | Verify chunks < 200 KB |
| 4.7 | Verify page transitions still fire correctly | `page-enter` class on `PageTransitionWrapper` |
| 4.8 | Test `PublicOnly` and `RequireAuth` guard behaviour post-split | No flash of wrong page |

**Acceptance Criteria:**
- Initial bundle (excluding vendor) < 100 KB
- Largest page chunk < 250 KB
- No loading regression on auth-gated routes
- All 36 routes navigate correctly in dev and production build

---

### SPRINT 5 — ProfilePage Decompose

**Goal:** Decompose `ProfilePage.tsx` (104.9 KB, 2608 lines) into 6 focused section components and a shell.

**Decomposition Plan:**

```
pages/ProfilePage.tsx  ← Shell: manages active tab, auth guard, shared query
  ↓
  components/profile/ProfileHeader.tsx       ← Avatar, banner, stats, edit header
  components/profile/ProfileOverview.tsx     ← Bio, links, coding profiles, availability
  components/profile/ProfileSkills.tsx       ← Skills list, add/remove
  components/profile/ProfileExperience.tsx   ← Experience cards, add/edit/delete
  components/profile/ProfileEducation.tsx    ← Education cards, add/edit/delete
  components/profile/ProfileProjects.tsx     ← Project membership cards
  components/profile/ProfileSettings.tsx     ← Privacy, preferences, account actions
```

**Tasks:**

| # | Task |
|---|---|
| 5.1 | Create `components/profile/` directory |
| 5.2 | Extract `ProfileHeader` component |
| 5.3 | Extract `ProfileOverview` component |
| 5.4 | Extract `ProfileSkills` component |
| 5.5 | Extract `ProfileExperience` component |
| 5.6 | Extract `ProfileEducation` component |
| 5.7 | Extract `ProfileProjects` component |
| 5.8 | Extract `ProfileSettings` component |
| 5.9 | Reduce `ProfilePage.tsx` to tab router + shared data shell |
| 5.10 | Verify all edit mutations still work after decomposition |
| 5.11 | Apply `STATUS_CHIP_CLASSES` to any status chips in profile |
| 5.12 | Replace inline `any` casts in all extracted components |

**Acceptance Criteria:**
- `ProfilePage.tsx` < 200 lines
- Each sub-component < 300 lines
- All profile edit flows (skills, experience, education, projects) work correctly
- No visual regression

---

### SPRINT 6 — JobsPage Decompose

**Goal:** Decompose `JobsPage.tsx` (80.2 KB, 1713 lines) into tab-level components.

**Decomposition Plan:**

```
pages/JobsPage.tsx  ← Shell: manages activeTab, shared filter state
  ↓
  components/jobs/JobsExploreTab.tsx          ← Search, filter, job list
  components/jobs/JobsRecommendedTab.tsx      ← AI-recommended jobs
  components/jobs/JobsApplicationsTab.tsx     ← Kanban + application list
  components/jobs/JobsSavedTab.tsx            ← Saved jobs list
  components/jobs/JobsRecruiterView.tsx       ← Recruiter sub-dashboard (if in JobsPage)
  components/jobs/PlacementDrivesTab.tsx      ← Already extracted ✅
```

**Tasks:**

| # | Task |
|---|---|
| 6.1 | Extract `JobsExploreTab` with all filter + list logic |
| 6.2 | Extract `JobsRecommendedTab` |
| 6.3 | Extract `JobsApplicationsTab` (includes `ApplicationKanbanBoard`) |
| 6.4 | Extract `JobsSavedTab` |
| 6.5 | Fix V-009 — `color: "#3b82f6"` inline style (Sprint 1 may handle this) |
| 6.6 | URL-sync `jobType`, `experience`, `location`, `skills` filter state |
| 6.7 | Reduce `JobsPage.tsx` to tab router shell |
| 6.8 | Verify `formatSalary` helper is kept or moved to `format.ts` |

**Acceptance Criteria:**
- `JobsPage.tsx` < 200 lines
- Each tab component < 400 lines
- Filter state survives browser back/forward navigation

---

### SPRINT 7 — CollegesPage Decompose

**Goal:** Decompose `CollegesPage.tsx` (90.4 KB, 1610 lines).

**Decomposition Plan:**

```
pages/CollegesPage.tsx  ← Shell: routing between list and detail views
  ↓
  components/colleges/CollegeList.tsx         ← Search + filter + list
  components/colleges/CollegeDetail.tsx       ← College profile header + tabs
  components/colleges/CollegePlacement.tsx    ← Placement stats, drives, invites
  components/colleges/CollegeStudents.tsx     ← CDCR member list
  components/colleges/CollegeAlumni.tsx       ← Alumni verification queue
```

**Tasks:**

| # | Task |
|---|---|
| 7.1 | Create `components/colleges/` directory |
| 7.2 | Extract `CollegeList` |
| 7.3 | Extract `CollegeDetail` |
| 7.4 | Extract `CollegePlacement` |
| 7.5 | Extract `CollegeStudents` |
| 7.6 | Extract `CollegeAlumni` |
| 7.7 | Move role helper functions to `core/utils/roles.ts` (Sprint 1 target) |
| 7.8 | Remove remaining `any` from extracted components |
| 7.9 | Reduce `CollegesPage.tsx` to view router |

**Acceptance Criteria:**
- `CollegesPage.tsx` < 150 lines
- Role helpers imported from `roles.ts` — no local duplication

---

### SPRINT 8 — Admin & Ops Pages

**Goal:** Decompose `TpoDashboardPage.tsx`, `RecruiterPage.tsx`, `CompanyAdminPage.tsx`.

**Tasks:**

| # | Task | Target Page |
|---|---|---|
| 8.1 | Extract `TpoOverviewTab` | `TpoDashboardPage.tsx` |
| 8.2 | Extract `TpoStudentsTab` | `TpoDashboardPage.tsx` |
| 8.3 | Extract `TpoPlacementsTab` | `TpoDashboardPage.tsx` |
| 8.4 | Extract `TpoInvitesTab` | `TpoDashboardPage.tsx` |
| 8.5 | Extract `TpoAlumniTab` | `TpoDashboardPage.tsx` |
| 8.6 | Extract `TpoRecruitersTab` | `TpoDashboardPage.tsx` |
| 8.7 | Reduce `TpoDashboardPage.tsx` to tab shell | `TpoDashboardPage.tsx` |
| 8.8 | Extract `RecruiterJobsTab` | `RecruiterPage.tsx` |
| 8.9 | Extract `RecruiterAppsTab` | `RecruiterPage.tsx` |
| 8.10 | Extract `RecruiterCampusTab` | `RecruiterPage.tsx` |
| 8.11 | Extract `RecruiterSearchTab` (Resdex) | `RecruiterPage.tsx` |
| 8.12 | Reduce `RecruiterPage.tsx` to tab shell | `RecruiterPage.tsx` |
| 8.13 | Decompose `CompanyAdminPage.tsx` into sections | `CompanyAdminPage.tsx` |
| 8.14 | Split `DriveApplicantsModal.tsx` into sub-components | `DriveApplicantsModal.tsx` |

---

### SPRINT 9 — Component Library

**Goal:** Complete the shared component library as specified in the CLB.

**Tasks:**

| # | Task |
|---|---|
| 9.1 | Split `ProfileCards.tsx` into 4 separate files |
| 9.2 | Add `JobCard.tsx` to `components/cards/` (move from `features/jobs`) |
| 9.3 | Apply `memo()` to `FeedCard`, `HackathonCard`, `JobCard`, `SocialCards` |
| 9.4 | Extract `JobDetailModal` to `components/jobs/` (move from `features/jobs`) |
| 9.5 | Complete `Badge.tsx` with all semantic variants |
| 9.6 | Complete `Modal.tsx` with focus trap and `Escape` key handling |
| 9.7 | Complete `Tabs.tsx` with keyboard navigation |
| 9.8 | Migrate `KanbanPipeline.tsx` to `components/jobs/` |
| 9.9 | Add JSDoc to all shared components |
| 9.10 | Adopt new `Modal.tsx` in at least 3 existing modals |

---

### SPRINT 10 — State & URL Sync

**Goal:** Synchronise filter/tab state to URL query parameters for shareability and browser history correctness.

**Tasks:**

| # | Task | Page |
|---|---|---|
| 10.1 | URL-sync `jobType`, `experience`, `salary`, `location`, `skills` | `JobsPage.tsx` |
| 10.2 | URL-sync `status`, `mode`, `techStack` | `HackathonsPage.tsx` |
| 10.3 | URL-sync `company`, `role`, `difficulty` | `InterviewsPage.tsx` |
| 10.4 | URL-sync `category`, `search` | `CommunitiesPage.tsx` |
| 10.5 | URL-sync `search`, `state` | `CollegesPage.tsx` |
| 10.6 | URL-sync active tab state for `ProfilePage` | `ProfilePage.tsx` |
| 10.7 | Create `useUrlState` utility hook | `core/utils/useUrlState.ts` |
| 10.8 | Test back-button restores filter state in all 6 pages | Browser testing |

---

### SPRINT 11 — Performance Pass

**Goal:** Apply memoisation, activate impression tracking, and address remaining performance concerns.

**Tasks:**

| # | Task |
|---|---|
| 11.1 | Apply `React.memo()` to `FeedCard` |
| 11.2 | Apply `React.memo()` to `HackathonCard` |
| 11.3 | Apply `React.memo()` to `JobCard` |
| 11.4 | Apply `React.memo()` to `SocialCards` exports |
| 11.5 | Apply `React.memo()` to `ProjectCard` |
| 11.6 | Integrate `useImpressionTracking` into `FeedCard` |
| 11.7 | Integrate `useImpressionTracking` into `JobCard` |
| 11.8 | Profile `ProfilePage` render count after Sprint 5 decomposition |
| 11.9 | Profile `ChatPage` render count after decomposition |
| 11.10 | Verify `useMemo` in feed list derivations |
| 11.11 | Run `vite build --report` — verify no chunk > 300 KB |

---

### SPRINT 12 — Consolidation & QA

**Goal:** Finalise file moves, remove dead code, run end-to-end tests, and lock the codebase.

**Tasks:**

| # | Task |
|---|---|
| 12.1 | Delete `lib/types.ts` after merging into `models.ts` |
| 12.2 | Move `components/notifications/NotificationCenter.tsx` to `components/ui/` |
| 12.3 | Verify `components/recruiter/` directory is empty after Sprint 9 move |
| 12.4 | Run full E2E test suite (Playwright) |
| 12.5 | Run `npm run lint` — zero warnings |
| 12.6 | Run `tsc --noEmit` — zero errors |
| 12.7 | Run `npm test` — all unit tests pass |
| 12.8 | Verify all 36 routes in `App.tsx` navigate correctly |
| 12.9 | Verify dark mode on all decomposed pages |
| 12.10 | Verify mobile tab bar on all decomposed pages |
| 12.11 | Update `walkthrough.md` with final refactor summary |
| 12.12 | Archive this document as V1.0 — frozen |

---

## SECTION 16 — IMPLEMENTATION RULES

The following 120 rules govern all frontend work during and after this refactor. These rules are binding for all engineers.

---

### RULE CATEGORY A — DESIGN TOKEN RULES (A-001 to A-020)

**A-001** — All background colours MUST use CSS custom property tokens (`var(--bg-base)`, `var(--bg-surface)`, `var(--bg-surface-2)`, `var(--bg-surface-3)`) or the corresponding Tailwind utility classes (`bg-base`, `bg-surface`, `bg-surface-2`, `bg-surface-3`). Hardcoded hex backgrounds are PROHIBITED.

**A-002** — All text colours MUST use CSS custom property tokens (`var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`) or Tailwind utility classes (`text-primary`, `text-secondary`, `text-muted-fg`). Hardcoded text hex values are PROHIBITED.

**A-003** — All border colours MUST use `var(--border)`, `var(--border-strong)`, or `var(--border-focus)`. The Tailwind classes `border-base` and `border-strong` map to these tokens.

**A-004** — The brand colour MUST be referenced via `var(--brand)`, `text-brand`, or `bg-brand-light`. Using `indigo-500`, `indigo-600`, or numeric Tailwind brand shades is ALLOWED only in cases where the shade specifically does not match the brand token.

**A-005** — All `box-shadow` values MUST use the named shadow tokens from `tailwind.config.js` (`shadow-panel`, `shadow-card`, `shadow-glass`, `shadow-glow`, `shadow-glow-sm`). Inline `style={{ boxShadow: "..." }}` is PROHIBITED.

**A-006** — Status chips (job status, drive status, event status, hackathon status) MUST use `STATUS_CHIP_CLASSES` from `core/utils/format.ts` or the new semantic `Badge` component. Inline status colour strings are PROHIBITED.

**A-007** — The `.panel` class MUST be used for all card surfaces. Raw `className="rounded-xl border bg-white shadow"` patterns are PROHIBITED.

**A-008** — The `.glass` class MUST be used for modal backdrops, notification dropdowns, and overlay panels. Inline `background: rgba(...)` glass styles are PROHIBITED.

**A-009** — Form inputs MUST use the `.field` class. Raw input `className` strings that replicate the field styles are PROHIBITED.

**A-010** — Primary action buttons MUST use `className="btn-primary"`. Secondary action buttons MUST use `className="btn-secondary"`. Icon-only buttons MUST use `className="icon-btn"`. Inline button style strings are PROHIBITED.

**A-011** — Tags, tech stack pills, and category labels MUST use `className="chip"`. Inline pill styles are PROHIBITED.

**A-012** — All loading placeholders MUST use `<SkeletonBlock>` or `<FeedCardSkeleton>`. Raw `animate-pulse` div patterns are PROHIBITED.

**A-013** — Dark mode styling MUST work exclusively through the `.dark` class applied to `<html>`. Components MUST NOT check `window.matchMedia` independently. ONLY `DarkModeSync` in `App.tsx` manages the OS preference.

**A-014** — No `!important` overrides are ALLOWED in any component className. If a style cannot be applied without `!important`, the token system or component class must be updated instead.

**A-015** — Animation classes MUST come from the defined animation registry in `tailwind.config.js`. Custom `@keyframes` in component files are PROHIBITED.

**A-016** — The `hover-lift` utility class MUST be applied to all interactive card components to provide consistent hover feedback.

**A-017** — Glassmorphism panels (`backdrop-filter: blur`) MUST use the `glassStyle` object pattern from `AppLayout.tsx` or the `.glass` CSS class. Inline backdrop values are PROHIBITED.

**A-018** — When adding a new semantic token (e.g., a warning surface colour), it MUST be added to BOTH the `:root {}` block (light) AND the `.dark {}` block in `index.css`.

**A-019** — The `@layer components` block in `index.css` is the ONLY location for new reusable component classes. No component CSS may be written in a `.module.css` or separate stylesheet.

**A-020** — All Tailwind classes used in components MUST appear in the `content` glob in `tailwind.config.js`. Dynamic class construction using string concatenation (e.g., ``text-${color}-500``) is PROHIBITED — use object maps instead.

---

### RULE CATEGORY B — TYPESCRIPT RULES (B-001 to B-020)

**B-001** — The `any` type is PROHIBITED in all production source files. TypeScript's `unknown` type MUST be used when the type is genuinely unknown, with a subsequent type guard.

**B-002** — The `as any` type cast is PROHIBITED. Use type guards (`typeof`, `instanceof`, discriminated unions) instead.

**B-003** — Role checks MUST use the helpers from `core/utils/roles.ts`. Direct access to `user?.roles?.some(...)` for role checking in component files is PROHIBITED.

**B-004** — All new component props MUST have an explicit TypeScript `type` or `interface`. Prop inference from function signatures without explicit types is PROHIBITED.

**B-005** — All new domain models MUST be added to `core/types/models.ts`. Creating types in component files is PROHIBITED (types travel down, not stay in-place).

**B-006** — All `useQuery` and `useMutation` hooks MUST have explicit return type annotations on their `queryFn` and `mutationFn`.

**B-007** — API response envelope types MUST use `ApiEnvelope<T>`. Raw `{ data: unknown }` return types are PROHIBITED.

**B-008** — Event handlers MUST be typed (`React.ChangeEvent<HTMLInputElement>`, `React.FormEvent<HTMLFormElement>`). Untyped `(e: any)` event handlers are PROHIBITED.

**B-009** — All new React components MUST be exported as named exports. Default exports in new components are PROHIBITED (for tree-shaking compatibility).

**B-010** — Component files MUST NOT mix multiple unrelated component exports. Each non-trivial component MUST be in its own file.

**B-011** — Discriminated union types MUST be used for multi-state component props (e.g., `status: "loading" | "error" | "success"`). Boolean flag combinations are PROHIBITED.

**B-012** — The `Record<string, any>` type is PROHIBITED in mutation payloads. Use specific typed interfaces.

**B-013** — Optional chaining (`?.`) MUST be used when accessing nested nullable properties. Nullish coalescing (`??`) MUST be used for fallback values.

**B-014** — All `useRef` hooks MUST be typed: `useRef<HTMLDivElement>(null)`. Untyped `useRef(null)` is PROHIBITED.

**B-015** — `RoleName` in `models.ts` MUST be the single source of truth for role name strings. Inline role name strings in component files are PROHIBITED.

**B-016** — Enums MUST NOT be used. Use `const` object maps with `as const` instead, for better tree-shaking and JSON compatibility.

**B-017** — `React.FC<Props>` annotation MUST NOT be used. Use explicit `(props: Props) => JSX.Element` instead.

**B-018** — All list renders MUST have a stable, unique `key` prop. Using array index as a key is PROHIBITED unless the list is truly static and never reordered.

**B-019** — The `User` type from `core/types/models.ts` MUST be used consistently. Inline anonymous user type shapes in component files are PROHIBITED.

**B-020** — `satisfies` operator MUST be used when constructing typed config objects to catch type errors at the point of assignment, not the point of use.

---

### RULE CATEGORY C — COMPONENT ARCHITECTURE RULES (C-001 to C-020)

**C-001** — No component file MAY exceed 400 lines. Any component exceeding 400 lines MUST be decomposed.

**C-002** — No page file MAY exceed 300 lines after the refactor. Pages are route-entry shells, not logic containers.

**C-003** — Each page MUST follow the Shell Pattern: the page component owns tab routing and shared data fetching only. Business logic lives in sub-components.

**C-004** — All modals MUST use the shared `Modal.tsx` component for the backdrop, focus trap, and `Escape` key handler. Custom modal backdrops are PROHIBITED.

**C-005** — All tab bars MUST use the shared `Tabs.tsx` component. Custom tab `<div>` patterns are PROHIBITED.

**C-006** — All empty states MUST use `<EmptyState>` from `components/ui.tsx`. Custom empty state UI is PROHIBITED.

**C-007** — All error states MUST use `<ErrorState>` from `components/ui.tsx`. Custom error UI is PROHIBITED.

**C-008** — All loading indicators inside components MUST use `<InlineLoader>`. Full-page loading MUST use `<PageLoader>`.

**C-009** — Components that render inside lists (cards) MUST be wrapped in `React.memo()`. No exceptions for list-rendered components.

**C-010** — Role-based conditional rendering MUST use `<RoleGuard>` component. Inline `{user && user.roles...}` ternaries for role gating in JSX are PROHIBITED.

**C-011** — `React.lazy()` MUST be used for all route-level page components. Static imports of page components in `App.tsx` are PROHIBITED.

**C-012** — `React.lazy()` MUST be used for all modals and drawers heavier than 15 KB. These are not in the critical render path.

**C-013** — The `components/ui.tsx` file is the source of truth for all primitive shared UI exports. New primitive components are added here as named exports.

**C-014** — Domain-specific components belong in `components/{domain}/`. Generic UI primitives belong in `components/ui.tsx`. This separation MUST be maintained.

**C-015** — The `features/{domain}/` slice pattern MUST be used for domain-specific API calls, hooks, and components. New domain logic added directly to `lib/api.ts` is PROHIBITED.

**C-016** — All filter inputs MUST be wrapped in `<FilterChip>` or `<SearchInput>`. Raw `<input type="text">` filter patterns are PROHIBITED.

**C-017** — All status/label chips MUST use `<Badge>`. The `.chip` class is the backing implementation. Direct `.chip` usage in page files is PROHIBITED once `Badge.tsx` exists.

**C-018** — `ConfirmDialog.tsx` MUST be used for all destructive action confirmations (delete, remove, reject). Inline `window.confirm()` is PROHIBITED.

**C-019** — All avatar renders MUST use `<Avatar>` from `components/ui.tsx`. Custom avatar `<img>` or `<div>` initials patterns are PROHIBITED.

**C-020** — The `AppErrorBoundary` MUST wrap the entire route tree. New error boundaries SHOULD be added at the feature-section level for granular error recovery.

---

### RULE CATEGORY D — STATE MANAGEMENT RULES (D-001 to D-020)

**D-001** — Server state (API data) MUST live in TanStack Query. `useState` for data that comes from the API is PROHIBITED.

**D-002** — Global UI state (auth, toast) MUST live in a React Context. Prop-drilling more than 2 levels for shared state is PROHIBITED.

**D-003** — Local component UI state (modal open, active tab, form input) MUST use `useState`. Lifting this state above the component that owns it is PROHIBITED unless a sibling needs it.

**D-004** — When a page has more than 8 `useState` hooks, a `useReducer` MUST be considered to consolidate related state.

**D-005** — Filter state that affects the URL MUST be stored in URL query parameters using `useUrlState` hook. In-memory-only filter state in pages that link to from external sources is PROHIBITED.

**D-006** — `useCallback` MUST be used for all event handler functions passed as props to child components. Inline arrow functions in JSX props for heavy components are PROHIBITED.

**D-007** — `useMemo` MUST be used for all expensive derived values (filtered lists, sorted arrays, computed stats). Inline derivation in JSX render is PROHIBITED for lists > 20 items.

**D-008** — `queryClient.invalidateQueries` MUST be used after all successful mutations that change server state. `refetch()` inside mutation callbacks is PROHIBITED.

**D-009** — `queryClient.clear()` MUST be called on logout. Selective invalidation on logout is INSUFFICIENT.

**D-010** — Active tab state SHOULD be stored in URL query params (`?tab=students`) for pages with named tabs. This enables deep-linking and back-button support.

**D-011** — All form state MUST use `react-hook-form` for forms with more than 3 fields. `useState` per field for complex forms is PROHIBITED.

**D-012** — Optimistic updates MUST NOT be used without a rollback (`onError: context => queryClient.setQueryData(...)`) implementation.

**D-013** — Socket connections MUST be managed exclusively in `useChatSocket` and `useNotificationSocket`. Creating new socket instances in component files is PROHIBITED.

**D-014** — The `authStorage` utility MUST be the only mechanism for reading/writing the auth token. Direct `localStorage.getItem("token")` calls are PROHIBITED.

**D-015** — `useAuth()` MUST be the only way to access the current user object. Direct API calls to `/api/v1/auth/me` from component files are PROHIBITED.

**D-016** — `useToast()` MUST be used for all user-facing success and error notifications. `alert()` and `console.error()` for user-visible errors are PROHIBITED.

**D-017** — The `<Suspense>` boundary wrapping `<Routes>` MUST use `<PageLoader>` as its fallback. No other fallback is acceptable.

**D-018** — All `useQuery` hooks MUST specify `staleTime` appropriate to the data type. Default staleTime of `0` causes unnecessary refetches for stable data.

**D-019** — All infinite query hooks MUST implement `getNextPageParam` correctly. Returning `undefined` when there are no more pages MUST be the termination condition.

**D-020** — `queryClient.setQueryData()` MUST be used in mutation `onSuccess` for optimistic-style cache updates on simple mutations. This avoids full refetches for single-record updates.

---

### RULE CATEGORY E — ROUTING RULES (E-001 to E-010)

**E-001** — All new routes MUST be registered in `App.tsx`. Route definitions outside `App.tsx` are PROHIBITED.

**E-002** — All authenticated routes MUST be wrapped in `<RequireAuth>`. Unguarded routes that require login are a SEV-1 security violation.

**E-003** — Role-specific routes MUST be wrapped in the appropriate role guard (`<RequireRecruiter>`, `<RequireTpo>`, `<RequirePlatformAdmin>`). Role guards MUST use helpers from `roles.ts`.

**E-004** — All routes MUST be wrapped in `<PageTransitionWrapper>`. Routes without the wrapper will not animate on entry.

**E-005** — The `<PublicOnly>` guard MUST wrap the `/auth` route. Logged-in users accessing `/auth` MUST be redirected to the `from.pathname` stored in location state.

**E-006** — The catch-all `<Route path="*">` MUST redirect to `/feed`. 404 pages MUST be implemented as part of the UI Screen Bible specification.

**E-007** — Nested route parameters MUST follow the NRS naming convention. Route params not in the NRS spec require explicit approval before implementation.

**E-008** — The `useNavigate()` hook MUST be used for all programmatic navigation. `window.location.href` assignment is PROHIBITED.

**E-009** — `<Link>` MUST be used for all static navigation links. `<a href="...">` for internal routes is PROHIBITED (breaks client-side routing).

**E-010** — Deep links into tab state MUST use URL query params (`/profile?tab=skills`). Hash-based tab links (`/profile#skills`) are PROHIBITED.

---

### RULE CATEGORY F — DATA FETCHING RULES (F-001 to F-010)

**F-001** — All server state MUST be fetched via TanStack Query hooks from the `hooks/queries/` directory. `fetch()` or `axios` calls directly in component files are PROHIBITED.

**F-002** — All query hooks MUST use keys from `queryKeys.ts`. Inline string arrays as query keys are PROHIBITED.

**F-003** — All API calls MUST go through the `api` object from `lib/api.ts`. Direct `fetch()` calls to the API URL in component files are PROHIBITED.

**F-004** — Domain API functions MUST live in `features/{domain}/services/{domain}.api.ts`. Adding API call functions directly to `lib/api.ts` is PROHIBITED for new features.

**F-005** — All `useMutation` hooks MUST implement `onError` with `showToast("error", ...)`. Silent mutations are PROHIBITED.

**F-006** — All queries that require authentication MUST set `enabled: Boolean(user)` or equivalent. Queries that run when `user === null` and return 401 are a performance violation.

**F-007** — Query `staleTime` MUST be set explicitly per query. Recommended defaults: user profile = 5 min, feed = 1 min, static lists (colleges, companies) = 10 min.

**F-008** — All pagination queries MUST use `useInfiniteQuery`. Manual `page` state with `useQuery` for paginated lists is PROHIBITED.

**F-009** — The `getErrorMessage()` utility from `core/utils/format.ts` MUST be used for all error message extraction. Inline `error.message` or `String(error)` in toast calls are PROHIBITED.

**F-010** — After a successful mutation that creates a new record, the parent list query MUST be invalidated. Appending to an existing cache without server confirmation is a data integrity violation.

---

### RULE CATEGORY G — PERFORMANCE RULES (G-001 to G-010)

**G-001** — All route-level page components MUST be code-split with `React.lazy()`. Static imports of page components in `App.tsx` are PROHIBITED.

**G-002** — All components rendered inside list virtualisers or scroll containers MUST be wrapped in `React.memo()`.

**G-003** — Inline object and array literals in JSX props MUST be memoised with `useMemo` when they are passed to memoised child components.

**G-004** — All event handler functions passed to child components MUST be stabilised with `useCallback`.

**G-005** — Images MUST use `loading="lazy"` unless they are in the initial viewport (above-the-fold). Eager-loading off-screen images is PROHIBITED.

**G-006** — The `useImpressionTracking` hook MUST be integrated into `FeedCard` and `JobCard` to enable analytics tracking.

**G-007** — The `cleanLogoUrl()` utility MUST be applied to all `logoUrl` values before rendering `<img>` tags. Raw `logoUrl` in `src={}` props are PROHIBITED.

**G-008** — Modal content MUST NOT be rendered before the modal is open. Conditional rendering (`{open && <ModalContent />}`) or lazy loading MUST be used.

**G-009** — Derived list computations (sorting, filtering) MUST be in `useMemo`. Re-computing on every render for lists > 10 items is a performance violation.

**G-010** — The production `vite build` MUST produce no chunk larger than 300 KB (after minification). Chunks exceeding this require bundle analysis and splitting.

---

### RULE CATEGORY H — FILE ORGANISATION RULES (H-001 to H-010)

**H-001** — Page components live in `pages/`. Layout components live in `layout/`. Shared UI primitives live in `components/ui.tsx`. Domain components live in `components/{domain}/`. Feature slices live in `features/{domain}/`.

**H-002** — No component file MAY be placed in the root of `src/`. All files MUST be under a named subdirectory.

**H-003** — Query hooks MUST live in `hooks/queries/{domain}Queries.ts`. Custom non-query hooks live in `hooks/`.

**H-004** — Type definitions MUST live in `core/types/models.ts`. Component-local type definitions are PROHIBITED except for component-internal `type TabType = ...` style aliases.

**H-005** — Utility functions MUST live in `core/utils/{name}.ts`. Utility functions defined inside component files are PROHIBITED.

**H-006** — The `features/` directory MUST contain only domain-specific API services, domain hooks, and domain components. Cross-domain utilities MUST NOT live inside a feature slice.

**H-007** — Each feature slice MUST follow the structure: `features/{domain}/services/{domain}.api.ts`, `features/{domain}/hooks/use{Domain}*.ts`, `features/{domain}/components/*.tsx`.

**H-008** — The `lib/` directory contains only the API client aggregator (`api.ts`), query client singleton (`queryClient.ts`), and query key factory (`queryKeys.ts`). New files in `lib/` require explicit justification.

**H-009** — Test files MUST be co-located with their source files using the `.test.tsx` suffix. A separate `test/` directory is permitted only for integration/E2E tests.

**H-010** — Import paths MUST use relative imports within the same domain and absolute-style imports (`../core/...`, `../lib/...`) for cross-domain dependencies. Path aliases (`@/`) SHOULD be configured if the project grows beyond 50 source files.

---

### RULE CATEGORY I — ACCESSIBILITY RULES (I-001 to I-010)

**I-001** — All interactive elements (`<button>`, `<a>`, `<input>`) MUST be keyboard-accessible (focusable, activatable with `Enter`/`Space`).

**I-002** — All modals MUST implement a focus trap. Focus MUST not escape to background content while a modal is open.

**I-003** — All modals MUST close on `Escape` key press. This is handled by `Modal.tsx`.

**I-004** — All `<img>` elements MUST have descriptive `alt` attributes. `alt=""` is acceptable only for purely decorative images.

**I-005** — All form fields MUST have associated `<label>` elements (using `for`/`htmlFor`). Placeholder-only labels are PROHIBITED.

**I-006** — All icon-only buttons MUST have an `aria-label` attribute describing the action.

**I-007** — Loading states MUST communicate status to screen readers using `aria-live="polite"` or `role="status"`.

**I-008** — Colour contrast MUST meet WCAG AA standards (4.5:1 for text, 3:1 for UI components). The design token system is calibrated for this — do not override with lower-contrast values.

**I-009** — Tab navigation MUST follow a logical DOM order. CSS-only reordering that diverges from DOM order (`order:` in flex) is PROHIBITED for interactive elements.

**I-010** — Error messages in forms MUST be associated with their field using `aria-describedby`.

---

### RULE CATEGORY J — GENERAL ENGINEERING RULES (J-001 to J-010)

**J-001** — No `console.log`, `console.warn`, or `console.error` statements are ALLOWED in production code. Use the `useToast` hook for user-facing errors.

**J-002** — No commented-out code blocks are ALLOWED in committed code. Remove dead code entirely; version control preserves history.

**J-003** — All new features MUST have at least one unit test in a co-located `.test.tsx` file before merging.

**J-004** — All PRs that touch `usePlatformQueries.ts` (or its split files) MUST include passing `usePlatformQueries.test.tsx` results.

**J-005** — The ESLint configuration in `eslint.config.js` MUST be respected. No `// eslint-disable` comments are ALLOWED without a documented justification in the same PR.

**J-006** — The `npm run build` command MUST pass with zero warnings before any PR is merged. TypeScript errors MUST NOT be suppressed with `@ts-ignore` or `@ts-nocheck`.

**J-007** — All form submissions MUST be protected against double-submission using the mutation `isPending` state to disable the submit button.

**J-008** — All API calls involving user-generated content (post creation, profile updates) MUST sanitise input on the server. The frontend MUST NOT attempt to sanitise HTML; it MUST NOT render raw HTML from API responses.

**J-009** — Authentication token MUST be sent via the `Authorization: Bearer {token}` header, managed by `core/api/client.ts`. Components MUST NOT read or write the auth token directly.

**J-010** — The `refreshUser()` function from `AuthContext` MUST be called after any mutation that changes the current user's roles or profile. Stale user state after role changes is a security concern.

---

## APPENDIX A — CODEBASE METRICS

| Metric | Value |
|---|---|
| Total source files | ~90 |
| Total page components | 28 |
| Total admin panel components | 15 |
| Total shared components | ~35 |
| Largest file | `usePlatformQueries.ts` — 182 KB |
| Largest page | `ProfilePage.tsx` — 104.9 KB |
| Total route count | 36 |
| Total React context providers | 2 (Auth, Toast) |
| Custom hooks | 5 (usePlatformQueries, useChatSocket, useNotificationSocket, useImpressionTracking, useFileUpload) |
| Test files | 2 (usePlatformQueries.test.tsx, AuthContext.test.tsx) |
| Design token variables | 28 (CSS custom properties) |
| Tailwind custom animations | 8 |
| Tailwind custom shadows | 6 |
| Violations registered | 36 |
| Implementation rules | 120 |

---

## APPENDIX B — DEPENDENCY INVENTORY

| Package | Version | Category |
|---|---|---|
| `react` | ^19.2.1 | Core |
| `react-dom` | ^19.2.1 | Core |
| `react-router-dom` | ^7.15.1 | Routing |
| `@tanstack/react-query` | ^5.100.14 | Server state |
| `socket.io-client` | ^4.8.3 | Real-time |
| `lucide-react` | ^0.468.0 | Icons |
| `react-hook-form` | ^7.80.0 | Forms (partially used) |
| `@hookform/resolvers` | ^5.4.0 | Form validation |
| `zod` | ^4.4.3 | Schema validation (available, not widely used) |
| `tailwindcss` | ^3.4.18 | Styling |
| `vite` | ^7.2.4 | Build |
| `typescript` | ^6.0.3 | Types |
| `vitest` | ^4.1.9 | Unit testing |
| `@playwright/test` | ^1.61.0 | E2E testing |
| `@testing-library/react` | ^16.3.2 | Component testing |

**Underutilised dependencies (already installed, not widely adopted):**

| Package | Current Use | Potential Use |
|---|---|---|
| `react-hook-form` | 1-2 forms | Should be used in all complex forms |
| `zod` | Available | Should validate API response shapes at runtime |
| `@playwright/test` | Available | Should cover all 36 routes in E2E |

---

## APPENDIX C — DECISION LOG

| Decision | Rationale |
|---|---|
| Keep `usePlatformQueries.ts` as a re-export barrel | Prevents breaking all 28 pages during Sprint 3 — backward-compatible migration |
| Do not introduce Zustand or Redux | TanStack Query + React Context is sufficient; adding a new state library mid-refactor increases risk |
| Do not migrate from Tailwind to pure CSS | The token system in `index.css` bridges Tailwind and tokens correctly; migration cost exceeds benefit |
| Do not rewrite pages — decompose only | Full rewrites introduce regression risk; decomposition preserves tested business logic |
| Keep `AppLayout.tsx` as a single file | The layout shell is a cohesive unit; splitting navigation from layout adds indirection without benefit |
| Adopt URL state for filters in Sprint 10 (not Sprint 1) | Requires `useUrlState` hook first; URL sync is a DX improvement, not a blocker for early sprints |

---

*Document end. ENGINEERS_PLATFORM_FRONTEND_REFACTOR_AUDIT.md — Version 1.0 — Frozen.*
