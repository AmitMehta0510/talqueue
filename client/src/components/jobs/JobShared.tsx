import { X } from "lucide-react";
import { formatCount, titleCase } from "../../core/utils/format";
import { SkeletonBlock } from "../ui";

// ---------------------------------------------------------------------------
// Salary formatter (Indian-style ₹ LPA)
// ---------------------------------------------------------------------------
export function formatSalary(min?: number | null, max?: number | null) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 100000
      ? `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)} LPA`
      : `₹${formatCount(n)}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  return `From ${fmt(min!)}`;
}

// ---------------------------------------------------------------------------
// Role keywords mappings
// ---------------------------------------------------------------------------
export const ROLE_MAPPINGS: Record<string, string[]> = {
  "Frontend Developer": ["frontend", "front-end", "ui", "react", "angular", "vue", "javascript"],
  "Backend Developer": ["backend", "back-end", "node", "django", "spring", "golang", "python developer", "java developer", "c#", "net developer", "ruby"],
  "Fullstack Developer": ["fullstack", "full-stack", "full stack"],
  "Mobile Engineer": ["mobile", "ios", "android", "flutter", "react native", "swift"],
  "DevOps & SRE": ["devops", "sre", "cloud", "infrastructure", "aws", "kubernetes", "platform engineer", "docker", "ci/cd"],
  "Data & AI / ML": ["data", "machine learning", "ml", "ai", "artificial intelligence", "data scientist", "data engineer", "deep learning", "nlp"],
  "Product Management": ["product manager", "pm", "product management", "product owner"],
  "QA & Testing": ["qa", "quality assurance", "test", "testing", "automation engineer", "sdet", "selenium"],
  "Software Engineering / General": ["software engineer", "software developer", "engineer", "developer", "programmer", "architect"]
};

// ---------------------------------------------------------------------------
// Active filter chips — dark mode aware
// ---------------------------------------------------------------------------
export function ActiveFilters({
  workModes,
  jobTypes,
  salaryRange,
  roles,
  skills,
  locations,
  freshness,
  onRemoveWorkMode,
  onRemoveJobType,
  onClearSalary,
  onRemoveRole,
  onRemoveSkill,
  onRemoveLocation,
  onClearFreshness,
  onClearAll,
}: {
  workModes: string[];
  jobTypes: string[];
  salaryRange: [number, number];
  roles: string[];
  skills: string[];
  locations: string[];
  freshness: string | null;
  onRemoveWorkMode: (m: string) => void;
  onRemoveJobType: (t: string) => void;
  onClearSalary: () => void;
  onRemoveRole: (r: string) => void;
  onRemoveSkill: (s: string) => void;
  onRemoveLocation: (l: string) => void;
  onClearFreshness: () => void;
  onClearAll: () => void;
}) {
  const isSalaryActive = salaryRange[0] > 0 || salaryRange[1] < 50;
  const hasAny = workModes.length > 0 || jobTypes.length > 0 || isSalaryActive || roles.length > 0 || skills.length > 0 || locations.length > 0 || !!freshness;
  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Applied:</span>
      {workModes.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onRemoveWorkMode(m)}
          className="flex items-center gap-1 rounded-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
        >
          {titleCase(m)} <X size={10} />
        </button>
      ))}
      {jobTypes.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onRemoveJobType(t)}
          className="flex items-center gap-1 rounded-full border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
        >
          {titleCase(t)} <X size={10} />
        </button>
      ))}
      {isSalaryActive && (
        <button
          type="button"
          onClick={onClearSalary}
          className="flex items-center gap-1 rounded-full border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
        >
          {salaryRange[0]} – {salaryRange[1] >= 50 ? "50+ LPA" : `${salaryRange[1]} LPA`} <X size={10} />
        </button>
      )}
      {roles.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onRemoveRole(r)}
          className="flex items-center gap-1 rounded-full border border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/30 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition"
        >
          {r} <X size={10} />
        </button>
      ))}
      {skills.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onRemoveSkill(s)}
          className="flex items-center gap-1 rounded-full border border-sky-200 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/30 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition"
        >
          {s} <X size={10} />
        </button>
      ))}
      {locations.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onRemoveLocation(l)}
          className="flex items-center gap-1 rounded-full border border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition"
        >
          {l} <X size={10} />
        </button>
      ))}
      {freshness && (
        <button
          type="button"
          onClick={onClearFreshness}
          className="flex items-center gap-1 rounded-full border border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/30 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition"
        >
          {freshness === "24h" ? "Past 24 hours" : freshness === "3d" ? "Past 3 days" : freshness === "7d" ? "Past week" : freshness === "15d" ? "Past 15 days" : "Past month"} <X size={10} />
        </button>
      )}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-semibold ml-1 hover:text-rose-500 transition"
        style={{ color: "var(--text-muted)" }}
      >
        Clear all
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Job Row Card Skeleton — premium shimmer loading state
// ---------------------------------------------------------------------------
export function JobRowCardSkeleton() {
  return (
    <div className="panel p-4 space-y-3 animate-pulse border border-base rounded-xl" style={{ background: "var(--bg-surface)" }}>
      <div className="flex items-start gap-3.5">
        <SkeletonBlock className="h-11 w-11 rounded-xl flex-shrink-0" />
        <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
          <SkeletonBlock className="h-3.5 w-1/2 rounded" />
          <SkeletonBlock className="h-2.5 w-1/4 rounded" />
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
        <SkeletonBlock className="h-3 w-16 rounded" />
        <SkeletonBlock className="h-3 w-20 rounded" />
        <SkeletonBlock className="h-3 w-14 rounded" />
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1.5">
        <SkeletonBlock className="h-4.5 w-12 rounded-lg" />
        <SkeletonBlock className="h-4.5 w-16 rounded-lg" />
        <SkeletonBlock className="h-4.5 w-14 rounded-lg" />
      </div>
    </div>
  );
}
