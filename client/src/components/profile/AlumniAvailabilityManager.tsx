import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Calendar, Video, Clock } from "lucide-react";
import { api } from "../../lib/api";
import { useToast } from "../../core/contexts/ToastContext";
import { formatDate } from "../../core/utils/format";

export function AlumniAvailabilityManager() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [slotDate, setSlotDate] = useState("");
  const [slotStartTime, setSlotStartTime] = useState("");
  const [slotEndTime, setSlotEndTime] = useState("");

  // Query incoming bookings
  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["alumniIncomingBookings"],
    queryFn: async () => {
      const res = await api.getAlumniIncomingBookings();
      return res?.data || [];
    },
  });

  // Create slot mutation
  const createSlotMutation = useMutation({
    mutationFn: (body: { slots: Array<{ startTime: string; endTime: string }> }) =>
      api.createAlumniSlots(body),
    onSuccess: () => {
      showToast("success", "Mentorship slots published successfully!");
      setSlotDate("");
      setSlotStartTime("");
      setSlotEndTime("");
      queryClient.invalidateQueries({ queryKey: ["alumniIncomingBookings"] });
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Failed to publish slot.");
    },
  });

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => api.cancelAlumniBooking(bookingId),
    onSuccess: () => {
      showToast("success", "Mentorship session cancelled.");
      queryClient.invalidateQueries({ queryKey: ["alumniIncomingBookings"] });
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Cancellation failed.");
    },
  });

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotDate || !slotStartTime || !slotEndTime) return;
    const startStr = `${slotDate}T${slotStartTime}:00`;
    const endStr = `${slotDate}T${slotEndTime}:00`;

    if (new Date(startStr) >= new Date(endStr)) {
      showToast("error", "End time must be after start time");
      return;
    }
    if (new Date(startStr) < new Date()) {
      showToast("error", "Cannot schedule slots in the past");
      return;
    }

    createSlotMutation.mutate({
      slots: [{ startTime: startStr, endTime: endStr }],
    });
  };

  return (
    <div className="space-y-6">
      {/* Slot Scheduler Card */}
      <div className="p-5 border border-border rounded-xl bg-card shadow-sm" style={{ background: "var(--bg-surface)" }}>
        <h3 className="text-sm font-bold text-primary flex items-center gap-1.5 mb-4">
          <Clock size={16} className="text-indigo-500" />
          Create Availability Slot
        </h3>
        <form onSubmit={handleAddSlot} className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider block">Date</label>
            <input
              type="date"
              value={slotDate}
              onChange={(e) => setSlotDate(e.target.value)}
              required
              className="w-full text-xs text-primary rounded-lg border border-border p-2 focus:border-indigo-500 focus:outline-none bg-surface"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider block">Start Time</label>
            <input
              type="time"
              value={slotStartTime}
              onChange={(e) => setSlotStartTime(e.target.value)}
              required
              className="w-full text-xs text-primary rounded-lg border border-border p-2 focus:border-indigo-500 focus:outline-none bg-surface"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider block">End Time</label>
            <input
              type="time"
              value={slotEndTime}
              onChange={(e) => setSlotEndTime(e.target.value)}
              required
              className="w-full text-xs text-primary rounded-lg border border-border p-2 focus:border-indigo-500 focus:outline-none bg-surface"
            />
          </div>
          <button
            type="submit"
            disabled={createSlotMutation.isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2.5 text-xs font-semibold transition disabled:opacity-50"
          >
            {createSlotMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
            Publish Slot
          </button>
        </form>
      </div>

      {/* Roster lists */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-fg">Incoming Mentorship Sessions</h4>
        {loadingBookings ? (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-indigo-500" size={20} />
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-6 border border-dashed border-border rounded-xl text-center">
            <p className="text-xs text-muted-fg">No incoming mentorship bookings scheduled yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking: any) => (
              <div key={booking.id} className="p-4 border border-border rounded-xl bg-card shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ background: "var(--bg-surface)" }}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">
                      {booking.student?.profile?.fullName || booking.student?.username}
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
                      Join
                    </a>
                  )}
                  {booking.status === "SCHEDULED" && (
                    <button
                      onClick={() => cancelMutation.mutate(booking.id)}
                      disabled={cancelMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-600 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
