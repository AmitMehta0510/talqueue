import { useState } from "react";
import {
  X,
  Loader2,
  ExternalLink,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  ChevronDown,
  Trophy,
  Clock,
  Plus,
  Calendar,
  MapPin,
  Video,
  Trash2,
  Edit,
  Users,
  Check,
} from "lucide-react";
import {
  useDriveApplicantsQuery,
  useUpdateDriveApplicationStatusMutation,
  useDriveRoundsQuery,
  useCreateDriveRoundMutation,
  useUpdateDriveRoundMutation,
  useDeleteDriveRoundMutation,
  useShortlistForRoundMutation,
} from "../../hooks/usePlatformQueries";
import { PlacementDriveApplicationStatus } from "../../lib/api";
import { cleanLogoUrl, formatDate } from "../../lib/format";
import { Link } from "react-router-dom";

interface DriveApplicantsModalProps {
  driveId: string;
  driveTitle: string;
  onClose: () => void;
}

// Status actions available to TPO/Recruiter in the dropdown
const ACTIONABLE_STATUSES: PlacementDriveApplicationStatus[] = [
  "SHORTLISTED",
  "INTERVIEW_R1",
  "INTERVIEW_R2",
  "INTERVIEW_R3",
  "PPO_OFFERED",
  "SELECTED",
  "REJECTED",
];

const STATUS_CONFIG: Record<
  PlacementDriveApplicationStatus,
  { label: string; bg: string; text: string; icon: React.ElementType }
> = {
  APPLIED: {
    label: "Applied",
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
    icon: AlertCircle,
  },
  SHORTLISTED: {
    label: "Shortlisted",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    icon: CheckCircle,
  },
  INTERVIEW_R1: {
    label: "Round 1 Interview",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    icon: Clock,
  },
  INTERVIEW_R2: {
    label: "Round 2 Interview",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    icon: Clock,
  },
  INTERVIEW_R3: {
    label: "Round 3 Interview",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    icon: Clock,
  },
  PPO_OFFERED: {
    label: "PPO Offered",
    bg: "bg-indigo-50 border-indigo-200",
    text: "text-indigo-700",
    icon: Trophy,
  },
  SELECTED: {
    label: "Selected 🎉",
    bg: "bg-violet-50 border-violet-200",
    text: "text-violet-700",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Not Selected",
    bg: "bg-rose-50 border-rose-200",
    text: "text-rose-700",
    icon: XCircle,
  },
  WITHDRAWN: {
    label: "Withdrawn",
    bg: "bg-slate-50 border-slate-200",
    text: "text-slate-500",
    icon: XCircle,
  },
};

const ROUND_TYPE_LABELS: Record<string, string> = {
  APTITUDE_TEST: "Aptitude Test",
  GROUP_DISCUSSION: "Group Discussion",
  TECHNICAL_INTERVIEW: "Technical Interview",
  HR_INTERVIEW: "HR Interview",
  FINAL: "Final Round / Offer Selection",
};

