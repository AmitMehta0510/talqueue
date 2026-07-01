import { Users, Briefcase, UserCheck, Building2, BarChart3 } from "lucide-react";
import { InlineLoader, ErrorState } from "../ui";

interface TpoOverviewTabProps {
  stats: {
    totalStudents: number;
    activeDrives: number;
    pendingAlumniVerifications: number;
    recruiterCount: number;
  } | null | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetryStats: () => void;
  collegeName?: string;
}

export function TpoOverviewTab({
  stats,
  isLoading,
  isError,
  onRetryStats,
  collegeName,
}: TpoOverviewTabProps) {
  if (isLoading) {
    return <InlineLoader label="Loading statistics..." />;
  }

  if (isError) {
    return <ErrorState title="Error fetching stats" onRetry={onRetryStats} />;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:scale-[1.02] transition-transform duration-200">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-650 dark:text-blue-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-455 font-medium">Total Students</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {stats?.totalStudents ?? 0}
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:scale-[1.02] transition-transform duration-200">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-455 font-medium">Active Drives</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {stats?.activeDrives ?? 0}
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:scale-[1.02] transition-transform duration-200">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl text-yellow-650 dark:text-yellow-455">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-455 font-medium">Pending Alumni</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {stats?.pendingAlumniVerifications ?? 0}
            </p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:scale-[1.02] transition-transform duration-200">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-455 font-medium">Recruiters Linked</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {stats?.recruiterCount ?? 0}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-655 dark:text-blue-455" />
          Operations Guidelines
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
            <span>Verify alumni claims promptly in the <strong>Alumni Verification</strong> tab. Successful verification notifies the student and lists them as verified on their profile.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
            <span>Filter and search students in the <strong>Students</strong> directory to track eligibility parameters like CGPA or graduation status.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
            <span>Placement drives lists active and upcoming recruitment cycles targeted specifically at {collegeName || "your college"} students.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
