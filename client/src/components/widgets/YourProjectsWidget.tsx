import React from "react";
import { Link } from "react-router-dom";
import { FolderGit2, Plus } from "lucide-react";
import { useMyProjectsQuery } from "../../hooks/usePlatformQueries";
import { WidgetContainer } from "../ui/WidgetContainer";
import { SkeletonBlock } from "../ui";
import { Project } from "../../lib/api";
import { formatDate } from "../../core/utils/format";

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
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex gap-3">
              <SkeletonBlock className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-3 w-3/4" />
                <SkeletonBlock className="h-2.5 w-1/2" />
              </div>
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
          <div className="flex gap-2 mt-2">
            <Link
              to="/campus/projects"
              className="btn-primary text-[10px] py-1.5 px-3 rounded-lg"
            >
              Create First Project
            </Link>
            <Link
              to="/campus/profile"
              className="btn-secondary text-[10px] py-1.5 px-3 rounded-lg"
            >
              Link GitHub Repos
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full justify-between">
          <div className="space-y-3.5">
            {projects.slice(0, 3).map((project: Project) => {
              const isCompleted = project.status === "COMPLETED" || project.deploymentStatus === "PRODUCTION";
              return (
                <Link
                  key={project.id}
                  to={`/campus/projects/${project.slug}`}
                  className="flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--bg-surface-2)] transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-brand-light text-brand shrink-0 border border-brand/5">
                      <FolderGit2 size={16} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-primary truncate hover:text-brand transition-colors duration-200">
                        {project.title}
                      </h4>
                      <p className="text-[10px] text-secondary truncate mt-0.5 font-medium">
                        Updated {project.updatedAt ? formatDate(project.updatedAt) : "recently"}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 ${
                    isCompleted
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                  }`}>
                    {isCompleted ? "Completed" : "In Progress"}
                  </span>
                </Link>
              );
            })}
          </div>

          <Link
            to="/campus/projects"
            className="text-[11px] text-brand hover:underline font-bold mt-4 block"
          >
            View all projects →
          </Link>
        </div>
      )}
    </WidgetContainer>
  );
}
