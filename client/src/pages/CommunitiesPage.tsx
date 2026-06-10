import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Building2,
  ChevronDown,
  Compass,
  GraduationCap,
  Hash,
  LayoutGrid,
  Lock,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
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
  useDepartmentsQuery,
  useSuggestedCommunitiesQuery,
  useJoinedCommunitiesQuery,
  useJoinCommunityMutation,
  useLeaveCommunityMutation,
} from "../hooks/usePlatformQueries";
import { College, Community, CommunityCategory, CommunityType } from "../lib/api";
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
// Constants
// ---------------------------------------------------------------------------

const communityTypes: CommunityType[] = ["GENERAL", "COLLEGE", "COMPANY"];

const communityCategories: CommunityCategory[] = [
  "GENERAL",
  "CODING",
  "PLACEMENTS",
  "INTERNSHIPS",
  "REFERRALS",
  "INTERVIEWS",
  "SALARIES",
  "ANNOUNCEMENTS",
  "RESOURCES",
  "EVENTS",
];

const CATEGORY_COLORS: Record<CommunityCategory, string> = {
  GENERAL:      "bg-slate-100 text-slate-600 border-slate-200",
  CODING:       "bg-violet-50 text-violet-700 border-violet-200",
  PLACEMENTS:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  INTERNSHIPS:  "bg-teal-50 text-teal-700 border-teal-200",
  REFERRALS:    "bg-amber-50 text-amber-700 border-amber-200",
  INTERVIEWS:   "bg-blue-50 text-blue-700 border-blue-200",
  SALARIES:     "bg-pink-50 text-pink-700 border-pink-200",
  ANNOUNCEMENTS:"bg-orange-50 text-orange-700 border-orange-200",
  RESOURCES:    "bg-cyan-50 text-cyan-700 border-cyan-200",
  EVENTS:       "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const TYPE_GRADIENT: Record<CommunityType, string> = {
  COLLEGE: "from-emerald-500 to-teal-600",
  COMPANY: "from-blue-500 to-indigo-600",
  GENERAL: "from-violet-500 to-purple-600",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const flattenColleges = (pages?: Array<{ colleges: College[] }>) =>
  (pages || []).flatMap((p) => p.colleges || []);

const communityScope = (community: Community) =>
  community.college?.name ||
  community.department?.name ||
  community.company?.name ||
  [community.city, community.state].filter(Boolean).join(", ") ||
  titleCase(community.type);

// ---------------------------------------------------------------------------
// CommunityIcon
// ---------------------------------------------------------------------------

function CommunityIcon({
  community,
  size = "md",
}: {
  community: Community;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-16 w-16" : "h-12 w-12";
  const iconSize = size === "sm" ? 16 : size === "lg" ? 28 : 22;

  if (community.avatarUrl) {
    return (
      <img
        className={`${dim} rounded-xl object-cover shadow-sm`}
        src={community.avatarUrl}
        alt={community.name}
      />
    );
  }

  const Icon =
    community.type === "COLLEGE"
      ? GraduationCap
      : community.type === "COMPANY"
      ? Building2
      : Hash;

  const gradient = TYPE_GRADIENT[community.type];

  return (
    <div
      className={`${dim} inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}
    >
      <Icon size={iconSize} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategoryBadge
// ---------------------------------------------------------------------------

function CategoryBadge({ value }: { value?: CommunityCategory | null }) {
  if (!value) return null;
  const cls = CATEGORY_COLORS[value] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {titleCase(value)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// VisibilityBadge
// ---------------------------------------------------------------------------

function VisibilityBadge({ visibility }: { visibility?: string | null }) {
  if (visibility === "PRIVATE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">
        <Lock size={10} />
        Private
      </span>
    );
  }
  if (visibility === "PUBLIC") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
        Open
      </span>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// SkeletonCard
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="panel overflow-hidden p-5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl bg-slate-100 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/5 rounded bg-slate-100" />
          <div className="h-3 w-2/5 rounded bg-slate-100" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-4/5 rounded bg-slate-100" />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded-lg bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatPill
// ---------------------------------------------------------------------------

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 text-center">
      <Icon size={14} className="mb-1 text-slate-400" />
      <div className="text-sm font-bold text-slate-900">{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CommunityCard
// ---------------------------------------------------------------------------

function CommunityCard({
  community,
  isMember,
  isOwner,
}: {
  community: Community;
  isMember: boolean;
  isOwner: boolean;
}) {
  const { user: currentUser } = useAuth();
  const joinMutation = useJoinCommunityMutation(community.slug);
  const leaveMutation = useLeaveCommunityMutation(community.slug);
  const isPrivate = community.visibility === "PRIVATE";

  return (
    <article className="panel group overflow-hidden transition-shadow duration-200 hover:shadow-md">
      {/* Banner strip */}
      <div
        className={`h-1.5 w-full bg-gradient-to-r ${TYPE_GRADIENT[community.type]}`}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <CommunityIcon community={community} />

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link
                    to={`/communities/${community.slug}`}
                    className="truncate text-sm font-bold text-slate-900 hover:text-emerald-700 transition-colors"
                  >
                    {community.name}
                  </Link>
                  {community.verified && (
                    <ShieldCheck size={13} className="shrink-0 text-emerald-600" />
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {communityScope(community)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500">
          {community.shortDescription ||
            community.description ||
            "A community for engineers on this platform."}
        </p>

        {/* Badges */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <CategoryBadge value={community.category} />
          <VisibilityBadge visibility={community.visibility} />
          {community.autoJoinEligible && (
            <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
              <Sparkles size={10} />
              Auto-join
            </span>
          )}
          {isMember && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              ✓ Joined
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatPill
            icon={Users}
            label="Members"
            value={formatCount(community._count?.members ?? community.memberCount ?? 0)}
          />
          <StatPill
            icon={MessageSquare}
            label="Posts"
            value={formatCount(community._count?.posts ?? community.postCount ?? 0)}
          />
          <StatPill
            icon={TrendingUp}
            label="Trending"
            value={Math.round(community.trendingScore ?? 0)}
          />
        </div>

        {/* Actions */}
        {currentUser && (
          <div className="mt-4 flex gap-2">
            <Link
              to={`/communities/${community.slug}`}
              className="btn-secondary flex-1 py-1.5 text-xs"
            >
              View
            </Link>

            {isPrivate && !isMember ? (
              <div
                title="This community is private. You'll be auto-joined when you register your college or company."
                className="flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400"
              >
                <Lock size={11} />
                Private
              </div>
            ) : isMember && !isOwner ? (
              <button
                type="button"
                disabled={leaveMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Leave ${community.name}?`)) {
                    leaveMutation.mutate(community.id);
                  }
                }}
                className="flex-1 rounded-md border border-rose-200 bg-rose-50 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
              >
                {leaveMutation.isPending ? (
                  <Loader2 className="mx-auto animate-spin" size={13} />
                ) : (
                  "Leave"
                )}
              </button>
            ) : !isMember ? (
              <button
                type="button"
                disabled={joinMutation.isPending}
                onClick={() => joinMutation.mutate(community.id)}
                className="btn-primary flex-1 py-1.5 text-xs"
              >
                {joinMutation.isPending ? (
                  <Loader2 className="mx-auto animate-spin" size={13} />
                ) : (
                  "Join"
                )}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// CreateCommunityModal
// ---------------------------------------------------------------------------

function CreateCommunityModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const createCommunity = useCreateCommunityMutation();
  const companiesQuery = useCompaniesQuery({ page: 1, limit: 100 });
  const collegesQuery = useCollegesQuery(100);
  const colleges = flattenColleges(collegesQuery.data?.pages);
  const companies = companiesQuery.data?.companies || [];

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "GENERAL" as CommunityType,
    category: "GENERAL" as CommunityCategory,
    collegeId: "",
    departmentId: "",
    companyId: "",
    city: "",
    tags: "",
    searchKeywords: "",
    autoJoinEligible: false,
  });

  const departmentsQuery = useDepartmentsQuery(
    form.type === "COLLEGE" ? form.collegeId : undefined
  );

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const result = await createCommunity.mutateAsync({
        name: form.name,
        type: form.type,
        category: form.category,
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
      navigate(`/communities/${result.data.slug}`);
    } catch {
      /* toast handled by mutation */
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Create Community</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Build a space for engineers to connect and collaborate
            </p>
          </div>
          <button
            onClick={onClose}
            className="icon-btn"
            type="button"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form className="p-6 space-y-4" onSubmit={submit}>
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Community Name *
            </label>
            <input
              className="field"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. IIT Bombay Coding Club"
              required
            />
          </div>

          {/* Type + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Type *
              </label>
              <select
                className="field"
                value={form.type}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    type: e.target.value as CommunityType,
                    collegeId: "",
                    departmentId: "",
                    companyId: "",
                    city: "",
                  }))
                }
              >
                {communityTypes.map((t) => (
                  <option key={t} value={t}>
                    {titleCase(t)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Category *
              </label>
              <select
                className="field"
                value={form.category}
                onChange={(e) => set("category", e.target.value as CommunityCategory)}
              >
                {communityCategories.map((c) => (
                  <option key={c} value={c}>
                    {titleCase(c)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* College fields */}
          {form.type === "COLLEGE" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  College *
                </label>
                <select
                  className="field"
                  value={form.collegeId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, collegeId: e.target.value, departmentId: "" }))
                  }
                  required
                >
                  <option value="">Select college</option>
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Department
                </label>
                <select
                  className="field"
                  value={form.departmentId}
                  onChange={(e) => set("departmentId", e.target.value)}
                  disabled={!form.collegeId}
                >
                  <option value="">Optional</option>
                  {(departmentsQuery.data || []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Company fields */}
          {form.type === "COMPANY" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Company *
                </label>
                <select
                  className="field"
                  value={form.companyId}
                  onChange={(e) => set("companyId", e.target.value)}
                  required
                >
                  <option value="">Select company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  City *
                </label>
                <input
                  className="field"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="e.g. Mumbai"
                  required
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Description
            </label>
            <textarea
              className="field min-h-20 resize-none"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What is this community about?"
            />
          </div>

          {/* Tags */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Tags
              </label>
              <input
                className="field"
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="coding, dsa, web (comma-separated)"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Keywords
              </label>
              <input
                className="field"
                value={form.searchKeywords}
                onChange={(e) => set("searchKeywords", e.target.value)}
                placeholder="Search keywords"
              />
            </div>
          </div>

          {/* Auto-join toggle */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
            <input
              type="checkbox"
              checked={form.autoJoinEligible}
              onChange={(e) => set("autoJoinEligible", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
            />
            <div>
              <p className="text-sm font-semibold text-slate-800">Enable auto-join</p>
              <p className="text-xs text-slate-500">
                Students/employees of this institution will automatically join
              </p>
            </div>
          </label>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={createCommunity.isPending}
            >
              {createCommunity.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Plus size={16} />
              )}
              Create Community
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CommunityDetail
// ---------------------------------------------------------------------------

function CommunityDetail({ slug }: { slug: string }) {
  const { user } = useAuth();
  const communityQuery = useCommunityQuery(slug);
  const community = communityQuery.data;
  const archive = useArchiveCommunityMutation(slug);

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

  if (!user) {
    return (
      <EmptyState
        icon={Users}
        title="Login required"
        text="Sign in to explore community spaces."
      />
    );
  }

  if (communityQuery.isLoading) {
    return (
      <div className="space-y-5">
        <div className="panel h-64 animate-pulse bg-slate-50" />
        <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
          <div className="space-y-4">
            <div className="panel h-40 animate-pulse bg-slate-50" />
            <div className="panel h-56 animate-pulse bg-slate-50" />
          </div>
          <div className="panel h-64 animate-pulse bg-slate-50" />
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <EmptyState
        icon={Hash}
        title="Community not found"
        text="This community may have been archived or doesn't exist."
      />
    );
  }

  return (
    <section className="space-y-5">
      {/* Back */}
      <Link
        to="/communities"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
      >
        <ArrowLeft size={15} />
        All Communities
      </Link>

      {/* Hero Card */}
      <div className="panel overflow-hidden">
        {community.bannerUrl ? (
          <img
            className="h-48 w-full object-cover sm:h-56"
            src={community.bannerUrl}
            alt={community.name}
          />
        ) : (
          <div
            className={`h-24 w-full bg-gradient-to-br ${TYPE_GRADIENT[community.type]} opacity-80`}
          />
        )}

        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Identity */}
            <div className="flex min-w-0 items-start gap-4">
              <div className="-mt-10 shrink-0 rounded-2xl border-4 border-white shadow-md">
                <CommunityIcon community={community} size="lg" />
              </div>
              <div className="min-w-0 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900">{community.name}</h1>
                  {community.verified && (
                    <ShieldCheck size={18} className="text-emerald-600" />
                  )}
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{communityScope(community)}</p>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <CategoryBadge value={community.category} />
                  <VisibilityBadge visibility={community.visibility} />
                  {community.autoJoinEligible && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
                      <Sparkles size={10} />
                      Auto-join
                    </span>
                  )}
                  {isMember && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      ✓ Member
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              {!community.archived && (
                <>
                  {isPrivate && !isMember ? (
                    <div
                      title="You'll be automatically added when you register your college or company."
                      className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400"
                    >
                      <Lock size={14} />
                      Private Community
                    </div>
                  ) : isMember && !isOwner ? (
                    <button
                      className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                      type="button"
                      disabled={leaveMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Leave the ${community.name} community?`)) {
                          leaveMutation.mutate(community.id);
                        }
                      }}
                    >
                      {leaveMutation.isPending ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        "Leave Community"
                      )}
                    </button>
                  ) : !isMember ? (
                    <button
                      className="btn-primary"
                      type="button"
                      disabled={joinMutation.isPending}
                      onClick={() => joinMutation.mutate(community.id)}
                    >
                      {joinMutation.isPending ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <>
                          <Plus size={16} />
                          Join Community
                        </>
                      )}
                    </button>
                  ) : null}
                </>
              )}

              {canArchive && !community.archived && (
                <button
                  className="icon-btn"
                  type="button"
                  title="Archive community"
                  disabled={archive.isPending}
                  onClick={() => {
                    if (window.confirm("Archive this community?")) {
                      archive.mutate(community.id);
                    }
                  }}
                >
                  {archive.isPending ? (
                    <Loader2 className="animate-spin" size={15} />
                  ) : (
                    <Archive size={15} />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          {(community.description || community.shortDescription) && (
            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-600">
              {community.description || community.shortDescription}
            </p>
          )}

          {/* Stats bar */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <StatPill
              icon={Users}
              label="Members"
              value={formatCount(community._count?.members ?? community.memberCount ?? 0)}
            />
            <StatPill
              icon={MessageSquare}
              label="Posts"
              value={formatCount(community._count?.posts ?? community.postCount ?? 0)}
            />
            <StatPill
              icon={Hash}
              label="Chats"
              value={formatCount(community._count?.conversations ?? community.conversationCount ?? 0)}
            />
            <StatPill
              icon={TrendingUp}
              label="Trending"
              value={Math.round(community.trendingScore ?? 0)}
            />
            <StatPill
              icon={Sparkles}
              label="Activity"
              value={Math.round(community.activityScore ?? 0)}
            />
            <StatPill
              icon={Users}
              label="Since"
              value={community.createdAt ? formatDate(community.createdAt) : "—"}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        {/* Main column */}
        <div className="space-y-5">
          {/* Conversations */}
          {(community.conversations || []).length > 0 && (
            <div className="panel p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <MessageSquare size={15} className="text-emerald-600" />
                Community Chats
              </h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {(community.conversations || []).map((conv) => (
                  <Link
                    key={conv.id}
                    to={`/chat?conversation=${conv.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-emerald-200 hover:bg-emerald-50/40"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <MessageSquare size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-emerald-800">
                        {conv.title || "General"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {titleCase(conv.category) || "Chat"} ·{" "}
                        {conv.updatedAt ? formatDate(conv.updatedAt) : ""}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Posts */}
          <div className="panel p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Sparkles size={15} className="text-emerald-600" />
              Recent Posts
            </h2>
            <div className="mt-4 space-y-3">
              {(community.posts || []).length ? (
                (community.posts || []).map((post) => (
                  <article
                    key={post.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar user={post.author || post.user} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {post.title || userName(post.author || post.user)}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {userHeadline(post.author || post.user) ||
                            formatDate(post.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
                      {post.content || post.description || "No content."}
                    </p>
                  </article>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-slate-400">
                  No posts yet. Be the first to share something!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          {/* Scope */}
          <div className="panel p-5">
            <h2 className="text-sm font-bold text-slate-900">About</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-500">
              {community.college?.name && (
                <div className="flex items-center gap-2">
                  <GraduationCap size={13} className="text-slate-400" />
                  {community.college.name}
                </div>
              )}
              {community.department?.name && (
                <div className="flex items-center gap-2">
                  <Hash size={13} className="text-slate-400" />
                  {community.department.name} Dept.
                </div>
              )}
              {community.company?.name && (
                <div className="flex items-center gap-2">
                  <Building2 size={13} className="text-slate-400" />
                  {community.company.name}
                </div>
              )}
              {community.city && (
                <div className="flex items-center gap-2">
                  <TrendingUp size={13} className="text-slate-400" />
                  {community.city}
                </div>
              )}
            </div>
            {(community.tags || []).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(community.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="chip text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Members */}
          <div className="panel p-5">
            <h2 className="text-sm font-bold text-slate-900">
              Members ({formatCount(community._count?.members ?? 0)})
            </h2>
            <div className="mt-4 space-y-2">
              {(community.members || []).length ? (
                (community.members || []).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar user={member.user} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {userName(member.user)}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {userHeadline(member.user) || formatDate(member.joinedAt)}
                        </p>
                      </div>
                    </div>
                    {member.role && member.role !== "MEMBER" && (
                      <span className="shrink-0 text-xs font-bold text-emerald-700">
                        {titleCase(member.role)}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-slate-400">
                  Members will appear here.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CommunitiesPage
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

  // Default to explore if user has no joined communities yet
  useEffect(() => {
    if (!joinedQuery.isLoading && !hasSetDefaultTab) {
      if (joinedCommunities.length === 0) {
        setActiveTab("explore");
      }
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
      const haystack = [
        c.name,
        c.description,
        c.type,
        c.category,
        c.college?.name,
        c.company?.name,
        ...(c.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [currentList, query, categoryFilter, typeFilter]);

  const joinedSet = useMemo(
    () => new Set(joinedCommunities.map((c) => c.id)),
    [joinedCommunities]
  );

  const isLoading =
    (activeTab === "joined" ? joinedQuery : suggestedQuery).isLoading;

  if (communitySlug) {
    return <CommunityDetail slug={communitySlug} />;
  }

  return (
    <>
      {/* Create modal */}
      <CreateCommunityModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <section className="space-y-5">
        {/* ── Page Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Communities</h1>
            <p className="mt-1 text-sm text-slate-500">
              Join your college and company spaces, or explore communities built
              for engineers.
            </p>
          </div>
          {user && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={16} />
              Create Community
            </button>
          )}
        </div>

        {/* ── Tabs ── */}
        {user && (
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setActiveTab("joined")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all duration-150 ${
                activeTab === "joined"
                  ? "bg-emerald-700 text-white shadow"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Users size={15} />
              My Communities
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  activeTab === "joined"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {joinedCommunities.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("explore")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all duration-150 ${
                activeTab === "explore"
                  ? "bg-emerald-700 text-white shadow"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Compass size={15} />
              Explore
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  activeTab === "explore"
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {suggestedCommunities.length}
              </span>
            </button>
          </div>
        )}

        {/* ── Search + Filters ── */}
        <div className="panel p-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchRef}
                className="field pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  activeTab === "joined"
                    ? "Search my communities…"
                    : "Search communities…"
                }
                disabled={!user}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`icon-btn gap-1 px-3 text-xs font-semibold ${
                showFilters || categoryFilter || typeFilter
                  ? "border-emerald-400 text-emerald-700"
                  : ""
              }`}
              disabled={!user}
            >
              <LayoutGrid size={14} />
              <ChevronDown
                size={12}
                className={`transition-transform ${showFilters ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {/* Filter row */}
          {showFilters && user && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-semibold text-slate-500">Type:</span>
              {(["", "GENERAL", "COLLEGE", "COMPANY"] as (CommunityType | "")[]).map(
                (t) => (
                  <button
                    key={t || "all-type"}
                    type="button"
                    onClick={() => setTypeFilter(t)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      typeFilter === t
                        ? "border-emerald-500 bg-emerald-600 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300"
                    }`}
                  >
                    {t ? titleCase(t) : "All"}
                  </button>
                )
              )}

              <span className="ml-3 text-xs font-semibold text-slate-500">Category:</span>
              {(
                [
                  "",
                  "CODING",
                  "PLACEMENTS",
                  "INTERNSHIPS",
                  "REFERRALS",
                  "INTERVIEWS",
                  "RESOURCES",
                ] as (CommunityCategory | "")[]
              ).map((c) => (
                <button
                  key={c || "all-cat"}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    categoryFilter === c
                      ? "border-emerald-500 bg-emerald-600 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300"
                  }`}
                >
                  {c ? titleCase(c) : "All"}
                </button>
              ))}

              {(categoryFilter || typeFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter("");
                    setTypeFilter("");
                  }}
                  className="ml-auto flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-700"
                >
                  <X size={12} />
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Grid ── */}
        {!user ? (
          <EmptyState
            icon={Users}
            title="Sign in to view communities"
            text="Join communities from your college, company, or engineering interests."
          />
        ) : isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredCommunities.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCommunities.map((community) => (
              <CommunityCard
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
            title={query ? "No communities match your search" : "No communities joined yet"}
            text={
              query
                ? "Try a different search term or clear your filters."
                : "You'll be auto-joined when you add your college or company. You can also explore and manually join open communities."
            }
            action={
              !query ? (
                <button
                  type="button"
                  className="btn-primary mt-2"
                  onClick={() => setActiveTab("explore")}
                >
                  <Compass size={16} />
                  Explore Communities
                </button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            icon={Hash}
            title={query ? "No communities match your search" : "No suggestions yet"}
            text={
              query
                ? "Try a different search term or clear your filters."
                : "Community suggestions grow as your profile and activity build up."
            }
          />
        )}
      </section>
    </>
  );
}
