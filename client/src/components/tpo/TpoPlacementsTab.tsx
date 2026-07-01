import { Calendar, Building2 } from "lucide-react";
import { InlineLoader, ErrorState, EmptyState } from "../ui";
import { titleCase, formatDate } from "../../core/utils/format";

interface Drive {
  id: string;
  driveTitle: string;
  driveType?: string | null;
  minCgpa?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  _count?: { applications?: number } | null;
  driveDate?: string | null;
  status: string;
  company?: {
    name: string;
    logoUrl?: string | null;
  } | null;
}

interface TpoPlacementsTabProps {
  drives: Drive[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function TpoPlacementsTab({
  drives,
  isLoading,
  isError,
  onRetry,
}: TpoPlacementsTabProps) {
  if (isLoading) {
    return <InlineLoader label="Loading placement drives..." />;
  }

  if (isError) {
    return <ErrorState title="Error fetching drives" onRetry={onRetry} />;
  }

  if (!drives || drives.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No active placement drives"
        text="There are no placement drives registered at the moment."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {drives.map((drive) => (
        <div
          key={drive.id}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow duration-200"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gray-55 dark:bg-gray-950 border border-gray-150 dark:border-gray-850 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                {drive.company?.logoUrl ? (
                  <img src={drive.company.logoUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">
                  {drive.driveTitle}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{drive.company?.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm bg-gray-55 dark:bg-gray-955 p-4 rounded-xl">
              <div>
                <p className="text-xs text-gray-450">Drive Type</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {drive.driveType ? titleCase(drive.driveType) : "Placement"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-450">Min CGPA</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {drive.minCgpa ? drive.minCgpa.toFixed(2) : "No cutoff"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-450">Salary Package</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {drive.salaryMin && drive.salaryMax
                    ? `${drive.salaryMin}-${drive.salaryMax} LPA`
                    : drive.salaryMin
                    ? `${drive.salaryMin} LPA`
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-450">Applications</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {drive._count?.applications ?? 0} applied
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-150 dark:border-gray-850 pt-4 mt-6">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <Calendar className="h-4 w-4" />
              <span>Drive Date: {drive.driveDate ? formatDate(drive.driveDate) : "TBD"}</span>
            </div>
            <span
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase ${
                drive.status === "UPCOMING"
                  ? "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-605"
                  : drive.status === "ONGOING"
                  ? "bg-green-50 dark:bg-green-955/30 text-green-600"
                  : "bg-gray-50 dark:bg-gray-955/30 text-gray-555"
              }`}
            >
              {drive.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
