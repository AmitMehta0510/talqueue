import { Check, GitFork, Loader2, Rocket, Star, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ProjectCard } from "../components/cards/ProjectCard";
import { CreateProjectForm } from "../components/forms/CreateProjectForm";
import { Avatar, EmptyState, Metric } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import {
  useCreateProjectMutation,
  useJoinProjectMutation,
  useProjectQuery,
  useProjectsQuery,
} from "../hooks/usePlatformQueries";
import { titleCase, userName } from "../lib/format";

function ProjectDetail({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const projectQuery = useProjectQuery(projectId);
  const joinProject = useJoinProjectMutation();
  const project = projectQuery.data;
  const techStack = Array.isArray(project?.techStack)
    ? project.techStack.map(String)
    : project?.searchTags || [];

  if (projectQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="animate-spin" size={16} />
        Loading project
      </div>
    );
  }

  if (!project) {
    return <EmptyState icon={Rocket} title="Project not found" text="This project is unavailable." />;
  }

  return (
    <section className="space-y-5">
      <Link className="text-sm font-semibold text-emerald-700 hover:text-emerald-900" to="/projects">
        Back to projects
      </Link>

      <div className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-950">{project.title}</h2>
              {project.verified && (
                <span className="chip text-emerald-700">
                  <Check size={13} />
                  Verified
                </span>
              )}
              {project.trustLevel && <span className="chip">{titleCase(project.trustLevel)}</span>}
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              {project.shortDescription || project.description}
            </p>
          </div>
          <button
            className="btn-primary"
            type="button"
            disabled={!user || joinProject.isPending}
            onClick={() => joinProject.mutate(project)}
          >
            {joinProject.isPending ? <Loader2 className="animate-spin" size={16} /> : <Users size={16} />}
            Join
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Engineering" value={Math.round(project.engineeringScore || 0)} />
          <Metric label="Members" value={project._count?.members || project.members?.length || 0} />
          <Metric label="Requests" value={project._count?.joinRequests || project.joinRequests?.length || 0} />
          <Metric label="Verification" value={Math.round(project.verificationScore || 0)} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-slate-950">Tech stack</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {techStack.length ? (
                techStack.map((tech) => (
                  <span className="chip" key={tech}>
                    {tech}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">No stack listed yet.</span>
              )}
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-slate-950">Members</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(project.members || []).slice(0, 8).map((member) => {
                const record = member as { id?: string; role?: string; user?: Parameters<typeof userName>[0] };
                return (
                  <div className="rounded-md border border-slate-100 p-3" key={record.id || record.user?.id}>
                    <div className="flex items-center gap-3">
                      <Avatar user={record.user} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {userName(record.user)}
                        </div>
                        <div className="truncate text-xs text-slate-500">{titleCase(record.role)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-slate-950">GitHub stats</h3>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Metric label="Stars" value={project.starsCount || 0} />
              <Metric label="Forks" value={project.forksCount || 0} />
              <Metric label="Contributors" value={project.contributorsCount || 0} />
              <Metric label="Score" value={Math.round(project.rankingScore || project.engineeringScore || 0)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.githubUrl && (
                <a className="btn-secondary px-3 py-1.5" href={project.githubUrl} rel="noreferrer" target="_blank">
                  <GitFork size={15} />
                  GitHub
                </a>
              )}
              {project.liveUrl && (
                <a className="btn-secondary px-3 py-1.5" href={project.liveUrl} rel="noreferrer" target="_blank">
                  <Star size={15} />
                  Live
                </a>
              )}
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-slate-950">Open roles</h3>
            <div className="mt-4 space-y-3">
              {(project.requiredRoles || []).length ? (
                (project.requiredRoles || []).map((role, index) => (
                  <div className="rounded-md border border-slate-100 p-3 text-sm text-slate-700" key={index}>
                    {String((role as { title?: string; role?: string }).title || (role as { role?: string }).role || "Role")}
                  </div>
                ))
              ) : (
                <span className="text-sm text-slate-500">No open roles listed.</span>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function ProjectsPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const projectsQuery = useProjectsQuery(12);
  const createProject = useCreateProjectMutation();
  const joinProject = useJoinProjectMutation();
  const projects = projectsQuery.data || [];

  if (projectId) {
    return <ProjectDetail projectId={projectId} />;
  }

  return (
    <section className="space-y-5">
      <CreateProjectForm
        onCreate={async (payload) => {
          try {
            await createProject.mutateAsync(payload);
            return true;
          } catch {
            return false;
          }
        }}
        disabled={!user || createProject.isPending}
      />
      <div className="grid gap-5 xl:grid-cols-2">
        {projects.length ? (
          projects.map((project) => (
            <ProjectCard key={project.id} project={project} onJoin={(item) => joinProject.mutate(item)} />
          ))
        ) : (
          <EmptyState
            icon={Rocket}
            title="No public projects yet"
            text="Create the first project once your backend has data."
          />
        )}
      </div>
    </section>
  );
}
