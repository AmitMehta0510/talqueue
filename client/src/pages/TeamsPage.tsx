import { FormEvent, useMemo, useState } from "react";
import {
  Check,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { TeamRoleBadge } from "../components/cards/SocialCards";
import { Avatar, EmptyState, Metric } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import {
  useCreateTeamMutation,
  useInviteTeamMemberMutation,
  useMyTeamsQuery,
  usePlatformSearchMutation,
  useRemoveTeamMemberMutation,
  useReviewTeamInviteMutation,
  useTeamLifecycleMutation,
  useTeamQuery,
  useWithdrawTeamInviteMutation,
} from "../hooks/usePlatformQueries";
import { Team, TeamInvite, User } from "../lib/api";
import { compactPayload, formatCount, formatDate, titleCase, userHeadline, userName } from "../lib/format";

const teamMemberCount = (team?: Team) => team?._count?.members || team?.members?.length || 0;

const currentMembership = (team?: Team, userId?: string) =>
  team?.members?.find((member) => member.userId === userId);

const canManageTeam = (team?: Team, userId?: string) => {
  const membership = currentMembership(team, userId);
  return membership?.role === "OWNER" || membership?.role === "ADMIN" || team?.ownerId === userId;
};

function CreateTeamPanel({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ name: "", description: "" });
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const search = usePlatformSearchMutation();
  const createTeam = useCreateTeamMutation();

  const submitSearch = (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    search.mutate(query);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      await createTeam.mutateAsync({
        name: form.name,
        ...compactPayload({
          description: form.description,
          members: selectedMembers.map((member) => member.id),
        }),
      });
      setForm({ name: "", description: "" });
      setSelectedMembers([]);
      setOpen(false);
    } catch {
      return;
    }
  };

  const addMember = (user: User) => {
    setSelectedMembers((current) =>
      current.some((member) => member.id === user.id) ? current : [...current, user],
    );
  };

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Teams</h2>
          <p className="mt-1 text-sm text-slate-500">Create working groups, manage members, and prepare hackathon squads.</p>
        </div>
        <button className="btn-primary" type="button" disabled={disabled} onClick={() => setOpen((value) => !value)}>
          <Plus size={16} />
          Create
        </button>
      </div>

      {open && (
        <form className="mt-5 space-y-3 border-t border-slate-100 pt-5" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="field"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Team name"
              required
            />
            <input
              className="field"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Description"
            />
          </div>

          <div className="rounded-md border border-slate-100 p-3">
            <div className="flex gap-2">
              <input
                className="field"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Add members"
              />
              <button className="btn-secondary" type="button" disabled={search.isPending} onClick={submitSearch}>
                {search.isPending ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedMembers.map((member) => (
                <button
                  className="chip"
                  key={member.id}
                  type="button"
                  onClick={() =>
                    setSelectedMembers((current) => current.filter((item) => item.id !== member.id))
                  }
                >
                  {userName(member)}
                  <X size={13} />
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(search.data?.users || []).slice(0, 6).map((foundUser) => (
                <button
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3 text-left hover:border-emerald-200 hover:bg-emerald-50"
                  key={foundUser.id}
                  type="button"
                  onClick={() => addMember(foundUser)}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar user={foundUser} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">{userName(foundUser)}</span>
                      <span className="block truncate text-xs text-slate-500">{userHeadline(foundUser)}</span>
                    </span>
                  </span>
                  <Plus size={15} />
                </button>
              ))}
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={createTeam.isPending}>
            {createTeam.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Create team
          </button>
        </form>
      )}
    </div>
  );
}

function TeamCard({ team }: { team: Team }) {
  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-950">
            <Link className="hover:text-emerald-700" to={`/teams/${team.id}`}>
              {team.name}
            </Link>
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
            {team.description || "No description yet."}
          </p>
        </div>
        <span className="chip shrink-0">{titleCase(team.status || "ACTIVE")}</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <div className="rounded-md border border-slate-100 p-3">
          <div className="font-semibold text-slate-900">{teamMemberCount(team)}</div>
          <div className="mt-1 text-slate-500">Members</div>
        </div>
        <div className="rounded-md border border-slate-100 p-3">
          <div className="font-semibold text-slate-900">{formatCount(team.reputationScore)}</div>
          <div className="mt-1 text-slate-500">Reputation</div>
        </div>
        <div className="rounded-md border border-slate-100 p-3">
          <div className="font-semibold text-slate-900">{formatCount(team.completedProjectsCount)}</div>
          <div className="mt-1 text-slate-500">Completed</div>
        </div>
      </div>

      <div className="mt-4 flex -space-x-2">
        {(team.members || []).slice(0, 6).map((member) => (
          <div className="rounded-full border-2 border-white" key={member.id || member.userId}>
            <Avatar user={member.user} size="sm" />
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
        <Link className="btn-secondary px-3 py-1.5" to={`/teams/${team.id}`}>
          Open
        </Link>
      </div>
    </article>
  );
}

function InviteMemberPanel({ team }: { team: Team }) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const search = usePlatformSearchMutation();
  const invite = useInviteTeamMemberMutation(team.id);
  const memberIds = new Set((team.members || []).map((member) => member.userId));
  const users = (search.data?.users || []).filter((user) => !memberIds.has(user.id));

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    search.mutate(query);
  };

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold text-slate-950">Invite members</h3>
      <form className="mt-4 flex gap-2" onSubmit={submitSearch}>
        <input
          className="field"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search engineers"
        />
        <button className="btn-secondary" type="submit" disabled={search.isPending}>
          {search.isPending ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
        </button>
      </form>
      <input
        className="field mt-3"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Invite message"
      />
      <div className="mt-4 space-y-2">
        {users.slice(0, 5).map((foundUser) => (
          <div className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3" key={foundUser.id}>
            <div className="flex min-w-0 items-center gap-3">
              <Avatar user={foundUser} size="sm" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{userName(foundUser)}</div>
                <div className="truncate text-xs text-slate-500">{userHeadline(foundUser) || `@${foundUser.username}`}</div>
              </div>
            </div>
            <button
              className="btn-secondary px-3 py-1.5"
              type="button"
              disabled={invite.isPending}
              onClick={() => invite.mutate({ userId: foundUser.id, message })}
            >
              <UserPlus size={15} />
              Invite
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MembersPanel({ team, canManage, currentUserId }: { team: Team; canManage: boolean; currentUserId?: string }) {
  const removeMember = useRemoveTeamMemberMutation(team.id);

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold text-slate-950">Members</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(team.members || []).map((member) => (
          <div className="rounded-md border border-slate-100 p-3" key={member.id || member.userId}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar user={member.user} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{userName(member.user)}</div>
                  <div className="truncate text-xs text-slate-500">
                    {userHeadline(member.user) || formatDate(member.joinedAt)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TeamRoleBadge value={member.role} />
                {canManage && member.userId !== currentUserId && member.role !== "OWNER" && (
                  <button
                    className="icon-btn h-8 w-8"
                    type="button"
                    title="Remove member"
                    disabled={removeMember.isPending}
                    onClick={() => {
                      if (window.confirm(`Remove ${userName(member.user)} from ${team.name}?`)) {
                        removeMember.mutate(member.userId);
                      }
                    }}
                  >
                    <UserMinus size={15} />
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

function TeamInvitesPanel({ team, currentUserId, canManage }: { team: Team; currentUserId?: string; canManage: boolean }) {
  const withdraw = useWithdrawTeamInviteMutation(team.id);
  const review = useReviewTeamInviteMutation();
  const invites = team.invites || [];

  if (!invites.length) return null;

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold text-slate-950">Invites</h3>
      <div className="mt-4 space-y-2">
        {invites.map((invite: TeamInvite) => {
          const isRecipient = invite.invitedUserId === currentUserId;
          const isPending = invite.status === "PENDING";

          return (
            <div className="rounded-md border border-slate-100 p-3" key={invite.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {invite.invitedUser ? userName(invite.invitedUser) : `User ${invite.invitedUserId.slice(0, 8)}`}
                  </div>
                  <div className="text-xs text-slate-500">{formatDate(invite.createdAt)}</div>
                </div>
                <span className="chip">{titleCase(invite.status)}</span>
              </div>
              {invite.message && <p className="mt-2 text-sm text-slate-600">{invite.message}</p>}
              {isPending && (
                <div className="mt-3 flex gap-2">
                  {isRecipient && (
                    <>
                      <button
                        className="btn-primary px-3 py-1.5"
                        type="button"
                        disabled={review.isPending}
                        onClick={() => review.mutate({ inviteId: invite.id, status: "ACCEPTED" })}
                      >
                        <Check size={15} />
                        Accept
                      </button>
                      <button
                        className="btn-secondary px-3 py-1.5"
                        type="button"
                        disabled={review.isPending}
                        onClick={() => review.mutate({ inviteId: invite.id, status: "REJECTED" })}
                      >
                        <X size={15} />
                        Reject
                      </button>
                    </>
                  )}
                  {canManage && (
                    <button
                      className="btn-secondary px-3 py-1.5"
                      type="button"
                      disabled={withdraw.isPending}
                      onClick={() => withdraw.mutate(invite.id)}
                    >
                      <X size={15} />
                      Withdraw
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

function TeamActions({ team, canManage, isOwner }: { team: Team; canManage: boolean; isOwner: boolean }) {
  const lifecycle = useTeamLifecycleMutation(team.id);

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold text-slate-950">Team actions</h3>
      <div className="mt-4 grid gap-2">
        {!isOwner && (
          <button
            className="btn-secondary justify-start"
            type="button"
            disabled={lifecycle.isPending}
            onClick={() => lifecycle.mutate("leave")}
          >
            <UserMinus size={16} />
            Leave team
          </button>
        )}
        {canManage && isOwner && (
          <button
            className="justify-start rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:text-slate-300"
            type="button"
            disabled={lifecycle.isPending}
            onClick={() => {
              if (window.confirm(`Delete ${team.name}? This will remove it from active team lists.`)) {
                lifecycle.mutate("delete");
              }
            }}
          >
            <Trash2 size={16} />
            Delete team
          </button>
        )}
      </div>
    </div>
  );
}

function TeamDetail({ teamId }: { teamId: string }) {
  const { user } = useAuth();
  const teamQuery = useTeamQuery(teamId);
  const team = teamQuery.data;
  const canManage = canManageTeam(team, user?.id);
  const isOwner = Boolean(team?.ownerId === user?.id || currentMembership(team, user?.id)?.role === "OWNER");

  if (teamQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="animate-spin" size={16} />
        Loading team
      </div>
    );
  }

  if (!team) {
    return <EmptyState icon={Users} title="Team not found" text="This team is unavailable." />;
  }

  return (
    <section className="space-y-5">
      <Link className="text-sm font-semibold text-emerald-700 hover:text-emerald-900" to="/teams">
        Back to teams
      </Link>

      <div className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-950">{team.name}</h2>
              <span className="chip">{titleCase(team.status || "ACTIVE")}</span>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
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
          <MembersPanel canManage={canManage} currentUserId={user?.id} team={team} />
          <TeamInvitesPanel canManage={canManage} currentUserId={user?.id} team={team} />
        </div>
        <aside className="space-y-5">
          {canManage && <InviteMemberPanel team={team} />}
          <TeamActions canManage={canManage} isOwner={isOwner} team={team} />
        </aside>
      </div>
    </section>
  );
}

export function TeamsPage() {
  const { teamId } = useParams();
  const { user } = useAuth();
  const teamsQuery = useMyTeamsQuery();
  const [query, setQuery] = useState("");
  const filteredTeams = useMemo(() => {
    const teams = teamsQuery.data || [];
    const normalized = query.trim().toLowerCase();
    return teams.filter((team) =>
      [team.name, team.description, team.status].filter(Boolean).join(" ").toLowerCase().includes(normalized),
    );
  }, [query, teamsQuery.data]);

  if (!user) {
    return <EmptyState icon={Users} title="Login required" text="Sign in to create and manage teams." />;
  }

  if (teamId) {
    return <TeamDetail teamId={teamId} />;
  }

  return (
    <section className="space-y-5">
      <CreateTeamPanel disabled={!user} />

      <div className="panel p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            className="field pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your teams"
          />
        </div>
      </div>

      {teamsQuery.isFetching && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={16} />
          Loading teams
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
