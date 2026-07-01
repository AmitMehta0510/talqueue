# Engineers Platform — Design System Specification (DSS)

**Document Classification:** Product Design & UI Constitution  
**Status:** Official Specification [ONLY Source of Truth]  
**Version:** 1.0  
**Authors:** Principal Design Systems Architect, Staff Product Designer, Senior UI Engineer  

---

## SECTION 1 — DESIGN PHILOSOPHY

The Engineers Platform visual and experience system is engineered under a single core directive: **speed, utility, and verified transparency**. It is a tool for high-performance builders and corporate recruiters, not a social playground. Like industry-defining products from Linear, Stripe, and Figma, the interface remains out of the user's way, providing a high-utility, visually calm, and mathematically precise canvas for developer accomplishments.

### 1.1 Product Style & Visual Identity
The visual identity is defined by a **Minimal obsidian-slate grid** overlayed with **Electric Indigo accents**. We call this theme **Precision Minimalist**. It avoids loud gradients, gaming-style gamification, or distracting animation clutter. The platform prioritizes structural lines, dark mode comfort, and verified indicators.

```
+-----------------------------------------------------------+
|                    PRECISION MINIMALIST                   |
+-----------------------------+-----------------------------+
|          UTILITY            |         TRANSPARENCY        |
|  - Sharp layout borders     |  - Isolation of verified   |
|  - Monospace code views     |    versus unverified data  |
|  - High reading density     |  - Real-time GitHub sync    |
+-----------------------------+-----------------------------+
```

### 1.2 Brand Personality
The brand reflects three core design philosophies:
* **Ex-Apple Rigor:** Fluid transitions, precise alignment grids, consistent borders, and meticulous state management.
* **Linear-like Efficiency:** Performance-first keyboard focus, low latency page transitions, and low-friction, high-density dashboard layouts.
* **Notion-like Flexibility:** Customizable student profiles acting as interactive, structured dossiers rather than rigid, static resume views.

### 1.3 Minimalism & Professionalism Rules
1. **Loudness Reduction:** No flashy animations, cartoon illustrations, or bright multi-colored badges.
2. **Information Density:** High utility density. Dashboard panels use tight spacing, explicit tabular records, and clean grid layouts.
3. **Verified vs. Unverified Gating:** Self-reported data (unverified) has no accent styling and uses secondary muted typography. Verified metrics (e.g., college-verified status, GitHub audited scores) receive the official indigo checkmark badge.
4. **Action-First Layouts:** Views are organized around user actions (Apply, Verify, Chat) rather than scrolling feeds.

---

## SECTION 2 — DESIGN TOKENS

These design tokens are implemented system-wide in `index.css` via CSS custom properties and extending Tailwind's utility class layers.

### 2.1 Color Palette Mapping

| Token Name | Light Mode Value | Dark Mode Value | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| `--bg-base` | `#f0f2ff` | `#090909` | Root page background |
| `--bg-surface` | `#ffffff` | `#0d0d0f` | Primary panels, cards, and modal content |
| `--bg-surface-2` | `#f5f6ff` | `#111118` | Secondary panels and select boxes |
| `--bg-surface-3` | `#eef0ff` | `#18181f` | Hovered panel states and list items |
| `--bg-overlay` | `rgba(0, 0, 0, 0.45)` | `rgba(0, 0, 0, 0.85)` | Modal backdrops and drawer overlays |
| `--border` | `rgba(0, 0, 0, 0.08)` | `rgba(255, 255, 255, 0.05)`| Default thin structural borders |
| `--border-strong` | `rgba(0, 0, 0, 0.14)` | `rgba(255, 255, 255, 0.10)`| Interactive fields and divider lines |
| `--border-focus` | `#6366f1` | `#6366f1` | Active inputs and focused states |
| `--brand` | `#4f46e5` | `#6366f1` | Primary action colors and brand identities |
| `--brand-light` | `#eef2ff` | `rgba(99, 102, 241, 0.10)` | Chip backgrounds, tags, and secondary fills |
| `--brand-glow` | `rgba(79, 70, 229, 0.18)`| `rgba(99, 102, 241, 0.18)`| Button hovers, focus rings, glow markers |

