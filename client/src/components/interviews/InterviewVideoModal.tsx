import { useEffect, useRef } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Clock,
  Code2,
  ExternalLink,
  MonitorPlay,
  X,
} from "lucide-react";
import type { InterviewResource, InterviewRoleTag } from "../../lib/api";

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

function formatDuration(seconds?: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

interface InterviewVideoModalProps {
  resource: InterviewResource;
  onClose: () => void;
  onSave?: (id: string) => void;
  savePending?: boolean;
  isAuthenticated?: boolean;
}

export function InterviewVideoModal({
  resource,
  onClose,
  onSave,
  savePending = false,
  isAuthenticated = false,
}: InterviewVideoModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    // Prevent body scroll
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Click-outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const embedUrl = `https://www.youtube.com/embed/${resource.youtubeId}?autoplay=1&rel=0&modestbranding=1`;

  return (
    <div
      ref={overlayRef}
      id="interview-video-modal"
      role="dialog"
      aria-modal="true"
      aria-label={resource.title}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-4xl bg-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-primary line-clamp-2 leading-snug">
              {resource.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {/* Role tag */}
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-brand-light/20 text-brand border-brand/20">
                <MonitorPlay size={10} />
                {ROLE_LABELS[resource.roleTag]}
              </span>
              {/* Difficulty */}
              <span className="text-xs text-muted-fg">{resource.difficulty[0] + resource.difficulty.slice(1).toLowerCase()}</span>
              {/* Company */}
              {resource.companyTag !== "ANY" && (
                <span className="text-xs text-muted-fg">· {resource.companyTag}</span>
              )}
              {/* Round */}
              {resource.roundType && (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-zinc-500/10 text-zinc-400 border-zinc-500/15">
                  <Code2 size={9} />
                  {resource.roundType.replace("_", " ")}
                </span>
              )}
              {/* Duration */}
              {resource.duration && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-fg">
                  <Clock size={10} />
                  {formatDuration(resource.duration)}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Open in YouTube */}
            <a
              id="interview-open-youtube"
              href={resource.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-fg hover:text-primary hover:border-brand/30 transition-colors"
              aria-label="Open on YouTube"
            >
              <ExternalLink size={12} />
              YouTube
            </a>

            {/* Save */}
            {isAuthenticated && onSave && (
              <button
                id="interview-modal-save"
                type="button"
                disabled={savePending}
                onClick={() => onSave(resource.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  resource.isSaved
                    ? "border-brand/30 bg-brand/10 text-brand hover:bg-brand/20"
                    : "border-border bg-base hover:border-brand/30 hover:text-brand text-muted-fg"
                }`}
                aria-label={resource.isSaved ? "Unsave" : "Save"}
              >
                {resource.isSaved ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                {resource.isSaved ? "Saved" : "Save"}
              </button>
            )}

            {/* Close */}
            <button
              id="interview-modal-close"
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-fg hover:text-primary hover:border-brand/30 transition-colors"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Embed */}
        <div className="relative w-full overflow-y-auto flex-1">
          <div className="aspect-video w-full">
            <iframe
              id="interview-youtube-embed"
              src={embedUrl}
              title={resource.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>

          {/* Metadata footer */}
          <div className="p-4 border-t border-border space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              {resource.channelName && (
                <span className="text-sm text-muted-fg">
                  Channel: <span className="text-primary font-medium">{resource.channelName}</span>
                </span>
              )}
              {resource.langTags.length > 0 && (
                <div className="flex flex-wrap gap-1 ml-auto">
                  {resource.langTags.map((tag) => (
                    <span key={tag} className="rounded bg-base-2 border border-border px-1.5 py-0.5 text-xs text-muted-fg">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
