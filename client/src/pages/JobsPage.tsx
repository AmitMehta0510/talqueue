import { BriefcaseBusiness } from "lucide-react";
import { JobCard } from "../components/cards/JobCard";
import { EmptyState } from "../components/ui";
import { useJobsQuery } from "../hooks/usePlatformQueries";

export function JobsPage() {
  const jobsQuery = useJobsQuery();
  const jobs = jobsQuery.data || [];

  return (
    <section className="grid gap-5 xl:grid-cols-2">
      {jobs.length ? (
        jobs.map((job) => <JobCard key={job.id} job={job} />)
      ) : (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No jobs posted yet"
          text="Recruiter-created jobs will appear here from the backend."
        />
      )}
    </section>
  );
}
