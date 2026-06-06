import { FormEvent, useMemo, useState } from "react";
import {
  Archive,
  Check,
  CheckCircle2,
  ExternalLink,
  Github,
  Loader2,
  RefreshCcw,
  Rocket,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ProjectCard } from "../components/cards/ProjectCard";
import { CreateProjectForm } from "../components/forms/CreateProjectForm";
import { Avatar, EmptyState, Metric } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import {
  useCreateProjectMutation,
  useInviteUserToProjectMutation,
  useJoinProjectMutation,
  useLeaveProjectMutation,
  usePlatformSearchMutation,
  useProjectJoinRequestsQuery,
  useProjectLifecycleMutation,
  useProjectQuery,
  useProjectsQuery,
  useReceivedProjectInvitesQuery,
  useRemoveProjectMemberMutation,
  useReviewProjectInviteMutation,
  useReviewProjectJoinRequestMutation,
  useSentProjectInvitesQuery,
  useUpdateProjectMutation,
  useWithdrawProjectJoinRequestMutation,
} from "../hooks/usePlatformQueries";
import { Project, ProjectInvite, ProjectJoinRequest, ProjectMutationPayload, User } from "../lib/api";
import { compactPayload, formatCount, formatDate, splitCsv, titleCase, userHeadline, userName } from "../lib/format";

const isMember = (project: Project, userId?: string) =>
  Boolean(userId && project.members?.some((member) => member.userId === userId));

const projectStack = (project?: Project) =>
  Array.isArray(project?.techStack) ? project.techStack.map(String) : project?.searchTags || [];

function StatusBadge({ value }: { value?: string | null }) {
  return <span className="chip">{titleCase(value) || "Unknown"}</span>;
}

function ReceivedInvitesPanel() {
  const invitesQuery = useReceivedProjectInvitesQuery();
  const reviewInvite = useReviewProjectInviteMutation();
  const pendingInvites = (invitesQuery.data || []).filter((invite) => invite.status === "PENDING");

  if (!pendingInvites.length) return null;

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">Project invites</h3>
        {invitesQuery.isFetching && <Loader2 className="animate-spin text-slate-400" size={15} />}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {pendingInvites.map((invite) => (
          <InviteCard
            invite={invite}
            key={invite.id}
            onAccept={() => reviewInvite.mutate({ inviteId: invite.id, status: "ACCEPTED" })}
            onReject={() => reviewInvite.mutate({ inviteId: invite.id, status: "REJECTED" })}
          />
        ))}
      </div>
    </div>
  );
}

