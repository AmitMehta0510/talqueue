import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  ArrowUp,
  Building2,
  ChevronDown,
  Clock,
  Compass,
  Flame,
  GraduationCap,
  Hash,
  Lock,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  X,
  Eye,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Avatar, EmptyState } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import {
  useArchiveCommunityMutation,
  useCollegesQuery,
  useCompaniesQuery,
  useCommunityQuery,
  useCreateCommunityMutation,
  useCreatePostMutation,
  useDepartmentsQuery,
  useSuggestedCommunitiesQuery,
  useJoinedCommunitiesQuery,
  useJoinCommunityMutation,
  useLeaveCommunityMutation,
} from "../hooks/usePlatformQueries";
import {
  College,
  Community,
  CommunityCategory,
  CommunityType,
  FeedPost,
} from "../lib/api";
import {
  compactPayload,
  formatCount,
  formatDate,
  splitCsv,
  titleCase,
  userHeadline,
  userName,
} from "../lib/format";

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const communityTypes: CommunityType[] = ["GENERAL", "COLLEGE", "COMPANY"];
const communityCategories: CommunityCategory[] = [
  "GENERAL", "CODING", "PLACEMENTS", "INTERNSHIPS", "REFERRALS",
  "INTERVIEWS", "SALARIES", "ANNOUNCEMENTS", "RESOURCES", "EVENTS",
];

// Role helpers
const PLATFORM_ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN", "COLLEGE_ADMIN", "COMPANY_ADMIN"]);

function isPlatformAdmin(user: any): boolean {
  if (!user?.roles) return false;
  return (user.roles as Array<{ role?: { name?: string } }>).some(
    (r) => r.role?.name && PLATFORM_ADMIN_ROLES.has(r.role.name)
  );
}

function isSuperOrPlatformAdmin(user: any): boolean {
  if (!user?.roles) return false;
  return (user.roles as Array<{ role?: { name?: string } }>).some(
    (r) => r.role?.name && new Set(["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"]).has(r.role.name ?? "")
  );
}

const TYPE_GRADIENT: Record<CommunityType, string> = {
  COLLEGE: "from-emerald-600 to-teal-700",
  COMPANY: "from-blue-600 to-indigo-700",
  GENERAL: "from-violet-600 to-purple-700",
};

const TYPE_ICON_BG: Record<CommunityType, string> = {
  COLLEGE: "bg-emerald-600",
  COMPANY: "bg-blue-600",
  GENERAL: "bg-violet-600",
};

const CATEGORY_COLORS: Record<CommunityCategory, string> = {
  GENERAL:      "bg-slate-100 text-slate-600",
  CODING:       "bg-violet-100 text-violet-700",
  PLACEMENTS:   "bg-emerald-100 text-emerald-700",
  INTERNSHIPS:  "bg-teal-100 text-teal-700",
  REFERRALS:    "bg-amber-100 text-amber-700",
  INTERVIEWS:   "bg-blue-100 text-blue-700",
  SALARIES:     "bg-pink-100 text-pink-700",
  ANNOUNCEMENTS:"bg-orange-100 text-orange-700",
  RESOURCES:    "bg-cyan-100 text-cyan-700",
  EVENTS:       "bg-indigo-100 text-indigo-700",
};

const flattenColleges = (pages?: Array<{ colleges: College[] }>) =>
  (pages || []).flatMap((p) => p.colleges || []);

const communityScope = (c: Community) =>
  c.college?.name || c.department?.name || c.company?.name ||
  [c.city, c.state].filter(Boolean).join(", ") || titleCase(c.type);

const timeAgo = (date?: string) => {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(date);
};

// ---------------------------------------------------------------------------
// CommunityIcon (Reddit-style subreddit icon)
// ---------------------------------------------------------------------------

