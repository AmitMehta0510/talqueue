import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Zap,
  Info,
} from "lucide-react";
import { api } from "../../lib/api";
import { useToast } from "../../core/contexts/ToastContext";
import { formatDate } from "../../core/utils/format";

export function ProfileAIReview() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedReview, setSelectedReview] = useState<any | null>(null);

  // Queries historical reviews
  const { data: reviews = [], isLoading, isError } = useQuery({
    queryKey: ["resumeReviews"],
    queryFn: async () => {
      const response = await api.getResumeReviews();
      const list = response?.data || [];
      if (list.length > 0 && !selectedReview) {
        setSelectedReview(list[0]);
      }
      return list;
    },
  });

  // Trigger new AI audit mutation
  const auditMutation = useMutation({
    mutationFn: () => api.triggerResumeReview(),
    onSuccess: (res) => {
      showToast("success", "AI Profile Audit complete!");
      queryClient.invalidateQueries({ queryKey: ["resumeReviews"] });
      setSelectedReview(res.data);
    },
    onError: (err: any) => {
      showToast("error", err?.message || "AI audit failed. Please try again.");
    },
  });

  const activeReview = selectedReview || (reviews.length > 0 ? reviews[0] : null);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 border-emerald-500";
    if (score >= 50) return "text-amber-500 border-amber-500";
    return "text-rose-500 border-rose-500";
  };

  return (
    <div className="space-y-6">
      {/* Header card with trigger */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-xl border border-border bg-card shadow-sm" style={{ background: "var(--bg-surface)" }}>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            <Sparkles className="text-amber-500" size={20} />
            AI Resume & Profile Audit
          </h3>
          <p className="text-xs text-muted-fg max-w-xl">
            Analyze your education, experiences, skills, and projects with Google Gemini to optimize for ATS scanners and technical hiring managers.
          </p>
        </div>
        <button
          onClick={() => auditMutation.mutate()}
          disabled={auditMutation.isPending}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
        >
          {auditMutation.isPending ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Auditing Profile...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Audit My Profile
            </>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="animate-spin text-indigo-500 mb-2" size={24} />
          <p className="text-xs text-muted-fg">Loading audit history...</p>
        </div>
      ) : isError ? (
        <div className="p-4 border border-rose-100 rounded-lg bg-rose-50 text-rose-700 text-sm">
          Failed to load historical audits. Please refresh and try again.
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-border rounded-xl text-center">
          <div className="h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-500 mb-3">
            <Sparkles size={20} />
          </div>
          <h4 className="text-sm font-semibold text-primary">No Audits Found</h4>
          <p className="text-xs text-muted-fg mt-1 max-w-sm">
            You haven't run any AI audits yet. Click the button above to evaluate your profile completeness and get custom recommendations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Historical reviews sidebar */}
          <div className="space-y-3 lg:col-span-1 border-r border-border pr-0 lg:pr-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-fg mb-1">
              Audit History
            </h4>
            <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
              {reviews.map((rev: any) => {
                const isSelected = activeReview?.id === rev.id;
                return (
                  <button
                    key={rev.id}
                    onClick={() => setSelectedReview(rev)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-all ${
                      isSelected
                        ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500"
                        : "bg-surface hover:bg-card border-border"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-muted-fg" />
                        <span className="text-xs font-semibold text-primary">
                          {formatDate(rev.createdAt)}
                        </span>
                      </div>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${getScoreColor(rev.score)}`}>
                        {rev.score}/100
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Review Details */}
          {activeReview && (
            <div className="lg:col-span-2 space-y-6">
              {/* Score breakdown */}
              <div className="flex items-center gap-5 p-5 rounded-xl bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-500/20">
                <div className={`h-16 w-16 shrink-0 rounded-full border-4 flex items-center justify-center font-extrabold text-lg bg-surface ${getScoreColor(activeReview.score)}`}>
                  {activeReview.score}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary">AI ATS compatibility Score</h4>
                  <p className="text-xs text-muted-fg mt-0.5">
                    This score is generated based on your complete skill stack, projects, and work experience relevance. Aim for 80+ for optimal visibility.
                  </p>
                </div>
              </div>

              {/* Strengths */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-fg flex items-center gap-1.5">
                  <CheckCircle2 className="text-emerald-500" size={14} />
                  Key Strengths
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {((activeReview.feedback as any)?.strengths || []).map((strength: string, i: number) => (
                    <li key={i} className="text-xs text-primary p-2.5 rounded-lg border border-border bg-surface flex items-start gap-2">
                      <Zap className="text-amber-500 shrink-0 mt-0.5" size={12} />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Suggestions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-fg flex items-center gap-1.5">
                  <AlertCircle className="text-amber-500" size={14} />
                  Actionable Suggestions
                </h4>
                <div className="space-y-2">
                  {((activeReview.feedback as any)?.suggestions || []).map((suggestion: string, i: number) => (
                    <div key={i} className="text-xs text-primary p-3 rounded-lg border border-border bg-surface flex items-start gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center shrink-0 font-bold text-[10px]">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Keyword gaps */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-fg flex items-center gap-1.5">
                  <Info className="text-indigo-500" size={14} />
                  Missing Skills / Keyword Gaps
                </h4>
                <p className="text-[11px] text-muted-fg">
                  Adding these keywords to your projects or skills list can increase search matches for recruiter queries:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {((activeReview.feedback as any)?.keywordGaps || []).map((keyword: string, i: number) => (
                    <span key={i} className="chip bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded px-2 py-0.5 text-xs font-semibold">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
