import { Users, Briefcase, UserCheck, Building2, BarChart3, Download, FileText, FileSpreadsheet } from "lucide-react";
import { InlineLoader, ErrorState } from "../ui";
import { useState } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../core/contexts/ToastContext";

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
  const { showToast } = useToast();
  const [exportYear, setExportYear] = useState("");
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: "csv" | "pdf") => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format });
      if (exportYear) params.set("academicYear", exportYear);
      const url = `/api/v1/tpo/dashboard/reports/placement?${params}`;
      const resp = await fetch(url, { credentials: "include" });
      if (!resp.ok) throw new Error("Failed to generate report");
      const blob = await resp.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `placement-report-${exportYear || "all"}.${format}`;
      a.click();
      URL.revokeObjectURL(dlUrl);
      showToast("success", `Placement report (${format.toUpperCase()}) downloaded`);
    } catch {
      showToast("error", "Failed to generate report. Try again.");
    } finally {
      setExporting(false);
    }
  };

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

      {/* Export Reports Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Download className="h-4 w-4 text-indigo-500" />
              Export Placement Report
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Download branch-wise & company-wise stats for NAAC/NIRF reporting.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={exportYear}
              onChange={(e) => setExportYear(e.target.value)}
              className="text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300"
            >
              <option value="">All Years</option>
              {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y}>{y}–{y + 1}</option>
              ))}
            </select>
            <button
              onClick={() => handleExport("csv")}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-60"
            >
              <FileSpreadsheet size={13} />
              {exporting ? "Generating..." : "Export CSV"}
            </button>
            <button
              onClick={() => handleExport("pdf")}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-60"
            >
              <FileText size={13} />
              {exporting ? "Generating..." : "Export PDF"}
            </button>
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
          <li className="flex items-start gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
            <span>Use <strong>Bulk Upload</strong> in the Students tab to seed authoritative CGPA &amp; backlog data from your ERP/Excel.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
