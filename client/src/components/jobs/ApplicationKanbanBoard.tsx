import { useState } from "react";
import {
  CheckCircle,
  Building2,
  ExternalLink,
  ChevronDown,
  Trash2,
  Globe,
  Briefcase,
  Phone,
  Code2,
  Users,
  Trophy,
  XCircle,
} from "lucide-react";
import { Job, ExternalJobApplication, ExternalAppStatus } from "../../lib/api";
import {
  useUpdateExternalApplicationStatusMutation,
  useDeleteExternalApplicationMutation,
} from "../../hooks/usePlatformQueries";
import { cleanLogoUrl, formatDate, titleCase } from "../../lib/format";
import { Avatar } from "../ui";

// Platform application status (set by recruiter)
type PlatformStatus = "APPLIED" | "VIEWED" | "SHORTLISTED" | "INTERVIEW" | "REJECTED" | "HIRED";

interface PlatformApp {
  type: "platform";
  id: string;
  jobId: string;
  jobTitle?: string;
  companyName?: string;
  companyLogoUrl?: string | null;
  status: PlatformStatus;
  appliedAt: string;
  job?: Job;
}

interface ExternalApp {
  type: "external";
  app: ExternalJobApplication;
}

type ApplicationCard = PlatformApp | ExternalApp;

// Column definitions mapping to statuses
type KanbanColumn = {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  platformStatuses: PlatformStatus[];
  externalStatuses: ExternalAppStatus[];
};

const COLUMNS: KanbanColumn[] = [
  {
    id: "applied",
    label: "Applied",
    icon: Briefcase,
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    borderColor: "border-blue-200 dark:border-blue-900/40",
    platformStatuses: ["APPLIED", "VIEWED"],
    externalStatuses: ["APPLIED"],
  },
  {
    id: "screening",
    label: "Screening",
    icon: Phone,
    color: "text-violet-700 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-950/40",
    borderColor: "border-violet-200 dark:border-violet-900/40",
    platformStatuses: ["SHORTLISTED"],
    externalStatuses: ["PHONE_SCREEN"],
  },
  {
    id: "interview",
    label: "Interview",
    icon: Code2,
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/40",
    borderColor: "border-amber-200 dark:border-amber-900/40",
    platformStatuses: ["INTERVIEW"],
    externalStatuses: ["TECHNICAL_ROUND", "HR_ROUND"],
  },
  {
    id: "offer",
    label: "Offer",
    icon: Trophy,
    color: "text-indigo-700 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/40",
    borderColor: "border-indigo-200 dark:border-indigo-900/40",
    platformStatuses: ["HIRED"],
    externalStatuses: ["OFFER_RECEIVED"],
  },
  {
    id: "closed",
    label: "Closed",
    icon: XCircle,
    color: "text-slate-500 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-800/40",
    borderColor: "border-slate-200 dark:border-slate-700/60",
    platformStatuses: ["REJECTED"],
    externalStatuses: ["REJECTED", "WITHDRAWN"],
  },
];

