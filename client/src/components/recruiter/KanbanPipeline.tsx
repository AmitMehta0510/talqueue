import { useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Award,
  ShieldCheck,
  XCircle,
  Clock,
  Sparkles,
  ExternalLink,
  FileText,
  UserCheck,
} from "lucide-react";
import {
  useRecruiterJobPipelineQuery,
  useRankJobCandidatesQuery,
  useUpdateJobApplicationStatusMutation,
} from "../../hooks/usePlatformQueries";
import { InlineLoader, ErrorState, Avatar } from "../ui";
import { titleCase } from "../../lib/format";
import {
  RecruiterJobPipelineCard,
  CandidateRanking,
  User,
  UserSkill,
  JobApplicationStatus,
} from "../../lib/api";

interface KanbanPipelineProps {
  jobId: string;
  onBack: () => void;
}

export function KanbanPipeline({ jobId, onBack }: KanbanPipelineProps) {
  const [activeSubTab, setActiveSubTab] = useState<"pipeline" | "rankings">("pipeline");
  const [selectedCandidate, setSelectedCandidate] = useState<RecruiterJobPipelineCard | null>(null);

  const pipelineQuery = useRecruiterJobPipelineQuery(jobId);
  const rankingsQuery = useRankJobCandidatesQuery(jobId, activeSubTab === "rankings");
  const updateStatusMutation = useUpdateJobApplicationStatusMutation(jobId);

  const handleStatusChange = async (applicationId: string, status: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        applicationId,
        payload: { status: status as Exclude<JobApplicationStatus, "APPLIED" | "VIEWED"> },
      });
      if (selectedCandidate && selectedCandidate.id === applicationId) {
        setSelectedCandidate((prev) => (prev ? { ...prev, status } : null));
      }
    } catch {
      // Handled by mutation toast
    }
  };

  const columnsList = [
    { key: "APPLIED", label: "Applied", color: "border-t-blue-500", headerBg: "bg-blue-50/50 dark:bg-blue-950/20", countBg: "bg-blue-100/80 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/30", barColor: "bg-blue-400" },
    { key: "VIEWED", label: "Viewed", color: "border-t-indigo-500", headerBg: "bg-indigo-50/50 dark:bg-indigo-950/20", countBg: "bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30", barColor: "bg-indigo-400" },
    { key: "SHORTLISTED", label: "Shortlisted", color: "border-t-amber-500", headerBg: "bg-amber-50/50 dark:bg-amber-950/20", countBg: "bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30", barColor: "bg-amber-400" },
    { key: "INTERVIEW", label: "Interviewing", color: "border-t-purple-500", headerBg: "bg-purple-50/50 dark:bg-purple-950/20", countBg: "bg-purple-100/80 dark:bg-purple-950/60 text-purple-800 dark:text-purple-400 border border-purple-200/50 dark:border-purple-900/30", barColor: "bg-purple-400" },
    { key: "HIRED", label: "Hired", color: "border-t-indigo-500", headerBg: "bg-indigo-50/50 dark:bg-indigo-950/20", countBg: "bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30", barColor: "bg-indigo-400" },
    { key: "REJECTED", label: "Rejected", color: "border-t-rose-500", headerBg: "bg-rose-50/50 dark:bg-rose-950/20", countBg: "bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30", barColor: "bg-rose-400" },
  ];

  const pipelineData = pipelineQuery.data?.pipeline || {};
  const jobTitle = pipelineQuery.data?.job?.title || "Recruiter Pipeline";

  // Pipeline stats
  const totalApplicants = columnsList.reduce((sum, col) => sum + (pipelineData[col.key]?.length || 0), 0);
  const hired = pipelineData["HIRED"]?.length || 0;
  const inProgress = (pipelineData["VIEWED"]?.length || 0) + (pipelineData["INTERVIEW"]?.length || 0) + (pipelineData["SHORTLISTED"]?.length || 0);
  const conversionRate = totalApplicants > 0 ? Math.round((hired / totalApplicants) * 100) : 0;

  const daysSince = (dateStr?: string) => {
    if (!dateStr) return null;
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "1d ago";
    return `${diff}d ago`;
  };

  return (
    <div className="space-y-5 text-primary">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button className="icon-btn shrink-0" type="button" title="Back to Dashboard" onClick={onBack}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-primary">{jobTitle}</h2>
            <p className="text-xs text-muted-fg">Applicant Pipeline · {totalApplicants} total candidates</p>
          </div>
        </div>
        <div className="flex rounded-xl bg-surface-2 border border-base p-1">
          {(["pipeline", "rankings"] as const).map((tab) => (
            <button
              key={tab}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeSubTab === tab ? "bg-surface-3 text-primary shadow-sm" : "text-muted-fg hover:text-primary"
              }`}
              onClick={() => setActiveSubTab(tab)}
            >
              {tab === "pipeline" ? "Visual Pipeline" : "AI Candidate Rankings"}
            </button>
          ))}
        </div>
      </div>

      {/* Naukri-style Stats Bar */}
      {activeSubTab === "pipeline" && totalApplicants > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Applied", value: totalApplicants, color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50/50 dark:bg-blue-950/20 border-blue-100/60 dark:border-blue-900/30" },
            { label: "In Progress", value: inProgress, color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50/50 dark:bg-purple-950/20 border-purple-100/60 dark:border-purple-900/30" },
            { label: "Hired", value: hired, color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100/60 dark:border-indigo-900/30" },
            { label: "Conversion", value: `${conversionRate}%`, color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-100/60 dark:border-amber-900/30" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl border p-4 ${bg}`}>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="mt-0.5 text-xs text-muted-fg">{label}</div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === "pipeline" ? (
        pipelineQuery.isLoading ? (
          <KanbanSkeleton />
        ) : pipelineQuery.isError ? (
          <ErrorState title="Pipeline failed to load" text={pipelineQuery.error?.message} onRetry={() => pipelineQuery.refetch()} />        ) : (
          <div className="relative">
            {/* Scroll indicator boundary fades */}
            <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-black/10 dark:from-black/25 to-transparent pointer-events-none z-10 lg:hidden" />
            <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-black/10 dark:from-black/25 to-transparent pointer-events-none z-10 lg:hidden" />

            <div className="grid gap-3 overflow-x-auto pb-4 lg:grid-cols-6 min-w-[1000px] lg:min-w-0">
              {columnsList.map((col) => {
                const cards = pipelineData[col.key] || [];
                const pct = totalApplicants > 0 ? Math.round((cards.length / totalApplicants) * 100) : 0;
                return (
                  <div key={col.key} className={`flex flex-col rounded-xl border-t-4 bg-surface border border-base h-[640px] overflow-hidden ${col.color}`}>
                    {/* Column Header */}
                    <div className={`px-3 py-2.5 border-b border-base ${col.headerBg}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-primary">{col.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${col.countBg}`}>{cards.length}</span>
                      </div>
                      <div className="mt-1.5 h-1 w-full rounded-full bg-surface-3">
                        <div className={`h-1 rounded-full ${col.barColor} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-0.5 text-[9px] text-muted-fg">{pct}% of total</div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {cards.length ? (
                        cards.map((card: RecruiterJobPipelineCard) => (
                          <div
                            key={card.id}
                            className="group relative cursor-pointer panel hover-lift bg-surface-2 hover:bg-surface-3 hover:border-brand-light p-3 transition-all"
                            onClick={() => setSelectedCandidate(card)}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar user={{ username: card.candidate.username, profile: { avatarUrl: card.candidate.avatarUrl, fullName: card.candidate.fullName } } as User} size="sm" />
                              <div className="min-w-0 flex-1">
                                <h4 className="truncate text-xs font-bold text-primary">{card.candidate.fullName}</h4>
                                <p className="truncate text-[10px] text-muted-fg mt-0.5">{card.candidate.headline || `@${card.candidate.username}`}</p>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[10px]">
                              <span className="rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 px-1.5 py-0.5 font-bold">⚡{card.candidate.engineeringScore || 0}</span>
                              <span className="text-muted-fg">{daysSince((card as any).appliedAt || (card as any).createdAt)}</span>
                            </div>
                            {(card.skillsMatch?.matchPercentage ?? 0) > 0 && (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <div className="h-1 flex-1 rounded-full bg-surface-3">
                                  <div className="h-1 rounded-full bg-indigo-400" style={{ width: `${card.skillsMatch?.matchPercentage}%` }} />
                                </div>
                                <span className="text-[10px] text-muted-fg">{card.skillsMatch?.matchPercentage}%</span>
                              </div>
                            )}
                            {/* Quick-action hover buttons */}
                            {col.key !== "HIRED" && col.key !== "REJECTED" && (
                              <div
                                className="absolute inset-x-2 bottom-1.5 hidden group-hover:flex gap-1 bg-surface-3/95 backdrop-blur-sm rounded-lg p-1.5 border border-base shadow-lg z-10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {col.key !== "SHORTLISTED" && (
                                  <button className="flex-1 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-450 hover:bg-amber-100 dark:hover:bg-amber-900/40 px-1 py-0.5 text-[10px] font-bold" onClick={() => handleStatusChange(card.id, "SHORTLISTED")} disabled={updateStatusMutation.isPending}>★ List</button>
                                )}
                                {col.key !== "INTERVIEW" && (
                                  <button className="flex-1 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-450 hover:bg-purple-100 dark:hover:bg-purple-900/40 px-1 py-0.5 text-[10px] font-bold" onClick={() => handleStatusChange(card.id, "INTERVIEW")} disabled={updateStatusMutation.isPending}>📅 Interview</button>
                                )}
                                <button className="rounded bg-rose-50 dark:bg-rose-950/40 text-rose-750 dark:text-rose-450 hover:bg-rose-100 dark:hover:bg-rose-900/40 px-1.5 py-0.5 text-[10px] font-bold" onClick={() => handleStatusChange(card.id, "REJECTED")} disabled={updateStatusMutation.isPending}>✕</button>
                              </div>
                            )}
                            {col.key === "HIRED" && (
                              <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-indigo-700 dark:text-indigo-400">
                                <UserCheck size={11} /> Hired
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="flex h-32 flex-col items-center justify-center text-muted-fg">
                          <Clock size={20} />
                          <span className="text-xs mt-1.5">Empty</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : rankingsQuery.isLoading ? (
        <RankingsSkeleton />
      ) : rankingsQuery.isError ? (
        <ErrorState title="Failed to load rankings" text={rankingsQuery.error?.message} onRetry={() => rankingsQuery.refetch()} />
      ) : (
        <div className="space-y-4">
          <div className="panel p-5 bg-gradient-to-r from-indigo-50/10 to-teal-50/10 dark:from-indigo-950/10 dark:to-teal-950/10 border border-indigo-500/20">
            <div className="flex items-start gap-3">
              <Sparkles className="text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" size={18} />
              <div>
                <h3 className="text-sm font-semibold text-primary">Cosine Similarity Candidate Matcher</h3>
                <p className="text-xs text-secondary mt-0.5">Candidates ranked by skill similarity and complementary capabilities relative to job requirements.</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {rankingsQuery.data?.length ? (
              rankingsQuery.data.map((rank: CandidateRanking, index: number) => (
                <RankingCard key={rank.userId || index} rank={index + 1} candidate={rank} onStatusChange={handleStatusChange} />
              ))
            ) : (
              <div className="panel p-10 text-center text-muted-fg">No rankings available. Wait for candidates to apply.</div>
            )}
          </div>
        </div>
      )}

      {selectedCandidate && (
        <CandidateDetailsOverlay card={selectedCandidate} onClose={() => setSelectedCandidate(null)} onStatusChange={handleStatusChange} />
      )}
    </div>
  );
}

/* Candidate Ranking Row Component */
function RankingCard({
  rank,
  candidate,
  onStatusChange,
}: {
  rank: number;
  candidate: CandidateRanking;
  onStatusChange: (applicationId: string, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const user = candidate.user;

  if (!user) return null;

  const scorePct = Math.round((candidate.score || 0) * 100);

  return (
    <article className="panel p-5 space-y-4 hover-lift hover:shadow-md transition">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left Side: Avatar, Name, Rank */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-sm font-bold text-indigo-800 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30">
            #{rank}
          </div>
          <Avatar user={user} size="md" />
          <div>
            <h4 className="font-bold text-sm text-primary">
              {user.profile?.fullName || user.username}
            </h4>
            <p className="text-xs text-secondary mt-0.5">
              {user.profile?.headline || `@${user.username}`} &bull; {user.profile?.location || "No location"}
            </p>
          </div>
        </div>

        {/* Right Side: Score, Quick Action dropdown */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 text-xs font-bold text-indigo-800 dark:text-indigo-400 border border-indigo-200/40 dark:border-indigo-900/30 inline-flex items-center gap-1">
              <Sparkles size={12} />
              Fit: {candidate.fitScore || scorePct}%
            </span>
            <div className="text-[10px] text-muted-fg mt-1">Cosine Score: {(candidate.score || 0).toFixed(3)}</div>
          </div>

          <select
            className="field py-1 px-2.5 text-xs max-w-32 bg-surface-2"
            value={candidate.application?.status || "APPLIED"}
            onChange={(e) => onStatusChange(candidate.application?.id || "", e.target.value)}
          >
            <option value="APPLIED">Applied</option>
            <option value="VIEWED">Viewed</option>
            <option value="SHORTLISTED">Shortlist</option>
            <option value="INTERVIEW">Interview</option>
            <option value="HIRED">Hire</option>
            <option value="REJECTED">Reject</option>
          </select>

          <button
            onClick={() => setExpanded(!expanded)}
            className="icon-btn shrink-0"
            type="button"
            title="Toggle details"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expandable reasons and resume info */}
      {expanded && (
        <div className="border-t border-base pt-4 space-y-4 animate-in fade-in duration-150">
          {candidate.reasons && candidate.reasons.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1">
                <Sparkles size={12} className="text-indigo-600 dark:text-indigo-400" /> Match Insights
              </h5>
              <ul className="list-disc pl-5 text-xs text-secondary space-y-1">
                {candidate.reasons.map((reason: string, rIdx: number) => (
                  <li key={rIdx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* User profile signals */}
          <div className="grid gap-4 sm:grid-cols-2 text-xs text-secondary bg-surface-2 rounded-xl p-4 border border-base">
            <div>
              <div className="font-semibold text-primary">Skills</div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(user.skills || []).map((s: UserSkill) => (
                  <span key={s.id} className="chip bg-surface-3 border border-base text-secondary">
                    {s.skill?.name || s.skill?.normalizedName || "Skill"}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="font-semibold text-primary mb-1">Trust Profile</div>
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Trust Score Level: {titleCase(user.trustLevel || "BEGINNER")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award size={14} className="text-amber-600 dark:text-amber-400" />
                  <span>Engineering Rank: {Math.round(user.engineeringScore || 0)} pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

/* Pipeline Candidate Details Drawer Overlay */
function CandidateDetailsOverlay({
  card,
  onClose,
  onStatusChange,
}: {
  card: RecruiterJobPipelineCard;
  onClose: () => void;
  onStatusChange: (applicationId: string, status: string) => void;
}) {
  const candidate = card.candidate;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-surface border-l border-base h-screen shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-base flex items-center justify-between bg-surface-2 shrink-0">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold text-sm text-primary">Applicant Details</span>
          </div>
          <button
            className="icon-btn"
            onClick={onClose}
            type="button"
            title="Close details"
          >
            <XCircle size={17} />
          </button>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* User Basics */}
          <div className="flex flex-col items-center text-center space-y-2">
            <Avatar
              user={
                {
                  username: candidate.username,
                  profile: { avatarUrl: candidate.avatarUrl },
                } as User
              }
              size="md"
            />
            <div>
              <h3 className="font-bold text-base text-primary">{candidate.fullName}</h3>
              <p className="text-xs text-muted-fg">@{candidate.username}</p>
              <p className="text-xs font-medium text-indigo-800 dark:text-indigo-400 mt-1">{candidate.headline}</p>
            </div>
          </div>

          <hr className="border-base" />

          {/* Verification Metrics */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Verification Metrics</h4>
            <div className="grid grid-cols-2 gap-3 bg-surface-2 rounded-xl p-4 border border-base text-xs">
              <div>
                <span className="text-muted-fg block">Experiences</span>
                <span className="font-bold text-primary">
                  {card.verificationMetrics?.totalExperiences || 0} ({card.verificationMetrics?.verifiedExperiences || 0} Verified)
                </span>
              </div>
              <div>
                <span className="text-muted-fg block">Avg Verification Score</span>
                <span className="font-bold text-indigo-800 dark:text-indigo-400">
                  {card.verificationMetrics?.averageVerificationScore || 0}/100
                </span>
              </div>
              <div className="col-span-2 pt-2 border-t border-base flex items-center gap-1.5 text-indigo-800 dark:text-indigo-400">
                <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold">
                  {card.verificationMetrics?.isVerifiedEngineer ? "Verified Engineer Profile" : "Unverified Profile"}
                </span>
              </div>
            </div>
          </div>

          {/* Skills match */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Required Skills Match</h4>
            <div className="bg-indigo-50/20 dark:bg-indigo-950/20 rounded-xl p-4 border border-indigo-200/30 dark:border-indigo-900/30 text-xs space-y-2">
              <div className="flex justify-between font-bold text-indigo-800 dark:text-indigo-400">
                <span>Match score:</span>
                <span>{card.skillsMatch?.matchPercentage || 0}%</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(card.skillsMatch?.matched || []).map((skill: string) => (
                  <span key={skill} className="rounded bg-indigo-100/60 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30 px-1.5 py-0.5 text-xxs font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Resume & Documents */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Application Documents</h4>
            <div className="space-y-2 text-xs">
              {card.resumeUrl ? (
                <a
                  href={card.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-base p-3 bg-surface-2 hover:bg-surface-3 hover:border-brand-light transition text-primary hover:text-brand"
                >
                  <FileText size={16} className="text-rose-500" />
                  <span className="font-semibold truncate flex-1">Candidate Resume</span>
                  <ExternalLink size={14} className="text-muted-fg" />
                </a>
              ) : (
                <div className="text-muted-fg py-1">No resume URL provided.</div>
              )}
            </div>
          </div>

          {/* Cover Letter */}
          {card.coverLetter && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Cover Letter Pitch</h4>
              <div className="bg-surface-2 border border-base rounded-xl p-4 text-xs leading-relaxed text-secondary">
                {card.coverLetter}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer controls to change applicant status */}
        <div className="p-5 border-t border-base bg-surface-2 shrink-0 space-y-3">
          <div className="text-xs font-semibold text-muted-fg">Pipeline Stage Operations</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn-secondary py-2 text-xs font-semibold"
              onClick={() => onStatusChange(card.id, "SHORTLISTED")}
              type="button"
              disabled={card.status === "SHORTLISTED"}
            >
              Shortlist
            </button>
            <button
              className="btn-secondary py-2 text-xs font-semibold"
              onClick={() => onStatusChange(card.id, "INTERVIEW")}
              type="button"
              disabled={card.status === "INTERVIEW"}
            >
              Interview
            </button>
            <button
              className="btn-primary py-2 text-xs font-bold bg-indigo-650 dark:bg-indigo-600 text-white"
              onClick={() => onStatusChange(card.id, "HIRED")}
              type="button"
              disabled={card.status === "HIRED"}
            >
              Hire Candidate
            </button>
            <button
              className="btn-secondary border-rose-200/60 dark:border-rose-900/30 text-rose-750 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 py-2 text-xs font-semibold"
              onClick={() => onStatusChange(card.id, "REJECTED")}
              type="button"
              disabled={card.status === "REJECTED"}
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Premium Visual Skeleton Loader for Kanban Board */
function KanbanSkeleton() {
  return (
    <div className="relative">
      {/* Scroll indicator boundary fades */}
      <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-black/10 dark:from-black/25 to-transparent pointer-events-none z-10 lg:hidden" />
      <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-black/10 dark:from-black/25 to-transparent pointer-events-none z-10 lg:hidden" />

      <div className="grid gap-3 overflow-x-auto pb-4 lg:grid-cols-6 min-w-[1000px] lg:min-w-0">
        {Array.from({ length: 6 }).map((_, colIdx) => (
          <div key={colIdx} className="flex flex-col rounded-xl border border-base bg-surface h-[640px] overflow-hidden opacity-60">
            <div className="px-3 py-2.5 border-b border-base bg-surface-2 animate-pulse">
              <div className="h-4 w-20 bg-surface-3 rounded mb-2"></div>
              <div className="h-1.5 w-full bg-surface-3 rounded"></div>
            </div>
            <div className="flex-1 p-2 space-y-2">
              {Array.from({ length: 3 }).map((_, cardIdx) => (
                <div key={cardIdx} className="panel p-3 space-y-3 bg-surface-2/40 border-base animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-surface-3"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-2/3 bg-surface-3 rounded"></div>
                      <div className="h-2.5 w-1/2 bg-surface-3 rounded"></div>
                    </div>
                  </div>
                  <div className="h-3 w-1/3 bg-surface-3 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Premium Visual Skeleton Loader for AI Rankings */
function RankingsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="panel p-5 bg-surface border border-base flex justify-between items-center gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-surface-2"></div>
            <div className="h-10 w-10 rounded-full bg-surface-2"></div>
            <div className="space-y-2">
              <div className="h-3.5 w-32 bg-surface-2 rounded"></div>
              <div className="h-2.5 w-24 bg-surface-2 rounded"></div>
            </div>
          </div>
          <div className="h-8 w-24 bg-surface-2 rounded-lg"></div>
        </div>
      ))}
    </div>
  );
}

