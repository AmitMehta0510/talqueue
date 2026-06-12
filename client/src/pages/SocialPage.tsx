import { FormEvent, useMemo, useState } from "react";
import { Check, Inbox, Loader2, Search, UserCheck, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EngineerCard } from "../components/cards/SocialCards";
import { Avatar, EmptyState } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import {
  useConnectUserMutation,
  useCreateDirectConversationMutation,
  useConnectionsQuery,
  useFollowUserMutation,
  useFollowersQuery,
  useFollowingQuery,
  useNotificationsQuery,
  usePlatformSearchMutation,
  useReviewConnectionMutation,
  useSuggestedConnectionsQuery,
} from "../hooks/usePlatformQueries";
import { ConnectionsPage, FollowersPage, FollowingPage, PlatformNotification, User } from "../lib/api";
import { formatDate, titleCase, userHeadline, userName } from "../lib/format";

type SocialTab = "suggested" | "connections" | "followers" | "following";

const tabs: Array<{ id: SocialTab; label: string }> = [
  { id: "suggested", label: "Suggested" },
  { id: "connections", label: "Connections" },
  { id: "followers", label: "Followers" },
  { id: "following", label: "Following" },
];

const flattenPages = <T, K extends string>(pages: Array<Record<K, T[]>>, key: K) =>
  pages.flatMap((page) => page[key] || []);

const connectionIdFromNotification = (notification: PlatformNotification) => {
  const value = notification.metadata?.connectionId;
  return typeof value === "string" ? value : undefined;
};