function CommunityIcon({
  community,
  size = "md",
}: {
  community: Community;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const dims = { xs: "h-6 w-6", sm: "h-8 w-8", md: "h-10 w-10", lg: "h-14 w-14", xl: "h-20 w-20" };
  const icons = { xs: 12, sm: 14, md: 18, lg: 24, xl: 32 };
  const dim = dims[size];
  const iconSize = icons[size];

  if (community.avatarUrl) {
    return (
      <img
        className={`${dim} rounded-full object-cover ring-2 ring-white`}
        src={community.avatarUrl}
        alt={community.name}
      />
    );
  }

  const Icon =
    community.type === "COLLEGE" ? GraduationCap
    : community.type === "COMPANY" ? Building2
    : Hash;

  const bg = TYPE_ICON_BG[community.type];

  return (
    <div className={`${dim} inline-flex shrink-0 items-center justify-center rounded-full ${bg} text-white ring-2 ring-white`}>
      <Icon size={iconSize} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reddit-style Vote Button
// ---------------------------------------------------------------------------

function VoteWidget({ count = 0 }: { count: number }) {
  const [voted, setVoted] = useState(false);
  const display = voted ? count + 1 : count;
  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      <button
        type="button"
        onClick={() => setVoted((v) => !v)}
        className={`group flex h-7 w-7 items-center justify-center rounded transition-colors ${
          voted
            ? "text-orange-500"
            : "text-slate-400 hover:bg-orange-50 hover:text-orange-500"
        }`}
        aria-label="Upvote"
      >
        <ArrowUp size={16} strokeWidth={voted ? 2.5 : 2} />
      </button>
      <span className={`text-xs font-bold tabular-nums ${voted ? "text-orange-500" : "text-slate-500"}`}>
        {formatCount(display)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reddit-style Post Card (for community detail)
// ---------------------------------------------------------------------------

function PostCard({ post }: { post: FeedPost }) {
  const author = post.author || post.user;
  const votes = post.likesCount ?? 0;
  const comments = post.commentsCount ?? 0;

  return (
    <article className="group flex cursor-pointer gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-sm">
      {/* Vote column */}
      <div className="flex shrink-0 flex-col items-center pt-0.5">
        <VoteWidget count={votes} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
          <Avatar user={author} size="sm" />
          <span className="font-semibold text-slate-600">u/{author?.username || "anonymous"}</span>
          <span>·</span>
          <span>{timeAgo(post.createdAt)}</span>
        </div>

        <h3 className="mt-2 text-sm font-semibold leading-snug text-slate-900 group-hover:text-emerald-800 transition-colors">
          {post.title || post.content?.slice(0, 120) || "Untitled post"}
        </h3>

        {post.content && post.title && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
            {post.content}
          </p>
        )}

        {/* Tags */}
        {(post.tags || []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {(post.tags as string[]).slice(0, 3).map((tag, i) => (
              <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action bar */}
        <div className="mt-2.5 flex items-center gap-1">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <MessageSquare size={13} />
            {formatCount(comments)} Comments
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Eye size={13} />
            View
          </button>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// SkeletonCard
// ---------------------------------------------------------------------------

function SkeletonPost() {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 animate-pulse">
      <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
        <div className="h-7 w-7 rounded bg-slate-100" />
        <div className="h-4 w-5 rounded bg-slate-100" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-slate-100" />
          <div className="h-3 w-24 rounded bg-slate-100" />
        </div>
        <div className="h-4 w-3/4 rounded bg-slate-100" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-2/3 rounded bg-slate-100" />
      </div>
    </div>
  );
}

function SkeletonCommunityCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white animate-pulse">
      <div className="h-16 bg-slate-100" />
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-slate-100" />
          <div className="h-4 w-32 rounded bg-slate-100" />
        </div>
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-4/5 rounded bg-slate-100" />
        <div className="h-8 w-full rounded-full bg-slate-100 mt-3" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Community Browse Card (list page — Reddit's explore-communities style)
// ---------------------------------------------------------------------------

function CommunityBrowseCard({
  community,
  isMember,
  isOwner,
}: {
  community: Community;
  isMember: boolean;
  isOwner: boolean;
}) {
  const { user } = useAuth();
  const joinMutation = useJoinCommunityMutation(community.slug);
  const leaveMutation = useLeaveCommunityMutation(community.slug);
  const isPrivate = community.visibility === "PRIVATE";
  const members = community._count?.members ?? community.memberCount ?? 0;

  return (
    <div className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-emerald-300 hover:shadow-md">
      {/* Mini banner */}
      <Link to={`/communities/${community.slug}`}>
        <div
          className={`relative h-16 w-full bg-gradient-to-br ${TYPE_GRADIENT[community.type]}`}
        >
          {community.bannerUrl && (
            <img
              src={community.bannerUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-60"
            />
          )}
          {/* category chip top-right */}
          <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white/90 backdrop-blur-sm bg-black/25`}>
            {titleCase(community.category)}
          </span>
        </div>
      </Link>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-2.5">
          <div className="-mt-8 shrink-0">
            <CommunityIcon community={community} size="md" />
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <Link
              to={`/communities/${community.slug}`}
              className="block truncate text-sm font-bold text-slate-900 hover:text-emerald-700 transition-colors"
            >
              r/{community.slug}
            </Link>
            <p className="truncate text-xs text-slate-400">{communityScope(community)}</p>
          </div>
          {community.verified && (
            <ShieldCheck size={14} className="mt-1.5 shrink-0 text-emerald-500" />
          )}
        </div>

        {/* Description */}
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {community.shortDescription || community.description || "A community for engineers."}
        </p>

        {/* Stats row */}
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Users size={11} />
            <strong className="text-slate-700">{formatCount(members)}</strong> members
          </span>
          {isPrivate && (
            <span className="flex items-center gap-1 text-rose-500">
              <Lock size={11} />
              Private
            </span>
          )}
          {community.autoJoinEligible && (
            <span className="flex items-center gap-1 text-teal-600">
              <Sparkles size={11} />
              Auto-join
            </span>
          )}
        </div>

        {/* Action */}
        {user && (
          <div className="mt-3">
            {isPrivate && !isMember ? (
              <div
                title="Auto-joined when you register your college or company."
                className="flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1.5 text-xs font-bold text-slate-400"
              >
                <Lock size={11} />
                Private
              </div>
            ) : isMember && !isOwner ? (
              <button
                type="button"
                disabled={leaveMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Leave r/${community.slug}?`)) {
                    leaveMutation.mutate(community.id);
                  }
                }}
                className="w-full rounded-full border border-emerald-300 bg-white py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
              >
                {leaveMutation.isPending ? <Loader2 className="mx-auto animate-spin" size={13} /> : "✓ Joined"}
              </button>
            ) : isMember && isOwner ? (
              <Link
                to={`/communities/${community.slug}`}
                className="block w-full rounded-full border border-emerald-300 bg-white py-1.5 text-center text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
              >
                View
              </Link>
            ) : (
              <button
                type="button"
                disabled={joinMutation.isPending}
                onClick={() => joinMutation.mutate(community.id)}
                className="w-full rounded-full bg-emerald-700 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
              >
                {joinMutation.isPending ? <Loader2 className="mx-auto animate-spin" size={13} /> : "Join"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CreateCommunityModal
// ---------------------------------------------------------------------------

function CreateCommunityModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createCommunity = useCreateCommunityMutation();
  const companiesQuery = useCompaniesQuery({ page: 1, limit: 100 });
  const collegesQuery = useCollegesQuery(100);
  const colleges = flattenColleges(collegesQuery.data?.pages);
  const companies = companiesQuery.data?.companies || [];

  const [form, setForm] = useState({
    name: "", description: "",
    type: "GENERAL" as CommunityType,
    category: "GENERAL" as CommunityCategory,
    collegeId: "", departmentId: "", companyId: "", city: "",
    tags: "", searchKeywords: "", autoJoinEligible: false,
  });

  const departmentsQuery = useDepartmentsQuery(form.type === "COLLEGE" ? form.collegeId : undefined);
  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await createCommunity.mutateAsync({
        name: form.name, type: form.type, category: form.category,
        ...compactPayload({
          description: form.description,
          collegeId: form.type === "COLLEGE" ? form.collegeId : undefined,
          departmentId: form.type === "COLLEGE" ? form.departmentId : undefined,
          companyId: form.type === "COMPANY" ? form.companyId : undefined,
          city: form.type === "COMPANY" ? form.city : undefined,
        }),
        tags: splitCsv(form.tags),
        searchKeywords: splitCsv(form.searchKeywords),
        autoJoinEligible: form.autoJoinEligible,
      });
      onClose();
      navigate(`/communities/${res.data.slug}`);
    } catch { /* toast handled */ }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">Create a Community</h2>
          <button onClick={onClose} className="icon-btn" type="button"><X size={16} /></button>
        </div>
        <form className="space-y-4 p-6" onSubmit={submit}>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Name *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">r/</span>
              <input className="field pl-7" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="community_name" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Type *</label>
              <select className="field" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as CommunityType, collegeId: "", departmentId: "", companyId: "", city: "" }))}>
                {/* Normal users can only create GENERAL communities */}
                <option value="GENERAL">General</option>
                {isPlatformAdmin(user) && (
                  <>
                    <option value="COLLEGE">College (Admin Only)</option>
                    <option value="COMPANY">Company (Admin Only)</option>
                  </>
                )}
              </select>
              {!isPlatformAdmin(user) && (
                <p className="mt-1 text-[10px] text-slate-400">College &amp; Company communities are created by verified admins only.</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Category *</label>
              <select className="field" value={form.category} onChange={(e) => set("category", e.target.value as CommunityCategory)}>
                {communityCategories.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
              </select>
            </div>
          </div>
          {form.type === "COLLEGE" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">College *</label>
                <select className="field" value={form.collegeId} onChange={(e) => setForm((p) => ({ ...p, collegeId: e.target.value, departmentId: "" }))} required>
                  <option value="">Select college</option>
                  {colleges.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Department</label>
                <select className="field" value={form.departmentId} onChange={(e) => set("departmentId", e.target.value)} disabled={!form.collegeId}>
                  <option value="">Optional</option>
                  {(departmentsQuery.data || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
          )}
          {form.type === "COMPANY" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Company *</label>
                <select className="field" value={form.companyId} onChange={(e) => set("companyId", e.target.value)} required>
                  <option value="">Select company</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">City *</label>
                <input className="field" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Mumbai" required />
              </div>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Description</label>
            <textarea className="field min-h-20 resize-none" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What's your community about?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Tags</label>
              <input className="field" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="coding, dsa, web" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Keywords</label>
              <input className="field" value={form.searchKeywords} onChange={(e) => set("searchKeywords", e.target.value)} placeholder="Search terms" />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <input type="checkbox" checked={form.autoJoinEligible} onChange={(e) => set("autoJoinEligible", e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Enable auto-join</p>
              <p className="text-xs text-slate-400">Members added automatically when they register</p>
            </div>
          </label>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={createCommunity.isPending}>
              {createCommunity.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Create Community
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CreatePostComposer — Reddit-style inline post box
// ---------------------------------------------------------------------------

function CreatePostComposer({ communitySlug, communityId, isMember }: { communitySlug: string; communityId: string; isMember: boolean }) {
  const { user } = useAuth();
  const createPost = useCreatePostMutation();
  const communityQuery = useCommunityQuery(communitySlug);
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!user || !isMember) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      await createPost.mutateAsync({
        content: content.trim(),
        type: "TEXT",
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        visibility: "PUBLIC",
      });
      setContent("");
      setTags("");
      setExpanded(false);
      // Refresh the community to show the new post
      communityQuery.refetch();
    } catch { /* toast handled by mutation */ }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Collapsed state — Reddit-style click-to-expand */}
      {!expanded ? (
        <div className="flex items-center gap-3 p-3">
          <Avatar user={user} size="sm" />
          <button
            type="button"
            onClick={() => { setExpanded(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-sm text-slate-400 transition hover:border-emerald-300 hover:bg-white hover:text-slate-600"
          >
            Share something with this community…
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Create Post</p>
          </div>
          <div className="p-4 space-y-3">
            <textarea
              ref={textareaRef}
              className="field min-h-28 resize-none text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What do you want to share with this community?"
              required
            />
            <input
              className="field text-sm"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (comma-separated, optional)"
            />
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
            <button
              type="button"
              className="btn-secondary py-1.5 text-xs"
              onClick={() => { setExpanded(false); setContent(""); setTags(""); }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary py-1.5 text-xs"
              disabled={createPost.isPending || !content.trim()}
            >
              {createPost.isPending ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
              Post
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CommunityDetail — Reddit-style subreddit page
// ---------------------------------------------------------------------------

type SortMode = "hot" | "new" | "top";

function sortPosts(posts: FeedPost[], mode: SortMode): FeedPost[] {
  const cloned = [...posts];
  if (mode === "hot") return cloned.sort((a, b) => ((b.likesCount ?? 0) + (b.commentsCount ?? 0)) - ((a.likesCount ?? 0) + (a.commentsCount ?? 0)));
  if (mode === "new") return cloned.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  if (mode === "top") return cloned.sort((a, b) => (b.likesCount ?? 0) - (a.likesCount ?? 0));
  return cloned;
}

function CommunityDetail({ slug }: { slug: string }) {
  const { user } = useAuth();
  const communityQuery = useCommunityQuery(slug);
  const community = communityQuery.data;
  const archive = useArchiveCommunityMutation(slug);
  const [sortMode, setSortMode] = useState<SortMode>("hot");

  const joinedQuery = useJoinedCommunitiesQuery();
  const joinedCommunities = joinedQuery.data || [];
  const isMember = joinedCommunities.some((jc) => jc.id === community?.id);
  const isOwner = community?.createdById === user?.id;
  const isPrivate = community?.visibility === "PRIVATE";

  const joinMutation = useJoinCommunityMutation(slug);
  const leaveMutation = useLeaveCommunityMutation(slug);

  const canArchive = useMemo(() => {
    if (!user || !community) return false;
    if (community.createdById === user.id) return true;
    return (community.members || []).some(
      (m) => m.userId === user.id && ["OWNER", "ADMIN"].includes(m.role || "")
    );
  }, [community, user]);

  const sortedPosts = useMemo(
    () => sortPosts(community?.posts || [], sortMode),
    [community?.posts, sortMode]
  );

  if (!user) return <EmptyState icon={Users} title="Login required" text="Sign in to explore communities." />;

  if (communityQuery.isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-36 rounded-xl bg-slate-200" />
        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-3">
            {[0,1,2].map(i => <SkeletonPost key={i} />)}
          </div>
          <div className="h-64 rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!community) return <EmptyState icon={Hash} title="Community not found" text="This community may have been archived." />;

  const members = community._count?.members ?? community.memberCount ?? 0;
  const posts   = community._count?.posts   ?? community.postCount   ?? 0;
  const chats   = community._count?.conversations ?? community.conversationCount ?? 0;

  return (
    <section className="space-y-0">
      {/* ── Banner ── */}
      <div className={`relative h-28 w-full rounded-xl bg-gradient-to-br ${TYPE_GRADIENT[community.type]} sm:h-36`}>
        {community.bannerUrl && (
          <img src={community.bannerUrl} alt="" className="absolute inset-0 h-full w-full rounded-xl object-cover opacity-70" />
        )}
        <Link
          to="/communities"
          className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-black/50"
        >
          <ArrowLeft size={12} />
          All Communities
        </Link>
      </div>

      {/* ── Community identity bar ── */}
      <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white px-6 pb-4 pt-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            {/* Icon overlapping banner */}
            <div className="-mt-6 shrink-0">
              <CommunityIcon community={community} size="xl" />
            </div>
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{community.name}</h1>
                {community.verified && <ShieldCheck size={16} className="text-emerald-500" />}
              </div>
              <p className="text-sm text-slate-400">r/{community.slug} · {communityScope(community)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pb-1">
            {!community.archived && (
              isPrivate && !isMember ? (
                <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-5 py-2 text-sm font-bold text-slate-400 cursor-not-allowed" title="Auto-joined for verified members">
                  <Lock size={13} /> Private
                </div>
              ) : isMember && !isOwner ? (
                <button
                  type="button"
                  disabled={leaveMutation.isPending}
                  onClick={() => { if (window.confirm(`Leave r/${community.slug}?`)) leaveMutation.mutate(community.id); }}
                  className="rounded-full border border-emerald-600 bg-white px-5 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                >
                  {leaveMutation.isPending ? <Loader2 className="animate-spin" size={15} /> : "✓ Joined"}
                </button>
              ) : !isMember ? (
                <button
                  type="button"
                  disabled={joinMutation.isPending}
                  onClick={() => joinMutation.mutate(community.id)}
                  className="rounded-full bg-emerald-700 px-6 py-2 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  {joinMutation.isPending ? <Loader2 className="animate-spin" size={15} /> : "Join"}
                </button>
              ) : null
            )}
            {canArchive && !community.archived && (
              <button className="icon-btn" type="button" title="Archive community" disabled={archive.isPending}
                onClick={() => { if (window.confirm("Archive this community?")) archive.mutate(community.id); }}>
                {archive.isPending ? <Loader2 className="animate-spin" size={14} /> : <Archive size={14} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body: 2-column Reddit layout ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
        {/* ── Left: Post Feed ── */}
        <div className="space-y-3">
          {/* Create Post Composer */}
          <CreatePostComposer
            communitySlug={slug}
            communityId={community.id}
            isMember={isMember}
          />

          {/* Sort bar */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-2">
            {([
              { key: "hot" as SortMode, icon: Flame, label: "Hot" },
              { key: "new" as SortMode, icon: Clock, label: "New" },
              { key: "top" as SortMode, icon: TrendingUp, label: "Top" },
            ] as const).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSortMode(key)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  sortMode === key
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Posts */}
          {communityQuery.isFetching ? (
            [0, 1, 2].map((i) => <SkeletonPost key={i} />)
          ) : sortedPosts.length > 0 ? (
            sortedPosts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <MessageSquare size={22} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No posts yet</p>
              <p className="mt-1 text-xs text-slate-400">Be the first to share something with this community.</p>
            </div>
          )}

          {/* Chat channels */}
          {(community.conversations || []).length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Chat Channels</p>
              <div className="space-y-1.5">
                {(community.conversations || []).map((conv) => (
                  <Link
                    key={conv.id}
                    to={`/chat/${conv.id}`}
                    className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    <Hash size={14} className="text-slate-400 group-hover:text-emerald-600" />
                    <span className="font-medium">{conv.title || "general"}</span>
                    <span className="ml-auto text-xs text-slate-300">{conv.updatedAt ? timeAgo(conv.updatedAt) : ""}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <aside className="space-y-4">
          {/* About */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className={`bg-gradient-to-r ${TYPE_GRADIENT[community.type]} px-4 py-3`}>
              <p className="text-xs font-bold uppercase tracking-wide text-white/80">About Community</p>
            </div>
            <div className="p-4">
              <p className="text-sm leading-relaxed text-slate-600">
                {community.description || community.shortDescription || "A community for engineers on the platform."}
              </p>

              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users size={15} className="text-slate-400" />
                    <span className="font-bold text-slate-900">{formatCount(members)}</span>
                    <span>Members</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MessageSquare size={15} className="text-slate-400" />
                    <span className="font-bold text-slate-900">{formatCount(posts)}</span>
                    <span>Posts</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Hash size={15} className="text-slate-400" />
                    <span className="font-bold text-slate-900">{formatCount(chats)}</span>
                    <span>Channels</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Star size={15} className="text-slate-400" />
                    <span className="font-bold text-slate-900">{Math.round(community.trendingScore ?? 0)}</span>
                    <span>Trending</span>
                  </div>
                </div>
                {community.createdAt && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-100 pt-3">
                    <Clock size={12} />
                    Created {formatDate(community.createdAt)}
                  </div>
                )}
              </div>

              {/* Tags */}
              {(community.tags || []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4">
                  {(community.tags || []).map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Scope */}
              <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-xs text-slate-500">
                {community.college?.name && (
                  <div className="flex items-center gap-2"><GraduationCap size={12} className="text-slate-300" />{community.college.name}</div>
                )}
                {community.department?.name && (
                  <div className="flex items-center gap-2"><Hash size={12} className="text-slate-300" />{community.department.name} Dept.</div>
                )}
                {community.company?.name && (
                  <div className="flex items-center gap-2"><Building2 size={12} className="text-slate-300" />{community.company.name}</div>
                )}
                {community.city && (
                  <div className="flex items-center gap-2"><TrendingUp size={12} className="text-slate-300" />{community.city}</div>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {community.visibility === "PRIVATE" && (
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">Private</span>
                  )}
                  {community.visibility === "PUBLIC" && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Public</span>
                  )}
                  {community.autoJoinEligible && (
                    <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">Auto-join</span>
                  )}
                </div>
              </div>

              {/* Join/Leave CTA in sidebar */}
              {!community.archived && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  {isPrivate && !isMember ? (
                    <div className="flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-400">
                      <Lock size={11} /> Members only
                    </div>
                  ) : isMember && !isOwner ? (
                    <button
                      type="button"
                      disabled={leaveMutation.isPending}
                      onClick={() => { if (window.confirm(`Leave r/${community.slug}?`)) leaveMutation.mutate(community.id); }}
                      className="w-full rounded-full border border-slate-300 py-2 text-xs font-bold text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    >
                      {leaveMutation.isPending ? <Loader2 className="mx-auto animate-spin" size={13} /> : "Leave Community"}
                    </button>
                  ) : !isMember ? (
                    <button
                      type="button"
                      disabled={joinMutation.isPending}
                      onClick={() => joinMutation.mutate(community.id)}
                      className="w-full rounded-full bg-emerald-700 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {joinMutation.isPending ? <Loader2 className="mx-auto animate-spin" size={13} /> : "Join Community"}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Moderators / Members */}
          {(community.members || []).length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                Moderators & Members
              </p>
              <div className="space-y-2.5">
                {(community.members || []).slice(0, 8).map((m) => (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <Avatar user={m.user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        u/{m.user?.username || "user"}
                      </p>
                      {m.role && m.role !== "MEMBER" && (
                        <p className="text-[10px] font-bold text-emerald-600">{titleCase(m.role)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CommunitiesPage — Reddit-style browse/explore
// ---------------------------------------------------------------------------

type Tab = "joined" | "explore";

export function CommunitiesPage() {
  const { communitySlug } = useParams();
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("joined");
  const [hasSetDefaultTab, setHasSetDefaultTab] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CommunityCategory | "">("");
  const [typeFilter, setTypeFilter] = useState<CommunityType | "">("");
  const [showFilters, setShowFilters] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const suggestedQuery = useSuggestedCommunitiesQuery();
  const suggestedCommunities = suggestedQuery.data || [];

  const joinedQuery = useJoinedCommunitiesQuery();
  const joinedCommunities = joinedQuery.data || [];

  useEffect(() => {
    if (!joinedQuery.isLoading && !hasSetDefaultTab) {
      if (joinedCommunities.length === 0) setActiveTab("explore");
      setHasSetDefaultTab(true);
    }
  }, [joinedQuery.isLoading, joinedCommunities.length, hasSetDefaultTab]);

  const currentList = activeTab === "joined" ? joinedCommunities : suggestedCommunities;

  const filteredCommunities = useMemo(() => {
    const q = query.trim().toLowerCase();
    return currentList.filter((c) => {
      if (categoryFilter && c.category !== categoryFilter) return false;
      if (typeFilter && c.type !== typeFilter) return false;
      if (!q) return true;
      const haystack = [c.name, c.description, c.type, c.category, c.college?.name, c.company?.name, ...(c.tags || [])]
        .filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [currentList, query, categoryFilter, typeFilter]);

  const joinedSet = useMemo(() => new Set(joinedCommunities.map((c) => c.id)), [joinedCommunities]);
  const isLoading = (activeTab === "joined" ? joinedQuery : suggestedQuery).isLoading;

  if (communitySlug) return <CommunityDetail slug={communitySlug} />;

  return (
    <>
      <CreateCommunityModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <section className="space-y-5">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Communities</h1>
            <p className="mt-1 text-sm text-slate-500">
              Your college and company spaces, plus communities built for engineers.
            </p>
          </div>
          {user && (
            <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Create Community
            </button>
          )}
        </div>

        {/* ── Tabs ── */}
        {user && (
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {([
              { key: "joined" as Tab, icon: Users, label: "My Communities", count: joinedCommunities.length },
              { key: "explore" as Tab, icon: Compass, label: "Explore", count: suggestedCommunities.length },
            ] as const).map(({ key, icon: Icon, label, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
                  activeTab === key
                    ? "bg-emerald-700 text-white shadow"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Icon size={15} />
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${activeTab === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Search + Filters ── */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                className="field pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={activeTab === "joined" ? "Search my communities…" : "Search all communities…"}
                disabled={!user}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`icon-btn gap-1 px-3 text-xs font-semibold ${showFilters || categoryFilter || typeFilter ? "border-emerald-400 text-emerald-700" : ""}`}
              disabled={!user}
            >
              <ChevronDown size={14} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
          </div>

          {showFilters && user && (
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400">TYPE</span>
                {(["", "GENERAL", "COLLEGE", "COMPANY"] as (CommunityType | "")[]).map((t) => (
                  <button key={t || "all"} type="button" onClick={() => setTypeFilter(t)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${typeFilter === t ? "border-emerald-500 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"}`}>
                    {t ? titleCase(t) : "All"}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400">TOPIC</span>
                {(["", "CODING", "PLACEMENTS", "INTERNSHIPS", "REFERRALS", "INTERVIEWS"] as (CommunityCategory | "")[]).map((c) => (
                  <button key={c || "all"} type="button" onClick={() => setCategoryFilter(c)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${categoryFilter === c ? "border-emerald-500 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"}`}>
                    {c ? titleCase(c) : "All"}
                  </button>
                ))}
                {(categoryFilter || typeFilter) && (
                  <button type="button" onClick={() => { setCategoryFilter(""); setTypeFilter(""); }}
                    className="ml-auto flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-700">
                    <X size={11} /> Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Grid ── */}
        {!user ? (
          <EmptyState icon={Users} title="Sign in to view communities" text="Join spaces from your college, company, or engineering interests." />
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCommunityCard key={i} />)}
          </div>
        ) : filteredCommunities.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCommunities.map((community) => (
              <CommunityBrowseCard
                key={community.id}
                community={community}
                isMember={joinedSet.has(community.id)}
                isOwner={community.createdById === user.id}
              />
            ))}
          </div>
        ) : activeTab === "joined" ? (
          <EmptyState
            icon={Users}
            title={query ? "No results" : "No communities joined yet"}
            text={query ? "Try different keywords or clear filters." : "You'll be auto-joined when you add your college or company. Explore open communities to join manually."}
            action={!query ? (
              <button type="button" className="btn-primary mt-2" onClick={() => setActiveTab("explore")}>
                <Compass size={16} /> Explore Communities
              </button>
            ) : undefined}
          />
        ) : (
          <EmptyState
            icon={Hash}
            title={query ? "No results" : "No suggestions yet"}
            text={query ? "Try different keywords or clear filters." : "Suggestions grow as your profile builds up."}
          />
        )}
      </section>
    </>
  );
}
