import { FormEvent } from "react";
import { Calendar } from "lucide-react";

interface RoundFormProps {
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
  onCancel: () => void;
  isSaving: boolean;
}

export function RoundForm({
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
  onCancel,
  isSaving,
}: RoundFormProps) {
  return (
    <form onSubmit={onSaveRound} className="bg-surface-2 border border-base rounded-xl p-4 mb-5 shadow-inner">
      <h3 className="text-xs font-bold text-primary mb-3 flex items-center gap-1">
        <Calendar size={14} className="text-brand" />
        {editingRoundId ? "Edit Round Schedule" : "Schedule New Round"}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[10px] font-bold text-muted-fg mb-1">Round Type *</label>
          <select
            value={roundType}
            onChange={(e) => setRoundType(e.target.value)}
            className="field py-1.5 px-2.5 text-xs bg-surface text-primary"
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
          <label className="block text-[10px] font-bold text-muted-fg mb-1">Date & Time</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="field py-1.5 px-2.5 text-xs bg-surface text-primary"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-muted-fg mb-1">Venue / Location</label>
          <input
            type="text"
            placeholder="e.g. Seminar Hall, Placement Cell"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="field py-1.5 px-2.5 text-xs bg-surface text-primary"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-muted-fg mb-1">Meeting Link (if Online)</label>
          <input
            type="url"
            placeholder="Zoom or Google Meet url"
            value={meetLink}
            onChange={(e) => setMeetLink(e.target.value)}
            className="field py-1.5 px-2.5 text-xs bg-surface text-primary"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-muted-fg mb-1">Duration (minutes)</label>
          <input
            type="number"
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className="field py-1.5 px-2.5 text-xs bg-surface text-primary"
            min={5}
          />
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-muted-fg mb-1">Instructions / Notes</label>
        <textarea
          rows={2}
          placeholder="Provide details about test syllabus, rules, guidelines..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="field py-1.5 px-2.5 text-xs bg-surface text-primary"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary px-3 py-1.5 text-xs font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary px-3 py-1.5 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white transition shadow-sm"
        >
          {isSaving ? "Saving..." : "Save Round"}
        </button>
      </div>
    </form>
  );
}
