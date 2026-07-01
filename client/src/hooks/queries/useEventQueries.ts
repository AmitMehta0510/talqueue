import {
  useQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import {
  api,
  RSVPStatus
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";

export const useEventsQuery = (params?: { collegeId?: string; companyId?: string; communityId?: string; type?: string }) => {
  return useQuery({
    queryKey: queryKeys.events.list(params),
    queryFn: async ({ signal }) => {
      const res = await api.events(params, { signal });
      return res.data || [];
    },
  });
};


export const useEventQuery = (id: string) => {
  return useQuery({
    queryKey: queryKeys.events.detail(id),
    queryFn: async ({ signal }) => {
      const res = await api.event(id, { signal });
      return res.data;
    },
    enabled: Boolean(id),
  });
};


export const useCreateEventMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (body: any) => api.createEvent(body),
    onSuccess: () => {
      showToast("success", "Event created successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};


export const useUpdateEventMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.updateEvent(id, body),
    onSuccess: (result) => {
      showToast("success", "Event updated successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(result.data.id) });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};


export const useDeleteEventMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.deleteEvent(id),
    onSuccess: () => {
      showToast("success", "Event deleted successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};


export const useRsvpEventMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RSVPStatus }) => api.rsvpEvent(id, status),
    onSuccess: (result, { id }) => {
      showToast("success", "RSVP status updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(id) });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};


// ===========================================================================
// EXTERNAL JOB APPLICATIONS
// ===========================================================================
