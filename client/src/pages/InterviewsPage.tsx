import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MonitorPlay,
  Video,
  Plus,
  Sparkles,
  Brain,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Zap,
  Play,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useUrlState } from "../core/utils/useUrlState";
import { api, InterviewResource } from "../lib/api";
import { useAuth } from "../core/contexts/AuthContext";
import { useToast } from "../core/contexts/ToastContext";
import { getErrorMessage, formatDate } from "../core/utils/format";
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

  const [company, setCompany] = useUrlState("company", "");
  const [role, setRole] = useUrlState("role", "");
  const [difficulty, setDifficulty] = useUrlState("difficulty", "");

  const [filtersState, setFiltersState] = useState<InterviewFilters>(EMPTY_FILTERS);

  const filters = useMemo<InterviewFilters>(() => ({
    ...filtersState,
    companyTag: company as any,
    roleTag: role as any,
    difficulty: difficulty as any,
  }), [filtersState, company, role, difficulty]);

  const [page, setPage] = useState(1);
  const [activeResource, setActiveResource] = useState<InterviewResource | null>(null);

  const [activeTab, setActiveTab] = useState<"videos" | "practice">("videos");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [transcriptInput, setTranscriptInput] = useState("");

  // Query mock interview rooms
  const roomsQuery = useQuery({
    queryKey: ["interviewRooms"],
    queryFn: async () => {
      const res = await api.getInterviewRooms();
      return res?.data || [];
    },
    enabled: !!user && activeTab === "practice",
  });

  const rooms = roomsQuery.data || [];
  const activeRoom = rooms.find((r: any) => r.id === selectedRoomId) || (rooms.length > 0 ? rooms[0] : null);

  // Mutation to schedule a practice session
  const scheduleRoomMutation = useMutation({
    mutationFn: (resourceId?: string) => api.scheduleInterviewRoom({ resourceId }),
    onSuccess: (res) => {
      showToast("success", "Practice room created successfully!");
      queryClient.invalidateQueries({ queryKey: ["interviewRooms"] });
      setSelectedRoomId(res.data.id);
      setTranscriptInput("");
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Failed to create practice room");
    },
  });

  // Mutation to evaluate a transcript
  const evaluateRoomMutation = useMutation({
    mutationFn: (payload: { roomId: string; transcript: string }) =>
      api.evaluateInterviewRoom(payload.roomId, { transcript: payload.transcript }),
    onSuccess: (res) => {
      showToast("success", "AI Interview Evaluation completed!");
      queryClient.invalidateQueries({ queryKey: ["interviewRooms"] });
      setTranscriptInput("");
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Evaluation failed. Please try again.");
    },
  });

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
    setCompany(f.companyTag);
    setRole(f.roleTag);
    setDifficulty(f.difficulty);
    setFiltersState(f);
    setPage(1);
  }, [setCompany, setRole, setDifficulty]);

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
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold text-primary">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand border border-brand/20">
                <Video size={20} />
              </span>
              Mock Interviews
            </h1>
            <p className="mt-1 text-sm text-muted-fg">
              Curated YouTube mock interviews & live AI practice rooms.
            </p>
          </div>

          {/* Toggle Tab */}
          <div className="flex border border-border rounded-lg p-1 bg-surface shrink-0" style={{ background: "var(--bg-surface)" }}>
            <button
              onClick={() => setActiveTab("videos")}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "videos"
                  ? "bg-indigo-700 text-white shadow-sm"
                  : "text-muted-fg hover:text-primary"
              }`}
            >
              Curated Videos
            </button>
            <button
              onClick={() => {
                if (!user) {
                  showToast("error", "Sign in to access AI practice rooms");
                  return;
                }
                setActiveTab("practice");
              }}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "practice"
                  ? "bg-indigo-700 text-white shadow-sm"
                  : "text-muted-fg hover:text-primary"
              }`}
            >
              AI Practice & Feedback
            </button>
          </div>
        </div>

        {activeTab === "videos" ? (
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
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Scheduled practice list */}
            <div className="lg:col-span-1 border-r border-border pr-0 lg:pr-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-fg">Practice Sessions</h3>
                <button
                  onClick={() => scheduleRoomMutation.mutate()}
                  disabled={scheduleRoomMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white px-3 py-1.5 text-xs font-semibold transition"
                >
                  {scheduleRoomMutation.isPending ? <Loader2 className="animate-spin" size={12} /> : <Plus size={12} />}
                  New Session
                </button>
              </div>

              {roomsQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-indigo-500" size={20} />
                </div>
              ) : rooms.length === 0 ? (
                <div className="p-6 border border-dashed border-border rounded-xl text-center">
                  <p className="text-xs text-muted-fg">No practice rooms scheduled. Click "New Session" to start practicing.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto no-scrollbar">
                  {rooms.map((room: any) => {
                    const isSelected = activeRoom?.id === room.id;
                    return (
                      <button
                        key={room.id}
                        onClick={() => { setSelectedRoomId(room.id); setTranscriptInput(""); }}
                        className={`w-full text-left p-3.5 rounded-lg border transition-all ${
                          isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500" : "bg-surface hover:bg-card border-border"
                        }`}
                        style={{ background: isSelected ? undefined : "var(--bg-surface)" }}
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs font-bold text-primary truncate max-w-[150px]">
                            {room.resource?.title || "General Technical Interview"}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            room.status === "COMPLETED" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-amber-600 bg-amber-50 border-amber-200"
                          }`}>
                            {room.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-fg">
                          <Calendar size={10} />
                          <span>{formatDate(room.createdAt)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Practice Simulator Workspace */}
            <div className="lg:col-span-2 space-y-6">
              {!activeRoom ? (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-xl text-center">
                  <Brain size={24} className="text-indigo-500 mb-2" />
                  <h4 className="text-sm font-bold text-primary">No Active Session</h4>
                  <p className="text-xs text-muted-fg mt-1">Select a session from the list or create a new one to begin practicing.</p>
                </div>
              ) : activeRoom.status === "SCHEDULED" ? (
                <div className="p-6 rounded-xl border border-border bg-card space-y-4 shadow-sm" style={{ background: "var(--bg-surface)" }}>
                  <div className="space-y-1">
                    <span className="chip bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                      {activeRoom.resource?.roleTag || "SDE"} • {activeRoom.resource?.difficulty || "INTERMEDIATE"}
                    </span>
                    <h3 className="text-base font-bold text-primary mt-1">
                      {activeRoom.resource?.title || "General Mock Interview"}
                    </h3>
                    <p className="text-xs text-muted-fg">
                      Paste your mock interview transcript, questions and answers script, or text responses below. The AI auditor will grade your technical accuracy and communication style.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-fg uppercase tracking-wider block">Interview Script / Transcript</label>
                    <textarea
                      value={transcriptInput}
                      onChange={(e) => setTranscriptInput(e.target.value)}
                      placeholder="Interviewer: What is standard lifecycle in React?&#10;Candidate: React components go through mounting, updating, and unmounting..."
                      rows={10}
                      className="w-full rounded-lg border border-border p-3 text-xs text-primary focus:border-indigo-500 focus:outline-none"
                      style={{ background: "var(--bg-surface)" }}
                    />
                  </div>

                  <button
                    onClick={() => evaluateRoomMutation.mutate({ roomId: activeRoom.id, transcript: transcriptInput })}
                    disabled={evaluateRoomMutation.isPending || !transcriptInput.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50"
                  >
                    {evaluateRoomMutation.isPending ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Auditing Performance...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Evaluate & Grade Session
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* COMPLETED Session AI Feedback Dashboard */
                <div className="space-y-6">
                  {/* Metric Scores */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Overall Score", val: activeRoom.aiFeedback?.score, color: "text-indigo-500" },
                      { label: "Technical Accuracy", val: activeRoom.aiFeedback?.technicalScore, color: "text-emerald-500" },
                      { label: "Communication Clarity", val: activeRoom.aiFeedback?.communicationScore, color: "text-amber-500" },
                    ].map((score, i) => (
                      <div key={i} className="p-4 rounded-xl border border-border text-center shadow-sm" style={{ background: "var(--bg-surface)" }}>
                        <div className={`text-2xl font-black ${score.color}`}>{score.val || 0}/100</div>
                        <div className="text-[10px] font-bold text-muted-fg uppercase tracking-wider mt-1">{score.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* General Text Summary */}
                  <div className="p-5 rounded-xl border border-border space-y-2 shadow-sm" style={{ background: "var(--bg-surface)" }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-fg flex items-center gap-1.5">
                      <Brain size={14} className="text-indigo-500" />
                      Evaluation Summary
                    </h4>
                    <p className="text-xs text-primary leading-relaxed">{activeRoom.aiFeedback?.feedback}</p>
                  </div>

                  {/* Strengths & Improvements */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 rounded-xl border border-border space-y-3 shadow-sm" style={{ background: "var(--bg-surface)" }}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-fg flex items-center gap-1.5">
                        <CheckCircle2 className="text-emerald-500" size={14} />
                        Key Strengths
                      </h4>
                      <ul className="space-y-2">
                        {(activeRoom.aiFeedback?.strengths || []).map((s: string, idx: number) => (
                          <li key={idx} className="text-xs text-primary flex items-start gap-2">
                            <Zap size={11} className="text-amber-500 shrink-0 mt-0.5" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-5 rounded-xl border border-border space-y-3 shadow-sm" style={{ background: "var(--bg-surface)" }}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-fg flex items-center gap-1.5">
                        <AlertCircle className="text-amber-500" size={14} />
                        Points of Improvement
                      </h4>
                      <ul className="space-y-2">
                        {(activeRoom.aiFeedback?.improvements || []).map((imp: string, idx: number) => (
                          <li key={idx} className="text-xs text-primary flex items-start gap-2">
                            <span className="h-4 w-4 bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center rounded-full text-[9px] font-bold shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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
