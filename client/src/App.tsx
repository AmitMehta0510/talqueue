import {
  Bell,
  BriefcaseBusiness,
  Check,
  Code2,
  Compass,
  Heart,
  Loader2,
  Lock,
  LogOut,
  MessageSquare,
  Plus,
  Rocket,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  FeedPost,
  Job,
  Project,
  RoleName,
  SearchResults,
  User,
  api,
} from "./lib/api";
import { authStorage } from "./lib/storage";

type SectionKey = "feed" | "discover" | "projects" | "jobs";

type Toast = {
  type: "success" | "error";
  message: string;
};

type AuthMode = "login" | "register";

const sections: Array<{
  key: SectionKey;
  label: string;
  icon: typeof Compass;
}> = [
  { key: "feed", label: "Feed", icon: Compass },
  { key: "discover", label: "Discover", icon: Search },
  { key: "projects", label: "Projects", icon: Rocket },
  { key: "jobs", label: "Jobs", icon: BriefcaseBusiness },
];

const roleOptions: RoleName[] = [
  "STUDENT",
  "PROFESSOR",
  "PROFESSIONAL",
  "RECRUITER",
];

const postTypes = [
  "GENERAL",
  "PROJECT_UPDATE",
  "EVENT",
  "HACKATHON",
  "ACHIEVEMENT",
];

const titleCase = (value?: string | null) =>
  value
    ? value
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "";

