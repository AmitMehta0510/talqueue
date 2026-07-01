import { useState } from "react";
import { X } from "lucide-react";
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

// Sub-components
import { ApplicantFilters } from "./drive-applicants/ApplicantFilters";
import { ApplicantList } from "./drive-applicants/ApplicantList";
import { RoundManager } from "./drive-applicants/RoundManager";
import { ShortlistWorkflow } from "./drive-applicants/ShortlistWorkflow";

import {
  ACTIONABLE_STATUSES,
  STATUS_CONFIG,
  ROUND_TYPE_LABELS,
} from "./drive-applicants/constants";

interface DriveApplicantsModalProps {
  driveId: string;
  driveTitle: string;
  onClose: () => void;
}

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
    } catch {}
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
    } catch {}
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
    } catch {}
  };

  const currentShortlistRound = rounds.find((r) => r.id === shortlistRoundId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[85vh] glass shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base bg-surface-2 shrink-0">
          <div>
            <h2 className="text-base font-bold text-primary">Placement Drive Portal</h2>
            <p className="text-xs text-indigo-650 dark:text-indigo-400 font-semibold mt-0.5 max-w-[500px] truncate">
              {driveTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-surface-3 text-muted-fg hover:text-primary transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        {!shortlistRoundId && (
          <div className="flex px-6 border-b border-base bg-surface shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("applicants")}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                activeTab === "applicants"
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-fg hover:text-primary"
              }`}
            >
              Applicants List
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rounds")}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                activeTab === "rounds"
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-fg hover:text-primary"
              }`}
            >
              Round Pipeline
            </button>
          </div>
        )}

        {/* APPLICANTS TAB */}
        {activeTab === "applicants" && !shortlistRoundId && (
          <>
            <ApplicantFilters
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              filteredCount={filteredApplicants.length}
              totalCount={applicants.length}
              actionableStatuses={ACTIONABLE_STATUSES}
              statusConfig={STATUS_CONFIG}
            />

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
              <ApplicantList
                filteredApplicants={filteredApplicants}
                totalCount={applicants.length}
                isLoading={applicantsQuery.isLoading}
                isError={applicantsQuery.isError}
                statusFilter={statusFilter}
                statusConfig={STATUS_CONFIG}
                actionableStatuses={ACTIONABLE_STATUSES}
                activeDropdownId={activeDropdownId}
                setActiveDropdownId={setActiveDropdownId}
                onStatusChange={handleStatusChange}
                isPending={updateStatusMutation.isPending}
              />
            </div>
          </>
        )}

        {/* ROUNDS TIMELINE TAB */}
        {activeTab === "rounds" && !shortlistRoundId && (
          <RoundManager
            rounds={rounds}
            isLoading={roundsQuery.isLoading}
            showRoundForm={showRoundForm}
            setShowRoundForm={setShowRoundForm}
            editingRoundId={editingRoundId}
            roundType={roundType}
            setRoundType={setRoundType}
            scheduledAt={scheduledAt}
            setScheduledAt={setScheduledAt}
            venue={venue}
            setVenue={setVenue}
            meetLink={meetLink}
            setMeetLink={setMeetLink}
            durationMin={durationMin}
            setDurationMin={setDurationMin}
            notes={notes}
            setNotes={setNotes}
            onSaveRound={handleSaveRound}
            onResetRoundForm={handleResetRoundForm}
            onEditRound={handleStartEditRound}
            onDeleteRound={handleDeleteRound}
            onStartShortlist={handleStartShortlist}
            roundTypeLabels={ROUND_TYPE_LABELS}
            isSaving={createRoundMutation.isPending || updateRoundMutation.isPending}
          />
        )}

        {/* SHORTLIST WORKFLOW STATE */}
        {shortlistRoundId && currentShortlistRound && (
          <ShortlistWorkflow
            currentRound={currentShortlistRound}
            applicants={applicants}
            selectedApps={selectedApps}
            onToggleSelectApp={handleToggleSelectApp}
            onSelectAllApps={handleSelectAllApps}
            targetStatus={targetStatus}
            setTargetStatus={setTargetStatus}
            onSaveShortlist={handleSaveShortlist}
            onCancel={() => setShortlistRoundId(null)}
            isSaving={shortlistForRoundMutation.isPending}
            actionableStatuses={ACTIONABLE_STATUSES}
            statusConfig={STATUS_CONFIG}
            roundTypeLabels={ROUND_TYPE_LABELS}
          />
        )}

      </div>
    </div>
  );
}
