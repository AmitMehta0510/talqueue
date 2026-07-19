import { useState, useMemo } from "react";
import { GraduationCap } from "lucide-react";
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
  useSendCounterProposalMutation,
} from "../hooks/usePlatformQueries";
import { ErrorState } from "../components/ui";

// Presentational Components
import { TpoOverviewTab } from "../components/tpo/TpoOverviewTab";
import { TpoStudentsTab } from "../components/tpo/TpoStudentsTab";
import { TpoPlacementsTab } from "../components/tpo/TpoPlacementsTab";
import { TpoAlumniTab } from "../components/tpo/TpoAlumniTab";
import { TpoInvitesTab } from "../components/tpo/TpoInvitesTab";
import { TpoRecruitersTab } from "../components/tpo/TpoRecruitersTab";
import { TpoActivityTab } from "../components/tpo/TpoActivityTab";
import { TpoCdcrTab } from "../components/tpo/TpoCdcrTab";
import { TpoInviteRecruitersModal } from "../components/tpo/TpoInviteRecruitersModal";

type Tab = "overview" | "students" | "placements" | "invites" | "alumni" | "recruiters" | "activity" | "cdcr";

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
    const adminships = user?.collegeAdminships || [];
    return adminships[0]?.college || user?.profile?.college || null;
  }, [user]);

  const collegeId = tpoCollege?.id as string | undefined;

  // Queries
  const statsQuery = useTpoDashboardStatsQuery(Boolean(collegeId));
  const placementsQuery = useTpoPlacementsQuery(activeTab === "placements" && Boolean(collegeId));
  const alumniQuery = useTpoAlumniQuery(activeTab === "alumni" && Boolean(collegeId));
  const claimsQuery = useTpoCompanyClaimsQuery(activeTab === "activity" && Boolean(collegeId));
  const recruitersQuery = useTpoRecruiterInteractionsQuery(
    (activeTab === "activity" || activeTab === "recruiters") && Boolean(collegeId)
  );
  const departmentsQuery = useDepartmentsQuery(collegeId);
  const driveInvitesQuery = useDriveInvitesForCollegeQuery(
    activeTab === "invites" && collegeId ? collegeId : null
  );
  const respondToInviteMutation = useRespondToDriveInviteMutation(collegeId);
  const sendCounterProposalMutation = useSendCounterProposalMutation(collegeId);

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
  const studentFilters = useMemo(
    () => ({
      page: studentPage,
      limit: 10,
      search: studentSearch || undefined,
      graduationYear: studentGradYear ? parseInt(studentGradYear, 10) : undefined,
      departmentId: studentDeptId || undefined,
      currentYear: studentCurrYear ? parseInt(studentCurrYear, 10) : undefined,
    }),
    [studentPage, studentSearch, studentGradYear, studentDeptId, studentCurrYear]
  );

  const studentsQuery = useTpoStudentsQuery(studentFilters, activeTab === "students" && Boolean(collegeId));

  // Mutations
  const approveAlumniMutation = useApproveAlumniMutation();
  const rejectAlumniMutation = useRejectAlumniMutation();

  const handleApproveAlumni = async (claimId: string) => {
    await approveAlumniMutation.mutateAsync(claimId);
  };

  const handleRejectAlumni = async (claimId: string) => {
    await rejectAlumniMutation.mutateAsync(claimId);
  };

  const handleRespondToInvite = async (payload: { inviteId: string; action: "ACCEPT" | "REJECT" }) => {
    await respondToInviteMutation.mutateAsync(payload);
  };

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
            Managing placement operations and student profiles for{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {tpoCollege?.name || "your college"}
            </span>
            .
          </p>
        </div>
      </div>

      {/* Tabs Nav */}
      <div className="flex border-b border-gray-250 dark:border-gray-800 overflow-x-auto space-x-8 scrollbar-hide">
        {(["overview", "students", "placements", "invites", "alumni", "recruiters", "activity", "cdcr"] as Tab[]).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 text-sm font-semibold capitalize whitespace-nowrap border-b-2 transition-all duration-200 ${
                activeTab === tab
                  ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-455 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab === "placements"
                ? "Placement Drives"
                : tab === "invites"
                ? "Drive Invites"
                : tab === "alumni"
                ? "Alumni Verification"
                : tab === "recruiters"
                ? "Recruiter Outreach"
                : tab === "activity"
                ? "Company Activity"
                : tab === "cdcr"
                ? "CDCR"
                : tab}
            </button>
          )
        )}
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {activeTab === "overview" && (
          <TpoOverviewTab
            stats={statsQuery.data}
            isLoading={statsQuery.isLoading}
            isError={statsQuery.isError}
            onRetryStats={() => statsQuery.refetch()}
            collegeName={tpoCollege?.name}
          />
        )}

        {activeTab === "students" && (
          <TpoStudentsTab
            students={studentsQuery.data?.students}
            pagination={studentsQuery.data?.pagination}
            departments={departmentsQuery.data}
            isLoading={studentsQuery.isLoading}
            isError={studentsQuery.isError}
            onRetry={() => studentsQuery.refetch()}
            studentSearch={studentSearch}
            setStudentSearch={setStudentSearch}
            studentDeptId={studentDeptId}
            setStudentDeptId={setStudentDeptId}
            studentGradYear={studentGradYear}
            setStudentGradYear={setStudentGradYear}
            studentCurrYear={studentCurrYear}
            setStudentCurrYear={setStudentCurrYear}
            studentPage={studentPage}
            setStudentPage={setStudentPage}
          />
        )}

        {activeTab === "placements" && (
          <TpoPlacementsTab
            drives={placementsQuery.data}
            isLoading={placementsQuery.isLoading}
            isError={placementsQuery.isError}
            onRetry={() => placementsQuery.refetch()}
          />
        )}

        {activeTab === "alumni" && (
          <TpoAlumniTab
            claims={alumniQuery.data}
            isLoading={alumniQuery.isLoading}
            isError={alumniQuery.isError}
            onRetry={() => alumniQuery.refetch()}
            onApprove={handleApproveAlumni}
            onReject={handleRejectAlumni}
            isActionPending={approveAlumniMutation.isPending || rejectAlumniMutation.isPending}
          />
        )}

        {activeTab === "invites" && (
          <TpoInvitesTab
            invites={driveInvitesQuery.data}
            isLoading={driveInvitesQuery.isLoading}
            isError={driveInvitesQuery.isError}
            onRetry={() => driveInvitesQuery.refetch()}
            onRespondToInvite={handleRespondToInvite}
            isRespondPending={respondToInviteMutation.isPending}
            onSendCounterProposal={(payload) => sendCounterProposalMutation.mutate(payload)}
            isCounterPending={sendCounterProposalMutation.isPending}
          />
        )}

        {activeTab === "recruiters" && (
          <TpoRecruitersTab
            recruiters={recruitersQuery.data}
            isLoading={recruitersQuery.isLoading}
            isError={recruitersQuery.isError}
            onOpenInviteForm={() => {
              setCsvFile(null);
              setParsedCsvInvites([]);
              setShowInviteModal(true);
            }}
            onOpenCsvUpload={() => {
              setInviteEmailsText("");
              setInviteCompanyText("");
              setShowInviteModal(true);
            }}
          />
        )}

        {activeTab === "activity" && (
          <TpoActivityTab
            recruiters={recruitersQuery.data}
            isRecruitersLoading={recruitersQuery.isLoading}
            isRecruitersError={recruitersQuery.isError}
            claims={claimsQuery.data}
            isClaimsLoading={claimsQuery.isLoading}
            isClaimsError={claimsQuery.isError}
          />
        )}

        {activeTab === "cdcr" && collegeId && (
          <TpoCdcrTab collegeId={collegeId} />
        )}
      </div>

      {/* BULK INVITE MODAL */}
      {showInviteModal && (
        <TpoInviteRecruitersModal
          onClose={() => {
            setShowInviteModal(false);
            setCsvFile(null);
            setParsedCsvInvites([]);
          }}
          inviteEmailsText={inviteEmailsText}
          setInviteEmailsText={setInviteEmailsText}
          inviteCompanyText={inviteCompanyText}
          setInviteCompanyText={setInviteCompanyText}
          csvFile={csvFile}
          parsedCsvInvites={parsedCsvInvites}
          onCsvChange={handleCsvChange}
          onManualMode={() => {
            setCsvFile(null);
            setParsedCsvInvites([]);
          }}
          onCsvMode={() => {
            setInviteEmailsText("");
            setInviteCompanyText("");
          }}
          onSendInvites={handleSendInvites}
          isSending={bulkInviteMutation.isPending}
        />
      )}
    </div>
  );
}
