import { BriefcaseBusiness } from "lucide-react";
import { Job } from "../../lib/api";
import { formatCount, titleCase } from "../../lib/format";

export function JobCard({ job }: { job: Job }) {
  const salary =
    job.salaryMin || job.salaryMax
      ? `${job.currency || "INR"} ${formatCount(job.salaryMin || 0)} - ${formatCount(job.salaryMax || 0)}`
      : null;

  return (
    <article className="panel p-5">
      <div className="flex items-start gap-4">
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
          <BriefcaseBusiness size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-950">
              {job.title || "Open role"}
            </h3>
            {job.featured && <span className="chip text-amber-700">Featured</span>}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {job.company?.name || "Company"} - {job.location || "Remote"} - {titleCase(job.type)}
          </p>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
            {job.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(job.skillsRequired || []).slice(0, 5).map((skill) => (
          <span className="chip" key={skill}>
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span>{salary || titleCase(job.workMode || "OPEN")}</span>
        <span>{formatCount(job.applicationsCount)} applicants</span>
      </div>
    </article>
  );
}
