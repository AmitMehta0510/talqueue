import React, { useState } from "react";
import {
  Calendar,
  MapPin,
  Link as LinkIcon,
  Users,
  Plus,
  X,
  Loader2,
  GraduationCap,
  Building2,
  Globe,
  Trash2,
  Edit2,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  useEventsQuery,
  useCreateEventMutation,
  useRsvpEventMutation,
  useDeleteEventMutation,
  useUpdateEventMutation,
} from "../hooks/usePlatformQueries";
import { Event, RSVPStatus, EventType } from "../lib/api";
import { EmptyState } from "../components/ui";

const EVENT_TYPE_CONFIG: Record<
  EventType,
  { label: string; icon: React.ElementType; chipClass: string }
> = {
  COLLEGE: {
    label: "Campus Event",
    icon: GraduationCap,
    chipClass: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  },
  COMPANY: {
    label: "Corporate Event",
    icon: Building2,
    chipClass: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  GENERAL: {
    label: "General Session",
    icon: Globe,
    chipClass: "bg-teal-50 text-teal-700 border border-teal-200",
  },
};

const RSVP_CONFIG = {
  GOING: { label: "Going", activeClass: "bg-emerald-700 text-white", inactiveClass: "btn-secondary" },
  MAYBE: { label: "Maybe", activeClass: "bg-amber-600 text-white border-amber-600", inactiveClass: "btn-secondary" },
  DECLINED: { label: "Decline", activeClass: "bg-rose-600 text-white border-rose-600", inactiveClass: "btn-secondary" },
};

function EventTypeChip({ type }: { type: EventType }) {
  const { label, icon: Icon, chipClass } = EVENT_TYPE_CONFIG[type] ?? EVENT_TYPE_CONFIG.GENERAL;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${chipClass}`}>
      <Icon size={10} />
      {label}
    </span>
  );
}

function RSVPChip({ status }: { status: RSVPStatus }) {
  const colorMap: Record<RSVPStatus, string> = {
    GOING: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    MAYBE: "bg-amber-50 text-amber-700 border border-amber-200",
    DECLINED: "bg-rose-50 text-rose-700 border border-rose-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${colorMap[status]}`}>
      RSVP: {status}
    </span>
  );
}

function formatEventDate(isoString: string) {
  return new Date(isoString).toLocaleString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface EventFormState {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  meetingUrl: string;
  capacity: string;
  type: EventType;
}

const emptyForm: EventFormState = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  location: "",
  meetingUrl: "",
  capacity: "",
  type: "GENERAL",
};