### 2.2 Text Color Tokens

| Token Name | Light Mode Value | Dark Mode Value | Contrast Level / Purpose |
| :--- | :--- | :--- | :--- |
| `--text-primary` | `#0f0e1e` | `#f4f4f6` | High-contrast body text, headings |
| `--text-secondary`| `#4b4680` | `#9ca3af` | Mid-contrast descriptions, labels |
| `--text-muted` | `#7c7aa6` | `#6b7280` | Low-contrast placeholders, metadata |
| `--text-inverse` | `#ffffff` | `#090909` | Contrast text inside colored actions |

### 2.3 Spacing Scale

Spacing operates on a 4px logical grid:

| Tailwind Spacing | CSS Rem Value | Pixel Value | Semantic Application |
| :--- | :--- | :--- | :--- |
| `0` | `0rem` | `0px` | No spacing / absolute resets |
| `0.5` | `0.125rem` | `2px` | Micro borders and indicator alignment |
| `1` | `0.25rem` | `4px` | Tiny gaps, badge paddings, list-item offset |
| `1.5` | `0.375rem` | `6px` | Inline chip spacing |
| `2` | `0.5rem` | `8px` | Small list items gap, inside field padding |
| `2.5` | `0.625rem` | `10px` | Default badge horizontal padding |
| `3` | `0.75rem` | `12px` | Standard button paddings, card content gaps |
| `4` | `1rem` | `16px` | Page content margins, inside card padding |
| `5` | `1.25rem` | `20px` | Standard layout divisions, card body padding |
| `6` | `1.5rem` | `24px` | Desktop grid margins, panel separations |
| `8` | `2rem` | `32px` | Large section layout blocks |
| `10` | `2.5rem` | `40px` | Authentication screens, onboarding spacing |

### 2.4 Border Radius Scale

| Token Name | Rem Value | Pixel Value | Application |
| :--- | :--- | :--- | :--- |
| `rounded` | `0.25rem` | `4px` | Small items (tags, badges) |
| `rounded-md` | `0.375rem` | `6px` | Standard buttons, input elements |
| `rounded-lg` | `0.5rem` | `8px` | Dropdowns, inner card panels |
| `rounded-xl` | `0.75rem` | `12px` | Dashboard cards, panels |
| `rounded-2xl`| `1rem` | `16px` | Frosted glass blocks, details modals |
| `rounded-3xl`| `1.5rem` | `24px` | Extended dashboard widget shells |
| `rounded-full`| `9999px` | `9999px` | Avatars, status pills |

### 2.5 Shadow Scale

- **Panel Shadow (`shadow-panel`):** `0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)`
- **Card Shadow (`shadow-card`):** `0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`
- **Glass Shadow (`shadow-glass`):** `0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)`
- **Glass Dark Shadow (`shadow-glass-dark`):** `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)`
- **Glow Shadow (`shadow-glow`):** `0 0 20px rgba(99, 102, 241, 0.30)`
- **Glow SM Shadow (`shadow-glow-sm`):** `0 0 10px rgba(99, 102, 241, 0.18)`
- **Toast Shadow (`shadow-toast`):** `0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.10)`

### 2.6 Transitions & Curves

- **Default Transition Curve:** `transition-all duration-150 ease-out`
- **Interactive Lift Curve:** `transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)`
- **Spring Transition Curve (`spring`):** `cubic-bezier(0.34, 1.56, 0.64, 1)` (used for toasts, scale-in items, round timelines)

---

## SECTION 3 — TYPOGRAPHY SYSTEM

Typography on the platform relies entirely on the **Inter** sans-serif font family to maximize legibility of technical datasets and numbers. Monospaced rendering is strictly locked to code elements.

