import { FormEvent, useState } from "react";
import { Loader2, Rocket, Search, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProjectCard } from "../components/cards/ProjectCard";
import { Avatar, EmptyState } from "../components/ui";
import { useJoinProjectMutation, usePlatformSearchMutation } from "../hooks/usePlatformQueries";
import { userHeadline, userName } from "../lib/format";

export function DiscoverPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const search = usePlatformSearchMutation();
  const joinProject = useJoinProjectMutation();
  const searchResults = search.data;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    search.mutate(query);
  };

  return (
    <section className="space-y-5">
      <form className="panel flex gap-3 p-4" onSubmit={submit}>
        <input
          className="field"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search engineers, projects, hackathons"
        />
        <button className="btn-primary" type="submit" disabled={search.isPending}>
          {search.isPending ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
          Search
        </button>
      </form>

      {!searchResults ? (
        <EmptyState
          icon={Search}
          title="Search the platform"
          text="Find engineers, projects, skills, hackathons, and collaboration opportunities."
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-600">Engineers</h3>
            {(searchResults.users || []).length ? (
              (searchResults.users || []).map((foundUser) => (
                <article
                  className="panel cursor-pointer p-5 transition hover:border-emerald-300"
                  key={foundUser.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/users/${foundUser.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/users/${foundUser.id}`);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar user={foundUser} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-950">
                        {userName(foundUser)}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {userHeadline(foundUser) || `@${foundUser.username}`}
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState icon={Users} title="No engineers found" text="Try another keyword." />
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-600">Projects</h3>
            {(searchResults.projects || []).length ? (
              (searchResults.projects || []).map((project) => (
                <ProjectCard key={project.id} project={project} onJoin={(item) => joinProject.mutate(item)} />
              ))
            ) : (
              <EmptyState icon={Rocket} title="No projects found" text="Try another keyword." />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
