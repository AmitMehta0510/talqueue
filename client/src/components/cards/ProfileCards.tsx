import { GraduationCap, ShieldCheck } from "lucide-react";
import { Education, Experience, UserSkill } from "../../lib/api";
import { formatMonthYear, titleCase } from "../../lib/format";

export function ExperienceCard({ experience }: { experience: Experience }) {
  const stack = [...(experience.techStack || []), ...(experience.skillsUsed || [])];

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-slate-950">
            {experience.title || "Experience"}
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            {experience.companyName || experience.company?.name || "Company"} -{" "}
            {formatMonthYear(experience.startDate)} to {formatMonthYear(experience.endDate)}
          </p>
        </div>
        {experience.verified && (
          <span className="chip shrink-0 text-emerald-700">
            <ShieldCheck size={13} />
            Verified
          </span>
        )}
      </div>
      {experience.description && (
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
          {experience.description}
        </p>
      )}
      {stack.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {stack.slice(0, 5).map((item) => (
            <span className="chip" key={item}>
              {item}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export function EducationCard({ education }: { education: Education }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <GraduationCap size={18} />
        </div>
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-slate-950">
            {education.college?.name || "College"}
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            {[education.degree, education.fieldOfStudy, education.department?.name]
              .filter(Boolean)
              .join(" - ") || "Education"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {education.startYear || "Start"} -{" "}
            {education.current ? "Present" : education.endYear || "End"}
          </p>
        </div>
      </div>
    </article>
  );
}

export function SkillPill({ skill }: { skill: UserSkill }) {
  return (
    <span className="chip">
      {skill.skill?.name || skill.skill?.normalizedName || "Skill"}
      {skill.level ? ` - ${titleCase(skill.level)}` : ""}
    </span>
  );
}
