import { useMemo } from "react";
import {
  Award,
  TrendingUp,
  History,
  ShieldCheck,
  Star,
  Zap,
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  useMyReputationQuery,
  useMyReputationHistoryQuery,
  useBadgesQuery,
} from "../hooks/usePlatformQueries";
import { EmptyState, InlineLoader, ErrorState } from "../components/ui";
import { formatDate, titleCase, formatCount } from "../lib/format";
import { Badge } from "../lib/api";

export function ReputationPage() {
  const reputationQuery = useMyReputationQuery();
  const historyQuery = useMyReputationHistoryQuery();
  const badgesQuery = useBadgesQuery();

  const myBadgesSet = useMemo(() => {
    const myBadgesList = reputationQuery.data?.badges || [];
    return new Set(myBadgesList.map((b) => b.id));
  }, [reputationQuery.data]);

  const loading =
    reputationQuery.isLoading || historyQuery.isLoading || badgesQuery.isLoading;

  const isError =
    reputationQuery.isError || historyQuery.isError || badgesQuery.isError;

  const errorMsg =
    reputationQuery.error?.message ||
    historyQuery.error?.message ||
    badgesQuery.error?.message;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <InlineLoader label="Loading reputation portfolio..." />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load reputation details"
        text={errorMsg}
        onRetry={() => {
          reputationQuery.refetch();
          historyQuery.refetch();
          badgesQuery.refetch();
        }}
      />
    );
  }

  const reputation = reputationQuery.data;
  const history = historyQuery.data || [];
  const allBadges = badgesQuery.data || [];

  const unlockedCount = reputation?.badges?.length || 0;
  const lockedCount = Math.max(0, allBadges.length - unlockedCount);

  // Rarity color helpers
  const getRarityClass = (rarity?: string | null) => {
    switch (rarity) {
      case "LEGENDARY":
        return "border-amber-400 bg-amber-50/30 text-amber-800 text-amber-500";
      case "EPIC":
        return "border-purple-400 bg-purple-50/30 text-purple-800 text-purple-500";
      case "RARE":
        return "border-blue-400 bg-blue-50/30 text-blue-800 text-blue-500";
      default:
        return "border-slate-200 bg-slate-50/40 text-slate-700 text-slate-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="relative overflow-hidden rounded-xl border border-indigo-700/10 bg-indigo-950 px-6 py-8 text-white shadow-lg">
        {/* Background gradient flares */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-indigo-700/25 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-teal-600/15 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-800 px-3 py-1 text-xxs font-bold uppercase tracking-wider text-indigo-300">
                Score Rank Portfolio
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-bold text-white tracking-tight">Your Engineering Trust Standing</h2>
            <p className="mt-1 text-xs text-indigo-100/70 max-w-xl">
              Reputation points measure code quality, collaboration signals, verification metrics, and contributions across teams.
            </p>
          </div>

          {/* Metric cards container */}
          <div className="grid grid-cols-3 gap-4 shrink-0 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
            <div className="text-center px-2">
              <div className="text-2xl font-black text-indigo-400 flex items-center justify-center gap-1">
                <Zap className="fill-indigo-400/20" size={18} />
                {formatCount(reputation?.reputationScore || 0)}
              </div>
              <div className="text-[10px] uppercase font-bold text-indigo-200/60 mt-1">Reputation</div>
            </div>

            <div className="text-center px-2 border-x border-white/10">
              <div className="text-2xl font-black text-white flex items-center justify-center gap-1">
                <TrendingUp size={18} className="text-indigo-400" />
                {Math.round(reputation?.engineeringScore || 0)}
              </div>
              <div className="text-[10px] uppercase font-bold text-indigo-200/60 mt-1">Eng Score</div>
            </div>

            <div className="text-center px-2">
              <div className="text-2xl font-black text-amber-400 flex items-center justify-center gap-1">
                <ShieldCheck size={18} className="text-amber-400" />
                {titleCase(reputation?.trustLevel || "BEGINNER")}
              </div>
              <div className="text-[10px] uppercase font-bold text-indigo-200/60 mt-1">Trust Level</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        {/* Left Column: Badges Collection Catalog */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Award size={16} className="text-indigo-600 dark:text-indigo-400" />
              Badges Directory ({unlockedCount}/{allBadges.length} Unlocked)
            </h3>
            <span className="text-xxs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {lockedCount} Locked Remaining
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {allBadges.map((badge: Badge) => {
              const isUnlocked = myBadgesSet.has(badge.id);
              const colorInfo = getRarityClass(badge.category);

              return (
                <div
                  key={badge.id}
                  className={`panel relative flex flex-col p-4 border transition duration-150 ${
                    isUnlocked
                      ? "border-indigo-200 dark:border-indigo-700"
                      : "opacity-70"
                  }`}
                >
                  {/* Badge Rarity tag */}
                  <span className={`absolute top-2.5 right-2.5 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[8px] font-bold border uppercase ${colorInfo}`}>
                    {badge.rarity || titleCase(badge.category || "COMMON")}
                  </span>

                  {/* Icon holder */}
                  <div className="mt-2 flex justify-start">
                    <div
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${
                        isUnlocked
                          ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                      style={!isUnlocked ? { background: "var(--bg-surface-2)" } : {}}
                    >
                      {isUnlocked ? <Star size={20} className="fill-indigo-100 dark:fill-indigo-900/50" /> : <Lock size={16} />}
                    </div>
                  </div>

                  <div className="mt-4 flex-1">
                    <h4 className={`text-xs font-bold ${isUnlocked ? "" : ""}`} style={{ color: isUnlocked ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {badge.name}
                    </h4>
                    <p className="mt-1 text-[11px] leading-4" style={{ color: "var(--text-muted)" }}>
                      {badge.description || "Unlocked by completing quality developer tasks."}
                    </p>
                  </div>

                  <div className="mt-3.5 border-t pt-2 flex items-center justify-between text-[10px]" style={{ borderColor: "var(--border)" }}>
                    <span style={{ color: "var(--text-muted)" }}>Award Weight</span>
                    <span className={`font-semibold ${isUnlocked ? "text-indigo-600 dark:text-indigo-400" : ""}`} style={!isUnlocked ? { color: "var(--text-muted)" } : {}}>
                      +{badge.points || 10} pts
                    </span>
                  </div>

                  {isUnlocked && (
                    <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                      <CheckCircle2 size={10} className="stroke-[3px]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Reputation History Timeline Log */}
        <aside className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <History size={16} className="text-indigo-600 dark:text-indigo-400" />
              Points Activity Log
            </h3>
          </div>

          <div className="panel p-5 space-y-4 max-h-[600px] overflow-y-auto">
            {history.length > 0 ? (
              <div className="relative border-l pl-4 ml-1 space-y-5 py-1" style={{ borderColor: "var(--border)" }}>
                {history.map((item) => {
                  const isPositive = (item.points || 0) >= 0;

                  return (
                    <div key={item.id} className="relative group">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[21px] top-1 h-2 w-2 rounded-full border border-white ${
                        isPositive ? "bg-indigo-500" : "bg-rose-500"
                      }`} />

                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-xs leading-4" style={{ color: "var(--text-primary)" }}>
                            {item.reason || titleCase(item.type || "Reputation Award")}
                          </h4>
                          <span className="block text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                            {item.createdAt && formatDate(item.createdAt)}
                          </span>
                        </div>

                        <span className={`text-xs font-extrabold shrink-0 ${
                          isPositive ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"
                        }`}>
                          {isPositive ? "+" : ""}
                          {item.points}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={History}
                title="No activities yet"
                text="Complete tasks, verified code reviews, and project releases to log points history."
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
