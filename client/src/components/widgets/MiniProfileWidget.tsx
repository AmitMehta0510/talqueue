import { ShieldCheck, Award, Github, Check } from "lucide-react";
import { useMyFullProfileQuery } from "../../hooks/usePlatformQueries";
import { WidgetContainer } from "../ui/WidgetContainer";
import { Avatar, SkeletonBlock } from "../ui";

export function MiniProfileWidget() {
  const { data: profile, isLoading, error } = useMyFullProfileQuery();

  if (isLoading) {
    return (
      <WidgetContainer title="Developer Dossier">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-12 w-12 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-3 w-3/4" />
              <SkeletonBlock className="h-2.5 w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-2/3" />
          </div>
        </div>
      </WidgetContainer>
    );
  }

  if (error || !profile) {
    return (
      <WidgetContainer title="Developer Dossier">
        <div className="text-center py-4 text-xs text-danger">
          Failed to load profile details
        </div>
      </WidgetContainer>
    );
  }

  const isCollegeVerified = profile.verifiedEngineer;
  const reputation = profile.reputationScore || 0;
  const trustLevel = profile.trustLevel || "UNVERIFIED";
  const githubUrl = profile.profile?.githubUrl;
  const githubUsername = githubUrl ? githubUrl.replace(/\/$/, "").split("/").pop() : null;

  return (
    <WidgetContainer title="Developer Dossier">
      <div className="flex flex-col items-center text-center pb-4 border-b border-[color:var(--border)]">
        <Avatar user={profile} size="lg" />
        <h4 className="text-sm font-black text-primary mt-3 flex items-center gap-1">
          {profile.profile?.fullName || profile.username}
          {isCollegeVerified && (
            <span title="College Verified" className="flex shrink-0">
              <ShieldCheck size={14} className="text-brand" />
            </span>
          )}
        </h4>
        <p className="text-[10px] text-muted truncate max-w-full px-2 mt-0.5">
          {profile.profile?.department?.name || "Student"}
        </p>
        <p className="text-[9px] text-brand uppercase tracking-wider font-extrabold mt-1">
          {profile.profile?.college?.name || "Independent"}
        </p>
      </div>

      {/* Profile Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5 py-4 border-b border-[color:var(--border)] text-center">
        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface-2 border border-[color:var(--border)]">
          <Award size={14} className="text-amber-500 mb-1" />
          <span className="text-xs font-black text-primary">
            {reputation}
          </span>
          <span className="text-[8px] uppercase tracking-wide text-muted font-bold mt-0.5">
            Reputation
          </span>
        </div>
        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface-2 border border-[color:var(--border)]">
          <ShieldCheck size={14} className="text-brand mb-1" />
          <span className="text-xs font-black text-primary truncate max-w-full px-1">
            {trustLevel}
          </span>
          <span className="text-[8px] uppercase tracking-wide text-muted font-bold mt-0.5">
            Trust Level
          </span>
        </div>
      </div>

      {/* GitHub Sync Status */}
      <div className="pt-3 text-[10px] space-y-2">
        {githubUsername ? (
          <a
            href={githubUrl || `https://github.com/${githubUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-secondary hover:text-brand transition-colors duration-200"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Github size={12} />
              {githubUsername}
            </span>
            <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-extrabold text-[8px] uppercase">
              <Check size={8} className="stroke-[3px]" />
              Synced
            </span>
          </a>
        ) : (
          <div className="flex items-center justify-between text-muted">
            <span className="flex items-center gap-1.5">
              <Github size={12} />
              GitHub Account
            </span>
            <span className="text-[8px] bg-surface-3 px-1.5 py-0.5 rounded font-black tracking-wide uppercase">
              Not Connected
            </span>
          </div>
        )}
      </div>
    </WidgetContainer>
  );
}
