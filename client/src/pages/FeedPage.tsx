import { Compass, Loader2, RefreshCcw } from "lucide-react";
import { FeedCard } from "../components/cards/FeedCard";
import { ComposePost } from "../components/forms/ComposePost";
import { EmptyState, Metric } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import {
  useCreatePostMutation,
  useCommentOnPostMutation,
  useFeedQuery,
  useJobsQuery,
  usePostReactionMutation,
  useProjectsQuery,
  useRepostMutation,
} from "../hooks/usePlatformQueries";
import { titleCase } from "../lib/format";
import { NavLink } from "react-router-dom";

export function FeedPage() {
  const { user, apiOnline } = useAuth();
  const feedQuery = useFeedQuery(16);
  const projectsQuery = useProjectsQuery(12);
  const jobsQuery = useJobsQuery();
  const createPost = useCreatePostMutation();
  const postReaction = usePostReactionMutation();
  const commentOnPost = useCommentOnPostMutation();
  const repost = useRepostMutation();
  const feed = feedQuery.data || [];
  const projects = projectsQuery.data || [];
  const jobs = jobsQuery.data || [];
  const refreshing = feedQuery.isFetching || projectsQuery.isFetching || jobsQuery.isFetching;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <section className="space-y-5">
        <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h1 className="text-xl font-bold text-slate-950">Feed</h1>
            <p className="mt-1 text-sm text-slate-500">
              {user
                ? "Personalized posts, projects, jobs, and platform updates."
                : "Public posts are shown until you log in."}
            </p>
          </div>
          <button
            className="btn-secondary"
            type="button"
            disabled={refreshing}
            onClick={() => feedQuery.refetch()}
          >
            {refreshing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
            Refresh
          </button>
        </div>

        <ComposePost
          onCreate={async (payload) => {
            try {
              await createPost.mutateAsync(payload);
              return true;
            } catch {
              return false;
            }
          }}
          disabled={!user || createPost.isPending}
        />
        {refreshing && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={16} />
            Refreshing
          </div>
        )}
        {feed.length ? (
          feed.map((item, index) => (
            <FeedCard
              key={`${item.type}-${"id" in item.data ? item.data.id : index}`}
              item={item}
              position={index}
              trackImpression={Boolean(user)}
              canInteract={Boolean(user)}
              onLike={(id) => postReaction.mutate({ id, action: "like" })}
              onSave={(id) => postReaction.mutate({ id, action: "save" })}
              onComment={async (id, content, parentCommentId) => {
                try {
                  await commentOnPost.mutateAsync({ id, content, parentCommentId });
                  return true;
                } catch {
                  return false;
                }
              }}
              onRepost={async (id, caption) => {
                try {
                  await repost.mutateAsync({ id, caption });
                  return true;
                } catch {
                  return false;
                }
              }}
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
              <NavLink
                key={project.id}
                className="block w-full rounded-md border border-slate-100 p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/50"
                to="/projects"
              >
                <div className="truncate text-sm font-semibold text-slate-800">
                  {project.title}
                </div>
                <div className="mt-1 truncate text-xs text-slate-500">
                  {project.lookingFor || titleCase(project.status)}
                </div>
              </NavLink>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
