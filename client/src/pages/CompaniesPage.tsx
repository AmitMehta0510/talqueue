import { FormEvent, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  Check,
  ExternalLink,
  Github,
  Linkedin,
  Loader2,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Avatar, EmptyState, Metric } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import {
  useCompaniesQuery,
  useCompanyEmployeesQuery,
  useCompanyQuery,
  useCreateCompanyMutation,
  useSuggestedCompaniesQuery,
} from "../hooks/usePlatformQueries";
import { Company, CompanySize, CompanyType } from "../lib/api";
import { compactPayload, formatCount, formatDate, titleCase, userHeadline, userName } from "../lib/format";

const companyTypes: CompanyType[] = ["STARTUP", "PRODUCT_BASED", "SERVICE_BASED", "ENTERPRISE", "MNC", "OTHER"];
const companySizes: CompanySize[] = ["SOLO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"];

function CompanyLogo({ company }: { company: Company }) {
  if (company.logoUrl) {
    return (
      <img
        className="h-11 w-11 rounded-md object-cover"
        src={company.logoUrl}
        alt={company.name}
      />
    );
  }

  return (
    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
      <Building2 size={21} />
    </div>
  );
}

function StatusBadge({ value }: { value?: string | null }) {
  return <span className="chip">{titleCase(value) || "Unknown"}</span>;
}

function CreateCompanyPanel({ disabled }: { disabled?: boolean }) {
  const createCompany = useCreateCompanyMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    description: "",
    headquarters: "",
    industry: "",
    websiteUrl: "",
    careersPageUrl: "",
    logoUrl: "",
    linkedinUrl: "",
    githubUrl: "",
    foundedYear: "",
    type: "" as "" | CompanyType,
    size: "" as "" | CompanySize,
    hiringEnabled: true,
    referralEnabled: true,
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      await createCompany.mutateAsync({
        name: form.name,
        ...compactPayload({
          tagline: form.tagline,
          description: form.description,
          headquarters: form.headquarters,
          industry: form.industry,
          websiteUrl: form.websiteUrl,
          careersPageUrl: form.careersPageUrl,
          logoUrl: form.logoUrl,
          linkedinUrl: form.linkedinUrl,
          githubUrl: form.githubUrl,
          type: form.type || undefined,
          size: form.size || undefined,
        }),
        foundedYear: form.foundedYear ? Number(form.foundedYear) : undefined,
        hiringEnabled: form.hiringEnabled,
        referralEnabled: form.referralEnabled,
      });
      setForm({
        name: "",
        tagline: "",
        description: "",
        headquarters: "",
        industry: "",
        websiteUrl: "",
        careersPageUrl: "",
        logoUrl: "",
        linkedinUrl: "",
        githubUrl: "",
        foundedYear: "",
        type: "",
        size: "",
        hiringEnabled: true,
        referralEnabled: true,
      });
      setOpen(false);
    } catch {
      return;
    }
  };

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Companies</h2>
          <p className="mt-1 text-sm text-slate-500">
            Explore hiring teams, employee signals, and referral-friendly companies.
          </p>
        </div>
        <button
          className="btn-primary"
          type="button"
          disabled={disabled}
          onClick={() => setOpen((value) => !value)}
        >
          <Plus size={16} />
          Add company
        </button>
      </div>

      {open && (
        <form className="mt-5 space-y-3 border-t border-slate-100 pt-5" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_12rem]">
            <input
              className="field"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Company name"
              required
            />
            <input
              className="field"
              value={form.tagline}
              onChange={(event) => setForm((current) => ({ ...current, tagline: event.target.value }))}
              placeholder="Tagline"
            />
            <input
              className="field"
              min={1800}
              type="number"
              value={form.foundedYear}
              onChange={(event) => setForm((current) => ({ ...current, foundedYear: event.target.value }))}
              placeholder="Founded"
            />
          </div>
          <textarea
            className="field min-h-24"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Description"
          />
          <div className="grid gap-3 md:grid-cols-4">
            <input
              className="field"
              value={form.industry}
              onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))}
              placeholder="Industry"
            />
            <input
              className="field"
              value={form.headquarters}
              onChange={(event) => setForm((current) => ({ ...current, headquarters: event.target.value }))}
              placeholder="Headquarters"
            />
            <select
              className="field"
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as "" | CompanyType }))}
            >
              <option value="">Type</option>
              {companyTypes.map((type) => (
                <option key={type} value={type}>
                  {titleCase(type)}
                </option>
              ))}
            </select>
            <select
              className="field"
              value={form.size}
              onChange={(event) => setForm((current) => ({ ...current, size: event.target.value as "" | CompanySize }))}
            >
              <option value="">Size</option>
              {companySizes.map((size) => (
                <option key={size} value={size}>
                  {titleCase(size)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="field"
              value={form.websiteUrl}
              onChange={(event) => setForm((current) => ({ ...current, websiteUrl: event.target.value }))}
              placeholder="Website URL"
            />
            <input
              className="field"
              value={form.careersPageUrl}
              onChange={(event) => setForm((current) => ({ ...current, careersPageUrl: event.target.value }))}
              placeholder="Careers URL"
            />
            <input
              className="field"
              value={form.logoUrl}
              onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))}
              placeholder="Logo URL"
            />
            <input
              className="field"
              value={form.linkedinUrl}
              onChange={(event) => setForm((current) => ({ ...current, linkedinUrl: event.target.value }))}
              placeholder="LinkedIn URL"
            />
            <input
              className="field md:col-span-2"
              value={form.githubUrl}
              onChange={(event) => setForm((current) => ({ ...current, githubUrl: event.target.value }))}
              placeholder="GitHub URL"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.hiringEnabled}
                onChange={(event) => setForm((current) => ({ ...current, hiringEnabled: event.target.checked }))}
              />
              Hiring
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.referralEnabled}
                onChange={(event) => setForm((current) => ({ ...current, referralEnabled: event.target.checked }))}
              />
              Referrals
            </label>
          </div>
          <button className="btn-primary" type="submit" disabled={createCompany.isPending}>
            {createCompany.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Save company
          </button>
        </form>
      )}
    </div>
  );
}

