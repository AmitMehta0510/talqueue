import React, { FormEvent, useState } from "react";
import { Building2, GraduationCap, Info, Loader2, MapPin, Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, Metric } from "../ui";
import { College, User } from "../../lib/api";
import { formatCount, cleanLogoUrl } from "../../core/utils/format";

interface CollegeLogoProps {
  college: College;
}

function CollegeLogo({ college }: CollegeLogoProps) {
  const logoUrl = cleanLogoUrl(college.logoUrl);
  if (logoUrl) {
    return (
      <img
        className="h-11 w-11 rounded-md object-cover"
        src={logoUrl}
        alt={college.name}
      />
    );
  }

  return (
    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400">
      <GraduationCap size={21} />
    </div>
  );
}

interface CreateCollegePanelProps {
  disabled?: boolean;
  onCreateCollege: (payload: {
    name: string;
    city: string;
    state: string;
    website: string;
    logoUrl: string;
  }) => Promise<void>;
  isCreatingCollege: boolean;
}

function CreateCollegePanel({ disabled, onCreateCollege, isCreatingCollege }: CreateCollegePanelProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    state: "",
    website: "",
    logoUrl: "",
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await onCreateCollege({
        name: form.name,
        city: form.city,
        state: form.state,
        website: form.website,
        logoUrl: form.logoUrl,
      });
      setForm({ name: "", city: "", state: "", website: "", logoUrl: "" });
      setOpen(false);
    } catch {
      return;
    }
  };

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>College catalog</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Browse institutions, departments, and official campus communities.
          </p>
        </div>
        <button
          className="btn-primary"
          type="button"
          disabled={disabled}
          onClick={() => setOpen((value) => !value)}
        >
          <Plus size={16} />
          Add college
        </button>
      </div>

      {open && (
        <form className="mt-5 space-y-3 border-t pt-5" onSubmit={submit} style={{ borderColor: "var(--border)" }}>
          <div className="grid gap-3 md:grid-cols-[1fr_12rem_12rem]">
            <input
              className="field"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="College name"
              required
            />
            <input
              className="field"
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              placeholder="City"
            />
            <input
              className="field"
              value={form.state}
              onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
              placeholder="State"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="field"
              value={form.website}
              onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
              placeholder="Website URL"
            />
            <input
              className="field"
              value={form.logoUrl}
              onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))}
              placeholder="Logo URL"
            />
          </div>
          <button className="btn-primary" type="submit" disabled={isCreatingCollege}>
            {isCreatingCollege ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Save college
          </button>
        </form>
      )}
    </div>
  );
}

function RequestCollegePanel() {
  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>College catalog</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Browse institutions, departments, and official campus communities.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-4 py-2.5">
          <Info size={15} className="shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
            To add your college, contact a platform admin or email <span className="underline">admin@platform.com</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

interface CollegeCardProps {
  college: College;
}

function CollegeCard({ college }: CollegeCardProps) {
  const location = [college.city, college.state].filter(Boolean).join(", ") || "Location unlisted";

  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <CollegeLogo college={college} />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{college.name}</h3>
            <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>{location}</p>
          </div>
        </div>
        <Link className="btn-secondary px-3 py-1.5" to={`/colleges/${college.normalizedKey || college.id}`}>
          Open
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Metric label="Departments" value={formatCount(college._count?.departments)} />
        <Metric label="Profiles" value={formatCount(college._count?.profiles)} />
        <Metric label="Educations" value={formatCount(college._count?.educations)} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
        {college.website && (
          <a className="btn-secondary px-3 py-1.5" href={college.website} rel="noreferrer" target="_blank">
            Website
          </a>
        )}
        <Link className="btn-secondary px-3 py-1.5" to={`/communities?q=${encodeURIComponent(college.name)}`}>
          Community
        </Link>
      </div>
    </article>
  );
}

export interface CollegeListProps {
  query: string;
  setQuery: (val: string) => void;
  filteredColleges: College[];
  isFetchingList: boolean;
  isSearching: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  isAdmin: boolean;
  user: User | null;
  onCreateCollege: (payload: {
    name: string;
    city: string;
    state: string;
    website: string;
    logoUrl: string;
  }) => Promise<void>;
  isCreatingCollege: boolean;
}

export function CollegeList({
  query,
  setQuery,
  filteredColleges,
  isFetchingList,
  isSearching,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isAdmin,
  user,
  onCreateCollege,
  isCreatingCollege,
}: CollegeListProps) {
  return (
    <section className="space-y-5">
      {/* Admin sees Add College; normal users see info panel */}
      {isAdmin ? (
        <CreateCollegePanel
          disabled={!user}
          onCreateCollege={onCreateCollege}
          isCreatingCollege={isCreatingCollege}
        />
      ) : (
        <RequestCollegePanel />
      )}

      <div className="panel p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: "var(--text-muted)" }} />
          <input
            className="field pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search colleges"
          />
        </div>
      </div>

      {isFetchingList && (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <Loader2 className="animate-spin" size={16} />
          Loading colleges
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {filteredColleges.length ? (
          filteredColleges.map((college) => <CollegeCard college={college} key={college.id} />)
        ) : (
          <EmptyState
            icon={Building2}
            title="No colleges found"
            text="College records from the backend will appear here."
          />
        )}
      </div>

      {!isSearching && hasNextPage && (
        <button
          className="btn-secondary w-full"
          type="button"
          disabled={isFetchingNextPage}
          onClick={fetchNextPage}
        >
          {isFetchingNextPage ? <Loader2 className="animate-spin" size={16} /> : <GraduationCap size={16} />}
          Load more
        </button>
      )}
    </section>
  );
}