const initials = (name?: string | null) => {
  if (!name) return "EP";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const userName = (user?: User | null) =>
  user?.profile?.fullName || user?.username || "Engineer";

const userHeadline = (user?: User | null) =>
  user?.profile?.headline || user?.primaryRole || user?.roles?.[0]?.role?.name;

const formatCount = (value?: number) =>
  new Intl.NumberFormat("en", { notation: "compact" }).format(value || 0);

const formatDate = (value?: string) => {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
};

const tagValues = (tags?: FeedPost["tags"]) =>
  (tags || [])
    .map((tag) => (typeof tag === "string" ? tag : tag.tag))
    .filter(Boolean) as string[];

const extractFeedItems = (items: FeedPost[]) =>
  items.map((item) => {
    const nested = item.item;
    return {
      wrapper: item,
      item:
        nested && typeof nested === "object"
          ? ({ ...nested, itemType: item.itemType, reason: item.reason } as FeedPost)
          : item,
    };
  });

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <div className="text-lg font-semibold text-slate-950">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Avatar({ user, size = "md" }: { user?: User | null; size?: "sm" | "md" }) {
  const className =
    size === "sm"
      ? "h-8 w-8 text-xs"
      : "h-11 w-11 text-sm";

  if (user?.profile?.avatarUrl) {
    return (
      <img
        className={`${className} rounded-full object-cover`}
        src={user.profile.avatarUrl}
        alt={userName(user)}
      />
    );
  }

  return (
    <div
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800`}
    >
      {initials(userName(user))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Compass;
  title: string;
  text: string;
}) {
  return (
    <div className="panel flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
        <Icon size={22} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function AuthScreen({
  mode,
  setMode,
  onAuth,
}: {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  onAuth: (payload: { token: string; user: User }) => void;
}) {
  const [form, setForm] = useState({
    email: "",
    username: "",
    fullName: "",
    password: "",
    role: "STUDENT" as RoleName,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result =
        mode === "login"
          ? await api.login({ email: form.email, password: form.password })
          : await api.register(form);

      authStorage.setToken(result.data.token);
      onAuth(result.data);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel md:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-[#18332d] p-8 text-white sm:p-10">
          <div className="flex h-full flex-col justify-between gap-12">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-400 text-emerald-950">
                <Code2 size={24} />
              </div>
              <h1 className="mt-6 max-w-sm text-3xl font-bold leading-tight sm:text-4xl">
                Engineering Platform
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-50/80">
                Build your engineering profile, collaborate on projects, find
                communities, and keep your work visible to the right people.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-white/10 bg-white/8 p-4">
                <Sparkles size={18} />
                <div className="mt-3 font-semibold">AI-ranked feed</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/8 p-4">
                <ShieldCheck size={18} />
                <div className="mt-3 font-semibold">Trust scores</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/8 p-4">
                <Users size={18} />
                <div className="mt-3 font-semibold">Teams</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/8 p-4">
                <BriefcaseBusiness size={18} />
                <div className="mt-3 font-semibold">Jobs</div>
              </div>
            </div>
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-8 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(["login", "register"] as AuthMode[]).map((authMode) => (
              <button
                key={authMode}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${
                  mode === authMode
                    ? "bg-white text-emerald-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                type="button"
                onClick={() => {
                  setMode(authMode);
                  setMessage(null);
                }}
              >
                {authMode === "login" ? "Login" : "Create account"}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={submit}>
            {mode === "register" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Full name
                  <input
                    className="field mt-1.5"
                    value={form.fullName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        fullName: event.target.value,
                      }))
                    }
                    minLength={2}
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Username
                  <input
                    className="field mt-1.5"
                    value={form.username}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                    minLength={3}
                    required
                  />
                </label>
              </div>
            )}

            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                className="field mt-1.5"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                className="field mt-1.5"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                minLength={mode === "register" ? 8 : 1}
                required
              />
            </label>

            {mode === "register" && (
              <label className="block text-sm font-medium text-slate-700">
                Role
                <select
                  className="field mt-1.5"
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      role: event.target.value as RoleName,
                    }))
                  }
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {titleCase(role)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {message && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {message}
              </div>
            )}

            <button className="btn-primary w-full" disabled={loading} type="submit">
              {loading ? <Loader2 className="animate-spin" size={17} /> : <Lock size={17} />}
              {mode === "login" ? "Login" : "Create account"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function FeedCard({
  post,
  onLike,
  onSave,
}: {
  post: FeedPost;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
}) {
  const author = post.author || post.user;
  const tags = tagValues(post.tags);
  const itemType = post.itemType || post.type;
  const title = "title" in post ? String(post.title || "") : "";
  const content = post.content || post.reason || post.description || title;

  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar user={author} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-950">
              {author ? userName(author) : title || titleCase(itemType)}
            </div>
            <div className="truncate text-xs text-slate-500">
              {userHeadline(author) || titleCase(itemType)} {post.createdAt ? `· ${formatDate(post.createdAt)}` : ""}
            </div>
          </div>
        </div>
        {itemType && <span className="chip shrink-0">{titleCase(itemType)}</span>}
      </div>

      <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">
        {content}
      </p>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.slice(0, 5).map((tag) => (
            <span className="chip" key={tag}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="flex gap-2">
          <button
            className="icon-btn"
            type="button"
            title="Like"
            disabled={!post.id}
            onClick={() => onLike(post.id)}
          >
            <Heart size={17} />
          </button>
          <button className="icon-btn" type="button" title="Comment">
            <MessageSquare size={17} />
          </button>
          <button
            className="icon-btn"
            type="button"
            title="Save"
            disabled={!post.id}
            onClick={() => onSave(post.id)}
          >
            <Star size={17} />
          </button>
        </div>
        <div className="text-xs text-slate-500">
          {formatCount(post.likesCount)} likes · {formatCount(post.commentsCount)} comments
        </div>
      </div>
    </article>
  );
}

function ProjectCard({
  project,
  onJoin,
}: {
  project: Project;
  onJoin: (project: Project) => void;
}) {
  const techStack = Array.isArray(project.techStack)
    ? project.techStack
    : project.searchTags || [];

  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-950">
              {project.title || "Untitled project"}
            </h3>
            {project.verified && (
              <span className="chip text-emerald-700">
                <Check size={13} />
                Verified
              </span>
            )}
          </div>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
            {project.shortDescription || project.description}
          </p>
        </div>
        <span className="chip shrink-0">{titleCase(project.status || "OPEN")}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {techStack.slice(0, 5).map((tech) => (
          <span className="chip" key={String(tech)}>
            {String(tech)}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Avatar user={project.owner} size="sm" />
          <span className="truncate">{userName(project.owner)}</span>
        </div>
        <button className="btn-secondary px-3 py-1.5" type="button" onClick={() => onJoin(project)}>
          <Plus size={15} />
          Join
        </button>
      </div>
    </article>
  );
}

function JobCard({ job }: { job: Job }) {
  const salary =
    job.salaryMin || job.salaryMax
      ? `${job.currency || "INR"} ${formatCount(job.salaryMin || 0)} - ${formatCount(job.salaryMax || 0)}`
      : null;

  return (
    <article className="panel p-5">
      <div className="flex items-start gap-4">
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
          <BriefcaseBusiness size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-950">
              {job.title || "Open role"}
            </h3>
            {job.featured && <span className="chip text-amber-700">Featured</span>}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {job.company?.name || "Company"} · {job.location || "Remote"} · {titleCase(job.type)}
          </p>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
            {job.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(job.skillsRequired || []).slice(0, 5).map((skill) => (
          <span className="chip" key={skill}>
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span>{salary || titleCase(job.workMode || "OPEN")}</span>
        <span>{formatCount(job.applicationsCount)} applicants</span>
      </div>
    </article>
  );
}

function ComposePost({
  onCreate,
  disabled,
}: {
  onCreate: (payload: { content: string; type: string; tags?: string[] }) => Promise<void>;
  disabled: boolean;
}) {
  const [content, setContent] = useState("");
  const [type, setType] = useState(postTypes[0]);
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    await onCreate({
      content: content.trim(),
      type,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    setContent("");
    setTags("");
    setLoading(false);
  };

  return (
    <form className="panel p-5" onSubmit={submit}>
      <div className="flex gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
          <Send size={18} />
        </div>
        <textarea
          className="field min-h-28 resize-y"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={disabled ? "Login to post" : "Share an engineering update"}
          disabled={disabled}
          required
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[0.8fr_1fr_auto]">
        <select
          className="field"
          value={type}
          onChange={(event) => setType(event.target.value)}
          disabled={disabled}
        >
          {postTypes.map((postType) => (
            <option key={postType} value={postType}>
              {titleCase(postType)}
            </option>
          ))}
        </select>
        <input
          className="field"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="react, ai, systems"
          disabled={disabled}
        />
        <button className="btn-primary" type="submit" disabled={disabled || loading}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          Post
        </button>
      </div>
    </form>
  );
}

function CreateProjectForm({
  onCreate,
  disabled,
}: {
  onCreate: (payload: {
    title: string;
    description: string;
    visibility: "PUBLIC" | "PRIVATE";
    lookingFor?: string;
  }) => Promise<void>;
  disabled: boolean;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    visibility: "PUBLIC" as "PUBLIC" | "PRIVATE",
    lookingFor: "",
  });
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    await onCreate(form);
    setForm({ title: "", description: "", visibility: "PUBLIC", lookingFor: "" });
    setLoading(false);
  };

  return (
    <form className="panel p-5" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="field"
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder={disabled ? "Login to create a project" : "Project title"}
          minLength={3}
          disabled={disabled}
          required
        />
        <input
          className="field"
          value={form.lookingFor}
          onChange={(event) =>
            setForm((current) => ({ ...current, lookingFor: event.target.value }))
          }
          placeholder="Looking for"
          disabled={disabled}
        />
      </div>
      <textarea
        className="field mt-3 min-h-24"
        value={form.description}
        onChange={(event) =>
          setForm((current) => ({ ...current, description: event.target.value }))
        }
        placeholder="Project description"
        minLength={10}
        disabled={disabled}
        required
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <select
          className="field max-w-48"
          value={form.visibility}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              visibility: event.target.value as "PUBLIC" | "PRIVATE",
            }))
          }
          disabled={disabled}
        >
          <option value="PUBLIC">Public</option>
          <option value="PRIVATE">Private</option>
        </select>
        <button className="btn-primary" type="submit" disabled={disabled || loading}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          Create
        </button>
      </div>
    </form>
  );
}

function AppShell({
  user,
  onLogout,
  children,
  activeSection,
  setActiveSection,
  apiOnline,
}: {
  user: User | null;
  onLogout: () => void;
  children: React.ReactNode;
  activeSection: SectionKey;
  setActiveSection: (section: SectionKey) => void;
  apiOnline: boolean | null;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
        <div className="flex items-center justify-between gap-3 lg:block">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-white">
              <Code2 size={21} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-950">Engineering</div>
              <div className="text-xs text-slate-500">Platform</div>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:mt-6">
            <span
              className={`inline-flex h-2.5 w-2.5 rounded-full ${
                apiOnline === null
                  ? "bg-slate-300"
                  : apiOnline
                    ? "bg-emerald-500"
                    : "bg-rose-500"
              }`}
            />
            <span className="hidden text-xs text-slate-500 sm:inline">
              {apiOnline === null ? "Checking API" : apiOnline ? "API online" : "API offline"}
            </span>
          </div>
        </div>

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:block lg:space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const active = activeSection === section.key;
            return (
              <button
                key={section.key}
                className={`flex min-w-max items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition lg:w-full ${
                  active
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
                type="button"
                onClick={() => setActiveSection(section.key)}
              >
                <Icon size={18} />
                {section.label}
              </button>
            );
          })}
        </nav>

        {user && (
          <div className="mt-6 hidden rounded-lg border border-slate-200 bg-slate-50 p-4 lg:block">
            <div className="flex items-center gap-3">
              <Avatar user={user} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-950">
                  {userName(user)}
                </div>
                <div className="truncate text-xs text-slate-500">
                  @{user.username}
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Metric label="Rep" value={formatCount(user.reputationScore)} />
              <Metric label="Eng" value={Math.round(user.engineeringScore || 0)} />
              <Metric label="Posts" value={formatCount(user.postCount)} />
            </div>
          </div>
        )}

        <button className="btn-secondary mt-6 hidden w-full lg:flex" type="button" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-[65px] z-10 border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur lg:top-0 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-slate-950">
                {sections.find((section) => section.key === activeSection)?.label}
              </h2>
              <p className="hidden text-sm text-slate-500 sm:block">
                {user ? userHeadline(user) || `@${user.username}` : "Public workspace"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="icon-btn" type="button" title="Notifications">
                <Bell size={17} />
              </button>
              {user && (
                <button className="icon-btn lg:hidden" type="button" title="Logout" onClick={onLogout}>
                  <LogOut size={17} />
                </button>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [user, setUser] = useState<User | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("feed");
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);

  const isAuthenticated = Boolean(user);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadCoreData = useCallback(async (currentUser: User | null) => {
    setRefreshing(true);
    try {
      const [feedResult, projectResult, jobResult] = await Promise.all([
        currentUser ? api.personalizedFeed(16) : api.publicPosts(16),
        api.projects(12),
        api.jobs(),
      ]);

      setFeed(
        Array.isArray(feedResult.data)
          ? feedResult.data
          : feedResult.data.posts || [],
      );
      setProjects(projectResult.data || []);
      setJobs(jobResult.data || []);
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    const boot = async () => {
      try {
        await api.health();
        setApiOnline(true);
      } catch {
        setApiOnline(false);
      }

      const token = authStorage.getToken();
      let authedUser: User | null = null;

      if (token) {
        try {
          const result = await api.me();
          authedUser = result.data;
          setUser(result.data);
        } catch {
          authStorage.clearToken();
        }
      }

      await loadCoreData(authedUser);
      setLoading(false);
    };

    boot();
  }, [loadCoreData]);

  const visibleFeed = useMemo(() => extractFeedItems(feed), [feed]);

  const onAuth = async (payload: { token: string; user: User }) => {
    setUser(payload.user);
    showToast("success", `Welcome, ${userName(payload.user)}`);
    await loadCoreData(payload.user);
  };

  const logout = async () => {
    try {
      if (authStorage.getToken()) {
        await api.logout();
      }
    } catch {
      // Local logout still clears the session when the API is unavailable.
    } finally {
      authStorage.clearToken();
      setUser(null);
      setAuthMode("login");
      await loadCoreData(null);
    }
  };

  const createPost = async (payload: { content: string; type: string; tags?: string[] }) => {
    try {
      await api.createPost(payload);
      showToast("success", "Post published");
      await loadCoreData(user);
    } catch (error) {
      showToast("error", getErrorMessage(error));
    }
  };

  const createProject = async (payload: {
    title: string;
    description: string;
    visibility: "PUBLIC" | "PRIVATE";
    lookingFor?: string;
  }) => {
    try {
      await api.createProject(payload);
      showToast("success", "Project created");
      await loadCoreData(user);
    } catch (error) {
      showToast("error", getErrorMessage(error));
    }
  };

  const joinProject = async (project: Project) => {
    if (!isAuthenticated) {
      showToast("error", "Login required");
      return;
    }

    try {
      await api.joinProject(project.id, "I would like to collaborate on this project.");
      showToast("success", "Join request sent");
    } catch (error) {
      showToast("error", getErrorMessage(error));
    }
  };

  const reactToPost = async (id: string, action: "like" | "save") => {
    if (!isAuthenticated) {
      showToast("error", "Login required");
      return;
    }

    try {
      await (action === "like" ? api.likePost(id) : api.savePost(id));
      showToast("success", action === "like" ? "Post liked" : "Post saved");
      await loadCoreData(user);
    } catch (error) {
      showToast("error", getErrorMessage(error));
    }
  };

  const search = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);

    try {
      const [globalResult, userResult, projectResult] = await Promise.all([
        api.searchGlobal(query.trim()),
        api.searchUsers(query.trim()),
        api.searchProjects(query.trim()),
      ]);
      setSearchResults({
        ...globalResult.data,
        users: userResult.data,
        projects: projectResult.data,
      });
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-emerald-700" size={30} />
      </div>
    );
  }

  if (!user && authMode) {
    return <AuthScreen mode={authMode} setMode={setAuthMode} onAuth={onAuth} />;
  }

  return (
    <AppShell
      user={user}
      onLogout={logout}
      activeSection={activeSection}
      setActiveSection={setActiveSection}
      apiOnline={apiOnline}
    >
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-md border px-4 py-3 text-sm font-medium shadow-panel ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {toast.message}
        </div>
      )}

      {activeSection === "feed" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
          <section className="space-y-5">
            <ComposePost onCreate={createPost} disabled={!isAuthenticated} />
            {refreshing && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="animate-spin" size={16} />
                Refreshing
              </div>
            )}
            {visibleFeed.length ? (
              visibleFeed.map(({ wrapper, item }) => (
                <FeedCard
                  key={wrapper.id || `${wrapper.itemType}-${wrapper.score}-${item.content}`}
                  post={item}
                  onLike={(id) => reactToPost(id, "like")}
                  onSave={(id) => reactToPost(id, "save")}
                />
              ))
            ) : (
              <EmptyState
                icon={Compass}
                title="No feed items yet"
                text="Posts, projects, hackathons, jobs, and community updates will appear here."
              />
            )}
          </section>

          <aside className="space-y-5">
            <div className="panel p-5">
              <h3 className="text-sm font-semibold text-slate-950">Engineering snapshot</h3>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Metric label="Projects" value={projects.length} />
                <Metric label="Jobs" value={jobs.length} />
                <Metric label="Feed" value={feed.length} />
                <Metric label="API" value={apiOnline ? "On" : "Off"} />
              </div>
            </div>
            <div className="panel p-5">
              <h3 className="text-sm font-semibold text-slate-950">Featured projects</h3>
              <div className="mt-4 space-y-4">
                {projects.slice(0, 3).map((project) => (
                  <button
                    key={project.id}
                    className="block w-full rounded-md border border-slate-100 p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/50"
                    type="button"
                    onClick={() => setActiveSection("projects")}
                  >
                    <div className="truncate text-sm font-semibold text-slate-800">
                      {project.title}
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-500">
                      {project.lookingFor || titleCase(project.status)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {activeSection === "discover" && (
        <section className="space-y-5">
          <form className="panel flex gap-3 p-4" onSubmit={search}>
            <input
              className="field"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search engineers, projects, hackathons"
            />
            <button className="btn-primary" type="submit" disabled={searching}>
              {searching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
              Search
            </button>
          </form>

          {!searchResults ? (
            <EmptyState
              icon={Search}
              title="Search the platform"
              text="Find engineers, projects, skills, hackathons, and collaboration opportunities."
            />
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-600">Engineers</h3>
                {(searchResults.users || []).length ? (
                  (searchResults.users || []).map((foundUser) => (
                    <article className="panel p-5" key={foundUser.id}>
                      <div className="flex items-center gap-3">
                        <Avatar user={foundUser} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-950">
                            {userName(foundUser)}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {userHeadline(foundUser) || `@${foundUser.username}`}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyState icon={Users} title="No engineers found" text="Try another keyword." />
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-600">Projects</h3>
                {(searchResults.projects || []).length ? (
                  (searchResults.projects || []).map((project) => (
                    <ProjectCard key={project.id} project={project} onJoin={joinProject} />
                  ))
                ) : (
                  <EmptyState icon={Rocket} title="No projects found" text="Try another keyword." />
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {activeSection === "projects" && (
        <section className="space-y-5">
          <CreateProjectForm onCreate={createProject} disabled={!isAuthenticated} />
          <div className="grid gap-5 xl:grid-cols-2">
            {projects.length ? (
              projects.map((project) => (
                <ProjectCard key={project.id} project={project} onJoin={joinProject} />
              ))
            ) : (
              <EmptyState
                icon={Rocket}
                title="No public projects yet"
                text="Create the first project once your backend has data."
              />
            )}
          </div>
        </section>
      )}

      {activeSection === "jobs" && (
        <section className="grid gap-5 xl:grid-cols-2">
          {jobs.length ? (
            jobs.map((job) => <JobCard key={job.id} job={job} />)
          ) : (
            <EmptyState
              icon={BriefcaseBusiness}
              title="No jobs posted yet"
              text="Recruiter-created jobs will appear here from the backend."
            />
          )}
        </section>
      )}
    </AppShell>
  );
}
