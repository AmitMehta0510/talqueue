import { useState, useMemo } from "react";
import {
  GraduationCap,
  Briefcase,
  Users,
  CheckCircle,
  XCircle,
  Search,
  Calendar,
  Building2,
  UserCheck,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  Send,
  Upload,
  X,
  Mail,
} from "lucide-react";
import { useAuth } from "../core/contexts/AuthContext";
import {
  useTpoDashboardStatsQuery,
  useTpoStudentsQuery,
  useTpoPlacementsQuery,
  useTpoAlumniQuery,
  useApproveAlumniMutation,
  useRejectAlumniMutation,
  useTpoCompanyClaimsQuery,
  useTpoRecruiterInteractionsQuery,
  useDepartmentsQuery,
  useDriveInvitesForCollegeQuery,
  useRespondToDriveInviteMutation,
  useBulkInviteRecruitersMutation,
} from "../hooks/usePlatformQueries";
import { EmptyState, InlineLoader, ErrorState } from "../components/ui";
import { titleCase, formatDate } from "../core/utils/format";

type Tab = "overview" | "students" | "placements" | "invites" | "alumni" | "recruiters" | "activity";

export function TpoDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Filter States for Students Tab
  const [studentPage, setStudentPage] = useState(1);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentGradYear, setStudentGradYear] = useState<string>("");
  const [studentDeptId, setStudentDeptId] = useState<string>("");
  const [studentCurrYear, setStudentCurrYear] = useState<string>("");

  // Resolve College Info
  const tpoCollege = useMemo(() => {
    const adminships = (user as any)?.collegeAdminships || [];
    return adminships[0]?.college || (user as any)?.profile?.college || null;
  }, [user]);

  const collegeId = tpoCollege?.id as string | undefined;

  // Queries
  const statsQuery = useTpoDashboardStatsQuery(Boolean(collegeId));
  const placementsQuery = useTpoPlacementsQuery(activeTab === "placements" && Boolean(collegeId));
  const alumniQuery = useTpoAlumniQuery(activeTab === "alumni" && Boolean(collegeId));
  const claimsQuery = useTpoCompanyClaimsQuery(activeTab === "activity" && Boolean(collegeId));
  const recruitersQuery = useTpoRecruiterInteractionsQuery((activeTab === "activity" || activeTab === "recruiters") && Boolean(collegeId));
  const departmentsQuery = useDepartmentsQuery(collegeId);
  const driveInvitesQuery = useDriveInvitesForCollegeQuery(activeTab === "invites" && collegeId ? collegeId : null);
  const respondToInviteMutation = useRespondToDriveInviteMutation(collegeId);

  // Recruiter Invitation States & Handlers
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmailsText, setInviteEmailsText] = useState("");
  const [inviteCompanyText, setInviteCompanyText] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedCsvInvites, setParsedCsvInvites] = useState<Array<{ email: string; companyName: string }>>([]);

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const parsed: Array<{ email: string; companyName: string }> = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        const columns = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
        const email = columns[0];
        const companyName = columns[1];
        if (email && email.includes("@") && companyName) {
          parsed.push({ email, companyName });
        }
      }
      setParsedCsvInvites(parsed);
    };
    reader.readAsText(file);
  };

  const bulkInviteMutation = useBulkInviteRecruitersMutation(collegeId || "");

  const handleSendInvites = () => {
    const invitesToSend: Array<{ email: string; companyName: string }> = [];

    if (csvFile && parsedCsvInvites.length > 0) {
      invitesToSend.push(...parsedCsvInvites);
    } else if (inviteEmailsText.trim() && inviteCompanyText.trim()) {
      const emails = inviteEmailsText
        .split(/[,\n]/)
        .map((e) => e.trim())
        .filter((e) => e && e.includes("@"));
      for (const email of emails) {
        invitesToSend.push({ email, companyName: inviteCompanyText.trim() });
      }
    }

    if (invitesToSend.length === 0) return;

    bulkInviteMutation.mutate(
      { invites: invitesToSend },
      {
        onSuccess: () => {
          setShowInviteModal(false);
          setInviteEmailsText("");
          setInviteCompanyText("");
          setCsvFile(null);
          setParsedCsvInvites([]);
          recruitersQuery.refetch();
        },
      }
    );
  };

  // Student Query parameters
  const studentFilters = useMemo(() => ({
    page: studentPage,
    limit: 10,
    search: studentSearch || undefined,
    graduationYear: studentGradYear ? parseInt(studentGradYear, 10) : undefined,
    departmentId: studentDeptId || undefined,
    currentYear: studentCurrYear ? parseInt(studentCurrYear, 10) : undefined,
  }), [studentPage, studentSearch, studentGradYear, studentDeptId, studentCurrYear]);

  const studentsQuery = useTpoStudentsQuery(studentFilters, activeTab === "students" && Boolean(collegeId));

  // Mutations
  const approveAlumniMutation = useApproveAlumniMutation();
  const rejectAlumniMutation = useRejectAlumniMutation();

  if (!collegeId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <ErrorState
          title="Access Denied"
          text="You must be registered as a TPO administrator for a college to access this page."
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-pulse" />
            TPO Admin Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Managing placement operations and student profiles for <span className="font-semibold text-gray-800 dark:text-gray-200">{tpoCollege.name}</span>.
          </p>
        </div>
      </div>

      {/* Tabs Nav */}
      <div className="flex border-b border-gray-250 dark:border-gray-800 overflow-x-auto space-x-8 scrollbar-hide">
        {(["overview", "students", "placements", "invites", "alumni", "recruiters", "activity"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 px-1 text-sm font-semibold capitalize whitespace-nowrap border-b-2 transition-all duration-200 ${
              activeTab === tab
                ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-455 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab === "placements" ? "Placement Drives" : tab === "invites" ? "Drive Invites" : tab === "alumni" ? "Alumni Verification" : tab === "recruiters" ? "Recruiter Outreach" : tab === "activity" ? "Company Activity" : tab}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {statsQuery.isLoading ? (
              <InlineLoader label="Loading statistics..." />
            ) : statsQuery.isError ? (
              <ErrorState title="Error fetching stats" onRetry={() => statsQuery.refetch()} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1 */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:scale-[1.02] transition-transform duration-200">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-455 font-medium">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                      {statsQuery.data?.totalStudents ?? 0}
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
                      {statsQuery.data?.activeDrives ?? 0}
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
                      {statsQuery.data?.pendingAlumniVerifications ?? 0}
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
                      {statsQuery.data?.recruiterCount ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-650 dark:text-blue-455" />
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
                  <span>Placement drives lists active and upcoming recruitment cycles targeted specifically at {tpoCollege.name} students.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === "students" && (
          <div className="space-y-6">
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
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow duration-200"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <select
                  value={studentDeptId}
                  onChange={(e) => {
                    setStudentDeptId(e.target.value);
                    setStudentPage(1);
                  }}
                  className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                >
                  <option value="">All Departments</option>
                  {departmentsQuery.data?.map((dept: any) => (
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
                  className="w-28 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                />

                <select
                  value={studentCurrYear}
                  onChange={(e) => {
                    setStudentCurrYear(e.target.value);
                    setStudentPage(1);
                  }}
                  className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
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
            {studentsQuery.isLoading ? (
              <InlineLoader label="Loading student directory..." />
            ) : studentsQuery.isError ? (
              <ErrorState title="Error fetching students" onRetry={() => studentsQuery.refetch()} />
            ) : !studentsQuery.data?.students || studentsQuery.data.students.length === 0 ? (
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
                      {studentsQuery.data.students.map((student) => {
                        const edu = student.user.educations?.[0];
                        return (
                          <tr key={student.userId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                            <td className="px-6 py-4 flex items-center gap-3">
                              <div className="h-10 w-10 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full overflow-hidden shrink-0">
                                {student.avatarUrl ? (
                                  <img src={student.avatarUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center font-bold text-gray-400 uppercase">
                                    {student.fullName.slice(0, 2)}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-950 dark:text-white">{student.fullName}</p>
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
                                  <span className="px-2.5 py-0.5 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 text-xs font-semibold rounded-full">
                                    Open to Work
                                  </span>
                                )}
                                {student.user.openToInternship && (
                                  <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full">
                                    Open to Intern
                                  </span>
                                )}
                                {edu?.isAlumni && (
                                  <span className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/30 text-purple-650 dark:text-purple-400 text-xs font-semibold rounded-full">
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
                {studentsQuery.data.pagination && studentsQuery.data.pagination.totalPages > 1 && (
                  <div className="bg-gray-50 dark:bg-gray-950 px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-800">
                    <p className="text-xs text-gray-555 dark:text-gray-400">
                      Showing Page <span className="font-semibold text-gray-900 dark:text-white">{studentPage}</span> of{" "}
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {studentsQuery.data.pagination.totalPages}
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
                        onClick={() => setStudentPage((prev) => Math.min(studentsQuery.data.pagination.totalPages, prev + 1))}
                        disabled={studentPage === studentsQuery.data.pagination.totalPages}
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
        )}

        {/* PLACEMENT DRIVES TAB */}
        {activeTab === "placements" && (
          <div className="space-y-6">
            {placementsQuery.isLoading ? (
              <InlineLoader label="Loading placement drives..." />
            ) : placementsQuery.isError ? (
              <ErrorState title="Error fetching drives" onRetry={() => placementsQuery.refetch()} />
            ) : !placementsQuery.data || placementsQuery.data.length === 0 ? (
              <EmptyState icon={Calendar} title="No active placement drives" text="There are no placement drives registered at the moment." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {placementsQuery.data.map((drive) => (
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
                          <p className="text-xs text-gray-400">Drive Type</p>
                          <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                            {drive.driveType ? titleCase(drive.driveType) : "Placement"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Min CGPA</p>
                          <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                            {drive.minCgpa ? drive.minCgpa.toFixed(2) : "No cutoff"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Salary Package</p>
                          <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                            {drive.salaryMin && drive.salaryMax
                              ? `${drive.salaryMin}-${drive.salaryMax} LPA`
                              : drive.salaryMin
                              ? `${drive.salaryMin} LPA`
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Applications</p>
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
                            ? "bg-green-50 dark:bg-green-950/30 text-green-600"
                            : "bg-gray-50 dark:bg-gray-955/30 text-gray-555"
                        }`}
                      >
                        {drive.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ALUMNI VERIFICATION TAB */}
        {activeTab === "alumni" && (
          <div className="space-y-6">
            {alumniQuery.isLoading ? (
              <InlineLoader label="Loading alumni requests..." />
            ) : alumniQuery.isError ? (
              <ErrorState title="Error fetching alumni" onRetry={() => alumniQuery.refetch()} />
            ) : !alumniQuery.data || alumniQuery.data.length === 0 ? (
              <EmptyState icon={UserCheck} title="No pending claims" text="All student alumni claims are verified!" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {alumniQuery.data.map((verification) => (
                  <div
                    key={verification.id}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 bg-gray-105 dark:bg-gray-800 rounded-full overflow-hidden shrink-0">
                          {verification.user?.profile?.avatarUrl ? (
                            <img src={verification.user.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center font-bold text-gray-400">
                              {verification.user?.profile?.fullName?.slice(0, 2) || "ST"}
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-950 dark:text-white">
                            {verification.user?.profile?.fullName || "Student"}
                          </h4>
                          <p className="text-xs text-gray-400">@{verification.user?.username}</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-gray-650 dark:text-gray-450">
                        <p className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">Degree:</span>{" "}
                          {verification.degree || "N/A"}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">Branch:</span>{" "}
                          {verification.fieldOfStudy || "N/A"}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">Grad Year:</span>{" "}
                          {verification.endYear || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 border-t border-gray-150 dark:border-gray-850 pt-4 mt-6">
                      <button
                        onClick={() => approveAlumniMutation.mutate(verification.id)}
                        disabled={approveAlumniMutation.isPending || rejectAlumniMutation.isPending}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => rejectAlumniMutation.mutate(verification.id)}
                        disabled={approveAlumniMutation.isPending || rejectAlumniMutation.isPending}
                        className="flex-1 border border-gray-200 dark:border-gray-800 hover:bg-gray-55 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-305 font-semibold py-2 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4 text-red-500" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}        {/* COMPANY ACTIVITY TAB */}
        {activeTab === "activity" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recruiter Interactions */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-955 dark:text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-655" />
                Recruiter Connections
              </h3>

              {recruitersQuery.isLoading ? (
                <InlineLoader label="Loading recruiter connections..." />
              ) : recruitersQuery.isError ? (
                <ErrorState title="Error fetching recruiters" />
              ) : !recruitersQuery.data || recruitersQuery.data.length === 0 ? (
                <EmptyState icon={Building2} title="No recruiter connections" text="No recruiter admin links registered yet." />
              ) : (
                <div className="space-y-4">
                  {recruitersQuery.data.map((recruiter) => (
                    <div
                      key={recruiter.id}
                      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-xl flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-55 dark:bg-gray-950 border border-gray-150 dark:border-gray-850 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                          {recruiter.company?.logoUrl ? (
                            <img src={recruiter.company.logoUrl} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <Building2 className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white leading-snug">
                            {recruiter.user?.profile?.fullName || "Recruiter"}
                          </p>
                          <p className="text-xs text-gray-450 dark:text-gray-405">
                            {recruiter.company?.name} • {recruiter.officeCity || "Remote"}
                          </p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 bg-gray-55 dark:bg-gray-950 border border-gray-150 dark:border-gray-850 text-gray-500 text-xs font-semibold rounded-full">
                        {recruiter.company?.industry || "Tech"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Claims */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-955 dark:text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Company Claim Reviews
              </h3>

              {claimsQuery.isLoading ? (
                <InlineLoader label="Loading claims..." />
              ) : claimsQuery.isError ? (
                <ErrorState title="Error fetching claims" />
              ) : !claimsQuery.data || claimsQuery.data.length === 0 ? (
                <EmptyState icon={CheckCircle} title="No claims history" text="No company claim requests registered." />
              ) : (
                <div className="space-y-4">
                  {claimsQuery.data.map((claim) => (
                    <div
                      key={claim.id}
                      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-xl flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-gray-955 dark:text-white leading-tight">
                          {claim.companyName}
                        </p>
                        <p className="text-xs text-gray-400">Requested by @{claim.requestedBy?.username}</p>
                        <p className="text-xs text-gray-500 font-medium">{formatDate(claim.createdAt)}</p>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase ${
                          claim.status === "APPROVED"
                            ? "bg-green-50 dark:bg-green-950/30 text-green-650"
                            : claim.status === "PENDING"
                            ? "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600"
                            : "bg-red-50 dark:bg-red-950/30 text-red-650"
                        }`}
                      >
                        {claim.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* INVITES TAB */}
        {activeTab === "invites" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-2 border-gray-200 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Incoming Placement Drive Requests
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Review and accept campus placement requests from companies targeting your students.
                </p>
              </div>
            </div>

            {driveInvitesQuery.isLoading ? (
              <InlineLoader label="Loading invites..." />
            ) : driveInvitesQuery.isError ? (
              <ErrorState title="Error fetching invites" onRetry={() => driveInvitesQuery.refetch()} />
            ) : !driveInvitesQuery.data || driveInvitesQuery.data.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No pending invitations"
                text="When companies request your college for recruitment drives, they will appear here."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {driveInvitesQuery.data.map((invite) => (
                  <div
                    key={invite.id}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                            {invite.company?.logoUrl ? (
                              <img src={invite.company.logoUrl} alt="" className="h-full w-full object-contain" />
                            ) : (
                              <Building2 className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-955 dark:text-white leading-tight">
                              {invite.driveTitle}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-405">{invite.company?.name}</p>
                          </div>
                        </div>

                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          invite.status === "PENDING" ? "bg-amber-50 dark:bg-amber-955/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700" :
                          invite.status === "ACCEPTED" ? "bg-green-50 dark:bg-green-955/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700" :
                          invite.status === "REJECTED" ? "bg-rose-50 dark:bg-rose-955/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700" :
                          "bg-slate-100 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                        }`}>
                          {invite.status}
                        </span>
                      </div>

                      {invite.message && (
                        <p className="text-xs italic bg-gray-50 dark:bg-gray-950 p-2.5 rounded-xl border border-gray-100 dark:border-gray-850" style={{ color: "var(--text-secondary)" }}>
                          "{invite.message}"
                        </p>
                      )}

                      <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-950/20 p-3 rounded-xl border border-gray-100 dark:border-gray-850">
                        {invite.driveDate && (
                          <p className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            <strong>Proposed Date:</strong> {formatDate(invite.driveDate)}
                          </p>
                        )}
                        {invite.applyDeadline && (
                          <p className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            <strong>Deadline:</strong> {formatDate(invite.applyDeadline)}
                          </p>
                        )}
                        {invite.minCgpa && (
                          <p className="flex items-center gap-1.5">
                            <GraduationCap className="h-3.5 w-3.5 text-gray-400" />
                            <strong>Cutoff CGPA:</strong> {invite.minCgpa.toFixed(2)}
                          </p>
                        )}
                        {invite.roles?.length > 0 && (
                          <p className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                            <strong>Roles:</strong> {invite.roles.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    {invite.status === "PENDING" && (
                      <div className="flex gap-3 border-t border-gray-150 dark:border-gray-850 pt-4 mt-6">
                        <button
                          onClick={() => respondToInviteMutation.mutate({ inviteId: invite.id, action: "ACCEPT" })}
                          disabled={respondToInviteMutation.isPending}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {respondToInviteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Accept & Create Drive
                        </button>
                        <button
                          onClick={() => respondToInviteMutation.mutate({ inviteId: invite.id, action: "REJECT" })}
                          disabled={respondToInviteMutation.isPending}
                          className="border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-705 dark:text-gray-300 font-semibold py-2 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {invite.status === "ACCEPTED" && invite.placementDrive && (
                      <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-bold border-t border-gray-150 dark:border-gray-850 pt-4 mt-6">
                        <CheckCircle className="h-4 w-4" />
                        <span>Drive created successfully</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RECRUITER OUTREACH TAB */}
        {activeTab === "recruiters" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left outreach controls (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-800 p-8 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-955 dark:text-white flex items-center gap-2">
                    <Users className="h-6 w-6 text-blue-600" />
                    Corporate Network Growth
                  </h3>
                  <p className="text-sm text-gray-500 mt-1.5" style={{ color: "var(--text-secondary)" }}>
                    Connect with recruiters by sending them official invitations. When they sign up using their corporate email domain, they automatically claim their company profile, take ownership of pre-scraped job listings, and link to your college for campus placements.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="border border-gray-200 dark:border-gray-800 p-6 rounded-2xl bg-gray-50/50 dark:bg-gray-955/10 space-y-4">
                    <div className="h-10 w-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-650 dark:text-blue-400">
                      <Send className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Quick Single/Batch Invite</h4>
                      <p className="text-xs text-gray-500 mt-1" style={{ color: "var(--text-secondary)" }}>Invite recruiters directly by entering their email address and company name.</p>
                    </div>
                    <button
                      onClick={() => {
                        setCsvFile(null);
                        setParsedCsvInvites([]);
                        setShowInviteModal(true);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors shadow-sm"
                    >
                      Open Invite Form
                    </button>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-800 p-6 rounded-2xl bg-gray-50/50 dark:bg-gray-955/10 space-y-4">
                    <div className="h-10 w-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-650 dark:text-green-400">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Bulk CSV Upload</h4>
                      <p className="text-xs text-gray-500 mt-1" style={{ color: "var(--text-secondary)" }}>Upload a CSV list of recruiter emails and company names for automated batch onboarding.</p>
                    </div>
                    <button
                      onClick={() => {
                        setInviteEmailsText("");
                        setInviteCompanyText("");
                        setShowInviteModal(true);
                      }}
                      className="w-full bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors border border-transparent dark:border-gray-700 shadow-sm"
                    >
                      Upload CSV File
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-150 dark:border-gray-850 pt-6 space-y-4">
                  <h4 className="font-bold text-gray-905 dark:text-white text-sm">How the onboarding loop works:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-500">
                    <div className="space-y-1">
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <span className="h-5 w-5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-extrabold text-[10px]">1</span>
                        TPO Invites
                      </div>
                      <p style={{ color: "var(--text-secondary)" }}>You send a customized claim invitation containing a secure registration link to the recruiter's official business email.</p>
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <span className="h-5 w-5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-extrabold text-[10px]">2</span>
                        Self-Claim Profile
                      </div>
                      <p style={{ color: "var(--text-secondary)" }}>Recruiter registers. Our backend checks the email domain against the company domain, auto-verifying and assigning privileges.</p>
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <span className="h-5 w-5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-extrabold text-[10px]">3</span>
                        Pre-scraped Jobs
                      </div>
                      <p style={{ color: "var(--text-secondary)" }}>Pre-scraped job postings are automatically linked to the recruiter's dashboard, ready for campus placement drive scheduling.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Connected recruiters list (1 col) */}
            <div className="space-y-4">
              <div className="border border-gray-250 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-650" />
                    Recruiter Network ({recruitersQuery.data?.length || 0})
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5" style={{ color: "var(--text-secondary)" }}>Recruiters currently associated with your campus placement catalog.</p>
                </div>

                {recruitersQuery.isLoading ? (
                  <InlineLoader label="Loading connections..." />
                ) : recruitersQuery.isError ? (
                  <ErrorState title="Failed to fetch recruiters" />
                ) : !recruitersQuery.data || recruitersQuery.data.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs">No active recruiter connections. Start by sending invitations!</div>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {recruitersQuery.data.map((recruiter) => (
                      <div
                        key={recruiter.id}
                        className="p-3 border border-gray-150 dark:border-gray-850 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-950/20 transition-all flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 bg-gray-50 border border-gray-150 dark:border-gray-850 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                            {recruiter.company?.logoUrl ? (
                              <img src={recruiter.company.logoUrl} alt="" className="h-full w-full object-contain" />
                            ) : (
                              <Building2 className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white truncate">
                              {recruiter.user?.profile?.fullName || "Recruiter"}
                            </p>
                            <p className="text-[10px] text-gray-450 dark:text-gray-400 truncate">
                              {recruiter.company?.name} • {recruiter.officeCity || "Remote"}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 bg-gray-50 dark:bg-gray-950 border border-gray-150 dark:border-gray-850 rounded-full font-medium text-[10px]">
                          {recruiter.company?.industry || "Tech"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BULK INVITE MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-850 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150 dark:border-gray-850 bg-gray-50 dark:bg-gray-950/20">
              <h3 className="font-bold text-gray-955 dark:text-white flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-600" />
                Invite Corporate Recruiters
              </h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setCsvFile(null);
                  setParsedCsvInvites([]);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="flex bg-gray-100 dark:bg-gray-950 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setCsvFile(null); setParsedCsvInvites([]); }}
                  className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    !csvFile
                      ? "bg-white dark:bg-gray-850 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                  }`}
                >
                  Manual Form
                </button>
                <button
                  type="button"
                  onClick={() => { setInviteEmailsText(""); setInviteCompanyText(""); }}
                  className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    csvFile
                      ? "bg-white dark:bg-gray-850 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                  }`}
                >
                  CSV Upload
                </button>
              </div>

              {!csvFile ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Recruiter Emails</label>
                    <textarea
                      placeholder="Enter email addresses (separated by commas or newlines)..."
                      value={inviteEmailsText}
                      onChange={(e) => setInviteEmailsText(e.target.value)}
                      rows={4}
                      className="w-full text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-400 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Company Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Google India"
                      value={inviteCompanyText}
                      onChange={(e) => setInviteCompanyText(e.target.value)}
                      className="w-full text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-400 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-205 dark:border-gray-800 rounded-2xl p-6 text-center bg-gray-50/50 dark:bg-gray-955/10 hover:bg-gray-50 dark:hover:bg-gray-955/20 transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-350">CSV Onboarding List</p>
                    <p className="text-[10px] text-gray-400 mt-0.5" style={{ color: "var(--text-secondary)" }}>CSV must have column headers: email, companyName</p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvChange}
                      className="mt-4 text-xs max-w-[200px] mx-auto text-gray-500"
                    />
                  </div>

                  {parsedCsvInvites.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-350">Parsed Contacts ({parsedCsvInvites.length})</p>
                      <div className="border border-gray-150 dark:border-gray-85 rounded-xl overflow-hidden max-h-[200px] overflow-y-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-gray-50 dark:bg-gray-950 text-gray-500 font-bold border-b border-gray-150 dark:border-gray-85">
                            <tr>
                              <th className="px-4 py-2">Email</th>
                              <th className="px-4 py-2">Company</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-150 dark:divide-gray-85 bg-white dark:bg-gray-95">
                            {parsedCsvInvites.map((inv, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-2 text-gray-905 dark:text-white font-medium">{inv.email}</td>
                                <td className="px-4 py-2 text-gray-500">{inv.companyName}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-150 dark:border-gray-850 bg-gray-50 dark:bg-gray-950/20 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(false);
                  setCsvFile(null);
                  setParsedCsvInvites([]);
                }}
                className="px-4 py-2 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-950 text-gray-700 dark:text-gray-300 font-semibold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendInvites}
                disabled={
                  !!(
                    bulkInviteMutation.isPending ||
                    (!csvFile && (!inviteEmailsText || !inviteCompanyText)) ||
                    (csvFile && parsedCsvInvites.length === 0)
                  )
                }
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {bulkInviteMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Send Invitations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
