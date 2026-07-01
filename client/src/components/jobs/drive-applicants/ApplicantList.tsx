import { Loader2, AlertCircle, User } from "lucide-react";
import { PlacementDriveApplicationStatus } from "../../../lib/api";
import { ApplicantCard } from "./ApplicantCard";

import { PlacementDriveApplication } from "../../../core/types/models";

interface ApplicantListProps {
  filteredApplicants: PlacementDriveApplication[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  statusFilter: string;
  statusConfig: Record<
    PlacementDriveApplicationStatus,
    { label: string; bg: string; text: string; icon: React.ElementType }
  >;
  actionableStatuses: PlacementDriveApplicationStatus[];
  activeDropdownId: string | null;
  setActiveDropdownId: (id: string | null) => void;
  onStatusChange: (appId: string, status: PlacementDriveApplicationStatus) => void;
  isPending: boolean;
}

export function ApplicantList({
  filteredApplicants,
  totalCount,
  isLoading,
  isError,
  statusFilter,
  statusConfig,
  actionableStatuses,
  activeDropdownId,
  setActiveDropdownId,
  onStatusChange,
  isPending,
}: ApplicantListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="animate-spin text-brand" size={24} />
        <p className="text-xs text-muted-fg font-semibold">Loading applicants list…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <AlertCircle className="text-rose-500" size={28} />
        <div>
          <p className="text-sm font-bold text-primary">Failed to load applicants</p>
          <p className="text-xs text-muted-fg mt-1">Please try again later.</p>
        </div>
      </div>
    );
  }

  if (filteredApplicants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-3 text-muted-fg">
          <User size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-primary">No applicants found</p>
          <p className="text-xs text-muted-fg mt-1">
            {statusFilter === "ALL"
              ? "No student applications have been received for this drive."
              : `No applicants match the filter "${statusConfig[statusFilter as PlacementDriveApplicationStatus]?.label}".`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredApplicants.map((app) => (
        <ApplicantCard
          key={app.id}
          app={app}
          statusConfig={statusConfig}
          actionableStatuses={actionableStatuses}
          activeDropdownId={activeDropdownId}
          setActiveDropdownId={setActiveDropdownId}
          onStatusChange={onStatusChange}
          isPending={isPending}
        />
      ))}
    </div>
  );
}
