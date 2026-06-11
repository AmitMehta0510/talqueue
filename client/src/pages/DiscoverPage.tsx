import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ChevronUp,
  Compass,
  Filter,
  Gift,
  Hash,
  Loader2,
  MessageSquare,
  Newspaper,
  Rocket,
  Search,
  SlidersHorizontal,
  Trophy,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { EngineerCard } from "../components/cards/SocialCards";
import { HackathonCard } from "../components/cards/HackathonCard";
import { JobCard } from "../components/cards/JobCard";
import { ProjectCard } from "../components/cards/ProjectCard";
import { Avatar, EmptyState, InlineLoader, Metric } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { api, ReferralRequestPayload } from "../lib/api";
import {
  useConnectUserMutation,
  useCreateDirectConversationMutation,
  useDiscoveryFeedQuery,
  useFollowUserMutation,
  useJoinProjectMutation,
  usePlatformSearchMutation,
  useSuggestedCollaboratorsQuery,
  useSuggestedCommunitiesQuery,
  useSuggestedCompaniesQuery,
  useSuggestedEngineersQuery,
  useSuggestedHackathonsQuery,
  useSuggestedJobsQuery,
  useSuggestedMentorsQuery,
  useSuggestedPostsQuery,
  useSuggestedProjectsQuery,
  useSuggestedRecruitersQuery,
  useSuggestedTeammatesQuery,
} from "../hooks/usePlatformQueries";
import {
  Community,
  Company,
  FeedItem,
  FeedPost,
  Hackathon,
  Job,
  Project,
  SearchResults,
  User,
} from "../lib/api";
import {
  formatCount,
  formatDate,
  tagValues,
  titleCase,
  userHeadline,
  userName,
} from "../lib/format";

type TabKey =
  | "all"
  | "people"
  | "projects"
  | "jobs"
  | "hackathons"
  | "companies"
  | "posts"
  | "communities";

const tabs: Array<{ key: TabKey; label: string; icon: typeof Search }> = [
  { key: "all", label: "All", icon: Search },
  { key: "people", label: "People", icon: Users },
  { key: "projects", label: "Projects", icon: Rocket },
  { key: "jobs", label: "Jobs", icon: BriefcaseBusiness },
  { key: "hackathons", label: "Hackathons", icon: Trophy },
  { key: "companies", label: "Companies", icon: Building2 },
  { key: "posts", label: "Posts", icon: Newspaper },
  { key: "communities", label: "Communities", icon: Hash },
];

// tabs that have a filter panel
const FILTERABLE_TABS: TabKey[] = ["people", "projects", "jobs", "hackathons", "companies", "communities"];

// ─── Filter state shapes ──────────────────────────────────────────────────────

interface PeopleFilters {
  college: string;
  year: string;
  skills: string;
  openToWork: boolean;
  acceptingReferrals: boolean;
}

interface ProjectFilters {
  techStack: string;
  status: string;
  acceptingCollaborators: boolean;
}

interface JobFilters {
  company: string;
  location: string;
  workMode: string;
  experienceLevel: string;
  salaryMin: string;
  salaryMax: string;
  skills: string;
  freshness: string;
}

interface HackathonFilters {
  tags: string;
  upcomingOnly: boolean;
}

interface CompanyFilters {
  industry: string;
  location: string;
  hiringEnabled: boolean;
  referralEnabled: boolean;
}

interface CommunityFilters {
  type: string;
  category: string;
}

const emptyPeople: PeopleFilters = { college: "", year: "", skills: "", openToWork: false, acceptingReferrals: false };
const emptyProject: ProjectFilters = { techStack: "", status: "", acceptingCollaborators: false };
const emptyJob: JobFilters = { company: "", location: "", workMode: "", experienceLevel: "", salaryMin: "", salaryMax: "", skills: "", freshness: "" };
const emptyHackathon: HackathonFilters = { tags: "", upcomingOnly: false };
const emptyCompany: CompanyFilters = { industry: "", location: "", hiringEnabled: false, referralEnabled: false };
const emptyCommunity: CommunityFilters = { type: "", category: "" };

// ─── Referral modal ───────────────────────────────────────────────────────────

interface ReferralTarget {
  user: User;
  company?: Company;
}

