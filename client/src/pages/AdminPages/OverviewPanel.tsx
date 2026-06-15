import React from "react";
import {
  Loader2, Users, UserCheck, FileText, GitBranch, Trophy, Briefcase,
  Hash, Award, GraduationCap, Building2, MessageSquare, Activity, Star,
  ShieldCheck, Layers,
} from "lucide-react";
import { ErrorState } from "../../components/ui";
import { KpiCard, DistBar } from "./shared";
import { titleCase } from "../../lib/format";

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
        <Loader2 size={32} className="animate-spin text-emerald-500" />
        <p className="text-sm text-zinc-500">Loading platform statistics...</p>
      </div>
    </div>
  );
  if (error) return <ErrorState title="Failed to load stats" text="Unable to aggregate database statistics" onRetry={onRetry} />;
  if (!stats) return null;

  const activeUsers = stats.statusDistribution?.find((s: any) => s.status === "ACTIVE")?.count ?? 0;
  const bannedUsers = stats.statusDistribution?.find((s: any) => s.status === "BANNED")?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Quick KPI Grid ── */}
      <div>
        <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-zinc-500">Platform Overview</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          <KpiCard label="Total Users" value={stats.userCount} icon={Users} gradient="from-emerald-500 to-teal-600" sub={`+${stats.newUsersToday} today`} />
          <KpiCard label="Active Users" value={activeUsers} icon={UserCheck} gradient="from-blue-500 to-indigo-600" sub={`${stats.newUsersThisWeek} this week`} />
          <KpiCard label="Posts" value={stats.postCount} icon={FileText} gradient="from-violet-500 to-purple-600" />
          <KpiCard label="Projects" value={stats.projectCount} icon={GitBranch} gradient="from-amber-500 to-orange-600" sub={`${stats.openProjectCount} open`} />
          <KpiCard label="Hackathons" value={stats.hackathonCount} icon={Trophy} gradient="from-pink-500 to-rose-600" />
          <KpiCard label="Jobs" value={stats.jobCount} icon={Briefcase} gradient="from-cyan-500 to-blue-600" sub={`${stats.activeJobCount} active`} />
          <KpiCard label="Communities" value={stats.communityCount} icon={Hash} gradient="from-emerald-600 to-green-700" />
          <KpiCard label="Referrals" value={stats.referralCount} icon={Award} gradient="from-yellow-500 to-amber-600" />
        </div>
      </div>

      {/* ── Institutions Row ── */}
      <div>
        <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-zinc-500">Institutions & Engagement</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <KpiCard label="Colleges" value={stats.collegeCount} icon={GraduationCap} gradient="from-indigo-500 to-blue-600" />
          <KpiCard label="Companies" value={stats.companyCount} icon={Building2} gradient="from-purple-500 to-violet-600" />
          <KpiCard label="Connections" value={stats.connectionCount} icon={Users} gradient="from-teal-500 to-emerald-600" />
          <KpiCard label="Messages" value={stats.messageCount} icon={MessageSquare} gradient="from-rose-500 to-pink-600" />
        </div>
      </div>

      {/* ── Distribution Cards ── */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Status Distribution */}
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-600/20">
              <Activity size={13} className="text-emerald-400" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">Account Status</h3>
          </div>
          <div className="space-y-3">
            {stats.statusDistribution?.map((item: any) => (
              <DistBar
                key={item.status}
                label={item.status}
                count={item.count}
                total={stats.userCount}
                color={item.status === "ACTIVE" ? "bg-emerald-500" : item.status === "BANNED" ? "bg-rose-500" : "bg-zinc-500"}
              />
            ))}
          </div>
        </div>

        {/* Trust Level */}
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-600/20">
              <Star size={13} className="text-amber-400" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">Trust Levels</h3>
          </div>
          <div className="space-y-3">
            {stats.trustLevelDistribution?.map((item: any) => (
              <DistBar key={item.trustLevel} label={item.trustLevel} count={item.count} total={stats.userCount} color="bg-amber-500" />
            ))}
          </div>
        </div>

        {/* Platform Roles */}
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-600/20">
              <ShieldCheck size={13} className="text-violet-400" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">Platform Roles</h3>
          </div>
          <div className="space-y-3">
            {stats.platformRoleDistribution?.length > 0 ? (
              stats.platformRoleDistribution.map((item: any) => (
                <DistBar key={item.roleName} label={item.roleName} count={item.count} total={stats.userCount} color="bg-violet-500" />
              ))
            ) : (
              <p className="text-xs text-zinc-600 italic">No special roles assigned</p>
            )}
          </div>
        </div>
      </div>

      {/* ── User Role Distribution ── */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-600/20">
            <Layers size={13} className="text-blue-400" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">User Role Distribution</h3>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {stats.userRoleDistribution?.map((item: any) => (
            <div key={item.role} className="rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-4 py-3 text-center">
              <div className="text-xl font-black text-white">{item.count}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{titleCase(item.role)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
