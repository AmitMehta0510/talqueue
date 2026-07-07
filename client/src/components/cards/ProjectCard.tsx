import { memo } from "react";
import { Check, ExternalLink, GitFork, Github, Play, Plus, Star, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Project } from "../../lib/api";
import { formatCount, titleCase, userName } from "../../core/utils/format";
import { Avatar } from "../ui";

export const ProjectCard = memo(function ProjectCard({
  project,
  onJoin,
  currentUserId,
  hasPendingRequest,
}: {
  project: Project;
  onJoin: (project: Project) => void;
  currentUserId?: string;
  hasPendingRequest?: boolean;
}) {
  const techStack = Array.isArray(project.techStack)
    ? project.techStack
    : project.searchTags || [];
  const isOwner = project.ownerId === currentUserId || project.owner?.id === currentUserId;
  const memberCount = project._count?.members || project.members?.length || 0;

  /** Build a StackBlitz URL from a GitHub repo URL, or return null */
  const stackBlitzUrl = project.githubUrl
    ? (() => {
        const match = project.githubUrl
          .replace(/\/+$/, "")
          .match(/github\.com\/([\/\w.-]+)/);
        return match ? `https://stackblitz.com/github/${match[1]}` : null;
      })()
    : null;

  return (
    <article className="panel p-5 hover-lift">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-primary">
              <Link className="hover:text-brand transition-colors" to={`/projects/${project.slug || project.id}`}>
                {project.title || "Untitled project"}
              </Link>
            </h3>
            {project.verified && (
              <span className="chip text-brand border-brand-light/30">
                <Check size={13} />
                Verified
              </span>
            )}
          </div>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-secondary">
            {project.shortDescription || project.description}
          </p>
        </div>
        <span className="chip shrink-0">{titleCase(project.status || "OPEN")}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div className="rounded-md border border-base bg-surface-2 p-3">
          <div className="flex items-center gap-1.5 font-semibold text-primary">
            <Star size={14} />
            {formatCount(project.starsCount)}
          </div>
          <div className="mt-1 text-muted-fg">Stars</div>
        </div>
        <div className="rounded-md border border-base bg-surface-2 p-3">
          <div className="flex items-center gap-1.5 font-semibold text-primary">
            <GitFork size={14} />
            {formatCount(project.forksCount)}
          </div>
          <div className="mt-1 text-muted-fg">Forks</div>
        </div>
        <div className="rounded-md border border-base bg-surface-2 p-3">
          <div className="flex items-center gap-1.5 font-semibold text-primary">
            <Users size={14} />
            {formatCount(memberCount)}
          </div>
          <div className="mt-1 text-muted-fg">Members</div>
        </div>
        <div className="rounded-md border border-base bg-surface-2 p-3">
          <div className="truncate font-semibold text-primary">
            {project.primaryLanguage || titleCase(project.deploymentStatus) || "Unlisted"}
          </div>
          <div className="mt-1 text-muted-fg">Language</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {techStack.slice(0, 5).map((tech) => (
          <span className="chip" key={String(tech)}>
            {String(tech)}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-base pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-fg">
          <Avatar user={project.owner} size="sm" />
          <span className="truncate">{userName(project.owner)}</span>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {project.githubUrl && (
            <a
              className="icon-btn h-8 w-8"
              href={project.githubUrl}
              rel="noreferrer"
              target="_blank"
              title="GitHub"
            >
              <Github size={15} />
            </a>
          )}
          {stackBlitzUrl && (
            <a
              className="icon-btn h-8 w-8"
              href={stackBlitzUrl}
              rel="noreferrer"
              target="_blank"
              title="Run in StackBlitz"
              style={{ color: "var(--brand)" }}
            >
              <Play size={14} fill="currentColor" />
            </a>
          )}
          {project.liveUrl && (
            <a
              className="icon-btn h-8 w-8"
              href={project.liveUrl}
              rel="noreferrer"
              target="_blank"
              title="Live project"
            >
              <ExternalLink size={15} />
            </a>
          )}
          <button
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              isOwner || hasPendingRequest
                ? "border-strong bg-surface-2 text-muted-fg cursor-default"
                : "btn-secondary"
            }`}
            type="button"
            disabled={isOwner || hasPendingRequest}
            onClick={() => !isOwner && !hasPendingRequest && onJoin(project)}
          >
            {isOwner ? (
              <><Users size={15} /> Owner</>
            ) : hasPendingRequest ? (
              <><Check size={15} /> Request Sent</>
            ) : (
              <><Plus size={15} /> Join</>
            )}
          </button>
        </div>
      </div>
    </article>
  );
});

