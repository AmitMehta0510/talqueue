import React, { useState, ReactNode } from "react";
import { EmptySection } from "./ProfileHelpers";
import {
  Code2,
  ShieldCheck,
  Loader2,
  ChevronDown,
  Sparkles,
  Search,
  Plus,
  X,
  Save,
} from "lucide-react";
import { Skill, api } from "../../lib/api";
import { SkillPill } from "../cards/ProfileCards";
import { InlineLoader } from "../ui";
import { useSkillSearchQuery } from "../../hooks/usePlatformQueries";

const MAX_SKILLS = 30;

export interface ProfileSkillsProps {
  skills: any[];
  isFetching: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onAddSkill: (payload: { skillId: string; level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" }) => Promise<unknown>;
  isAdding: boolean;
  onRemove: (skill: any) => void;
  onVerify: () => void;
  isVerifying: boolean;
}

export function ProfileSkills({
  skills,
  isFetching,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onAddSkill,
  isAdding,
  onRemove,
  onVerify,
  isVerifying,
}: ProfileSkillsProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-primary">Skills</h2>
          <span className="chip rounded-full px-2.5 py-0.5 text-xs font-semibold">
            {skills.length} / {MAX_SKILLS}
          </span>
          {isFetching && <Loader2 className="animate-spin text-muted-fg" size={15} />}
        </div>
        <button
          onClick={onVerify}
          disabled={isVerifying}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:opacity-50"
        >
          {isVerifying ? (
            <Loader2 className="animate-spin" size={15} />
          ) : (
            <ShieldCheck size={15} />
          )}
          {isVerifying ? "Verifying..." : "Verify & Sync Skills"}
        </button>
      </div>

      {/* Add skill widget */}
      <SkillManager onAddSkill={onAddSkill} adding={isAdding} disabled={skills.length >= MAX_SKILLS} />

      {/* Skill grid */}
      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <SkillPill
              key={skill.id}
              skill={skill}
              large
              onRemove={() => onRemove(skill)}
            />
          ))}
        </div>
      ) : (
        !isFetching && (
          <EmptySection
            icon={Code2}
            title="No skills yet"
            text="Search and add skills to power recommendations and discovery."
          />
        )
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

function SkillManager({
  adding,
  onAddSkill,
  disabled,
}: {
  adding: boolean;
  onAddSkill: (payload: {
    skillId: string;
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  }) => Promise<unknown>;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<{ id: string; name: string } | null>(null);
  const [level, setLevel] = useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT">("INTERMEDIATE");
  const [creatingCustom, setCreatingCustom] = useState(false);
  const skillSearch = useSkillSearchQuery(query);

  const selectSkill = (skill: Skill) => {
    setSelectedSkill({ id: skill.id, name: skill.name });
    setQuery("");
  };

  const handleCreateCustomSkill = async () => {
    if (!query.trim() || query.trim().length < 2) return;
    setCreatingCustom(true);
    try {
      const result = await api.createCustomSkill(query.trim());
      setSelectedSkill({ id: result.data.id, name: result.data.name });
      setQuery("");
    } catch {
      // error shown by hook
    } finally {
      setCreatingCustom(false);
    }
  };

  const handleSave = async () => {
    if (!selectedSkill) return;
    try {
      await onAddSkill({ skillId: selectedSkill.id, level });
      setSelectedSkill(null);
    } catch {
      // hook shows toast
    }
  };

  const noResults =
    query.length >= 2 &&
    !skillSearch.isFetching &&
    (!skillSearch.data || skillSearch.data.length === 0);

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-primary">Add a skill</h3>
      </div>
      {disabled ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
          <strong>Skill limit reached:</strong> You can add up to {MAX_SKILLS} skills. Remove some existing skills to add new ones.
        </div>
      ) : (
        <div className="space-y-4">
          {!selectedSkill ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-muted-fg" size={15} />
              <input
                className="field pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search skill (e.g. React, Python)..."
              />
              {query.length >= 2 && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border shadow-lg bg-surface border-base">
                  {skillSearch.isFetching ? (
                    <div className="p-3"><InlineLoader label="Searching..." /></div>
                  ) : skillSearch.data && skillSearch.data.length > 0 ? (
                    skillSearch.data.slice(0, 8).map((skill) => (
                      <button
                        key={skill.id}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-indigo-500/10"
                        type="button"
                        onClick={() => selectSkill(skill)}
                      >
                        <span className="font-medium text-primary">{skill.name}</span>
                        {skill.verified && (
                          <span className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-xs text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-700">
                            Verified
                          </span>
                        )}
                      </button>
                    ))
                  ) : noResults ? (
                    <div className="p-3">
                      <p className="text-sm text-muted-fg">No matching skills found.</p>
                      <button
                        className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2.5 text-left text-sm font-medium text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                        type="button"
                        disabled={creatingCustom}
                        onClick={handleCreateCustomSkill}
                      >
                        {creatingCustom ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                        Add "{query.trim()}" as a custom skill
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/20 p-4 transition-all bg-brand-light/20">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-fg">Selected Skill:</span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm">
                  {selectedSkill.name}
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-indigo-700 transition"
                    onClick={() => setSelectedSkill(null)}
                    title="Change skill"
                  >
                    <X size={14} />
                  </button>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="field py-1 text-sm"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as typeof level)}
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </select>
                <button
                  type="button"
                  className="btn-primary py-1.5"
                  disabled={adding}
                  onClick={handleSave}
                >
                  {adding ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  Save Skill
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

