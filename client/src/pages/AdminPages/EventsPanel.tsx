import React, { useState, FormEvent } from "react";
import {
  Loader2, Calendar, Plus, Users, Trash2, X, Search, ChevronDown, Check, Building2, MapPin, Video, Info, GraduationCap
} from "lucide-react";
import {
  useAdminEventsQuery,
  useAdminDeleteEventMutation,
  useAdminUpdateEventMutation,
  useCreateEventMutation,
  useAdminListEventAttendeesQuery,
} from "../../hooks/usePlatformQueries";
import { useToast } from "../../core/contexts/ToastContext";
import { SearchBar, DataTable, StatusBadge, fmtDate } from "./shared";
import { Avatar } from "../../components/ui";

export function EventsPanel() {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>("");

  const query = useAdminEventsQuery();
  const deleteEvent = useAdminDeleteEventMutation();
  const updateEvent = useAdminUpdateEventMutation();
  const createEvent = useCreateEventMutation();

  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [auditingEvent, setAuditingEvent] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const rawEvents = query.data ?? [];

  // Client-side search and filter mapping
  const events = rawEvents.filter((e: any) => {
    if (q && !e.title?.toLowerCase().includes(q.toLowerCase()) && !e.description?.toLowerCase().includes(q.toLowerCase())) return false;
    if (typeFilter && e.type !== typeFilter) return false;
    if (locationFilter === "ONLINE" && !e.meetingUrl && e.location?.toLowerCase() !== "online") return false;
    if (locationFilter === "IN_PERSON" && (e.meetingUrl && !e.location)) return false;
    return true;
  });

  const handleDelete = async (eventId: string) => {
    try {
      await deleteEvent.mutateAsync(eventId);
    } catch { /* toast handles */ }
  };

  const getOrganizerText = (event: any) => {
    if (event.college) return `College: ${event.college.name}`;
    if (event.company) return `Company: ${event.company.name}`;
    if (event.community) return `Community: ${event.community.name}`;
    return `User: @${event.createdBy?.username || "admin"}`;
  };

  const getOrganizerIcon = (event: any) => {
    if (event.college) return <GraduationCap size={11} className="text-blue-400" />;
    if (event.company) return <Building2 size={11} className="text-indigo-400" />;
    return <Users size={11} className="text-purple-400" />;
  };

  // Compute Stats
  const onlineCount = rawEvents.filter((e: any) => e.meetingUrl || e.location?.toLowerCase() === "online").length;
  const inPersonCount = rawEvents.length - onlineCount;

  return (
    <div className="space-y-4">
      {/* Title Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-350">Events Control Panel</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Moderate event directories, audit attendee matrix, or post compliance updates.</p>
        </div>
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-teal-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50"
          onClick={() => setIsCreating(true)}
        >
          <Plus size={13} />
          Create New Event
        </button>
      </div>

      {/* KPI stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-4">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-teal-600 opacity-10" />
          <div className="text-2xl font-black text-white">{rawEvents.length}</div>
          <div className="mt-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Events Loaded</div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-4">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 opacity-10" />
          <div className="text-2xl font-black text-blue-400">{onlineCount}</div>
          <div className="mt-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Online / Meeting Link</div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-4">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 opacity-10" />
          <div className="text-2xl font-black text-purple-400">{inPersonCount}</div>
          <div className="mt-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider">In Person / Physical Location</div>
        </div>
      </div>

      {/* Filters and search controls */}
      <div className="grid gap-3 sm:grid-cols-3 bg-zinc-900/20 p-3 rounded-xl border border-zinc-800/60">
        <div>
          <SearchBar
            value={q}
            onChange={setQ}
            placeholder="Search events by title..."
          />
        </div>
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full h-[38px] rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none transition"
          >
            <option value="">All Types</option>
            <option value="GENERAL">GENERAL</option>
            <option value="COLLEGE">COLLEGE</option>
            <option value="COMPANY">COMPANY</option>
          </select>
        </div>
        <div>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-full h-[38px] rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none transition"
          >
            <option value="">All Locations</option>
            <option value="ONLINE">Online (Meeting Link)</option>
            <option value="IN_PERSON">In Person</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        {query.isPending ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin text-indigo-500" />
          </div>
        ) : (
          <DataTable
            headers={["Title & Organizer", "Type", "Venue / Meeting", "RSVPs", "Dates", "Actions"]}
            empty={events.length === 0}
          >
            {events.map((e: any) => (
              <tr key={e.id} className="transition hover:bg-[var(--bg-surface-2)]">
                <td className="px-4 py-3">
                  <div className="font-semibold text-white max-w-xs truncate">{e.title}</div>
                  <div className="flex items-center gap-1 mt-0.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {getOrganizerIcon(e)}
                    <span className="truncate">{getOrganizerText(e)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-zinc-800 text-zinc-400">
                    {e.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {e.meetingUrl ? (
                    <a
                      href={e.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-indigo-400 font-semibold hover:underline"
                    >
                      <Video size={10} />
                      Virtual Link
                    </a>
                  ) : e.location ? (
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                      <MapPin size={10} className="text-zinc-500" />
                      <span className="truncate max-w-[120px]">{e.location}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-zinc-650">No details</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-zinc-300 font-bold">{e._count?.rsvps ?? 0}</span>
                  {e.capacity && <span className="text-zinc-600 text-[10px]"> / {e.capacity}</span>}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-[10px] whitespace-nowrap">
                  {e.startDate ? fmtDate(e.startDate) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-700/30 hover:bg-indigo-500/20 transition"
                      onClick={() => setAuditingEvent(e)}
                    >
                      Audit
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-[10px] px-2 py-1"
                      onClick={() => setEditingEvent(e)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-700/30 hover:bg-rose-500/20 transition"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${e.title}"?`)) {
                          handleDelete(e.id);
                        }
                      }}
                      disabled={deleteEvent.isPending}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </div>

      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {isCreating && (
        <CreateEventModal
          onClose={() => setIsCreating(false)}
        />
      )}

      {auditingEvent && (
        <AuditAttendeesModal
          event={auditingEvent}
          onClose={() => setAuditingEvent(null)}
        />
      )}
    </div>
  );
}

// ─── AUDIT ATTENDEES MODAL ───────────────────────────────────────────────────
function AuditAttendeesModal({ event, onClose }: { event: any; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const limit = 10;

  const query = useAdminListEventAttendeesQuery(event.id, { page, limit });
  const attendeesData = query.data;
  const rsvps = attendeesData?.rsvps || [];
  const pagination = attendeesData?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between border-b p-4" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Users size={16} className="text-indigo-400" />
            RSVPs Auditing Directory
          </h3>
          <button type="button" className="icon-btn h-8 w-8" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-zinc-800/40 rounded-lg p-3 border border-zinc-700/50">
            <div className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Event Auditing Scope:</div>
            <div className="text-sm font-semibold text-white mt-0.5">{event.title}</div>
            <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-2">
              <span>{fmtDate(event.startDate)}</span>
              <span>•</span>
              <span>{pagination.total} registered attendees</span>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden min-h-[220px]">
            {query.isPending ? (
              <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-indigo-500" /></div>
            ) : rsvps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Info size={18} className="text-zinc-600 mb-2" />
                <span className="text-xs text-zinc-550 italic">No attendee RSVPs tracked yet</span>
              </div>
            ) : (
              <div className="divide-y divide-zinc-850">
                {rsvps.map((rsvp: any) => (
                  <div key={rsvp.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-850/30 transition">
                    <div className="flex items-center gap-2">
                      <Avatar
                        user={{
                          username: rsvp.user?.username,
                          profile: { avatarUrl: rsvp.user?.profile?.avatarUrl }
                        } as any}
                        size="sm"
                      />
                      <div>
                        <div className="text-xs font-semibold text-white">{rsvp.user?.profile?.fullName || rsvp.user?.username}</div>
                        <div className="text-[9px] text-zinc-550">@{rsvp.user?.username}</div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-black uppercase ring-1 ${
                      rsvp.status === "GOING" ? "bg-indigo-500/15 text-indigo-400 ring-indigo-500/30" :
                      rsvp.status === "MAYBE" ? "bg-amber-500/15 text-amber-400 ring-amber-500/30" :
                      "bg-rose-500/15 text-rose-400 ring-rose-500/30"
                    }`}>
                      {rsvp.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>Page {page} of {pagination.totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || query.isFetching}
                  className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] font-semibold text-zinc-350 hover:text-white transition disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages || query.isFetching}
                  className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] font-semibold text-zinc-350 hover:text-white transition disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EDIT EVENT MODAL ────────────────────────────────────────────────────────
function EditEventModal({ event, onClose }: { event: any; onClose: () => void }) {
  const updateEvent = useAdminUpdateEventMutation();
  const { showToast } = useToast();

  const [title, setTitle] = useState(event.title || "");
  const [description, setDescription] = useState(event.description || "");
  const [location, setLocation] = useState(event.location || "");
  const [meetingUrl, setMeetingUrl] = useState(event.meetingUrl || "");
  const [capacity, setCapacity] = useState(event.capacity !== null && event.capacity !== undefined ? String(event.capacity) : "");
  const [type, setType] = useState<string>(event.type || "GENERAL");

  const toDateInputStr = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toISOString().substring(0, 16);
  };

  const [startDate, setStartDate] = useState(toDateInputStr(event.startDate));
  const [endDate, setEndDate] = useState(toDateInputStr(event.endDate));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("error", "Event title is required");
      return;
    }
    if (!startDate || !endDate) {
      showToast("error", "Start and End dates are required");
      return;
    }

    try {
      await updateEvent.mutateAsync({
        eventId: event.id,
        data: {
          title,
          description: description || null,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          location: location || null,
          meetingUrl: meetingUrl || null,
          capacity: capacity ? Number(capacity) : null,
          type,
        },
      });
      onClose();
    } catch { /* mutation handles */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between border-b p-4" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Calendar size={16} className="text-indigo-400" />
            Edit Event Parameters
          </h3>
          <button type="button" className="icon-btn h-8 w-8" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="space-y-1">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Event Title *</label>
            <input
              type="text"
              className="field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Description</label>
            <textarea
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none transition h-20 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Start Date & Time *</label>
              <input
                type="datetime-local"
                className="field text-xs"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>End Date & Time *</label>
              <input
                type="datetime-local"
                className="field text-xs"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Location (Physical)</label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Auditorium Hall A"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Meeting Link (Virtual)</label>
              <input
                type="url"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://zoom.us/j/..."
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Capacity Limit</label>
              <input
                type="number"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Unlimited if empty"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Event Scope Type</label>
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="GENERAL">GENERAL</option>
                <option value="COLLEGE">COLLEGE</option>
                <option value="COMPANY">COMPANY</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              className="btn-secondary px-4 py-2 text-xs"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-4 py-2 text-xs disabled:opacity-50"
              disabled={updateEvent.isPending}
            >
              {updateEvent.isPending && <Loader2 size={12} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── CREATE EVENT MODAL ──────────────────────────────────────────────────────
function CreateEventModal({ onClose }: { onClose: () => void }) {
  const createEvent = useCreateEventMutation();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [capacity, setCapacity] = useState("");
  const [type, setType] = useState<string>("GENERAL");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("error", "Event title is required");
      return;
    }
    if (!startDate || !endDate) {
      showToast("error", "Start and End dates are required");
      return;
    }

    try {
      await createEvent.mutateAsync({
        title,
        description: description || null,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        location: location || null,
        meetingUrl: meetingUrl || null,
        capacity: capacity ? Number(capacity) : null,
        type,
      });
      onClose();
    } catch { /* toast display */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between border-b p-4" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Plus size={18} className="text-indigo-400" />
            Post New Compliance Event
          </h3>
          <button type="button" className="icon-btn h-8 w-8" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="space-y-1">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Event Title *</label>
            <input
              type="text"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Platform Alignment Session"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Description</label>
            <textarea
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition h-20 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a comprehensive event overview..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Start Date & Time *</label>
              <input
                type="datetime-local"
                className="field text-xs"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>End Date & Time *</label>
              <input
                type="datetime-local"
                className="field text-xs"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Location (Physical)</label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Auditorium Hall A"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Meeting Link (Virtual)</label>
              <input
                type="url"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-655 focus:border-indigo-500 focus:outline-none transition"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://zoom.us/j/..."
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Capacity Limit</label>
              <input
                type="number"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Unlimited if empty"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Event Scope Type</label>
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="GENERAL">GENERAL</option>
                <option value="COLLEGE">COLLEGE</option>
                <option value="COMPANY">COMPANY</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              className="btn-secondary px-4 py-2 text-xs"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-4 py-2 text-xs disabled:opacity-50"
              disabled={createEvent.isPending}
            >
              {createEvent.isPending && <Loader2 size={12} className="animate-spin" />}
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
