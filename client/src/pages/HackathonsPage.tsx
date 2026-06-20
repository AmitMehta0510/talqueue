import { FormEvent, useMemo, useState } from "react";
import {
  Archive,
  CalendarDays,
  Check,
  ExternalLink,
  Gavel,
  Loader2,
  Medal,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { HackathonCard } from "../components/cards/HackathonCard";
import { Avatar, EmptyState, Metric } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { useFileUpload } from "../hooks/useFileUpload";
import {
  useAssignHackathonJudgeMutation,
  useCreateHackathonMutation,
  useCreateTeamMutation,
  useDeclareHackathonWinnersMutation,
  useEvaluateHackathonSubmissionMutation,
  useHackathonLeaderboardQuery,
  useHackathonLifecycleMutation,
  useHackathonQuery,
  useHackathonsQuery,
  useMyTeamsQuery,
  usePlatformSearchMutation,
  useProjectsQuery,
  useRegisterHackathonTeamMutation,
  useReviewHackathonRegistrationMutation,
  useSubmitHackathonProjectMutation,
} from "../hooks/usePlatformQueries";
import {
  Hackathon,
  HackathonEvaluationPayload,
  HackathonMutationPayload,
  HackathonRegistration,
  HackathonSubmission,
  Project,
  Team,
  User,
} from "../lib/api";
import {
  compactPayload,
  formatCount,
  formatDate,
  STATUS_CHIP_CLASSES,
  titleCase,
  userHeadline,
  userName,
} from "../lib/format";

const statusFilters = ["ALL", "OPEN", "LIVE", "COMPLETED", "DRAFT"] as const;

const dateTimeValue = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

const hackathonMetric = (
  hackathon: Hackathon,
  key: "registrations" | "submissions" | "judges" | "winners",
) => {
  if (hackathon._count?.[key]) return hackathon._count[key] || 0;
  if (key === "registrations") return hackathon.registrationCount || 0;
  if (key === "submissions") return hackathon.submissionCount || 0;
  if (key === "judges") return hackathon.judgeCount || 0;
  return hackathon.winnerCount || 0;
};

const isOwner = (hackathon?: Hackathon, userId?: string) =>
  Boolean(userId && hackathon && hackathon.createdById === userId);

const isJudge = (hackathon?: Hackathon, userId?: string) =>
  Boolean(userId && hackathon?.judges?.some((judge) => judge.userId === userId));

const userTeamIds = (teams: Team[]) => new Set(teams.map((team) => team.id));

const registrationTeamId = (registration: HackathonRegistration) => registration.team?.id || "";

const jsonItems = (value: unknown) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([key, item]) =>
      Array.isArray(item) ? `${titleCase(key)}: ${item.join(", ")}` : `${titleCase(key)}: ${String(item)}`,
    );
  }

  return [];
};


function StatusBadge({ value }: { value?: string | null }) {
  const cls = STATUS_CHIP_CLASSES[(value || "").toUpperCase()] ?? "bg-slate-50 text-slate-500 border border-slate-200";
  return <span className={`chip ${cls}`}>{titleCase(value) || "Unknown"}</span>;
}

const inferSourcePlatform = (url?: string): string | undefined => {
  if (!url) return undefined;
  try {
    const domain = new URL(url.includes("://") ? url : `https://${url}`).hostname.toLowerCase();
    if (domain.includes("devpost.com")) return "Devpost";
    if (domain.includes("devfolio.co")) return "Devfolio";
    if (domain.includes("hackerearth.com")) return "HackerEarth";
    if (domain.includes("mlh.io")) return "MLH";
    if (domain.includes("unstop.com")) return "Unstop";

    const parts = domain.replace("www.", "").split(".");
    if (parts[0]) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return "External";
  } catch {
    return "External";
  }
};

