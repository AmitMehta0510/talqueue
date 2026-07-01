import React, { ReactNode } from "react";
import { EmptySection } from "./ProfileHelpers";
import { FolderKanban, Loader2, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Project } from "../../lib/api";
import { ProjectCard } from "../cards/ProjectCard";

export interface ProfileProjectsProps {
  projects: Project[];
  isFetching: boolean;
  currentUserId?: string;
}

export function ProfileProjects({
  projects,
  isFetching,
  currentUserId,
}: ProfileProjectsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-primary">Projects</h2>
        {isFetching && <Loader2 className="animate-spin text-muted-fg" size={15} />}
      </div>

      {projects.length === 0 && !isFetching ? (
        <EmptySection
          icon={FolderKanban}
          title="No projects showcase yet"
          text="Create a new project or join an existing team project to display them here."
          action={
            <Link to="/projects" className="btn-primary mt-2">
              <Plus size={15} /> Create or Join Project
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((proj) => (
            <ProjectCard
              key={proj.id}
              project={proj}
              currentUserId={currentUserId}
              onJoin={() => { }}
            />
          ))}
        </div>
      )}
    </div>
  );
}


