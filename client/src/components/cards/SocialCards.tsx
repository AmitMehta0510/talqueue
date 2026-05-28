import { Check, Link as LinkIcon, MessageSquare, UserPlus, UserRound, Users } from "lucide-react";
import { SuggestedUser, User } from "../../lib/api";
import { formatCount, titleCase, userHeadline, userName } from "../../lib/format";
import { Avatar } from "../ui";

export function EngineerCard({
  user,
  context,
  disabled,
  isFollowing,
  onConnect,
  onFollow,
  onMessage,
  onOpenProfile,
}: {
  user: User | SuggestedUser;
  context?: string;
  disabled?: boolean;
  isFollowing?: boolean;
  onConnect?: (user: User | SuggestedUser) => void;
  onFollow?: (user: User | SuggestedUser) => void;
  onMessage?: (user: User | SuggestedUser) => void;
  onOpenProfile?: (user: User | SuggestedUser) => void;
}) {
  const suggested = user as SuggestedUser;
  const skills = (user.skills || [])
    .map((userSkill) => userSkill.skill?.name)
    .filter(Boolean)
    .slice(0, 4) as string[];

  return (
    <article
      className={`panel p-5 ${onOpenProfile ? "cursor-pointer transition hover:border-emerald-300" : ""}`}
      role={onOpenProfile ? "button" : undefined}
      tabIndex={onOpenProfile ? 0 : undefined}
      onClick={() => onOpenProfile?.(user)}
      onKeyDown={(event) => {
        if (!onOpenProfile) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenProfile(user);
        }
      }}
    >
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
            </div>
            <p className="truncate text-xs text-slate-500">
              {userHeadline(user) || `@${user.username}`}
            </p>
          </div>
        </div>
        {suggested.affinityScore !== undefined && (
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-950">
              {Math.round(suggested.affinityScore)}
            </div>
            <div className="text-xs text-slate-500">Affinity</div>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <div className="rounded-md border border-slate-100 p-3">
          <div className="font-semibold text-slate-900">{formatCount(user.followersCount)}</div>
          <div className="mt-1 text-slate-500">Followers</div>
        </div>
        <div className="rounded-md border border-slate-100 p-3">
          <div className="font-semibold text-slate-900">{formatCount(user.followingCount)}</div>
          <div className="mt-1 text-slate-500">Following</div>
        </div>
        <div className="rounded-md border border-slate-100 p-3">
          <div className="font-semibold text-slate-900">{formatCount(user.connectionCount)}</div>
          <div className="mt-1 text-slate-500">Connections</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {context && <span className="chip">{context}</span>}
        {suggested.collaborationScore !== undefined && (
          <span className="chip">Collab {Math.round(suggested.collaborationScore)}</span>
        )}
        {suggested.skillSimilarityScore !== undefined && (
          <span className="chip">Skills {Math.round(suggested.skillSimilarityScore)}</span>
        )}
        {skills.map((skill) => (
          <span className="chip" key={skill}>
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        {onOpenProfile && (
          <button
            className="btn-secondary px-3 py-1.5"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenProfile(user);
            }}
          >
            <UserRound size={15} />
            Profile
          </button>
        )}
        {onMessage && (
          <button
            className="btn-primary px-3 py-1.5"
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onMessage(user);
            }}
          >
            <MessageSquare size={15} />
            Message
          </button>
        )}
        {isFollowing ? (
          <button className="btn-secondary px-3 py-1.5" type="button" disabled>
            <Check size={15} />
            Following
          </button>
        ) : onFollow ? (
          <button
            className="btn-secondary px-3 py-1.5"
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onFollow(user);
            }}
          >
            <UserPlus size={15} />
            Follow
          </button>
        ) : null}
        {onConnect && (
          <button
            className="btn-primary px-3 py-1.5"
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onConnect(user);
            }}
          >
            <LinkIcon size={15} />
            Connect
          </button>
        )}
      </div>
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