function CreateHackathonPanel({ disabled }: { disabled?: boolean }) {
  const createHackathon = useCreateHackathonMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    bannerUrl: "",
    startDate: dateTimeValue(10),
    endDate: dateTimeValue(12),
    registrationDeadline: dateTimeValue(8),
    minTeamSize: 1,
    maxTeamSize: 4,
    isExternal: false,
    externalUrl: "",
    organizerName: "",
    organizerWebsite: "",
    mode: "ONLINE" as "ONLINE" | "OFFLINE" | "HYBRID",
    location: "",
    tags: "",
  });

  const { upload: uploadBanner, uploading: uploadingBanner } = useFileUpload();

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadBanner(file, "avatar");
      setForm((current) => ({ ...current, bannerUrl: res.fileUrl }));
    } catch {}
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      const payload: HackathonMutationPayload = {
        title: form.title,
        description: form.description,
        startDate: form.startDate,
        endDate: form.endDate,
        registrationDeadline: form.registrationDeadline,
        minTeamSize: form.isExternal ? 1 : Number(form.minTeamSize),
        maxTeamSize: form.isExternal ? 1 : Number(form.maxTeamSize),
        isExternal: form.isExternal,
        ...compactPayload({
          bannerUrl: form.bannerUrl || undefined,
          externalUrl: form.isExternal ? (form.externalUrl.includes("://") ? form.externalUrl : `https://${form.externalUrl}`) : undefined,
          organizerName: form.organizerName || undefined,
          organizerWebsite: form.organizerWebsite || undefined,
          mode: form.mode || undefined,
          location: (form.mode !== "ONLINE" && form.location) ? form.location : undefined,
        }),
      };

      if (form.isExternal) {
        payload.sourcePlatform = inferSourcePlatform(form.externalUrl);
      }

      if (form.tags) {
        payload.tags = form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }

      await createHackathon.mutateAsync(payload);

      setForm({
        title: "",
        description: "",
        bannerUrl: "",
        startDate: dateTimeValue(10),
        endDate: dateTimeValue(12),
        registrationDeadline: dateTimeValue(8),
        minTeamSize: 1,
        maxTeamSize: 4,
        isExternal: false,
        externalUrl: "",
        organizerName: "",
        organizerWebsite: "",
        mode: "ONLINE",
        location: "",
        tags: "",
      });
      setOpen(false);
    } catch {
      return;
    }
  };

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Hackathons</h2>
          <p className="mt-1 text-sm text-slate-500">Build, review, and ship with engineering-grade judging.</p>
        </div>
        <button
          className="btn-primary"
          type="button"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
        >
          <Plus size={16} />
          Create
        </button>
      </div>

      {open && (
        <form className="mt-5 space-y-3 border-t border-slate-100 pt-5" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
            <input
              className="field"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Hackathon title"
              required
            />
            {!form.isExternal && (
              <div className="flex gap-2">
                <input
                  className="field w-1/2"
                  min={1}
                  type="number"
                  value={form.minTeamSize}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, minTeamSize: Number(event.target.value) }))
                  }
                  placeholder="Min size"
                  required
                />
                <input
                  className="field w-1/2"
                  min={1}
                  type="number"
                  value={form.maxTeamSize}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, maxTeamSize: Number(event.target.value) }))
                  }
                  placeholder="Max size"
                  required
                />
              </div>
            )}
          </div>
          <textarea
            className="field min-h-28"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Description"
            required
          />
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Hackathon Banner Image</label>
            <div className="flex items-center gap-4">
              {form.bannerUrl ? (
                <img src={form.bannerUrl} alt="Banner" className="h-16 w-32 rounded-lg object-cover bg-white border border-slate-200" />
              ) : (
                <div className="flex h-16 w-32 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-400 text-xs font-medium">
                  No Banner Image
                </div>
              )}
              <label className="relative cursor-pointer rounded-lg bg-white border border-slate-300 hover:border-slate-400 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition select-none flex-1 text-center">
                {uploadingBanner ? (
                  <span className="flex items-center justify-center gap-1.5"><Loader2 size={13} className="animate-spin text-blue-600" /> Uploading...</span>
                ) : (
                  "Choose Banner File"
                )}
                <input type="file" accept="image/*" onChange={handleBannerChange} disabled={uploadingBanner || createHackathon.isPending} className="hidden" />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 py-1">
            <input
              id="isExternal"
              type="checkbox"
              checked={form.isExternal}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isExternal: event.target.checked,
                }))
              }
            />
            <label htmlFor="isExternal" className="text-sm font-semibold text-slate-700 select-none cursor-pointer">
              This is an external hackathon (hosted on another site)
            </label>
          </div>

          {form.isExternal && (
            <div className="grid gap-3 md:grid-cols-2 border border-slate-100 rounded-md p-4 bg-slate-50/50">
              <label className="text-xs font-semibold text-slate-500">
                External Registration URL *
                <input
                  className="field mt-1"
                  value={form.externalUrl}
                  onChange={(event) => setForm((current) => ({ ...current, externalUrl: event.target.value }))}
                  placeholder="e.g. https://devpost.com/hackathons/my-hack"
                  required={form.isExternal}
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                Organizer Name
                <input
                  className="field mt-1"
                  value={form.organizerName}
                  onChange={(event) => setForm((current) => ({ ...current, organizerName: event.target.value }))}
                  placeholder="e.g. MLH, Google, Devpost"
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                Organizer Website
                <input
                  className="field mt-1"
                  value={form.organizerWebsite}
                  onChange={(event) => setForm((current) => ({ ...current, organizerWebsite: event.target.value }))}
                  placeholder="e.g. https://google.com"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-slate-500">
                  Mode
                  <select
                    className="field mt-1"
                    value={form.mode}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        mode: event.target.value as "ONLINE" | "OFFLINE" | "HYBRID",
                      }))
                    }
                  >
                    <option value="ONLINE">Online</option>
                    <option value="OFFLINE">Offline</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </label>
                {form.mode !== "ONLINE" ? (
                  <label className="text-xs font-semibold text-slate-500">
                    Location
                    <input
                      className="field mt-1"
                      value={form.location}
                      onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                      placeholder="e.g. San Francisco, CA"
                      required={true}
                    />
                  </label>
                ) : (
                  <div />
                )}
              </div>
            </div>
          )}

          <label className="text-xs font-semibold text-slate-500 block">
            Tags (comma-separated)
            <input
              className="field mt-1"
              value={form.tags}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              placeholder="e.g. AI, React, Rust, Web3"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs font-semibold text-slate-500">
              Registration deadline
              <input
                className="field mt-1"
                type="datetime-local"
                value={form.registrationDeadline}
                onChange={(event) =>
                  setForm((current) => ({ ...current, registrationDeadline: event.target.value }))
                }
                required
              />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Start
              <input
                className="field mt-1"
                type="datetime-local"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startDate: event.target.value }))
                }
                required
              />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              End
              <input
                className="field mt-1"
                type="datetime-local"
                value={form.endDate}
                onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                required
              />
            </label>
          </div>
          <button className="btn-primary" type="submit" disabled={createHackathon.isPending || uploadingBanner}>
            {createHackathon.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Publish
          </button>
        </form>
      )}
    </div>
  );
}

