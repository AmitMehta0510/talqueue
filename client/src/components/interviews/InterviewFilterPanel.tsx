import { Search, SlidersHorizontal, X } from "lucide-react";
import type {
  InterviewRoleTag,
  InterviewDifficulty,
  InterviewCompanyTag,
  InterviewRoundType,
  InterviewFormatTag,
} from "../../lib/api";

export interface InterviewFilters {
  search: string;
  roleTag: InterviewRoleTag | "";
  difficulty: InterviewDifficulty | "";
  companyTag: InterviewCompanyTag | "";
  roundType: InterviewRoundType | "";
  formatTag: InterviewFormatTag | "";
  langTag: string;
}

interface InterviewFilterPanelProps {
  filters: InterviewFilters;
  onChange: (filters: InterviewFilters) => void;
  resultCount?: number;
}

// ─── Option sets ──────────────────────────────────────────────────────────────

const ROLE_OPTIONS: Array<{ value: InterviewRoleTag | ""; label: string }> = [
  { value: "", label: "All Roles" },
  { value: "SDE_1", label: "SDE-1" },
  { value: "SDE_2", label: "SDE-2" },
  { value: "FRONTEND", label: "Frontend" },
  { value: "BACKEND", label: "Backend" },
  { value: "FULLSTACK", label: "Fullstack" },
  { value: "DEVOPS", label: "DevOps" },
  { value: "DATA_ML", label: "Data / ML" },
  { value: "MOBILE", label: "Mobile" },
  { value: "SYSTEM_DESIGN", label: "System Design" },
  { value: "BEHAVIORAL", label: "Behavioral" },
];

const DIFFICULTY_OPTIONS: Array<{ value: InterviewDifficulty | ""; label: string }> = [
  { value: "", label: "All Levels" },
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
];

const COMPANY_OPTIONS: Array<{ value: InterviewCompanyTag | ""; label: string }> = [
  { value: "", label: "All Companies" },
  { value: "FAANG", label: "FAANG" },
  { value: "MNC", label: "MNC" },
  { value: "STARTUP", label: "Startup" },
  { value: "ANY", label: "Any / General" },
];

const ROUND_OPTIONS: Array<{ value: InterviewRoundType | ""; label: string }> = [
  { value: "", label: "All Rounds" },
  { value: "CODING", label: "Coding" },
  { value: "SYSTEM_DESIGN", label: "System Design" },
  { value: "HR_BEHAVIORAL", label: "HR / Behavioral" },
  { value: "APTITUDE", label: "Aptitude" },
];

const FORMAT_OPTIONS: Array<{ value: InterviewFormatTag | ""; label: string }> = [
  { value: "", label: "All Formats" },
  { value: "MOCK_INTERVIEW", label: "Mock Interview" },
  { value: "QA_ONLY", label: "Q&A Only" },
  { value: "EXPLANATION", label: "Explanation" },
  { value: "WHITEBOARD", label: "Whiteboard" },
];

const LANG_OPTIONS = [
  "Node.js", "Spring Boot", "Python", "Go", "React", "Java",
  "JavaScript", "Django", "C++", "Kubernetes", "AWS",
];

// ─── Helper ───────────────────────────────────────────────────────────────────

const EMPTY: InterviewFilters = {
  search: "", roleTag: "", difficulty: "", companyTag: "",
  roundType: "", formatTag: "", langTag: "",
};

const hasActiveFilters = (f: InterviewFilters) =>
  f.roleTag || f.difficulty || f.companyTag || f.roundType || f.formatTag || f.langTag;

// ─── Component ────────────────────────────────────────────────────────────────

export function InterviewFilterPanel({
  filters,
  onChange,
  resultCount,
}: InterviewFilterPanelProps) {
  const set = (key: keyof InterviewFilters, value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <aside className="panel p-4 space-y-5 sticky top-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <SlidersHorizontal size={15} />
          Filters
        </div>
        {hasActiveFilters(filters) && (
          <button
            id="interview-clear-filters"
            type="button"
            onClick={() => onChange(EMPTY)}
            className="flex items-center gap-1 text-xs text-muted-fg hover:text-primary transition-colors"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg pointer-events-none"
        />
        <input
          id="interview-search"
          type="text"
          placeholder="Search interviews…"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="w-full rounded-lg border border-border bg-base-2 pl-8 pr-3 py-2 text-sm text-primary placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/40 transition"
        />
      </div>

      {/* Role */}
      <FilterSelect
        id="interview-filter-role"
        label="Role"
        value={filters.roleTag}
        options={ROLE_OPTIONS}
        onChange={(v) => set("roleTag", v)}
      />

      {/* Difficulty */}
      <FilterChips
        label="Difficulty"
        value={filters.difficulty}
        options={DIFFICULTY_OPTIONS.slice(1)}
        onChange={(v) => set("difficulty", filters.difficulty === v ? "" : v)}
        colorMap={{
          BEGINNER: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
          INTERMEDIATE: "bg-amber-500/15 text-amber-400 border-amber-500/25",
          ADVANCED: "bg-rose-500/15 text-rose-400 border-rose-500/25",
        }}
      />

      {/* Company */}
      <FilterSelect
        id="interview-filter-company"
        label="Company Type"
        value={filters.companyTag}
        options={COMPANY_OPTIONS}
        onChange={(v) => set("companyTag", v)}
      />

      {/* Round */}
      <FilterSelect
        id="interview-filter-round"
        label="Round Type"
        value={filters.roundType}
        options={ROUND_OPTIONS}
        onChange={(v) => set("roundType", v)}
      />

      {/* Format */}
      <FilterSelect
        id="interview-filter-format"
        label="Format"
        value={filters.formatTag}
        options={FORMAT_OPTIONS}
        onChange={(v) => set("formatTag", v)}
      />

      {/* Language / Framework */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-fg uppercase tracking-wide">
          Language / Framework
        </label>
        <div className="flex flex-wrap gap-1.5">
          {LANG_OPTIONS.map((lang) => (
            <button
              id={`interview-lang-${lang.replace(/\./g, "-").toLowerCase()}`}
              key={lang}
              type="button"
              onClick={() => set("langTag", filters.langTag === lang ? "" : lang)}
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                filters.langTag === lang
                  ? "border-brand/40 bg-brand/10 text-brand"
                  : "border-border bg-base-2 text-muted-fg hover:border-brand/30 hover:text-brand"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      {resultCount !== undefined && (
        <p className="text-xs text-muted-fg border-t border-border pt-4">
          {resultCount === 0 ? "No results" : `${resultCount} resource${resultCount !== 1 ? "s" : ""} found`}
        </p>
      )}
    </aside>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-fg uppercase tracking-wide">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-base-2 px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-brand/40 transition"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterChips({
  label,
  value,
  options,
  onChange,
  colorMap = {},
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
  colorMap?: Record<string, string>;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-fg uppercase tracking-wide">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            id={`interview-chip-${o.value.toLowerCase()}`}
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
              value === o.value
                ? colorMap[o.value] || "border-brand/40 bg-brand/10 text-brand"
                : "border-border bg-base-2 text-muted-fg hover:border-brand/30 hover:text-brand"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
