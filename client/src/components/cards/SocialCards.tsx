import { Check, CheckCheck, Gift, Link as LinkIcon, MessageSquare, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { SuggestedUser, User } from "../../lib/api";
import { formatCount, titleCase, userHeadline, userName } from "../../lib/format";
import { Avatar } from "../ui";

type ConnectionStatus = "NONE" | "PENDING" | "ACCEPTED";

export function EngineerCard({
  user,
  context,
  currentUserId,
  disabled,
  onConnect,
  onFollow,
  onMessage,
  onOpenProfile,
  onRequestReferral,
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

  const isSelf = Boolean(currentUserId && user.id === currentUserId);
  const canMessage = connectionStatus === "ACCEPTED";

  const handleConnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onConnect || connectionStatus !== "NONE") return;
    setConnectionStatus("PENDING");
    onConnect(user);
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onFollow || isFollowing) return;
    setIsFollowing(true);
    onFollow(user);
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
  };

  return (
    <article
      className={`panel p-5 ${onOpenProfile ? "cursor-pointer transition hover:border-emerald-300 hover:shadow-md" : ""}`}
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
              <h3 className="truncate text-sm font-semibold text-slate-950">{userName(user)}</h3>
              {user.verifiedEngineer && (
                <span className="chip shrink-0 text-emerald-700">
                  <Check size={13} />
                  Verified
                </span>
              )}
              {(user as any).role && (
                <span className="chip shrink-0">
                  {roleLabel[(user as any).role] ?? titleCase((user as any).role)}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-slate-500">
              {userHeadline(user) || `@${user.username}`}
            </p>
          </div>
        </div>
        {suggested.affinityScore !== undefined && (
          <div className="shrink-0 text-right">
            <div className="text-sm font-semibold text-slate-950">{Math.round(suggested.affinityScore)}</div>
            <div className="text-xs text-slate-500">Affinity</div>
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
          <div className="rounded-md border border-slate-100 p-3" key={label}>
            <div className="font-semibold text-slate-900">{formatCount(value)}</div>
            <div className="mt-1 text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Skills + score chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {context && <span className="chip">{context}</span>}
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

      {/* Actions */}
      {!isSelf && (
        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">

          {/* Follow */}
          {onFollow && (
            isFollowing ? (
              <button className="btn-secondary px-3 py-1.5 text-emerald-700" type="button" disabled>
                <Check size={15} />
                Following
              </button>
            ) : (
              <button
                className="btn-secondary px-3 py-1.5"
                type="button"
                disabled={disabled}
                onClick={handleFollow}
              >
                <UserPlus size={15} />
                Follow
              </button>
            )
          )}

          {/* Connect */}
          {onConnect && (
            connectionStatus === "ACCEPTED" ? (
              <button className="btn-secondary px-3 py-1.5 text-emerald-700" type="button" disabled>
                <Check size={15} />
                Connected
              </button>
            ) : connectionStatus === "PENDING" ? (
              <button className="btn-secondary px-3 py-1.5 text-slate-400" type="button" disabled>
                <CheckCheck size={15} />
                Request Sent
              </button>
            ) : (
              <button
                className="btn-primary px-3 py-1.5"
                type="button"
                disabled={disabled}
                onClick={handleConnect}
              >
                <Link size={15} />
                Connect
              </button>
            )
          )}

          {/* Message — show always when handler given, disabled until connected */}
          {onMessage && (
            <button
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                canMessage
                  ? "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
                  : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
              }`}
              type="button"
              disabled={!canMessage || disabled}
              title={canMessage ? "Open chat" : "Connect first to send messages"}
              onClick={handleMessage}
            >
              <MessageSquare size={14} />
              Message
            </button>
          )}

          {/* Ask Referral — only show for Professionals/Recruiters who accept referrals */}
          {onRequestReferral &&
            (
              (user as any).role === "WORKING_PROFESSIONAL" ||
              (user as any).role === "RECRUITER"
            ) &&
            (user as any).acceptingReferrals === true && (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
              type="button"
              disabled={disabled}
              onClick={handleReferral}
            >
               <Gift size={14} />
              Ask Referral
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export function TeamRoleBadge({ value }: { value?: string | null }) {
  return (
    <span className="chip">
      <Users size={13} />
      {titleCase(value || "MEMBER")}
    </span>
  );
}

// Re-export Link icon fix
function Link({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