function InviteCard({
  invite,
  onAccept,
  onReject,
}: {
  invite: ProjectInvite;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <article className="rounded-md border border-emerald-100 bg-emerald-50/60 p-4">
      <div className="flex items-center gap-3">
        <Avatar user={invite.invitedBy || invite.project?.owner} size="sm" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-950">
            {invite.project?.title || "Project invite"}
          </div>
          <div className="truncate text-xs text-slate-500">
            From {userName(invite.invitedBy || invite.project?.owner)}
          </div>
        </div>
      </div>
      {invite.message && <p className="mt-3 text-sm text-slate-600">{invite.message}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-primary px-3 py-1.5" type="button" onClick={onAccept}>
          <Check size={15} />
          Accept
        </button>
        <button className="btn-secondary px-3 py-1.5" type="button" onClick={onReject}>
          <X size={15} />
          Reject
        </button>
        {invite.project && (
          <Link className="btn-secondary px-3 py-1.5" to={`/projects/${invite.project.slug || invite.project.id}`}>
            Open
          </Link>
        )}
      </div>
    </article>
  );
}

function ProjectEditor({ project }: { project: Project }) {
  const updateProject = useUpdateProjectMutation(project.id);
  const [form, setForm] = useState({
    title: project.title || "",
    shortDescription: project.shortDescription || "",
    description: project.description || "",
    githubUrl: project.githubUrl || "",
    liveUrl: project.liveUrl || "",
    videoDemoUrl: project.videoDemoUrl || "",
    techStack: projectStack(project).join(", "),
    deploymentStatus: project.deploymentStatus || "DEVELOPMENT",
    visibility: (project.visibility || "PUBLIC") as "PUBLIC" | "PRIVATE",
    lookingFor: project.lookingFor || "",
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload: ProjectMutationPayload = {
      ...compactPayload({
        title: form.title,
        shortDescription: form.shortDescription,
        description: form.description,
        githubUrl: form.githubUrl,
        liveUrl: form.liveUrl,
        videoDemoUrl: form.videoDemoUrl,
        deploymentStatus: form.deploymentStatus,
        visibility: form.visibility,
        lookingFor: form.lookingFor,
      }),
      techStack: splitCsv(form.techStack),
    };

    updateProject.mutate(payload);
  };

  return (
    <form className="panel p-5" onSubmit={submit}>
      <h3 className="text-sm font-semibold text-slate-950">Project settings</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          className="field"
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder="Title"
          required
        />
        <input
          className="field"
          value={form.shortDescription}
          onChange={(event) =>
            setForm((current) => ({ ...current, shortDescription: event.target.value }))
          }
          placeholder="Short description"
        />
      </div>
      <textarea
        className="field mt-3 min-h-24"
        value={form.description}
        onChange={(event) =>
          setForm((current) => ({ ...current, description: event.target.value }))
        }
        placeholder="Description"
        required
      />
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <input
          className="field"
          value={form.githubUrl}
          onChange={(event) => setForm((current) => ({ ...current, githubUrl: event.target.value }))}
          placeholder="GitHub URL"
        />
        <input
          className="field"
          value={form.liveUrl}
          onChange={(event) => setForm((current) => ({ ...current, liveUrl: event.target.value }))}
          placeholder="Live URL"
        />
        <input
          className="field"
          value={form.videoDemoUrl}
          onChange={(event) =>
            setForm((current) => ({ ...current, videoDemoUrl: event.target.value }))
          }
          placeholder="Video URL"
        />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_12rem_12rem_auto]">
        <input
          className="field"
          value={form.techStack}
          onChange={(event) => setForm((current) => ({ ...current, techStack: event.target.value }))}
          placeholder="Tech stack"
        />
        <select
          className="field"
          value={form.visibility}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              visibility: event.target.value as "PUBLIC" | "PRIVATE",
            }))
          }
        >
          <option value="PUBLIC">Public</option>
          <option value="PRIVATE">Private</option>
        </select>
        <select
          className="field"
          value={form.deploymentStatus}
          onChange={(event) =>
            setForm((current) => ({ ...current, deploymentStatus: event.target.value }))
          }
        >
          <option value="DEVELOPMENT">Development</option>
          <option value="LIVE">Live</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button className="btn-primary" type="submit" disabled={updateProject.isPending}>
          {updateProject.isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
          Save
        </button>
      </div>
      <input
        className="field mt-3"
        value={form.lookingFor}
        onChange={(event) => setForm((current) => ({ ...current, lookingFor: event.target.value }))}
        placeholder="Looking for"
      />
    </form>
  );
}

function ProjectOwnerActions({ project }: { project: Project }) {
  const lifecycle = useProjectLifecycleMutation(project.id);
  const canRestore = project.status === "ARCHIVED";

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold text-slate-950">Owner actions</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          className="btn-secondary justify-start"
          type="button"
          disabled={lifecycle.isPending || project.status === "COMPLETED"}
          onClick={() => lifecycle.mutate("complete")}
        >
          <CheckCircle2 size={16} />
          Complete
        </button>
        <button
          className="btn-secondary justify-start"
          type="button"
          disabled={lifecycle.isPending}
          onClick={() => lifecycle.mutate(canRestore ? "restore" : "archive")}
        >
          <Archive size={16} />
          {canRestore ? "Restore" : "Archive"}
        </button>
        <button
          className="btn-secondary justify-start"
          type="button"
          disabled={lifecycle.isPending || !project.githubUrl}
          onClick={() => lifecycle.mutate("sync")}
        >
          <RefreshCcw size={16} />
          Sync GitHub
        </button>
        <button
          className="justify-start rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:text-slate-300"
          type="button"
          disabled={lifecycle.isPending}
          onClick={() => {
            if (window.confirm("Delete this project? This will hide it from public project lists.")) {
              lifecycle.mutate("delete");
            }
          }}
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    </div>
  );
}

