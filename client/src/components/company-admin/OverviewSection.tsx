import { TrendingUp, Users, MapPin, Shield, Briefcase, Sparkles } from "lucide-react";
import { Avatar } from "../ui";
import { userName } from "../../core/utils/format";
import { User } from "../../core/types/models";

interface PipelineStatusCount {
  status: string;
  count: number;
}

interface RecentJob {
  id: string;
  title: string;
  location?: string | null;
  type: string;
  _count?: { applications?: number } | null;
}

interface RecentApplicant {
  id: string;
  status: string;
  job?: { title: string } | null;
  applicant?: User | null;
}

interface CompanyAdminStats {
  jobsCount: number;
  applicantsCount: number;
  officeManagersCount: number;
  recruitersCount: number;
  pipeline: PipelineStatusCount[];
  recentJobs: RecentJob[];
  recentApplicants: RecentApplicant[];
}

interface OverviewSectionProps {
  stats: CompanyAdminStats;
}

export function OverviewSection({ stats }: OverviewSectionProps) {
  const pipelineCounts = stats.pipeline || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Job Postings", value: stats.jobsCount, icon: Briefcase, color: "from-blue-500/20 to-indigo-500/20 text-blue-400" },
          { label: "Pipeline Applicants", value: stats.applicantsCount, icon: Users, color: "from-purple-500/20 to-violet-500/20 text-purple-400" },
          { label: "Office Scopes", value: stats.officeManagersCount, icon: MapPin, color: "from-amber-500/20 to-orange-500/20 text-amber-400" },
          { label: "Recruiter Seats", value: stats.recruitersCount, icon: Shield, color: "from-indigo-500/20 to-teal-500/20 text-indigo-400" }
        ].map((m, idx) => (
          <div key={idx} className="relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:border-[var(--border-strong)]" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
            <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${m.color}`}>
              <m.icon size={16} />
            </div>
            <div className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{m.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: "var(--text-muted)" }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Funnel Visualizer */}
      <div className="rounded-xl border p-5 space-y-6" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
              <Sparkles size={14} className="text-indigo-500" />
              Recruitment Pipeline Funnel
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>Visual stage-by-stage conversion analysis of current job applications.</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-rose-500/5 border border-rose-500/10 px-3 py-1.5 text-xs text-rose-500 dark:text-rose-400">
            <span className="font-black">{pipelineCounts.find((p) => p.status === "REJECTED")?.count || 0}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>Rejected / Drop-offs</span>
          </div>
        </div>

        {/* Funnel Stepper Flow */}
        <div className="grid gap-4 md:grid-cols-5">
          {(() => {
            const funnelOrder = ["APPLIED", "VIEWED", "SHORTLISTED", "INTERVIEW", "HIRED"];
            return funnelOrder.map((status, index) => {
              const count = pipelineCounts.find((p) => p.status === status)?.count || 0;
              const prevStatus = index > 0 ? funnelOrder[index - 1] : null;
              const prevCount = prevStatus ? (pipelineCounts.find((p) => p.status === prevStatus)?.count || 0) : 0;
              
              const totalApplied = pipelineCounts.find((p) => p.status === "APPLIED")?.count || 0;
              const pctOfTotal = totalApplied > 0 ? Math.round((count / totalApplied) * 100) : 0;
              const stepConversion = prevCount > 0 ? Math.round((count / prevCount) * 100) : 100;

              return (
                <div key={status} className="relative flex flex-col justify-between rounded-xl border p-4 transition hover:border-[var(--border-strong)]" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${
                        status === "HIRED" ? "text-indigo-500 dark:text-indigo-400" :
                        status === "INTERVIEW" ? "text-amber-500 dark:text-amber-400" :
                        status === "SHORTLISTED" ? "text-indigo-500 dark:text-indigo-400" : ""
                      }`}
                      style={["HIRED","INTERVIEW","SHORTLISTED"].includes(status) ? {} : { color: "var(--text-muted)" }}>
                        Stage {index + 1}: {status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1.5">
                      <span className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{count}</span>
                      <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>candidates</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          status === "HIRED" ? "bg-gradient-to-r from-indigo-500 to-teal-400" :
                          status === "INTERVIEW" ? "bg-amber-500" :
                          status === "SHORTLISTED" ? "bg-indigo-500" : "bg-[var(--text-muted)]"
                        }`}
                        style={{ width: `${pctOfTotal}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-bold" style={{ color: "var(--text-muted)" }}>
                      <span>{pctOfTotal}% of total</span>
                      {index > 0 && (
                        <span className="text-indigo-500">
                          ↑ {stepConversion}% conv.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Jobs */}
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Recent Postings</h3>
          {stats.recentJobs?.length === 0 ? (
            <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>No jobs posted yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.recentJobs?.map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{job.title}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{job.location || "Remote"} • {job.type}</div>
                  </div>
                  <span className="chip">
                    {job._count?.applications} applicants
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Applicants */}
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Recent Applications</h3>
          {stats.recentApplicants?.length === 0 ? (
            <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>No applications received yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.recentApplicants?.map((app) => {
                const u = app.applicant;
                const label = userName(u);
                return (
                  <div key={app.id} className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                    <div className="flex items-center gap-2">
                      <Avatar user={u} size="sm" />
                      <div>
                        <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{label}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Applied for {app.job?.title}</div>
                      </div>
                    </div>
                    <span className="chip text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20">
                      {app.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
