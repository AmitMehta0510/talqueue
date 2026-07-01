import React, { useState, useEffect, ReactNode } from "react";
import {
  Briefcase,
  Loader2,
  X,
  Plus,
  GraduationCap,
  ShieldCheck,
  Calendar,
  Save,
  ChevronDown,
} from "lucide-react";
import { ExperienceCard } from "../cards/ProfileCards";
import { useCompaniesQuery } from "../../hooks/usePlatformQueries";
import { Field, EmptySection, emptyExperienceForm } from "./ProfileHelpers";

export interface ProfileExperienceProps {
  experiences: any[];
  isFetching: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  showForm: boolean;
  onToggleForm: () => void;
  form: typeof emptyExperienceForm;
  onFormChange: (f: typeof emptyExperienceForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  editingId: string | null;
  onEdit: (exp: any) => void;
  onDelete: (exp: any) => void;
  onCancel: () => void;
  onVerify?: (experienceId: string, email: string, code?: string) => Promise<any>;
  tpoMemberships?: any[];
  collegeAdminships?: any[];
}

export function ProfileExperience({
  experiences,
  isFetching,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  showForm,
  onToggleForm,
  form,
  onFormChange,
  onSubmit,
  isPending,
  editingId,
  onEdit,
  onDelete,
  onCancel,
  onVerify,
  tpoMemberships,
  collegeAdminships,
}: ProfileExperienceProps) {
  const { data: companyPage } = useCompaniesQuery({ limit: 100 });
  const companies = companyPage?.companies || [];

  const [isOther, setIsOther] = useState(false);

  // Sync isOther state when editingId changes or form switches
  useEffect(() => {
    if (form.companyName) {
      const exists = companies.some((c) => c.name === form.companyName);
      setIsOther(!exists);
    } else {
      setIsOther(false);
    }
  }, [editingId, companies, showForm, form.companyName]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-primary">Work Experience</h2>
          {isFetching && <Loader2 className="animate-spin text-muted-fg" size={15} />}
        </div>
        <button
          id="profile-add-experience-btn"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
          onClick={editingId ? onCancel : onToggleForm}
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "Add Experience"}
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="panel p-5 border-brand/30">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
            <Briefcase size={15} className="text-brand" />
            {editingId ? "Edit Experience" : "New Experience"}
          </h3>
          <form onSubmit={onSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Company *">
                <select
                  className="field"
                  value={isOther ? "OTHER" : (form.companyName || "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "OTHER") {
                      setIsOther(true);
                      onFormChange({ ...form, companyName: "" });
                    } else {
                      setIsOther(false);
                      const matched = companies.find((c) => c.name === val);
                      onFormChange({
                        ...form,
                        companyName: val,
                        companyWebsiteUrl: matched?.websiteUrl || form.companyWebsiteUrl || "",
                      });
                    }
                  }}
                  required
                >
                  <option value="" disabled>Select a company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  <option value="OTHER">Other (specify name)...</option>
                </select>
              </Field>

              {isOther && (
                <Field label="Specify Company Name *">
                  <input
                    className="field"
                    value={form.companyName}
                    onChange={(e) => onFormChange({ ...form, companyName: e.target.value })}
                    placeholder="E.g. Acme Corp"
                    required
                  />
                </Field>
              )}
              <Field label="Company website URL">
                <input
                  className="field"
                  type="url"
                  value={form.companyWebsiteUrl}
                  onChange={(e) => onFormChange({ ...form, companyWebsiteUrl: e.target.value })}
                  placeholder="https://company.com"
                />
              </Field>
              <Field label="Title *">
                <input
                  className="field"
                  value={form.title}
                  onChange={(e) => onFormChange({ ...form, title: e.target.value })}
                  placeholder="Software Engineer"
                  required
                />
              </Field>
              <Field label="Type">
                <select
                  className="field"
                  value={form.employmentType}
                  onChange={(e) => onFormChange({ ...form, employmentType: e.target.value })}
                >
                  <option value="FULL_TIME">Full-time</option>
                  <option value="INTERNSHIP">Internship</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="FREELANCE">Freelance</option>
                </select>
              </Field>
              <Field label="Start date *">
                <input
                  className="field"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => onFormChange({ ...form, startDate: e.target.value })}
                  required
                />
              </Field>
              <Field label="End date">
                <input
                  className="field"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => onFormChange({ ...form, endDate: e.target.value })}
                  disabled={form.isCurrent}
                />
              </Field>
              <div className="flex items-center">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition hover:border-indigo-500 border-base bg-surface text-secondary">
                  <input
                    type="checkbox"
                    checked={form.isCurrent}
                    onChange={(e) =>
                      onFormChange({ ...form, isCurrent: e.target.checked, endDate: e.target.checked ? "" : form.endDate })
                    }
                  />
                  Current role
                </label>
              </div>
              <Field label="Work email (for verification)">
                <input
                  className="field"
                  value={form.workEmail}
                  onChange={(e) => onFormChange({ ...form, workEmail: e.target.value })}
                  placeholder="you@company.com"
                />
              </Field>
              <Field label="Manager name">
                <input
                  className="field"
                  value={form.managerName}
                  onChange={(e) => onFormChange({ ...form, managerName: e.target.value })}
                  placeholder="Manager's name"
                />
              </Field>
              <Field label="Manager email">
                <input
                  className="field"
                  value={form.managerEmail}
                  onChange={(e) => onFormChange({ ...form, managerEmail: e.target.value })}
                  placeholder="manager@company.com"
                />
              </Field>
              {/* Manager LinkedIn field hidden in UI to avoid direct competing links, preserved in model state */}
              <Field label="Tech stack (comma separated)">
                <input
                  className="field"
                  value={form.techStack}
                  onChange={(e) => onFormChange({ ...form, techStack: e.target.value })}
                  placeholder="React, Node.js, PostgreSQL"
                />
              </Field>
              <Field label="Skills used (comma separated)">
                <input
                  className="field"
                  value={form.skillsUsed}
                  onChange={(e) => onFormChange({ ...form, skillsUsed: e.target.value })}
                  placeholder="TypeScript, Docker"
                />
              </Field>
              <Field label="Team size">
                <input
                  className="field"
                  type="number"
                  value={form.teamSize}
                  onChange={(e) => onFormChange({ ...form, teamSize: e.target.value })}
                  placeholder="5"
                />
              </Field>
              <Field label="Description" className="md:col-span-2">
                <textarea
                  className="field min-h-24"
                  value={form.description}
                  onChange={(e) => onFormChange({ ...form, description: e.target.value })}
                  placeholder="Describe your responsibilities and achievements..."
                />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="btn-primary" type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" size={15} /> : editingId ? <Save size={15} /> : <Plus size={15} />}
                {editingId ? "Save Experience" : "Add Experience"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {experiences.length === 0 && (!tpoMemberships || tpoMemberships.length === 0) && (!collegeAdminships || collegeAdminships.length === 0) && !isFetching ? (
        <EmptySection
          icon={Briefcase}
          title="No experience yet"
          text="Add your first role, internship, or project to showcase your journey."
          action={
            <button className="btn-primary mt-2" onClick={onToggleForm}>
              <Plus size={15} /> Add Experience
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {/* TPO Memberships */}
          {tpoMemberships && tpoMemberships.map((tpo: any) => (
            <article key={tpo.id} className="group relative flex flex-col gap-4 panel p-5 border border-indigo-500/10 hover:border-indigo-500/40 dark:hover:border-indigo-400/40">
              <div className="flex gap-4">
                <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-500 dark:from-indigo-950/40 dark:to-indigo-900/40 dark:text-indigo-400">
                  <GraduationCap size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-primary">Training & Placement Officer (TPO)</h4>
                      <p className="mt-0.5 text-sm text-secondary">{tpo.college?.name || "Target College"}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 pr-12">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900/40">
                        <ShieldCheck size={11} />
                        Verified Staff
                      </span>
                      <span className="chip">
                        Academic Staff
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-fg">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Active Institutional Administrator
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}

          {/* College Adminships */}
          {collegeAdminships && collegeAdminships.map((admin: any) => (
            <article key={admin.id} className="group relative flex flex-col gap-4 panel p-5 border border-indigo-500/10 hover:border-indigo-500/40 dark:hover:border-indigo-400/40">
              <div className="flex gap-4">
                <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-500 dark:from-indigo-950/40 dark:to-indigo-900/40 dark:text-indigo-400">
                  <GraduationCap size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-primary">College Placement Administrator</h4>
                      <p className="mt-0.5 text-sm text-secondary">{admin.college?.name || "Target College"}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 pr-12">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900/40">
                        <ShieldCheck size={11} />
                        Verified Admin
                      </span>
                      <span className="chip">
                        Academic Staff
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-fg">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Active Institutional Administrator
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}

          {experiences.map((exp) => (
            <ExperienceCard
              key={exp.id}
              experience={exp}
              onEdit={() => onEdit(exp)}
              onDelete={() => onDelete(exp)}
              onVerify={(email, code) => onVerify ? onVerify(exp.id, email, code) : Promise.reject("Verification not available")}
            />
          ))}
        </div>
      )}

      {hasNextPage && (
        <button
          className="btn-secondary w-full"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? <Loader2 className="animate-spin" size={15} /> : <ChevronDown size={15} />}
          Load more
        </button>
      )}
    </div>
  );
}