function TeamCreateForm() {
  const createTeam = useCreateTeamMutation();
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await createTeam.mutateAsync({
        name: teamName,
        ...compactPayload({ description }),
      });
      setTeamName("");
      setDescription("");
    } catch {
      return;
    }
  };

  return (
    <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={submit}>
      <input
        className="field"
        value={teamName}
        onChange={(event) => setTeamName(event.target.value)}
        placeholder="Team name"
        required
      />
      <input
        className="field"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Description"
      />
      <button className="btn-secondary" type="submit" disabled={createTeam.isPending}>
        {createTeam.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
        Team
      </button>
    </form>
  );
}

function RegistrationPanel({ hackathon }: { hackathon: Hackathon }) {
  const teamsQuery = useMyTeamsQuery();
  const register = useRegisterHackathonTeamMutation(hackathon.id);
  const teams = teamsQuery.data || [];
  const teamIds = userTeamIds(teams);
  const registeredTeamIds = new Set(
    (hackathon.registrations || []).map(registrationTeamId).filter(Boolean),
  );
  const availableTeams = teams.filter((team) => !registeredTeamIds.has(team.id));
  const [teamId, setTeamId] = useState("");
  const deadlineClosed = Boolean(
    hackathon.registrationDeadline && new Date(hackathon.registrationDeadline) < new Date(),
  );
  const currentRegistrations = (hackathon.registrations || []).filter((registration) =>
    teamIds.has(registrationTeamId(registration)),
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    register.mutate(teamId);
  };

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">Team registration</h3>
        {teamsQuery.isFetching && <Loader2 className="animate-spin text-slate-400" size={15} />}
      </div>

      {currentRegistrations.length > 0 && (
        <div className="mt-4 space-y-2">
          {currentRegistrations.map((registration) => (
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3" key={registration.id}>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {registration.team?.name || "Registered team"}
                </div>
                <div className="text-xs text-slate-500">{formatDate(registration.createdAt)}</div>
              </div>
              <StatusBadge value={registration.status} />
            </div>
          ))}
        </div>
      )}

      <form className="mt-4 flex gap-2" onSubmit={submit}>
        <select
          className="field"
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
          disabled={deadlineClosed || !availableTeams.length}
          required
        >
          <option value="">Select team</option>
          {availableTeams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <button className="btn-primary" type="submit" disabled={register.isPending || !teamId || deadlineClosed}>
          {register.isPending ? <Loader2 className="animate-spin" size={16} /> : <Users size={16} />}
          Register
        </button>
      </form>

      {!teams.length && <TeamCreateForm />}
    </div>
  );
}

