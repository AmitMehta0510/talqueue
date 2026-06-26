import {
  Bookmark,
  BookmarkCheck,
  Clock,
  Code2,
  MonitorPlay,
  PlayCircle,
  Youtube,
} from "lucide-react";
import type {
  InterviewResource,
  InterviewDifficulty,
  InterviewRoleTag,
  InterviewCompanyTag,
} from "../../lib/api";

// ─── Label maps ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<InterviewRoleTag, string> = {
  SDE_1: "SDE-1",
  SDE_2: "SDE-2",
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULLSTACK: "Fullstack",
  DEVOPS: "DevOps",
  DATA_ML: "Data / ML",
  MOBILE: "Mobile",
  SYSTEM_DESIGN: "System Design",
  BEHAVIORAL: "Behavioral",
};

const DIFFICULTY_COLORS: Record<InterviewDifficulty, string> = {
  BEGINNER: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  INTERMEDIATE: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  ADVANCED: "bg-rose-500/15 text-rose-400 border-rose-500/20",
};

const COMPANY_COLORS: Record<InterviewCompanyTag, string> = {
  FAANG: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  STARTUP: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  MNC: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  ANY: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

function formatDuration(seconds?: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface InterviewResourceCardProps {
  resource: InterviewResource;
  onPlay: (resource: InterviewResource) => void;
  onSave?: (id: string) => void;
  savePending?: boolean;
  isAuthenticated?: boolean;
}

export function InterviewResourceCard({
  resource,
  onPlay,
  onSave,
  savePending = false,
  isAuthenticated = false,
}: InterviewResourceCardProps) {
  const thumbUrl =
    resource.thumbnailUrl ||
    `https://img.youtube.com/vi/${resource.youtubeId}/hqdefault.jpg`;

  return (
    <article
      className="panel group flex flex-col cursor-pointer hover:ring-2 hover:ring-brand/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
      onClick={() => onPlay(resource)}
      aria-label={`Watch interview: ${resource.title}`}
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden rounded-t-xl">
        <img
          src={thumbUrl}
          alt={resource.title}
          className="w-full h-44 object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <PlayCircle
            size={52}
            className="text-white drop-shadow-xl"
            strokeWidth={1.5}
          />
        </div>
        {/* Duration badge */}
        {resource.duration && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            <Clock size={10} />
            {formatDuration(resource.duration)}
          </span>
        )}
        {/* YouTube badge */}
        <span className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-red-600/90 px-1.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
          <Youtube size={10} />
          YouTube
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2.5 p-4 flex-1">
        {/* Tags row */}
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-brand-light/20 text-brand border-brand/20">
            <MonitorPlay size={10} />
            {ROLE_LABELS[resource.roleTag]}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[resource.difficulty]}`}
          >
            {resource.difficulty[0] + resource.difficulty.slice(1).toLowerCase()}
          </span>
          {resource.companyTag !== "ANY" && (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${COMPANY_COLORS[resource.companyTag]}`}
            >
              {resource.companyTag}
            </span>
          )}
          {resource.roundType && (
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-zinc-500/10 text-zinc-400 border-zinc-500/15">
              <Code2 size={9} />
              {resource.roundType.replace("_", " ")}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-primary leading-snug line-clamp-2">
          {resource.title}
        </h3>

        {/* Lang tags */}
        {resource.langTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {resource.langTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-base-2 px-1.5 py-0.5 text-xs text-muted-fg"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer row */}
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-xs text-muted-fg truncate max-w-[60%]">
            {resource.channelName || "YouTube"}
          </span>

          {/* Save button */}
          {isAuthenticated && onSave && (
            <button
              id={`save-interview-${resource.id}`}
              type="button"
              aria-label={resource.isSaved ? "Unsave interview" : "Save interview"}
              disabled={savePending}
              onClick={(e) => {
                e.stopPropagation();
                onSave(resource.id);
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                resource.isSaved
                  ? "border-brand/30 bg-brand/10 text-brand hover:bg-brand/20"
                  : "border-border bg-base hover:border-brand/30 hover:text-brand text-muted-fg"
              }`}
            >
              {resource.isSaved ? (
                <>
                  <BookmarkCheck size={12} />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark size={12} />
                  Save
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