### 3.1 Font Family Tokens
* **Display/Heading/Body:** `Inter, ui-sans-serif, system-ui, sans-serif`
* **Code / Commits:** `monospace, SFMono-Regular, Menlo, Monaco, Consolas`

### 3.2 Typography Scale

| Token Class | Font Size | Line Height | Letter Spacing | Semantic Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `text-xxs` | `0.65rem / 10px` | `1rem` | `+0.01em` | Tiny tags, sub-metrics description |
| `text-xs` | `0.75rem / 12px` | `1.25rem`| `0` | Small metadata, date stamps, labels |
| `text-sm` | `0.875rem / 14px`| `1.5rem` | `0` | Default body copy, form fields, descriptions |
| `text-base` | `1rem / 16px` | `1.5rem` | `-0.01em` | Table headers, chip text, sub-sections |
| `text-lg` | `1.125rem / 18px`| `1.75rem`| `-0.015em`| Metric values, cards title, search input |
| `text-xl` | `1.25rem / 20px` | `1.75rem`| `-0.02em` | Profile titles, section headers |
| `text-2xl` | `1.5rem / 24px` | `2rem` | `-0.022em`| Page titles, modal headers |
| `text-3xl` | `1.875rem / 30px`| `2.25rem`| `-0.025em`| Dashboard summaries, hero metrics |
| `text-4xl` | `2.25rem / 36px` | `2.5rem` | `-0.03em` | Landing headers, auth page branding |

---

## SECTION 4 — GRID SYSTEM

The platform layout adapts across five responsive breakpoints, organizing content into high-density columns.

### 4.1 Responsive Breakpoints

* **Mobile (`sm`):** `640px` and below.
* **Tablet (`md`):** `768px` to `1023px`.
* **Laptop (`lg`):** `1024px` to `1279px`.
* **Desktop (`xl`):** `1280px` to `1535px`.
* **Wide Desktop (`2xl`):** `1536px` and above.

### 4.2 Page Containers & Margins
* **Global Max Width:** `max-w-7xl` (`80rem` / `1280px`) centered with `mx-auto`.
* **Inner Content Max Width (e.g. Auth, Settings):** `max-w-3xl` (`48rem` / `768px`).
* **Margins:** Mobile: `px-4` | Tablet: `px-6` | Desktop: `px-8`.
* **Gutters:** Standard flex gaps are `gap-4` (16px) or `gap-6` (24px) for desktop columns.

### 4.3 Column Rules
* **1-Column Layout:** Mobile feed, chat conversation view.
* **2-Column Layout:** Split pane `lg` and above (`2/3` content on left, `1/3` dashboard context or filters on right).
* **3-Column Grid:** Projects and Hackathons display grids (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).

---

## SECTION 5 — ICONOGRAPHY

Iconography provides immediate, language-agnostic utility. We use `lucide-react` icons configured under strict visual sizing guidelines.

### 5.1 Icon Sizing Scales
- **Tiny (`11-12px`):** Used inside status chips (e.g., checkmarks on verified badges).
- **Small (`14-15px`):** Used inside standard input forms, buttons, and card labels.
- **Medium (`20px`):** Navigation bar headers, placeholder panels.
- **Large (`22px`):** Empty states indicators, celebration panels.

### 5.2 Stroke Width
All icons must utilize a uniform line weight of **2px** (stroke width) to remain legible across dark and light states.

### 5.3 Semantic Icon Mappings

- **Verification:** `ShieldCheck` (Indigo / Dark Indigo)
- **Error / Danger:** `AlertTriangle` | `Trash2` (Red)
- **Edit:** `Pencil` (Slate / Secondary Muted)
- **Team / Users:** `Users` | `Users2`
- **Academic / Colleges:** `GraduationCap`
- **Corporate / Jobs:** `Briefcase` | `BriefcaseBusiness` | `Building2`
- **Code / Commits:** `Code2`
- **Hackathons:** `Gavel`
- **Events / Schedules:** `Calendar`

---

## SECTION 6 — COMPONENT INVENTORY

This master inventory classifies every reusable front-end component implemented in the platform codebase.

