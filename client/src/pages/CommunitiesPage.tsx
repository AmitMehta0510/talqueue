import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Building2,
  GraduationCap,
  Hash,
  Loader2,
  MessageSquare,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Avatar, EmptyState, Metric } from "../components/ui";
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

const flattenColleges = (pages?: Array<{ colleges: College[] }>) =>
  (pages || []).flatMap((page) => page.colleges || []);

function CommunityAvatar({ community }: { community: Community }) {
  if (community.avatarUrl) {
    return (
      <img
        className="h-11 w-11 rounded-md object-cover"
        src={community.avatarUrl}
        alt={community.name}
      />
    );
  }

  const Icon =
    community.type === "COLLEGE" ? GraduationCap : community.type === "COMPANY" ? Building2 : Hash;

  return (
    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
      <Icon size={21} />
    </div>
  );
}

function StatusBadge({ value }: { value?: string | null }) {
  return <span className="chip">{titleCase(value) || "Unknown"}</span>;
}

function CommunityCard({
  community,
  context,
  isMember,
}: {
  community: Community;
  context?: string;
  isMember: boolean;
}) {
  const { user: currentUser } = useAuth();
  const joinMutation = useJoinCommunityMutation(community.slug);
  const leaveMutation = useLeaveCommunityMutation(community.slug);

  const scope =
    community.college?.name ||
    community.department?.name ||
    community.company?.name ||
    [community.city, community.state].filter(Boolean).join(", ") ||
    titleCase(community.type);

  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <CommunityAvatar community={community} />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-slate-950">{community.name}</h3>
              {community.verified && (
                <span className="chip shrink-0 text-emerald-700">
                  <ShieldCheck size={13} />
                  Verified
                </span>
              )}
            </div>
            <p className="truncate text-xs text-slate-500">{scope}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link className="btn-secondary px-3 py-1.5 font-semibold text-xs" to={`/communities/${community.slug}`}>
            Open
          </Link>
          {currentUser && (
            isMember ? (
              community.createdById !== currentUser.id && (
                <button
                  type="button"
                  disabled={leaveMutation.isPending}
                  onClick={() => {
                    if (window.confirm(`Leave the ${community.name} community?`)) {
                      leaveMutation.mutate(community.id);
                    }
                  }}
                  className="btn-secondary px-3 py-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 hover:border-rose-250 border-rose-200 font-semibold"
                >
                  {leaveMutation.isPending ? <Loader2 className="animate-spin" size={13} /> : "Leave"}
                </button>
              )
            ) : (
              <button
                type="button"
                disabled={joinMutation.isPending}
                onClick={() => joinMutation.mutate(community.id)}
                className="btn-primary px-3 py-1.5 text-xs font-semibold"
              >
                {joinMutation.isPending ? <Loader2 className="animate-spin" size={13} /> : "Join"}
              </button>
            )
          )}
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
        {community.shortDescription || community.description || "Community details will appear here."}
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Metric label="Members" value={formatCount(community._count?.members || community.memberCount)} />
        <Metric label="Posts" value={formatCount(community._count?.posts || community.postCount)} />
        <Metric label="Chats" value={formatCount(community._count?.conversations || community.conversationCount)} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {context && <span className="chip">{context}</span>}
        <StatusBadge value={community.type} />
        <StatusBadge value={community.category} />
        {community.recommendationScore !== undefined && <span className="chip">Score {community.recommendationScore}</span>}
        {(community.tags || []).slice(0, 4).map((tag) => (
          <span className="chip" key={tag}>
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}

function CreateCommunityPanel({ disabled }: { disabled?: boolean }) {
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
  const departmentsQuery = useDepartmentsQuery(form.type === "COLLEGE" ? form.collegeId : undefined);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

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

      setForm({
        name: "",
        description: "",
        type: "GENERAL",
        category: "GENERAL",
        collegeId: "",
        departmentId: "",
        companyId: "",
        city: "",
        tags: "",
        searchKeywords: "",
        autoJoinEligible: false,
      });
      navigate(`/communities/${result.data.slug}`);
    } catch {
      return;
    }
  };

  return (
    <form className="panel p-5" onSubmit={submit}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Communities</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create general groups or browse recommended college and company communities.
          </p>
        </div>
        <button className="btn-primary" type="submit" disabled={disabled || createCommunity.isPending}>
          {createCommunity.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          Create
        </button>
      </div>

      <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
        <div className="grid gap-3 md:grid-cols-[1fr_12rem_12rem]">
          <input
            className="field"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Community name"
            required
          />
          <select
            className="field"
            value={form.type}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                type: event.target.value as CommunityType,
                collegeId: "",
                departmentId: "",
                companyId: "",
                city: "",
              }))
            }
          >
            {communityTypes.map((type) => (
              <option key={type} value={type}>
                {titleCase(type)}
              </option>
            ))}
          </select>
          <select
            className="field"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as CommunityCategory }))}
          >
            {communityCategories.map((category) => (
              <option key={category} value={category}>
                {titleCase(category)}
              </option>
            ))}
          </select>
        </div>

        <textarea
          className="field min-h-24"
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="Description"
        />

        {form.type === "COLLEGE" && (
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="field"
              value={form.collegeId}
              onChange={(event) =>
                setForm((current) => ({ ...current, collegeId: event.target.value, departmentId: "" }))
              }
              required
            >
              <option value="">College</option>
              {colleges.map((college) => (
                <option key={college.id} value={college.id}>
                  {college.name}
                </option>
              ))}
            </select>
            <select
              className="field"
              value={form.departmentId}
              onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value }))}
              disabled={!form.collegeId}
            >
              <option value="">Department optional</option>
              {(departmentsQuery.data || []).map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {form.type === "COMPANY" && (
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="field"
              value={form.companyId}
              onChange={(event) => setForm((current) => ({ ...current, companyId: event.target.value }))}
              required
            >
              <option value="">Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <input
              className="field"
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              placeholder="City"
              required
            />
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="field"
            value={form.tags}
            onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
            placeholder="Tags, comma separated"
          />
          <input
            className="field"
            value={form.searchKeywords}
            onChange={(event) => setForm((current) => ({ ...current, searchKeywords: event.target.value }))}
            placeholder="Search keywords"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.autoJoinEligible}
            onChange={(event) => setForm((current) => ({ ...current, autoJoinEligible: event.target.checked }))}
          />
          Auto-join eligible
        </label>
      </div>
    </form>
  );
}

