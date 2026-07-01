import { Loader2, Check, User } from "lucide-react";
import { PlacementDriveApplicationStatus } from "../../../lib/api";

import { PlacementDriveRound, PlacementDriveApplication } from "../../../core/types/models";

interface ShortlistWorkflowProps {
  currentRound: PlacementDriveRound;
  applicants: PlacementDriveApplication[];
  selectedApps: string[];
  onToggleSelectApp: (appId: string) => void;
  onSelectAllApps: (isAll: boolean) => void;
  targetStatus: PlacementDriveApplicationStatus | "";
  setTargetStatus: (status: PlacementDriveApplicationStatus | "") => void;
  onSaveShortlist: () => void;
  onCancel: () => void;
  isSaving: boolean;
  actionableStatuses: PlacementDriveApplicationStatus[];
  statusConfig: Record<
    PlacementDriveApplicationStatus,
    { label: string; bg: string; text: string; icon: React.ElementType }
  >;
  roundTypeLabels: Record<string, string>;
}

export function ShortlistWorkflow({
  currentRound,
  applicants,
  selectedApps,
  onToggleSelectApp,
  onSelectAllApps,
  targetStatus,
  setTargetStatus,
  onSaveShortlist,
  onCancel,
  isSaving,
  actionableStatuses,
  statusConfig,
  roundTypeLabels,
}: ShortlistWorkflowProps) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 flex flex-col animate-fade-in">
      {/* Header Section */}
      <div className="flex items-center justify-between border-b border-base pb-3 mb-4 shrink-0">
        <div>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
          >
            ← Back to Pipeline
          </button>
          <h3 className="text-sm font-bold text-primary mt-1">
            Shortlist for Round {currentRound.roundNumber}: {roundTypeLabels[currentRound.roundType] || currentRound.roundType}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-secondary bg-surface-2 border border-base rounded-lg px-2 py-1">
            {selectedApps.length} Selected
          </span>
        </div>
      </div>

      {/* Checklist form */}
      <div className="bg-surface-2 border border-base rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 shadow-inner">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold text-muted-fg uppercase tracking-wider mb-1">
            Workflow Action
          </span>
          <label className="text-xs font-semibold text-secondary flex flex-wrap items-center gap-1.5">
            Update advanced applicants' status to:
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as PlacementDriveApplicationStatus | "")}
              className="field py-1 px-2 text-xs font-bold w-auto inline-block ml-1 bg-surface text-primary"
            >
              <option value="">No Change (Keep Current)</option>
              {actionableStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusConfig[status]?.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={onSaveShortlist}
          disabled={selectedApps.length === 0 || isSaving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand text-inverse px-4 py-2 text-xs font-bold shadow transition shrink-0"
        >
          {isSaving ? (
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
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-fg">
            <User size={24} />
            <p className="text-xs font-semibold mt-1">No applications to shortlist.</p>
          </div>
        ) : (
          <div className="border border-base rounded-2xl overflow-hidden bg-surface shadow-sm">
            {/* Select All Row */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-2/70 border-b border-base">
              <input
                type="checkbox"
                id="select-all-apps"
                checked={selectedApps.length === applicants.length && applicants.length > 0}
                onChange={(e) => onSelectAllApps(e.target.checked)}
                className="rounded border-base text-brand focus:ring-brand h-4 w-4 shrink-0"
              />
              <label htmlFor="select-all-apps" className="text-xs font-bold text-secondary select-none cursor-pointer">
                Select All Applicants ({applicants.length})
              </label>
            </div>

            {/* List Rows */}
            <div className="divide-y divide-base">
              {applicants.map((app) => {
                const isSelected = selectedApps.includes(app.id);
                const isAlreadyInRound = currentRound.shortlistedApplications?.some(
                  (sa: any) => sa.applicationId === app.id
                );

                return (
                  <div
                    key={app.id}
                    onClick={() => !isAlreadyInRound && onToggleSelectApp(app.id)}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition cursor-pointer select-none ${
                      isAlreadyInRound ? "opacity-60 bg-slate-50/50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected || isAlreadyInRound}
                      disabled={isAlreadyInRound}
                      onChange={() => {}} // Controlled by row onClick
                      className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 h-4 w-4 shrink-0"
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
                        CGPA: {app.user?.educations?.[0]?.cgpa ?? "N/A"} · Branch: {app.user?.educations?.[0]?.department?.name || "N/A"} · Status: {statusConfig[app.status as PlacementDriveApplicationStatus]?.label || app.status}
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
  );
}
