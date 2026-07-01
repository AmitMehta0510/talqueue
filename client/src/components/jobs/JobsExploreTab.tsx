import React from "react";
import { Search, BriefcaseBusiness } from "lucide-react";
import { Job, User, CompanyEmployee } from "../../lib/api";
import { ErrorState, EmptyState } from "../ui";
import { JobFiltersSidebar, JobFiltersSidebarProps } from "./JobFiltersSidebar";
import { ActiveFilters, JobRowCardSkeleton } from "./JobShared";
import { JobRowCard } from "./JobRowCard";
import { JobDetailDrawer } from "./JobDetailDrawer";

export interface JobsExploreTabProps extends JobFiltersSidebarProps {
  // Search state
  searchVal: string;
  setSearchVal: (val: string) => void;

  // Jobs query/listing state
  filteredJobs: Job[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  totalJobs: number;
  totalPages: number;
  jobPage: number;
  setJobPage: React.Dispatch<React.SetStateAction<number>>;

  // Selection & saved/applied states
  selectedJob: Job | null;
  setSelectedJob: (job: Job | null) => void;
  appliedJobIds: Set<string>;
  savedJobIds: Set<string>;
  isSavePending: boolean;
  pendingSaveJobId: string | null;
  onSaveToggle: (e: React.MouseEvent, jobId: string) => void;
  userSkillNames: Set<string>;
  isRecruiter: boolean;

  // Detail callbacks
  onApply: (job: Job) => void;
  onExternalApply: (job: Job) => void;
  onRequestReferral: (user: User) => void;

  // Company employees networking
  employees: CompanyEmployee[];
  isEmployeesLoading: boolean;
  isEmployeesFetching: boolean;
}

export function JobsExploreTab({
  // Filter sidebar props
  selectedWorkModes,
  toggleWorkMode,
  selectedJobTypes,
  toggleJobType,
  salaryRange,
  setSalaryRange,
  stipendRange,
  setStipendRange,
  internDuration,
  setInternDuration,
  ppoOnly,
  setPpoOnly,
  freshness,
  setFreshness,
  selectedRoles,
  toggleRole,
  selectedSkills,
  toggleSkill,
  searchSkillQ,
  setSearchSkillQ,
  skillSuggestions,
  isSkillSuggestionsLoading,
  selectedLocations,
  toggleLocation,
  searchLocationQ,
  setSearchLocationQ,
  locationSuggestions,
  isLocationSuggestionsLoading,
  clearFilters,

  // Explore tab specific props
  searchVal,
  setSearchVal,
  filteredJobs,
  isLoading,
  isError,
  refetch,
  totalJobs,
  totalPages,
  jobPage,
  setJobPage,
  selectedJob,
  setSelectedJob,
  appliedJobIds,
  savedJobIds,
  isSavePending,
  pendingSaveJobId,
  onSaveToggle,
  userSkillNames,
  isRecruiter,
  onApply,
  onExternalApply,
  onRequestReferral,
  employees,
  isEmployeesLoading,
  isEmployeesFetching,
}: JobsExploreTabProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1.25fr_1.5fr]">
      {/* Filters Sidebar */}
      <JobFiltersSidebar
        selectedWorkModes={selectedWorkModes}
        toggleWorkMode={toggleWorkMode}
        selectedJobTypes={selectedJobTypes}
        toggleJobType={toggleJobType}
        salaryRange={salaryRange}
        setSalaryRange={setSalaryRange}
        stipendRange={stipendRange}
        setStipendRange={setStipendRange}
        internDuration={internDuration}
        setInternDuration={setInternDuration}
        ppoOnly={ppoOnly}
        setPpoOnly={setPpoOnly}
        freshness={freshness}
        setFreshness={setFreshness}
        selectedRoles={selectedRoles}
        toggleRole={toggleRole}
        selectedSkills={selectedSkills}
        toggleSkill={toggleSkill}
        searchSkillQ={searchSkillQ}
        setSearchSkillQ={setSearchSkillQ}
        skillSuggestions={skillSuggestions}
        isSkillSuggestionsLoading={isSkillSuggestionsLoading}
        selectedLocations={selectedLocations}
        toggleLocation={toggleLocation}
        searchLocationQ={searchLocationQ}
        setSearchLocationQ={setSearchLocationQ}
        locationSuggestions={locationSuggestions}
        isLocationSuggestionsLoading={isLocationSuggestionsLoading}
        clearFilters={clearFilters}
      />

