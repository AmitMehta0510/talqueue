import { FormEvent, useMemo, useState } from "react";
import { Building2, GraduationCap, Info, Loader2, Plus, Search, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState, Metric } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import {
  useCollegesQuery,
  useCreateCollegeMutation,
  useCreateDepartmentMutation,
  useDepartmentsQuery,
} from "../hooks/usePlatformQueries";
import { College } from "../lib/api";
import { compactPayload, formatCount, formatDate } from "../lib/format";

// Role helpers
const SUPER_ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"]);
function isSuperOrPlatformAdmin(user: any): boolean {
  if (!user?.roles) return false;
  return (user.roles as Array<{ role?: { name?: string } }>).some(
    (r) => r.role?.name && SUPER_ADMIN_ROLES.has(r.role.name)
  );
}

const flattenColleges = (pages?: Array<{ colleges: College[] }>) =>
  (pages || []).flatMap((page) => page.colleges || []);

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function CollegeLogo({ college }: { college: College }) {
  if (college.logoUrl) {
    return (
      <img
        className="h-11 w-11 rounded-md object-cover"
        src={college.logoUrl}
        alt={college.name}
      />
    );
  }

  return (
    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
      <GraduationCap size={21} />
    </div>
  );
}

function CreateCollegePanel({ disabled }: { disabled?: boolean }) {
  const createCollege = useCreateCollegeMutation();
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
      await createCollege.mutateAsync({
        name: form.name,
        ...compactPayload({
          city: form.city,
          state: form.state,
          website: form.website,
          logoUrl: form.logoUrl,
        }),
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
          <h2 className="text-lg font-bold text-slate-950">College catalog</h2>
          <p className="mt-1 text-sm text-slate-500">
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
        <form className="mt-5 space-y-3 border-t border-slate-100 pt-5" onSubmit={submit}>
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
          <button className="btn-primary" type="submit" disabled={createCollege.isPending}>
            {createCollege.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Save college
          </button>
        </form>
      )}
    </div>
  );
}

// Request college panel — shown to non-admin users
function RequestCollegePanel() {
  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">College catalog</h2>
          <p className="mt-1 text-sm text-slate-500">
            Browse institutions, departments, and official campus communities.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
          <Info size={15} className="shrink-0 text-blue-600" />
          <p className="text-xs font-semibold text-blue-700">
            To add your college, contact a platform admin or email <span className="underline">admin@platform.com</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

function CollegeCard({ college }: { college: College }) {
  const location = [college.city, college.state].filter(Boolean).join(", ") || "Location unlisted";

  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <CollegeLogo college={college} />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-950">{college.name}</h3>
            <p className="truncate text-xs text-slate-500">{location}</p>
          </div>
        </div>
        <Link className="btn-secondary px-3 py-1.5" to={`/colleges/${college.id}`}>
          Open
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Metric label="Departments" value={formatCount(college._count?.departments)} />
        <Metric label="Profiles" value={formatCount(college._count?.profiles)} />
        <Metric label="Educations" value={formatCount(college._count?.educations)} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {college.website && (
          <a className="btn-secondary px-3 py-1.5" href={college.website} rel="noreferrer" target="_blank">
            Website
          </a>
        )}
        <Link className="btn-secondary px-3 py-1.5" to={`/communities/${slugify(`${college.name} Official`)}`}>
          Community
        </Link>
      </div>
    </article>
  );
}

function CollegeDetail({ collegeId }: { collegeId: string }) {
  const collegesQuery = useCollegesQuery(100);
  const colleges = flattenColleges(collegesQuery.data?.pages);
  const college = colleges.find((item) => item.id === collegeId);
  const departmentsQuery = useDepartmentsQuery(collegeId);
  const createDepartment = useCreateDepartmentMutation(collegeId);
  const [departmentName, setDepartmentName] = useState("");

  const submitDepartment = (event: FormEvent) => {
    event.preventDefault();
    createDepartment.mutate(departmentName, {
      onSuccess: () => setDepartmentName(""),
    });
  };

  if (collegesQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="animate-spin" size={16} />
        Loading college
      </div>
    );
  }

  if (!college) {
    return <EmptyState icon={GraduationCap} title="College not found" text="This college is unavailable." />;
  }

  return (
    <section className="space-y-5">
      <Link className="text-sm font-semibold text-emerald-700 hover:text-emerald-900" to="/colleges">
        Back to colleges
      </Link>

      <div className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-4">
            <CollegeLogo college={college} />
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-slate-950">{college.name}</h2>
              <p className="mt-2 text-sm text-slate-500">
                {[college.city, college.state].filter(Boolean).join(", ") || "Location unlisted"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {college.website && (
              <a className="btn-secondary" href={college.website} rel="noreferrer" target="_blank">
                Website
              </a>
            )}
            <Link className="btn-primary" to={`/communities/${slugify(`${college.name} Official`)}`}>
              <Users size={16} />
              Official community
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Departments" value={formatCount(college._count?.departments)} />
          <Metric label="Profiles" value={formatCount(college._count?.profiles)} />
          <Metric label="Educations" value={formatCount(college._count?.educations)} />
          <Metric label="Created" value={college.createdAt ? formatDate(college.createdAt) : "Catalog"} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_23rem]">
        <div className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-950">Departments</h3>
            {departmentsQuery.isFetching && <Loader2 className="animate-spin text-slate-400" size={15} />}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(departmentsQuery.data || []).length ? (
              (departmentsQuery.data || []).map((department) => (
                <div className="rounded-md border border-slate-100 p-3" key={department.id}>
                  <div className="text-sm font-semibold text-slate-900">{department.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {department.createdAt ? formatDate(department.createdAt) : "Department"}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No departments listed yet.</p>
            )}
          </div>
        </div>

        <aside className="panel p-5">
          <h3 className="text-sm font-semibold text-slate-950">Add department</h3>
          <form className="mt-4 space-y-3" onSubmit={submitDepartment}>
            <input
              className="field"
              value={departmentName}
              onChange={(event) => setDepartmentName(event.target.value)}
              placeholder="Department name"
              required
            />
            <button className="btn-primary w-full" type="submit" disabled={createDepartment.isPending}>
              {createDepartment.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Save department
            </button>
          </form>
        </aside>
      </div>
    </section>
  );
}

export function CollegesPage() {
  const { collegeId } = useParams();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const collegesQuery = useCollegesQuery(40);
  const colleges = flattenColleges(collegesQuery.data?.pages);
  const isAdmin = isSuperOrPlatformAdmin(user);

  const filteredColleges = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return colleges.filter((college) => {
      const haystack = [college.name, college.city, college.state].filter(Boolean).join(" ").toLowerCase();
      return !normalizedQuery || haystack.includes(normalizedQuery);
    });
  }, [colleges, query]);

  if (collegeId) {
    return <CollegeDetail collegeId={collegeId} />;
  }

  return (
    <section className="space-y-5">
      {/* Admin sees Add College; normal users see info panel */}
      {isAdmin ? <CreateCollegePanel disabled={!user} /> : <RequestCollegePanel />}

      <div className="panel p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            className="field pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search colleges"
          />
        </div>
      </div>

      {collegesQuery.isFetching && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
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

      {collegesQuery.hasNextPage && (
        <button
          className="btn-secondary w-full"
          type="button"
          disabled={collegesQuery.isFetchingNextPage}
          onClick={() => collegesQuery.fetchNextPage()}
        >
          {collegesQuery.isFetchingNextPage ? <Loader2 className="animate-spin" size={16} /> : <GraduationCap size={16} />}
          Load more
        </button>
      )}
    </section>
  );
}