function JoinRequestsPanel({ project }: { project: Project }) {
  const requestsQuery = useProjectJoinRequestsQuery(project.id);
  const review = useReviewProjectJoinRequestMutation(project.id);
  const requests = requestsQuery.data || [];

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">Join requests</h3>
        {requestsQuery.isFetching && <Loader2 className="animate-spin text-slate-400" size={15} />}
      </div>
      <div className="mt-4 space-y-3">
        {requests.length ? (
          requests.map((request) => (
            <JoinRequestRow
              key={request.id}
              request={request}
              onAccept={() => review.mutate({ requestId: request.id, status: "ACCEPTED" })}
              onReject={() => review.mutate({ requestId: request.id, status: "REJECTED" })}
            />
          ))
        ) : (
          <p className="text-sm text-slate-500">No join requests yet.</p>
        )}
      </div>
    </div>
  );
}

function JoinRequestRow({
  request,
  onAccept,
  onReject,
}: {
  request: ProjectJoinRequest;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <article className="rounded-md border border-slate-100 p-3">
      <div className="flex gap-3">
        <Avatar user={request.user} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">
                {userName(request.user)}
              </div>
              <div className="truncate text-xs text-slate-500">
                {userHeadline(request.user) || formatDate(request.createdAt)}
              </div>
            </div>
            <StatusBadge value={request.status} />
          </div>
          {request.message && <p className="mt-2 text-sm text-slate-600">{request.message}</p>}
          {request.status === "PENDING" && (
            <div className="mt-3 flex gap-2">
              <button className="btn-primary px-3 py-1.5" type="button" onClick={onAccept}>
                <Check size={15} />
                Accept
              </button>
              <button className="btn-secondary px-3 py-1.5" type="button" onClick={onReject}>
                <X size={15} />
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function InviteUserPanel({ project }: { project: Project }) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const search = usePlatformSearchMutation();
  const invite = useInviteUserToProjectMutation(project.id);
  const users = search.data?.users || [];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    search.mutate(query);
  };

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold text-slate-950">Invite collaborator</h3>
      <form className="mt-4 flex gap-2" onSubmit={submit}>
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
        {users.slice(0, 5).map((foundUser: User) => (
          <div
            className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3"
            key={foundUser.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar user={foundUser} size="sm" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {userName(foundUser)}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {userHeadline(foundUser) || `@${foundUser.username}`}
                </div>
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

function SentInvitesPanel({ project }: { project: Project }) {
  const invitesQuery = useSentProjectInvitesQuery(project.id);
  const invites = invitesQuery.data || [];

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold text-slate-950">Sent invites</h3>
      <div className="mt-4 space-y-2">
        {invites.length ? (
          invites.map((invite) => (
            <div
              className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3"
              key={invite.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar user={invite.invitedUser} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {userName(invite.invitedUser)}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {formatDate(invite.createdAt)}
                  </div>
                </div>
              </div>
              <StatusBadge value={invite.status} />
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No invites sent yet.</p>
        )}
      </div>
    </div>
  );
}

function ProjectJoinPanel({ project }: { project: Project }) {
  const { user } = useAuth();
  const joinProject = useJoinProjectMutation();
  const withdrawRequest = useWithdrawProjectJoinRequestMutation(project.id);
  const [message, setMessage] = useState("");
  const [pendingRequest, setPendingRequest] = useState<ProjectJoinRequest | null>(() =>
    (project.joinRequests || []).find(
      (request) => request.userId === user?.id && request.status === "PENDING",
    ) || null,
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await joinProject.mutateAsync({ project, message });
    setPendingRequest(result.data);
    setMessage("");
  };

  const withdraw = async () => {
    if (!pendingRequest) return;
    await withdrawRequest.mutateAsync(pendingRequest.id);
    setPendingRequest(null);
  };

  if (!user) {
    return (
      <div className="panel p-5">
        <h3 className="text-sm font-semibold text-slate-950">Join project</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Sign in to request access and collaborate with this team.
        </p>
        <Link className="btn-primary mt-4" to="/auth">
          Login
        </Link>
      </div>
    );
  }

  if (pendingRequest) {
    return (
      <div className="panel border-emerald-100 bg-emerald-50/40 p-5">
        <h3 className="text-sm font-semibold text-slate-950">Join request pending</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          The owner can review your request from their project workspace.
        </p>
        {pendingRequest.message && (
          <p className="mt-3 rounded-md border border-emerald-100 bg-white p-3 text-sm text-slate-600">
            {pendingRequest.message}
          </p>
        )}
        <button
          className="btn-secondary mt-4"
          type="button"
          disabled={withdrawRequest.isPending}
          onClick={withdraw}
        >
          {withdrawRequest.isPending ? <Loader2 className="animate-spin" size={16} /> : <X size={16} />}
          Withdraw request
        </button>
      </div>
    );
  }

  return (
    <form className="panel p-5" onSubmit={submit}>
      <h3 className="text-sm font-semibold text-slate-950">Request to join</h3>
      <textarea
        className="field mt-4 min-h-24"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Tell the owner how you can help"
      />
      <button className="btn-primary mt-3" type="submit" disabled={joinProject.isPending}>
        {joinProject.isPending ? <Loader2 className="animate-spin" size={16} /> : <Users size={16} />}
        Send request
      </button>
    </form>
  );
}

function MembersPanel({
  project,
  isOwner,
  currentUserId,
}: {
  project: Project;
  isOwner: boolean;
  currentUserId?: string;
}) {
  const removeMember = useRemoveProjectMemberMutation(project.id);

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold text-slate-950">Members</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(project.members || []).slice(0, 12).map((member) => (
          <div className="rounded-md border border-slate-100 p-3" key={member.id || member.userId}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar user={member.user} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {userName(member.user)}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {titleCase(member.role)} {member.joinedAt ? `- ${formatDate(member.joinedAt)}` : ""}
                  </div>
                </div>
              </div>
              {isOwner && member.userId !== currentUserId && (
                <button
                  className="icon-btn h-8 w-8"
                  type="button"
                  title="Remove member"
                  disabled={removeMember.isPending}
                  onClick={() => {
                    if (window.confirm(`Remove ${userName(member.user)} from this project?`)) {
                      removeMember.mutate(member.userId);
                    }
                  }}
                >
                  <UserMinus size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectDetail({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const projectQuery = useProjectQuery(projectId);
  const leaveProject = useLeaveProjectMutation(projectQuery.data?.id);
  const project = projectQuery.data;

  const techStack = projectStack(project);
  const owner = Boolean(project && user && (project.ownerId === user.id || project.owner?.id === user.id));
  const member = Boolean(project && isMember(project, user?.id));
  const canRequestJoin = Boolean(project && !owner && !member);
  const languageEntries = useMemo(() => {
    if (!project?.languages || Array.isArray(project.languages)) return [];
    return Object.entries(project.languages).slice(0, 5);
  }, [project?.languages]);

  if (projectQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="animate-spin" size={16} />
        Loading project
      </div>
    );
  }

  if (!project) {
    return <EmptyState icon={Rocket} title="Project not found" text="This project is unavailable." />;
  }

  return (
    <section className="space-y-5">
      <Link className="text-sm font-semibold text-emerald-700 hover:text-emerald-900" to="/projects">
        Back to projects
      </Link>

      <div className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-950">{project.title}</h2>
              {project.verified && (
                <span className="chip text-emerald-700">
                  <Check size={13} />
                  Verified
                </span>
              )}
              {project.trustLevel && <StatusBadge value={project.trustLevel} />}
              <StatusBadge value={project.status || "OPEN"} />
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              {project.shortDescription || project.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {project.githubUrl && (
              <a className="btn-secondary" href={project.githubUrl} rel="noreferrer" target="_blank">
                <Github size={16} />
                GitHub
              </a>
            )}
            {project.liveUrl && (
              <a className="btn-secondary" href={project.liveUrl} rel="noreferrer" target="_blank">
                <ExternalLink size={16} />
                Live
              </a>
            )}
            {member && !owner && (
              <button
                className="btn-secondary"
                type="button"
                disabled={leaveProject.isPending}
                onClick={() => leaveProject.mutate()}
              >
                <UserMinus size={16} />
                Leave
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Engineering" value={Math.round(project.engineeringScore || 0)} />
          <Metric label="Stars" value={formatCount(project.starsCount)} />
          <Metric label="Forks" value={formatCount(project.forksCount)} />
          <Metric label="Commits" value={formatCount(project.commitCount)} />
          <Metric label="Issues" value={formatCount(project.openIssuesCount)} />
          <Metric label="Members" value={project._count?.members || project.members?.length || 0} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_23rem]">
        <div className="space-y-5">
          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-slate-950">Public project details</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Metric label="Pull requests" value={formatCount(project.pullRequestsCount)} />
              <Metric label="Contributors" value={formatCount(project.contributorsCount)} />
              <Metric label="Primary language" value={project.primaryLanguage || "Unlisted"} />
              <Metric label="Deployment" value={titleCase(project.deploymentStatus) || "Unknown"} />
              <Metric label="Visibility" value={titleCase(project.visibility)} />
              <Metric label="Last sync" value={project.lastGithubSyncAt ? formatDate(project.lastGithubSyncAt) : "Never"} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {techStack.length ? (
                techStack.map((tech) => (
                  <span className="chip" key={tech}>
                    {tech}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">No stack listed yet.</span>
              )}
            </div>
            {languageEntries.length > 0 && (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {languageEntries.map(([language, value]) => (
                  <div className="rounded-md border border-slate-100 p-3" key={language}>
                    <div className="truncate text-sm font-semibold text-slate-900">{language}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatCount(Number(value))}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <MembersPanel currentUserId={user?.id} isOwner={owner} project={project} />

          {owner && <ProjectEditor project={project} />}
          {owner && <JoinRequestsPanel project={project} />}
        </div>

        <aside className="space-y-5">
          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-slate-950">Owner</h3>
            <div className="mt-4 flex items-center gap-3">
              <Avatar user={project.owner} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-950">
                  {userName(project.owner)}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {userHeadline(project.owner) || project.owner?.username}
                </div>
              </div>
            </div>
          </div>

          {owner && <ProjectOwnerActions project={project} />}
          {canRequestJoin && <ProjectJoinPanel project={project} />}
          {owner && <InviteUserPanel project={project} />}
          {owner && <SentInvitesPanel project={project} />}

          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-slate-950">Open roles</h3>
            <div className="mt-4 space-y-3">
              {(project.requiredRoles || []).length ? (
                (project.requiredRoles || []).map((role) => (
                  <div className="rounded-md border border-slate-100 p-3 text-sm text-slate-700" key={role.id}>
                    <div className="font-semibold text-slate-900">{role.title}</div>
                    {role.description && <p className="mt-1 text-xs text-slate-500">{role.description}</p>}
                    <div className="mt-2 text-xs text-slate-500">
                      {role.filledSlots || 0}/{role.slots || 1} filled
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-sm text-slate-500">No open roles listed.</span>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function ProjectsPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const projectsQuery = useProjectsQuery(24);
  const createProject = useCreateProjectMutation();
  const joinProject = useJoinProjectMutation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const projects = projectsQuery.data || [];
  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return projects.filter((project) => {
      const haystack = [
        project.title,
        project.shortDescription,
        project.description,
        project.owner?.username,
        project.primaryLanguage,
        ...projectStack(project),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalized || haystack.includes(normalized);
      const matchesStatus = status === "ALL" || project.status === status;

      return matchesQuery && matchesStatus;
    });
  }, [projects, query, status]);
  const visibleStatuses = useMemo(
    () =>
      Array.from(
        new Set(projects.map((project) => project.status || "OPEN").filter(Boolean)),
      ),
    [projects],
  );

  if (projectId) {
    return <ProjectDetail projectId={projectId} />;
  }

  return (
    <section className="space-y-5">
      <ReceivedInvitesPanel />
      <CreateProjectForm
        onCreate={async (payload) => {
          try {
            await createProject.mutateAsync(payload);
            return true;
          } catch {
            return false;
          }
        }}
        disabled={!user || createProject.isPending}
      />
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Project workspace</h2>
            <p className="mt-1 text-sm text-slate-500">
              Browse public builds, open detail views, request access, and manage owned projects.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-right">
            <Metric label="Listed" value={formatCount(projects.length)} />
            <Metric label="Visible" value={formatCount(filteredProjects.length)} />
            <Metric
              label="Open"
              value={formatCount(
                projects.filter((project) => (project.status || "OPEN") !== "DELETED").length,
              )}
            />
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_12rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="field pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects, stack, owner, language"
            />
          </div>
          <select
            className="field"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">All status</option>
            {visibleStatuses.map((item) => (
              <option key={item} value={item}>
                {titleCase(item)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {projectsQuery.isFetching && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={16} />
          Loading projects
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        {filteredProjects.length ? (
          filteredProjects.map((project) => (
            <ProjectCard
              currentUserId={user?.id}
              key={project.id}
              project={project}
              onJoin={(item) => joinProject.mutate(item)}
            />
          ))
        ) : (
          <EmptyState
            icon={Rocket}
            title={projects.length ? "No matching projects" : "No public projects yet"}
            text={projects.length ? "Try another search or status." : "Create the first project once your backend has data."}
          />
        )}
      </div>
    </section>
  );
}
