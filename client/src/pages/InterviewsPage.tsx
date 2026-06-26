import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MonitorPlay, Video } from "lucide-react";
import { api, InterviewResource } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { getErrorMessage } from "../lib/format";
import { EmptyState, ErrorState } from "../components/ui";
import { InterviewResourceCard } from "../components/interviews/InterviewResourceCard";
import { InterviewCardSkeleton } from "../components/interviews/InterviewCardSkeleton";
import { InterviewFilterPanel, InterviewFilters } from "../components/interviews/InterviewFilterPanel";
import { InterviewVideoModal } from "../components/interviews/InterviewVideoModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const EMPTY_FILTERS: InterviewFilters = {
  search: "",
  roleTag: "",
  difficulty: "",
  companyTag: "",
  roundType: "",
  formatTag: "",
  langTag: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function InterviewsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<InterviewFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [activeResource, setActiveResource] = useState<InterviewResource | null>(null);

  // Debounce search so we don't fire on every keystroke
  const searchRef = useRef(filters.search);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  useEffect(() => {
    searchRef.current = filters.search;
    const t = setTimeout(() => setDebouncedSearch(filters.search), 400);
    return () => clearTimeout(t);
  }, [filters.search]);

  // Reset page to 1 whenever filters change
  const handleFiltersChange = useCallback((f: InterviewFilters) => {
    setFilters(f);
    setPage(1);
  }, []);

  // ─── Query ────────────────────────────────────────────────────────────────

  const queryParams = {
    page,
    limit: PAGE_SIZE,
    ...(filters.roleTag && { roleTag: filters.roleTag }),
    ...(filters.difficulty && { difficulty: filters.difficulty }),
    ...(filters.companyTag && { companyTag: filters.companyTag }),
    ...(filters.roundType && { roundType: filters.roundType }),
    ...(filters.formatTag && { formatTag: filters.formatTag }),
    ...(filters.langTag && { langTag: filters.langTag }),
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["interviews", queryParams],
    queryFn: () => api.interviews(queryParams),
    staleTime: 60_000,
    placeholderData: (prev) => prev, // keep previous page data while loading next page
  });

  // ─── Save mutation ────────────────────────────────────────────────────────

  const { mutate: toggleSave, isPending: savePending } = useMutation({
    mutationFn: (id: string) => api.toggleSaveInterview(id),
    onSuccess: (res, id) => {
      showToast(res.data.saved ? "success" : "info", res.data.saved ? "Interview saved" : "Interview unsaved");

      // Optimistically update both the list and the open modal
      const updater = (old: any) => {
        if (!old?.data?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: old.data.data.map((r: InterviewResource) =>
              r.id === id ? { ...r, isSaved: res.data.saved } : r,
            ),
          },
        };
      };
      queryClient.setQueriesData({ queryKey: ["interviews"] }, updater);

      setActiveResource((prev) =>
        prev?.id === id ? { ...prev, isSaved: res.data.saved } : prev,
      );
    },
    onError: (err) => showToast("error", getErrorMessage(err)),
  });

  const handleSave = useCallback(
    (id: string) => {
      if (!user) {
        showToast("error", "Sign in to save interviews");
        return;
      }
      toggleSave(id);
    },
    [user, toggleSave, showToast],
  );

  // ─── Pagination ───────────────────────────────────────────────────────────

  const totalPages = data?.data?.totalPages ?? 1;
  const total = data?.data?.total ?? 0;
  const resources: InterviewResource[] = data?.data?.data ?? [];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* SEO */}
      <title>Mock Interviews — Engineers Platform</title>
      <meta
        name="description"
        content="Browse curated mock interview videos for SDE-1, SDE-2, System Design, Frontend, Backend, DevOps, and more. Filter by difficulty, company type, and tech stack."
      />

      <div className="mx-auto max-w-screen-xl px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-primary">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand border border-brand/20">
              <Video size={20} />
            </span>
            Mock Interviews
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            Curated YouTube mock interviews — filter by role, difficulty, company, and tech stack.
          </p>
        </div>

        <div className="flex gap-6 items-start">
          {/* Sidebar filter panel */}
          <div className="hidden lg:block w-64 shrink-0">
            <InterviewFilterPanel
              filters={filters}
              onChange={handleFiltersChange}
              resultCount={!isLoading ? total : undefined}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Mobile filters hint */}
            <div className="lg:hidden">
              <InterviewFilterPanel
                filters={filters}
                onChange={handleFiltersChange}
                resultCount={!isLoading ? total : undefined}
              />
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <InterviewCardSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <ErrorState
                title="Failed to load interviews"
                text={getErrorMessage(error)}
                onRetry={() => queryClient.invalidateQueries({ queryKey: ["interviews"] })}
              />
            ) : resources.length === 0 ? (
              <EmptyState
                icon={MonitorPlay}
                title="No interviews found"
                text="Try adjusting your filters or clearing the search term."
              />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {resources.map((r) => (
                    <InterviewResourceCard
                      key={r.id}
                      resource={r}
                      onPlay={setActiveResource}
                      onSave={handleSave}
                      savePending={savePending}
                      isAuthenticated={!!user}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Video modal */}
      {activeResource && (
        <InterviewVideoModal
          resource={activeResource}
          onClose={() => setActiveResource(null)}
          onSave={handleSave}
          savePending={savePending}
          isAuthenticated={!!user}
        />
      )}
    </>
  );
}

// ─── Pagination sub-component ─────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  const scrollToTop = (p: number) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    onPageChange(p);
  };

  const pages = buildPageRange(page, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border">
      <p className="text-xs text-muted-fg">
        Page {page} of {totalPages} — {total} resources
      </p>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button
          id="interview-page-prev"
          type="button"
          disabled={page === 1}
          onClick={() => scrollToTop(page - 1)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-fg hover:text-primary hover:border-brand/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Prev
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-xs text-muted-fg">…</span>
          ) : (
            <button
              id={`interview-page-${p}`}
              key={p}
              type="button"
              onClick={() => scrollToTop(p as number)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                p === page
                  ? "border-brand/40 bg-brand/10 text-brand"
                  : "border-border text-muted-fg hover:text-primary hover:border-brand/30"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          id="interview-page-next"
          type="button"
          disabled={page === totalPages}
          onClick={() => scrollToTop(page + 1)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-fg hover:text-primary hover:border-brand/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </nav>
    </div>
  );
}

function buildPageRange(current: number, total: number): Array<number | "..."> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | "..."> = [];
  const add = (p: number) => { if (!pages.includes(p)) pages.push(p); };
  add(1);
  if (current > 3) pages.push("...");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) add(p);
  if (current < total - 2) pages.push("...");
  add(total);
  return pages;
}
