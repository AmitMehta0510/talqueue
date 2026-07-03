import { X } from "lucide-react";

// Sub-components
import { ApplicantFilters } from "./drive-applicants/ApplicantFilters";
import { ApplicantList } from "./drive-applicants/ApplicantList";
import { RoundManager } from "./drive-applicants/RoundManager";
import { ShortlistWorkflow } from "./drive-applicants/ShortlistWorkflow";
import { useDriveApplicants } from "../../hooks/useDriveApplicants";
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
  const {
    activeTab,
    setActiveTab,
    applicantsQuery,
    updateStatusMutation,
    roundsQuery,
    createRoundMutation,
    updateRoundMutation,
    shortlistForRoundMutation,
    statusFilter,
    setStatusFilter,
    activeDropdownId,
    setActiveDropdownId,
    showRoundForm,
    setShowRoundForm,
    editingRoundId,
    roundType,
    setRoundType,
    scheduledAt,
    setScheduledAt,
    venue,
    setVenue,
    meetLink,
    setMeetLink,
    durationMin,
    setDurationMin,
    notes,
    setNotes,
    shortlistRoundId,
    setShortlistRoundId,
    selectedApps,
    targetStatus,
    setTargetStatus,
    applicants,
    rounds,
    filteredApplicants,
    handleStatusChange,
    handleStartEditRound,
    handleResetRoundForm,
    handleSaveRound,
    handleDeleteRound,
    handleStartShortlist,
    handleToggleSelectApp,
    handleSelectAllApps,
    handleSaveShortlist,
    currentShortlistRound,
  } = useDriveApplicants(driveId);

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
            className="text-secondary hover:text-primary transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-base px-6 shrink-0 bg-surface">
          <button
            type="button"
            onClick={() => setActiveTab("applicants")}
            className={`px-4 py-3 text-xs font-bold transition border-b-2 ${
              activeTab === "applicants"
                ? "border-brand text-brand"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            All Candidates
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rounds")}
            className={`px-4 py-3 text-xs font-bold transition border-b-2 ${
              activeTab === "rounds"
                ? "border-brand text-brand"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            Evaluation Rounds
          </button>
        </div>

        {/* Tab Panels */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-surface flex flex-col">
          {activeTab === "applicants" && (
            <>
              <ApplicantFilters
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                filteredCount={filteredApplicants.length}
                totalCount={applicants.length}
                actionableStatuses={ACTIONABLE_STATUSES}
                statusConfig={STATUS_CONFIG}
              />
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
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

          {activeTab === "rounds" && (
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
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
            </div>
          )}
        </div>

        {/* Shortlisting workflow overlay container */}
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
export default DriveApplicantsModal;
