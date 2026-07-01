import {
  useQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import {
  api,
  ExternalJobApplication,
  ExternalAppStatus,
  PlacementDrive,
  PlacementDriveApplication,
  PlacementDriveApplicationStatus,
  CdcrMember,
  EligibilityResult,
  PlacementDriveRound
} from "../../lib/api";
import { useAuth } from "../../core/contexts/AuthContext";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";

export const useMyExternalApplicationsQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["externalApplications", "mine"],
    queryFn: async ({ signal }) => {
      const result = await api.myExternalApplications({ signal });
      return (result.data || []) as ExternalJobApplication[];
    },
    enabled: Boolean(user),
  });
};


export const useCreateExternalApplicationMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (body: Parameters<typeof api.createExternalApplication>[0]) =>
      api.createExternalApplication(body),
    onSuccess: () => {
      showToast("success", "Application tracked!");
      queryClient.invalidateQueries({ queryKey: ["externalApplications", "mine"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useUpdateExternalApplicationStatusMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: ExternalAppStatus; notes?: string }) =>
      api.updateExternalApplicationStatus(id, { status, notes }),
    onSuccess: () => {
      showToast("success", "Status updated");
      queryClient.invalidateQueries({ queryKey: ["externalApplications", "mine"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useDeleteExternalApplicationMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.deleteExternalApplication(id),
    onSuccess: () => {
      showToast("success", "Tracking removed");
      queryClient.invalidateQueries({ queryKey: ["externalApplications", "mine"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};

// ===========================================================================
// PLACEMENT DRIVES
// ===========================================================================


export const useMyPostedDrivesQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["placementDrives", "mine"],
    queryFn: async ({ signal }) => {
      const result = await api.myPostedDrives({ signal });
      return (result.data || []) as PlacementDrive[];
    },
    enabled: Boolean(user),
  });
};


export const useCreatePlacementDriveMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (body: Parameters<typeof api.createPlacementDrive>[0]) =>
      api.createPlacementDrive(body),
    onSuccess: (result) => {
      showToast("success", "Placement drive posted!");
      const collegeId = result.data?.targetCollegeId;
      queryClient.invalidateQueries({ queryKey: ["placementDrives", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["placementDrives", "all", collegeId] });
      if (collegeId) {
        queryClient.invalidateQueries({ queryKey: ["placementDrives", "college", collegeId] });
      }
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useUpdatePlacementDriveMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updatePlacementDrive>[1] }) =>
      api.updatePlacementDrive(id, data),
    onSuccess: (result) => {
      showToast("success", "Drive updated.");
      const collegeId = result.data?.targetCollegeId;
      queryClient.invalidateQueries({ queryKey: ["placementDrives", "all", collegeId] });
      queryClient.invalidateQueries({ queryKey: ["placementDrives", "college", collegeId] });
      queryClient.invalidateQueries({ queryKey: ["placementDrives", "mine"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useClosePlacementDriveMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.closePlacementDrive(id),
    onSuccess: () => {
      showToast("success", "Drive closed.");
      queryClient.invalidateQueries({ queryKey: ["placementDrives"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


// ===========================================================================
// CDCR MANAGEMENT
// ===========================================================================


export const useCdcrMembersQuery = (collegeId?: string | null) => {
  return useQuery({
    queryKey: ["colleges", collegeId, "cdcr"],
    queryFn: async ({ signal }) => {
      const result = await api.listCdcrMembers(collegeId!, { signal });
      return (result.data || []) as CdcrMember[];
    },
    enabled: Boolean(collegeId),
  });
};


export const useAssignCdcrMemberMutation = (collegeId: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => api.assignCdcrMember(collegeId, userId),
    onSuccess: () => {
      showToast("success", "CDCR Representative assigned successfully!");
      queryClient.invalidateQueries({ queryKey: ["colleges", collegeId, "cdcr"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useRemoveCdcrMemberMutation = (collegeId: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => api.removeCdcrMember(collegeId, userId),
    onSuccess: () => {
      showToast("success", "CDCR Representative removed successfully!");
      queryClient.invalidateQueries({ queryKey: ["colleges", collegeId, "cdcr"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useApplyToDriveMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ driveId, note }: { driveId: string; note?: string }) =>
      api.applyToDrive(driveId, note),
    onSuccess: () => {
      showToast("success", "Application submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["placementDrives"] });
      queryClient.invalidateQueries({ queryKey: ["placementDrives", "applications"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useMyDriveApplicationsQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["placementDrives", "applications", "mine"],
    queryFn: async ({ signal }) => {
      const result = await api.myDriveApplications({ signal });
      return (result.data || []) as PlacementDriveApplication[];
    },
    enabled: Boolean(user),
  });
};


export const useDriveApplicantsQuery = (driveId?: string | null) => {
  return useQuery({
    queryKey: ["placementDrives", driveId, "applicants"],
    queryFn: async ({ signal }) => {
      const result = await api.getDriveApplicants(driveId!, { signal });
      return (result.data || []) as PlacementDriveApplication[];
    },
    enabled: Boolean(driveId),
  });
};


export const useUpdateDriveApplicationStatusMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: string; status: PlacementDriveApplicationStatus }) =>
      api.updateDriveApplicationStatus(applicationId, status),
    onSuccess: (result) => {
      showToast("success", `Application status updated to ${result.data?.status || ""}.`);
      queryClient.invalidateQueries({ queryKey: ["placementDrives"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useSendDriveInviteMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (body: Parameters<typeof api.sendDriveInvite>[0]) =>
      api.sendDriveInvite(body),
    onSuccess: (result) => {
      showToast("success", "Placement drive invite sent!");
      const companyId = result.data?.companyId;
      const collegeId = result.data?.collegeId;
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: ["driveInvites", "company", companyId] });
      }
      if (collegeId) {
        queryClient.invalidateQueries({ queryKey: ["driveInvites", "college", collegeId] });
      }
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useRespondToDriveInviteMutation = (collegeId?: string | null) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ inviteId, action }: { inviteId: string; action: "ACCEPT" | "REJECT" }) =>
      api.respondToDriveInvite(inviteId, action),
    onSuccess: (result) => {
      showToast("success", `Invite has been ${result.data?.status.toLowerCase() || "updated"}.`);
      queryClient.invalidateQueries({ queryKey: ["driveInvites"] });
      queryClient.invalidateQueries({ queryKey: ["placementDrives"] });
      if (collegeId) {
        queryClient.invalidateQueries({ queryKey: ["driveInvites", "college", collegeId] });
      }
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useWithdrawDriveInviteMutation = (companyId?: string | null) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (inviteId: string) => api.withdrawDriveInvite(inviteId),
    onSuccess: () => {
      showToast("success", "Invite withdrawn.");
      queryClient.invalidateQueries({ queryKey: ["driveInvites"] });
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: ["driveInvites", "company", companyId] });
      }
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};

// ─── DRIVE ELIGIBILITY PRE-CHECK ─────────────────────────────────────────────


export const useDriveEligibilityQuery = (driveId?: string | null) => {
  return useQuery({
    queryKey: ["driveEligibility", driveId],
    queryFn: async ({ signal }) => {
      const result = await api.checkDriveEligibility(driveId!, { signal });
      return result.data as EligibilityResult;
    },
    enabled: Boolean(driveId),
    staleTime: 30_000, // 30 seconds — eligibility rarely changes mid-session
  });
};

// ─── Placement Drive Rounds Hooks ───────────────────────────────────────────


export const useDriveRoundsQuery = (driveId?: string | null) => {
  return useQuery({
    queryKey: ["placementDrives", driveId, "rounds"],
    queryFn: async ({ signal }) => {
      const result = await api.getDriveRounds(driveId!, { signal });
      return (result.data || []) as PlacementDriveRound[];
    },
    enabled: Boolean(driveId),
  });
};


export const useCreateDriveRoundMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ driveId, body }: { driveId: string; body: Partial<PlacementDriveRound> & { roundType: string } }) =>
      api.createDriveRound(driveId, body),
    onSuccess: (result) => {
      showToast("success", "Round created successfully!");
      queryClient.invalidateQueries({ queryKey: ["placementDrives", result.data?.driveId, "rounds"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useUpdateDriveRoundMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ roundId, body }: { roundId: string; body: Partial<PlacementDriveRound> }) =>
      api.updateDriveRound(roundId, body),
    onSuccess: (result) => {
      showToast("success", "Round updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["placementDrives", result.data?.driveId, "rounds"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useDeleteDriveRoundMutation = (driveId: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (roundId: string) => api.deleteDriveRound(roundId),
    onSuccess: () => {
      showToast("success", "Round deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["placementDrives", driveId, "rounds"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useShortlistForRoundMutation = (driveId: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ roundId, applicationIds, updateStatus }: { roundId: string; applicationIds: string[]; updateStatus?: PlacementDriveApplicationStatus }) =>
      api.shortlistForRound(roundId, applicationIds, updateStatus),
    onSuccess: () => {
      showToast("success", "Applicants shortlisted for round!");
      queryClient.invalidateQueries({ queryKey: ["placementDrives", driveId, "rounds"] });
      queryClient.invalidateQueries({ queryKey: ["placementDrives", driveId, "applicants"] });
      queryClient.invalidateQueries({ queryKey: ["placementDrives"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};

// ─── Alumni Claims Hooks ───────────────────────────────────────────────────


export const useClaimAlumniStatusMutation = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (collegeId: string) => api.claimAlumniStatus(collegeId),
    onSuccess: () => {
      showToast("success", "Alumni verification claim submitted successfully!");
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const usePendingAlumniClaimsQuery = (collegeId?: string | null) => {
  return useQuery({
    queryKey: ["colleges", collegeId, "alumni-claims"],
    queryFn: async ({ signal }) => {
      const result = await api.pendingAlumniClaims(collegeId!, { signal });
      return result.data || [];
    },
    enabled: Boolean(collegeId),
  });
};


export const useApproveAlumniClaimMutation = (collegeId?: string | null) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (educationId: string) => api.approveAlumniClaim(collegeId!, educationId),
    onSuccess: () => {
      showToast("success", "Alumni verification claim approved!");
      if (collegeId) {
        queryClient.invalidateQueries({ queryKey: ["colleges", collegeId, "alumni-claims"] });
      }
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useRejectAlumniClaimMutation = (collegeId?: string | null) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (educationId: string) => api.rejectAlumniClaim(collegeId!, educationId),
    onSuccess: () => {
      showToast("success", "Alumni verification claim rejected.");
      if (collegeId) {
        queryClient.invalidateQueries({ queryKey: ["colleges", collegeId, "alumni-claims"] });
      }
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useTpoDashboardStatsQuery = (enabled = true) => {
  return useQuery({
    queryKey: ["tpo", "dashboard", "stats"],
    queryFn: async ({ signal }) => {
      const result = await api.getTpoDashboardStats({ signal });
      return result.data;
    },
    enabled,
  });
};


export const useTpoStudentsQuery = (
  filters: {
    page: number;
    limit: number;
    graduationYear?: number;
    departmentId?: string;
    currentYear?: number;
    search?: string;
  },
  enabled = true
) => {
  return useQuery({
    queryKey: ["tpo", "dashboard", "students", filters],
    queryFn: async ({ signal }) => {
      const result = await api.getTpoStudents(filters, { signal });
      return result.data;
    },
    enabled,
  });
};


export const useTpoPlacementsQuery = (enabled = true) => {
  return useQuery({
    queryKey: ["tpo", "dashboard", "placements"],
    queryFn: async ({ signal }) => {
      const result = await api.getTpoPlacements({ signal });
      return result.data;
    },
    enabled,
  });
};


export const useTpoAlumniQuery = (enabled = true) => {
  return useQuery({
    queryKey: ["tpo", "dashboard", "alumni"],
    queryFn: async ({ signal }) => {
      const result = await api.getTpoAlumniVerifications({ signal });
      return result.data;
    },
    enabled,
  });
};


export const useApproveAlumniMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (educationId: string) => api.approveAlumniVerification(educationId),
    onSuccess: () => {
      showToast("success", "Alumni verification approved");
      queryClient.invalidateQueries({ queryKey: ["tpo", "dashboard", "alumni"] });
      queryClient.invalidateQueries({ queryKey: ["tpo", "dashboard", "stats"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useRejectAlumniMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (educationId: string) => api.rejectAlumniVerification(educationId),
    onSuccess: () => {
      showToast("success", "Alumni verification rejected");
      queryClient.invalidateQueries({ queryKey: ["tpo", "dashboard", "alumni"] });
      queryClient.invalidateQueries({ queryKey: ["tpo", "dashboard", "stats"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const usePublicBatchStudentsQuery = (
  collegeId: string,
  graduationYear: number,
  enabled = true
) => {
  return useQuery({
    queryKey: ["colleges", collegeId, "public-batch", graduationYear],
    queryFn: async ({ signal }) => {
      const result = await api.getPublicBatchStudents(collegeId, graduationYear, { signal });
      return result.data;
    },
    enabled: enabled && Boolean(collegeId) && Boolean(graduationYear),
  });
};
