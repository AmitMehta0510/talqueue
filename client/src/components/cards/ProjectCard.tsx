import { Check, ExternalLink, GitFork, Github, Plus, Star, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Project } from "../../lib/api";
import { formatCount, titleCase, userName } from "../../lib/format";
import { Avatar } from "../ui";

export function ProjectCard({
  project,
  onJoin,
  currentUserId,
}: {
  project: Project;
  onJoin: (project: Project) => void;
  currentUserId?: string;
}) {
  const techStack = Array.isArray(project.techStack)
    ? project.techStack
    : project.searchTags || [];
  const isOwner = project.ownerId === currentUserId || project.owner?.id === currentUserId;
  const memberCount = project._count?.members || project.members?.length || 0;

  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-950">
              <Link className="hover:text-emerald-700" to={`/projects/${project.slug || project.id}`}>
                {project.title || "Untitled project"}
              </Link>
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

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div className="rounded-md border border-slate-100 p-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
            <Star size={14} />
            {formatCount(project.starsCount)}
          </div>
          <div className="mt-1 text-slate-500">Stars</div>
        </div>
        <div className="rounded-md border border-slate-100 p-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
            <GitFork size={14} />
            {formatCount(project.forksCount)}
          </div>
          <div className="mt-1 text-slate-500">Forks</div>
        </div>
        <div className="rounded-md border border-slate-100 p-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
            <Users size={14} />
            {formatCount(memberCount)}
          </div>
          <div className="mt-1 text-slate-500">Members</div>
        </div>
        <div className="rounded-md border border-slate-100 p-3">
          <div className="truncate font-semibold text-slate-900">
            {project.primaryLanguage || titleCase(project.deploymentStatus) || "Unlisted"}
          </div>
          <div className="mt-1 text-slate-500">Language</div>
        </div>
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
            className="btn-secondary px-3 py-1.5"
            type="button"
            disabled={isOwner}
            onClick={() => onJoin(project)}
          >
            <Plus size={15} />
            {isOwner ? "Owner" : "Join"}
          </button>
        </div>
      </div>
    </article>
  );
}
