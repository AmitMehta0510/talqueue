import { useEffect, useState, lazy, Suspense } from "react";
import { Loader2, GraduationCap } from "lucide-react";
import { EmptyState } from "../ui";
import { useAuth } from "../../core/contexts/AuthContext";
import {
  useCollegeQuery,
  useDepartmentsQuery,
  useCreateDepartmentMutation,
  useCollegePlacementSummaryQuery,
  useCdcrMembersQuery,
  useAssignCdcrMemberMutation,
  useRemoveCdcrMemberMutation,
  useSearchCollegeStudentsQuery,
  useAllDrivesForCollegeQuery,
  useDriveInvitesForCollegeQuery,
  useSentInvitesByCollegeQuery,
  useRespondToDriveInviteMutation,
  useWithdrawDriveInviteMutation,
  useUpdatePlacementDriveMutation,
  useClosePlacementDriveMutation,
  usePendingAlumniClaimsQuery,
  useApproveAlumniClaimMutation,
  useRejectAlumniClaimMutation,
  useCollegePlacementStatsQuery,
} from "../../hooks/usePlatformQueries";
import {
  isSuperOrPlatformAdmin,
  isCollegeAdminFor,
  isTpoFor,
  isCdcrFor,
} from "../../core/utils/roles";
import { CollegeDetail as CollegeDetailView } from "./CollegeDetail";
import { TpoInviteCompanyModal } from "../jobs/TpoInviteCompanyModal";

const DriveApplicantsModal = lazy(() =>
  import("../jobs/DriveApplicantsModal").then((m) => ({ default: m.DriveApplicantsModal }))
);

interface CollegeDetailWrapperProps {
  collegeId: string;
}

