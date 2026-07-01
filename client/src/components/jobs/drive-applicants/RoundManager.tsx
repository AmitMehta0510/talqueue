import { FormEvent } from "react";
import { Plus, Loader2, Calendar } from "lucide-react";
import { RoundForm } from "./RoundForm";
import { TimelineNode } from "./TimelineNode";

import { PlacementDriveRound } from "../../../core/types/models";

interface RoundManagerProps {
  rounds: PlacementDriveRound[];
  isLoading: boolean;
  showRoundForm: boolean;
  setShowRoundForm: (show: boolean) => void;
  editingRoundId: string | null;
  roundType: string;
  setRoundType: (val: string) => void;
  scheduledAt: string;
  setScheduledAt: (val: string) => void;
  venue: string;
  setVenue: (val: string) => void;
  meetLink: string;
  setMeetLink: (val: string) => void;
  durationMin: number;
  setDurationMin: (val: number) => void;
  notes: string;
  setNotes: (val: string) => void;
  onSaveRound: (e: FormEvent) => void;
  onResetRoundForm: () => void;
  onEditRound: (round: PlacementDriveRound) => void;
  onDeleteRound: (roundId: string) => void;
  onStartShortlist: (roundId: string) => void;
  roundTypeLabels: Record<string, string>;
  isSaving: boolean;
}

export function RoundManager({
  rounds,
  isLoading,
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
  onSaveRound,
  onResetRoundForm,
  onEditRound,
  onDeleteRound,
  onStartShortlist,
  roundTypeLabels,
  isSaving,
}: RoundManagerProps) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 flex flex-col animate-fade-in">
      {/* Header / Create Trigger */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <span className="text-xs font-bold text-muted-fg">
          {rounds.length} Scheduled Rounds
        </span>
        {!showRoundForm && (
          <button
            type="button"
            onClick={() => setShowRoundForm(true)}
            className="btn-primary px-3 py-1.5 text-xs font-bold shadow-sm inline-flex items-center gap-1.5 bg-indigo-650 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white transition"
          >
            <Plus size={14} />
            Schedule Round
          </button>
        )}
      </div>

      {/* Inline Creation / Edit Form */}
      {showRoundForm && (
        <RoundForm
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
          onSaveRound={onSaveRound}
          onCancel={onResetRoundForm}
          isSaving={isSaving}
        />
      )}

      {/* Rounds List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Loader2 className="animate-spin text-brand" size={20} />
          <p className="text-xs text-muted-fg font-semibold">Loading pipeline...</p>
        </div>
      ) : rounds.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-3 text-muted-fg">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-primary">No rounds scheduled yet</p>
            <p className="text-xs text-muted-fg mt-1 max-w-xs">
              Start scheduling drive rounds (Online tests, interviews, etc.) to shortlist applicants sequentially.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 relative border-l border-base pl-6 ml-2 my-2">
          {rounds.map((round) => (
            <TimelineNode
              key={round.id}
              round={round}
              roundTypeLabels={roundTypeLabels}
              onEditRound={onEditRound}
              onDeleteRound={onDeleteRound}
              onStartShortlist={onStartShortlist}
            />
          ))}
        </div>
      )}
    </div>
  );
}
