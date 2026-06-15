import React, { useState } from "react";
import {
  Calendar, MapPin, Link as LinkIcon, Users, Plus, X, Loader2, GraduationCap, Building2, Globe, Trash2, Edit2, ExternalLink, Save
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  useEventsQuery,
  useCreateEventMutation,
  useRsvpEventMutation,
  useDeleteEventMutation,
  useUpdateEventMutation
} from "../hooks/usePlatformQueries";
import { Event, RSVPStatus, EventType } from "../lib/api";

export function EventsPage() {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<string>("ALL"); // ALL, COLLEGE, COMPANY, GENERAL, MY_RSVP
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [capacity, setCapacity] = useState("");
  const [type, setType] = useState<EventType>("GENERAL");

  const { data: events = [], isLoading } = useEventsQuery();
  const createEvent = useCreateEventMutation();
  const updateEvent = useUpdateEventMutation();
  const deleteEvent = useDeleteEventMutation();
  const rsvpEvent = useRsvpEventMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;

    try {
      const payload = {
        title,
        description,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        location: location || null,
        meetingUrl: meetingUrl || null,
        capacity: capacity ? parseInt(capacity, 10) : null,
        type,
      };

      if (editingEvent) {
        await updateEvent.mutateAsync({ id: editingEvent.id, body: payload });
        setEditingEvent(null);
      } else {
        await createEvent.mutateAsync(payload);
      }

      // Reset
      setTitle("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setLocation("");
      setMeetingUrl("");
      setCapacity("");
      setType("GENERAL");
      setShowCreateForm(false);
    } catch (err) {}
  };

  const handleEditClick = (event: Event) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description || "");
    setStartDate(event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : "");
    setEndDate(event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "");
    setLocation(event.location || "");
    setMeetingUrl(event.meetingUrl || "");
    setCapacity(event.capacity ? event.capacity.toString() : "");
    setType(event.type);
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      await deleteEvent.mutateAsync(id);
    }
  };

  const handleRsvp = async (eventId: string, status: RSVPStatus) => {
    await rsvpEvent.mutateAsync({ id: eventId, status });
  };

  const filteredEvents = events.filter((e) => {
    if (filterType === "ALL") return true;
    if (filterType === "MY_RSVP") return e.userRSVPStatus !== null && e.userRSVPStatus !== undefined;
    return e.type === filterType;
  });

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span className="bg-gradient-to-br from-emerald-400 to-teal-650 bg-clip-text text-transparent">
                Ecosystem Events
              </span>
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Explore college hackathons, company presentations, and general coding meetups.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingEvent(null);
              setShowCreateForm(!showCreateForm);
            }}
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-sm font-bold shadow-md transition"
          >
            {showCreateForm ? <X size={16} /> : <Plus size={16} />}
            {showCreateForm ? "Cancel" : "Create Event"}
          </button>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="rounded-2xl border border-emerald-500/20 bg-zinc-900/60 p-6 shadow-xl animate-in fade-in duration-200">
            <h2 className="text-lg font-bold text-white mb-4">
              {editingEvent ? "Edit Event" : "Create a New Event"}
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block col-span-2">
                  <span className="block text-xs font-bold uppercase text-zinc-500 mb-1">Title *</span>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. ACM Web Dev Bootcamp 2026"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition"
                  />
                </label>

                <label className="block col-span-2">
                  <span className="block text-xs font-bold uppercase text-zinc-500 mb-1">Description</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details about the schedule, agenda, and speakers."
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition min-h-24"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-bold uppercase text-zinc-500 mb-1">Start Date & Time *</span>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-bold uppercase text-zinc-500 mb-1">End Date & Time *</span>
                  <input
                    type="datetime-local"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-bold uppercase text-zinc-500 mb-1">Event Type *</span>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as EventType)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition"
                  >
                    <option value="GENERAL">General Meetup / Info Session</option>
                    <option value="COLLEGE">Campus Event (College Only)</option>
                    <option value="COMPANY">Corporate Event (Company Only)</option>
                  </select>
                </label>

                <label className="block">
                  <span className="block text-xs font-bold uppercase text-zinc-500 mb-1">Max Capacity (optional)</span>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-bold uppercase text-zinc-500 mb-1">Location (Venue name)</span>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Seminar Hall, Block C"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-bold uppercase text-zinc-500 mb-1">Meeting Link (Url)</span>
                  <input
                    type="url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="e.g. https://meet.google.com/..."
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition"
                  />
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="submit"
                  disabled={createEvent.isPending || updateEvent.isPending}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-1.5 shadow-md transition"
                >
                  {(createEvent.isPending || updateEvent.isPending) && <Loader2 size={14} className="animate-spin" />}
                  {editingEvent ? "Save Changes" : "Publish Event"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingEvent(null);
                  }}
                  className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-zinc-800/50">
          {[
            { id: "ALL", label: "All Events" },
            { id: "COLLEGE", label: "Campus Events" },
            { id: "COMPANY", label: "Corporate Events" },
            { id: "GENERAL", label: "General Sessions" },
            { id: "MY_RSVP", label: "My RSVPs" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id)}
              className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-all border
                ${filterType === t.id
                  ? "bg-emerald-600/20 text-emerald-400 border-emerald-600/30 animate-pulse-slow"
                  : "text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/40"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List of Events */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={30} className="animate-spin text-emerald-500" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-zinc-850 bg-zinc-900/10 p-6">
            <Calendar size={48} className="text-zinc-700 mb-3 animate-bounce-slow" />
            <h3 className="text-sm font-bold text-zinc-300">No events found</h3>
            <p className="text-xs text-zinc-500 mt-1">There are no upcoming events matching your selection.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredEvents.map((event) => {
              const goingCount = event._count?.rsvps || 0;
              const hasCapacity = event.capacity !== null && event.capacity !== undefined;
              const isFull = hasCapacity && goingCount >= (event.capacity || 0);
              const rsvpStatus = event.userRSVPStatus;

              return (
                <div
                  key={event.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-zinc-700 hover:shadow-lg transition duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: badges & delete */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1
                          ${event.type === "COLLEGE" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                            event.type === "COMPANY" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            "bg-teal-500/10 text-teal-400 border border-teal-500/20"}`}
                        >
                          {event.type === "COLLEGE" ? <GraduationCap size={10} /> :
                           event.type === "COMPANY" ? <Building2 size={10} /> :
                           <Globe size={10} />}
                          {event.type}
                        </span>

                        {rsvpStatus && (
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase flex items-center gap-0.5
                            ${rsvpStatus === "GOING" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" :
                              rsvpStatus === "MAYBE" ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" :
                              "bg-rose-500/15 text-rose-400 border border-rose-500/25"}`}
                          >
                            RSVP: {rsvpStatus}
                          </span>
                        )}
                      </div>

                      {user?.id === event.createdById && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleEditClick(event)}
                            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white transition"
                            title="Edit Event"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="rounded p-1 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                            title="Delete Event"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="text-lg font-bold text-white leading-snug">{event.title}</h3>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{event.description}</p>
                    </div>

                    {/* Time & Venue */}
                    <div className="space-y-1.5 text-xs text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-zinc-500 shrink-0" />
                        <span>{formatDate(event.startDate)}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={13} className="text-zinc-500 shrink-0" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      {event.meetingUrl && (
                        <div className="flex items-center gap-2">
                          <LinkIcon size={13} className="text-zinc-500 shrink-0" />
                          <a href={event.meetingUrl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline flex items-center gap-0.5">
                            Join Online <ExternalLink size={10} className="opacity-70" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Attendee indicators */}
                    <div className="flex items-center gap-3 text-xs text-zinc-500 pt-2">
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {goingCount} Going
                      </span>
                      {hasCapacity && (
                        <span>• {event.capacity} Capacity {isFull && <span className="text-rose-400 font-bold ml-1">(FULL)</span>}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions / RSVP Selection */}
                  <div className="border-t border-zinc-800/80 mt-4 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-zinc-500">
                      {event.createdBy?.profile?.fullName ? `By ${event.createdBy.profile.fullName}` : `Organized by @${event.createdBy?.username}`}
                    </span>
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleRsvp(event.id, "GOING")}
                        disabled={isFull && rsvpStatus !== "GOING"}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition
                          ${rsvpStatus === "GOING"
                            ? "bg-emerald-600 text-white"
                            : "bg-zinc-850 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                          }`}
                      >
                        Going
                      </button>
                      <button
                        onClick={() => handleRsvp(event.id, "MAYBE")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition
                          ${rsvpStatus === "MAYBE"
                            ? "bg-amber-600 text-white"
                            : "bg-zinc-850 text-zinc-300 hover:bg-zinc-800"
                          }`}
                      >
                        Maybe
                      </button>
                      <button
                        onClick={() => handleRsvp(event.id, "DECLINED")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition
                          ${rsvpStatus === "DECLINED"
                            ? "bg-rose-600 text-white"
                            : "bg-zinc-850 text-zinc-300 hover:bg-zinc-800"
                          }`}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
