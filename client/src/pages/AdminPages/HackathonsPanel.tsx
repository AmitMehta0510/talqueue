import React, { useState, FormEvent } from "react";
import {
  Loader2, RefreshCw, Globe, ShieldCheck, Star, Trophy, X,
} from "lucide-react";
import {
  useAdminHackathonsQuery,
  useAdminUpdateHackathonStatusMutation,
  useAdminUpdateHackathonMutation,
  useAdminTriggerScraperMutation,
} from "../../hooks/usePlatformQueries";
import { useToast } from "../../contexts/ToastContext";
import { SearchBar, DataTable, StatusBadge, fmtDate } from "./shared";

export function HackathonsPanel() {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<(string | undefined)[]>([]);

  const handleSearchChange = (newVal: string) => {
    setQ(newVal);
    setCursor(undefined);
    setHistory([]);
  };

  const query = useAdminHackathonsQuery(q, cursor);
  const updateStatus = useAdminUpdateHackathonStatusMutation();
  const updateHackathon = useAdminUpdateHackathonMutation();
  const runScraper = useAdminTriggerScraperMutation();
  
  const [editingHackathon, setEditingHackathon] = useState<any | null>(null);

  const hackathons = query.data?.hackathons ?? [];

  const handleToggleVerified = async (h: any) => {
    try {
      await updateHackathon.mutateAsync({
        hackathonId: h.id,
        payload: { verified: !h.verified },
      });
    } catch { /* toast handles it */ }
  };

  const handleToggleFeatured = async (h: any) => {
    try {
      await updateHackathon.mutateAsync({
        hackathonId: h.id,
        payload: { featured: !h.featured },
      });
    } catch { /* toast handles it */ }
  };

  const handleDelete = async (hackathonId: string) => {
    try {
      await updateStatus.mutateAsync({
        hackathonId,
        status: "DELETED",
      });
    } catch { /* toast handles it */ }
  };

  return (
    <div className="space-y-4">
      {/* Scraper Control & Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Scraper Control Panel</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Run scrapers to pull and update hackathons from public platforms.</p>
        </div>
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50"
          onClick={() => runScraper.mutate()}
          disabled={runScraper.isPending}
        >
          {runScraper.isPending ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Scraping Platforms...
            </>
          ) : (
            <>
              <RefreshCw size={13} />
              Run Manual Scrape
            </>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Hackathon List</h2>
      </div>

      <SearchBar
        value={q}
        onChange={handleSearchChange}
        placeholder="Search hackathons by title or organizer..."
      />

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        {query.isPending ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            <DataTable
              headers={["Title", "Source", "Status", "Verified", "Featured", "Registrations", "Dates", "Actions"]}
              empty={hackathons.length === 0}
            >
              {hackathons.map((h: any) => (
                <tr key={h.id} className="transition hover:bg-[var(--bg-surface-2)]">
                  <td className="px-4 py-3">
                    <div className="font-semibold max-w-xs truncate" style={{ color: "var(--text-primary)" }}>{h.title}</div>
                    {h.organizerName && <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{h.organizerName}</div>}
                  </td>
                  <td className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {h.isExternal ? (
                      <span className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                        <Globe size={10} />
                        {h.sourcePlatform || "External"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck size={10} />
                        Internal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={h.status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleVerified(h)}
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-lg border transition ${
                        h.verified
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                          : "hover:bg-[var(--bg-surface-2)]"
                      }`}
                      style={!h.verified ? { borderColor: "var(--border)", background: "var(--bg-surface-2)", color: "var(--text-muted)" } : {}}
                      title={h.verified ? "Verified" : "Click to Verify"}
                      disabled={updateHackathon.isPending}
                    >
                      <ShieldCheck size={12} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(h)}
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-lg border transition ${
                        h.featured
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400 hover:bg-amber-500/20"
                          : "hover:bg-[var(--bg-surface-2)]"
                      }`}
                      style={!h.featured ? { borderColor: "var(--border)", background: "var(--bg-surface-2)", color: "var(--text-muted)" } : {}}
                      title={h.featured ? "Featured" : "Click to Feature"}
                      disabled={updateHackathon.isPending}
                    >
                      <Star size={12} fill={h.featured ? "currentColor" : "none"} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center" style={{ color: "var(--text-secondary)" }}>
                    {h._count?.registrations ?? 0}
                  </td>
                  <td className="px-4 py-3 text-[11px] whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                    {h.startDate ? fmtDate(h.startDate) : "—"}
                    {h.endDate ? ` → ${fmtDate(h.endDate)}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {h.status === "DRAFT" && (
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-700/30 hover:bg-emerald-500/20 transition"
                          onClick={() => updateStatus.mutateAsync({ hackathonId: h.id, status: "OPEN" })}
                        >
                          Activate
                        </button>
                      )}
                      {h.status !== "CLOSED" && h.status !== "COMPLETED" && (
                        <button
                          type="button"
                          className="btn-secondary text-[10px] px-2 py-1"
                          onClick={() => updateStatus.mutateAsync({ hackathonId: h.id, status: "CLOSED" })}
                        >
                          Close
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-secondary text-[10px] px-2 py-1"
                        onClick={() => setEditingHackathon(h)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-700/30 hover:bg-rose-500/20 transition"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this hackathon?")) {
                            handleDelete(h.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
            <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
              <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                Page {history.length + 1}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const prev = history[history.length - 1];
                    setHistory(history.slice(0, -1));
                    setCursor(prev);
                  }}
                  disabled={history.length === 0 || query.isFetching}
                  className="btn-secondary text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHistory([...history, cursor]);
                    setCursor(query.data?.nextCursor || undefined);
                  }}
                  disabled={!query.data?.hasNextPage || query.isFetching}
                  className="btn-secondary text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {editingHackathon && (
        <EditHackathonModal
          hackathon={editingHackathon}
          onClose={() => setEditingHackathon(null)}
        />
      )}
    </div>
  );
}

function EditHackathonModal({ hackathon, onClose }: { hackathon: any; onClose: () => void }) {
  const updateHackathon = useAdminUpdateHackathonMutation();
  const { showToast } = useToast();

  const [title, setTitle] = useState(hackathon.title || "");
  const [shortDescription, setShortDescription] = useState(hackathon.shortDescription || "");
  const [description, setDescription] = useState(hackathon.description || "");
  const [externalUrl, setExternalUrl] = useState(hackathon.externalUrl || "");
  const [mode, setMode] = useState<"ONLINE" | "OFFLINE" | "HYBRID">(hackathon.mode || "ONLINE");
  const [location, setLocation] = useState(hackathon.location || "");
  const [minTeamSize, setMinTeamSize] = useState(String(hackathon.minTeamSize || 1));
  const [maxTeamSize, setMaxTeamSize] = useState(String(hackathon.maxTeamSize || 4));
  
  const toDateInputStr = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toISOString().substring(0, 16);
  };

  const [startDate, setStartDate] = useState(toDateInputStr(hackathon.startDate));
  const [endDate, setEndDate] = useState(toDateInputStr(hackathon.endDate));
  const [registrationDeadline, setRegistrationDeadline] = useState(toDateInputStr(hackathon.registrationDeadline));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast("error", "Title and Description are required");
      return;
    }
    try {
      await updateHackathon.mutateAsync({
        hackathonId: hackathon.id,
        payload: {
          title,
          shortDescription,
          description,
          externalUrl: hackathon.isExternal ? externalUrl : null,
          mode,
          location: mode === "ONLINE" ? null : location,
          minTeamSize: Number(minTeamSize) || 1,
          maxTeamSize: Number(maxTeamSize) || 1,
          startDate: startDate ? new Date(startDate).toISOString() : null,
          endDate: endDate ? new Date(endDate).toISOString() : null,
          registrationDeadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : null,
        },
      });
      onClose();
    } catch { /* hook handles toast */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="relative w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between border-b p-4" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Trophy size={16} className="text-emerald-500 dark:text-emerald-400" />
            Edit Hackathon Details
          </h3>
          <button type="button" className="icon-btn h-8 w-8" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="space-y-1">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Title *</label>
            <input
              type="text"
              className="field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Hackathon title"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Short Description</label>
            <input
              type="text"
              className="field"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Short summary tagline"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Description *</label>
            <textarea
              className="field h-28 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full hackathon details"
            />
          </div>

          {hackathon.isExternal && (
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>External Organizer URL</label>
              <input
                type="url"
                className="field"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Mode</label>
              <select
                className="field"
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
              >
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Location</label>
              <input
                type="text"
                className="field disabled:opacity-50"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA"
                disabled={mode === "ONLINE"}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Min Team Size</label>
              <input
                type="number"
                min={1}
                className="field"
                value={minTeamSize}
                onChange={(e) => setMinTeamSize(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Max Team Size</label>
              <input
                type="number"
                min={1}
                className="field"
                value={maxTeamSize}
                onChange={(e) => setMaxTeamSize(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Start Date</label>
              <input type="datetime-local" className="field text-xs" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>End Date</label>
              <input type="datetime-local" className="field text-xs" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Regn. Deadline</label>
              <input type="datetime-local" className="field text-xs" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
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
              disabled={updateHackathon.isPending}
            >
              {updateHackathon.isPending && <Loader2 size={12} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
