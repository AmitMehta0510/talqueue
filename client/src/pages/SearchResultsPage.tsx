import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useGlobalSearchQuery } from "../hooks/queries/useSearchQueries";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Gavel,
  Hash,
  Rocket,
  Search,
  SearchX,
  Users,
} from "lucide-react";
import { api } from "../lib/api";
import type {
  SearchResults,
  RankedUser,
  RankedProject,
  RankedHackathon,
  Job,
  Company,
  Community,
} from "../lib/api";
import { EngineerCard } from "../components/cards/SocialCards";
import { ProjectCard } from "../components/cards/ProjectCard";
import { HackathonCard } from "../components/cards/HackathonCard";
import { JobCard } from "../components/cards/JobCard";
import { cleanLogoUrl, formatCount, titleCase } from "../core/utils/format";

// ─── View All Footer Link ───────────────────────────────────────────────────

function ViewAllLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-1.5 mt-5 text-sm font-semibold transition-all duration-200"
      style={{ color: "var(--brand)" }}
    >
      {label}
      <ArrowRight
        size={14}
        className="transition-transform duration-200 group-hover:translate-x-1"
      />
    </Link>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  count,
  accentClass,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  accentClass: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${accentClass}`}
        >
          <Icon size={16} />
        </div>
        <h2
          className="text-base font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h2>
      </div>
      {count > 0 && (
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: "var(--bg-surface-2)",
            color: "var(--text-muted)",
          }}
        >
          Top {count}
        </span>
      )}
    </div>
  );
}

// ─── Skeleton Card ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="panel p-5 animate-pulse space-y-3"
      style={{ background: "var(--bg-surface)" }}
    >
      <div
        className="h-4 w-3/4 rounded"
        style={{ background: "var(--bg-surface-2)" }}
      />
      <div
        className="h-3 w-1/2 rounded"
        style={{ background: "var(--bg-surface-2)" }}
      />
      <div
        className="h-3 w-full rounded"
        style={{ background: "var(--bg-surface-2)" }}
      />
    </div>
  );
}

function SkeletonSection() {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="h-8 w-8 rounded-lg animate-pulse"
          style={{ background: "var(--bg-surface-2)" }}
        />
        <div
          className="h-5 w-28 rounded animate-pulse"
          style={{ background: "var(--bg-surface-2)" }}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Company Mini Card ────────────────────────────────────────────────────────

function CompanyMiniCard({ company }: { company: Company }) {
  return (
    <Link
      to={`/companies/${company.slug}`}
      className="panel p-5 hover-lift flex items-center gap-4 transition-all duration-200"
      aria-label={`View ${company.name} company page`}
    >
      {company.logoUrl ? (
        <img
          src={cleanLogoUrl(company.logoUrl) ?? ""}
          alt={company.name}
          className="h-12 w-12 rounded-lg object-contain shrink-0 border"
          style={{ borderColor: "var(--border)" }}
        />
      ) : (
        <div
          className="h-12 w-12 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: "var(--bg-surface-2)",
            color: "var(--text-muted)",
          }}
        >
          <Building2 size={22} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3
            className="font-semibold text-sm truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {company.name}
          </h3>
          {company.verified && (
            <span className="chip text-indigo-700 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/20 text-[10px]">
              Verified
            </span>
          )}
        </div>
        {company.tagline && (
          <p
            className="text-xs truncate mt-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            {company.tagline}
          </p>
        )}
        {(company.industry || company.headquarters) && (
          <p
            className="text-xs mt-1 truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            {[company.industry, company.headquarters]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Community Mini Card ──────────────────────────────────────────────────────

function CommunityMiniCard({ community }: { community: Community }) {
  return (
    <Link
      to={`/communities/${community.slug}`}
      className="panel p-5 hover-lift flex items-start gap-4 transition-all duration-200"
      aria-label={`View ${community.name} community`}
    >
      {community.avatarUrl ? (
        <img
          src={community.avatarUrl}
          alt={community.name}
          className="h-12 w-12 rounded-xl object-cover shrink-0"
        />
      ) : (
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "var(--bg-surface-2)",
            color: "var(--text-muted)",
          }}
        >
          <Hash size={22} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3
          className="font-semibold text-sm truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {community.name}
        </h3>
        {community.shortDescription && (
          <p
            className="text-xs mt-0.5 line-clamp-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {community.shortDescription}
          </p>
        )}
        <p
          className="text-xs mt-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          {formatCount(community.memberCount ?? 0)} members ·{" "}
          {titleCase(community.type)}
        </p>
      </div>
    </Link>
  );
}

// ─── Empty Section State ─────────────────────────────────────────────────────

function EmptySection({ label }: { label: string }) {
  return (
    <p
      className="text-sm py-6 text-center rounded-xl"
      style={{
        background: "var(--bg-surface)",
        color: "var(--text-muted)",
        border: "1px dashed var(--border)",
      }}
    >
      No matching {label} found.
    </p>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get("q") ?? "";

  const [inputValue, setInputValue] = useState(q);

  // Keep input in sync when URL param changes
  useEffect(() => { setInputValue(q); }, [q]);

  // Update document title and restore on unmount
  useEffect(() => {
    document.title = q ? `Search: "${q}" | Engineering Hub` : "Search | Engineering Hub";
    return () => { document.title = "Engineering Hub"; };
  }, [q]);

  // ── React Query — cached, retried, signal-cancelled automatically ──────────
  const { data: results, isLoading: loading, isError } = useGlobalSearchQuery(q);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed && trimmed !== q) navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  // Typed slices
  const people    = (results?.users     ?? []) as RankedUser[];
  const projects  = (results?.projects  ?? []) as RankedProject[];
  const hackathons = (results?.hackathons ?? []) as RankedHackathon[];
  const jobs      = (results?.jobs      ?? []) as Job[];
  const companies = (results?.companies ?? []) as Company[];
  const communities = (results?.communities ?? []) as Community[];

  const hasAnyResults =
    people.length > 0 ||
    projects.length > 0 ||
    hackathons.length > 0 ||
    jobs.length > 0 ||
    companies.length > 0 ||
    communities.length > 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-glow-sm">
            <Search size={18} />
          </div>
          <div>
            <h1
              className="text-xl font-black tracking-tight leading-none"
              style={{ color: "var(--text-primary)" }}
            >
              {q ? (
                <>
                  Results for{" "}
                  <span className="text-indigo-600 dark:text-indigo-400">
                    "{q}"
                  </span>
                </>
              ) : (
                "Search"
              )}
            </h1>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              Searching across people, jobs, projects, hackathons, companies &
              communities
            </p>
          </div>
        </div>

        {/* ── Inline search bar ───────────────────────────────────── */}
        <form onSubmit={handleSearch} className="mt-5 max-w-lg">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              size={16}
              style={{ color: "var(--text-muted)" }}
            />
            <input
              id="search-results-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="field pl-10 pr-24 py-2.5 text-sm w-full"
              placeholder="Search engineers, skills, jobs…"
              autoFocus={!q}
            />
            <button
              type="submit"
              className="btn-primary absolute right-2 top-1/2 -translate-y-1/2 text-xs py-1.5 px-3"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* ── Loading skeletons ────────────────────────────────────── */}
      {loading && (
        <div className="space-y-10">
          {[0, 1, 2].map((i) => (
            <SkeletonSection key={i} />
          ))}
        </div>
      )}

      {/* ── Error state ──────────────────────────────────────────── */}
      {!loading && isError && (
        <div
          className="rounded-xl p-6 text-center border"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <SearchX
            size={32}
            className="mx-auto mb-3 opacity-50"
            style={{ color: "var(--text-muted)" }}
          />
          <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Search failed
          </p>
          <p className="text-sm">Something went wrong. Please try again.</p>
        </div>
      )}

      {/* ── Empty query ───────────────────────────────────────────── */}
      {!loading && !isError && !q && (
        <div
          className="rounded-xl p-12 text-center border"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border)",
          }}
        >
          <Search
            size={40}
            className="mx-auto mb-4 opacity-30"
            style={{ color: "var(--text-muted)" }}
          />
          <p
            className="font-semibold text-base"
            style={{ color: "var(--text-primary)" }}
          >
            Start typing to search
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Search across people, jobs, projects, hackathons, companies &
            communities
          </p>
        </div>
      )}

      {/* ── No results ───────────────────────────────────────────── */}
      {!loading && !isError && q && results && !hasAnyResults && (
        <div
          className="rounded-xl p-12 text-center border"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border)",
          }}
        >
          <SearchX
            size={40}
            className="mx-auto mb-4 opacity-30"
            style={{ color: "var(--text-muted)" }}
          />
          <p
            className="font-semibold text-base"
            style={{ color: "var(--text-primary)" }}
          >
            No results for "{q}"
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Try a different keyword or browse by category below.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/discover" className="btn-secondary text-xs">
              Browse People
            </Link>
            <Link to="/jobs" className="btn-secondary text-xs">
              Browse Jobs
            </Link>
            <Link to="/projects" className="btn-secondary text-xs">
              Browse Projects
            </Link>
          </div>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────── */}
      {!loading && !isError && results && hasAnyResults && (
        <div className="space-y-10">

          {/* ── Section: People ─────────────────────────────── */}
          <section id="search-people" aria-label="People results">
            <SectionHeader
              icon={Users}
              title="People"
              count={people.length}
              accentClass="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
            />
            {people.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {people.map(({ user }) => (
                  <EngineerCard key={user.id} user={user} />
                ))}
              </div>
            ) : (
              <EmptySection label="people" />
            )}
            <ViewAllLink
              to={`/discover?q=${encodeURIComponent(q)}`}
              label="View All Matching People"
            />
          </section>

          {/* ── Section: Jobs ──────────────────────────────── */}
          <section id="search-jobs" aria-label="Job results">
            <SectionHeader
              icon={BriefcaseBusiness}
              title="Jobs"
              count={jobs.length}
              accentClass="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
            />
            {jobs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <EmptySection label="jobs" />
            )}
            <ViewAllLink
              to={`/jobs?q=${encodeURIComponent(q)}`}
              label="View All Matching Jobs"
            />
          </section>

          {/* ── Section: Projects ──────────────────────────── */}
          <section id="search-projects" aria-label="Project results">
            <SectionHeader
              icon={Rocket}
              title="Projects"
              count={projects.length}
              accentClass="bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
            />
            {projects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(({ project }) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onJoin={() => {}}
                  />
                ))}
              </div>
            ) : (
              <EmptySection label="projects" />
            )}
            <ViewAllLink
              to={`/projects?q=${encodeURIComponent(q)}`}
              label="View All Matching Projects"
            />
          </section>

          {/* ── Section: Hackathons ────────────────────────── */}
          <section id="search-hackathons" aria-label="Hackathon results">
            <SectionHeader
              icon={Gavel}
              title="Hackathons"
              count={hackathons.length}
              accentClass="bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400"
            />
            {hackathons.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {hackathons.map(({ hackathon }) => (
                  <HackathonCard key={hackathon.id} hackathon={hackathon} />
                ))}
              </div>
            ) : (
              <EmptySection label="hackathons" />
            )}
            <ViewAllLink
              to={`/hackathons?q=${encodeURIComponent(q)}`}
              label="View All Matching Hackathons"
            />
          </section>

          {/* ── Section: Companies ─────────────────────────── */}
          <section id="search-companies" aria-label="Company results">
            <SectionHeader
              icon={Building2}
              title="Companies"
              count={companies.length}
              accentClass="bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400"
            />
            {companies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {companies.map((company) => (
                  <CompanyMiniCard key={company.id} company={company} />
                ))}
              </div>
            ) : (
              <EmptySection label="companies" />
            )}
            <ViewAllLink
              to={`/companies?q=${encodeURIComponent(q)}`}
              label="View All Matching Companies"
            />
          </section>

          {/* ── Section: Communities ───────────────────────── */}
          <section id="search-communities" aria-label="Community results">
            <SectionHeader
              icon={Hash}
              title="Communities"
              count={communities.length}
              accentClass="bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
            />
            {communities.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {communities.map((community) => (
                  <CommunityMiniCard key={community.id} community={community} />
                ))}
              </div>
            ) : (
              <EmptySection label="communities" />
            )}
            <ViewAllLink
              to={`/communities?q=${encodeURIComponent(q)}`}
              label="View All Matching Communities"
            />
          </section>

        </div>
      )}
    </div>
  );
}
