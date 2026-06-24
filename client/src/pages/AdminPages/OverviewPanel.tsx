import React, { useState, useMemo } from "react";
import {
  Loader2, Users, UserCheck, FileText, GitBranch, Trophy, Briefcase,
  Hash, Award, GraduationCap, Building2, MessageSquare, Activity, Star,
  ShieldCheck, Layers, Calendar, RefreshCw, AlertCircle, Eye,
} from "lucide-react";
import { ErrorState } from "../../components/ui";
import { KpiCard, DistBar } from "./shared";
import { titleCase } from "../../lib/format";
import { useAdminAnalyticsQuery } from "../../hooks/usePlatformQueries";

// Helper outside component to avoid reference recreation on render
const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
};

interface ChartCardProps {
  title: string;
  icon: React.ComponentType<any>;
  series: any[];
  isRegistrations: boolean;
  colorClass: string;
  hoverColorClass: string;
}

// Memoized ChartCard to prevent redundant re-renders of the bar charts
const ChartCard = React.memo(function ChartCard({
  title,
  icon: Icon,
  series,
  isRegistrations,
  colorClass,
  hoverColorClass,
}: ChartCardProps) {
  // Memoized calculations to prevent recalculation on hovers or re-renders
  const { maxCount, totalSum, yGridValues } = useMemo(() => {
    if (!series || series.length === 0) {
      return { maxCount: 5, totalSum: 0, yGridValues: [5, 3, 1, 0] };
    }
    const maxVal = Math.max(...series.map((d) => d.count), 0);
    const maxCount = maxVal === 0 ? 5 : maxVal;
    const totalSum = series.reduce((sum, d) => sum + d.count, 0);
    const yGridValues = [
      maxCount,
      Math.round((maxCount * 2) / 3),
      Math.round(maxCount / 3),
      0,
    ];
    return { maxCount, totalSum, yGridValues };
  }, [series]);

  if (!series || series.length === 0) {
    return (
      <div className="rounded-xl border p-5 h-64 flex items-center justify-center text-xs italic" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)", color: "var(--text-muted)" }}>
        No telemetry available for this timeframe.
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${
            isRegistrations
              ? "from-indigo-500/20 to-teal-500/20 border border-indigo-600/20"
              : "from-blue-500/20 to-indigo-500/20 border border-blue-600/20"
          }`}>
            <Icon size={13} className={isRegistrations ? "text-indigo-500 dark:text-indigo-400" : "text-blue-500 dark:text-blue-400"} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{title}</h3>
            <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Aggregated counts by day</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-black" style={{ color: "var(--text-primary)" }}>{totalSum.toLocaleString()}</div>
          <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total in range</div>
        </div>
      </div>

      <div className="relative pt-6">
        {/* Y-Axis Gridlines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-[20px]">
          {yGridValues.map((val, idx) => (
            <div key={idx} className="w-full flex items-center gap-2">
              <span className="text-[8px] font-bold w-6 text-right select-none" style={{ color: "var(--text-muted)" }}>{val}</span>
              <div className="flex-1 border-t border-dashed" style={{ borderColor: "var(--border)" }} />
            </div>
          ))}
        </div>

        {/* Chart Bars */}
        <div className="h-40 flex items-end justify-between gap-[3px] pl-8 pr-2 relative z-10 pb-[20px]">
          {series.map((d: any, idx: number) => {
            const barHeight = (d.count / maxCount) * 100;
            return (
              <div key={d.date || idx} className="group relative flex-1 h-full flex items-end">
                <div
                  className={`w-full rounded-t-[2px] transition-all duration-300 ${colorClass} ${hoverColorClass}`}
                  style={{ height: `${Math.max(barHeight, 3)}%` }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-30 pointer-events-none">
                  <div className="rounded-lg border px-2.5 py-1.5 shadow-2xl text-[9px] whitespace-nowrap text-center animate-in fade-in slide-in-from-bottom-1 duration-100" style={{ background: "var(--bg-surface)", borderColor: "var(--border-strong)" }}>
                    <div className="font-extrabold" style={{ color: "var(--text-primary)" }}>
                      {d.count.toLocaleString()} {isRegistrations ? "new users" : "views"}
                    </div>
                    <div className="font-semibold mt-0.5" style={{ color: "var(--text-muted)" }}>{formatDate(d.date)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div className="flex justify-between pl-8 pr-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          <span>{formatDate(series[0]?.date)}</span>
          <span>{formatDate(series[Math.floor(series.length / 2)]?.date)}</span>
          <span>{formatDate(series[series.length - 1]?.date)}</span>
        </div>
      </div>
    </div>
  );
});

function AnalyticsCharts() {
  const [range, setRange] = useState(30);
  const { data, isPending, error, refetch } = useAdminAnalyticsQuery(range);

  // Memoize series data to prevent reference changes
  const formattedData = useMemo(() => {
    if (!data) return null;
    return {
      userRegistrations: data.userRegistrations || [],
      userFootprint: data.userFootprint || [],
    };
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Analytics Header & Range Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t pt-6" style={{ borderColor: "var(--border)" }}>
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Platform Analytics & Growth</h2>
          <p className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--text-muted)" }}>Track registration rates and daily page traffic trends.</p>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <Calendar size={11} style={{ color: "var(--text-muted)" }} />
          <span className="text-[10px] font-bold uppercase tracking-wider mr-1" style={{ color: "var(--text-muted)" }}>Timeframe:</span>
          {([7, 30, 90] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all border
                ${range === r
                  ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-600/20"
                  : "hover:bg-[var(--bg-surface-2)]"
                }`}
              style={range !== r ? { borderColor: "var(--border)", color: "var(--text-muted)" } : {}}
            >
              {r}D
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border p-5 h-64 flex flex-col items-center justify-center gap-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
              <Loader2 className="animate-spin text-indigo-500" size={24} />
              <p className="text-[10px] italic font-semibold" style={{ color: "var(--text-muted)" }}>Aggregating timeline telemetry...</p>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border p-6 flex flex-col items-center justify-center text-center gap-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
          <AlertCircle className="text-rose-500" size={24} />
          <div>
            <p className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Failed to sync timeline telemetry</p>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--text-muted)" }}>Could not fetch server-side user registration or visitor aggregates.</p>
          </div>
          <button
            onClick={() => refetch()}
            className="btn-secondary text-[10px] px-3 py-1.5"
          >
            <RefreshCw size={10} />
            Retry Sync
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Daily New Users"
            icon={Users}
            series={formattedData?.userRegistrations || []}
            isRegistrations={true}
            colorClass="bg-gradient-to-t from-indigo-600/60 to-teal-500/80"
            hoverColorClass="hover:from-indigo-500 hover:to-teal-400"
          />
          <ChartCard
            title="Daily Visitors"
            icon={Eye}
            series={formattedData?.userFootprint || []}
            isRegistrations={false}
            colorClass="bg-gradient-to-t from-blue-600/60 to-indigo-500/80"
            hoverColorClass="hover:from-blue-500 hover:to-indigo-400"
          />
        </div>
      )}
    </div>
  );
}

