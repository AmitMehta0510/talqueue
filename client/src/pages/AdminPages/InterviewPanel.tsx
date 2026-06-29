import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Video, Trash2, Loader2, RefreshCw, PlayCircle, Search, Database, ExternalLink
} from "lucide-react";
import { api, InterviewResource } from "../../lib/api";
import { SearchBar, DataTable } from "./shared";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";

export function InterviewPanel() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch interviews
  const queryParams = {
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin", "interviews", queryParams],
    queryFn: () => api.interviews(queryParams),
    placeholderData: (prev) => prev,
  });

  const interviews: InterviewResource[] = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = data?.data?.totalPages ?? 1;

  // Trigger manual scrape mutation
  const scrapeMutation = useMutation({
    mutationFn: () => api.triggerInterviewScrape(),
    onSuccess: (res) => {
      showToast(
        "success",
        `Scrape complete! Created: ${res.data.created}, Updated: ${res.data.updated}`
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "interviews"] });
    },
    onError: (err) => {
      showToast("error", `Scrape failed: ${getErrorMessage(err)}`);
    },
  });

  // Delete interview mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteInterview(id),
    onSuccess: () => {
      showToast("success", "Interview resource deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "interviews"] });
    },
    onError: (err) => {
      showToast("error", `Failed to delete: ${getErrorMessage(err)}`);
    },
  });

  const handleScrape = () => {
    scrapeMutation.mutate();
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview & Action Hero Card */}
      <div
        className="rounded-xl border p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
        style={{
          borderColor: "var(--border)",
          background: "linear-gradient(135deg, var(--bg-surface), rgba(99, 102, 241, 0.05))",
        }}
      >
        <div className="space-y-2">
          <h2 className="text-lg font-black tracking-tight flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Database size={16} />
            </span>
            Interview Repository
          </h2>
          <p className="text-xs max-w-xl" style={{ color: "var(--text-muted)" }}>
            Sync and curate mock interview listings on the platform. Scraping retrieves curated developer mock interviews from YouTube channels and updates their difficulty, company tags, and round categories.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleScrape}
            disabled={scrapeMutation.isPending}
            className="btn-primary py-2.5 px-4 font-bold text-xs shadow-glow-sm shrink-0 flex items-center justify-center gap-2"
          >
            {scrapeMutation.isPending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            Scrap Interviews
          </button>
        </div>
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-xl border p-4 flex items-center gap-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
            <Video size={18} />
          </div>
          <div>
            <div className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{total}</div>
            <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total Interviews</div>
          </div>
        </div>
      </div>

      {/* Management List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Curated Listings ({total})
          </h3>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 text-xs hover:text-indigo-500 transition"
            style={{ color: "var(--text-muted)" }}
            disabled={isFetching}
          >
            <RefreshCw size={11} className={isFetching ? "animate-spin" : ""} />
            Reload list
          </button>
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder="Search by interview title..." />

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>
          ) : (
            <>
              <DataTable
                headers={["Interview", "Channel", "Tags", "Duration", "Actions"]}
                empty={interviews.length === 0}
              >
                {interviews.map((item) => (
                  <tr key={item.id} className="transition hover:bg-[var(--bg-surface-2)]">
                    {/* Title */}
                    <td className="px-4 py-3 max-w-xs md:max-w-md">
                      <div className="flex items-start gap-2.5">
                        <PlayCircle size={15} className="mt-0.5 text-indigo-500 shrink-0" />
                        <div>
                          <div className="font-semibold line-clamp-2" style={{ color: "var(--text-primary)" }}>
                            {item.title}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-indigo-500 inline-flex items-center gap-0.5"
                            >
                              View on YouTube <ExternalLink size={8} />
                            </a>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Channel */}
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                      {item.channelName || "YouTube"}
                    </td>

                    {/* Tags */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.roleTag && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20">
                            {item.roleTag}
                          </span>
                        )}
                        {item.difficulty && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                            item.difficulty === "ADVANCED"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                              : item.difficulty === "INTERMEDIATE"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          }`}>
                            {item.difficulty}
                          </span>
                        )}
                        {item.companyTag && item.companyTag !== "ANY" && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">
                            {item.companyTag}
                          </span>
                        )}
                        {item.roundType && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 font-bold border border-zinc-500/20">
                            {item.roundType}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                      {item.duration ? `${Math.round(item.duration / 60)} min` : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          disabled={deleteMutation.isPending}
                          className="flex items-center gap-1 rounded p-1 text-rose-600 hover:bg-rose-500/10 disabled:opacity-50 transition border border-transparent hover:border-rose-500/20"
                          title="Delete Listing"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </DataTable>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-3 border-t flex items-center justify-between gap-3 text-xs" style={{ borderColor: "var(--border)" }}>
                  <span style={{ color: "var(--text-muted)" }}>
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="btn-secondary px-2.5 py-1 text-xxs disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="btn-secondary px-2.5 py-1 text-xxs disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
