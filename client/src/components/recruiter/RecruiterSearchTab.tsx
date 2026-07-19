import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Lock, ArrowRight, Search, Loader2 } from "lucide-react";
import { InlineLoader, ErrorState } from "../ui";

interface SearchLimitInfo {
  currentCount: number;
  dailyLimit: number;
  isLimited: boolean;
}

interface Candidate {
  id: string;
  username: string;
  verifiedEngineer?: boolean;
  engineeringScore?: number;
  reputationScore?: number;
  skills?: any[];
  profile?: {
    fullName?: string | null;
    headline?: string | null;
    avatarUrl?: string | null;
    about?: string | null;
  } | null;
  experiences?: Array<{
    title: string;
    companyName: string;
    isCurrent: boolean;
  }>;
  educations?: Array<{
    collegeName?: string | null;
    endYear?: number | null;
  }>;
  contactVisible?: boolean;
  email?: string;
  phone?: string;
  openToCampusOutreach?: boolean;
}

interface RecruiterSearchTabProps {
  candidates: Candidate[] | undefined;
  searchLimitInfo: SearchLimitInfo | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;

  searchQuery: string;
  setSearchQuery: (val: string) => void;
  searchSkills: string[];
  setSearchSkills: (skills: string[]) => void;
  searchMinCgpa: number | undefined;
  setSearchMinCgpa: (cgpa: number | undefined) => void;
  searchGradYear: number | undefined;
  setSearchGradYear: (year: number | undefined) => void;
  searchCollegeName: string;
  setSearchCollegeName: (val: string) => void;
  searchCompanyName: string;
  setSearchCompanyName: (val: string) => void;
}