      {/* Main Listing Section */}
      <div className="space-y-3 min-w-0">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3" size={16} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            className="field w-full py-2.5 pl-10 text-sm"
            placeholder="Search jobs by title, company, skills…"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
          />
        </div>

        {/* Active filter chips */}
        <ActiveFilters
          workModes={selectedWorkModes}
          jobTypes={selectedJobTypes}
          salaryRange={salaryRange}
          roles={selectedRoles}
          skills={selectedSkills}
          locations={selectedLocations}
          freshness={freshness}
          onRemoveWorkMode={toggleWorkMode}
          onRemoveJobType={toggleJobType}
          onClearSalary={() => setSalaryRange([0, 50])}
          onRemoveRole={toggleRole}
          onRemoveSkill={toggleSkill}
          onRemoveLocation={toggleLocation}
          onClearFreshness={() => setFreshness(null)}
          onClearAll={clearFilters}
        />

        {/* Results count */}
        {!isLoading && (
          <p className="text-xs font-semibold px-1" style={{ color: "var(--text-muted)" }}>
            {totalJobs} {totalJobs === 1 ? "job" : "jobs"} found
          </p>
        )}

        {isLoading ? (
          <div className="space-y-2.5 max-h-[calc(100vh-210px)] overflow-y-auto pr-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <JobRowCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <ErrorState title="Couldn't load jobs" text="Check your connection and try again." onRetry={refetch} />
        ) : filteredJobs.length > 0 ? (
          <div className="space-y-2.5 max-h-[calc(100vh-210px)] overflow-y-auto pr-1">
            {filteredJobs.map((job) => (
              <JobRowCard
                key={job.id}
                job={job}
                isSelected={selectedJob?.id === job.id}
                hasApplied={appliedJobIds.has(job.id)}
                isSaved={savedJobIds.has(job.id)}
                isSaveLoading={isSavePending && pendingSaveJobId === job.id}
                onSelect={() => setSelectedJob(job)}
                onSaveToggle={(e) => onSaveToggle(e, job.id)}
                isRecruiter={isRecruiter}
                userSkillNames={userSkillNames}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BriefcaseBusiness}
            title="No jobs match your filters"
            text="Try adjusting the filters on the left or changing your search term."
          />
        )}

        {/* Pagination */}
        {filteredJobs.length > 0 && (
          <div className="flex items-center justify-between border-t pt-4 mt-2 px-1 shrink-0" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              disabled={jobPage <= 1}
              onClick={() => setJobPage((p) => Math.max(1, p - 1))}
              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 disabled:opacity-50"
            >
              ← Previous
            </button>
            <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>Page {jobPage} of {totalPages || 1}</span>
            <button
              type="button"
              disabled={jobPage >= (totalPages || 1)}
              onClick={() => setJobPage((p) => p + 1)}
              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Details drawer (right col) */}
      <div className="min-w-0">
        {selectedJob ? (
          <div className="lg:sticky lg:top-[90px]">
            <JobDetailDrawer
              job={selectedJob}
              hasApplied={appliedJobIds.has(selectedJob.id)}
              onClose={() => setSelectedJob(null)}
              onApply={() => onApply(selectedJob)}
              onExternalApply={() => onExternalApply(selectedJob)}
              userSkillNames={userSkillNames}
              onRequestReferral={onRequestReferral}
              employees={employees}
              isEmployeesLoading={isEmployeesLoading}
              isEmployeesFetching={isEmployeesFetching}
            />
          </div>
        ) : (
          <div
            className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed text-center px-6 lg:sticky lg:top-[90px]"
            style={{ background: "var(--bg-surface-2)", borderColor: "var(--border-strong)" }}
          >
            <BriefcaseBusiness size={28} className="mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>Select a job to view details</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Click any job card on the left</p>
          </div>
        )}
      </div>
    </div>
  );
}
