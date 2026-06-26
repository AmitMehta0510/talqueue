import { BriefcaseBusiness, Loader2, Star, Check } from "lucide-react";
import { Job } from "../../lib/api";
import { formatCount, titleCase } from "../../lib/format";
import { useAuth } from "../../contexts/AuthContext";
import {
  useCreatePostMutation,
  useSaveJobMutation,
  useSavedJobsQuery,
} from "../../hooks/usePlatformQueries";
import { useToast } from "../../contexts/ToastContext";
import { useState, useEffect } from "react";

export function JobCard({ job }: { job: Job }) {
  const { user } = useAuth();
  const createPost = useCreatePostMutation();
  const { showToast } = useToast();

  const { data: savedJobs } = useSavedJobsQuery();
  const saveMutation = useSaveJobMutation();

  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (savedJobs && job.id) {
      setIsSaved(savedJobs.some((j) => j.id === job.id));
    }
  }, [savedJobs, job.id]);

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("error", "Login required to save jobs");
      return;
    }
    if (saveLoading) return;
    setSaveLoading(true);
    const originalSaved = isSaved;
    setIsSaved(!isSaved);

    try {
      await saveMutation.mutateAsync(job.id);
    } catch {
      setIsSaved(originalSaved);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleApply = () => {
    if (job.applyUrl) {
      window.open(job.applyUrl, "_blank", "noopener,noreferrer");
    } else {
      showToast("info", "No external application link available for this role.");
    }
  };

  const salary =
    job.salaryMin || job.salaryMax
      ? `${job.currency || "INR"} ${formatCount(job.salaryMin || 0)} - ${formatCount(job.salaryMax || 0)}`
      : null;

  const isCollegeStaff = user && (user.primaryRole === "COLLEGE_ADMIN" || user.primaryRole === "TPO" || user.primaryRole === "CDCR");

  const handleShare = () => {
    if (!user?.profile?.collegeId || !user?.profile?.departmentId) {
      showToast("error", "No registered college department found in your profile.");
      return;
    }
    createPost.mutate({
      content: `Opportunity: ${job.title} at ${job.company?.name || "Company"}\n\nLocation: ${job.location || "Remote"}\nType: ${titleCase(job.type)}\n${salary ? `Salary: ${salary}\n` : ""}\nDescription: ${job.description}\n${job.applyUrl ? `Apply Link: ${job.applyUrl}` : ""}`,
      type: "GENERAL",
      collegeId: user.profile.collegeId,
      departmentId: user.profile.departmentId,
      visibility: "COLLEGE_ONLY",
    });
  };

  return (
    <article className="panel p-5 hover-lift">
      <div className="flex items-start gap-4">
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <BriefcaseBusiness size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-primary">
              {job.title || "Open role"}
            </h3>
            {job.featured && (
              <span className="chip text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20">
                Featured
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-fg font-medium">
            {job.company?.name || "Company"} - {job.location || "Remote"} - {titleCase(job.type)}
          </p>

          <p className="mt-3 line-clamp-3 text-sm leading-6 text-secondary">
            {job.description}
          </p>

          {job.requirements && (
            <div className="mt-3 text-xs leading-5 text-secondary font-medium">
              <span className="text-muted-fg font-bold">Requirements:</span>{" "}
              <span className="line-clamp-2">{job.requirements}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(job.skillsRequired || []).slice(0, 5).map((skill) => (
          <span className="chip" key={skill}>
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-base pt-4 text-xs text-muted-fg">
        <span>{salary || titleCase(job.workMode || "OPEN")}</span>
        <span>{formatCount(job.applicationsCount)} applicants</span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-base pt-4">
        <div className="flex gap-2">
          {user && (
            <button
              onClick={handleSaveToggle}
              disabled={saveLoading}
              className={`btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 ${
                isSaved ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" : ""
              }`}
            >
              {saveLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isSaved ? (
                <Check size={14} />
              ) : (
                <Star size={14} />
              )}
              {isSaved ? "Saved" : "Save Opportunity"}
            </button>
          )}
        </div>
        {job.applyUrl && (
          <button
            onClick={handleApply}
            className="btn-primary text-xs px-4 py-1.5 bg-gradient-to-r from-brand to-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all"
          >
            Apply Now
          </button>
        )}
      </div>

      {isCollegeStaff && (
        <div className="mt-4 border-t border-base pt-3 flex justify-end">
          <button
            onClick={handleShare}
            disabled={createPost.isPending}
            className="w-full btn-primary text-xxs py-2 px-3 flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-brand hover:from-indigo-500 hover:to-brand-light text-white font-bold transition-all shadow-md hover:shadow-lg rounded-lg"
          >
            One-Click Share to Community
          </button>
        </div>
      )}
    </article>
  );
}
