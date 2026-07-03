import { Link } from "react-router-dom";
import { FolderGit2, Star, GitFork, Plus } from "lucide-react";
import { useMyProjectsQuery } from "../../hooks/usePlatformQueries";
import { WidgetContainer } from "../ui/WidgetContainer";
import { SkeletonBlock } from "../ui";
import { Project } from "../../lib/api";

export function YourProjectsWidget() {
  const { data: projects, isLoading, error } = useMyProjectsQuery();

  const headerAction = (
    <Link
      to="/campus/projects"
      className="inline-flex items-center gap-1 text-[10px] text-brand hover:underline font-bold"
    >
      <Plus size={10} />
      Add Project
    </Link>
  );

  if (isLoading) {
    return (
      <WidgetContainer title="Your Projects" action={headerAction}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2].map((n) => (
            <div key={n} className="p-3 border rounded-2xl space-y-2 border-[color:var(--border)]">
              <SkeletonBlock className="h-3.5 w-1/3" />
              <SkeletonBlock className="h-3 w-3/4" />
              <SkeletonBlock className="h-2.5 w-1/2" />
            </div>
          ))}
        </div>
      </WidgetContainer>
    );
  }

  if (error || !projects) {
    return (
      <WidgetContainer title="Your Projects" action={headerAction}>
        <div className="text-center py-4 text-xs text-danger">
          Failed to load your projects
        </div>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer title="Your Projects" action={headerAction}>
      {projects.length === 0 ? (
        <div className="text-center py-8 text-xs text-muted flex flex-col items-center justify-center gap-2 border border-dashed border-[color:var(--border)] rounded-2xl p-4">
          <FolderGit2 size={28} className="text-muted" />
          <div className="space-y-0.5">
            <p className="font-bold text-primary">No projects uploaded yet</p>
            <p className="text-[10px]">Sync your GitHub repos to showcase accomplishments</p>
          </div>
          <Link
            to="/campus/projects"
            className="btn-primary mt-2 text-[10px] py-1.5 px-3 rounded-lg"
          >
            Create First Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projects.slice(0, 4).map((project: Project) => (
            <Link
              key={project.id}
              to={`/campus/projects/${project.slug}`}
              className="p-3 border rounded-xl hover:border-brand-glow hover:bg-[color:var(--bg-surface-2)] transition-all duration-200 flex flex-col justify-between border-[color:var(--border)]"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-primary truncate hover:text-brand transition-colors duration-200">
                    {project.title}
                  </h4>
                  {project.githubUrl && (
                    <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-secondary px-1 py-0.5 rounded uppercase font-black tracking-wide border border-[color:var(--border)]">
                      GitHub
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted line-clamp-2 mt-1 leading-normal">
                  {project.description || "No description provided."}
                </p>
              </div>

              {/* Project Footer Meta */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-[color:var(--border)] text-[9px] text-muted">
                {project.primaryLanguage ? (
                  <span className="font-bold truncate max-w-20 text-[9px]">
                    {project.primaryLanguage}
                  </span>
                ) : (
                  <span />
                )}
                {project.githubUrl && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5 font-semibold">
                      <Star size={8} />
                      {project.starsCount || 0}
                    </span>
                    <span className="flex items-center gap-0.5 font-semibold">
                      <GitFork size={8} />
                      {project.forksCount || 0}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </WidgetContainer>
  );
}
