import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient
} from "@tanstack/react-query";
import {
  api,
  CollegeMutationPayload,
  PlacementDrive,
  PlacementDriveInvite
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../../core/contexts/AuthContext";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";

export const useSearchCollegesQuery = (q: string) =>
  useQuery({
    queryKey: ["colleges", "search", q],
    queryFn: async () => {
      const result = await api.searchColleges(q);
      return result.data || [];
    },
    enabled: q.trim().length >= 2,
  });



export const useCollegeQuery = (collegeId?: string) =>
  useQuery({
    queryKey: queryKeys.colleges.detail(collegeId || ""),
    queryFn: async ({ signal }) => {
      const result = await api.college(collegeId || "", { signal });
      return result.data;
    },
    enabled: Boolean(collegeId),
  });



export const useCollegesQuery = (limit = 50) =>
  useInfiniteQuery({
    queryKey: queryKeys.colleges.list(limit),
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.colleges(limit, { cursor: pageParam, signal });
      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });


export const useDepartmentsQuery = (collegeId?: string) =>
  useQuery({
    queryKey: queryKeys.colleges.departments(collegeId || ""),
    queryFn: async ({ signal }) => {
      const result = await api.departments(collegeId || "", { signal });
      return result.data || [];
    },
    enabled: Boolean(collegeId),
  });


export const useStandardDepartmentsQuery = () =>
  useQuery({
    queryKey: queryKeys.colleges.standardDepartments,
    queryFn: async ({ signal }) => {
      const result = await api.standardDepartments({ signal });
      return result.data || [];
    },
  });



export const useCreateCollegeMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: CollegeMutationPayload) => {
      if (!user) {
        throw new Error("Login required");
      }

      return api.createCollege(payload);
    },
    onSuccess: () => showToast("success", "College saved"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.colleges.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
    },
  });
};


export const useDeleteCollegeMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (collegeId: string) => {
      if (!user) {
        throw new Error("Login required");
      }

      return api.deleteCollege(collegeId);
    },
    onSuccess: () => showToast("success", "College deleted successfully"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.colleges.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
    },
  });
};



export const useCreateDepartmentMutation = (collegeId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (name: string) => {
      if (!user) {
        throw new Error("Login required");
      }
      if (!collegeId) {
        throw new Error("College missing");
      }

      return api.createDepartment({ name, collegeId });
    },
    onSuccess: () => showToast("success", "Department saved"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.colleges.all });
      if (collegeId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.colleges.departments(collegeId),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
    },
  });
};


export const usePlacementDrivesForCollegeQuery = (collegeId?: string | null) => {
  return useQuery({
    queryKey: ["placementDrives", "college", collegeId],
    queryFn: async ({ signal }) => {
      const result = await api.placementDrivesForCollege(collegeId!, { signal });
      return (result.data || []) as PlacementDrive[];
    },
    enabled: Boolean(collegeId),
  });
};


export const useSearchCollegeStudentsQuery = (collegeId: string, query: string) => {
  return useQuery({
    queryKey: ["colleges", collegeId, "students", "search", query],
    queryFn: async ({ signal }) => {
      const result = await api.searchCollegeStudents(collegeId, query, { signal });
      return result.data || [];
    },
    enabled: Boolean(collegeId) && query.trim().length >= 2,
  });
};

// ===========================================================================
// CAMPUS PLACEMENT DRIVES (EXTENDED) & INVITES
// ===========================================================================


export const useAllDrivesForCollegeQuery = (collegeId?: string | null) => {
  return useQuery({
    queryKey: ["placementDrives", "college", collegeId, "admin"],
    queryFn: async ({ signal }) => {
      const result = await api.allDrivesForCollege(collegeId!, { signal });
      return (result.data || []) as PlacementDrive[];
    },
    enabled: Boolean(collegeId),
  });
};


export const useDriveInvitesForCollegeQuery = (collegeId?: string | null) => {
  return useQuery({
    queryKey: ["driveInvites", "college", collegeId],
    queryFn: async ({ signal }) => {
      const result = await api.driveInvitesForCollege(collegeId!, { signal });
      return (result.data || []) as PlacementDriveInvite[];
    },
    enabled: Boolean(collegeId),
  });
};


export const useSentInvitesByCollegeQuery = (collegeId?: string | null) => {
  return useQuery({
    queryKey: ["driveInvites", "college", collegeId, "sent"],
    queryFn: async ({ signal }) => {
      const result = await api.sentInvitesByCollege(collegeId!, { signal });
      return (result.data || []) as PlacementDriveInvite[];
    },
    enabled: Boolean(collegeId),
  });
};


export const useCollegePlacementStatsQuery = (collegeId?: string | null, year?: number) => {
  return useQuery({
    queryKey: ["placementDrives", "college", collegeId, "stats", year],
    queryFn: async ({ signal }) => {
      const result = await api.getCollegeStats(collegeId!, year, { signal });
      return result.data;
    },
    enabled: Boolean(collegeId),
  });
};

// Public — no auth required, for the college public profile page

export const useCollegePlacementSummaryQuery = (collegeId?: string | null) => {
  return useQuery({
    queryKey: ["colleges", collegeId, "placement-summary"],
    queryFn: async ({ signal }) => {
      const result = await api.collegePlacementSummary(collegeId!, { signal });
      return result.data;
    },
    enabled: Boolean(collegeId),
    staleTime: 5 * 60 * 1000, // 5 min cache — public data changes infrequently
  });
};
