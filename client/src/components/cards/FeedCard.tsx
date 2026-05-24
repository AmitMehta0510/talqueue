import { Heart, MessageSquare, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { FeedItem, FeedPost, Job, Project } from "../../lib/api";
import { useImpressionTracking } from "../../hooks/useImpressionTracking";
import { formatCount, formatDate, tagValues, titleCase, userHeadline, userName } from "../../lib/format";
import { Avatar } from "../ui";

const projectTags = (project: Project) =>
  Array.isArray(project.techStack) ? project.techStack.map(String) : project.searchTags || [];

const jobTags = (job: Job) => job.skillsRequired || [];

export function FeedCard({
  item,
  position,
  trackImpression,
  onLike,
  onSave,
}: {
  item: FeedItem;
  position: number;
  trackImpression: boolean;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
}) {
  const data = item.data as FeedPost | Project | Job;
  const isPost = item.type === "POST";
  const isProject = item.type === "PROJECT";
  const post = data as FeedPost;
  const project = data as Project;
  const job = data as Job;
  const entityId = "id" in data ? data.id : undefined;
  const author = isPost ? post.author || post.user : isProject ? project.owner : undefined;
  const tags = isPost ? tagValues(post.tags) : isProject ? projectTags(project) : jobTags(job);
  const title = String(data.title || "");
  const content = isPost
    ? post.content || post.description || title
    : isProject
      ? project.shortDescription || project.description || title
      : job.description || title;
  const metadata = isPost
    ? userHeadline(author) || titleCase(post.type)
    : isProject
      ? project.lookingFor || titleCase(project.status)
      : [job.company?.name, titleCase(job.workMode), titleCase(job.type)].filter(Boolean).join(" - ");
  const impressionRef = useImpressionTracking({
    entityId,
    entityType: item.type,
    enabled: trackImpression,
    position,
  });

  return (
    <article className="panel p-5" ref={impressionRef}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar user={author} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-950">
              {author ? userName(author) : title || titleCase(item.type)}
            </div>
            <div className="truncate text-xs text-slate-500">
              {metadata || titleCase(item.type)}
              {data.createdAt ? ` - ${formatDate(data.createdAt)}` : ""}
            </div>
          </div>
        </div>
        <span className="chip shrink-0">{titleCase(item.type)}</span>
      </div>

      {item.reason && (
        <div className="mt-4 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
          Recommended because {item.reason.toLowerCase()}
        </div>
      )}

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
            disabled={!isPost || !entityId}
            onClick={() => entityId && onLike(entityId)}
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
            disabled={!isPost || !entityId}
            onClick={() => entityId && onSave(entityId)}
          >
            <Star size={17} />
          </button>
        </div>
        {isProject ? (
          <Link
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
            to={`/projects/${project.slug || project.id}`}
          >
            View project
          </Link>
        ) : (
          <div className="text-xs text-slate-500">
            {formatCount(post.likesCount)} likes - {formatCount(post.commentsCount)} comments
          </div>
        )}
      </div>
    </article>
  );
}
