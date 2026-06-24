import {
  AlertTriangle, Archive, Check, ChevronDown, Edit3, Loader2,
  Plus, RotateCcw, Search, Shield, Trash2, UserMinus, UserPlus, Users, X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { TeamRoleBadge } from "../components/cards/SocialCards";
import { Avatar, EmptyState, Metric } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import {
  useCreateTeamMutation,
  useInviteTeamMemberMutation,
  useMyPendingTeamInvitesQuery,
  useMyTeamsQuery,
  usePlatformSearchMutation,
  usePromoteMemberMutation,
  useRemoveTeamMemberMutation,
  useReviewTeamInviteMutation,
  useTeamLifecycleMutation,
  useTeamQuery,
  useUpdateTeamMutation,
  useWithdrawTeamInviteMutation,
} from "../hooks/usePlatformQueries";
import { Team, TeamInvite, User } from "../lib/api";
import { compactPayload, formatCount, formatDate, titleCase, userHeadline, userName } from "../lib/format";

// ─── helpers ─────────────────────────────────────────────────────────────────

const teamMemberCount = (team?: Team) => team?._count?.members || team?.members?.length || 0;

const currentMembership = (team?: Team, userId?: string) =>
  team?.members?.find((m) => m.userId === userId);

const canManageTeam = (team?: Team, userId?: string) => {
  const m = currentMembership(team, userId);
  return m?.role === "OWNER" || m?.role === "ADMIN" || team?.ownerId === userId;
};

const statusColor = (status?: string) => {
  if (status === "ARCHIVED") return "text-amber-700 bg-amber-50 border-amber-200";
  if (status === "DELETED") return "text-rose-700 bg-rose-50 border-rose-200";
  return "text-indigo-700 bg-indigo-50 border-indigo-200";
};

// ─── Create Team ─────────────────────────────────────────────────────────────

function CreateTeamPanel({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ name: "", description: "" });
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const search = usePlatformSearchMutation();
  const createTeam = useCreateTeamMutation();

  const submitSearch = (e?: { preventDefault: () => void }) => {
    e?.preventDefault();
    if (query.trim()) search.mutate(query);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createTeam.mutateAsync({
        name: form.name,
        ...compactPayload({
          description: form.description,
          members: selectedMembers.map((m) => m.id),
        }),
      });
      setForm({ name: "", description: "" });
      setSelectedMembers([]);
      setQuery("");
      setOpen(false);
    } catch { return; }
  };

  const addMember = (u: User) =>
    setSelectedMembers((cur) => cur.some((m) => m.id === u.id) ? cur : [...cur, u]);

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Teams</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Create working groups, manage members, and prepare hackathon squads.
          </p>
        </div>
        <button className="btn-primary" type="button" disabled={disabled} onClick={() => setOpen((v) => !v)}>
          <Plus size={16} /> Create
        </button>
      </div>

      {open && (
        <form className="mt-5 space-y-3 border-t pt-5" onSubmit={submit} style={{ borderColor: "var(--border)" }}>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="field" value={form.name} required
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              placeholder="Team name *"
            />
            <input
              className="field" value={form.description}
              onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
              placeholder="Description (optional)"
            />
          </div>

          {/* Member search */}
          <div className="rounded-md border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex gap-2">
              <input
                className="field" value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submitSearch())}
                placeholder="Search & add members"
              />
              <button className="btn-secondary" type="button" disabled={search.isPending} onClick={submitSearch}>
                {search.isPending ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
              </button>
            </div>
            {selectedMembers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedMembers.map((m) => (
                  <button
                    className="chip" key={m.id} type="button"
                    onClick={() => setSelectedMembers((cur) => cur.filter((x) => x.id !== m.id))}
                  >
                    {userName(m)} <X size={13} />
                  </button>
                ))}
              </div>
            )}
            {(search.data?.users || []).length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(search.data?.users || []).slice(0, 6).map((item: any) => {
                  const u: User = item?.id ? item : item?.user;
                  if (!u?.id) return null;
                  const selected = selectedMembers.some((m) => m.id === u.id);
                  return (
                    <button
                      className={`flex items-center justify-between gap-3 rounded-md border p-3 text-left transition ${selected ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-700" : "hover:border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/10"}`}
                      style={!selected ? { borderColor: "var(--border)" } : {}}
                      key={u.id} type="button" onClick={() => addMember(u)}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Avatar user={u} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{userName(u)}</span>
                          <span className="block truncate text-xs" style={{ color: "var(--text-muted)" }}>{userHeadline(u)}</span>
                        </span>
                      </span>
                      {selected ? <Check size={15} className="text-indigo-600" /> : <Plus size={15} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button className="btn-primary" type="submit" disabled={createTeam.isPending || !form.name.trim()}>
            {createTeam.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Create team
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Pending invites banner (global — received across all teams) ──────────────

function PendingInvitesBanner() {
  const review = useReviewTeamInviteMutation();
  const { data: invites, isLoading } = useMyPendingTeamInvitesQuery();

  if (isLoading || !invites?.length) return null;

  return (
    <div className="panel overflow-hidden p-0">
      <div className="border-b border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-5 py-3 flex items-center gap-2">
        <UserPlus size={15} className="text-amber-700 dark:text-amber-400" />
        <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          You have {invites.length} pending team invite{invites.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {invites.map((invite: TeamInvite) => (
          <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {invite.team?.name || "Team"}
              </div>
              <div className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                Invited by {invite.invitedBy ? userName(invite.invitedBy) : "someone"} · {formatDate(invite.createdAt)}
              </div>
              {invite.message && (
                <p className="mt-1 text-sm italic" style={{ color: "var(--text-secondary)" }}>"{invite.message}"</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                className="btn-primary px-3 py-1.5"
                type="button"
                disabled={review.isPending}
                onClick={() => review.mutate({ inviteId: invite.id, status: "ACCEPTED" })}
              >
                <Check size={14} /> Accept
              </button>
              <button
                className="btn-secondary px-3 py-1.5"
                type="button"
                disabled={review.isPending}
                onClick={() => review.mutate({ inviteId: invite.id, status: "REJECTED" })}
              >
                <X size={14} /> Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Team Card (list view) ────────────────────────────────────────────────────

function TeamCard({ team }: { team: Team }) {
  return (
    <article className={`panel p-5 ${team.status === "ARCHIVED" ? "opacity-75" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            <Link className="hover:text-indigo-700" to={`/teams/${team.id}`}>{team.name}</Link>
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            {team.description || "No description yet."}
          </p>
        </div>
        <span className={`chip shrink-0 border ${statusColor(team.status)}`}>
          {titleCase(team.status || "ACTIVE")}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        {[
          { label: "Members", value: teamMemberCount(team) },
          { label: "Reputation", value: formatCount(team.reputationScore) },
          { label: "Completed", value: formatCount(team.completedProjectsCount) },
        ].map(({ label, value }) => (
          <div className="rounded-md border p-3" key={label} style={{ borderColor: "var(--border)" }}>
            <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{value}</div>
            <div className="mt-1" style={{ color: "var(--text-muted)" }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex -space-x-2">
        {(team.members || []).slice(0, 6).map((m) => (
          <div className="rounded-full border-2" key={m.id || m.userId} style={{ borderColor: "var(--bg-surface)" }}>
            <Avatar user={m.user} size="sm" />
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-end border-t pt-4" style={{ borderColor: "var(--border)" }}>
        <Link className="btn-secondary px-3 py-1.5" to={`/teams/${team.id}`}>Open</Link>
      </div>
    </article>
  );
}

// ─── Edit Team Panel (inline) ─────────────────────────────────────────────────

function EditTeamPanel({ team }: { team: Team }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: team.name, description: team.description || "" });
  const update = useUpdateTeamMutation(team.id);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await update.mutateAsync(compactPayload({ name: form.name, description: form.description }));
      setOpen(false);
    } catch { return; }
  };

  return (
    <div className="panel p-5">
      <button
        className="flex w-full items-center justify-between text-sm font-semibold" style={{ color: "var(--text-primary)" }}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2"><Edit3 size={15} /> Edit team</span>
        <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <form className="mt-4 space-y-3" onSubmit={submit}>
          <input
            className="field" value={form.name} required
            onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
            placeholder="Team name"
          />
          <textarea
            className="field resize-none" rows={3} value={form.description}
            onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
            placeholder="Description"
          />
          <div className="flex gap-2">
            <button className="btn-primary px-3 py-1.5" type="submit" disabled={update.isPending}>
              {update.isPending ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}
              Save
            </button>
            <button className="btn-secondary px-3 py-1.5" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Invite Member Panel ──────────────────────────────────────────────────────

function InviteMemberPanel({ team }: { team: Team }) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const search = usePlatformSearchMutation();
  const invite = useInviteTeamMemberMutation(team.id);
  const memberIds = new Set((team.members || []).map((m) => m.userId));
  const users = (search.data?.users || []).filter((u) => !memberIds.has(u.id));

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) search.mutate(query);
  };

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Invite members</h3>
      <form className="mt-4 flex gap-2" onSubmit={submitSearch}>
        <input
          className="field" value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search engineers"
        />
        <button className="btn-secondary" type="submit" disabled={search.isPending}>
          {search.isPending ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
        </button>
      </form>
      <input
        className="field mt-3" value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Personal message (optional)"
      />
      <div className="mt-4 space-y-2">
        {users.slice(0, 5).map((item: any) => {
          const u: User = item?.id ? item : item?.user;
          if (!u?.id) return null;
          return (
            <div className="flex items-center justify-between gap-3 rounded-md border p-3" key={u.id} style={{ borderColor: "var(--border)" }}>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar user={u} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{userName(u)}</div>
                  <div className="truncate text-xs" style={{ color: "var(--text-muted)" }}>{userHeadline(u) || `@${u.username}`}</div>
                </div>
              </div>
              <button
                className="btn-secondary px-3 py-1.5" type="button"
                disabled={invite.isPending}
                onClick={() => invite.mutate({ userId: u.id, message })}
              >
                <UserPlus size={15} /> Invite
              </button>
            </div>
          );
        })}
        {search.data && users.length === 0 && (
          <p className="text-sm text-center py-3" style={{ color: "var(--text-muted)" }}>No engineers found — all matches are already members.</p>
        )}
      </div>
    </div>
  );
}

// ─── Members Panel ────────────────────────────────────────────────────────────

function MembersPanel({
  team, canManage, currentUserId, isOwner,
}: {
  team: Team; canManage: boolean; currentUserId?: string; isOwner: boolean;
}) {
  const navigate = useNavigate();
  const removeMember = useRemoveTeamMemberMutation(team.id);
  const promote = usePromoteMemberMutation(team.id);

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Members ({teamMemberCount(team)})</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(team.members || []).map((member) => (
          <div className="rounded-md border p-3" key={member.id || member.userId} style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between gap-3">
              <button
                className="flex min-w-0 items-center gap-3 text-left"
                onClick={() => navigate(`/users/${member.user?.username || member.userId}`)}
              >
                <Avatar user={member.user} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{userName(member.user)}</div>
                  <div className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
                    {userHeadline(member.user) || formatDate(member.joinedAt)}
                  </div>
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <TeamRoleBadge value={member.role} />
                {/* Promote/Demote (owner only, not on themselves or other owner) */}
                {isOwner && member.userId !== currentUserId && member.role !== "OWNER" && (
                  <button
                    className={`icon-btn h-7 w-7 ${member.role === "ADMIN" ? "text-amber-600" : ""}`}
                    type="button"
                    title={member.role === "ADMIN" ? "Demote to Member" : "Promote to Admin"}
                    disabled={promote.isPending}
                    onClick={() => promote.mutate({
                      memberUserId: member.userId,
                      role: member.role === "ADMIN" ? "MEMBER" : "ADMIN",
                    })}
                  >
                    <Shield size={13} />
                  </button>
                )}
                {/* Remove */}
                {canManage && member.userId !== currentUserId && member.role !== "OWNER" && (
                  <button
                    className="icon-btn h-7 w-7 text-rose-500"
                    type="button"
                    title="Remove member"
                    disabled={removeMember.isPending}
                    onClick={() => {
                      if (window.confirm(`Remove ${userName(member.user)} from ${team.name}?`)) {
                        removeMember.mutate(member.userId);
                      }
                    }}
                  >
                    <UserMinus size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Team Invites Panel ───────────────────────────────────────────────────────

function TeamInvitesPanel({
  team, currentUserId, canManage,
}: {
  team: Team; currentUserId?: string; canManage: boolean;
}) {
  const withdraw = useWithdrawTeamInviteMutation(team.id);
  const review = useReviewTeamInviteMutation();
  const invites = team.invites || [];

  if (!invites.length) return null;

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Invites
        <span className="ml-2 rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}>{invites.length}</span>
      </h3>
      <div className="mt-4 space-y-2">
        {invites.map((invite: TeamInvite) => {
          const isRecipient = invite.invitedUserId === currentUserId;
          const isPending = invite.status === "PENDING";

          return (
            <div className="rounded-md border p-3" key={invite.id} style={{ borderColor: "var(--border)" }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {invite.invitedUser ? userName(invite.invitedUser) : `User ${invite.invitedUserId.slice(0, 8)}`}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(invite.createdAt)}</div>
                </div>
                <span className={`chip border ${invite.status === "ACCEPTED" ? "text-indigo-700 border-indigo-200" : invite.status === "REJECTED" ? "text-rose-700 border-rose-200" : "border-slate-200"}`}>
                  {titleCase(invite.status)}
                </span>
              </div>
              {invite.message && <p className="mt-2 text-sm italic" style={{ color: "var(--text-secondary)" }}>"{invite.message}"</p>}
              {isPending && (
                <div className="mt-3 flex gap-2">
                  {isRecipient && (
                    <>
                      <button
                        className="btn-primary px-3 py-1.5" type="button" disabled={review.isPending}
                        onClick={() => review.mutate({ inviteId: invite.id, status: "ACCEPTED" })}
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        className="btn-secondary px-3 py-1.5" type="button" disabled={review.isPending}
                        onClick={() => review.mutate({ inviteId: invite.id, status: "REJECTED" })}
                      >
                        <X size={14} /> Reject
                      </button>
                    </>
                  )}
                  {canManage && (
                    <button
                      className="btn-secondary px-3 py-1.5" type="button" disabled={withdraw.isPending}
                      onClick={() => withdraw.mutate(invite.id)}
                    >
                      <X size={14} /> Withdraw
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Team Actions ─────────────────────────────────────────────────────────────

function TeamActions({
  team, canManage, isOwner,
}: {
  team: Team; canManage: boolean; isOwner: boolean;
}) {
  const navigate = useNavigate();
  const lifecycle = useTeamLifecycleMutation(team.id);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const memberCount = teamMemberCount(team);
  const isArchived = team.status === "ARCHIVED";

  const handleDelete = async () => {
    try {
      await lifecycle.mutateAsync("delete");
      navigate("/teams");
    } catch { /* toast shown by hook */ }
  };

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Actions</h3>
      <div className="mt-4 grid gap-2">
        {/* Leave (non-owner only) */}
        {!isOwner && (
          <button
            className="btn-secondary justify-start" type="button"
            disabled={lifecycle.isPending}
            onClick={() => lifecycle.mutate("leave")}
          >
            <UserMinus size={16} /> Leave team
          </button>
        )}
        {/* Archive / Restore */}
        {canManage && !isArchived && (
          <button
            className="btn-secondary justify-start text-amber-700 border-amber-200 hover:bg-amber-50"
            type="button" disabled={lifecycle.isPending}
            onClick={() => lifecycle.mutate("archive")}
          >
            <Archive size={16} /> Archive team
          </button>
        )}
        {canManage && isArchived && (
          <button
            className="btn-secondary justify-start text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            type="button" disabled={lifecycle.isPending}
            onClick={() => lifecycle.mutate("restore")}
          >
            <RotateCcw size={16} /> Restore team
          </button>
        )}
        {/* Delete (owner only) */}
        {isOwner && (
          <button
          className="justify-start rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-700 hover:border-rose-300 flex items-center gap-2 disabled:opacity-60"
            style={{ borderColor: "var(--border)", background: "var(--bg-surface)", color: "var(--text-secondary)" }}
            type="button" disabled={lifecycle.isPending}
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 size={16} /> Delete team
          </button>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl p-6 shadow-2xl" style={{ background: "var(--bg-surface)" }}>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="text-rose-600" size={28} />
              </div>
              <h3 className="mt-4 text-lg font-bold" style={{ color: "var(--text-primary)" }}>Delete "{team.name}"?</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                This will permanently delete the team and all associated data.{" "}
                <strong style={{ color: "var(--text-secondary)" }}>
                  {memberCount} member{memberCount !== 1 ? "s" : ""}
                </strong>{" "}
                will lose access. This action cannot be undone.
              </p>
              <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                Consider <strong>archiving</strong> instead — archived teams can be restored later.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                className="flex-1 rounded-md border py-2 text-sm font-semibold transition" style={{ borderColor: "var(--border)", background: "var(--bg-surface)", color: "var(--text-secondary)" }}
                type="button" onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-md bg-rose-600 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                type="button" disabled={lifecycle.isPending} onClick={handleDelete}
              >
                {lifecycle.isPending ? <Loader2 className="mx-auto animate-spin" size={16} /> : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Team Owner Panel ─────────────────────────────────────────────────────────

function TeamOwnerPanel({ team }: { team: Team }) {
  const navigate = useNavigate();
  const owner =
    team.owner ||
    team.members?.find((m) => m.userId === team.ownerId || m.role === "OWNER")?.user;

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Owner</h3>
      <button
        className="mt-4 flex w-full items-center gap-3 text-left"
        onClick={() => owner?.id && navigate(`/users/${owner.username || owner.id}`)}
      >
        <Avatar user={owner} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{userName(owner)}</div>
          <div className="truncate text-xs" style={{ color: "var(--text-muted)" }}>{userHeadline(owner) || owner?.username || "Team owner"}</div>
        </div>
      </button>
    </div>
  );
}

// ─── Team Detail ──────────────────────────────────────────────────────────────

function TeamDetail({ teamId }: { teamId: string }) {
  const { user } = useAuth();
  const teamQuery = useTeamQuery(teamId);
  const team = teamQuery.data;
  const canManage = canManageTeam(team, user?.id);
  const isOwner = Boolean(
    team?.ownerId === user?.id || currentMembership(team, user?.id)?.role === "OWNER",
  );

  if (teamQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
        <Loader2 className="animate-spin" size={16} /> Loading team
      </div>
    );
  }

  if (!team) {
    return <EmptyState icon={Users} title="Team not found" text="This team is unavailable." />;
  }

  return (
    <section className="space-y-5">
      <Link className="text-sm font-semibold text-indigo-700 hover:text-indigo-900" to="/teams">
        ← Back to teams
      </Link>

      {/* Hero */}
      <div className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{team.name}</h2>
              <span className={`chip border ${statusColor(team.status)}`}>
                {titleCase(team.status || "ACTIVE")}
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
              {team.description || "No description yet."}
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Members" value={teamMemberCount(team)} />
          <Metric label="Reputation" value={formatCount(team.reputationScore)} />
          <Metric label="Completed" value={formatCount(team.completedProjectsCount)} />
          <Metric label="Hackathon wins" value={formatCount(team.hackathonWinsCount)} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_23rem]">
        <div className="space-y-5">
          <MembersPanel canManage={canManage} currentUserId={user?.id} isOwner={isOwner} team={team} />
          <TeamInvitesPanel canManage={canManage} currentUserId={user?.id} team={team} />
        </div>
        <aside className="space-y-5">
          <TeamOwnerPanel team={team} />
          {canManage && <InviteMemberPanel team={team} />}
          {canManage && <EditTeamPanel team={team} />}
          <TeamActions canManage={canManage} isOwner={isOwner} team={team} />
        </aside>
      </div>
    </section>
  );
}

// ─── Teams Page ───────────────────────────────────────────────────────────────

export function TeamsPage() {
  const { teamId } = useParams();
  const { user } = useAuth();
  const teamsQuery = useMyTeamsQuery();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  const filteredTeams = useMemo(() => {
    const teams = (teamsQuery.data || []).filter((t) => t.status !== "DELETED");
    const q = query.trim().toLowerCase();
    return teams.filter((team) => {
      const matchQ = !q || [team.name, team.description, team.status].filter(Boolean).join(" ").toLowerCase().includes(q);
      const matchS = status === "ALL" || team.status === status;
      return matchQ && matchS;
    });
  }, [query, status, teamsQuery.data]);

  const visibleStatuses = useMemo(
    () => Array.from(new Set((teamsQuery.data || []).map((t) => t.status || "ACTIVE").filter(Boolean))),
    [teamsQuery.data],
  );

  if (!user) {
    return <EmptyState icon={Users} title="Login required" text="Sign in to create and manage teams." />;
  }

  if (teamId) return <TeamDetail teamId={teamId} />;

  return (
    <section className="space-y-5">
      <PendingInvitesBanner />
      <CreateTeamPanel disabled={!user} />

      <div className="panel p-5">
        <div className="grid grid-cols-3 gap-4">
          <Metric label="My Teams" value={formatCount(teamsQuery.data?.length || 0)} />
          <Metric label="Visible" value={formatCount(filteredTeams.length)} />
          <Metric
            label="Total Members"
            value={formatCount((teamsQuery.data || []).reduce((s, t) => s + teamMemberCount(t), 0))}
          />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_12rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: "var(--text-muted)" }} />
            <input
              className="field pl-9" value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your teams"
            />
          </div>
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ALL">All status</option>
            {visibleStatuses.map((s) => (
              <option key={s} value={s}>{titleCase(s)}</option>
            ))}
          </select>
        </div>
      </div>

      {teamsQuery.isFetching && (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <Loader2 className="animate-spin" size={16} /> Loading teams
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {filteredTeams.length ? (
          filteredTeams.map((team) => <TeamCard key={team.id} team={team} />)
        ) : (
          <EmptyState icon={Users} title="No teams yet" text="Create a team to start collaborating." />
        )}
      </div>
    </section>
  );
}
