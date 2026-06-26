import { FormEvent, useState } from "react";
import { Heart, Loader2, MessageSquare, Repeat2, Send, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { FeedItem, FeedPost, Job, PostComment, Project } from "../../lib/api";
import { useImpressionTracking } from "../../hooks/useImpressionTracking";
import { usePostQuery } from "../../hooks/usePlatformQueries";
import { formatCount, formatDate, tagValues, titleCase, userHeadline, userName } from "../../lib/format";
import { Avatar } from "../ui";
import { HackathonCard } from "./HackathonCard";
import { JobCard } from "./JobCard";

const projectTags = (project: Project) =>
  Array.isArray(project.techStack) ? project.techStack.map(String) : project.searchTags || [];

const jobTags = (job: Job) => job.skillsRequired || [];

export function FeedCard({
  item,
  position,
  trackImpression,
  onLike,
  onSave,
  onComment,
  onRepost,
  canInteract,
}: {
  item: FeedItem;
  position: number;
  trackImpression: boolean;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onComment: (id: string, content: string, parentCommentId?: string) => Promise<boolean>;
  onRepost: (id: string, caption?: string) => Promise<boolean>;
  canInteract: boolean;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [repostOpen, setRepostOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingRepost, setSubmittingRepost] = useState(false);
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
  const postDetail = usePostQuery(entityId, commentsOpen && isPost && Boolean(entityId));
  const detailedPost = postDetail.data || post;
  const comments = detailedPost.comments || [];

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!entityId || !comment.trim()) return;

    setSubmittingComment(true);
    const created = await onComment(entityId, comment.trim(), replyTo?.id);

    if (created) {
      setComment("");
      setReplyTo(null);
    }

    setSubmittingComment(false);
  };

  const submitRepost = async (event: FormEvent) => {
    event.preventDefault();
    if (!entityId) return;

    setSubmittingRepost(true);
    const reposted = await onRepost(entityId, caption.trim() || undefined);

    if (reposted) {
      setCaption("");
      setRepostOpen(false);
    }

    setSubmittingRepost(false);
  };

  if (item.type === "HACKATHON") {
    return (
      <div ref={impressionRef as any}>
        <HackathonCard hackathon={item.data as any} />
      </div>
    );
  }

  if (item.type === "JOB") {
    return (
      <div ref={impressionRef as any}>
        <JobCard job={item.data as any} />
      </div>
    );
  }

  return (
    <article className="panel p-5 hover-lift" ref={impressionRef}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar user={author} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-primary">
              {author ? userName(author) : title || titleCase(item.type)}
            </div>
            <div className="truncate text-xs text-muted-fg">
              {metadata || titleCase(item.type)}
              {data.createdAt ? ` - ${formatDate(data.createdAt)}` : ""}
            </div>
          </div>
        </div>
        <span className="chip shrink-0">{titleCase(item.type)}</span>
      </div>

      {item.reason && (
        <div className="mt-4 rounded-md border border-brand-light bg-brand-light/20 px-3 py-2 text-xs font-medium text-brand">
          Recommended because {item.reason.toLowerCase()}
        </div>
      )}

      <p className="mt-4 whitespace-pre-line text-sm leading-6 text-secondary">
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

      <div className="mt-5 flex items-center justify-between border-t border-base pt-4">
        <div className="flex gap-2">
          <button
            className="icon-btn"
            type="button"
            title="Like"
            disabled={!isPost || !entityId || !canInteract}
            onClick={() => entityId && onLike(entityId)}
          >
            <Heart
              className={post.isLiked ? "fill-rose-500 text-rose-500" : undefined}
              size={17}
            />
          </button>
          <button
            className="icon-btn"
            type="button"
            title="Comment"
            disabled={!isPost || !entityId}
            onClick={() => setCommentsOpen((open) => !open)}
          >
            <MessageSquare size={17} />
          </button>
          <button
            className="icon-btn"
            type="button"
            title="Repost"
            disabled={!isPost || !entityId || !canInteract}
            onClick={() => setRepostOpen((open) => !open)}
          >
            <Repeat2 size={17} />
          </button>
          <button
            className="icon-btn"
            type="button"
            title="Save"
            disabled={!isPost || !entityId || !canInteract}
            onClick={() => entityId && onSave(entityId)}
          >
            <Star
              className={post.isSaved ? "fill-amber-400 text-amber-500" : undefined}
              size={17}
            />
          </button>
        </div>
        {isProject ? (
          <Link
            className="text-xs font-semibold text-brand hover:opacity-80 transition-opacity"
            to={`/projects/${project.slug || project.id}`}
          >
            View project
          </Link>
        ) : (
          <div className="text-xs text-muted-fg">
            {formatCount(post.likesCount)} likes - {formatCount(post.commentsCount)} comments - {formatCount(post.shareCount)} reposts
          </div>
        )}
      </div>

      {isPost && repostOpen && (
        <form className="mt-4 rounded-md border border-base bg-surface-2 p-3" onSubmit={submitRepost}>
          <textarea
            className="field min-h-20"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Add a caption"
            disabled={!canInteract || submittingRepost}
          />
          <div className="mt-3 flex justify-end">
            <button className="btn-primary px-3 py-1.5" type="submit" disabled={!canInteract || submittingRepost}>
              {submittingRepost ? <Loader2 className="animate-spin" size={15} /> : <Repeat2 size={15} />}
              Repost
            </button>
          </div>
        </form>
      )}

      {isPost && commentsOpen && (
        <div className="mt-4 space-y-3 rounded-md border border-base bg-surface-2 p-3">
          {postDetail.isFetching && (
            <div className="flex items-center gap-2 text-xs text-muted-fg">
              <Loader2 className="animate-spin" size={14} />
              Loading comments
            </div>
          )}
          {comments.length ? (
            <div className="space-y-3">
              {comments.map((item) => (
                <CommentThread
                  comment={item}
                  key={item.id}
                  onReply={setReplyTo}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-fg">No comments yet.</p>
          )}

          <form className="space-y-2" onSubmit={submitComment}>
            {replyTo && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-brand-light bg-brand-light/20 px-3 py-2 text-xs text-brand">
                Replying to {userName(replyTo.author)}
                <button className="font-semibold" type="button" onClick={() => setReplyTo(null)}>
                  Cancel
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                className="field"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={canInteract ? "Write a comment" : "Login to comment"}
                disabled={!canInteract || submittingComment}
              />
              <button className="btn-primary shrink-0 px-3" type="submit" disabled={!canInteract || submittingComment || !comment.trim()}>
                {submittingComment ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}
              </button>
            </div>
          </form>
        </div>
      )}
    </article>
  );
}

function CommentThread({
  comment,
  onReply,
}: {
  comment: PostComment;
  onReply: (comment: PostComment) => void;
}) {
  return (
    <div className="rounded-md border border-base bg-surface p-3">
      <div className="flex items-start gap-3">
        <Avatar user={comment.author} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-primary">
              {userName(comment.author)}
            </span>
            {comment.createdAt && (
              <span className="text-xs text-muted-fg">
                {formatDate(comment.createdAt)}
              </span>
            )}
          </div>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-secondary">
            {comment.content}
          </p>
          <button
            className="mt-2 text-xs font-semibold text-brand hover:opacity-80 transition-opacity"
            type="button"
            onClick={() => onReply(comment)}
          >
            Reply
          </button>
        </div>
      </div>
      {(comment.replies || []).length > 0 && (
        <div className="ml-10 mt-3 space-y-2">
          {(comment.replies || []).map((reply) => (
            <div className="rounded-md bg-surface-2 p-3" key={reply.id}>
              <div className="text-xs font-semibold text-secondary">
                {userName(reply.author)}
              </div>
              <p className="mt-1 text-sm text-secondary">{reply.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
