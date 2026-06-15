import { GraduationCap, ShieldCheck, Briefcase, Calendar, Users, Code2, Pencil, Trash2, X } from "lucide-react";
import { Education, Experience, UserSkill } from "../../lib/api";
import { formatMonthYear, titleCase } from "../../lib/format";

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER:     "bg-slate-100 text-slate-600 border-slate-200",
  INTERMEDIATE: "bg-blue-50 text-blue-700 border-blue-100",
  ADVANCED:     "bg-emerald-50 text-emerald-700 border-emerald-100",
  EXPERT:       "bg-violet-50 text-violet-700 border-violet-100",
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  INTERN: "Internship",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
  FREELANCE: "Freelance",
};

export function ExperienceCard({
  experience,
  onEdit,
  onDelete,
}: {
  experience: Experience;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const stack = [...(experience.techStack || []), ...(experience.skillsUsed || [])];
  const companyName = experience.companyName || experience.company?.name || "Company";
  const employmentLabel = EMPLOYMENT_LABELS[experience.employmentType || ""] || experience.employmentType;
  const startLabel = formatMonthYear(experience.startDate);
  const endLabel = experience.isCurrent ? "Present" : formatMonthYear(experience.endDate ?? undefined);

  return (
    <article className="group relative flex gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-emerald-200 hover:shadow-md">
      {/* Action buttons */}
      {(onEdit || onDelete) && (
        <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit && (
            <button
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
              onClick={onEdit}
              title="Edit"
            >
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      {/* Company logo placeholder */}
      <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
        <Briefcase size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="font-semibold text-slate-900">{experience.title || "Role"}</h4>
            <p className="mt-0.5 text-sm text-slate-600">{companyName}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {experience.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                <ShieldCheck size={11} />
                Verified
              </span>
            )}
            {employmentLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                {employmentLabel}
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {startLabel} – {endLabel}
          </span>
          {experience.teamSize && (
            <span className="flex items-center gap-1">
              <Users size={12} />
              Team of {experience.teamSize}
            </span>
          )}
        </div>

        {experience.description && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
            {experience.description}
          </p>
        )}

        {stack.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Code2 size={13} className="mt-0.5 shrink-0 text-slate-400" />
            {stack.slice(0, 6).map((item) => (
              <span
                key={item}
                className="rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
              >
                {item}
              </span>
            ))}
            {stack.length > 6 && (
              <span className="rounded-full bg-slate-50 px-2 py-0.5 text-xs text-slate-400 ring-1 ring-slate-200">
                +{stack.length - 6}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function EducationCard({
  education,
  onEdit,
  onDelete,
}: {
  education: Education;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const yearRange = [
    education.startYear,
    education.current ? "Present" : education.endYear,
  ]
    .filter(Boolean)
    .join(" – ");

  const details = [education.degree, education.fieldOfStudy, education.department?.name]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="group relative flex gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-emerald-200 hover:shadow-md">
      {/* Action buttons */}
      {(onEdit || onDelete) && (
        <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit && (
            <button
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
              onClick={onEdit}
              title="Edit"
            >
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-700">
        <GraduationCap size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-semibold text-slate-900 truncate">
          {education.college?.name || "College"}
        </h4>
        {details && (
          <p className="mt-0.5 text-sm text-slate-600">{details}</p>
        )}
        {yearRange && (
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <Calendar size={12} />
            {yearRange}
          </p>
        )}
      </div>
    </article>
  );
}

export function SkillPill({
  skill,
  large = false,
  onRemove,
  onClick,
}: {
  skill: UserSkill;
  large?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
}) {
  const levelClass = skill.level ? (LEVEL_COLORS[skill.level] || LEVEL_COLORS.BEGINNER) : "bg-slate-50 text-slate-600 border-slate-200";
  const levelLabel = skill.level ? titleCase(skill.level) : null;

  const verifiedBadge = skill.verified && (
    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-300">
      <ShieldCheck size={10} />
      Verified
    </span>
  );

  const unverifiedBadge = !skill.verified && (
    <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-300 border-dashed">
      Self-Claimed
    </span>
  );

  if (large) {
    return (
      <div 
        className={`group/skill relative flex items-center gap-2 rounded-lg border px-3 py-2 ${levelClass} ${onClick ? "cursor-pointer hover:shadow-sm transition hover:border-slate-300" : ""}`}
        onClick={onClick}
      >
        <span className="text-sm font-medium">
          {skill.skill?.name || skill.skill?.normalizedName || "Skill"}
        </span>
        {levelLabel && (
          <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-xs font-medium">
            {levelLabel}
          </span>
        )}
        {verifiedBadge}
        {unverifiedBadge}
        {onRemove && (
          <button
            className="ml-1 rounded-full p-0.5 opacity-0 transition-opacity hover:bg-red-100 hover:text-red-600 group-hover/skill:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove skill"
          >
            <X size={13} />
          </button>
        )}
      </div>
    );
  }

  return (
    <span 
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${levelClass} ${onClick ? "cursor-pointer hover:shadow-sm transition hover:border-slate-300" : ""}`}
      onClick={onClick}
    >
      {skill.skill?.name || skill.skill?.normalizedName || "Skill"}
      {levelLabel && <span className="opacity-60">· {levelLabel}</span>}
      {skill.verified && <ShieldCheck size={11} className="text-emerald-600 shrink-0" />}
    </span>
  );
}