function CommunityDetail({ slug }: { slug: string }) {
  const { user } = useAuth();
  const communityQuery = useCommunityQuery(slug);
  const community = communityQuery.data;
  const archive = useArchiveCommunityMutation(slug);

  const joinedQuery = useJoinedCommunitiesQuery();
  const joinedCommunities = joinedQuery.data || [];
  const isMember = joinedCommunities.some((jc) => jc.id === community?.id);

  const joinMutation = useJoinCommunityMutation(slug);
  const leaveMutation = useLeaveCommunityMutation(slug);

  const canArchive = useMemo(() => {
    if (!user || !community) return false;
    if (community.createdById === user.id) return true;

    return (community.members || []).some(
      (member) => member.userId === user.id && ["OWNER", "ADMIN"].includes(member.role || ""),
    );
  }, [community, user]);

  if (!user) {
    return <EmptyState icon={Users} title="Login required" text="Sign in to open community spaces." />;
  }

  if (communityQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="animate-spin" size={16} />
        Loading community
      </div>
    );
  }

  if (!community) {
    return <EmptyState icon={Hash} title="Community not found" text="This community is unavailable." />;
  }

  return (
    <section className="space-y-5">
      <Link className="text-sm font-semibold text-emerald-700 hover:text-emerald-900" to="/communities">
        Back to communities
      </Link>

      <div className="panel overflow-hidden">
        {community.bannerUrl && (
          <img className="h-48 w-full object-cover sm:h-64" src={community.bannerUrl} alt={community.name} />
        )}
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 gap-4">
              <CommunityAvatar community={community} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-950">{community.name}</h2>
                  {community.verified && (
                    <span className="chip text-emerald-700">
                      <ShieldCheck size={13} />
                      Verified
                    </span>
                  )}
                  <StatusBadge value={community.type} />
                  <StatusBadge value={community.category} />
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  {community.description || community.shortDescription || "No community description yet."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!community.archived && (
                isMember ? (
                  community.createdById !== user.id && (
                    <button
                      className="btn-secondary text-rose-600 hover:text-rose-800 hover:bg-rose-50 hover:border-rose-250 border-rose-200"
                      type="button"
                      disabled={leaveMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Leave the ${community.name} community?`)) {
                          leaveMutation.mutate(community.id);
                        }
                      }}
                    >
                      {leaveMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : "Leave Community"}
                    </button>
                  )
                ) : (
                  <button
                    className="btn-primary"
                    type="button"
                    disabled={joinMutation.isPending}
                    onClick={() => joinMutation.mutate(community.id)}
                  >
                    {joinMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : "Join Community"}
                  </button>
                )
              )}
              {canArchive && !community.archived && (
                <button
                  className="btn-secondary"
                  type="button"
                  disabled={archive.isPending}
                  onClick={() => {
                    if (window.confirm("Archive this community?")) {
                      archive.mutate(community.id);
                    }
                  }}
                >
                  {archive.isPending ? <Loader2 className="animate-spin" size={16} /> : <Archive size={16} />}
                  Archive
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Metric label="Members" value={formatCount(community._count?.members || community.memberCount)} />
            <Metric label="Posts" value={formatCount(community._count?.posts || community.postCount)} />
            <Metric label="Chats" value={formatCount(community._count?.conversations || community.conversationCount)} />
            <Metric label="Trend" value={Math.round(community.trendingScore || 0)} />
            <Metric label="Activity" value={Math.round(community.activityScore || 0)} />
            <Metric label="Created" value={community.createdAt ? formatDate(community.createdAt) : "New"} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_23rem]">
        <div className="space-y-5">
          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-slate-950">Recent posts</h3>
            <div className="mt-4 space-y-3">
              {(community.posts || []).length ? (
                (community.posts || []).map((post) => (
                  <article className="rounded-md border border-slate-100 p-3" key={post.id}>
                    <div className="flex items-center gap-3">
                      <Avatar user={post.author || post.user} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {post.title || userName(post.author || post.user)}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {userHeadline(post.author || post.user) || formatDate(post.createdAt)}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                      {post.content || post.description || "No post content."}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-slate-500">No posts yet.</p>
              )}
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-slate-950">Conversations</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(community.conversations || []).length ? (
                (community.conversations || []).map((conversation) => (
                  <div className="rounded-md border border-slate-100 p-3" key={conversation.id}>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <MessageSquare size={15} />
                      {conversation.title || "Conversation"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {titleCase(conversation.category) || "General"} - {formatDate(conversation.updatedAt)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No conversations yet.</p>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-slate-950">Community scope</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {community.college?.name && <span className="chip">{community.college.name}</span>}
              {community.department?.name && <span className="chip">{community.department.name}</span>}
              {community.company?.name && <span className="chip">{community.company.name}</span>}
              {community.city && <span className="chip">{community.city}</span>}
              <StatusBadge value={community.visibility} />
              {community.autoJoinEligible && <span className="chip">Auto-join</span>}
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-slate-950">Members</h3>
            <div className="mt-4 space-y-3">
              {(community.members || []).length ? (
                (community.members || []).map((member) => (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3" key={member.id}>
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar user={member.user} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{userName(member.user)}</div>
                        <div className="truncate text-xs text-slate-500">
                          {userHeadline(member.user) || formatDate(member.joinedAt)}
                        </div>
                      </div>
                    </div>
                    <StatusBadge value={member.role} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Members will appear here.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function CommunitiesPage() {
  const { communitySlug } = useParams();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"joined" | "explore">("joined");
  const [hasSetDefaultTab, setHasSetDefaultTab] = useState(false);

  const suggestedQuery = useSuggestedCommunitiesQuery();
  const communities = suggestedQuery.data || [];

  const joinedQuery = useJoinedCommunitiesQuery();
  const joinedCommunities = joinedQuery.data || [];

  useEffect(() => {
    if (!joinedQuery.isLoading && !hasSetDefaultTab) {
      if (joinedCommunities.length === 0) {
        setActiveTab("explore");
      }
      setHasSetDefaultTab(true);
    }
  }, [joinedQuery.isLoading, joinedCommunities.length, hasSetDefaultTab]);

  const currentList = activeTab === "joined" ? joinedCommunities : communities;

  const filteredCommunities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return currentList.filter((community) => {
      const haystack = [
        community.name,
        community.description,
        community.type,
        community.category,
        community.college?.name,
        community.company?.name,
        ...(community.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !normalizedQuery || haystack.includes(normalizedQuery);
    });
  }, [currentList, query]);

  if (communitySlug) {
    return <CommunityDetail slug={communitySlug} />;
  }

  return (
    <section className="space-y-5">
      <CreateCommunityPanel disabled={!user} />

      {/* Tabs */}
      {user && (
        <div className="flex border-b border-slate-200 bg-white rounded-xl border p-1 shadow-sm overflow-x-auto">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all
              ${activeTab === "joined"
                ? "bg-emerald-700 text-white shadow"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            onClick={() => setActiveTab("joined")}
          >
            My Communities ({joinedCommunities.length})
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all
              ${activeTab === "explore"
                ? "bg-emerald-700 text-white shadow"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            onClick={() => setActiveTab("explore")}
          >
            Explore Communities ({communities.length})
          </button>
        </div>
      )}

      <div className="panel p-4">
        <input
          className="field"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={activeTab === "joined" ? "Filter my communities" : "Filter suggested communities"}
          disabled={!user}
        />
      </div>

      {(suggestedQuery.isFetching || joinedQuery.isFetching) && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={16} />
          Loading communities
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {!user ? (
          <EmptyState icon={Users} title="Login required" text="Sign in to view personalized community suggestions." />
        ) : filteredCommunities.length ? (
          filteredCommunities.map((community) => {
            const isMember = joinedCommunities.some((jc) => jc.id === community.id);
            return (
              <CommunityCard
                community={community}
                context={activeTab === "joined" ? "Joined" : "Suggested"}
                isMember={isMember}
                key={community.id}
              />
            );
          })
        ) : activeTab === "joined" ? (
          <div className="xl:col-span-2">
            <EmptyState
              icon={Users}
              title="No communities joined"
              text="You haven't joined any communities yet. Check out the Explore tab to find spaces for your college or interests!"
              action={
                <button
                  type="button"
                  className="btn-primary mt-2"
                  onClick={() => setActiveTab("explore")}
                >
                  Explore Communities
                </button>
              }
            />
          </div>
        ) : (
          <div className="xl:col-span-2">
            <EmptyState
              icon={Hash}
              title="No communities suggested"
              text="Community suggestions will appear as your profile and activity grow."
            />
          </div>
        )}
      </div>
    </section>
  );
}
