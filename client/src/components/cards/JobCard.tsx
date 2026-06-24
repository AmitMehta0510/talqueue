import { BriefcaseBusiness } from "lucide-react";
import { Job } from "../../lib/api";
import { formatCount, titleCase } from "../../lib/format";

export function JobCard({ job }: { job: Job }) {
  const salary =
    job.salaryMin || job.salaryMax
      ? `${job.currency || "INR"} ${formatCount(job.salaryMin || 0)} - ${formatCount(job.salaryMax || 0)}`
      : null;

  return (
    <article className="panel p-5 hover-lift">
      <div className="flex items-start gap-4">
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <BriefcaseBusiness size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-primary">
              {job.title || "Open role"}
            </h3>
            {job.featured && <span className="chip text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20">Featured</span>}
          </div>
          <p className="mt-1 text-sm text-muted-fg">
            {job.company?.name || "Company"} - {job.location || "Remote"} - {titleCase(job.type)}
          </p>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-secondary">
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

      <div className="mt-5 flex items-center justify-between border-t border-base pt-4 text-xs text-muted-fg">
        <span>{salary || titleCase(job.workMode || "OPEN")}</span>
        <span>{formatCount(job.applicationsCount)} applicants</span>
      </div>
    </article>
  );
}