### 6.1 Base UI Components
1. **Button (`btn-primary`, `btn-secondary`, `icon-btn`):** Core action buttons supporting text, icons, disabled states, and hover scales.
2. **Avatar (`Avatar`):** Render circular images or name initials fallbacks with three sizing scales.
3. **EmptyState (`EmptyState`):** Full-pane empty lists placeholder containing descriptive headers, custom Lucide icons, and action triggers.
4. **InlineLoader (`InlineLoader`):** Inline spinner for localized progress states.
5. **PageLoader (`PageLoader`):** Full-screen frosted-glass overlay containing nested double-spinning rings and custom headers.
6. **ErrorState (`ErrorState`):** Inline warning pane extending EmptyState with click retry buttons.
7. **SkeletonBlock (`SkeletonBlock`):** Shimmer-gradient loading element.
8. **AppErrorBoundary (`AppErrorBoundary`):** React error boundary catching render crashes, displaying an ErrorState fallback.
9. **ConfirmDialog (`ConfirmDialog`):** Modal window gated confirmation prompt for destructive actions (e.g., deletions, drive cancellations).

### 6.2 Complex Cards Component
1. **ExperienceCard (`ExperienceCard`):** Card displaying work positions, verification checkmarks, and inline OTP work email verifiers.
2. **EducationCard:** Render details of academic history, scores, and verifying authority status.
3. **SkillCard / SkillList:** Render tags representing student expertise with BEGINNER, INTERMEDIATE, ADVANCED, and EXPERT color codes.
4. **ProjectCard (`ProjectCard`):** Displays project highlights, tech stack tags, contributor avatars, and direct links to GitHub sync.
5. **HackathonCard (`HackathonCard`):** Renders hackathon banners, timelines, registrations count, rules, and scoring portals.
6. **SocialCards (`SocialCards`):** Renders network connection invitations and peer endorsements prompts.
7. **CompanyFeedCard (`CompanyFeedCard`):** Corporate status post card.
8. **FeedCard (`FeedCard`):** Social update card supporting markdown text, code blocks, likes, comments, and tags.

### 6.3 Specialized Forms & Modals
1. **ComposePost (`ComposePost`):** Formatting rich post editor for public feeds.
2. **CreateProjectForm (`CreateProjectForm`):** Form modal linking public/private projects to synced GitHub repos.
3. **ExternalApplyModal (`ExternalApplyModal`):** Redirection panel parsing resumes and transferring eligibility tokens to corporate ATS systems.
4. **JobPostModal (`JobPostModal`):** Split-pane layout form configurer for recruiters to publish job openings.
5. **RequestReferralModal (`RequestReferralModal`):** Portfolio linking modal for referral requests.

### 6.4 Pipelines & Coordination Dashboards
1. **KanbanPipeline (`KanbanPipeline`):** Multi-column candidate sourcing recruiter drag-board.
2. **ApplicationKanbanBoard (`ApplicationKanbanBoard`):** Placements pipeline board tracking student applications stages (Screening, Interview, Offer).
3. **CreateDriveModal (`CreateDriveModal`):** TPO form for scheduling university campus placement drives.
4. **DriveApplicantsModal (`DriveApplicantsModal`):** Comprehensive tabular grid for reviewing applicant scores and locking shortlist selections.
5. **DriveInviteModal (`DriveInviteModal`):** Invites specific company profiles to participate in campus drives.
6. **TpoInviteCompanyModal (`TpoInviteCompanyModal`):** B2B outreach modal.

---

## SECTION 7 — COMPONENT SPECIFICATION

Specifications for core components implemented across the platform.

```
Component Lifecycle States:
[Default] ──(Hover)──> [Hover/Active]
   │
   ├──(Focus / Tab)──> [Focus Outline]
   │
   ├──(Disabled / Locked)──> [Opacity 50% / Blocked cursor]
   │
   └──(Loading/Fetch)──> [Skeleton Shimmer State]
```

