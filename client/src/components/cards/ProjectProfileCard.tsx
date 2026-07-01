import { FolderKanban, Star, GitFork, Users, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Project } from "../../lib/api";
import { formatCount, titleCase } from "../../core/utils/format";

interface ProjectProfileCardProps {
  /** The project record to display. */
  project: Project;
  /** Optional current user ID to determine owner status. */
  currentUserId?: string;
}

/**
 * Renders a project card tailored for profile pages, displaying stats like stars, forks,
 * member counts, primary language, and repository links.
 */
export function ProjectProfileCard({ project, currentUserId }: ProjectProfileCardProps) {
  const isOwner = project.ownerId === currentUserId || project.owner?.id === currentUserId;
  const memberCount = project._count?.members || project.members?.length || 0;

  return (
    <article className="panel p-5 hover-lift flex flex-col gap-4 border border-base">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-surface-2 border border-base flex items-center justify-center text-secondary shrink-0">
            <FolderKanban size={18} />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-primary truncate">
              <Link className="hover:text-brand transition-colors" to={`/projects/${project.slug || project.id}`}>
                {project.title || "Untitled Project"}
              </Link>
            </h4>
            <p className="text-xs text-muted-fg mt-0.5 truncate">
              {project.primaryLanguage || "Unspecified Language"}
            </p>
          </div>
        </div>
        <span className="chip shrink-0 text-xxs font-semibold">
          {titleCase(project.status || "OPEN")}
        </span>
      </div>

      {project.shortDescription && (
        <p className="text-xs leading-relaxed text-secondary line-clamp-2">
          {project.shortDescription}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 mt-auto">
        <div className="rounded-lg bg-surface-2 border border-base py-2">
          <div className="font-bold text-primary flex items-center justify-center gap-1">
            <Star size={12} />
            {formatCount(project.starsCount)}
          </div>
          <div className="text-[9px] text-muted-fg mt-0.5">Stars</div>
        </div>
        <div className="rounded-lg bg-surface-2 border border-base py-2">
          <div className="font-bold text-primary flex items-center justify-center gap-1">
            <GitFork size={12} />
            {formatCount(project.forksCount)}
          </div>
          <div className="text-[9px] text-muted-fg mt-0.5">Forks</div>
        </div>
        <div className="rounded-lg bg-surface-2 border border-base py-2">
          <div className="font-bold text-primary flex items-center justify-center gap-1">
            <Users size={12} />
            {formatCount(memberCount)}
          </div>
          <div className="text-[9px] text-muted-fg mt-0.5">Members</div>
        </div>
      </div>

      <div className="border-t border-base pt-3.5 flex items-center justify-between text-xs mt-1">
        <span className="text-[10px] text-muted-fg font-medium">
          {isOwner ? "Project Owner" : "Team Member"}
        </span>
        {project.githubUrl && (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand font-semibold inline-flex items-center gap-1 hover:underline"
          >
            Repo <ExternalLink size={11} />
          </a>
        )}
      </div>
    </article>
  );
}
