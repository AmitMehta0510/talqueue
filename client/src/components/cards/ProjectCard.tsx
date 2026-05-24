import { Check, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Project } from "../../lib/api";
import { titleCase, userName } from "../../lib/format";
import { Avatar } from "../ui";

export function ProjectCard({
  project,
  onJoin,
}: {
  project: Project;
  onJoin: (project: Project) => void;
}) {
  const techStack = Array.isArray(project.techStack)
    ? project.techStack
    : project.searchTags || [];

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
        <button className="btn-secondary px-3 py-1.5" type="button" onClick={() => onJoin(project)}>
          <Plus size={15} />
          Join
        </button>
      </div>
    </article>
  );
}