### 7.1 Buttons
* **Purpose:** Triggers page actions and state transitions.
* **Variants:**
  - `btn-primary`: Brand blue-indigo background, text-inverse label.
  - `btn-secondary`: White surface border-strong outline, brand hovers.
  - `icon-btn`: Square 9x9 (36px) border-base panels with inline Lucide icon content.
* **States & CSS Rules:**
  - *Default:* Padding `px-4 py-2 text-sm font-semibold`.
  - *Hover:* primary shifts brightness by 10%; secondary transitions background to brand-light.
  - *Focus:* Outline ring matching `--border-focus` offset by 2px.
  - *Active:* `active:scale-[0.97]` spring rebound scale.
  - *Disabled:* `opacity-50 cursor-not-allowed` with pointer-events blocked.
* **Accessibility:** Full keyboard tab-index support, explicit `type="button"` attributes.

### 7.2 Text Inputs & Select Fields (`field`)
* **Purpose:** Ingests alphanumeric details and filters queries.
* **States & CSS Rules:**
  - *Default:* `w-full rounded-lg border px-3 py-2 text-sm bg-surface border-strong`.
  - *Focus:* `border-brand-focus` ring with `box-shadow: 0 0 0 3px var(--brand-glow)`.
  - *Disabled:* Muted placeholder and dark slate input mask.
* **Accessibility:** Labels programmatically matched to inputs via `htmlFor`. Keyboard arrow controls for select lists.

### 7.3 Avatars
* **Purpose:** Personalizes profiles and cards.
* **Sizes:**
  - `sm`: Height/Width: 32px (used in comment sections and tables).
  - `md`: Height/Width: 44px (used in main feed headers and header dropdowns).
  - `lg`: Height/Width: 80px (used in profile views headers).
* **States:** Fallback to name initials with `bg-brand-light text-brand font-bold` when `avatarUrl` is null.

### 7.4 SkeletonBlock
* **Purpose:** Shimmer placeholder preventing visual layouts shifting during data fetch.
* **CSS Rules:** Linear gradients sliding from `--shimmer-base` to `--shimmer-shine` over `1.6s` linear repeat intervals.

---

## SECTION 8 — LAYOUT SYSTEM

The application layout enforces clear hierarchy and dark-mode compatibility across its layout hierarchy:

```
+-------------------------------------------------------------+
|                      [STICKY HEADER]                        |
|  [Logo] [Search Box]   [Nav Links...]   [Notify] [Profile]  |
+-------------------------------------------------------------+
|                                                             |
|  [MAIN OUTLET CONTAINER]                                    |
|  Wrapper containing:                                        |
|  - Feed pages                                               |
|  - Placements grids                                         |
|  - Dashboards grids                                         |
|                                                             |
+-------------------------------------------------------------+
|  [MOBILE BOTTOM TAB BAR] (Hidden on desktop layout)          |
+-------------------------------------------------------------+
```

### 8.1 Application Shell (`AppLayout.tsx`)
* **Header:** Sticky height 64px (`h-16`) frosted glass (`backdrop-blur(20px)`) overlay containing brand elements, search bars, navigation buttons, and notification centers.
* **Mobile Layout Reflow:** Below `1024px` (`lg`), standard nav links hide. Top header displays mobile menus toggle while bottom navigation bars reveal five primary routes: Home (`/feed`), Discover (`/discover`), Jobs (`/jobs`), Chats (`/chat`), and Profile (`/profile`).

### 8.2 Grid Configurations
* **Dashboard Split Pane:** Centered `max-w-7xl` container. Main panels utilize 8-column spans (`col-span-8` / `2/3` width), while search filters or profiles status trackers fit in 4-column spans (`col-span-4` / `1/3` width).
* **Cards Grid:** Standard catalog pages use `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`.

---

## SECTION 9 — CARD SYSTEM

Cards group related content into distinct structural boxes. Every card uses `panel` borders and shadows.

### 9.1 Card Catalog Details

