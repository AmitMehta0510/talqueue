import { memo } from "react";
import { CalendarDays, Check, MapPin, Trophy, Users, Clock, ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Hackathon } from "../../lib/api";
import { formatCount, formatDate, STATUS_CHIP_CLASSES, titleCase, userName } from "../../core/utils/format";
import { Avatar } from "../ui";
import { useAuth } from "../../core/contexts/AuthContext";
import { useCreatePostMutation } from "../../hooks/usePlatformQueries";
import { useToast } from "../../core/contexts/ToastContext";

const PLATFORM_COLORS: Record<string, string> = {
  Devpost: "bg-cyan-50 text-cyan-700 border-cyan-100 hover:bg-cyan-100/50 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-900/50",
  Devfolio: "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100/50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50",
  Unstop: "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100/50 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50",
  TAIKAI: "bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100/50 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50",
  HackerEarth: "bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100/50 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50",
  Reskilll: "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100/50 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50",
};

const hackathonCount = (
  hackathon: Hackathon,
  key: "registrations" | "submissions" | "judges" | "winners",
) => {
  if (hackathon._count?.[key]) return hackathon._count[key] || 0;
  if (key === "registrations") return hackathon.registrationCount || 0;
  if (key === "submissions") return hackathon.submissionCount || 0;
  if (key === "judges") return hackathon.judgeCount || 0;
  return hackathon.winnerCount || 0;
};

const getTimelineInfo = (hackathon: Hackathon) => {
  const now = Date.now();
  const start = hackathon.startDate ? new Date(hackathon.startDate).getTime() : 0;
  const end = hackathon.endDate ? new Date(hackathon.endDate).getTime() : 0;
  const deadline = hackathon.registrationDeadline ? new Date(hackathon.registrationDeadline).getTime() : 0;

  if (end && now > end) {
    return {
      phase: "Completed",
      colorClass: STATUS_CHIP_CLASSES.HACKATHON_COMPLETED,
      progress: 100,
      text: "Hackathon ended",
    };
  }

  if (deadline && now > deadline) {
    if (start && end && now >= start && now <= end) {
      const total = end - start;
      const elapsed = now - start;
      const pct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
      return {
        phase: "Live",
        colorClass: STATUS_CHIP_CLASSES.HACKATHON_LIVE,
        progress: pct,
        text: `Happening Now (${pct}% elapsed)`,
        progressColor: "bg-gradient-to-r from-amber-500 to-orange-400",
      };
    }
    return {
      phase: "Closed",
      colorClass: STATUS_CHIP_CLASSES.HACKATHON_CLOSED,
      progress: 100,
      text: "Registration closed",
    };
  }

  // Registration is open!
  const msRemaining = deadline - now;
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  
  // Calculate relative progress from creation (or 14 days ago) to deadline
  const createdTime = hackathon.createdAt ? new Date(hackathon.createdAt).getTime() : (start - 14 * 24 * 60 * 60 * 1000);
  const totalRegTime = deadline - createdTime;
  const elapsedRegTime = now - createdTime;
  const pct = totalRegTime > 0 
    ? Math.min(100, Math.max(0, Math.round((elapsedRegTime / totalRegTime) * 100)))
    : 50;

  let text = `${daysRemaining} days left to register`;
  if (daysRemaining === 0) {
    const hoursRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60)));
    text = `${hoursRemaining} hours left to register`;
  } else if (daysRemaining === 1) {
    text = "1 day left to register";
  }

  return {
    phase: "Open",
    colorClass: STATUS_CHIP_CLASSES.HACKATHON_OPEN,
    progress: pct,
    text,
    progressColor: "bg-gradient-to-r from-indigo-500 to-teal-400",
  };
};

