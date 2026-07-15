import { Search, ChevronLeft, ChevronRight, Users, Upload, Download, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { InlineLoader, ErrorState, EmptyState } from "../ui";
import { useState, useRef } from "react";
import { useToast } from "../../core/contexts/ToastContext";

interface Department {
  id: string;
  name: string;
}

interface Student {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  graduationYear?: number | null;
  department?: Department | null;
  user: {
    username: string;
    openToWork?: boolean;
    openToInternship?: boolean;
    educations?: Array<{
      id?: string;
      endYear?: number | null;
      currentYear?: number | null;
      cgpa?: number | null;
      isAlumni?: boolean | null;
      alumniVerified?: boolean | null;
    }>;
  };
}

interface TpoStudentsTabProps {
  students: Student[] | undefined;
  pagination?: {
    totalPages: number;
    totalCount?: number;
    total?: number;
  };
  departments: Department[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;

  studentSearch: string;
  setStudentSearch: (val: string) => void;
  studentDeptId: string;
  setStudentDeptId: (val: string) => void;
  studentGradYear: string;
  setStudentGradYear: (val: string) => void;
  studentCurrYear: string;
  setStudentCurrYear: (val: string) => void;
  studentPage: number;
  setStudentPage: (page: number | ((prev: number) => number)) => void;
}

export function TpoStudentsTab({
  students,
  pagination,
  departments,
  isLoading,
  isError,
  onRetry,
  studentSearch,
  setStudentSearch,
  studentDeptId,
  setStudentDeptId,
  studentGradYear,
  setStudentGradYear,
  studentCurrYear,
  setStudentCurrYear,
  studentPage,
  setStudentPage,
}: TpoStudentsTabProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    updated: number; skipped: number; notFound: string[]; errors: Array<{ email: string; reason: string }>;
  } | null>(null);

  const CSV_TEMPLATE = "email,rollNumber,cgpa,backlogs,currentYear,branchName\nexample@college.edu,21CS001,8.5,0,3,Computer Science";

  const handleCsvDownload = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student-bulk-upload-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = async (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      showToast("error", "Please upload a .csv file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("error", "File too large — max 2MB");
      return;
    }
    const text = await file.text();
    setUploading(true);
    setUploadResult(null);
    try {
      const resp = await fetch("/api/v1/tpo/dashboard/students/bulk-upload", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.message || "Upload failed");
      setUploadResult(json.data);
      showToast("success", `Bulk upload complete — ${json.data.updated} records updated`);
    } catch (err: any) {
      showToast("error", err?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">

      {/* Bulk Upload Panel */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Upload className="h-4 w-4 text-indigo-500" />
              Bulk Student Data Upload
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Upload a CSV to seed authoritative CGPA, backlogs &amp; roll numbers from your ERP.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCsvDownload}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <Download size={12} /> Template
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-60"
            >
              {uploading ? <><Loader2 size={12} className="animate-spin" /> Uploading...</> : <><Upload size={12} /> Upload CSV</>}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvUpload(f); }}
            />
          </div>
        </div>
        {uploadResult && (
          <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={13} /> {uploadResult.updated} Updated
              </span>
              {uploadResult.skipped > 0 && <span className="text-xs text-yellow-600 dark:text-yellow-400">{uploadResult.skipped} Skipped</span>}
              {uploadResult.notFound.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-rose-500">
                  <AlertCircle size={12} /> {uploadResult.notFound.length} not found
                </span>
              )}
              <button onClick={() => setUploadResult(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
            {uploadResult.notFound.length > 0 && (
              <div className="bg-rose-50 dark:bg-rose-950/30 rounded-lg p-3">
                <p className="text-xs font-mono text-rose-500 break-all">{uploadResult.notFound.slice(0, 8).join(", ")}{uploadResult.notFound.length > 8 ? ` +${uploadResult.notFound.length - 8} more` : ""}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters Row */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={studentSearch}
            onChange={(e) => {
              setStudentSearch(e.target.value);
              setStudentPage(1);
            }}
            className="w-full bg-gray-50 dark:bg-gray-955 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow duration-200"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={studentDeptId}
            onChange={(e) => {
              setStudentDeptId(e.target.value);
              setStudentPage(1);
            }}
            className="bg-gray-50 dark:bg-gray-955 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-sm text-gray-705 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
          >
            <option value="">All Departments</option>
            {departments?.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Grad Year"
            value={studentGradYear}
            onChange={(e) => {
              setStudentGradYear(e.target.value);
              setStudentPage(1);
            }}
            className="w-28 bg-gray-50 dark:bg-gray-955 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-sm text-gray-705 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
          />

          <select
            value={studentCurrYear}
            onChange={(e) => {
              setStudentCurrYear(e.target.value);
              setStudentPage(1);
            }}
            className="bg-gray-50 dark:bg-gray-955 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-sm text-gray-705 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
          >
            <option value="">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <InlineLoader label="Loading student directory..." />
      ) : isError ? (
        <ErrorState title="Error fetching students" onRetry={onRetry} />
      ) : !students || students.length === 0 ? (
        <EmptyState icon={Users} title="No students found" text="No students match the selected filters." />
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-450 font-semibold border-b border-gray-205 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4 text-center">Graduation Year</th>
                  <th className="px-6 py-4 text-center">Current Year</th>
                  <th className="px-6 py-4 text-center">CGPA</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-850">
                {students.map((student) => {
                  const edu = student.user.educations?.[0];
                  return (
                    <tr key={student.userId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-105 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full overflow-hidden shrink-0">
                          {student.avatarUrl ? (
                            <img src={student.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center font-bold text-gray-400 uppercase">
                              {student.fullName.slice(0, 2)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-955 dark:text-white">{student.fullName}</p>
                          <p className="text-xs text-gray-400">@{student.user.username}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {student.department?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-gray-900 dark:text-white">
                        {edu?.endYear ?? student.graduationYear ?? "N/A"}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                        {edu?.currentYear ? `${edu.currentYear} Yr` : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-gray-900 dark:text-white">
                        {edu?.cgpa ? edu.cgpa.toFixed(2) : "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {student.user.openToWork && (
                            <span className="px-2.5 py-0.5 bg-green-50 dark:bg-green-955/30 text-green-600 dark:text-green-400 text-xs font-semibold rounded-full">
                              Open to Work
                            </span>
                          )}
                          {student.user.openToInternship && (
                            <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-955/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full">
                              Open to Intern
                            </span>
                          )}
                          {edu?.isAlumni && (
                            <span className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-955/30 text-purple-655 dark:text-purple-400 text-xs font-semibold rounded-full">
                              Alumni {edu.alumniVerified ? "✓" : "(Pending)"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="bg-gray-50 dark:bg-gray-955 px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-800">
              <p className="text-xs text-gray-555 dark:text-gray-400">
                Showing Page <span className="font-semibold text-gray-900 dark:text-white">{studentPage}</span> of{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {pagination.totalPages}
                </span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setStudentPage((prev) => Math.max(1, prev - 1))}
                  disabled={studentPage === 1}
                  className="p-1.5 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 disabled:opacity-50 hover:bg-gray-105 dark:hover:bg-gray-900 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setStudentPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                  disabled={studentPage === pagination.totalPages}
                  className="p-1.5 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 disabled:opacity-50 hover:bg-gray-105 dark:hover:bg-gray-900 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