| Card Variant | Borders & Shadows | Hover Behaviors | Inside Paddings | Verified Indicators |
| :--- | :--- | :--- | :--- | :--- |
| **FeedCard** | `--border` / `shadow-card` | Standard flat border | `p-4` (16px) | Verified badges next to author name |
| **ExperienceCard**| `--border` / `shadow-card` | `hover-lift` (`-4px` shift) | `p-5` (20px) | Work-domain checkmark, inline OTP status |
| **ProjectCard** | `--border` / `shadow-card` | `hover-lift` transition | `p-4` (16px) | GitHub audited score badge, stars count |
| **HackathonCard** | `--border` / `shadow-card` | Hover-lift border glows | `p-5` (20px) | Locked scoring checkmark from Judges |
| **SocialCards** | `--border` / `shadow-card` | Flat border shifts | `p-4` (16px) | Peer verified skill endorsement ticks |

---

## SECTION 10 — DATA DISPLAY

The platform renders heavy datasets cleanly using structured columns and interactive control toggles.

### 10.1 Tabular Data Grids
- **Drive Candidate Tables:** Rendered inside placement panels. Configured with fixed-height rows, small avatars (`sm`), and text-xs columns to avoid truncation. Columns align: Left (Student name & batch) -> Center (GPA & Engineering Score) -> Right (Eligibility status & actions).
- **Table Controls:** Top horizontal layout wraps real-time search queries and filters selectors (`Select`, `Checkbox`).
- **Pagination:** Sticky footer containing candidate row ranges (e.g., "Showing 1-10 of 124 candidates") and chevron navigation keys.

### 10.2 Kanban Boards
- **ApplicationKanbanBoard:** Student placement status dashboard tracking applications:
  `Screening` ➔ `Coding Round` ➔ `Interview` ➔ `Offer`.
- **KanbanPipeline:** Recruiter console candidates sourcing tracker. Cards support drag-and-drop actions to change statuses.

---

## SECTION 11 — FORM DESIGN

Forms are designed around **validation predictability** and **data safety**.

### 11.1 Forms Typology
1. **Single-Step forms:** Compose post feeds, connection requests. Compact layouts containing input boxes and inline submit actions.
2. **Multi-Step Wizards:** Business onboarding fields tracking institution details. Configured with horizontal numbers trackers indicating step indexes.
3. **Modal Dialogs:** Quick configurations (e.g., job postings, project additions) loaded in frosted-glass modals overlaying backdrops.

### 11.2 Validation & State Responses
* **Delayed Error States:** Fields never render errors on initial focus or during typing before input threshold is crossed. Validation highlights trigger on input field blur (`onBlur`).
* **Visual States:** Error fields receive a secondary warning red outline. Successful validations display standard borders with green checkmark markers.

### 11.3 Data Loss Prevention (Autosave)
* **Local Storage Cache:** Draft inputs in rich forms (e.g., compose posts, job descriptions) are written to local state and cached in `localStorage` in real-time, preventing input loss if session tokens expire or page refreshes occur.

---

## SECTION 12 — MOTION SYSTEM

Motion guidelines ensure animations improve spatial awareness without causing cognitive distraction.

### 12.1 Keyframe Animations

| Animation Name | Keyframe Rule | Duration / Easing | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| `fade-in` | `opacity: 0` to `1` | `0.2s` / `ease-out` | Basic overlays and button clicks |
| `fade-up` | `translateY(8px)` to `0` | `0.25s` / `ease-out` | Page route entry animations |
| `slide-in-right`| `translateX(16px)` to `0`| `0.25s` / `ease-out` | Notifications dropdown slide |
| `slide-in-up` | `translateY(24px) scale(0.97)` to `0 scale(1)` | `0.3s` / `spring` | Modal panel popup animations |
| `shimmer` | `background-position: -200%` to `200%` | `1.6s` / `linear infinite` | Card loading state placeholders |
| `toast-in` | `translateX(110%) scale(0.9)` to `0 scale(1)` | `0.35s` / `spring` | Alert toast entering screen |
| `scale-in` | `scale(0.95)` to `1` | `0.15s` / `ease-out` | Dropdown overlays expand |

