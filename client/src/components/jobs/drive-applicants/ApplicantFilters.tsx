import { PlacementDriveApplicationStatus } from "../../../lib/api";

interface ApplicantFiltersProps {
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  filteredCount: number;
  totalCount: number;
  actionableStatuses: PlacementDriveApplicationStatus[];
  statusConfig: Record<
    PlacementDriveApplicationStatus,
    { label: string; bg: string; text: string; icon: React.ElementType }
  >;
}

export function ApplicantFilters({
  statusFilter,
  setStatusFilter,
  filteredCount,
  totalCount,
  actionableStatuses,
  statusConfig,
}: ApplicantFiltersProps) {
  return (
    <div className="px-6 py-3 border-b border-base bg-surface-2/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
      <span className="text-xs font-bold text-muted-fg">
        {filteredCount} of {totalCount} applicants
      </span>
      <div className="flex gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0">
        {(["ALL", ...actionableStatuses] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition shrink-0 ${
              statusFilter === status
                ? "bg-brand text-inverse shadow-sm"
                : "text-secondary hover:bg-surface-3"
            }`}
          >
            {status === "ALL"
              ? "All"
              : statusConfig[status as PlacementDriveApplicationStatus]?.label || status}
          </button>
        ))}
      </div>
    </div>
  );
}
