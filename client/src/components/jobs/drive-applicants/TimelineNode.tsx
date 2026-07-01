import { Calendar, MapPin, Video, Clock, Edit, Trash2, Users } from "lucide-react";
import { formatDate } from "../../../core/utils/format";

import { PlacementDriveRound } from "../../../core/types/models";

interface TimelineNodeProps {
  round: PlacementDriveRound;
  roundTypeLabels: Record<string, string>;
  onEditRound: (round: PlacementDriveRound) => void;
  onDeleteRound: (roundId: string) => void;
  onStartShortlist: (roundId: string) => void;
}

export function TimelineNode({
  round,
  roundTypeLabels,
  onEditRound,
  onDeleteRound,
  onStartShortlist,
}: TimelineNodeProps) {
  return (
    <div className="relative group">
      {/* Timeline Node Icon/Badge */}
      <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-inverse ring-4 ring-surface shadow">
        <span className="text-[8px] font-bold">{round.roundNumber}</span>
      </div>

      <div className="bg-surface border border-base rounded-2xl p-4 shadow-sm hover:shadow transition">
        <div className="flex justify-between items-start mb-2 gap-4">
          <div>
            <h4 className="text-sm font-bold text-primary">
              {roundTypeLabels[round.roundType] || round.roundType}
            </h4>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-secondary text-[10px] font-semibold mt-1">
              {round.scheduledAt && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} className="text-muted-fg" />
                  {formatDate(round.scheduledAt)}
                </span>
              )}
              {round.venue && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-muted-fg" />
                  {round.venue}
                </span>
              )}
              {round.meetLink && (
                <a
                  href={round.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-brand hover:underline"
                >
                  <Video size={12} className="text-brand/80" />
                  Online Interview
                </a>
              )}
              {round.durationMin && (
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-muted-fg" />
                  {round.durationMin} mins
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition shrink-0">
            <button
              type="button"
              onClick={() => onEditRound(round)}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-surface-2 text-secondary hover:text-primary transition"
            >
              <Edit size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDeleteRound(round.id)}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-955/40 text-secondary hover:text-rose-600 transition"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {round.notes && (
          <p className="text-xs text-secondary bg-surface-2 border border-base rounded-lg p-2 mt-2 leading-relaxed whitespace-pre-wrap">
            {round.notes}
          </p>
        )}

        {/* Shortlist management row */}
        <div className="flex items-center justify-between border-t border-base pt-3 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-secondary font-bold">
            <Users size={14} className="text-brand" />
            <span>
              {round.shortlistedApplications?.length || 0} candidates shortlisted
            </span>
          </div>
          <button
            type="button"
            onClick={() => onStartShortlist(round.id)}
            className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-105 dark:hover:bg-indigo-950/50 text-indigo-705 dark:text-indigo-400 font-bold px-2.5 py-1 text-xs transition shadow-sm"
          >
            Shortlist Candidates
          </button>
        </div>
      </div>
    </div>
  );
}