function CompanyCard({ company, context }: { company: Company; context?: string }) {
  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyLogo company={company} />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-slate-950">{company.name}</h3>
              {company.verified && (
                <span className="chip shrink-0 text-emerald-700">
                  <Check size={13} />
                  Verified
                </span>
              )}
            </div>
            <p className="truncate text-xs text-slate-500">
              {company.tagline || company.industry || company.headquarters || "Company profile"}
            </p>
          </div>
        </div>
        <Link className="btn-secondary px-3 py-1.5" to={`/companies/${company.slug}`}>
          Open
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Metric label="Jobs" value={formatCount(company._count?.jobs)} />
        <Metric label="Employees" value={formatCount(company._count?.experiences)} />
        <Metric label="Rating" value={company.rating ? company.rating.toFixed(1) : "New"} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {context && <span className="chip">{context}</span>}
        {company.recommendationScore !== undefined && <span className="chip">Score {company.recommendationScore}</span>}
        {company.industry && <span className="chip">{company.industry}</span>}
        {company.headquarters && <span className="chip">{company.headquarters}</span>}
        {company.hiringEnabled && <span className="chip">Hiring</span>}
        {company.referralEnabled && <span className="chip">Referrals</span>}
      </div>
    </article>
  );
}

function CompanyFilters({
  onApply,
}: {
  onApply: (filters: {
    q?: string;
    industry?: string;
    location?: string;
    type?: CompanyType;
    size?: CompanySize;
    verified?: boolean;
    hiringEnabled?: boolean;
  }) => void;
}) {
  const [form, setForm] = useState({
    q: "",
    industry: "",
    location: "",
    type: "" as "" | CompanyType,
    size: "" as "" | CompanySize,
    verifiedOnly: false,
    hiringOnly: false,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onApply({
      ...compactPayload({
        q: form.q,
        industry: form.industry,
        location: form.location,
        type: form.type || undefined,
        size: form.size || undefined,
      }),
      verified: form.verifiedOnly || undefined,
      hiringEnabled: form.hiringOnly || undefined,
    });
  };

  return (
    <form className="panel p-4" onSubmit={submit}>
      <div className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem_11rem_11rem_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            className="field pl-9"
            value={form.q}
            onChange={(event) => setForm((current) => ({ ...current, q: event.target.value }))}
            placeholder="Search companies"
          />
        </div>
        <input
          className="field"
          value={form.industry}
          onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))}
          placeholder="Industry"
        />
        <input
          className="field"
          value={form.location}
          onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
          placeholder="Location"
        />
        <select
          className="field"
          value={form.type}
          onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as "" | CompanyType }))}
        >
          <option value="">Type</option>
          {companyTypes.map((type) => (
            <option key={type} value={type}>
              {titleCase(type)}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={form.size}
          onChange={(event) => setForm((current) => ({ ...current, size: event.target.value as "" | CompanySize }))}
        >
          <option value="">Size</option>
          {companySizes.map((size) => (
            <option key={size} value={size}>
              {titleCase(size)}
            </option>
          ))}
        </select>
        <button className="btn-primary" type="submit">
          <Search size={16} />
          Apply
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.verifiedOnly}
            onChange={(event) => setForm((current) => ({ ...current, verifiedOnly: event.target.checked }))}
          />
          Verified
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.hiringOnly}
            onChange={(event) => setForm((current) => ({ ...current, hiringOnly: event.target.checked }))}
          />
          Hiring
        </label>
      </div>
    </form>
  );
}

