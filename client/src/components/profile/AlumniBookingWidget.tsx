import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, AlertCircle, Clock } from "lucide-react";
import { api } from "../../lib/api";
import { useToast } from "../../core/contexts/ToastContext";
import { formatDate } from "../../core/utils/format";

interface AlumniBookingWidgetProps {
  alumniId: string;
}

export function AlumniBookingWidget({ alumniId }: AlumniBookingWidgetProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");

  // Query open slots for this alumni
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["alumniSlots", alumniId],
    queryFn: async () => {
      const res = await api.getAlumniSlots(alumniId);
      return res?.data || [];
    },
  });

  // Book slot mutation
  const bookMutation = useMutation({
    mutationFn: (payload: { slotId: string; topic: string; notes?: string; meetingUrl?: string }) =>
      api.bookAlumniSlot(payload.slotId, {
        topic: payload.topic,
        notes: payload.notes,
        meetingUrl: payload.meetingUrl,
      }),
    onSuccess: () => {
      showToast("success", "Mentorship slot booked successfully!");
      setSelectedSlotId("");
      setTopic("");
      setNotes("");
      setMeetingUrl("");
      queryClient.invalidateQueries({ queryKey: ["alumniSlots", alumniId] });
      queryClient.invalidateQueries({ queryKey: ["studentOutgoingBookings"] });
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Failed to book slot.");
    },
  });

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId || !topic.trim()) return;

    bookMutation.mutate({
      slotId: selectedSlotId,
      topic,
      notes,
      meetingUrl,
    });
  };

  return (
    <div className="panel p-5 space-y-4" style={{ background: "var(--bg-surface)" }}>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
          <Clock className="text-indigo-500" size={16} />
          Book 1:1 Mentorship Session
        </h3>
        <p className="text-xs text-muted-fg leading-relaxed">
          Select an available time slot published by this alumni to schedule a 1:1 mentoring call.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-indigo-500" size={18} />
        </div>
      ) : slots.length === 0 ? (
        <div className="p-4 border border-dashed border-border rounded-lg text-center">
          <p className="text-xs text-muted-fg flex items-center justify-center gap-1">
            <AlertCircle size={12} />
            No open availability slots found.
          </p>
        </div>
      ) : (
        <form onSubmit={handleBookSubmit} className="space-y-4 pt-2">
          {/* Slots selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider block">Available Time Slots</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-1 no-scrollbar">
              {slots.map((slot: any) => {
                const isSelected = selectedSlotId === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                      isSelected
                        ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                        : "bg-surface hover:bg-card border-border text-primary"
                    }`}
                  >
                    <span>{formatDate(slot.startTime)}</span>
                    {isSelected && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form details when slot selected */}
          {selectedSlotId && (
            <div className="space-y-3.5 border-t border-border pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider block">Session Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. System Design review, Resume screening"
                  required
                  className="w-full text-xs text-primary rounded-lg border border-border p-2 focus:border-indigo-500 focus:outline-none bg-surface"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider block">Custom Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Share any questions or contexts you want to cover..."
                  rows={3}
                  className="w-full text-xs text-primary rounded-lg border border-border p-2 focus:border-indigo-500 focus:outline-none bg-surface"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider block">Your Meeting Link (Optional)</label>
                <input
                  type="url"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="e.g., Zoom, Google Meet (leave blank for default platform chat)"
                  className="w-full text-xs text-primary rounded-lg border border-border p-2 focus:border-indigo-500 focus:outline-none bg-surface"
                />
              </div>

              <button
                type="submit"
                disabled={bookMutation.isPending}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2.5 text-xs font-semibold transition disabled:opacity-50"
              >
                {bookMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : null}
                Confirm Mentorship Session
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