export const HackathonCard = memo(function HackathonCard({ hackathon }: { hackathon: Hackathon }) {
  const { user } = useAuth();
  const createPost = useCreatePostMutation();
  const { showToast } = useToast();

  const registrationTotal = Number(hackathonCount(hackathon, "registrations"));
  const submissionTotal = Number(hackathonCount(hackathon, "submissions"));
  const judgeTotal = Number(hackathonCount(hackathon, "judges"));

  const timeline = getTimelineInfo(hackathon);
  const isHackathonLive = timeline.phase === "Live";
  const isHackathonOpen = timeline.phase === "Open";

  // Accent color depending on state
  const topAccentClass = isHackathonLive
    ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500"
    : isHackathonOpen
    ? "bg-gradient-to-r from-indigo-500 via-teal-500 to-cyan-500"
    : "bg-slate-300";

  const isCollegeStaff = user && (user.primaryRole === "COLLEGE_ADMIN" || user.primaryRole === "TPO" || user.primaryRole === "CDCR");

  const handleShare = () => {
    if (!user?.profile?.collegeId || !user?.profile?.departmentId) {
      showToast("error", "No registered college department found in your profile.");
      return;
    }
    createPost.mutate({
      content: `Opportunity: ${hackathon.title}\n\nJoin this hackathon starting on ${formatDate(hackathon.startDate)}.\nRegistration Deadline: ${formatDate(hackathon.registrationDeadline)}\n${hackathon.externalUrl ? `Register here: ${hackathon.externalUrl}` : ""}`,
      type: "HACKATHON",
      collegeId: user.profile.collegeId,
      departmentId: user.profile.departmentId,
      visibility: "COLLEGE_ONLY",
    });
  };

  return (
    <article className="panel hover-lift flex flex-col justify-between min-h-[380px] overflow-hidden">
      {/* Dynamic top status accent bar */}
      <div className={`h-[4px] w-full ${topAccentClass}`} />

      <div className="flex flex-col flex-1">
        {/* Banner image wrapper */}
        {hackathon.bannerUrl && (
          <div className="relative h-36 w-full overflow-hidden bg-black/40 flex items-center justify-center border-b border-base">
            {/* Blurred background ambiance copy */}
            <div 
              className="absolute inset-0 bg-cover bg-center blur-md scale-110 opacity-30 pointer-events-none"
              style={{ backgroundImage: `url(${hackathon.bannerUrl})` }}
            />
            {/* Foreground contained image */}
            <Link to={`/hackathons/${hackathon.slug || hackathon.id}`} className="relative z-10 w-full h-full flex items-center justify-center p-1">
              <img
                className="max-h-full max-w-full object-contain transition-transform duration-500 ease-out group-hover:scale-102"
                src={hackathon.bannerUrl}
                alt={hackathon.title}
              />
            </Link>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </div>
        )}

        <div className="p-5 pb-0 flex flex-col flex-1">
          {/* Status and tags bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {hackathon.isExternal && (
                <span className={`chip text-[10px] font-bold border py-0.5 px-2 ${PLATFORM_COLORS[hackathon.sourcePlatform || ""] || "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"}`}>
                  {hackathon.sourcePlatform || "External"}
                </span>
              )}
              <span className={`chip text-[10px] font-semibold border py-0.5 px-2 ${timeline.colorClass}`}>
                {timeline.phase}
              </span>
            </div>
            
            {hackathon.featured && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200/60 rounded-full px-2 py-0.5 animate-pulse dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40">
                <Sparkles size={11} className="fill-amber-500 text-amber-500" />
                Featured
              </span>
            )}
          </div>

          {/* Title and description */}
          <div className="mb-4">
            <div className="flex items-start gap-2">
              <h3 className="text-base font-bold text-primary group-hover:text-brand transition-colors line-clamp-1">
                <Link to={`/hackathons/${hackathon.slug || hackathon.id}`}>
                  {hackathon.title}
                </Link>
              </h3>
              {hackathon.verified && hackathon.status !== "DRAFT" && (
                <span className="flex items-center justify-center text-brand bg-brand-light border border-brand-light/30 rounded-full p-0.5 shrink-0 mt-0.5" title="Verified by admin">
                  <Check size={11} className="stroke-[3]" />
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-muted-fg leading-relaxed line-clamp-2">
              {hackathon.shortDescription || hackathon.description || "Join this collaborative engineering experience."}
            </p>
          </div>

          {/* Timeline and progress bar widget */}
          <div className="mb-4.5 bg-surface-2 rounded-lg p-3 border border-base">
            <div className="flex items-center justify-between text-[11px] font-medium text-secondary">
              <div className="flex items-center gap-1">
                <Clock size={12} className="text-muted-fg" />
                <span className="font-semibold text-secondary">{timeline.text}</span>
              </div>
              <span className="text-muted-fg font-semibold">{timeline.progress}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${timeline.progressColor || "bg-slate-400"}`}
                style={{ width: `${timeline.progress}%` }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 mt-auto text-[11px]">
            <div className="rounded-lg border border-base p-2.5 bg-surface-2/20 hover:bg-surface-2/70 transition-colors flex flex-col justify-center">
              <span className="text-muted-fg font-medium">Event Starts</span>
              <div className="flex items-center gap-1 mt-0.5 font-semibold text-secondary">
                <CalendarDays size={13} className="text-blue-500" />
                {formatDate(hackathon.startDate)}
              </div>
            </div>

            {hackathon.isExternal ? (
              <div className="rounded-lg border border-base p-2.5 bg-surface-2/20 hover:bg-surface-2/70 transition-colors flex flex-col justify-center">
                <span className="text-muted-fg font-medium">Team Size</span>
                <div className="flex items-center gap-1 mt-0.5 font-semibold text-secondary">
                  <Users size={13} className="text-indigo-500" />
                  {(() => {
                    const min = hackathon.minTeamSize ?? 1;
                    const max = hackathon.maxTeamSize ?? 1;
                    if (min === max) {
                      return max === 1 ? "Solo" : `${max} Members`;
                    }
                    return `${min} - ${max} Members`;
                  })()}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-base p-2.5 bg-surface-2/20 hover:bg-surface-2/70 transition-colors flex flex-col justify-center">
                <span className="text-muted-fg font-medium">Participation</span>
                <div className="flex items-center gap-1 mt-0.5 font-semibold text-secondary">
                  <Users size={13} className="text-indigo-500" />
                  {formatCount(registrationTotal)} {registrationTotal === 1 ? "Team" : "Teams"}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-base p-2.5 bg-surface-2/20 hover:bg-surface-2/70 transition-colors flex flex-col justify-center">
              <span className="text-muted-fg font-medium">Location</span>
              <div className="flex items-center gap-1 mt-0.5 font-semibold text-secondary">
                <MapPin size={13} className="text-amber-500" />
                <span className="truncate">{hackathon.mode === "ONLINE" ? "Online" : hackathon.location || "Offline"}</span>
              </div>
            </div>

            {hackathon.isExternal ? (
              <div className="rounded-lg border border-base p-2.5 bg-surface-2/20 hover:bg-surface-2/70 transition-colors flex flex-col justify-center">
                <span className="text-muted-fg font-medium">Deadline</span>
                <div className="flex items-center gap-1 mt-0.5 font-semibold text-rose-600 dark:text-rose-400">
                  <Clock size={13} className="text-rose-400" />
                  {formatDate(hackathon.registrationDeadline)}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-base p-2.5 bg-surface-2/20 hover:bg-surface-2/70 transition-colors flex flex-col justify-center">
                <span className="text-muted-fg font-medium">Deliverables</span>
                <div className="flex items-center gap-1 mt-0.5 font-semibold text-secondary">
                  <Trophy size={13} className="text-amber-500" />
                  {formatCount(submissionTotal)} {submissionTotal === 1 ? "Project" : "Projects"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer details */}
      <div className="p-5 pt-3 border-t border-base flex items-center justify-between gap-3 shrink-0">
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-fg">
          <Avatar user={hackathon.createdBy} size="sm" />
          <span className="truncate font-semibold text-secondary">{hackathon.organizerName || userName(hackathon.createdBy)}</span>
        </div>
        
        {hackathon.isExternal && hackathon.externalUrl ? (
          <a
            href={hackathon.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
          >
            <span>Register</span>
            <ExternalLink size={12} />
          </a>
        ) : (
          <Link
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:text-brand hover:border-brand-light transition-colors"
            to={`/hackathons/${hackathon.slug || hackathon.id}`}
          >
            <span>Details</span>
            <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      {isCollegeStaff && (
        <div className="px-5 pb-4 pt-0 flex justify-end">
          <button
            onClick={handleShare}
            disabled={createPost.isPending}
            className="w-full btn-primary text-xxs py-2 px-3 flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-brand hover:from-indigo-500 hover:to-brand-light text-white font-bold transition-all shadow-md hover:shadow-lg rounded-lg"
          >
            One-Click Share to Community
          </button>
        </div>
      )}
    </article>
  );
});