function SuggestedCompaniesPanel() {
  const suggestedQuery = useSuggestedCompaniesQuery();
  const companies = suggestedQuery.data || [];

  if (!companies.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-600">Suggested companies</h3>
        {suggestedQuery.isFetching && <Loader2 className="animate-spin text-slate-400" size={15} />}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {companies.slice(0, 4).map((company) => (
          <CompanyCard company={company} context="Recommended" key={company.id} />
        ))}
      </div>
    </div>
  );
}

function CompanyDetail({ slug }: { slug: string }) {
  const companyQuery = useCompanyQuery(slug);
  const company = companyQuery.data;
  const [employeePage, setEmployeePage] = useState(1);
  const employeesQuery = useCompanyEmployeesQuery(company?.id, employeePage, 10);
  const employees = employeesQuery.data?.employees || [];

  if (companyQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="animate-spin" size={16} />
        Loading company
      </div>
    );
  }

  if (!company) {
    return <EmptyState icon={Building2} title="Company not found" text="This company is unavailable." />;
  }

  return (
    <section className="space-y-5">
      <Link className="text-sm font-semibold text-emerald-700 hover:text-emerald-900" to="/companies">
        Back to companies
      </Link>

      <div className="panel overflow-hidden">
        {company.coverImageUrl && (
          <img className="h-48 w-full object-cover sm:h-64" src={company.coverImageUrl} alt={company.name} />
        )}
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 gap-4">
              <CompanyLogo company={company} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-950">{company.name}</h2>
                  {company.verified && (
                    <span className="chip text-emerald-700">
                      <Check size={13} />
                      Verified
                    </span>
                  )}
                  {company.type && <StatusBadge value={company.type} />}
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  {company.description || company.tagline || "No company description has been added yet."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {company.websiteUrl && (
                <a className="btn-secondary" href={company.websiteUrl} rel="noreferrer" target="_blank">
                  <ExternalLink size={16} />
                  Website
                </a>
              )}
              {company.linkedinUrl && (
                <a className="icon-btn" href={company.linkedinUrl} rel="noreferrer" target="_blank" title="LinkedIn">
                  <Linkedin size={17} />
                </a>
              )}
              {company.githubUrl && (
                <a className="icon-btn" href={company.githubUrl} rel="noreferrer" target="_blank" title="GitHub">
                  <Github size={17} />
                </a>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Metric label="Jobs" value={formatCount(company._count?.jobs)} />
            <Metric label="Employees" value={formatCount(company._count?.experiences)} />
            <Metric label="Referrals" value={formatCount(company._count?.referralRequests)} />
            <Metric label="Rating" value={company.rating ? company.rating.toFixed(1) : "New"} />
            <Metric label="Founded" value={company.foundedYear || "Unlisted"} />
            <Metric label="Size" value={titleCase(company.size) || "Unlisted"} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_23rem]">
        <div className="space-y-5">
          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-slate-950">Open jobs</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(company.jobs || []).length ? (
                (company.jobs || []).map((job) => (
                  <article className="rounded-md border border-slate-100 p-3" key={job.id}>
                    <div className="text-sm font-semibold text-slate-900">{job.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {[job.location, titleCase(job.workMode), titleCase(job.experienceLevel)].filter(Boolean).join(" - ")}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge value={job.type} />
                      {job.createdAt && <span className="chip">{formatDate(job.createdAt)}</span>}
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm text-slate-500">No open jobs listed.</p>
              )}
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-950">Current employees</h3>
              {employeesQuery.isFetching && <Loader2 className="animate-spin text-slate-400" size={15} />}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {employees.length ? (
                employees.map((employee) => (
                  <article className="rounded-md border border-slate-100 p-3" key={employee.id}>
                    <div className="flex items-center gap-3">
                      <Avatar user={employee.user} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{userName(employee.user)}</div>
                        <div className="truncate text-xs text-slate-500">
                          {employee.title || userHeadline(employee.user)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {employee.verified && <span className="chip text-emerald-700">Verified</span>}
                      {employee.workEmailVerified && <span className="chip">Work email</span>}
                      {employee.verificationScore !== undefined && (
                        <span className="chip">Score {Math.round(employee.verificationScore)}</span>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm text-slate-500">No current employees listed.</p>
              )}
            </div>
            {(employeesQuery.data?.totalPages || 0) > 1 && (
              <div className="mt-4 flex justify-end gap-2">
                <button
                  className="btn-secondary px-3 py-1.5"
                  type="button"
                  disabled={employeePage <= 1}
                  onClick={() => setEmployeePage((page) => Math.max(1, page - 1))}
                >
                  Previous
                </button>
                <button
                  className="btn-secondary px-3 py-1.5"
                  type="button"
                  disabled={employeePage >= (employeesQuery.data?.totalPages || 1)}
                  onClick={() => setEmployeePage((page) => page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-slate-950">Company signals</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {company.industry && <span className="chip">{company.industry}</span>}
              {company.headquarters && <span className="chip">{company.headquarters}</span>}
              {company.hiringEnabled && <span className="chip">Hiring enabled</span>}
              {company.referralEnabled && <span className="chip">Referral enabled</span>}
            </div>
            {company.careersPageUrl && (
              <a className="btn-primary mt-5 w-full" href={company.careersPageUrl} rel="noreferrer" target="_blank">
                <BriefcaseBusiness size={16} />
                Careers page
              </a>
            )}
          </div>

          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-slate-950">Employee preview</h3>
            <div className="mt-4 space-y-3">
              {(company.experiences || []).length ? (
                (company.experiences || []).map((experience) => (
                  <div className="flex items-center gap-3 rounded-md border border-slate-100 p-3" key={experience.id}>
                    <Avatar user={experience.user} size="sm" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{userName(experience.user)}</div>
                      <div className="truncate text-xs text-slate-500">{experience.title || "Employee"}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Employee previews will appear once profiles add experience.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function CompaniesPage() {
  const { companySlug } = useParams();
  const { user } = useAuth();
  const [filters, setFilters] = useState({});
  const companiesQuery = useCompaniesQuery({ page: 1, limit: 24, ...filters });
  const companies = companiesQuery.data?.companies || [];

  const totalLabel = useMemo(() => {
    if (!companiesQuery.data) return "Directory";
    return `${companiesQuery.data.total} companies`;
  }, [companiesQuery.data]);

  if (companySlug) {
    return <CompanyDetail slug={companySlug} />;
  }

  return (
    <section className="space-y-5">
      <CreateCompanyPanel disabled={!user} />
      <SuggestedCompaniesPanel />
      <CompanyFilters onApply={setFilters} />

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-600">{totalLabel}</h3>
        {companiesQuery.isFetching && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={16} />
            Loading companies
          </div>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {companies.length ? (
          companies.map((company) => <CompanyCard company={company} key={company.id} />)
        ) : (
          <EmptyState
            icon={Users}
            title="No companies found"
            text="Company records from the backend will appear here."
          />
        )}
      </div>
    </section>
  );
}
