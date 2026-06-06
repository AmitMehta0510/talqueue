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
      // Clear selected candidate overlay if updated
      if (selectedCandidate && selectedCandidate.id === applicationId) {
        setSelectedCandidate((prev) => (prev ? { ...prev, status } : null));
      }
    } catch {
      // Handled by mutation toast
    }
  };

  const columnsList = [
    { key: "APPLIED", label: "Applied", color: "border-t-blue-500 bg-blue-50/20 text-blue-800" },
    { key: "VIEWED", label: "Viewed", color: "border-t-indigo-500 bg-indigo-50/20 text-indigo-800" },
    { key: "SHORTLISTED", label: "Shortlisted", color: "border-t-amber-500 bg-amber-50/20 text-amber-800" },
    { key: "INTERVIEW", label: "Interviewing", color: "border-t-purple-500 bg-purple-50/20 text-purple-800" },
    { key: "HIRED", label: "Hired", color: "border-t-emerald-500 bg-emerald-50/20 text-emerald-800" },
    { key: "REJECTED", label: "Rejected", color: "border-t-rose-500 bg-rose-50/20 text-rose-800" },
  ];

  const pipelineData = pipelineQuery.data?.pipeline || {};
  const jobTitle = pipelineQuery.data?.job?.title || "Recruiter Pipeline";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            className="icon-btn shrink-0"
            type="button"
            title="Back to Dashboard"
            onClick={onBack}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-950">{jobTitle}</h2>
            <p className="text-xs text-slate-500">Pipeline Tracking & AI Candidate Matches</p>
          </div>
        </div>

        {/* View Selection Tab */}
        <div className="flex rounded-lg bg-slate-100 p-1">
          <button
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
              activeSubTab === "pipeline"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
            onClick={() => setActiveSubTab("pipeline")}
          >
            Visual Pipeline
          </button>
          <button
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
              activeSubTab === "rankings"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
            onClick={() => setActiveSubTab("rankings")}
          >
            AI Candidate Rankings
          </button>
        </div>
      </div>

      {activeSubTab === "pipeline" ? (
        pipelineQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <InlineLoader label="Loading applicant pipeline..." />
          </div>
        ) : pipelineQuery.isError ? (
          <ErrorState
            title="Pipeline failed to load"
            text={pipelineQuery.error?.message}
            onRetry={() => pipelineQuery.refetch()}
          />
        ) : (
          <div className="grid gap-4 overflow-x-auto pb-4 lg:grid-cols-6 min-w-[1000px] lg:min-w-0">
            {columnsList.map((col) => {
              const cards = pipelineData[col.key] || [];

              return (
                <div
                  key={col.key}
                  className={`flex flex-col rounded-lg border-t-4 border-slate-200 bg-white shadow-sm h-[650px] overflow-hidden ${col.color}`}
                >
                  <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
                    <span className="font-semibold text-xs text-slate-700">{col.label}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xxs font-bold text-slate-600">
                      {cards.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {cards.length ? (
                      cards.map((card: RecruiterJobPipelineCard) => (
                        <div
                          key={card.id}
                          className="group relative cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-emerald-300 hover:shadow-md transition"
                          onClick={() => setSelectedCandidate(card)}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar
                              user={
                                {
                                  username: card.candidate.username,
                                  profile: {
                                    avatarUrl: card.candidate.avatarUrl,
                                    fullName: card.candidate.fullName,
                                  },
                                } as User
                              }
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="truncate text-xs font-semibold text-slate-950">
                                {card.candidate.fullName}
                              </h4>
                              <p className="truncate text-xxs text-slate-500 mt-0.5">
                                {card.candidate.headline || `@${card.candidate.username}`}
                              </p>
                            </div>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xxs font-semibold text-emerald-800">
                              Score: {card.candidate.engineeringScore || 0}
                            </span>
                            <span className="text-xxs text-slate-500 font-medium">
                              Match: {card.skillsMatch?.matchPercentage || 0}%
                            </span>
                          </div>

                          {card.badges && card.badges.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {card.badges.slice(0, 2).map((b) => (
                                <span
                                  key={b.name}
                                  className="rounded bg-slate-50 border border-slate-100 px-1 py-0.5 text-[9px] font-medium text-slate-500"
                                >
                                  {b.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="flex h-32 flex-col items-center justify-center text-center text-slate-400">
                        <Clock size={16} />
                        <span className="text-xxs mt-1.5 font-medium">Empty</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : rankingsQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <InlineLoader label="AI ranking candidates..." />
        </div>
      ) : rankingsQuery.isError ? (
        <ErrorState
          title="Failed to load rankings"
          text={rankingsQuery.error?.message}
          onRetry={() => rankingsQuery.refetch()}
        />
      ) : (
        <div className="space-y-4">
          <div className="panel p-5 bg-gradient-to-r from-emerald-50/20 to-teal-50/20">
            <div className="flex items-start gap-3">
              <Sparkles className="text-emerald-700 mt-0.5 shrink-0" size={18} />
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Cosine Similarity Candidate Matcher</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Candidates are ranked based on their skill sets similarity and complementary capabilities relative to the job requirements.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {rankingsQuery.data && rankingsQuery.data.length > 0 ? (
              rankingsQuery.data.map((rank: CandidateRanking, index: number) => (
                <RankingCard
                  key={rank.userId || index}
                  rank={index + 1}
                  candidate={rank}
                  onStatusChange={handleStatusChange}
                />
              ))
            ) : (
              <div className="panel p-10 text-center text-slate-500">
                No rankings available. Wait for candidates to apply.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Candidate Profile Details Drawer / Modal overlay */}
      {selectedCandidate && (
        <CandidateDetailsOverlay
          card={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onStatusChange={handleStatusChange}
        />
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
    <article className="panel p-5 space-y-4 hover:shadow-md transition">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left Side: Avatar, Name, Rank */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-800">
            #{rank}
          </div>
          <Avatar user={user} size="md" />
          <div>
            <h4 className="font-bold text-sm text-slate-950">
              {user.profile?.fullName || user.username}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {user.profile?.headline || `@${user.username}`} &bull; {user.profile?.location || "No location"}
            </p>
          </div>
        </div>

        {/* Right Side: Score, Quick Action dropdown */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 inline-flex items-center gap-1">
              <Sparkles size={12} />
              Fit: {candidate.fitScore || scorePct}%
            </span>
            <div className="text-[10px] text-slate-500 mt-1">Cosine Score: {(candidate.score || 0).toFixed(3)}</div>
          </div>

          <select
            className="field py-1 px-2.5 text-xs max-w-32 bg-slate-50 border-slate-200"
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
        <div className="border-t border-slate-100 pt-4 space-y-4 animate-in fade-in duration-150">
          {candidate.reasons && candidate.reasons.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-slate-950 mb-1.5 flex items-center gap-1">
                <Sparkles size={12} className="text-emerald-700" /> Match Insights
              </h5>
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                {candidate.reasons.map((reason: string, rIdx: number) => (
                  <li key={rIdx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* User profile signals */}
          <div className="grid gap-4 sm:grid-cols-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div>
              <div className="font-semibold text-slate-950">Skills</div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(user.skills || []).map((s: UserSkill) => (
                  <span key={s.id} className="chip bg-white">
                    {s.skill?.name || s.name}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="font-semibold text-slate-950 mb-1">Trust Profile</div>
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Trust Score Level: {titleCase(user.trustLevel || "BEGINNER")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award size={14} className="text-amber-600" />
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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xxs">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white h-screen shadow-panel flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-emerald-700" />
            <span className="font-semibold text-sm text-slate-950">Applicant Details</span>
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
              <h3 className="font-bold text-base text-slate-950">{candidate.fullName}</h3>
              <p className="text-xs text-slate-500">@{candidate.username}</p>
              <p className="text-xs font-medium text-emerald-800 mt-1">{candidate.headline}</p>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Verification Metrics */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-950 uppercase tracking-wider">Verification Metrics</h4>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs">
              <div>
                <span className="text-slate-500 block">Experiences</span>
                <span className="font-bold text-slate-950">
                  {card.verificationMetrics?.totalExperiences || 0} ({card.verificationMetrics?.verifiedExperiences || 0} Verified)
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Avg Verification Score</span>
                <span className="font-bold text-emerald-800">
                  {card.verificationMetrics?.averageVerificationScore || 0}/100
                </span>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center gap-1.5 text-emerald-800">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span className="font-semibold">
                  {card.verificationMetrics?.isVerifiedEngineer ? "Verified Engineer Profile" : "Unverified Profile"}
                </span>
              </div>
            </div>
          </div>

          {/* Skills match */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-950 uppercase tracking-wider">Required Skills Match</h4>
            <div className="bg-emerald-50/50 rounded-lg p-3 border border-emerald-100/50 text-xs space-y-2">
              <div className="flex justify-between font-bold text-emerald-900">
                <span>Match score:</span>
                <span>{card.skillsMatch?.matchPercentage || 0}%</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(card.skillsMatch?.matched || []).map((skill: string) => (
                  <span key={skill} className="rounded bg-emerald-100 text-emerald-900 px-1.5 py-0.5 text-xxs font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Resume & Documents */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-950 uppercase tracking-wider">Application Documents</h4>
            <div className="space-y-2 text-xs">
              {card.resumeUrl ? (
                <a
                  href={card.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 hover:border-emerald-300 hover:text-emerald-800 transition"
                >
                  <FileText size={16} className="text-rose-500" />
                  <span className="font-semibold truncate flex-1">Candidate Resume</span>
                  <ExternalLink size={14} className="text-slate-400" />
                </a>
              ) : (
                <div className="text-slate-400 py-1">No resume URL provided.</div>
              )}
            </div>
          </div>

          {/* Cover Letter */}
          {card.coverLetter && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-950 uppercase tracking-wider">Cover Letter Pitch</h4>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs leading-5 text-slate-600">
                {card.coverLetter}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer controls to change applicant status */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3">
          <div className="text-xs font-semibold text-slate-500">Pipeline Stage Operations</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn-secondary py-1 text-xs"
              onClick={() => onStatusChange(card.id, "SHORTLISTED")}
              type="button"
              disabled={card.status === "SHORTLISTED"}
            >
              Shortlist
            </button>
            <button
              className="btn-secondary py-1 text-xs"
              onClick={() => onStatusChange(card.id, "INTERVIEW")}
              type="button"
              disabled={card.status === "INTERVIEW"}
            >
              Interview
            </button>
            <button
              className="btn-primary py-1 text-xs"
              onClick={() => onStatusChange(card.id, "HIRED")}
              type="button"
              disabled={card.status === "HIRED"}
            >
              Hire Candidate
            </button>
            <button
              className="btn-secondary border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 py-1 text-xs"
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