### 12.2 Celebration Confetti Rules
- Confetti triggers must be limited to **major achievements** (Jobs Placements Confirmed, Skills Audits Approved, Hackathons Victory).
- Confetti runs for a maximum duration of **3 seconds**, utilizing low-density sharded primary brand colors to avoid visual blocking.

### 12.3 Reduced Motion Accessibility
- The CSS media rule `@media (prefers-reduced-motion: reduce)` overrides standard scales, transitions, and shimmers to flat fades to support motion-sensitive users.

---

## SECTION 13 — RESPONSIVE DESIGN

Responsive behaviors guarantee full feature functionality across all viewport dimensions.

### 13.1 Adaptive Columns Reflow

```
Layout Adaptation Flow:
[Desktop: 3 Columns Grid] ➔ [Tablet: 2 Columns Grid] ➔ [Mobile: 1 Column Vertical List]
[Desktop: Sidebar Navigation] ➔ [Mobile: Bottom Navigation Bar + Header Dropdown]
```

### 13.2 Viewport Navigation Adaptations
- **Header:** Below `lg` (`1024px`), desktop header nav links are hidden. Mobile menus toggle displays from a slide-out drawer, while the bottom nav bar maps primary actions (`Home`, `Discover`, `Jobs`, `Chats`, `Profile`) for easy thumb reach.
- **Tabular Grids:** Tables wrap in `overflow-x-auto` blocks to prevent text truncation on small mobile screens.
- **Split-Panes:** Desktop left-right panes collapse into standard top-down elements on tablet and mobile viewports.

---

## SECTION 14 — DARK MODE

Dark mode utilizes pure neutral obisidian tones rather than blue/violet tints to ensure eye comfort under low light.

### 14.1 Elevation Variable Map

| Surface Layer | Light Mode Value | Dark Mode Value | Semantic Utilization |
| :--- | :--- | :--- | :--- |
| Root Canvas | `#f0f2ff` (Soft Blue) | `#090909` (Pure Matte Black) | Base page layout backdrop |
| Level 1 Panel | `#ffffff` (White) | `#0d0d0f` (Matte Slate Black) | Primary cards, content boxes |
| Level 2 Panel | `#f5f6ff` (Light Violet) | `#111118` (obsidian-gray) | Secondary selects, inline fields |
| Level 3 Panel | `#eef0ff` (Gray Blue) | `#18181f` (obsidian-light) | Active selections, list item hover |

### 14.2 Borders & Shadows
- Borders scale from light gray opacity to soft metallic lines (`rgba(255,255,255,0.05)`).
- Shadows transition from soft card drop shadows (`shadow-card`) to dark neon glass offsets (`shadow-glass-dark`).

---

## SECTION 15 — ACCESSIBILITY

The platform follows WCAG 2.1 AA parameters to ensure system equity.

### 15.1 Contrast & Font Sizing
* **Contrast Ratios:** Text colors `--text-primary` and `--text-secondary` provide contrast ratios exceeding `4.5:1` in both dark and light modes.
* **Min Text Size:** Body text is locked to `0.875rem` (14px) and never falls below `0.65rem` (10px) even for meta descriptions.

### 15.2 Keyboard & Screen Reader Focus
* **Outline Ring:** Focus outlines wrapper standard active fields using custom `--border-focus` indicators. Focus traps are active on dialog layers.
* **Semantic tags:** Navigation layouts utilize HTML5 structural headers (`nav`, `main`, `header`, `section`). Interactive icons use explicit `aria-label` definitions.
* **Touch Targets:** All interactive icons, chips, and links on mobile map boundaries equal to or exceeding `48x48px`.

---

## SECTION 16 — DESIGN QA CHECKLIST

Every new page and feature pull request must satisfy these QA gates before being approved for staging:

### 16.1 Design QA Verification Criteria

