import { useState } from "react";
import {
  Building2, CheckCircle, XCircle, Loader2, ExternalLink,
  RefreshCw, Globe, Layers, AlertTriangle, Search
} from "lucide-react";
import { useDiscoveredCompaniesQuery, useReviewDiscoveredCompaniesMutation, useAdminTriggerCompanyDiscoveryMutation } from "../../hooks/usePlatformQueries";
import { cleanLogoUrl } from "../../lib/format";

type Action = "VERIFY" | "REJECT";

const SOURCE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  "greenhouse-aggregate": { label: "Greenhouse", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-600/20" },
  "lever-aggregate":      { label: "Lever",       color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-600/20" },
  "seeded":               { label: "Seeded",      color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-600/20"     },
};

export function DiscoveredCompaniesPanel() {
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const query = useDiscoveredCompaniesQuery(page, 30);
  const reviewMutation = useReviewDiscoveredCompaniesMutation();
  const triggerDiscovery = useAdminTriggerCompanyDiscoveryMutation();

  const data = query.data;
  const companies: any[] = data?.companies || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  // Client-side search filter
  const filtered = search.trim()
    ? companies.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.industry || "").toLowerCase().includes(search.toLowerCase())
      )
    : companies;

  const allFilteredIds = filtered.map((c) => c.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleBulkAction = async (action: Action) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await reviewMutation.mutateAsync({ companyIds: ids, action });
    setSelectedIds(new Set());
  };

  const handleSingleAction = async (id: string, action: Action) => {
    await reviewMutation.mutateAsync({ companyIds: [id], action });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Discovered Companies
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Auto-imported companies from Greenhouse &amp; Lever — pending admin review
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="trigger-company-discovery"
            disabled={triggerDiscovery.isPending}
            onClick={() => triggerDiscovery.mutate()}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition"
          >
            {triggerDiscovery.isPending ? (
              <>
                <Loader2 size={12} className="animate-spin text-emerald-400" />
                Discovering...
              </>
            ) : (
              <>
                <Globe size={12} />
                Discover Companies
              </>
            )}
          </button>
          <button
            id="refresh-discovered-companies"
            onClick={() => query.refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition"
          >
            <RefreshCw size={12} className={query.isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border  px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">Pending Review</div>
          <div className="text-2xl font-black text-white">{total}</div>
        </div>
        <div className="rounded-xl border border-emerald-600/20 bg-emerald-500/5 px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-500/70 mb-0.5">Greenhouse</div>
          <div className="text-2xl font-black text-emerald-400">
            {companies.filter((c) => c.discoveredVia === "greenhouse-aggregate").length}
          </div>
        </div>
        <div className="rounded-xl border border-violet-600/20 bg-violet-500/5 px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-violet-500/70 mb-0.5">Lever</div>
          <div className="text-2xl font-black text-violet-400">
            {companies.filter((c) => c.discoveredVia === "lever-aggregate").length}
          </div>
        </div>
      </div>

      {/* Search + Bulk Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            id="discovered-companies-search"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 pl-8 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition"
            placeholder="Filter by name or industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
            <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">
              {selectedIds.size} selected
            </span>
            <button
              id="bulk-verify-discovered"
              disabled={reviewMutation.isPending}
              onClick={() => handleBulkAction("VERIFY")}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition"
            >
              {reviewMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
              Verify All
            </button>
            <button
              id="bulk-reject-discovered"
              disabled={reviewMutation.isPending}
              onClick={() => handleBulkAction("REJECT")}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600/80 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition"
            >
              {reviewMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
              Reject All
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {query.isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin text-emerald-500" />
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-600/20">
            <Building2 size={28} className="text-emerald-400" />
          </div>
          <h3 className="font-bold text-zinc-300 mb-1">No Pending Companies</h3>
          <p className="text-sm text-zinc-500 max-w-xs">
            The nightly discovery cron hasn't found any new companies yet, or all discovered companies have been reviewed.
          </p>
          <div className="mt-4 flex items-center gap-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <AlertTriangle size={11} className="text-amber-400" />
            Discovery runs at midnight IST daily
          </div>
        </div>
      ) : (
        <>
          {/* Select All Bar */}
          <div className="flex items-center gap-3 rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-4 py-2.5">
            <input
              id="select-all-discovered"
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-zinc-600 accent-emerald-500 cursor-pointer"
            />
            <span className="text-xs text-zinc-400">
              {allSelected ? `All ${filtered.length} companies selected` : `Select all ${filtered.length} on this page`}
            </span>
          </div>

          {/* Company List */}
          <div className="space-y-2">
            {filtered.map((company) => {
              const source = SOURCE_LABELS[company.discoveredVia] || { label: company.discoveredVia || "Unknown", color: "text-zinc-400", bg: "bg-zinc-700/30 border-zinc-700/30" };
              const logo = cleanLogoUrl(company.logoUrl);
              const isSelected = selectedIds.has(company.id);

              return (
                <div
                  key={company.id}
                  className={`group rounded-xl border transition ${
                    isSelected
                      ? "border-emerald-600/50 bg-emerald-500/5"
                      : "border-zinc-700/50 bg-zinc-800/40 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-center gap-3 p-4">
                    {/* Checkbox */}
                    <input
                      id={`select-discovered-${company.id}`}
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(company.id)}
                      className="h-4 w-4 shrink-0 rounded border-zinc-600 accent-emerald-500 cursor-pointer"
                    />

                    {/* Logo */}
                    {logo ? (
                      <img
                        src={logo}
                        alt={company.name}
                        className="h-10 w-10 shrink-0 rounded-xl object-contain bg-zinc-700/50 border border-zinc-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-700">
                        <Building2 size={16} className="text-zinc-500" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white truncate">{company.name}</span>
                        <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${source.bg} ${source.color}`}>
                          <Layers size={8} />
                          {source.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {company.industry && (
                          <span className="text-[11px] text-zinc-500 truncate">{company.industry}</span>
                        )}
                        <span className="text-[11px] text-zinc-600 flex items-center gap-0.5">
                          <Globe size={9} />
                          {company._count?.jobs ?? 0} jobs
                        </span>
                        <span className="text-[11px] text-zinc-600">
                          {new Date(company.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition">
                      {company.websiteUrl && (
                        <a
                          href={company.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          id={`visit-company-${company.id}`}
                          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 transition"
                          title="Visit website"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <button
                        id={`verify-company-${company.id}`}
                        disabled={reviewMutation.isPending}
                        onClick={() => handleSingleAction(company.id, "VERIFY")}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600/20 border border-emerald-600/30 px-2.5 py-1.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-600/40 disabled:opacity-50 transition"
                        title="Verify this company"
                      >
                        <CheckCircle size={11} />
                        Verify
                      </button>
                      <button
                        id={`reject-company-${company.id}`}
                        disabled={reviewMutation.isPending}
                        onClick={() => handleSingleAction(company.id, "REJECT")}
                        className="flex items-center gap-1 rounded-lg bg-rose-600/10 border border-rose-600/20 px-2.5 py-1.5 text-[11px] font-bold text-rose-400 hover:bg-rose-600/25 disabled:opacity-50 transition"
                        title="Reject and delete this company"
                      >
                        <XCircle size={11} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Page {page} of {totalPages} — {total} total
              </span>
              <div className="flex items-center gap-2">
                <button
                  id="discovered-prev-page"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40 transition"
                >
                  ← Previous
                </button>
                <button
                  id="discovered-next-page"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40 transition"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