function EventForm({
  initial,
  onSubmit,
  isPending,
  onCancel,
  isEditing,
}: {
  initial?: EventFormState;
  onSubmit: (data: EventFormState) => void;
  isPending: boolean;
  onCancel: () => void;
  isEditing: boolean;
}) {
  const [form, setForm] = useState<EventFormState>(initial ?? emptyForm);
  const set = <K extends keyof EventFormState>(k: K, v: EventFormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate || !form.endDate) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="panel p-5 space-y-4">
      <h2 className="text-base font-bold text-slate-950">
        {isEditing ? "Edit Event" : "Create a New Event"}
      </h2>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Title *
          </label>
          <input
            className="field"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. ACM Web Dev Bootcamp 2026"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Description
          </label>
          <textarea
            className="field min-h-20 resize-none"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Schedule, agenda, speakers…"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Start Date & Time *
          </label>
          <input
            type="datetime-local"
            className="field"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            End Date & Time *
          </label>
          <input
            type="datetime-local"
            className="field"
            value={form.endDate}
            onChange={(e) => set("endDate", e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Event Type *
          </label>
          <select
            className="field"
            value={form.type}
            onChange={(e) => set("type", e.target.value as EventType)}
          >
            <option value="GENERAL">General Meetup / Info Session</option>
            <option value="COLLEGE">Campus Event (College)</option>
            <option value="COMPANY">Corporate Event (Company)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Max Capacity (optional)
          </label>
          <input
            type="number"
            className="field"
            value={form.capacity}
            onChange={(e) => set("capacity", e.target.value)}
            placeholder="e.g. 100"
            min={1}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Venue / Location
          </label>
          <input
            type="text"
            className="field"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="e.g. Seminar Hall, Block C"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Meeting Link (Online)
          </label>
          <input
            type="url"
            className="field"
            value={form.meetingUrl}
            onChange={(e) => set("meetingUrl", e.target.value)}
            placeholder="e.g. https://meet.google.com/…"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {isEditing ? "Save Changes" : "Publish Event"}
        </button>
      </div>
    </form>
  );
}

function EventCard({ event, onEdit, onDelete, onRsvp }: {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (id: string) => void;
  onRsvp: (id: string, status: RSVPStatus) => void;
}) {
  const { user } = useAuth();
  const goingCount = event._count?.rsvps ?? 0;
  const hasCapacity = event.capacity != null;
  const isFull = hasCapacity && goingCount >= (event.capacity ?? 0);
  const rsvpStatus = event.userRSVPStatus as RSVPStatus | null | undefined;
  const isOwner = user?.id === event.createdById;

  return (
    <article className="panel p-5 flex flex-col justify-between gap-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <EventTypeChip type={event.type} />
          {rsvpStatus && <RSVPChip status={rsvpStatus} />}
        </div>
        {isOwner && (
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              className="icon-btn"
              title="Edit event"
              onClick={() => onEdit(event)}
            >
              <Edit2 size={13} />
            </button>
            <button
              type="button"
              className="icon-btn text-rose-500 hover:bg-rose-50"
              title="Delete event"
              onClick={() => {
                if (confirm("Delete this event?")) onDelete(event.id);
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Title & description */}
      <div>
        <h3 className="text-base font-bold text-slate-950 leading-snug">{event.title}</h3>
        {event.description && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">{event.description}</p>
        )}
      </div>

      {/* Meta */}
      <div className="space-y-1.5 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Calendar size={12} className="shrink-0 text-slate-400" />
          <span>{formatEventDate(event.startDate)}</span>
        </div>
        {event.location && (
          <div className="flex items-center gap-2">
            <MapPin size={12} className="shrink-0 text-slate-400" />
            <span>{event.location}</span>
          </div>
        )}
        {event.meetingUrl && (
          <div className="flex items-center gap-2">
            <LinkIcon size={12} className="shrink-0 text-slate-400" />
            <a
              href={event.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 font-semibold text-emerald-700 hover:underline"
            >
              Join Online <ExternalLink size={10} />
            </a>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Users size={12} className="shrink-0 text-slate-400" />
          <span>
            {goingCount} going
            {hasCapacity && (
              <span className="ml-1">
                · {event.capacity} capacity
                {isFull && (
                  <span className="ml-1 font-bold text-rose-500">FULL</span>
                )}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Organiser & RSVP */}
      <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs text-slate-400 truncate">
          {event.createdBy?.profile?.fullName
            ? `By ${event.createdBy.profile.fullName}`
            : `@${event.createdBy?.username ?? "unknown"}`}
        </span>
        <div className="flex gap-1.5 shrink-0">
          {(["GOING", "MAYBE", "DECLINED"] as RSVPStatus[]).map((status) => {
            const cfg = RSVP_CONFIG[status];
            const isActive = rsvpStatus === status;
            const isDisabled = status === "GOING" && isFull && !isActive;
            return (
              <button
                key={status}
                type="button"
                disabled={isDisabled}
                onClick={() => onRsvp(event.id, status)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  isActive ? cfg.activeClass : cfg.inactiveClass
                } disabled:opacity-40`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}

const FILTER_TABS = [
  { id: "ALL", label: "All Events" },
  { id: "COLLEGE", label: "Campus" },
  { id: "COMPANY", label: "Corporate" },
  { id: "GENERAL", label: "General" },
  { id: "MY_RSVP", label: "My RSVPs" },
] as const;

type FilterId = (typeof FILTER_TABS)[number]["id"];

export function EventsPage() {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<FilterId>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const { data: events = [], isLoading } = useEventsQuery();
  const createEvent = useCreateEventMutation();
  const updateEvent = useUpdateEventMutation();
  const deleteEvent = useDeleteEventMutation();
  const rsvpEvent = useRsvpEventMutation();

  const filteredEvents = events.filter((e) => {
    if (filterType === "ALL") return true;
    if (filterType === "MY_RSVP") return e.userRSVPStatus != null;
    return e.type === filterType;
  });

  const handleSubmit = async (data: EventFormState) => {
    const payload = {
      title: data.title,
      description: data.description,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
      location: data.location || null,
      meetingUrl: data.meetingUrl || null,
      capacity: data.capacity ? parseInt(data.capacity, 10) : null,
      type: data.type,
    };

    try {
      if (editingEvent) {
        await updateEvent.mutateAsync({ id: editingEvent.id, body: payload });
      } else {
        await createEvent.mutateAsync(payload);
      }
      setShowForm(false);
      setEditingEvent(null);
    } catch {
      /* handled by mutation */
    }
  };

  const handleEditClick = (event: Event) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingEvent(null);
  };

  return (
    <section className="space-y-5">
      {/* Page header */}
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-950">Ecosystem Events</h1>
            <p className="mt-1 text-sm text-slate-500">
              Explore college hackathons, company presentations, and general coding meetups.
            </p>
          </div>
          {user && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setEditingEvent(null);
                setShowForm((v) => !v);
              }}
            >
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? "Cancel" : "Create Event"}
            </button>
          )}
        </div>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <EventForm
          key={editingEvent?.id ?? "new"}
          initial={
            editingEvent
              ? {
                  title: editingEvent.title,
                  description: editingEvent.description ?? "",
                  startDate: editingEvent.startDate
                    ? new Date(editingEvent.startDate).toISOString().slice(0, 16)
                    : "",
                  endDate: editingEvent.endDate
                    ? new Date(editingEvent.endDate).toISOString().slice(0, 16)
                    : "",
                  location: editingEvent.location ?? "",
                  meetingUrl: editingEvent.meetingUrl ?? "",
                  capacity: editingEvent.capacity?.toString() ?? "",
                  type: editingEvent.type,
                }
              : undefined
          }
          onSubmit={handleSubmit}
          isPending={createEvent.isPending || updateEvent.isPending}
          onCancel={handleCancelForm}
          isEditing={Boolean(editingEvent)}
        />
      )}

      {/* Filter tabs */}
      <div className="panel p-3">
        <div className="flex gap-2 overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`shrink-0 rounded-md px-3 py-2 text-sm font-semibold transition ${
                filterType === tab.id
                  ? "bg-emerald-700 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={16} />
          Loading events…
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events found"
          text="There are no upcoming events matching your selection."
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={handleEditClick}
              onDelete={(id) => deleteEvent.mutateAsync(id)}
              onRsvp={(id, status) => rsvpEvent.mutateAsync({ id, status })}
            />
          ))}
        </div>
      )}
    </section>
  );
}