- [ ] **Token Alignment:** No hardcoded hex codes, pixel sizes, or arbitrary color strings are written in tailwind utility definitions. All elements reference `--border`, `--brand`, `--bg-surface`, etc.
- [ ] **Dark Mode Compliancy:** Contrast values checked under system dark variables toggles. Font colors automatically transition from `--text-primary` (dark mode silver-white) to `--text-primary` (light mode obsidian-indigo).
- [ ] **Interactive Hover Scales:** Hover elements (buttons, interactive card links) implement spring scaling curves (`active:scale-[0.97]`) or vertical lift translations (`-4px` hover-lift).
- [ ] **Accessibility Focus Rings:** Focused input fields and buttons must display high-contrast rings (`--border-focus`) when tabbed via keyboard controls. Focus trapping must be validated on modal components.
- [ ] **Empty and Loading Skeletons:** Missing data feeds must trigger EmptyState widgets with customized action keys. Initial loading screens render shimmer skeletons matching final panel heights.
- [ ] **Verified Icons Isolation:** Official checkmarks indicators (`ShieldCheck`) are locked to records and profiles that have completed automated domain OTP approvals or GitHub commitment logs evaluations.

---

## SECTION 17 — CURRENT UI AUDIT

This audit identifies visual style inconsistencies and design debt in the current frontend codebase.

### 17.1 Specific UI & Spacing Inconsistencies

1. **App Header (`AppLayout.tsx`):**
   - Logo container utilizes hardcoded `bg-indigo-700` and `hover:bg-indigo-600` classes instead of matching system `--brand` tokens.
   - Pinned search bar maps static border colors instead of dynamic `--border` variables.
2. **Authentication Page (`AuthPage.tsx`):**
   - OAuth buttons and login submit fields fail to implement standard spring timing curves on mouse hovers.
   - Text inputs lack programmatically linked accessibility descriptions (`htmlFor`).
3. **Feed Page (`FeedPage.tsx`):**
   - Custom post compose panel utilizes hardcoded inner margin structures instead of alignment scales.
   - Mobile feeds list is missing card gap boundaries, causing adjacent blocks to appear joined on smaller viewports.
4. **Profile Dossier View (`ProfilePage.tsx`):**
   - PDF Resume parser trigger button has custom padding offsets that deviate from standard button components.
   - GitHub commitment log displays utilize raw background colors rather than CSS system variables.
5. **Communities Page (`CommunitiesPage.tsx`):**
   - Lacks categorical thread segmentation templates, resulting in nested text overlap.
6. **Events Dashboard (`EventsPage.tsx`):**
   - RSVP confirmation trigger triggers status updates in state but has no calendar file (.ics) or ticket download outputs.
7. **Modals overlay layout (`JobPostModal.tsx` & `CreateDriveModal.tsx`):**
   - Dialog windows lack keyboard focus trapping configurations, allowing tabs navigation selectors to escape the overlay and edit records in the underlying pages.

---

## SECTION 18 — DESIGN DEBT REPORT

The following refactor directives identify duplicated markup blocks that must be replaced by reusable design system components.

### 18.1 Master Refactoring Schedule

| Component to Refactor | Duplicated Instances / Location | Target Component | Priority |
| :--- | :--- | :--- | :--- |
| **Unified Buttons** | JobPostModal, CreateDriveModal, AuthPage | `btn-primary` / `btn-secondary` | 🔴 **High** |
| **Unified Loaders** | SearchResultsPage, ProfilePage, TpoDashboard | `InlineLoader` / `PageLoader` | 🔴 **High** |
| **Modal Focus Wrapper**| JobPostModal, DriveApplicantsModal | FocusTrap Overlay Wrapper | 🟡 **Medium** |
| **Verification Forms** | ExperienceCard, EducationCard verifiers | Reusable Verification Form widget | 🟡 **Medium** |
| **Confirmation Popups**| Delete triggers across pages lists | `ConfirmDialog` | 🔴 **High** |
| **Page Breadcrumbs** | PublicBatchPage, CollegePage | Unified Breadcrumb navigation | 🟢 **Low** |



