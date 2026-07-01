import { Filter, Search, X, Loader2 } from "lucide-react";
import { titleCase } from "../../core/utils/format";
import { ROLE_MAPPINGS } from "./JobShared";

export interface JobFiltersSidebarProps {
  selectedWorkModes: string[];
  toggleWorkMode: (m: string) => void;
  selectedJobTypes: string[];
  toggleJobType: (t: string) => void;
  salaryRange: [number, number];
  setSalaryRange: (range: [number, number]) => void;
  stipendRange: [number, number];
  setStipendRange: (range: [number, number]) => void;
  internDuration: string | null;
  setInternDuration: (d: string | null) => void;
  ppoOnly: boolean;
  setPpoOnly: (ppo: boolean) => void;
  freshness: string | null;
  setFreshness: (f: string | null) => void;
  selectedRoles: string[];
  toggleRole: (r: string) => void;
  selectedSkills: string[];
  toggleSkill: (s: string) => void;
  searchSkillQ: string;
  setSearchSkillQ: (q: string) => void;
  skillSuggestions: string[];
  isSkillSuggestionsLoading: boolean;
  selectedLocations: string[];
  toggleLocation: (l: string) => void;
  searchLocationQ: string;
  setSearchLocationQ: (q: string) => void;
  locationSuggestions: string[];
  isLocationSuggestionsLoading: boolean;
  clearFilters: () => void;
}