export function RecruiterSearchTab({
  candidates,
  searchLimitInfo,
  isLoading,
  isError,
  onRetry,
  searchQuery,
  setSearchQuery,
  searchSkills,
  setSearchSkills,
  searchMinCgpa,
  setSearchMinCgpa,
  searchGradYear,
  setSearchGradYear,
  searchCollegeName,
  setSearchCollegeName,
  searchCompanyName,
  setSearchCompanyName,
}: RecruiterSearchTabProps) {
  const [newSkillTag, setNewSkillTag] = useState("");
  const isSearchDisabled = !!(searchLimitInfo?.isLimited && searchLimitInfo.currentCount >= searchLimitInfo.dailyLimit);

  return (
    <div className="space-y-6">
      {/* Quota Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 panel p-5 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/40 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-blue-955/20">
        <div>
          <h3 className="font-extrabold text-base flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
            <Sparkles className="h-5 w-5 text-indigo-600 animate-pulse" />
            Resdex Candidate Search Engine
          </h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Query our unified student resdex index with fine-grained academic and experience filters.
          </p>
        </div>

        {searchLimitInfo && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                Daily Search Quota: {searchLimitInfo.currentCount}/{searchLimitInfo.dailyLimit} Used
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {isSearchDisabled ? "Search limit reached today" : `${searchLimitInfo.dailyLimit - searchLimitInfo.currentCount} free searches remaining`}
              </p>
            </div>
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex p-0.5 border border-gray-300 dark:border-gray-700">
              <div
                className={`h-full rounded-full transition-all duration-300 ${isSearchDisabled ? "bg-red-500" : "bg-indigo-650"}`}
                style={{ width: `${Math.min((searchLimitInfo.currentCount / searchLimitInfo.dailyLimit) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 panel p-5 space-y-5" style={{ background: "var(--bg-surface)" }}>
          <h4 className="font-bold text-sm text-gray-900 dark:text-white pb-2 border-b" style={{ borderColor: "var(--border)" }}>
            Search Filters
          </h4>

          <div className="space-y-4 text-xs">
            {/* Text query */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-705 dark:text-gray-350">Fuzzy Query</label>
              <input
                type="text"
                disabled={isSearchDisabled}
                placeholder="Search name, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors text-gray-900 dark:text-white"
              />
            </div>

            {/* Skills array input */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-705 dark:text-gray-355">Required Skills</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={isSearchDisabled}
                  placeholder="e.g. React"
                  value={newSkillTag}
                  onChange={(e) => setNewSkillTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newSkillTag.trim()) {
                      e.preventDefault();
                      if (!searchSkills.includes(newSkillTag.trim())) {
                        setSearchSkills([...searchSkills, newSkillTag.trim()]);
                      }
                      setNewSkillTag("");
                    }
                  }}
                  className="flex-1 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-955 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors text-gray-905 dark:text-white"
                />
                <button
                  type="button"
                  disabled={isSearchDisabled || !newSkillTag.trim()}
                  onClick={() => {
                    if (newSkillTag.trim() && !searchSkills.includes(newSkillTag.trim())) {
                      setSearchSkills([...searchSkills, newSkillTag.trim()]);
                    }
                    setNewSkillTag("");
                  }}
                  className="bg-slate-900 hover:bg-black dark:bg-slate-800 text-white px-3 rounded-xl border dark:border-gray-700"
                >
                  Add
                </button>
              </div>

              {searchSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {searchSkills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-md flex items-center gap-1"
                    >
                      {sk}
                      <button
                        type="button"
                        onClick={() => setSearchSkills(searchSkills.filter((s) => s !== sk))}
                        className="text-indigo-400 hover:text-indigo-650 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Min CGPA */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-bold text-gray-750 dark:text-gray-300">
                <span>Min CGPA</span>
                <span>{searchMinCgpa !== undefined ? searchMinCgpa.toFixed(1) : "Any"}</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                disabled={isSearchDisabled}
                value={searchMinCgpa !== undefined ? searchMinCgpa : 0}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSearchMinCgpa(val > 0 ? val : undefined);
                }}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Graduation Year */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-750 dark:text-gray-300">Graduation Year</label>
              <select
                disabled={isSearchDisabled}
                value={searchGradYear || ""}
                onChange={(e) => setSearchGradYear(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="w-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-955 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors text-gray-905 dark:text-white"
              >
                <option value="">Any Batch</option>
                <option value="2024">Class of 2024</option>
                <option value="2025">Class of 2025</option>
                <option value="2026">Class of 2026</option>
                <option value="2027">Class of 2027</option>
              </select>
            </div>

            {/* College Name */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-755 dark:text-gray-300">College Name</label>
              <input
                type="text"
                disabled={isSearchDisabled}
                placeholder="e.g. IIT Delhi"
                value={searchCollegeName}
                onChange={(e) => setSearchCollegeName(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors text-gray-905 dark:text-white"
              />
            </div>

            {/* Company Name */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-755 dark:text-gray-300">Past/Current Employer</label>
              <input
                type="text"
                disabled={isSearchDisabled}
                placeholder="e.g. Amazon"
                value={searchCompanyName}
                onChange={(e) => setSearchCompanyName(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-955 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors text-gray-905 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Candidate Listing Panel */}
        <div className="lg:col-span-3 space-y-6 relative">
          {isSearchDisabled ? (
            <div className="panel p-8 text-center bg-white/70 dark:bg-gray-900/60 backdrop-blur-md border border-red-205 dark:border-red-950 rounded-2xl shadow-xl space-y-6 min-h-[400px] flex flex-col items-center justify-center relative z-20">
              <div className="h-16 w-16 bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-800 rounded-full flex items-center justify-center text-red-650 dark:text-red-400">
                <Lock className="h-8 w-8 animate-pulse" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Daily Limit Reached</h3>
                <p className="text-sm text-gray-500 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  You have exhausted your 5 free searches for today. Upgrade to a Premium Recruiter Seat for unlimited searches and direct candidate contact.
                </p>
              </div>
              <Link
                to="/business"
                className="inline-flex items-center gap-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors shadow-md shadow-indigo-600/10"
              >
                Unlock Unlimited Resdex Access
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <InlineLoader label="Querying talent database..." />
            </div>
          ) : isError ? (
            <ErrorState title="Error fetching candidates" onRetry={onRetry} />
          ) : !candidates || candidates.length === 0 ? (
            <div className="panel p-12 text-center text-gray-400 text-sm border rounded-2xl">
              No candidates match your queries. Try broadening your filter selections.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {candidates.map((candidate) => {
                const safeProfile = candidate.profile || {};
                const currentExperience = candidate.experiences?.find((e: any) => e.isCurrent);
                const education = candidate.educations?.[0];

                return (
                  <div
                    key={candidate.id}
                    className="panel p-6 flex flex-col justify-between hover:shadow-md transition duration-200"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="h-11 w-11 bg-gray-50 dark:bg-gray-950 border border-gray-150 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                          {safeProfile.avatarUrl ? (
                            <img src={safeProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="text-indigo-700 dark:text-indigo-400 font-bold text-sm">
                              {safeProfile.fullName?.charAt(0) || candidate.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-bold text-sm text-gray-955 dark:text-white truncate flex items-center gap-1.5">
                            {safeProfile.fullName || `@${candidate.username}`}
                            {candidate.verifiedEngineer && (
                              <span className="bg-blue-50 dark:bg-blue-955/35 text-blue-700 dark:text-blue-300 text-[8px] font-extrabold px-1 rounded border border-blue-200 dark:border-blue-800 shrink-0">
                                VERIFIED
                              </span>
                            )}
                          </h5>
                          <p className="text-[11px] font-medium truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
                            {safeProfile.headline || "Software Engineer"}
                          </p>
                        </div>
                      </div>

                      {safeProfile.about && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {safeProfile.about}
                        </p>
                      )}

                      <div className="space-y-1.5 text-[11px] text-gray-605 dark:text-gray-455 bg-gray-50/50 dark:bg-gray-950/20 p-2.5 rounded-xl border border-gray-150 dark:border-gray-85">
                        {education && (
                          <p className="truncate">
                            <strong>School:</strong> {education.collegeName || "College"} {education.endYear ? `(${education.endYear})` : ""}
                          </p>
                        )}
                        {currentExperience ? (
                          <p className="truncate">
                            <strong>Current:</strong> {currentExperience.title} @ {currentExperience.companyName}
                          </p>
                        ) : (
                          <p>Open to placement opportunities</p>
                        )}
                      </div>

                      {candidate.skills && candidate.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 3).map((us, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-gray-55 dark:bg-gray-95 border border-gray-150 text-[10px] text-gray-600 rounded-md"
                            >
                              {us.skill?.name || us}
                            </span>
                          ))}
                          {candidate.skills.length > 3 && (
                            <span className="px-1.5 py-0.5 bg-gray-55 dark:bg-gray-95 border border-gray-150 text-[10px] text-gray-400 rounded-md">
                              +{candidate.skills.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Contact Details (gated / masked) */}
                      <div className="space-y-1 text-[11px] bg-gray-50/50 dark:bg-gray-950/20 p-2.5 rounded-xl border border-gray-150 dark:border-gray-850">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Contact details</span>
                          {candidate.contactVisible ? (
                            <span className="text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Unlocked</span>
                          ) : (
                            <span className="text-[9px] text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 inline-flex items-center gap-0.5">
                              <Lock size={8} /> Locked
                            </span>
                          )}
                        </div>

                        <div className="mt-1 space-y-0.5">
                          <p className="truncate text-gray-600 dark:text-gray-400">
                            <strong>Email:</strong> {candidate.contactVisible ? candidate.email : "••••••••@••••.•••"}
                          </p>
                          <p className="truncate text-gray-600 dark:text-gray-400">
                            <strong>Phone:</strong> {candidate.contactVisible ? candidate.phone : "+91 ••••• •••••"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-150 dark:border-gray-85 pt-3 mt-4 flex justify-between items-center text-[11px]">
                      <span className="font-bold text-gray-705 dark:text-gray-300">
                        Score: <span className="text-blue-650 font-black">⚡{Math.round(candidate.engineeringScore || 0)}</span>
                      </span>

                      <Link
                        to={`/users/${candidate.username}`}
                        className="text-indigo-650 hover:text-indigo-850 font-bold inline-flex items-center gap-0.5"
                      >
                        Profile Details <ArrowRight size={10} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
