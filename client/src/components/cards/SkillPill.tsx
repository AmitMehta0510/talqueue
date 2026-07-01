import { ShieldCheck, X } from "lucide-react";
import { UserSkill } from "../../lib/api";
import { titleCase } from "../../core/utils/format";

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER:     "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/60",
  INTERMEDIATE: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40",
  ADVANCED:     "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/40",
  EXPERT:       "bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900/40",
};

interface SkillPillProps {
  /** The skill record containing name, normalizedName, level, and verification status. */
  skill: UserSkill;
  /** Whether to render a larger layout suited for profile skills list views. */
  large?: boolean;
  /** Optional callback to remove the skill. */
  onRemove?: () => void;
  /** Optional callback when the skill is clicked. */
  onClick?: () => void;
}

/**
 * Renders a skill chip (pill) highlighting skill name, expertise level,
 * verification badge, and removal button, with support for small and large sizes.
 */
export function SkillPill({
  skill,
  large = false,
  onRemove,
  onClick,
}: SkillPillProps) {
  const levelClass = skill.level
    ? (LEVEL_COLORS[skill.level] || LEVEL_COLORS.BEGINNER)
    : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/60";
  const levelLabel = skill.level ? titleCase(skill.level) : null;

  const verifiedBadge = skill.verified && (
    <span className="inline-flex items-center gap-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 px-1 py-0.5 text-[10px] font-bold text-indigo-800 dark:text-indigo-400 ring-1 ring-indigo-300 dark:ring-indigo-900/60">
      <ShieldCheck size={10} />
      Verified
    </span>
  );

  const unverifiedBadge = !skill.verified && (
    <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 dark:bg-slate-800/40 px-1 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 border-dashed">
      Self-Claimed
    </span>
  );

  if (large) {
    return (
      <div
        className={`group/skill relative flex items-center gap-2 rounded-lg border px-3 py-2 ${levelClass} ${
          onClick ? "cursor-pointer hover:shadow-sm transition hover:border-slate-300 dark:hover:border-slate-600" : ""
        }`}
        onClick={onClick}
      >
        <span className="text-sm font-medium">
          {skill.skill?.name || skill.skill?.normalizedName || "Skill"}
        </span>
        {levelLabel && (
          <span className="rounded-full bg-white/60 dark:bg-black/20 px-1.5 py-0.5 text-xs font-medium">
            {levelLabel}
          </span>
        )}
        {verifiedBadge}
        {unverifiedBadge}
        {onRemove && (
          <button
            className="ml-1 rounded-full p-0.5 opacity-0 transition-opacity hover:bg-red-100 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 group-hover/skill:opacity-100"
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${levelClass} ${
        onClick ? "cursor-pointer hover:shadow-sm transition hover:border-slate-300 dark:hover:border-slate-600" : ""
      }`}
      onClick={onClick}
    >
      {skill.skill?.name || skill.skill?.normalizedName || "Skill"}
      {levelLabel && <span className="opacity-60">· {levelLabel}</span>}
      {skill.verified && <ShieldCheck size={11} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
    </span>
  );
}
