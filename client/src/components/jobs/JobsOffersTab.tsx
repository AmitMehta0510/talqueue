import { Trophy, Building2, ExternalLink, Inbox, Calendar, Sparkles } from "lucide-react";
import { useMyExternalApplicationsQuery } from "../../hooks/usePlatformQueries";
import { ExternalJobApplication } from "../../lib/api";
import { cleanLogoUrl, formatDate } from "../../core/utils/format";
import { InlineLoader } from "../ui";

function OfferCard({ app }: { app: ExternalJobApplication }) {
  const logoUrl = cleanLogoUrl(app.companyLogoUrl);

  return (
    <div className="relative flex flex-col gap-3 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-[color:var(--bg-surface)] shadow-sm hover:shadow-md transition-all duration-200 group">
      {/* Shimmer glow on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-emerald-400/5 to-transparent pointer-events-none" />

      {/* Top row — logo + badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={app.companyName}
              className="h-11 w-11 rounded-xl border border-[color:var(--border)] object-cover bg-white shrink-0 shadow-sm"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Building2 size={18} />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-black text-primary truncate leading-snug">
              {app.jobTitle}
            </h3>
            <p className="text-xs text-secondary truncate font-semibold mt-0.5">
              {app.companyName}
            </p>
          </div>
        </div>

        {/* Offer badge */}
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50 shrink-0">
          <Trophy size={9} />
          Offer
        </span>
      </div>

      {/* Meta — date + location */}
      <div className="flex items-center gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <Calendar size={10} />
          Applied {formatDate(app.appliedAt)}
        </span>
        {app.location && (
          <span className="truncate text-secondary font-medium">{app.location}</span>
        )}
      </div>

      {/* Notes */}
      {app.notes && (
        <p className="text-[11px] text-secondary italic border-t border-[color:var(--border)] pt-2 truncate">
          "{app.notes}"
        </p>
      )}

      {/* CTA */}
      {app.applyUrl && (
        <a
          href={app.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline transition"
        >
          <ExternalLink size={11} />
          View Offer / Application
        </a>
      )}
    </div>
  );
}

export function JobsOffersTab() {
  const { data: externalApps, isLoading, isError } = useMyExternalApplicationsQuery();

  const offers = (externalApps || []).filter(
    (app) => app.status === "OFFER_RECEIVED"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-black text-primary flex items-center gap-2">
          <Trophy size={16} className="text-emerald-500" />
          Offers Received
        </h2>
        <p className="text-xs text-muted mt-0.5">
          External job applications where you've received an offer
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <InlineLoader label="Loading offers…" />
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-xs text-danger">
          Failed to load offers. Please try again.
        </div>
      ) : offers.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-400">
            <Sparkles size={28} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-primary">No offers yet</p>
            <p className="text-xs text-muted max-w-xs">
              When you receive an offer, mark your application as{" "}
              <span className="font-semibold text-secondary">"Offer Received"</span> in the{" "}
              <span className="font-semibold text-brand">My Applications</span> Kanban board.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {offers.map((app) => (
            <OfferCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}