export function CollegeDetailWrapper({ collegeId }: CollegeDetailWrapperProps) {
  const { user } = useAuth();
  const collegeQuery = useCollegeQuery(collegeId);
  const college = collegeQuery.data;
  const departmentsQuery = useDepartmentsQuery(college?.id);
  const createDepartment = useCreateDepartmentMutation(college?.id);

  // Public placement summary (no auth required)
  const placementSummaryQuery = useCollegePlacementSummaryQuery(college?.id);

  // Modals state
  const [showInviteCompanyModal, setShowInviteCompanyModal] = useState(false);
  const [selectedDriveForApplicants, setSelectedDriveForApplicants] = useState<{ id: string; title: string } | null>(null);

  const isTpoPortal = isCollegeAdminFor(user, college?.id || "");
  const isUserTpo = isTpoFor(user, college?.id || "");
  const isUserCdcr = isCdcrFor(user, college?.id || "");
  const isTpo = isTpoPortal;

  // CDCR management
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const cdcrQuery = useCdcrMembersQuery(isUserCdcr ? college?.id : null);
  const assignMutation = useAssignCdcrMemberMutation(college?.id || "");
  const removeMutation = useRemoveCdcrMemberMutation(college?.id || "");
  const searchResultsQuery = useSearchCollegeStudentsQuery(
    isUserCdcr ? (college?.id || "") : "",
    isUserCdcr ? debouncedSearchQuery : ""
  );

  // Drives management (TPO view)
  const allDrivesQuery = useAllDrivesForCollegeQuery(isTpo ? college?.id : null);
  const driveInvitesQuery = useDriveInvitesForCollegeQuery(isTpo ? college?.id : null);
  const sentInvitesQuery = useSentInvitesByCollegeQuery(isTpo ? college?.id : null);
  const respondToInviteMutation = useRespondToDriveInviteMutation(college?.id);
  const withdrawInviteMutation = useWithdrawDriveInviteMutation(college?.id);
  const updateDriveMutation = useUpdatePlacementDriveMutation();
  const closeDriveMutation = useClosePlacementDriveMutation();

  // Alumni verification (TPO view)
  const alumniClaimsQuery = usePendingAlumniClaimsQuery(isTpo ? college?.id : null);
  const approveAlumniMutation = useApproveAlumniClaimMutation(college?.id);
  const rejectAlumniMutation = useRejectAlumniClaimMutation(college?.id);

  // Stats / Analytics
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const statsQuery = useCollegePlacementStatsQuery(isTpo ? college?.id : null, selectedYear);

  // Only platform admins or actual CollegeAdmin records can create departments (NOT CDCR)
  const canManageDepartments =
    isSuperOrPlatformAdmin(user) ||
    Boolean(user?.collegeAdminships?.some((adm) => adm.collegeId === college?.id));

  const handleCreateDepartment = async (name: string) => {
    await createDepartment.mutateAsync(name);
  };

  const handleAssignCdcrMember = async (userId: string) => {
    await assignMutation.mutateAsync(userId);
  };

  const handleRemoveCdcrMember = async (userId: string) => {
    await removeMutation.mutateAsync(userId);
  };

  const handleApproveAlumniClaim = async (claimId: string) => {
    await approveAlumniMutation.mutateAsync(claimId);
  };

  const handleRejectAlumniClaim = async (claimId: string) => {
    await rejectAlumniMutation.mutateAsync(claimId);
  };

  const handleOpenDrive = async (driveId: string) => {
    await updateDriveMutation.mutateAsync({ id: driveId, data: { status: "ONGOING" } });
  };

  const handleCloseDrive = async (driveId: string) => {
    await closeDriveMutation.mutateAsync(driveId);
  };

  const handleWithdrawInvite = async (inviteId: string) => {
    await withdrawInviteMutation.mutateAsync(inviteId);
  };

  const handleRespondToInvite = async (payload: { inviteId: string; action: "ACCEPT" | "REJECT" }) => {
    await respondToInviteMutation.mutateAsync(payload);
  };

  if (collegeQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
        <Loader2 className="animate-spin" size={16} />
        Loading college
      </div>
    );
  }

  if (!college) {
    return <EmptyState icon={GraduationCap} title="College not found" text="This college is unavailable." />;
  }

  const driveInvitesCount = (driveInvitesQuery.data || []).filter((i) => i.status === "PENDING").length;
  const sentInvitesCount = (sentInvitesQuery.data || []).filter((i) => i.status === "PENDING").length;
  const alumniClaimsCount = (alumniClaimsQuery.data || []).length;

  return (
    <>
      <CollegeDetailView
        college={college}
        user={user}
        departments={departmentsQuery.data || []}
        isCreateDepartmentPending={createDepartment.isPending}
        onCreateDepartment={handleCreateDepartment}
        placementSummary={placementSummaryQuery.data}
        isPlacementSummaryLoading={placementSummaryQuery.isLoading}
        isUserTpo={isUserTpo}
        isUserCdcr={isUserCdcr}
        isTpo={isTpo}
        canManageDepartments={canManageDepartments}
        onInviteCompanyClick={() => setShowInviteCompanyModal(true)}
        onViewApplicants={(drive) => setSelectedDriveForApplicants(drive)}
        cdcrMembers={cdcrQuery.data || []}
        isCdcrMembersLoading={cdcrQuery.isLoading}
        onAssignCdcrMember={handleAssignCdcrMember}
        isAssignCdcrMemberPending={assignMutation.isPending}
        onRemoveCdcrMember={handleRemoveCdcrMember}
        isRemoveCdcrMemberPending={removeMutation.isPending}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResultsQuery.data || []}
        isSearchResultsLoading={searchResultsQuery.isLoading}
        alumniClaims={alumniClaimsQuery.data || []}
        isAlumniClaimsLoading={alumniClaimsQuery.isLoading}
        onApproveClaim={handleApproveAlumniClaim}
        isApproveClaimPending={approveAlumniMutation.isPending}
        onRejectClaim={handleRejectAlumniClaim}
        isRejectClaimPending={rejectAlumniMutation.isPending}
        allDrives={allDrivesQuery.data || []}
        isAllDrivesLoading={allDrivesQuery.isLoading}
        onOpenDrive={handleOpenDrive}
        isOpenDrivePending={updateDriveMutation.isPending}
        onCloseDrive={handleCloseDrive}
        isCloseDrivePending={closeDriveMutation.isPending}
        sentInvites={sentInvitesQuery.data || []}
        isSentInvitesLoading={sentInvitesQuery.isLoading}
        onWithdrawInvite={handleWithdrawInvite}
        isWithdrawInvitePending={withdrawInviteMutation.isPending}
        driveInvites={driveInvitesQuery.data || []}
        isDriveInvitesLoading={driveInvitesQuery.isLoading}
        onRespondToInvite={handleRespondToInvite}
        isRespondToInvitePending={respondToInviteMutation.isPending}
        stats={statsQuery.data}
        isStatsLoading={statsQuery.isLoading}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        driveInvitesCount={driveInvitesCount}
        sentInvitesCount={sentInvitesCount}
        alumniClaimsCount={alumniClaimsCount}
      />

      {showInviteCompanyModal && (
        <TpoInviteCompanyModal
          collegeId={college.id}
          collegeName={college.name}
          onClose={() => setShowInviteCompanyModal(false)}
        />
      )}
      {selectedDriveForApplicants && (
        <Suspense fallback={null}>
          <DriveApplicantsModal
            driveId={selectedDriveForApplicants.id}
            driveTitle={selectedDriveForApplicants.title}
            onClose={() => setSelectedDriveForApplicants(null)}
          />
        </Suspense>
      )}
    </>
  );
}
export default CollegeDetailWrapper;