function ConnectionRequestPanel() {
  const notificationsQuery = useNotificationsQuery(1, 40);
  const reviewConnection = useReviewConnectionMutation();
  const requests = (notificationsQuery.data?.notifications || []).filter(
    (notification) =>
      notification.type === "CONNECTION_REQUEST" && connectionIdFromNotification(notification),
  );

  if (!requests.length) return null;

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">Connection requests</h3>
        {notificationsQuery.isFetching && <Loader2 className="animate-spin text-slate-400" size={15} />}
      </div>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {requests.map((notification) => {
          const connectionId = connectionIdFromNotification(notification);

          return (
            <article className="rounded-md border border-emerald-100 bg-emerald-50/70 p-4" key={notification.id}>
              <div className="flex items-center gap-3">
                <Avatar user={notification.actor} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-950">
                    {userName(notification.actor)}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {userHeadline(notification.actor) || formatDate(notification.createdAt)}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">{notification.message}</p>
              {notification.metadata?.connectionStatus === "ACCEPTED" || notification.metadata?.connectionStatus === "REJECTED" ? (
                <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold">
                  {notification.metadata.connectionStatus === "ACCEPTED" ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full text-xs font-semibold">
                      <UserCheck size={13} />
                      Accepted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-100/80 px-2.5 py-1 rounded-full text-xs font-semibold">
                      <X size={13} />
                      Rejected
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-4 flex gap-2">
                  <button
                    className="btn-primary px-3 py-1.5"
                    type="button"
                    disabled={reviewConnection.isPending || !connectionId}
                    onClick={() => connectionId && reviewConnection.mutate({ connectionId, status: "ACCEPTED" })}
                  >
                    <Check size={15} />
                    Accept
                  </button>
                  <button
                    className="btn-secondary px-3 py-1.5"
                    type="button"
                    disabled={reviewConnection.isPending || !connectionId}
                    onClick={() => connectionId && reviewConnection.mutate({ connectionId, status: "REJECTED" })}
                  >
                    <X size={15} />
                    Reject
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function SearchPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const search = usePlatformSearchMutation();
  const followUser = useFollowUserMutation();
  const connectUser = useConnectUserMutation();
  const followingQuery = useFollowingQuery(user?.id, 20);
  const users = (search.data?.users || []).filter((foundUser) => foundUser.id !== user?.id);
  const followingIds = useMemo(
    () =>
      new Set(
        flattenPages<FollowingPage["following"][number], "following">(
          followingQuery.data?.pages || [],
          "following",
        )
          .map((item) => item.following?.id)
          .filter(Boolean) as string[],
      ),
    [followingQuery.data?.pages],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    search.mutate(query);
  };

  return (
    <div className="panel p-5">
      <form className="flex gap-2" onSubmit={submit}>
        <input
          className="field"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search engineers"
        />
        <button className="btn-primary" type="submit" disabled={search.isPending}>
          {search.isPending ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
          Search
        </button>
      </form>

      {search.data && (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {users.length ? (
            users.map((foundUser) => {
              const isReferralEligible =
                (foundUser.primaryRole === "PROFESSIONAL" || foundUser.primaryRole === "WORKING_PROFESSIONAL" || (foundUser as any).role === "PROFESSIONAL" || (foundUser as any).role === "WORKING_PROFESSIONAL") ||
                (foundUser.primaryRole === "RECRUITER" || (foundUser as any).role === "RECRUITER");
              const canAskReferral = isReferralEligible && foundUser.acceptingReferrals === true;
              return (
                <EngineerCard
                  disabled={followUser.isPending || connectUser.isPending}
                  key={foundUser.id}
                  user={{ ...foundUser, isFollowing: followingIds.has(foundUser.id) } as any}
                  onConnect={(item) => connectUser.mutate(item.id)}
                  onFollow={(item) => followUser.mutate(item.id)}
                  onOpenProfile={(item) => navigate(`/users/${item.id}`)}
                  onRequestReferral={canAskReferral ? (item) => navigate(`/discover?referral=${item.id}`) : undefined}
                />
              );
            })
          ) : (
            <EmptyState icon={Users} title="No engineers found" text="Try a different search term." />
          )}
        </div>
      )}
    </div>
  );
}

function NetworkList({ activeTab }: { activeTab: SocialTab }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const followUser = useFollowUserMutation();
  const connectUser = useConnectUserMutation();
  const createDirectConversation = useCreateDirectConversationMutation();
  const suggestedQuery = useSuggestedConnectionsQuery(12);
  const connectionsQuery = useConnectionsQuery(user?.id, 16);
  const followersQuery = useFollowersQuery(user?.id, 16);
  const followingQuery = useFollowingQuery(user?.id, 16);

  const suggestedUsers = useMemo(
    () => flattenPages(suggestedQuery.data?.pages || [], "users"),
    [suggestedQuery.data?.pages],
  );
  const connections = useMemo(
    () => flattenPages<ConnectionsPage["connections"][number], "connections">(
      connectionsQuery.data?.pages || [],
      "connections",
    ),
    [connectionsQuery.data?.pages],
  );
  const followers = useMemo(
    () => flattenPages<FollowersPage["followers"][number], "followers">(
      followersQuery.data?.pages || [],
      "followers",
    ),
    [followersQuery.data?.pages],
  );
  const following = useMemo(
    () => flattenPages<FollowingPage["following"][number], "following">(
      followingQuery.data?.pages || [],
      "following",
    ),
    [followingQuery.data?.pages],
  );
  const followingIds = useMemo(
    () =>
      new Set(
        following.map((item) => item.following?.id).filter(Boolean) as string[],
      ),
    [following],
  );

  const users: Array<{ user?: User; context?: string; key: string }> =
    activeTab === "suggested"
      ? suggestedUsers.map((item) => ({ user: item, context: "Recommended", key: item.id }))
      : activeTab === "connections"
        ? connections.map((item) => ({ user: item.user, context: "Connected", key: item.id }))
        : activeTab === "followers"
          ? followers.map((item) => ({ user: item.follower, context: "Follower", key: item.id }))
          : following.map((item) => ({ user: item.following, context: "Following", key: item.id }));

  const query =
    activeTab === "suggested"
      ? suggestedQuery
      : activeTab === "connections"
        ? connectionsQuery
        : activeTab === "followers"
          ? followersQuery
          : followingQuery;

  const loading = query.isLoading;
  const fetchingNext = query.isFetchingNextPage;

  const startConversation = async (target: User) => {
    const result = await createDirectConversation.mutateAsync(target.id);
    navigate(`/chat/${result.data.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="animate-spin" size={16} />
        Loading network
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        {users.filter((item) => item.user).length ? (
          users
            .filter((item): item is { user: User; context?: string; key: string } => Boolean(item.user))
            .map((item) => {
              // Enrich with follow/connection status so EngineerCard initializes correctly
              const enriched = {
                ...item.user,
                isFollowing: followingIds.has(item.user.id),
                // Mark as ACCEPTED for connections so Message button is enabled, otherwise use the backend-provided status
                connectionStatus: activeTab === "connections" ? "ACCEPTED" : (item.user as any).connectionStatus,
              } as any;
              return (
                <EngineerCard
                  context={item.context}
                  currentUserId={user?.id}
                  disabled={
                    followUser.isPending ||
                    connectUser.isPending ||
                    createDirectConversation.isPending ||
                    item.user.id === user?.id
                  }
                  key={item.key}
                  user={enriched}
                  onConnect={activeTab === "connections" ? undefined : (target) => connectUser.mutate(target.id)}
                  onFollow={activeTab === "following" ? undefined : (target) => followUser.mutate(target.id)}
                  onMessage={startConversation}
                  onOpenProfile={(target) => navigate(`/users/${target.id}`)}
                  onRequestReferral={
                    (item.user.primaryRole === "PROFESSIONAL" || item.user.primaryRole === "WORKING_PROFESSIONAL" || item.user.primaryRole === "RECRUITER") &&
                    item.user.acceptingReferrals === true
                      ? (target) => navigate(`/discover?referral=${target.id}`)
                      : undefined
                  }
                />
              );
            })
        ) : (
          <EmptyState icon={Inbox} title="Nothing here yet" text="Your social graph will fill in as you interact." />
        )}
      </div>

      {query.hasNextPage && (
        <button
          className="btn-secondary w-full"
          type="button"
          disabled={fetchingNext}
          onClick={() => query.fetchNextPage()}
        >
          {fetchingNext ? <Loader2 className="animate-spin" size={16} /> : <Users size={16} />}
          Load more
        </button>
      )}
    </div>
  );
}

export function SocialPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SocialTab>("suggested");

  if (!user) {
    return <EmptyState icon={UserCheck} title="Login required" text="Sign in to build your engineering network." />;
  }

  return (
    <section className="space-y-5">
      <div className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Social graph</h2>
            <p className="mt-1 text-sm text-slate-500">
              Follow engineers, request connections, and review relationship signals.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-md border border-slate-100 p-3">
              <div className="font-semibold text-slate-900">{user.followersCount || 0}</div>
              <div className="mt-1 text-slate-500">Followers</div>
            </div>
            <div className="rounded-md border border-slate-100 p-3">
              <div className="font-semibold text-slate-900">{user.followingCount || 0}</div>
              <div className="mt-1 text-slate-500">Following</div>
            </div>
            <div className="rounded-md border border-slate-100 p-3">
              <div className="font-semibold text-slate-900">{user.connectionCount || 0}</div>
              <div className="mt-1 text-slate-500">Connections</div>
            </div>
          </div>
        </div>
      </div>

      <ConnectionRequestPanel />
      <SearchPanel />

      <div className="panel p-4">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-emerald-700 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-800"
              }`}
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {titleCase(tab.label)}
            </button>
          ))}
        </div>
      </div>

      <NetworkList activeTab={activeTab} />
    </section>
  );
}