function SubmissionPanel({ hackathon }: { hackathon: Hackathon }) {
  const { user } = useAuth();
  const teamsQuery = useMyTeamsQuery();
  const projectsQuery = useProjectsQuery(50);
  const submitProject = useSubmitHackathonProjectMutation(hackathon.id);
  const teams = teamsQuery.data || [];
  const teamIds = userTeamIds(teams);
  const approvedRegistrations = (hackathon.registrations || []).filter(
    (registration) =>
      registration.status === "APPROVED" && teamIds.has(registrationTeamId(registration)),
  );
  const ownedProjects = (projectsQuery.data || []).filter(
    (project) => project.ownerId === user?.id || project.owner?.id === user?.id,
  );
  const [form, setForm] = useState({
    teamId: approvedRegistrations[0]?.team?.id || "",
    projectId: "",
    demoUrl: "",
    presentationUrl: "",
    description: "",
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    submitProject.mutate({
      teamId: form.teamId,
      projectId: form.projectId,
      ...compactPayload({
        demoUrl: form.demoUrl,
        presentationUrl: form.presentationUrl,
        description: form.description,
      }),
    });
  };

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">Submit project</h3>
        {(teamsQuery.isFetching || projectsQuery.isFetching) && (
          <Loader2 className="animate-spin text-slate-400" size={15} />
        )}
      </div>

      <form className="mt-4 space-y-3" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className="field"
            value={form.teamId}
            onChange={(event) => setForm((current) => ({ ...current, teamId: event.target.value }))}
            required
          >
            <option value="">Approved team</option>
            {approvedRegistrations.map((registration) => (
              <option key={registration.id} value={registration.team?.id}>
                {registration.team?.name}
              </option>
            ))}
          </select>
          <select
            className="field"
            value={form.projectId}
            onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}
            required
          >
            <option value="">Project</option>
            {ownedProjects.map((project: Project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="field"
            value={form.demoUrl}
            onChange={(event) => setForm((current) => ({ ...current, demoUrl: event.target.value }))}
            placeholder="Demo URL"
          />
          <input
            className="field"
            value={form.presentationUrl}
            onChange={(event) =>
              setForm((current) => ({ ...current, presentationUrl: event.target.value }))
            }
            placeholder="Presentation URL"
          />
        </div>
        <textarea
          className="field min-h-24"
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="Submission notes"
        />
        <button
          className="btn-primary"
          type="submit"
          disabled={submitProject.isPending || !form.teamId || !form.projectId}
        >
          {submitProject.isPending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          Submit
        </button>
      </form>
    </div>
  );
}

function RegistrationsPanel({ hackathon }: { hackathon: Hackathon }) {
  const review = useReviewHackathonRegistrationMutation(hackathon.id);
  const registrations = hackathon.registrations || [];

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold text-slate-950">Registrations</h3>
      <div className="mt-4 space-y-3">
        {registrations.length ? (
          registrations.map((registration) => (
            <div className="rounded-md border border-slate-100 p-3" key={registration.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {registration.team?.name || "Team"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatCount(registration.team?.reputationScore)} rep - {formatDate(registration.createdAt)}
                  </div>
                </div>
                <StatusBadge value={registration.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {registration.team?.members?.slice(0, 5).map((member) => (
                  <span className="chip" key={member.user?.id || member.userId}>
                    {userName(member.user)}
                  </span>
                ))}
              </div>
              {registration.status === "PENDING" && (
                <div className="mt-3 flex gap-2">
                  <button
                    className="btn-primary px-3 py-1.5"
                    type="button"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ registrationId: registration.id, status: "APPROVED" })}
                  >
                    <Check size={15} />
                    Approve
                  </button>
                  <button
                    className="btn-secondary px-3 py-1.5"
                    type="button"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ registrationId: registration.id, status: "REJECTED" })}
                  >
                    <X size={15} />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No registrations yet.</p>
        )}
      </div>
    </div>
  );
}

function JudgeAssignmentPanel({ hackathon }: { hackathon: Hackathon }) {
  const [query, setQuery] = useState("");
  const search = usePlatformSearchMutation();
  const assignJudge = useAssignHackathonJudgeMutation(hackathon.id);
  const users = search.data?.users || [];
  const existingJudgeIds = new Set((hackathon.judges || []).map((judge) => judge.userId));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    search.mutate(query);
  };

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold text-slate-950">Judges</h3>
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
      <div className="mt-4 space-y-2">
        {users.slice(0, 5).map((foundUser: User) => (
          <div className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3" key={foundUser.id}>
            <div className="flex min-w-0 items-center gap-3">
              <Avatar user={foundUser} size="sm" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{userName(foundUser)}</div>
                <div className="truncate text-xs text-slate-500">
                  {userHeadline(foundUser) || `@${foundUser.username}`}
                </div>
              </div>
            </div>
            <button
              className="btn-secondary px-3 py-1.5"
              type="button"
              disabled={assignJudge.isPending || existingJudgeIds.has(foundUser.id)}
              onClick={() => assignJudge.mutate(foundUser.id)}
            >
              <Gavel size={15} />
              {existingJudgeIds.has(foundUser.id) ? "Judge" : "Assign"}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(hackathon.judges || []).map((judge) => (
          <span className="chip" key={judge.id}>
            {userName(judge.user)}
          </span>
        ))}
      </div>
    </div>
  );
}

function EvaluationForm({
  submission,
  hackathonId,
}: {
  submission: HackathonSubmission;
  hackathonId: string;
}) {
  const evaluate = useEvaluateHackathonSubmissionMutation(hackathonId);
  const [open, setOpen] = useState(false);
  const [scores, setScores] = useState<HackathonEvaluationPayload>({
    innovationScore: 7,
    technicalScore: 7,
    scalabilityScore: 7,
    designScore: 7,
    businessScore: 7,
    presentationScore: 7,
    feedback: "",
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    evaluate.mutate({
      submissionId: submission.id,
      payload: {
        ...scores,
        feedback: scores.feedback || undefined,
      },
    });
    setOpen(false);
  };

  const fields: Array<[keyof HackathonEvaluationPayload, string]> = [
    ["innovationScore", "Innovation"],
    ["technicalScore", "Technical"],
    ["scalabilityScore", "Scale"],
    ["designScore", "Design"],
    ["businessScore", "Business"],
    ["presentationScore", "Presentation"],
  ];

  return (
    <div className="rounded-md border border-slate-100 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            {submission.project?.title || "Submission"}
          </div>
          <div className="text-xs text-slate-500">
            {submission.team?.name || "Team"} - {formatDate(submission.submittedAt)}
          </div>
        </div>
        <button className="btn-secondary px-3 py-1.5" type="button" onClick={() => setOpen((value) => !value)}>
          <Gavel size={15} />
          Score
        </button>
      </div>

      {open && (
        <form className="mt-4 space-y-3" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(([key, label]) => (
              <label className="text-xs font-semibold text-slate-500" key={key}>
                {label}
                <input
                  className="field mt-1"
                  max={10}
                  min={0}
                  type="number"
                  value={Number(scores[key])}
                  onChange={(event) =>
                    setScores((current) => ({ ...current, [key]: Number(event.target.value) }))
                  }
                  required
                />
              </label>
            ))}
          </div>
          <textarea
            className="field min-h-20"
            value={scores.feedback}
            onChange={(event) => setScores((current) => ({ ...current, feedback: event.target.value }))}
            placeholder="Feedback"
          />
          <button className="btn-primary" type="submit" disabled={evaluate.isPending}>
            {evaluate.isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
            Save score
          </button>
        </form>
      )}
    </div>
  );
}

function JudgingPanel({ hackathon }: { hackathon: Hackathon }) {
  const submissions = hackathon.submissions || [];

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold text-slate-950">Judging queue</h3>
      <div className="mt-4 space-y-3">
        {submissions.length ? (
          submissions.map((submission) => (
            <EvaluationForm hackathonId={hackathon.id} key={submission.id} submission={submission} />
          ))
        ) : (
          <p className="text-sm text-slate-500">No submissions yet.</p>
        )}
      </div>
    </div>
  );
}

function LeaderboardPanel({ hackathon }: { hackathon: Hackathon }) {
  const leaderboardQuery = useHackathonLeaderboardQuery(hackathon.id, true);
  const leaderboard = leaderboardQuery.data?.leaderboard || [];
  const winners = hackathon.winners || [];

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">Leaderboard</h3>
        {leaderboardQuery.isFetching && <Loader2 className="animate-spin text-slate-400" size={15} />}
      </div>
      <div className="mt-4 space-y-3">
        {(leaderboard.length ? leaderboard : hackathon.submissions || []).slice(0, 8).map((submission, index) => (
          <div className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3" key={submission.id}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-sm font-bold text-emerald-800">
                {submission.rank || index + 1}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {submission.project?.title || "Submission"}
                </div>
                <div className="truncate text-xs text-slate-500">{submission.team?.name || "Team"}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-950">
                {Math.round((submission.finalScore || submission.rankingScore || 0) * 10) / 10}
              </div>
              <div className="text-xs text-slate-500">Score</div>
            </div>
          </div>
        ))}
        {!leaderboard.length && !(hackathon.submissions || []).length && (
          <p className="text-sm text-slate-500">No scored submissions yet.</p>
        )}
      </div>

      {winners.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h4 className="text-xs font-semibold uppercase text-slate-500">Winners</h4>
          <div className="mt-3 space-y-2">
            {winners.map((winner) => (
              <div className="flex items-center gap-3 rounded-md bg-emerald-50/70 p-3" key={winner.id}>
                <Medal className="text-emerald-700" size={17} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    #{winner.position} {winner.submission?.project?.title || winner.team?.name}
                  </div>
                  <div className="text-xs text-slate-500">{Math.round(winner.score * 10) / 10} score</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OwnerActions({ hackathon }: { hackathon: Hackathon }) {
  const lifecycle = useHackathonLifecycleMutation(hackathon.id);
  const declareWinners = useDeclareHackathonWinnersMutation(hackathon.id);

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold text-slate-950">Organizer actions</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          className="btn-secondary justify-start"
          type="button"
          disabled={declareWinners.isPending || hackathon.status === "COMPLETED"}
          onClick={() => declareWinners.mutate()}
        >
          <Trophy size={16} />
          Declare winners
        </button>
        <button
          className="btn-secondary justify-start"
          type="button"
          disabled={lifecycle.isPending || hackathon.status === "ARCHIVED"}
          onClick={() => lifecycle.mutate("archive")}
        >
          <Archive size={16} />
          Archive
        </button>
        <button
          className="justify-start rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:text-slate-300"
          type="button"
          disabled={lifecycle.isPending}
          onClick={() => {
            if (window.confirm("Delete this hackathon? This will hide it from public lists.")) {
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

function DetailLists({ hackathon }: { hackathon: Hackathon }) {
  const tracks = jsonItems(hackathon.tracks);
  const prizes = jsonItems(hackathon.prizes);
  const criteria = jsonItems(hackathon.judgingCriteria);

  if (!tracks.length && !prizes.length && !criteria.length) return null;

  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold text-slate-950">Program details</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {[
          ["Tracks", tracks],
          ["Prizes", prizes],
          ["Criteria", criteria],
        ].map(([title, items]) => (
          <div key={String(title)}>
            <h4 className="text-xs font-semibold uppercase text-slate-500">{String(title)}</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {(items as string[]).map((item) => (
                <span className="chip" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HackathonDetail({ hackathonId }: { hackathonId: string }) {
  const { user } = useAuth();
  const hackathonQuery = useHackathonQuery(hackathonId);
  const hackathon = hackathonQuery.data;
  const owner = isOwner(hackathon, user?.id);
  const judge = isJudge(hackathon, user?.id);
  const canParticipate = Boolean(user && hackathon && !owner && !hackathon.isExternal);

  if (hackathonQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="animate-spin" size={16} />
        Loading hackathon
      </div>
    );
  }

  if (!hackathon) {
    return <EmptyState icon={Trophy} title="Hackathon not found" text="This hackathon is unavailable." />;
  }

  return (
    <section className="space-y-5">
      <Link className="text-sm font-semibold text-emerald-700 hover:text-emerald-900" to="/hackathons">
        Back to hackathons
      </Link>

      <div className="panel overflow-hidden">
        {hackathon.bannerUrl && (
          <div className="relative h-48 w-full overflow-hidden bg-slate-950 sm:h-64 flex items-center justify-center border-b border-slate-100">
            {/* Blurred ambient background copy */}
            <div 
              className="absolute inset-0 bg-cover bg-center blur-lg scale-110 opacity-30 pointer-events-none"
              style={{ backgroundImage: `url(${hackathon.bannerUrl})` }}
            />
            {/* Foreground contained image */}
            <img 
              className="relative z-10 max-h-full max-w-full object-contain p-2" 
              src={hackathon.bannerUrl} 
              alt={hackathon.title} 
            />
          </div>
        )}
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-950">{hackathon.title}</h2>
                {hackathon.verified && hackathon.status !== "DRAFT" && (
                  <span className="chip text-emerald-700">
                    <ShieldCheck size={13} />
                    Verified
                  </span>
                )}
                {hackathon.isExternal && (
                  <span className="chip bg-blue-50 text-blue-700 border border-blue-200">
                    External
                  </span>
                )}
                <StatusBadge value={hackathon.status} />
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                {hackathon.shortDescription || hackathon.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {hackathon.externalUrl && (
                <a className="btn-secondary" href={hackathon.externalUrl} rel="noreferrer" target="_blank">
                  <ExternalLink size={16} />
                  External Website
                </a>
              )}
            </div>
          </div>

          {hackathon.isExternal ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Host Platform" value={hackathon.sourcePlatform || "External"} />
              <Metric label="Registration Deadline" value={formatDate(hackathon.registrationDeadline)} />
              <Metric
                label="Team size"
                value={(() => {
                  const min = hackathon.minTeamSize ?? 1;
                  const max = hackathon.maxTeamSize ?? 1;
                  if (min === max) {
                    return max === 1 ? "Solo" : `${max} members`;
                  }
                  return `${min} - ${max} members`;
                })()}
              />
              <Metric label="Views" value={formatCount(hackathon.viewCount)} />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <Metric label="Registrations" value={formatCount(hackathonMetric(hackathon, "registrations"))} />
              <Metric label="Submissions" value={formatCount(hackathonMetric(hackathon, "submissions"))} />
              <Metric label="Judges" value={formatCount(hackathonMetric(hackathon, "judges"))} />
              <Metric label="Winners" value={formatCount(hackathonMetric(hackathon, "winners"))} />
              <Metric
                label="Team size"
                value={(() => {
                  const min = hackathon.minTeamSize ?? 1;
                  const max = hackathon.maxTeamSize ?? 1;
                  if (min === max) {
                    return max === 1 ? "Solo" : `${max} members`;
                  }
                  return `${min} - ${max} members`;
                })()}
              />
              <Metric label="Views" value={formatCount(hackathon.viewCount)} />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_23rem]">
        <div className="space-y-5">
          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-slate-950">Schedule</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Metric label="Registration closes" value={formatDate(hackathon.registrationDeadline)} />
              <Metric label="Starts" value={formatDate(hackathon.startDate)} />
              <Metric label="Ends" value={formatDate(hackathon.endDate)} />
            </div>
          </div>

          <DetailLists hackathon={hackathon} />
          {!hackathon.isExternal && <LeaderboardPanel hackathon={hackathon} />}
          {owner && !hackathon.isExternal && <RegistrationsPanel hackathon={hackathon} />}
          {judge && !hackathon.isExternal && <JudgingPanel hackathon={hackathon} />}
        </div>

        <aside className="space-y-5">
          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-slate-950">Organizer</h3>
            <div className="mt-4 flex items-center gap-3">
              <Avatar user={hackathon.createdBy} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-955">
                  {hackathon.organizerName || userName(hackathon.createdBy)}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {hackathon.organizerType ? titleCase(hackathon.organizerType) : userHeadline(hackathon.createdBy)}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {hackathon.mode && <span className="chip">{titleCase(hackathon.mode)}</span>}
              {hackathon.location && <span className="chip">{hackathon.location}</span>}
              {hackathon.difficultyLevel && <span className="chip">{titleCase(hackathon.difficultyLevel)}</span>}
            </div>
          </div>

          {hackathon.isExternal && hackathon.externalUrl && (
            <div className="panel p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100/60">
              <h3 className="text-sm font-semibold text-slate-950">External registration</h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                This hackathon is hosted externally on <strong>{hackathon.sourcePlatform || "another site"}</strong>. 
                Register directly on their platform to participate.
              </p>
              <a
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                href={hackathon.externalUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink size={16} />
                Register on {hackathon.sourcePlatform || "External Site"}
              </a>
            </div>
          )}

          {canParticipate && <RegistrationPanel hackathon={hackathon} />}
          {canParticipate && <SubmissionPanel hackathon={hackathon} />}
          {owner && !hackathon.isExternal && <OwnerActions hackathon={hackathon} />}
          {owner && !hackathon.isExternal && <JudgeAssignmentPanel hackathon={hackathon} />}
        </aside>
      </div>
    </section>
  );
}

export function HackathonsPage() {
  const { hackathonSlug } = useParams();
  const { user } = useAuth();
  
  // Search and filter states
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof statusFilters)[number]>("ALL");
  const [externalOnly, setExternalOnly] = useState(false);

  // Pass active filters directly to the backend query
  const queryParams = useMemo(() => ({
    ...(query.trim() ? { q: query.trim() } : {}),
    ...(status !== "ALL" ? { status } : {}),
    ...(externalOnly ? { isExternal: true } : {}),
  }), [query, status, externalOnly]);

  const hackathonsQuery = useHackathonsQuery(queryParams);
  const hackathons = hackathonsQuery.data || [];

  if (hackathonSlug) {
    return <HackathonDetail hackathonId={hackathonSlug} />;
  }

  return (
    <section className="space-y-6">
      <CreateHackathonPanel disabled={!user} />

      {/* Premium Search and Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              className="field pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search hackathons by title, tags, organizer..."
            />
          </div>

          {/* Status Dropdown */}
          <select
            className="field w-auto min-w-[150px]"
            value={status}
            onChange={(event) => setStatus(event.target.value as (typeof statusFilters)[number])}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="LIVE">Live</option>
            <option value="COMPLETED">Completed</option>
            <option value="DRAFT">Draft</option>
          </select>

          {/* Toggle buttons */}
          <button
            type="button"
            onClick={() => setExternalOnly((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition ${
              externalOnly
                ? "border-blue-400 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
            }`}
          >
            External Only
          </button>

          {/* Clear button if any filter is active */}
          {(query || status !== "ALL" || externalOnly) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatus("ALL");
                setExternalOnly(false);
              }}
              className="text-xs font-semibold text-slate-400 hover:text-rose-500 transition flex items-center gap-1 ml-auto"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {hackathonsQuery.isFetching && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="animate-spin text-emerald-700" size={16} />
          Loading hackathons...
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {hackathons.length ? (
          hackathons.map((hackathon) => (
            <HackathonCard hackathon={hackathon} key={hackathon.id} />
          ))
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No hackathons found"
            text="Try adjusting your filters or search query."
          />
        )}
      </div>
    </section>
  );
}
