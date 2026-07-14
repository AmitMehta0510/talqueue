import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Calendar, Video } from "lucide-react";
import { api } from "../../lib/api";
import { useToast } from "../../core/contexts/ToastContext";
import { formatDate } from "../../core/utils/format";

export function MentorshipBookingsList() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Query student outgoing bookings
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["studentOutgoingBookings"],
    queryFn: async () => {
      const res = await api.getStudentOutgoingBookings();
      return res?.data || [];
    },
  });

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => api.cancelAlumniBooking(bookingId),
    onSuccess: () => {
      showToast("success", "Booking cancelled successfully.");
      queryClient.invalidateQueries({ queryKey: ["studentOutgoingBookings"] });
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Failed to cancel booking.");
    },
  });

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-fg">My Scheduled Mentorship Sessions</h4>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-indigo-500" size={20} />
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-6 border border-dashed border-border rounded-xl text-center">
          <p className="text-xs text-muted-fg">You haven't scheduled any mentorship sessions with alumni yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking: any) => (
            <div key={booking.id} className="p-4 border border-border rounded-xl bg-card shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ background: "var(--bg-surface)" }}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary">
                    Mentor: {booking.slot.alumni?.profile?.fullName || booking.slot.alumni?.username}
                  </span>
                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded uppercase">
                    {booking.status}
                  </span>
                </div>
                <div className="text-[11px] text-primary font-medium">Topic: {booking.topic}</div>
                {booking.notes && <p className="text-[10px] text-muted-fg leading-relaxed">Notes: {booking.notes}</p>}
                <div className="flex items-center gap-2 text-[10px] text-muted-fg mt-1">
                  <Calendar size={10} />
                  <span>{formatDate(booking.slot.startTime)} - {formatDate(booking.slot.endTime).split(" ").pop()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                {booking.meetingUrl && (
                  <a
                    href={booking.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary hover:bg-card"
                  >
                    <Video size={12} />
                    Join Session
                  </a>
                )}
                {booking.status === "SCHEDULED" && (
                  <button
                    onClick={() => cancelMutation.mutate(booking.id)}
                    disabled={cancelMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-600 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