export function JobFiltersSidebar({
  selectedWorkModes,
  toggleWorkMode,
  selectedJobTypes,
  toggleJobType,
  salaryRange,
  setSalaryRange,
  stipendRange,
  setStipendRange,
  internDuration,
  setInternDuration,
  ppoOnly,
  setPpoOnly,
  freshness,
  setFreshness,
  selectedRoles,
  toggleRole,
  selectedSkills,
  toggleSkill,
  searchSkillQ,
  setSearchSkillQ,
  skillSuggestions,
  isSkillSuggestionsLoading,
  selectedLocations,
  toggleLocation,
  searchLocationQ,
  setSearchLocationQ,
  locationSuggestions,
  isLocationSuggestionsLoading,
  clearFilters,
}: JobFiltersSidebarProps) {
  return (
    <aside className="panel h-[calc(100vh-120px)] p-5 space-y-5 lg:sticky lg:top-[90px] overflow-y-auto pr-2 no-scrollbar">
      <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          <Filter size={14} style={{ color: "var(--text-muted)" }} /> Filters
        </span>
        <button type="button" onClick={clearFilters} className="text-xs font-semibold hover:text-rose-500 transition" style={{ color: "var(--text-muted)" }}>
          Clear all
        </button>
      </div>

      {/* Work mode */}
      <div>
        <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Work Mode</p>
        <div className="space-y-2">
          {["REMOTE", "HYBRID", "ONSITE"].map((m) => (
            <label key={m} className="flex cursor-pointer items-center gap-2.5 text-xs font-medium transition-colors" style={{ color: "var(--text-secondary)" }}>
              <input
                type="checkbox"
                className="rounded accent-blue-600 focus:ring-0"
                style={{ borderColor: "var(--border-strong)" }}
                checked={selectedWorkModes.includes(m)}
                onChange={() => toggleWorkMode(m)}
              />
              {titleCase(m)}
            </label>
          ))}
        </div>
      </div>

      {/* Job type */}
      <div>
        <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Job Type</p>
        <div className="space-y-2">
          {["FULL_TIME", "PART_TIME", "INTERNSHIP", "ENTRY_LEVEL", "CONTRACT"].map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2.5 text-xs font-medium transition-colors" style={{ color: "var(--text-secondary)" }}>
              <input
                type="checkbox"
                className="rounded accent-blue-600 focus:ring-0"
                checked={selectedJobTypes.includes(t)}
                onChange={() => toggleJobType(t)}
              />
              {titleCase(t)}
            </label>
          ))}
        </div>
      </div>

      {/* Salary Range */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Salary Range (LPA)</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold" style={{ color: "var(--text-primary)" }}>
            <span>{salaryRange[0]} LPA</span>
            <span>{salaryRange[1] >= 50 ? "50+ LPA" : `${salaryRange[1]} LPA`}</span>
          </div>
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>Min Salary</label>
              <input
                type="range" min="0" max="50" step="2"
                value={salaryRange[0]}
                onChange={(e) => setSalaryRange([Math.min(Number(e.target.value), salaryRange[1] - 2), salaryRange[1]])}
                className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-blue-600"
                style={{ background: "var(--bg-surface-3)" }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>Max Salary</label>
              <input
                type="range" min="0" max="50" step="2"
                value={salaryRange[1]}
                onChange={(e) => setSalaryRange([salaryRange[0], Math.max(Number(e.target.value), salaryRange[0] + 2)])}
                className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-blue-600"
                style={{ background: "var(--bg-surface-3)" }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1.5">
            {[
              { label: "Any", range: [0, 50] },
              { label: "10-25 LPA", range: [10, 25] },
              { label: "25-40 LPA", range: [25, 40] },
              { label: "40+ LPA", range: [40, 50] },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSalaryRange(preset.range as [number, number])}
                className={`rounded px-2 py-0.5 text-[10px] font-bold border transition-all duration-200 ${salaryRange[0] === preset.range[0] && salaryRange[1] === preset.range[1]
                    ? "bg-blue-600 text-white border-blue-600"
                    : ""
                  }`}
                style={salaryRange[0] !== preset.range[0] || salaryRange[1] !== preset.range[1]
                  ? { background: "var(--bg-surface-2)", color: "var(--text-muted)", borderColor: "var(--border)" }
                  : {}}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Internship-specific filters */}
      {selectedJobTypes.includes("INTERNSHIP") && (
        <div className="border-t border-indigo-200 dark:border-indigo-800 pt-4 space-y-4 bg-indigo-50/40 dark:bg-indigo-900/20 rounded-xl px-3 py-3 -mx-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
            🎓 Internship Filters
          </p>

          <div>
            <p className="mb-2 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>Stipend (₹K/month)</p>
            <div className="flex items-center justify-between text-xs font-bold mb-1" style={{ color: "var(--text-primary)" }}>
              <span>₹{stipendRange[0]}K</span>
              <span>{stipendRange[1] >= 50 ? "₹50K+" : `₹${stipendRange[1]}K`}</span>
            </div>
            <input
              type="range" min="0" max="50" step="2"
              value={stipendRange[1]}
              onChange={(e) => setStipendRange([stipendRange[0], Math.max(Number(e.target.value), stipendRange[0] + 2)])}
              className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-indigo-600 bg-indigo-100 dark:bg-indigo-900"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {[{ label: "Any", range: [0, 50] as [number, number] }, { label: "5K+", range: [5, 50] as [number, number] }, { label: "10K+", range: [10, 50] as [number, number] }, { label: "20K+", range: [20, 50] as [number, number] }].map((p) => (
                <button key={p.label} type="button"
                  onClick={() => setStipendRange(p.range)}
                  className={`rounded px-2 py-0.5 text-[9px] font-bold border transition ${stipendRange[0] === p.range[0] && stipendRange[1] === p.range[1] ? "bg-indigo-600 text-white border-indigo-600" : ""}`}
                  style={stipendRange[0] !== p.range[0] || stipendRange[1] !== p.range[1] ? { background: "var(--bg-surface)", color: "var(--text-muted)", borderColor: "var(--border)" } : {}}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>Duration</p>
            <div className="flex flex-wrap gap-1.5">
              {["Any", "1m", "2m", "3m", "6m"].map((d) => (
                <button key={d} type="button"
                  onClick={() => setInternDuration(d === "Any" ? null : d)}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition ${(d === "Any" ? !internDuration : internDuration === d) ? "bg-indigo-600 text-white border-indigo-600" : ""}`}
                  style={(d === "Any" ? !internDuration : internDuration === d) ? {} : { background: "var(--bg-surface)", color: "var(--text-muted)", borderColor: "var(--border)" }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-xs text-indigo-700 dark:text-indigo-400 font-semibold">
            <input type="checkbox" className="rounded border-indigo-300 accent-indigo-600" checked={ppoOnly} onChange={(e) => setPpoOnly(e.target.checked)} />
            PPO Available (Pre-Placement Offer)
          </label>
        </div>
      )}

      {/* Freshness Filter */}
      <div className="border-t pt-4 space-y-2.5" style={{ borderColor: "var(--border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Freshness</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "Any time", value: null },
            { label: "Past 24 hours", value: "24h" },
            { label: "Past 3 days", value: "3d" },
            { label: "Past week", value: "7d" },
            { label: "Past 15 days", value: "15d" },
            { label: "Past month", value: "30d" },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setFreshness(opt.value)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold border transition-all duration-200 ${freshness === opt.value
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : ""
                }`}
              style={freshness !== opt.value
                ? { background: "var(--bg-surface-2)", color: "var(--text-muted)", borderColor: "var(--border)" }
                : {}}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Role Filter */}
      <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
        <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Role</p>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 no-scrollbar">
          {Object.keys(ROLE_MAPPINGS).map((roleName) => (
            <label key={roleName} className="flex cursor-pointer items-center gap-2.5 text-xs font-medium transition-colors" style={{ color: "var(--text-secondary)" }}>
              <input
                type="checkbox"
                className="rounded accent-blue-600 focus:ring-0"
                checked={selectedRoles.includes(roleName)}
                onChange={() => toggleRole(roleName)}
              />
              {roleName}
            </label>
          ))}
        </div>
      </div>

      {/* Skills Filter */}
      <div className="border-t pt-4 space-y-2.5" style={{ borderColor: "var(--border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Skills</p>
        {selectedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className="hover:text-rose-500 transition-colors"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" size={12} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            className="field w-full py-1 pl-7 text-xs"
            placeholder="Search skills..."
            value={searchSkillQ}
            onChange={(e) => setSearchSkillQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 no-scrollbar pt-1">
          {isSkillSuggestionsLoading ? (
            <div className="flex justify-center w-full py-2"><Loader2 className="animate-spin" size={14} style={{ color: "var(--text-muted)" }} /></div>
          ) : skillSuggestions && skillSuggestions.length > 0 ? (
            skillSuggestions
              .filter((skill) => !selectedSkills.includes(skill))
              .map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => {
                    toggleSkill(skill);
                    setSearchSkillQ("");
                  }}
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold transition border border-dashed hover:border-solid hover:bg-[color:var(--bg-surface-2)]"
                  style={{
                    borderColor: "var(--border-strong)",
                    background: "var(--bg-surface)",
                    color: "var(--text-secondary)",
                  }}
                >
                  + {skill}
                </button>
              ))
          ) : (
            <p className="text-[10px] italic" style={{ color: "var(--text-muted)" }}>No skills found</p>
          )}
        </div>
      </div>

      {/* Location Filter */}
      <div className="border-t pt-4 space-y-2.5" style={{ borderColor: "var(--border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Location</p>
        {selectedLocations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedLocations.map((loc) => (
              <span
                key={loc}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
              >
                {loc}
                <button
                  type="button"
                  onClick={() => toggleLocation(loc)}
                  className="hover:text-rose-500 transition-colors"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" size={12} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            className="field w-full py-1 pl-7 text-xs"
            placeholder="Search locations..."
            value={searchLocationQ}
            onChange={(e) => setSearchLocationQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 no-scrollbar pt-1">
          {isLocationSuggestionsLoading ? (
            <div className="flex justify-center w-full py-2"><Loader2 className="animate-spin" size={14} style={{ color: "var(--text-muted)" }} /></div>
          ) : locationSuggestions && locationSuggestions.length > 0 ? (
            locationSuggestions
              .filter((loc) => !selectedLocations.includes(loc))
              .map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    toggleLocation(loc);
                    setSearchLocationQ("");
                  }}
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold transition border border-dashed hover:border-solid hover:bg-[color:var(--bg-surface-2)]"
                  style={{
                    borderColor: "var(--border-strong)",
                    background: "var(--bg-surface)",
                    color: "var(--text-secondary)",
                  }}
                >
                  + {loc}
                </button>
              ))
          ) : (
            <p className="text-[10px] italic" style={{ color: "var(--text-muted)" }}>No locations found</p>
          )}
        </div>
      </div>
    </aside>
  );
}