export function DriveApplicantsModal({
  driveId,
  driveTitle,
  onClose,
}: DriveApplicantsModalProps) {
  const [activeTab, setActiveTab] = useState<"applicants" | "rounds">("applicants");

  // Queries & Mutations
  const applicantsQuery = useDriveApplicantsQuery(driveId);
  const updateStatusMutation = useUpdateDriveApplicationStatusMutation();

  const roundsQuery = useDriveRoundsQuery(driveId);
  const createRoundMutation = useCreateDriveRoundMutation();
  const updateRoundMutation = useUpdateDriveRoundMutation();
  const deleteRoundMutation = useDeleteDriveRoundMutation(driveId);
  const shortlistForRoundMutation = useShortlistForRoundMutation(driveId);

  // Applicants filter states
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Round Creation/Editing State
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [roundType, setRoundType] = useState("APTITUDE_TEST");
  const [scheduledAt, setScheduledAt] = useState("");
  const [venue, setVenue] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [notes, setNotes] = useState("");

  // Shortlisting workflow state
  const [shortlistRoundId, setShortlistRoundId] = useState<string | null>(null);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [targetStatus, setTargetStatus] = useState<PlacementDriveApplicationStatus | "">("");

  const applicants = applicantsQuery.data || [];
  const rounds = roundsQuery.data || [];

  const filteredApplicants = applicants.filter((app) => {
    if (statusFilter === "ALL") return true;
    return app.status === statusFilter;
  });

  const handleStatusChange = async (applicationId: string, status: PlacementDriveApplicationStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ applicationId, status });
      setActiveDropdownId(null);
    } catch {
      // Handled by query mutation
    }
  };

  const handleStartEditRound = (round: any) => {
    setEditingRoundId(round.id);
    setRoundType(round.roundType);
    setScheduledAt(round.scheduledAt ? new Date(round.scheduledAt).toISOString().slice(0, 16) : "");
    setVenue(round.venue || "");
    setMeetLink(round.meetLink || "");
    setDurationMin(round.durationMin || 60);
    setNotes(round.notes || "");
    setShowRoundForm(true);
  };

  const handleResetRoundForm = () => {
    setEditingRoundId(null);
    setRoundType("APTITUDE_TEST");
    setScheduledAt("");
    setVenue("");
    setMeetLink("");
    setDurationMin(60);
    setNotes("");
    setShowRoundForm(false);
  };

  const handleSaveRound = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      roundType,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      venue: venue || undefined,
      meetLink: meetLink || undefined,
      durationMin: Number(durationMin) || undefined,
      notes: notes || undefined,
    };

    try {
      if (editingRoundId) {
        await updateRoundMutation.mutateAsync({ roundId: editingRoundId, body: payload });
      } else {
        await createRoundMutation.mutateAsync({ driveId, body: payload });
      }
      handleResetRoundForm();
    } catch {
      // Handled by mutation
    }
  };

  const handleDeleteRound = async (roundId: string) => {
    if (confirm("Are you sure you want to delete this round?")) {
      await deleteRoundMutation.mutateAsync(roundId);
    }
  };

  const handleStartShortlist = (roundId: string) => {
    setShortlistRoundId(roundId);
    setSelectedApps([]);
    setTargetStatus("");
  };

  const handleToggleSelectApp = (appId: string) => {
    setSelectedApps((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const handleSelectAllApps = (isAll: boolean) => {
    if (isAll) {
      setSelectedApps(applicants.map((a) => a.id));
    } else {
      setSelectedApps([]);
    }
  };

  const handleSaveShortlist = async () => {
    if (selectedApps.length === 0) return;
    try {
      await shortlistForRoundMutation.mutateAsync({
        roundId: shortlistRoundId!,
        applicationIds: selectedApps,
        updateStatus: targetStatus || undefined,
      });
      setShortlistRoundId(null);
    } catch {
      // Handled by mutation
    }
  };

  const currentShortlistRound = rounds.find((r) => r.id === shortlistRoundId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Placement Drive Portal</h2>
            <p className="text-xs text-indigo-700 font-semibold mt-0.5 max-w-[500px] truncate">
              {driveTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-white/70 text-slate-400 hover:text-slate-700 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher (Only show if not in the shortlisting workflow) */}
        {!shortlistRoundId && (
          <div className="flex px-6 border-b border-slate-100 bg-white shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("applicants")}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                activeTab === "applicants"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Applicants List
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rounds")}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                activeTab === "rounds"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Round Pipeline
            </button>
          </div>
        )}

        {/* APPLICANTS TAB */}
        {activeTab === "applicants" && !shortlistRoundId && (
          <>
            {/* Filters and Count bar */}
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <span className="text-xs font-bold text-slate-500">
                {filteredApplicants.length} of {applicants.length} applicants
              </span>
              <div className="flex gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0">
                {(["ALL", ...ACTIONABLE_STATUSES] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition shrink-0 ${
                      statusFilter === status
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {status === "ALL" ? "All" : STATUS_CONFIG[status as PlacementDriveApplicationStatus]?.label || status}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
              {applicantsQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="animate-spin text-indigo-600" size={24} />
                  <p className="text-xs text-slate-400 font-semibold">Loading applicants list…</p>
                </div>
              ) : applicantsQuery.isError ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                  <AlertCircle className="text-rose-500" size={28} />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Failed to load applicants</p>
                    <p className="text-xs text-slate-400 mt-1">Please try again later.</p>
                  </div>
                </div>
              ) : filteredApplicants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">No applicants found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {statusFilter === "ALL"
                        ? "No student applications have been received for this drive."
                        : `No applicants match the filter "${STATUS_CONFIG[statusFilter as PlacementDriveApplicationStatus]?.label}".`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredApplicants.map((app) => {
                    const userObj = app.user;
                    const profileObj = userObj?.profile;
                    const currentStatus = STATUS_CONFIG[app.status] || STATUS_CONFIG.APPLIED;
                    const StatusIcon = currentStatus.icon;

                    return (
                      <div
                        key={app.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition"
                      >
                        {/* User profile details */}
                        <div className="flex items-start gap-3 min-w-0">
                          {cleanLogoUrl(profileObj?.avatarUrl) ? (
                            <img
                              src={cleanLogoUrl(profileObj?.avatarUrl)!}
                              alt={profileObj?.fullName}
                              className="h-10 w-10 rounded-full object-cover border border-slate-100 shadow-sm shrink-0"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold shrink-0">
                              {profileObj?.fullName?.charAt(0) || userObj?.username?.charAt(0) || "U"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Link
                                to={`/users/${userObj?.username || userObj?.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition flex items-center gap-1"
                              >
                                {profileObj?.fullName || "Anonymous Student"}
                                <ExternalLink size={12} className="opacity-50" />
                              </Link>
                              <span className="text-[10px] text-slate-400">
                                @{userObj?.username}
                              </span>
                            </div>
                            {profileObj?.headline && (
                              <p className="text-xs text-slate-500 truncate max-w-sm">
                                {profileObj.headline}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Email: {userObj?.email} · Applied {formatDate(app.appliedAt)}
                            </p>
                            {app.note && (
                              <p className="text-xs text-slate-600 mt-1.5 italic bg-slate-50 border-l-2 border-slate-200 pl-2 py-0.5">
                                "{app.note}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status display & Update actions */}
                        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${currentStatus.bg} ${currentStatus.text}`}
                          >
                            <StatusIcon size={11} />
                            {currentStatus.label}
                          </span>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveDropdownId((id) => (id === app.id ? null : app.id))
                              }
                              className="flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition"
                            >
                              Change Status
                              <ChevronDown size={12} className="opacity-60" />
                            </button>

                            {activeDropdownId === app.id && (
                              <div className="absolute right-0 bottom-full sm:bottom-auto sm:top-full z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                                {ACTIONABLE_STATUSES.map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => handleStatusChange(app.id, status)}
                                    disabled={updateStatusMutation.isPending}
                                    className={`w-full text-left px-3 py-2 text-xs font-semibold transition hover:bg-slate-50 ${
                                      app.status === status
                                        ? "text-indigo-600 bg-indigo-50"
                                        : "text-slate-600"
                                    }`}
                                  >
                                    {STATUS_CONFIG[status]?.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ROUNDS TIMELINE TAB */}
        {activeTab === "rounds" && !shortlistRoundId && (
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 flex flex-col">
            
            {/* Header / Create Trigger */}
            <div className="flex justify-between items-center mb-4 shrink-0">
              <span className="text-xs font-bold text-slate-500">
                {rounds.length} Scheduled Rounds
              </span>
              {!showRoundForm && (
                <button
                  type="button"
                  onClick={() => setShowRoundForm(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
                >
                  <Plus size={14} />
                  Schedule Round
                </button>
              )}
            </div>

            {/* Inline Creation / Edit Form */}
            {showRoundForm && (
              <form onSubmit={handleSaveRound} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 shadow-inner">
                <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1">
                  <Calendar size={14} className="text-indigo-600" />
                  {editingRoundId ? "Edit Round Schedule" : "Schedule New Round"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Round Type *</label>
                    <select
                      value={roundType}
                      onChange={(e) => setRoundType(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      required
                    >
                      <option value="APTITUDE_TEST">Aptitude Test</option>
                      <option value="GROUP_DISCUSSION">Group Discussion</option>
                      <option value="TECHNICAL_INTERVIEW">Technical Interview</option>
                      <option value="HR_INTERVIEW">HR Interview</option>
                      <option value="FINAL">Final Round / Selection</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Venue / Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Seminar Hall, Placement Cell"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Meeting Link (if Online)</label>
                    <input
                      type="url"
                      placeholder="Zoom or Google Meet url"
                      value={meetLink}
                      onChange={(e) => setMeetLink(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={durationMin}
                      onChange={(e) => setDurationMin(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      min={5}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Instructions / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Provide details about test syllabus, rules, guidelines..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleResetRoundForm}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createRoundMutation.isPending || updateRoundMutation.isPending}
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
                  >
                    {createRoundMutation.isPending || updateRoundMutation.isPending ? "Saving..." : "Save Round"}
                  </button>
                </div>
              </form>
            )}

            {/* Rounds List */}
            {roundsQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="animate-spin text-indigo-600" size={20} />
                <p className="text-xs text-slate-400">Loading pipeline...</p>
              </div>
            ) : rounds.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">No rounds scheduled yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Start scheduling drive rounds (Online tests, interviews, etc.) to shortlist applicants sequentially.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 relative border-l border-slate-200 pl-6 ml-2 my-2">
                {rounds.map((round) => (
                  <div key={round.id} className="relative group">
                    
                    {/* Timeline Node */}
                    <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white ring-4 ring-white shadow">
                      <span className="text-[8px] font-bold">{round.roundNumber}</span>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow transition">
                      <div className="flex justify-between items-start mb-2 gap-4">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            {ROUND_TYPE_LABELS[round.roundType] || round.roundType}
                          </h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-slate-500 text-[10px] font-semibold mt-1">
                            {round.scheduledAt && (
                              <span className="flex items-center gap-1">
                                <Calendar size={12} className="text-slate-400" />
                                {formatDate(round.scheduledAt)}
                              </span>
                            )}
                            {round.venue && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} className="text-slate-400" />
                                {round.venue}
                              </span>
                            )}
                            {round.meetLink && (
                              <a
                                href={round.meetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-indigo-600 hover:underline"
                              >
                                <Video size={12} className="text-indigo-400" />
                                Online Interview
                              </a>
                            )}
                            {round.durationMin && (
                              <span className="flex items-center gap-1">
                                <Clock size={12} className="text-slate-400" />
                                {round.durationMin} mins
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditRound(round)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRound(round.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {round.notes && (
                        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2 mt-2 leading-relaxed whitespace-pre-wrap">
                          {round.notes}
                        </p>
                      )}

                      {/* Shortlist management row */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                          <Users size={14} className="text-indigo-500" />
                          <span>
                            {round.shortlistedApplications?.length || 0} candidates shortlisted
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartShortlist(round.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 text-xs transition shadow-sm"
                        >
                          Shortlist Candidates
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SHORTLIST WORKFLOW STATE */}
        {shortlistRoundId && currentShortlistRound && (
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 flex flex-col">
            
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
              <div>
                <button
                  type="button"
                  onClick={() => setShortlistRoundId(null)}
                  className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  ← Back to Pipeline
                </button>
                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  Shortlist for Round {currentShortlistRound.roundNumber}: {ROUND_TYPE_LABELS[currentShortlistRound.roundType] || currentShortlistRound.roundType}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 bg-slate-100 rounded-lg px-2 py-1">
                  {selectedApps.length} Selected
                </span>
              </div>
            </div>

            {/* Checklist form */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 shadow-inner">
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Workflow Action
                </span>
                <label className="text-xs font-semibold text-slate-700 flex flex-wrap items-center gap-1.5">
                  Update advanced applicants' status to:
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as PlacementDriveApplicationStatus)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold"
                  >
                    <option value="">No Change (Keep Current)</option>
                    {ACTIONABLE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_CONFIG[status]?.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={handleSaveShortlist}
                disabled={selectedApps.length === 0 || shortlistForRoundMutation.isPending}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow transition shrink-0"
              >
                {shortlistForRoundMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Confirm Shortlist ({selectedApps.length})
                  </>
                )}
              </button>
            </div>

            {/* Selection List */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {applicants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                  <User size={24} />
                  <p className="text-xs font-semibold mt-1">No applications to shortlist.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  {/* Select All Row */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50/70 border-b border-slate-200">
                    <input
                      type="checkbox"
                      id="select-all-apps"
                      checked={selectedApps.length === applicants.length && applicants.length > 0}
                      onChange={(e) => handleSelectAllApps(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <label htmlFor="select-all-apps" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                      Select All Applicants ({applicants.length})
                    </label>
                  </div>

                  {/* List Rows */}
                  <div className="divide-y divide-slate-100">
                    {applicants.map((app) => {
                      const isSelected = selectedApps.includes(app.id);
                      const isAlreadyInRound = currentShortlistRound.shortlistedApplications?.some(
                        (sa) => sa.applicationId === app.id
                      );

                      return (
                        <div
                          key={app.id}
                          onClick={() => !isAlreadyInRound && handleToggleSelectApp(app.id)}
                          className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition cursor-pointer select-none ${
                            isAlreadyInRound ? "opacity-60 bg-slate-50/50" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected || isAlreadyInRound}
                            disabled={isAlreadyInRound}
                            onChange={() => {}} // Controlled by row onClick
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800">
                                {app.user?.profile?.fullName || app.user?.username}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                @{app.user?.username}
                              </span>
                              {isAlreadyInRound && (
                                <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-full border border-slate-200">
                                  Already Shortlisted
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              CGPA: {app.user?.educations?.[0]?.cgpa ?? "N/A"} · Branch: {app.user?.educations?.[0]?.department?.name || "N/A"} · Status: {STATUS_CONFIG[app.status]?.label || app.status}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