const EXTERNAL_STATUS_LABELS: Record<ExternalAppStatus, string> = {
  APPLIED: "Applied",
  PHONE_SCREEN: "Phone Screen",
  TECHNICAL_ROUND: "Technical Round",
  HR_ROUND: "HR Round",
  OFFER_RECEIVED: "Offer Received",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

const PLATFORM_STATUS_LABELS: Record<PlatformStatus, string> = {
  APPLIED: "Applied",
  VIEWED: "Viewed by Recruiter",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview Scheduled",
  REJECTED: "Rejected",
  HIRED: "Hired 🎉",
};

// Status update dropdown for external apps
function ExternalStatusDropdown({
  app,
  onClose,
}: {
  app: ExternalJobApplication;
  onClose: () => void;
}) {
  const updateMutation = useUpdateExternalApplicationStatusMutation();

  const options: ExternalAppStatus[] = [
    "APPLIED",
    "PHONE_SCREEN",
    "TECHNICAL_ROUND",
    "HR_ROUND",
    "OFFER_RECEIVED",
    "REJECTED",
    "WITHDRAWN",
  ];

  return (
    <div className="absolute top-full left-0 mt-1 z-50 w-44 glass shadow-xl overflow-hidden py-1">
      {options.map((status) => (
        <button
          key={status}
          type="button"
          onClick={async () => {
            await updateMutation.mutateAsync({ id: app.id, status });
            onClose();
          }}
          disabled={updateMutation.isPending}
          className={`w-full text-left px-3 py-2 text-xs font-semibold transition hover:bg-surface-2 ${
            app.status === status ? "text-brand bg-brand-light" : "text-secondary"
          }`}
        >
          {EXTERNAL_STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  );
}

// Individual application card
function AppCard({ card }: { card: ApplicationCard }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const deleteMutation = useDeleteExternalApplicationMutation();

  const isPlatform = card.type === "platform";

  const title = isPlatform
    ? card.jobTitle || "Unknown Role"
    : card.app.jobTitle;
  const company = isPlatform
    ? card.companyName || "Company"
    : card.app.companyName;
  const logoUrl = isPlatform
    ? cleanLogoUrl(card.companyLogoUrl)
    : cleanLogoUrl(card.app.companyLogoUrl);
  const appliedAt = isPlatform
    ? card.appliedAt
    : card.app.appliedAt;

  return (
    <div className="relative panel p-3.5 space-y-2.5 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700">
      {/* Source badge */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border ${
            isPlatform
              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/40"
              : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40"
          }`}
        >
          {isPlatform ? (
            <><CheckCircle size={8} /> Platform</>
          ) : (
            <><Globe size={8} /> External</>
          )}
        </span>
        {!isPlatform && (
          <button
            type="button"
            onClick={() => deleteMutation.mutateAsync((card as ExternalApp).app.id)}
            className="text-muted-fg hover:text-rose-500 transition p-0.5 rounded"
            title="Remove tracking"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>

      {/* Company + Role */}
      <div className="flex items-start gap-2.5">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={company}
            className="h-9 w-9 rounded-lg border border-base object-cover shrink-0"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 border border-base text-muted-fg shrink-0">
            <Building2 size={15} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold text-primary leading-snug truncate">{title}</p>
          <p className="text-[11px] text-secondary truncate">{company}</p>
        </div>
      </div>

      {/* Status */}
      <div className="text-[10px] text-muted-fg flex items-center justify-between gap-1">
        <span>Applied {formatDate(appliedAt)}</span>
        {!isPlatform && card.app.applyUrl && (
          <a
            href={card.app.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline transition"
          >
            <ExternalLink size={10} />
          </a>
        )}
      </div>

      {/* Platform status badge (read-only) or External status dropdown */}
      {isPlatform ? (
        <div className="rounded-lg bg-surface-2 border border-base px-2.5 py-1.5 text-[10px] font-semibold text-secondary">
          📋 {PLATFORM_STATUS_LABELS[(card as PlatformApp).status]}
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown((s) => !s)}
            className="w-full flex items-center justify-between gap-1 rounded-lg border border-base bg-surface-2 px-2.5 py-1.5 text-[10px] font-semibold text-secondary hover:border-brand hover:bg-brand-light hover:text-brand transition"
          >
            {EXTERNAL_STATUS_LABELS[(card as ExternalApp).app.status]}
            <ChevronDown size={10} />
          </button>
          {showDropdown && (
            <ExternalStatusDropdown
              app={(card as ExternalApp).app}
              onClose={() => setShowDropdown(false)}
            />
          )}
        </div>
      )}

      {/* Notes for external */}
      {!isPlatform && (card as ExternalApp).app.notes && (
        <p className="text-[10px] text-muted-fg italic truncate">
          "{(card as ExternalApp).app.notes}"
        </p>
      )}
    </div>
  );
}

interface ApplicationKanbanBoardProps {
  platformApps: Array<{
    id: string;
    jobId: string;
    status: string;
    createdAt: string;
    job?: Job;
  }>;
  externalApps: ExternalJobApplication[];
}

export function ApplicationKanbanBoard({
  platformApps,
  externalApps,
}: ApplicationKanbanBoardProps) {
  // Map platform apps to cards
  const platformCards: PlatformApp[] = platformApps.map((app) => ({
    type: "platform",
    id: app.id,
    jobId: app.jobId,
    jobTitle: app.job?.title,
    companyName: app.job?.company?.name,
    companyLogoUrl: app.job?.company?.logoUrl,
    status: app.status as PlatformStatus,
    appliedAt: app.createdAt,
    job: app.job,
  }));

  // Map external apps to cards
  const externalCards: ExternalApp[] = externalApps.map((app) => ({
    type: "external",
    app,
  }));

  const allCards: ApplicationCard[] = [...platformCards, ...externalCards];

  if (allCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 border border-base text-muted-fg">
          <Briefcase size={28} />
        </div>
        <div>
          <p className="text-sm font-bold text-primary">No applications yet</p>
          <p className="text-xs text-muted-fg mt-1">
            Apply to jobs on the platform or click "Apply on Company Website" to start tracking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Scroll indicator boundary fades */}
      <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-black/10 dark:from-black/25 to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-black/10 dark:from-black/25 to-transparent pointer-events-none z-10" />

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max px-2">
          {COLUMNS.map((col) => {
            const cards = allCards.filter((card) => {
              if (card.type === "platform") {
                return col.platformStatuses.includes((card as PlatformApp).status);
              } else {
                return col.externalStatuses.includes((card as ExternalApp).app.status);
              }
            });

            return (
              <div key={col.id} className="w-64 shrink-0 flex flex-col gap-2">
                {/* Column header */}
                <div
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 border ${col.bgColor} ${col.borderColor}`}
                >
                  <div className={`flex items-center gap-1.5 text-xs font-bold ${col.color}`}>
                    <col.icon size={13} />
                    {col.label}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${col.bgColor} ${col.color} border ${col.borderColor}`}
                  >
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2.5 min-h-[80px]">
                  {cards.length > 0 ? (
                    cards.map((card) => (
                      <AppCard
                        key={card.type === "platform" ? card.id : (card as ExternalApp).app.id}
                        card={card}
                      />
                    ))
                  ) : (
                    <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-base h-16">
                      <p className="text-[10px] text-muted-fg/50 font-semibold">Empty</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
