import { FormEvent, ReactNode, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  Compass,
  Hash,
  Loader2,
  MessageSquare,
  Newspaper,
  Rocket,
  Search,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { EngineerCard } from "../components/cards/SocialCards";
import { HackathonCard } from "../components/cards/HackathonCard";
import { JobCard } from "../components/cards/JobCard";
import { ProjectCard } from "../components/cards/ProjectCard";
import { Avatar, EmptyState, InlineLoader, Metric } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import {
  useConnectUserMutation,
  useCreateDirectConversationMutation,
  useDiscoveryFeedQuery,
  useFollowUserMutation,
  useJoinProjectMutation,
  usePlatformSearchMutation,
  useSuggestedCollaboratorsQuery,
  useSuggestedCommunitiesQuery,
  useSuggestedCompaniesQuery,
  useSuggestedEngineersQuery,
  useSuggestedHackathonsQuery,
  useSuggestedJobsQuery,
  useSuggestedMentorsQuery,
  useSuggestedPostsQuery,
  useSuggestedProjectsQuery,
  useSuggestedRecruitersQuery,
  useSuggestedTeammatesQuery,
} from "../hooks/usePlatformQueries";
import {
  Community,
  Company,
  FeedItem,
  FeedPost,
  Hackathon,
  Job,
  Project,
  SearchResults,
  User,
} from "../lib/api";
import {
  formatCount,
  formatDate,
  tagValues,
  titleCase,
  userHeadline,
  userName,
} from "../lib/format";

type TabKey =
  | "all"
  | "people"
  | "projects"
  | "jobs"
  | "hackathons"
  | "companies"
  | "posts"
  | "communities";

const tabs: Array<{ key: TabKey; label: string; icon: typeof Search }> = [
  { key: "all", label: "All", icon: Search },
  { key: "people", label: "People", icon: Users },
  { key: "projects", label: "Projects", icon: Rocket },
  { key: "jobs", label: "Jobs", icon: BriefcaseBusiness },
  { key: "hackathons", label: "Hackathons", icon: Trophy },
  { key: "companies", label: "Companies", icon: Building2 },
  { key: "posts", label: "Posts", icon: Newspaper },
  { key: "communities", label: "Communities", icon: Hash },
];

const countResults = (results?: SearchResults) =>
  results
    ? [
        results.users,
        results.projects,
        results.hackathons,
        results.jobs,
        results.companies,
        results.posts as FeedPost[] | undefined,
        results.communities,
      ].reduce((total, items) => total + (items?.length || 0), 0)
    : 0;

const feedTitle = (item: FeedItem) => {
  if (item.type === "PROJECT") return (item.data as Project).title;
  if (item.type === "JOB") return (item.data as Job).title;
  if (item.type === "POST") return (item.data as FeedPost).content;
  return String((item.data as Record<string, unknown>).name || item.type);
};

export function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const search = usePlatformSearchMutation();
  const joinProject = useJoinProjectMutation();
  const followUser = useFollowUserMutation();
  const connectUser = useConnectUserMutation();
  const createDirectConversation = useCreateDirectConversationMutation();

  const discoveryFeed = useDiscoveryFeedQuery();
  const engineers = useSuggestedEngineersQuery(8);
  const mentors = useSuggestedMentorsQuery(6);
  const recruiters = useSuggestedRecruitersQuery(6);
  const collaborators = useSuggestedCollaboratorsQuery(6);
  const teammates = useSuggestedTeammatesQuery(6);
  const projects = useSuggestedProjectsQuery(6);
  const jobs = useSuggestedJobsQuery(6);
  const hackathons = useSuggestedHackathonsQuery(6);
  const companies = useSuggestedCompaniesQuery(6);
  const posts = useSuggestedPostsQuery(6);
  const communities = useSuggestedCommunitiesQuery(6);

  const searchResults = search.data;
  const resultCount = countResults(searchResults);
  const loadingSuggestions =
    engineers.isFetching ||
    projects.isFetching ||
    jobs.isFetching ||
    hackathons.isFetching ||
    companies.isFetching ||
    posts.isFetching ||
    communities.isFetching;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    search.mutate(query);
  };

  const openMessage = async (target: User) => {
    const result = await createDirectConversation.mutateAsync(target.id);
    navigate(`/chat/${result.data.id}`);
  };

  const searchSections = useMemo(
    () => [
      {
        key: "people" as const,
        title: "People",
        icon: Users,
        count: searchResults?.users?.length || 0,
        content: (
          <PeopleGrid
            users={searchResults?.users || []}
            onConnect={(foundUser) => connectUser.mutate(foundUser.id)}
            onFollow={(foundUser) => followUser.mutate(foundUser.id)}
            onMessage={openMessage}
            onOpenProfile={(foundUser) => navigate(`/users/${foundUser.id}`)}
            disabled={!user}
          />
        ),
      },
      {
        key: "projects" as const,
        title: "Projects",
        icon: Rocket,
        count: searchResults?.projects?.length || 0,
        content: (
          <ProjectGrid
            currentUserId={user?.id}
            onJoin={(project) => joinProject.mutate(project)}
            projects={searchResults?.projects || []}
          />
        ),
      },
      {
        key: "jobs" as const,
        title: "Jobs",
        icon: BriefcaseBusiness,
        count: searchResults?.jobs?.length || 0,
        content: <JobGrid jobs={searchResults?.jobs || []} />,
      },
      {
        key: "hackathons" as const,
        title: "Hackathons",
        icon: Trophy,
        count: searchResults?.hackathons?.length || 0,
        content: <HackathonGrid hackathons={searchResults?.hackathons || []} />,
      },
      {
        key: "companies" as const,
        title: "Companies",
        icon: Building2,
        count: searchResults?.companies?.length || 0,
        content: <CompanyGrid companies={searchResults?.companies || []} />,
      },
      {
        key: "posts" as const,
        title: "Posts",
        icon: Newspaper,
        count: ((searchResults?.posts as FeedPost[] | undefined) || []).length,
        content: <PostGrid posts={(searchResults?.posts as FeedPost[] | undefined) || []} />,
      },
      {
        key: "communities" as const,
        title: "Communities",
        icon: Hash,
        count: searchResults?.communities?.length || 0,
        content: <CommunityGrid communities={searchResults?.communities || []} />,
      },
    ],
    [
      connectUser,
      followUser,
      joinProject,
      navigate,
      openMessage,
      searchResults,
      user,
    ],
  );

  const visibleSearchSections =
    activeTab === "all"
      ? searchSections.filter((section) => section.count > 0)
      : searchSections.filter((section) => section.key === activeTab);

  return (
    <section className="space-y-6">
      <div className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="text-emerald-700" size={20} />
              <h1 className="text-xl font-bold text-slate-950">Discover</h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Search the platform and explore personalized suggestions.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-right">
            <Metric label="Results" value={resultCount} />
            <Metric label="For you" value={discoveryFeed.data?.length || 0} />
            <Metric label="API" value={loadingSuggestions ? "Sync" : "Ready"} />
          </div>
        </div>

        <form className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={submit}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
            <input
              className="field pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search engineers, projects, jobs, companies, communities"
            />
          </div>
          <button className="btn-primary" type="submit" disabled={search.isPending}>
            {search.isPending ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            Search
          </button>
        </form>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;

            return (
              <button
                className={`inline-flex min-w-max items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-800"
                }`}
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {searchResults ? (
        <div className="space-y-5">
          {visibleSearchSections.length ? (
            visibleSearchSections.map((section) => (
              <DiscoverySection
                count={section.count}
                icon={section.icon}
                key={section.key}
                title={section.title}
              >
                {section.content}
              </DiscoverySection>
            ))
          ) : (
            <EmptyState icon={Search} title="No results found" text="Try a broader search." />
          )}
        </div>
      ) : (
        <PersonalizedDiscovery
          canInteract={Boolean(user)}
          collaborators={collaborators.data || []}
          communities={communities.data || []}
          companies={companies.data || []}
          discoveryFeed={discoveryFeed.data || []}
          engineers={engineers.data || []}
          hackathons={hackathons.data || []}
          jobs={jobs.data || []}
          loading={loadingSuggestions}
          mentors={mentors.data || []}
          onConnect={(foundUser) => connectUser.mutate(foundUser.id)}
          onFollow={(foundUser) => followUser.mutate(foundUser.id)}
          onJoin={(project) => joinProject.mutate(project)}
          onMessage={openMessage}
          onOpenProfile={(foundUser) => navigate(`/users/${foundUser.id}`)}
          posts={posts.data || []}
          projects={projects.data || []}
          recruiters={recruiters.data || []}
          teammates={teammates.data || []}
          user={user}
        />
      )}
    </section>
  );
}

function PersonalizedDiscovery({
  canInteract,
  collaborators,
  communities,
  companies,
  discoveryFeed,
  engineers,
  hackathons,
  jobs,
  loading,
  mentors,
  onConnect,
  onFollow,
  onJoin,
  onMessage,
  onOpenProfile,
  posts,
  projects,
  recruiters,
  teammates,
  user,
}: {
  canInteract: boolean;
  collaborators: User[];
  communities: Community[];
  companies: Company[];
  discoveryFeed: FeedItem[];
  engineers: User[];
  hackathons: Hackathon[];
  jobs: Job[];
  loading: boolean;
  mentors: User[];
  onConnect: (user: User) => void;
  onFollow: (user: User) => void;
  onJoin: (project: Project) => void;
  onMessage: (user: User) => void;
  onOpenProfile: (user: User) => void;
  posts: FeedPost[];
  projects: Project[];
  recruiters: User[];
  teammates: User[];
  user: User | null;
}) {
  if (!user) {
    return (
      <EmptyState
        icon={UserRound}
        title="Login required"
        text="Discovery suggestions use your profile, skills, activity, and network."
      />
    );
  }

  return (
    <div className="space-y-5">
      {loading && <InlineLoader label="Refreshing suggestions" />}

      <DiscoverySection count={discoveryFeed.length} icon={Compass} title="Discovery feed">
        {discoveryFeed.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {discoveryFeed.slice(0, 6).map((item, index) => (
              <FeedSuggestionCard item={item} key={`${item.type}-${index}`} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Compass} title="No discovery feed yet" text="Suggestions will appear as your profile grows." />
        )}
      </DiscoverySection>

      <DiscoverySection count={engineers.length} icon={Users} title="Suggested engineers">
        <PeopleGrid
          disabled={!canInteract}
          onConnect={onConnect}
          onFollow={onFollow}
          onMessage={onMessage}
          onOpenProfile={onOpenProfile}
          users={engineers}
        />
      </DiscoverySection>

      <div className="grid gap-5 xl:grid-cols-2">
        <DiscoverySection count={mentors.length} icon={UserRound} title="Mentors">
          <PeopleGrid disabled={!canInteract} onMessage={onMessage} onOpenProfile={onOpenProfile} users={mentors} />
        </DiscoverySection>
        <DiscoverySection count={recruiters.length} icon={BriefcaseBusiness} title="Recruiters">
          <PeopleGrid disabled={!canInteract} onMessage={onMessage} onOpenProfile={onOpenProfile} users={recruiters} />
        </DiscoverySection>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <DiscoverySection count={collaborators.length} icon={Users} title="Collaborators">
          <PeopleGrid disabled={!canInteract} onConnect={onConnect} onOpenProfile={onOpenProfile} users={collaborators} />
        </DiscoverySection>
        <DiscoverySection count={teammates.length} icon={Users} title="Teammates">
          <PeopleGrid disabled={!canInteract} onConnect={onConnect} onOpenProfile={onOpenProfile} users={teammates} />
        </DiscoverySection>
      </div>

      <DiscoverySection count={projects.length} icon={Rocket} title="Suggested projects">
        <ProjectGrid currentUserId={user.id} onJoin={onJoin} projects={projects} />
      </DiscoverySection>

      <div className="grid gap-5 xl:grid-cols-2">
        <DiscoverySection count={jobs.length} icon={BriefcaseBusiness} title="Suggested jobs">
          <JobGrid jobs={jobs} />
        </DiscoverySection>
        <DiscoverySection count={hackathons.length} icon={Trophy} title="Suggested hackathons">
          <HackathonGrid hackathons={hackathons} />
        </DiscoverySection>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <DiscoverySection count={companies.length} icon={Building2} title="Companies">
          <CompanyGrid companies={companies} />
        </DiscoverySection>
        <DiscoverySection count={communities.length} icon={Hash} title="Communities">
          <CommunityGrid communities={communities} />
        </DiscoverySection>
      </div>

      <DiscoverySection count={posts.length} icon={Newspaper} title="Suggested posts">
        <PostGrid posts={posts} />
      </DiscoverySection>
    </div>
  );
}

function DiscoverySection({
  children,
  count,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  count: number;
  icon: typeof Search;
  title: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="text-emerald-700" size={18} />
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        </div>
        <span className="chip">{formatCount(count)}</span>
      </div>
      {children}
    </section>
  );
}

function PeopleGrid({
  disabled,
  onConnect,
  onFollow,
  onMessage,
  onOpenProfile,
  users,
}: {
  disabled?: boolean;
  onConnect?: (user: User) => void;
  onFollow?: (user: User) => void;
  onMessage?: (user: User) => void;
  onOpenProfile: (user: User) => void;
  users: User[];
}) {
  if (!users.length) {
    return <EmptyState icon={Users} title="No people found" text="Try another keyword or complete your profile." />;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {users.map((foundUser) => (
        <EngineerCard
          disabled={disabled}
          key={foundUser.id}
          onConnect={onConnect}
          onFollow={onFollow}
          onMessage={onMessage}
          onOpenProfile={onOpenProfile}
          user={foundUser}
        />
      ))}
    </div>
  );
}

function ProjectGrid({
  currentUserId,
  onJoin,
  projects,
}: {
  currentUserId?: string;
  onJoin: (project: Project) => void;
  projects: Project[];
}) {
  if (!projects.length) {
    return <EmptyState icon={Rocket} title="No projects found" text="Try another keyword or add more skills." />;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {projects.map((project) => (
        <ProjectCard
          currentUserId={currentUserId}
          key={project.id}
          onJoin={onJoin}
          project={project}
        />
      ))}
    </div>
  );
}

function JobGrid({ jobs }: { jobs: Job[] }) {
  if (!jobs.length) {
    return <EmptyState icon={BriefcaseBusiness} title="No jobs found" text="Try another keyword or update your skills." />;
  }

  return (
    <div className="grid gap-5">
      {jobs.map((job) => (
        <JobCard job={job} key={job.id} />
      ))}
    </div>
  );
}

function HackathonGrid({ hackathons }: { hackathons: Hackathon[] }) {
  if (!hackathons.length) {
    return <EmptyState icon={Trophy} title="No hackathons found" text="Try another keyword." />;
  }

  return (
    <div className="grid gap-5">
      {hackathons.map((hackathon) => (
        <HackathonCard hackathon={hackathon} key={hackathon.id} />
      ))}
    </div>
  );
}

function CompanyGrid({ companies }: { companies: Company[] }) {
  if (!companies.length) {
    return <EmptyState icon={Building2} title="No companies found" text="Try another keyword." />;
  }

  return (
    <div className="grid gap-5">
      {companies.map((company) => (
        <CompanySuggestionCard company={company} key={company.id} />
      ))}
    </div>
  );
}

function CommunityGrid({ communities }: { communities: Community[] }) {
  if (!communities.length) {
    return <EmptyState icon={Hash} title="No communities found" text="Try another keyword." />;
  }

  return (
    <div className="grid gap-5">
      {communities.map((community) => (
        <CommunitySuggestionCard community={community} key={community.id} />
      ))}
    </div>
  );
}

function PostGrid({ posts }: { posts: FeedPost[] }) {
  if (!posts.length) {
    return <EmptyState icon={Newspaper} title="No posts found" text="Try another keyword." />;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {posts.map((post) => (
        <PostSuggestionCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function CompanySuggestionCard({ company }: { company: Company }) {
  return (
    <article className="panel p-5">
      <div className="flex items-start gap-4">
        {company.logoUrl ? (
          <img className="h-11 w-11 rounded-md object-cover" src={company.logoUrl} alt={company.name} />
        ) : (
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
            <Building2 size={20} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-950">
            <Link className="hover:text-emerald-700" to={`/companies/${company.slug}`}>
              {company.name}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {[company.industry, company.headquarters, titleCase(company.size)].filter(Boolean).join(" - ") || "Company"}
          </p>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
            {company.tagline || company.description}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {company.verified && <span className="chip text-emerald-700">Verified</span>}
        {company.hiringEnabled && <span className="chip">Hiring</span>}
        {company.referralEnabled && <span className="chip">Referrals</span>}
      </div>
    </article>
  );
}

function CommunitySuggestionCard({ community }: { community: Community }) {
  return (
    <article className="panel p-5">
      <div className="flex items-start gap-4">
        {community.avatarUrl ? (
          <img className="h-11 w-11 rounded-md object-cover" src={community.avatarUrl} alt={community.name} />
        ) : (
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <Hash size={20} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-950">
            <Link className="hover:text-emerald-700" to={`/communities/${community.slug}`}>
              {community.name}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {[titleCase(community.type), titleCase(community.category)].filter(Boolean).join(" - ")}
          </p>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
            {community.shortDescription || community.description}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <Metric label="Members" value={formatCount(community.memberCount || community._count?.members)} />
        <Metric label="Posts" value={formatCount(community.postCount || community._count?.posts)} />
        <Metric label="Trend" value={Math.round(community.trendingScore || 0)} />
      </div>
    </article>
  );
}

function PostSuggestionCard({ post }: { post: FeedPost }) {
  const tags = tagValues(post.tags);
  const author = post.author || post.user;

  return (
    <article className="panel p-5">
      <div className="flex items-start gap-3">
        <Avatar user={author} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-950">
            {userName(author)}
          </div>
          <div className="truncate text-xs text-slate-500">
            {titleCase(post.type)} {post.createdAt ? `- ${formatDate(post.createdAt)}` : ""}
          </div>
        </div>
      </div>
      <p className="mt-4 line-clamp-4 whitespace-pre-line text-sm leading-6 text-slate-700">
        {post.content || post.description || post.title}
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
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span>{formatCount(post.likesCount)} likes</span>
        <span>{formatCount(post.commentsCount)} comments</span>
      </div>
    </article>
  );
}

function FeedSuggestionCard({ item }: { item: FeedItem }) {
  return (
    <article className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-semibold text-slate-950">
            {feedTitle(item) || titleCase(item.type)}
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
            {item.reason || "Recommended from your profile and activity."}
          </p>
        </div>
        <span className="chip shrink-0">{titleCase(item.type)}</span>
      </div>
    </article>
  );
}