export function OverviewPanel({
  stats,
  loading,
  error,
  onRetry,
}: {
  stats: any;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
        <p className="text-sm text-zinc-500">Loading platform statistics...</p>
      </div>
    </div>
  );
  if (error) return <ErrorState title="Failed to load stats" text="Unable to aggregate database statistics" onRetry={onRetry} />;
  if (!stats) return null;

  const activeUsers = stats.statusDistribution?.find((s: any) => s.status === "ACTIVE")?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Quick KPI Grid ── */}
      <div>
        <h2 className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Platform Overview</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          <KpiCard label="Total Users" value={stats.userCount} icon={Users} gradient="from-indigo-500 to-teal-600" sub={`+${stats.newUsersToday} today`} />
          <KpiCard label="Active Users" value={activeUsers} icon={UserCheck} gradient="from-blue-500 to-indigo-600" sub={`${stats.newUsersThisWeek} this week`} />
          <KpiCard label="Posts" value={stats.postCount} icon={FileText} gradient="from-violet-500 to-purple-600" />
          <KpiCard label="Projects" value={stats.projectCount} icon={GitBranch} gradient="from-amber-500 to-orange-600" sub={`${stats.openProjectCount} open`} />
          <KpiCard label="Hackathons" value={stats.hackathonCount} icon={Trophy} gradient="from-pink-500 to-rose-600" />
          <KpiCard label="Jobs" value={stats.jobCount} icon={Briefcase} gradient="from-cyan-500 to-blue-600" sub={`${stats.activeJobCount} active`} />
          <KpiCard label="Communities" value={stats.communityCount} icon={Hash} gradient="from-indigo-600 to-green-700" />
          <KpiCard label="Referrals" value={stats.referralCount} icon={Award} gradient="from-yellow-500 to-amber-600" />
        </div>
      </div>

      {/* ── Institutions Row ── */}
      <div>
        <h2 className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Institutions & Engagement</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <KpiCard label="Colleges" value={stats.collegeCount} icon={GraduationCap} gradient="from-indigo-500 to-blue-600" />
          <KpiCard label="Companies" value={stats.companyCount} icon={Building2} gradient="from-purple-500 to-violet-600" />
          <KpiCard label="Connections" value={stats.connectionCount} icon={Users} gradient="from-teal-500 to-indigo-600" />
          <KpiCard label="Messages" value={stats.messageCount} icon={MessageSquare} gradient="from-rose-500 to-pink-600" />
        </div>
      </div>

      {/* ── Visual Analytics Section ── */}
      <AnalyticsCharts />

      {/* ── Distribution Cards ── */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Status Distribution */}
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-teal-500/20 border border-indigo-600/20">
              <Activity size={13} className="text-indigo-500 dark:text-indigo-400" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Account Status</h3>
          </div>
          <div className="space-y-3">
            {stats.statusDistribution?.map((item: any) => (
              <DistBar
                key={item.status}
                label={item.status}
                count={item.count}
                total={stats.userCount}
                color={item.status === "ACTIVE" ? "bg-indigo-500" : item.status === "BANNED" ? "bg-rose-500" : "bg-zinc-500"}
              />
            ))}
          </div>
        </div>

        {/* Trust Level */}
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-600/20">
              <Star size={13} className="text-amber-500 dark:text-amber-400" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Trust Levels</h3>
          </div>
          <div className="space-y-3">
            {stats.trustLevelDistribution?.map((item: any) => (
              <DistBar key={item.trustLevel} label={item.trustLevel} count={item.count} total={stats.userCount} color="bg-amber-500" />
            ))}
          </div>
        </div>

        {/* Platform Roles */}
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-600/20">
              <ShieldCheck size={13} className="text-violet-500 dark:text-violet-400" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Platform Roles</h3>
          </div>
          <div className="space-y-3">
            {stats.platformRoleDistribution?.length > 0 ? (
              stats.platformRoleDistribution.map((item: any) => (
                <DistBar key={item.roleName} label={item.roleName} count={item.count} total={stats.userCount} color="bg-violet-500" />
              ))
            ) : (
              <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>No special roles assigned</p>
            )}
          </div>
        </div>
      </div>

      {/* ── User Role Distribution ── */}
      <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-600/20">
            <Layers size={13} className="text-blue-500 dark:text-blue-400" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>User Role Distribution</h3>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {stats.userRoleDistribution?.map((item: any) => (
            <div key={item.role} className="rounded-lg border px-4 py-3 text-center" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
              <div className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{item.count}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{titleCase(item.role)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
