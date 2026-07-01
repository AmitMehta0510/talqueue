import { Check, CheckCheck, Gift, MessageSquare, UserPlus, Users, Loader2 } from "lucide-react";
import { useState, useEffect, memo } from "react";
import { SuggestedUser, User } from "../../lib/api";
import { formatCount, titleCase, userHeadline, userName } from "../../core/utils/format";
import { Avatar } from "../ui";

type ConnectionStatus = "NONE" | "PENDING" | "ACCEPTED";

export const EngineerCard = memo(function EngineerCard({
  user,
  context,
  currentUserId,
  disabled,
  onConnect,
  onFollow,
  onMessage,
  onOpenProfile,
  onRequestReferral,
  actionsInHeader = false,
}: {
  user: User | SuggestedUser;
  context?: string;
  currentUserId?: string;
  disabled?: boolean;
  onConnect?: (user: User | SuggestedUser) => void;
  onFollow?: (user: User | SuggestedUser) => void;
  onMessage?: (user: User | SuggestedUser) => void;
  onOpenProfile?: (user: User | SuggestedUser) => void;
  onRequestReferral?: (user: User | SuggestedUser) => void;
  actionsInHeader?: boolean;
}) {
  const suggested = user as SuggestedUser;

  const skills = (user.skills || [])
    .map((us) => us.skill?.name)
    .filter(Boolean)
    .slice(0, 4) as string[];

  const initConnection: ConnectionStatus =
    ((user as any).connectionStatus as ConnectionStatus) || "NONE";
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(initConnection);

  const [isFollowing, setIsFollowing] = useState<boolean>(
    Boolean((user as any).isFollowing),
  );

  const [isConnectingPending, setIsConnectingPending] = useState(false);
  const [isFollowingPending, setIsFollowingPending] = useState(false);

  useEffect(() => {
    setConnectionStatus(((user as any).connectionStatus as ConnectionStatus) || "NONE");
  }, [(user as any).connectionStatus]);

  useEffect(() => {
    setIsFollowing(Boolean((user as any).isFollowing));
  }, [(user as any).isFollowing]);

  const isSelf = Boolean(currentUserId && user.id === currentUserId);
  const canMessage = connectionStatus === "ACCEPTED";

  const handleConnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onConnect || connectionStatus !== "NONE" || isConnectingPending) return;
    setConnectionStatus("PENDING");
    setIsConnectingPending(true);
    try {
      await onConnect(user);
    } catch {
      setConnectionStatus("NONE");
    } finally {
      setIsConnectingPending(false);
    }
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onFollow || isFollowing || isFollowingPending) return;
    setIsFollowing(true);
    setIsFollowingPending(true);
    try {
      await onFollow(user);
    } catch {
      setIsFollowing(false);
    } finally {
      setIsFollowingPending(false);
    }
  };

  const handleMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onMessage || !canMessage) return;
    onMessage(user);
  };

  const handleReferral = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestReferral?.(user);
  };

  const roleLabel: Record<string, string> = {
    STUDENT: "Student",
    PROFESSOR: "Professor",
    RECRUITER: "Recruiter",
    WORKING_PROFESSIONAL: "Professional",
    PROFESSIONAL: "Professional",
  };

  const renderActions = (compact = false) => {
    if (isSelf) return null;
    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "mt-2 justify-start" : "mt-5 justify-end border-t border-base pt-4"}`}>
        {/* Follow */}
        {onFollow && (
          isFollowing ? (
            <button
              className={`btn-secondary ${compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5"} text-brand bg-brand-light border-brand-light opacity-80`}
              type="button"
              disabled
            >
              <Check size={compact ? 12 : 15} />
              Following
            </button>
          ) : (
            <button
              className={`btn-secondary ${compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5"}`}
              type="button"
              disabled={disabled || isFollowingPending}
              onClick={handleFollow}
            >
              {isFollowingPending ? <Loader2 className="animate-spin" size={compact ? 12 : 15} /> : <UserPlus size={compact ? 12 : 15} />}
              Follow
            </button>
          )
        )}

        {/* Connect */}
        {onConnect && (
          connectionStatus === "ACCEPTED" ? (
            <button
              className={`btn-secondary ${compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5"} text-brand bg-brand-light border-brand-light opacity-80`}
              type="button"
              disabled
            >
              <Check size={compact ? 12 : 15} />
              Connected
            </button>
          ) : connectionStatus === "PENDING" ? (
            <button
              className={`btn-secondary ${compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5"} text-muted-fg`}
              type="button"
              disabled
            >
              <CheckCheck size={compact ? 12 : 15} />
              Request Sent
            </button>
          ) : (
            <button
              className={`btn-primary ${compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5"}`}
              type="button"
              disabled={disabled || isConnectingPending}
              onClick={handleConnect}
            >
              {isConnectingPending ? <Loader2 className="animate-spin" size={compact ? 12 : 15} /> : <LinkIcon size={compact ? 12 : 15} />}
              Connect
            </button>
          )
        )}

        {/* Message */}
        {onMessage && (
          <button
            className={`inline-flex items-center gap-1.5 rounded-lg border ${compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs"} font-semibold transition-all duration-150 active:scale-[0.97] ${
              canMessage
                ? "border-base bg-surface text-secondary hover:border-brand hover:bg-brand-light hover:text-brand"
                : "cursor-not-allowed border-base bg-surface-2 text-muted-fg opacity-50"
            }`}
            type="button"
            disabled={!canMessage || disabled}
            title={canMessage ? "Open chat" : "Connect first to send messages"}
            onClick={handleMessage}
          >
            <MessageSquare size={compact ? 11 : 14} />
            Message
          </button>
        )}

        {/* Ask Referral */}
        {onRequestReferral &&
          (
            (user.primaryRole === "PROFESSIONAL" || user.primaryRole === "WORKING_PROFESSIONAL" || (user as any).role === "PROFESSIONAL" || (user as any).role === "WORKING_PROFESSIONAL") ||
            (user.primaryRole === "RECRUITER" || (user as any).role === "RECRUITER")
          ) &&
          user.acceptingReferrals === true && (
          <button
            className={`inline-flex items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 ${compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs"} font-semibold text-amber-800 dark:text-amber-400 transition hover:bg-amber-100 dark:hover:bg-amber-950/50 hover:shadow-sm`}
            type="button"
            disabled={disabled}
            onClick={handleReferral}
          >
            <Gift size={compact ? 11 : 14} />
            Ask Referral
          </button>
        )}
      </div>
    );
  };

  return (
    <article
      className={`panel p-5 hover-lift ${onOpenProfile ? "cursor-pointer hover:border-indigo-500/40 dark:hover:border-indigo-400/40" : ""}`}
      role={onOpenProfile ? "button" : undefined}
      tabIndex={onOpenProfile ? 0 : undefined}
      onClick={() => onOpenProfile?.(user)}
      onKeyDown={(e) => {
        if (!onOpenProfile) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenProfile(user);
        }
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar user={user} />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-primary">{userName(user)}</h3>
              {user.verifiedEngineer && (
                <span className="chip shrink-0 text-brand bg-brand-light border-brand-light">
                  <Check size={13} />
                  Verified
                </span>
              )}
              {(user.primaryRole || (user as any).role) && (
                <span className="chip shrink-0">
                  {roleLabel[(user.primaryRole || (user as any).role) as string] ?? titleCase((user.primaryRole || (user as any).role) as string)}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted-fg">
              {userHeadline(user) || `@${user.username}`}
            </p>

            {/* Display action controls compact inside the header block if requested */}
            {actionsInHeader && renderActions(true)}
          </div>
        </div>
        {suggested.affinityScore !== undefined && (
          <div className="shrink-0 text-right">
            <div className="text-sm font-semibold text-primary">{Math.round(suggested.affinityScore)}</div>
            <div className="text-xs text-muted-fg">Affinity</div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        {[
          { label: "Followers", value: user.followersCount },
          { label: "Following", value: user.followingCount },
          { label: "Connections", value: user.connectionCount },
        ].map(({ label, value }) => (
          <div className="rounded-lg border border-base bg-surface-2 p-3" key={label}>
            <div className="font-semibold text-primary">{formatCount(value)}</div>
            <div className="mt-1 text-muted-fg">{label}</div>
          </div>
        ))}
      </div>

      {/* Skills + score chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {context && <span className="chip">{context}</span>}
        {(user.mutualConnectionCount ?? 0) > 0 && (
          <span className="chip text-brand bg-brand-light border-brand-light">
            <Users size={11} />
            {user.mutualConnectionCount} mutual
          </span>
        )}
        {suggested.collaborationScore !== undefined && (
          <span className="chip">Collab {Math.round(suggested.collaborationScore)}</span>
        )}
        {suggested.skillSimilarityScore !== undefined && (
          <span className="chip">Skills {Math.round(suggested.skillSimilarityScore)}</span>
        )}
        {skills.map((skill) => (
          <span className="chip" key={skill}>{skill}</span>
        ))}
      </div>

      {/* Actions (only if actionsInHeader is false) */}
      {!actionsInHeader && renderActions(false)}
    </article>
  );
});

export const TeamRoleBadge = memo(function TeamRoleBadge({ value }: { value?: string | null }) {
  return (
    <span className="chip">
      <Users size={13} />
      {titleCase(value || "MEMBER")}
    </span>
  );
});

// Re-export Link icon fix
function LinkIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
