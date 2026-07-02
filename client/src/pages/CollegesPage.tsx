import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { useUrlState } from "../core/utils/useUrlState";
import { Loader2, GraduationCap } from "lucide-react";
import { EmptyState } from "../components/ui";
import { useAuth } from "../core/contexts/AuthContext";
import {
  useCollegesQuery,
  useCollegeQuery,
  useSearchCollegesQuery,
  useCreateCollegeMutation,
  useCreateDepartmentMutation,
  useDepartmentsQuery,
  useCdcrMembersQuery,
  useAssignCdcrMemberMutation,
  useRemoveCdcrMemberMutation,
  useSearchCollegeStudentsQuery,
  useAllDrivesForCollegeQuery,
  useDriveInvitesForCollegeQuery,
  useSentInvitesByCollegeQuery,
  useRespondToDriveInviteMutation,
  useUpdatePlacementDriveMutation,
  useClosePlacementDriveMutation,
  useWithdrawDriveInviteMutation,
  usePendingAlumniClaimsQuery,
  useApproveAlumniClaimMutation,
  useRejectAlumniClaimMutation,
  useCollegePlacementStatsQuery,
  useCollegePlacementSummaryQuery,
} from "../hooks/usePlatformQueries";
import { College } from "../lib/api";
import { compactPayload } from "../core/utils/format";
import { isSuperOrPlatformAdmin, isCollegeAdminFor, isTpoFor, isCdcrFor } from "../core/utils/roles";

// Extracted Presentational Components
import { CollegeList } from "../components/colleges/CollegeList";
import { CollegeDetail as CollegeDetailView } from "../components/colleges/CollegeDetail";

const DriveApplicantsModal = lazy(() =>
  import("../components/jobs/DriveApplicantsModal").then((m) => ({ default: m.DriveApplicantsModal }))
);
import { TpoInviteCompanyModal } from "../components/jobs/TpoInviteCompanyModal";

const flattenColleges = (pages?: Array<{ colleges: College[] }>) =>
  (pages || []).flatMap((page) => page.colleges || []);

function CollegeDetailWrapper({ collegeId }: { collegeId: string }) {
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

export function CollegesPage() {
  const { collegeSlug } = useParams();
  const { user } = useAuth();
  const [query, setQuery] = useUrlState("search", "", { replace: true });
  const [stateFilter, setStateFilter] = useUrlState("state", "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const collegesQuery = useCollegesQuery(40);
  const searchCollegesQuery = useSearchCollegesQuery(debouncedQuery);

  const isSearching = debouncedQuery.length >= 2;
  const colleges = isSearching
    ? searchCollegesQuery.data || []
    : flattenColleges(collegesQuery.data?.pages);

  const isAdmin = isSuperOrPlatformAdmin(user);

  const filteredColleges = useMemo(() => {
    let list = colleges;
    if (isSearching) {
      list = searchCollegesQuery.data || [];
    }
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedState = stateFilter.trim().toLowerCase();

    return list.filter((college) => {
      const matchQuery = !normalizedQuery || 
        [college.name, college.city, college.state].filter(Boolean).join(" ").toLowerCase().includes(normalizedQuery);
      const matchState = !normalizedState || 
        (college.state && college.state.toLowerCase() === normalizedState);
      return matchQuery && matchState;
    });
  }, [colleges, query, stateFilter, isSearching, searchCollegesQuery.data]);

  const createCollege = useCreateCollegeMutation();

  const handleCreateCollege = async (payload: {
    name: string;
    city: string;
    state: string;
    website: string;
    logoUrl: string;
  }) => {
    await createCollege.mutateAsync({
      name: payload.name,
      ...compactPayload({
        city: payload.city,
        state: payload.state,
        website: payload.website,
        logoUrl: payload.logoUrl,
      }),
    });
  };

  if (collegeSlug) {
    return <CollegeDetailWrapper collegeId={collegeSlug} />;
  }

  const isFetchingList = isSearching ? searchCollegesQuery.isFetching : collegesQuery.isFetching;

  return (
    <CollegeList
      query={query}
      setQuery={setQuery}
      filteredColleges={filteredColleges}
      isFetchingList={isFetchingList}
      isSearching={isSearching}
      hasNextPage={!isSearching && collegesQuery.hasNextPage}
      isFetchingNextPage={collegesQuery.isFetchingNextPage}
      fetchNextPage={() => collegesQuery.fetchNextPage()}
      isAdmin={isAdmin}
      user={user}
      onCreateCollege={handleCreateCollege}
      isCreatingCollege={createCollege.isPending}
    />
  );
}