function ReferralModal({
  target,
  onClose,
  onSubmit,
  submitting,
}: {
  target: ReferralTarget;
  onClose: () => void;
  onSubmit: (payload: ReferralRequestPayload) => void;
  submitting: boolean;
}) {
  const [jobRole, setJobRole] = useState("");
  const [companyName, setCompanyName] = useState(target.company?.name || "");
  const [jobUrl, setJobUrl] = useState("");
  const [message, setMessage] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!jobRole.trim() || !companyName.trim()) return;
    onSubmit({
      companyName: companyName.trim(),
      jobRole: jobRole.trim(),
      jobUrl: jobUrl.trim() || undefined,
      message: message.trim() || undefined,
      resumeUrl: resumeUrl.trim() || undefined,
      linkedinUrl: linkedinUrl.trim() || undefined,
      githubUrl: githubUrl.trim() || undefined,
      portfolioUrl: portfolioUrl.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Ask Referral</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Requesting from <strong>{userName(target.user)}</strong>
            </p>
          </div>
          <button className="rounded-lg p-2 hover:bg-slate-100" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="field-label">Company name *</span>
              <input className="field" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Google, Microsoft..." />
            </label>
            <label className="block">
              <span className="field-label">Job role *</span>
              <input className="field" required value={jobRole} onChange={(e) => setJobRole(e.target.value)} placeholder="SDE-2, Product Manager..." />
            </label>
          </div>

          <label className="block">
            <span className="field-label">Job URL (optional)</span>
            <input className="field" type="url" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="https://careers.google.com/..." />
          </label>

          <label className="block">
            <span className="field-label">Message (optional)</span>
            <textarea className="field min-h-[80px] resize-none" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi, I'm interested in the SDE role at Google..." />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="field-label">LinkedIn URL</span>
              <input className="field" type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
            </label>
            <label className="block">
              <span className="field-label">GitHub URL</span>
              <input className="field" type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/..." />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="field-label">Resume URL</span>
              <input className="field" type="url" value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} placeholder="https://drive.google.com/..." />
            </label>
            <label className="block">
              <span className="field-label">Portfolio URL</span>
              <input className="field" type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://yoursite.com/..." />
            </label>
          </div>

          <p className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-700">
            Note: The referrer must currently work at the requested company. Your engineering score must be ≥ 20 to send referral requests.
          </p>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="btn-primary" type="submit" disabled={submitting || !jobRole.trim() || !companyName.trim()}>
              {submitting ? <Loader2 className="animate-spin" size={15} /> : <Gift size={15} />}
              Send Referral Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Helper ────────────────────────────────────────────────────────────────────

const feedTitle = (item: FeedItem) => {
  if (item.type === "PROJECT") return (item.data as Project).title;
  if (item.type === "JOB") return (item.data as Job).title;
  if (item.type === "POST") return (item.data as FeedPost).content;
  return String((item.data as Record<string, unknown>).name || item.type);
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  // Filters open by default for filterable tabs
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Per-tab filter state
  const [peopleF, setPeopleF] = useState<PeopleFilters>(emptyPeople);
  const [projectF, setProjectF] = useState<ProjectFilters>(emptyProject);
  const [jobF, setJobF] = useState<JobFilters>(emptyJob);
  const [hackF, setHackF] = useState<HackathonFilters>(emptyHackathon);
  const [companyF, setCompanyF] = useState<CompanyFilters>(emptyCompany);
  const [communityF, setCommunityF] = useState<CommunityFilters>(emptyCommunity);

  // Referral modal state
  const [referralTarget, setReferralTarget] = useState<ReferralTarget | null>(null);
  const [referralSubmitting, setReferralSubmitting] = useState(false);

  const search = usePlatformSearchMutation();
  const joinProject = useJoinProjectMutation();
  const followUser = useFollowUserMutation();
  const connectUser = useConnectUserMutation();
  const createDirectConversation = useCreateDirectConversationMutation();

  const discoveryFeed = useDiscoveryFeedQuery();
  const engineers = useSuggestedEngineersQuery(8);
  const mentors = useSuggestedMentorsQuery(6);
  const recruiters = useSuggestedRecruitersQuery(6);
  const collaborators = useSuggestedCollaboratorsQuery(6);
  const teammates = useSuggestedTeammatesQuery(6);
  const projects = useSuggestedProjectsQuery(6);
  const jobs = useSuggestedJobsQuery(6);
  const hackathons = useSuggestedHackathonsQuery(6);
  const companies = useSuggestedCompaniesQuery(6);
  const posts = useSuggestedPostsQuery(6);
  const communities = useSuggestedCommunitiesQuery(6);

  // Auto-open filter panel when switching to a filterable tab
  useEffect(() => {
    if (FILTERABLE_TABS.includes(activeTab)) {
      setFiltersOpen(true);
    } else {
      setFiltersOpen(false);
    }
  }, [activeTab]);

  const loadingSuggestions =
    engineers.isFetching ||
    projects.isFetching ||
    jobs.isFetching ||
    hackathons.isFetching ||
    companies.isFetching ||
    posts.isFetching ||
    communities.isFetching;

  const searchResults = search.data;

  const openMessage = async (targetUser: User) => {
    const result = await createDirectConversation.mutateAsync(targetUser.id);
    navigate(`/chat/${result.data.id}`);
  };

  const openReferralModal = (targetUser: User) => {
    setReferralTarget({ user: targetUser });
  };

  const submitReferral = async (payload: ReferralRequestPayload) => {
    if (!referralTarget) return;
    setReferralSubmitting(true);
    try {
      await api.createReferralRequest(referralTarget.user.id, payload);
      showToast("success", "Referral request sent successfully!");
      setReferralTarget(null);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to send referral request");
    } finally {
      setReferralSubmitting(false);
    }
  };

  // ── Submit search ──────────────────────────────────────────────────────────
  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const q = query.trim();

    if (activeTab === "people") {
      search.mutate({ tab: "people", q, people: peopleF } as any);
    } else if (activeTab === "projects") {
      search.mutate({ tab: "projects", q, project: projectF } as any);
    } else if (activeTab === "jobs") {
      search.mutate({ tab: "jobs", q, job: jobF } as any);
    } else if (activeTab === "hackathons") {
      search.mutate({ tab: "hackathons", q, hack: hackF } as any);
    } else if (activeTab === "companies") {
      search.mutate({ tab: "companies", q, company: companyF } as any);
    } else if (activeTab === "communities") {
      search.mutate({ tab: "communities", q, community: communityF } as any);
    } else {
      // "all" — global search (or empty will show all top hits)
      search.mutate({ tab: "all", q: q || " " } as any);
    }
  };

  // ── Sections for search results ────────────────────────────────────────────
  const searchSections = useMemo(
    () => [
      {
        key: "people" as const,
        title: "People",
        icon: Users,
        count: searchResults?.users?.length || 0,
        content: (
          <PeopleGrid
            users={searchResults?.users || []}
            onConnect={(u) => connectUser.mutate(u.id)}
            onFollow={(u) => followUser.mutate(u.id)}
            onMessage={openMessage}
            onOpenProfile={(u) => navigate(`/users/${u.id}`)}
            onRequestReferral={openReferralModal}
            disabled={!user}
            currentUserId={user?.id}
          />
        ),
      },
      {
        key: "projects" as const,
        title: "Projects",
        icon: Rocket,
        count: searchResults?.projects?.length || 0,
        content: (
          <ProjectGrid
            currentUserId={user?.id}
            onJoin={(project) => joinProject.mutate(project)}
            projects={searchResults?.projects || []}
          />
        ),
      },
      {
        key: "jobs" as const,
        title: "Jobs",
        icon: BriefcaseBusiness,
        count: searchResults?.jobs?.length || 0,
        content: <JobGrid jobs={searchResults?.jobs || []} />,
      },
      {
        key: "hackathons" as const,
        title: "Hackathons",
        icon: Trophy,
        count: searchResults?.hackathons?.length || 0,
        content: <HackathonGrid hackathons={searchResults?.hackathons || []} />,
      },
      {
        key: "companies" as const,
        title: "Companies",
        icon: Building2,
        count: searchResults?.companies?.length || 0,
        content: <CompanyGrid companies={searchResults?.companies || []} />,
      },
      {
        key: "posts" as const,
        title: "Posts",
        icon: Newspaper,
        count: ((searchResults?.posts as FeedPost[] | undefined) || []).length,
        content: <PostGrid posts={(searchResults?.posts as FeedPost[] | undefined) || []} />,
      },
      {
        key: "communities" as const,
        title: "Communities",
        icon: Hash,
        count: searchResults?.communities?.length || 0,
        content: <CommunityGrid communities={searchResults?.communities || []} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchResults, user],
  );

  const visibleSearchSections =
    activeTab === "all"
      ? searchSections.filter((s) => s.count > 0)
      : searchSections.filter((s) => s.key === activeTab);

  const totalResults = searchSections.reduce((sum, s) => sum + s.count, 0);

  // ── Filters have active values ─────────────────────────────────────────────
  const hasActiveFilters =
    (activeTab === "people" && Object.values(peopleF).some((v) => v !== "" && v !== false)) ||
    (activeTab === "projects" && Object.values(projectF).some((v) => v !== "" && v !== false)) ||
    (activeTab === "jobs" && Object.values(jobF).some((v) => v !== "" && v !== false)) ||
    (activeTab === "hackathons" && Object.values(hackF).some((v) => v !== "" && v !== false)) ||
    (activeTab === "companies" && Object.values(companyF).some((v) => v !== "" && v !== false)) ||
    (activeTab === "communities" && Object.values(communityF).some((v) => v !== "" && v !== false));

  const clearFilters = () => {
    setPeopleF(emptyPeople);
    setProjectF(emptyProject);
    setJobF(emptyJob);
    setHackF(emptyHackathon);
    setCompanyF(emptyCompany);
    setCommunityF(emptyCommunity);
  };

  const isFilterableTab = FILTERABLE_TABS.includes(activeTab);

  return (
    <>
      {referralTarget && (
        <ReferralModal
          target={referralTarget}
          onClose={() => setReferralTarget(null)}
          onSubmit={submitReferral}
          submitting={referralSubmitting}
        />
      )}

      <section className="space-y-6">
        <div className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Compass className="text-emerald-700" size={20} />
                <h1 className="text-xl font-bold text-slate-950">Discover</h1>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Search, filter and explore. Results adapt to your interests.
              </p>
            </div>
            {searchResults && (
              <div className="grid grid-cols-2 gap-3 text-right">
                <Metric label="Results" value={totalResults} />
                <Metric label="Sections" value={visibleSearchSections.length} />
              </div>
            )}
          </div>

          {/* Search bar */}
          <form className="mt-5 flex flex-wrap gap-3" onSubmit={submit}>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
              <input
                className="field pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search engineers, projects, jobs, companies, communities..."
              />
            </div>
            {isFilterableTab && (
              <button
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                  filtersOpen || hasActiveFilters
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                }`}
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
              >
                <SlidersHorizontal size={15} />
                Filters
                {hasActiveFilters && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </button>
            )}
            <button className="btn-primary shrink-0" type="submit" disabled={search.isPending}>
              {search.isPending ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
              Search
            </button>
          </form>

          {/* Tabs */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  className={`inline-flex min-w-max items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-800"
                  }`}
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                >
                  <Icon size={15} />
                  {tab.label}
                  {searchResults && tab.key !== "all" && (
                    <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                      {searchSections.find((s) => s.key === tab.key)?.count || 0}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Filter panel */}
          {isFilterableTab && filtersOpen && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Filter size={14} />
                  Filters
                  {hasActiveFilters && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Active</span>}
                </div>
                {hasActiveFilters && (
                  <button className="text-xs text-red-500 hover:underline" type="button" onClick={clearFilters}>
                    Clear all
                  </button>
                )}
              </div>

              {activeTab === "people" && (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <FilterField label="College name">
                    <input className="field" value={peopleF.college} onChange={(e) => setPeopleF({ ...peopleF, college: e.target.value })} placeholder="IIT Bombay, BITS Pilani..." />
                  </FilterField>
                  <FilterField label="Graduation year">
                    <input className="field" value={peopleF.year} onChange={(e) => setPeopleF({ ...peopleF, year: e.target.value })} placeholder="2025, 2026..." />
                  </FilterField>
                  <FilterField label="Skills (comma separated)">
                    <input className="field" value={peopleF.skills} onChange={(e) => setPeopleF({ ...peopleF, skills: e.target.value })} placeholder="React, Python, Flutter..." />
                  </FilterField>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={peopleF.openToWork} onChange={(e) => setPeopleF({ ...peopleF, openToWork: e.target.checked })} />
                    Open to work
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={peopleF.acceptingReferrals} onChange={(e) => setPeopleF({ ...peopleF, acceptingReferrals: e.target.checked })} />
                    Accepting referrals
                  </label>
                </div>
              )}

              {activeTab === "projects" && (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <FilterField label="Tech stack (comma separated)">
                    <input className="field" value={projectF.techStack} onChange={(e) => setProjectF({ ...projectF, techStack: e.target.value })} placeholder="React, Node.js, Python..." />
                  </FilterField>
                  <FilterField label="Status">
                    <select className="field" value={projectF.status} onChange={(e) => setProjectF({ ...projectF, status: e.target.value })}>
                      <option value="">Any status</option>
                      <option value="OPEN">Open</option>
                      <option value="ACTIVE">Active</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </FilterField>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={projectF.acceptingCollaborators} onChange={(e) => setProjectF({ ...projectF, acceptingCollaborators: e.target.checked })} />
                    Accepting collaborators
                  </label>
                </div>
              )}

              {activeTab === "jobs" && (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <FilterField label="Company">
                    <input className="field" value={jobF.company} onChange={(e) => setJobF({ ...jobF, company: e.target.value })} placeholder="Google, Swiggy..." />
                  </FilterField>
                  <FilterField label="Location">
                    <input className="field" value={jobF.location} onChange={(e) => setJobF({ ...jobF, location: e.target.value })} placeholder="Bangalore, Remote..." />
                  </FilterField>
                  <FilterField label="Skills required">
                    <input className="field" value={jobF.skills} onChange={(e) => setJobF({ ...jobF, skills: e.target.value })} placeholder="React, Node.js..." />
                  </FilterField>
                  <FilterField label="Work mode">
                    <select className="field" value={jobF.workMode} onChange={(e) => setJobF({ ...jobF, workMode: e.target.value })}>
                      <option value="">Any</option>
                      <option value="REMOTE">Remote</option>
                      <option value="HYBRID">Hybrid</option>
                      <option value="ONSITE">On-site</option>
                    </select>
                  </FilterField>
                  <FilterField label="Experience level">
                    <select className="field" value={jobF.experienceLevel} onChange={(e) => setJobF({ ...jobF, experienceLevel: e.target.value })}>
                      <option value="">Any</option>
                      <option value="ENTRY">Entry</option>
                      <option value="JUNIOR">Junior</option>
                      <option value="MID">Mid</option>
                      <option value="SENIOR">Senior</option>
                      <option value="LEAD">Lead</option>
                      <option value="EXECUTIVE">Executive</option>
                    </select>
                  </FilterField>
                  <FilterField label="Posted within">
                    <select className="field" value={jobF.freshness} onChange={(e) => setJobF({ ...jobF, freshness: e.target.value })}>
                      <option value="">Any time</option>
                      <option value="1">Today</option>
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                    </select>
                  </FilterField>
                  <FilterField label="Min salary (₹ LPA)">
                    <input className="field" type="number" min="0" value={jobF.salaryMin} onChange={(e) => setJobF({ ...jobF, salaryMin: e.target.value })} placeholder="10" />
                  </FilterField>
                  <FilterField label="Max salary (₹ LPA)">
                    <input className="field" type="number" min="0" value={jobF.salaryMax} onChange={(e) => setJobF({ ...jobF, salaryMax: e.target.value })} placeholder="50" />
                  </FilterField>
                </div>
              )}

              {activeTab === "hackathons" && (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <FilterField label="Tags (comma separated)">
                    <input className="field" value={hackF.tags} onChange={(e) => setHackF({ ...hackF, tags: e.target.value })} placeholder="AI, Web3, Mobile..." />
                  </FilterField>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={hackF.upcomingOnly} onChange={(e) => setHackF({ ...hackF, upcomingOnly: e.target.checked })} />
                    Upcoming only
                  </label>
                </div>
              )}

              {activeTab === "companies" && (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <FilterField label="Industry">
                    <input className="field" value={companyF.industry} onChange={(e) => setCompanyF({ ...companyF, industry: e.target.value })} placeholder="Fintech, SaaS, Ed-tech..." />
                  </FilterField>
                  <FilterField label="Location / HQ">
                    <input className="field" value={companyF.location} onChange={(e) => setCompanyF({ ...companyF, location: e.target.value })} placeholder="Bangalore, Mumbai..." />
                  </FilterField>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={companyF.hiringEnabled} onChange={(e) => setCompanyF({ ...companyF, hiringEnabled: e.target.checked })} />
                    Currently hiring
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={companyF.referralEnabled} onChange={(e) => setCompanyF({ ...companyF, referralEnabled: e.target.checked })} />
                    Referrals enabled
                  </label>
                </div>
              )}

              {activeTab === "communities" && (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <FilterField label="Type">
                    <select className="field" value={communityF.type} onChange={(e) => setCommunityF({ ...communityF, type: e.target.value })}>
                      <option value="">Any</option>
                      <option value="COLLEGE">College</option>
                      <option value="COMPANY">Company</option>
                      <option value="GENERAL">General</option>
                    </select>
                  </FilterField>
                  <FilterField label="Category">
                    <select className="field" value={communityF.category} onChange={(e) => setCommunityF({ ...communityF, category: e.target.value })}>
                      <option value="">Any</option>
                      <option value="GENERAL">General</option>
                      <option value="CODING">Coding</option>
                      <option value="PLACEMENTS">Placements</option>
                      <option value="INTERNSHIPS">Internships</option>
                      <option value="REFERRALS">Referrals</option>
                      <option value="INTERVIEWS">Interviews</option>
                      <option value="SALARIES">Salaries</option>
                      <option value="ANNOUNCEMENTS">Announcements</option>
                      <option value="RESOURCES">Resources</option>
                      <option value="EVENTS">Events</option>
                      <option value="STARTUPS">Startups</option>
                      <option value="OPEN_SOURCE">Open Source</option>
                      <option value="AI">AI</option>
                      <option value="CAREER_GUIDANCE">Career Guidance</option>
                    </select>
                  </FilterField>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results or suggestions */}
        {searchResults ? (
          <div className="space-y-5">
            {visibleSearchSections.length ? (
              visibleSearchSections.map((section) => (
                <DiscoverySection
                  count={section.count}
                  icon={section.icon}
                  key={section.key}
                  title={section.title}
                >
                  {section.content}
                </DiscoverySection>
              ))
            ) : (
              <EmptyState
                icon={Search}
                title="No results found"
                text="Try a broader search, different keywords, or clear your filters."
              />
            )}
          </div>
        ) : (
          <PersonalizedDiscovery
            canInteract={Boolean(user)}
            collaborators={collaborators.data || []}
            communities={communities.data || []}
            companies={companies.data || []}
            discoveryFeed={discoveryFeed.data || []}
            engineers={engineers.data || []}
            hackathons={hackathons.data || []}
            jobs={jobs.data || []}
            loading={loadingSuggestions}
            mentors={mentors.data || []}
            onConnect={(u) => connectUser.mutate(u.id)}
            onFollow={(u) => followUser.mutate(u.id)}
            onJoin={(project) => joinProject.mutate(project)}
            onMessage={openMessage}
            onOpenProfile={(u) => navigate(`/users/${u.id}`)}
            onRequestReferral={openReferralModal}
            posts={posts.data || []}
            projects={projects.data || []}
            recruiters={recruiters.data || []}
            teammates={teammates.data || []}
            user={user}
            currentUserId={user?.id}
          />
        )}
      </section>
    </>
  );
}

// ─── Personalized discovery (no search active) ────────────────────────────────

function PersonalizedDiscovery({
  canInteract,
  collaborators,
  communities,
  companies,
  discoveryFeed,
  engineers,
  hackathons,
  jobs,
  loading,
  mentors,
  onConnect,
  onFollow,
  onJoin,
  onMessage,
  onOpenProfile,
  onRequestReferral,
  posts,
  projects,
  recruiters,
  teammates,
  user,
  currentUserId,
}: {
  canInteract: boolean;
  collaborators: User[];
  communities: Community[];
  companies: Company[];
  discoveryFeed: FeedItem[];
  engineers: User[];
  hackathons: Hackathon[];
  jobs: Job[];
  loading: boolean;
  mentors: User[];
  onConnect: (user: User) => void;
  onFollow: (user: User) => void;
  onJoin: (project: Project) => void;
  onMessage: (user: User) => void;
  onOpenProfile: (user: User) => void;
  onRequestReferral: (user: User) => void;
  posts: FeedPost[];
  projects: Project[];
  recruiters: User[];
  teammates: User[];
  user: User | null;
  currentUserId?: string;
}) {
  if (!user) {
    return (
      <EmptyState
        icon={UserRound}
        title="Login required"
        text="Discovery suggestions use your profile, skills, activity, and network."
      />
    );
  }

  return (
    <div className="space-y-5">
      {loading && <InlineLoader label="Refreshing suggestions" />}

      <DiscoverySection count={discoveryFeed.length} icon={Compass} title="Discovery feed">
        {discoveryFeed.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {discoveryFeed.slice(0, 6).map((item, index) => (
              <FeedSuggestionCard item={item} key={`${item.type}-${index}`} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Compass} title="No discovery feed yet" text="Suggestions will appear as your profile grows." />
        )}
      </DiscoverySection>

      <DiscoverySection count={engineers.length} icon={Users} title="Suggested engineers">
        <PeopleGrid
          disabled={!canInteract}
          onConnect={onConnect}
          onFollow={onFollow}
          onMessage={onMessage}
          onOpenProfile={onOpenProfile}
          onRequestReferral={onRequestReferral}
          users={engineers}
          currentUserId={currentUserId}
        />
      </DiscoverySection>

      <div className="grid gap-5 xl:grid-cols-2">
        <DiscoverySection count={mentors.length} icon={UserRound} title="Mentors">
          <PeopleGrid disabled={!canInteract} onMessage={onMessage} onOpenProfile={onOpenProfile} onRequestReferral={onRequestReferral} users={mentors} currentUserId={currentUserId} />
        </DiscoverySection>
        <DiscoverySection count={recruiters.length} icon={BriefcaseBusiness} title="Recruiters">
          <PeopleGrid disabled={!canInteract} onMessage={onMessage} onOpenProfile={onOpenProfile} onRequestReferral={onRequestReferral} users={recruiters} currentUserId={currentUserId} />
        </DiscoverySection>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <DiscoverySection count={collaborators.length} icon={Users} title="Collaborators">
          <PeopleGrid disabled={!canInteract} onConnect={onConnect} onOpenProfile={onOpenProfile} onRequestReferral={onRequestReferral} users={collaborators} currentUserId={currentUserId} />
        </DiscoverySection>
        <DiscoverySection count={teammates.length} icon={Users} title="Teammates">
          <PeopleGrid disabled={!canInteract} onConnect={onConnect} onOpenProfile={onOpenProfile} onRequestReferral={onRequestReferral} users={teammates} currentUserId={currentUserId} />
        </DiscoverySection>
      </div>

      <DiscoverySection count={projects.length} icon={Rocket} title="Suggested projects">
        <ProjectGrid currentUserId={user.id} onJoin={onJoin} projects={projects} />
      </DiscoverySection>

      <div className="grid gap-5 xl:grid-cols-2">
        <DiscoverySection count={jobs.length} icon={BriefcaseBusiness} title="Suggested jobs">
          <JobGrid jobs={jobs} />
        </DiscoverySection>
        <DiscoverySection count={hackathons.length} icon={Trophy} title="Suggested hackathons">
          <HackathonGrid hackathons={hackathons} />
        </DiscoverySection>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <DiscoverySection count={companies.length} icon={Building2} title="Companies">
          <CompanyGrid companies={companies} />
        </DiscoverySection>
        <DiscoverySection count={communities.length} icon={Hash} title="Communities">
          <CommunityGrid communities={communities} />
        </DiscoverySection>
      </div>

      <DiscoverySection count={posts.length} icon={Newspaper} title="Suggested posts">
        <PostGrid posts={posts} />
      </DiscoverySection>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function DiscoverySection({
  children,
  count,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  count: number;
  icon: typeof Search;
  title: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="text-emerald-700" size={18} />
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        </div>
        <span className="chip">{formatCount(count)}</span>
      </div>
      {children}
    </section>
  );
}

// ─── PeopleGrid ───────────────────────────────────────────────────────────────

function PeopleGrid({
  disabled,
  onConnect,
  onFollow,
  onMessage,
  onOpenProfile,
  onRequestReferral,
  users,
  currentUserId,
}: {
  disabled?: boolean;
  onConnect?: (user: User) => void;
  onFollow?: (user: User) => void;
  onMessage?: (user: User) => void;
  onOpenProfile: (user: User) => void;
  onRequestReferral?: (user: User) => void;
  users: User[];
  currentUserId?: string;
}) {
  if (!users.length) {
    return <EmptyState icon={Users} title="No people found" text="Try another keyword or complete your profile." />;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {users.map((foundUser) => (
        <EngineerCard
          disabled={disabled}
          key={foundUser.id}
          onConnect={onConnect}
          onFollow={onFollow}
          onMessage={onMessage}
          onOpenProfile={onOpenProfile}
          onRequestReferral={onRequestReferral}
          user={foundUser}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}

// ─── Other grids ─────────────────────────────────────────────────────────────

function ProjectGrid({ currentUserId, onJoin, projects }: { currentUserId?: string; onJoin: (project: Project) => void; projects: Project[] }) {
  if (!projects.length) return <EmptyState icon={Rocket} title="No projects found" text="Try another keyword." />;
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {projects.map((project) => (
        <ProjectCard currentUserId={currentUserId} key={project.id} onJoin={onJoin} project={project} />
      ))}
    </div>
  );
}

function JobGrid({ jobs }: { jobs: Job[] }) {
  if (!jobs.length) return <EmptyState icon={BriefcaseBusiness} title="No jobs found" text="Try another keyword." />;
  return (
    <div className="grid gap-5">
      {jobs.map((job) => <JobCard job={job} key={job.id} />)}
    </div>
  );
}

function HackathonGrid({ hackathons }: { hackathons: Hackathon[] }) {
  if (!hackathons.length) return <EmptyState icon={Trophy} title="No hackathons found" text="Try another keyword." />;
  return (
    <div className="grid gap-5">
      {hackathons.map((hackathon) => <HackathonCard hackathon={hackathon} key={hackathon.id} />)}
    </div>
  );
}

function CompanyGrid({ companies }: { companies: Company[] }) {
  if (!companies.length) return <EmptyState icon={Building2} title="No companies found" text="Try another keyword." />;
  return (
    <div className="grid gap-5">
      {companies.map((company) => <CompanySuggestionCard company={company} key={company.id} />)}
    </div>
  );
}

function CommunityGrid({ communities }: { communities: Community[] }) {
  if (!communities.length) return <EmptyState icon={Hash} title="No communities found" text="Try another keyword." />;
  return (
    <div className="grid gap-5">
      {communities.map((community) => <CommunitySuggestionCard community={community} key={community.id} />)}
    </div>
  );
}

function PostGrid({ posts }: { posts: FeedPost[] }) {
  if (!posts.length) return <EmptyState icon={Newspaper} title="No posts found" text="Try another keyword." />;
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {posts.map((post) => <PostSuggestionCard key={post.id} post={post} />)}
    </div>
  );
}

// ─── Card components ──────────────────────────────────────────────────────────

function CompanySuggestionCard({ company }: { company: Company }) {
  return (
    <article className="panel p-5">
      <div className="flex items-start gap-4">
        {company.logoUrl ? (
          <img className="h-11 w-11 rounded-md object-cover" src={company.logoUrl} alt={company.name} />
        ) : (
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
            <Building2 size={20} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-950">
            <Link className="hover:text-emerald-700" to={`/companies/${company.slug}`}>
              {company.name}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {[company.industry, company.headquarters, titleCase(company.size)].filter(Boolean).join(" · ") || "Company"}
          </p>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
            {company.tagline || company.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {company.verified && <span className="chip text-emerald-700">Verified</span>}
            {company.hiringEnabled && <span className="chip">Hiring</span>}
            {company.referralEnabled && <span className="chip">Referrals</span>}
          </div>
        </div>
      </div>
    </article>
  );
}

function CommunitySuggestionCard({ community }: { community: Community }) {
  return (
    <article className="panel p-5">
      <div className="flex items-start gap-4">
        {community.avatarUrl ? (
          <img className="h-11 w-11 rounded-md object-cover" src={community.avatarUrl} alt={community.name} />
        ) : (
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <Hash size={20} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-950">
            <Link className="hover:text-emerald-700" to={`/communities/${community.slug}`}>
              {community.name}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {[titleCase(community.type), titleCase(community.category)].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
            {community.shortDescription || community.description}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <Metric label="Members" value={formatCount(community.memberCount || community._count?.members)} />
            <Metric label="Posts" value={formatCount(community.postCount || community._count?.posts)} />
            <Metric label="Trend" value={Math.round(community.trendingScore || 0)} />
          </div>
        </div>
      </div>
    </article>
  );
}

function PostSuggestionCard({ post }: { post: FeedPost }) {
  const tags = tagValues(post.tags);
  const author = post.author || post.user;
  return (
    <article className="panel p-5">
      <div className="flex items-start gap-3">
        <Avatar user={author} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-950">{userName(author)}</div>
          <div className="truncate text-xs text-slate-500">
            {titleCase(post.type)} {post.createdAt ? `· ${formatDate(post.createdAt)}` : ""}
          </div>
        </div>
      </div>
      <p className="mt-4 line-clamp-4 whitespace-pre-line text-sm leading-6 text-slate-700">
        {post.content || post.description || post.title}
      </p>
      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.slice(0, 5).map((tag) => (
            <span className="chip" key={tag}>#{tag}</span>
          ))}
        </div>
      )}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span>{formatCount(post.likesCount)} likes</span>
        <span>{formatCount(post.commentsCount)} comments</span>
      </div>
    </article>
  );
}

function FeedSuggestionCard({ item }: { item: FeedItem }) {
  return (
    <article className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-semibold text-slate-950">
            {feedTitle(item) || titleCase(item.type)}
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
            {item.reason || "Recommended from your profile and activity."}
          </p>
        </div>
        <span className="chip shrink-0">{titleCase(item.type)}</span>
      </div>
    </article>
  );
}

// ─── FilterField helper ───────────────────────────────────────────────────────

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}
