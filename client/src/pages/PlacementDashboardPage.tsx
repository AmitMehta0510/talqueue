import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Clock,
  Briefcase,
  Building2,
  Calendar,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  TrendingUp,
  Inbox,
  AlertCircle,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { useMyDriveApplicationsQuery } from "../hooks/usePlatformQueries";
import { PlacementDriveApplicationStatus } from "../lib/api";
import { cleanLogoUrl, formatDate } from "../lib/format";
import { EmptyState } from "../components/ui";

type DashboardTab = "all" | "in_progress" | "offers" | "closed";

const STATUS_CONFIG: Record<
  PlacementDriveApplicationStatus,
  { label: string; bg: string; text: string; icon: React.ElementType }
> = {
  APPLIED: {
    label: "Applied",
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
    icon: AlertCircle,
  },
  SHORTLISTED: {
    label: "Shortlisted",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    icon: CheckCircle2,
  },
  INTERVIEW_R1: {
    label: "Round 1 Interview",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    icon: Clock,
  },
  INTERVIEW_R2: {
    label: "Round 2 Interview",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    icon: Clock,
  },
  INTERVIEW_R3: {
    label: "Round 3 Interview",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    icon: Clock,
  },
  PPO_OFFERED: {
    label: "PPO Offered",
    bg: "bg-indigo-50 border-indigo-200",
    text: "text-indigo-700",
    icon: Trophy,
  },
  SELECTED: {
    label: "Selected 🎉",
    bg: "bg-violet-50 border-violet-200",
    text: "text-violet-700",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Not Selected",
    bg: "bg-rose-50 border-rose-200",
    text: "text-rose-700",
    icon: XCircle,
  },
  WITHDRAWN: {
    label: "Withdrawn",
    bg: "bg-slate-50 border-slate-200",
    text: "text-slate-500",
    icon: XCircle,
  },
};

export function PlacementDashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("all");
  const appsQuery = useMyDriveApplicationsQuery();
  const apps = appsQuery.data || [];

  // Filter application sets
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const s = app.status;
      if (activeTab === "in_progress") {
        return s === "APPLIED" || s === "SHORTLISTED" || s.startsWith("INTERVIEW");
      }
      if (activeTab === "offers") {
        return s === "SELECTED" || s === "PPO_OFFERED";
      }
      if (activeTab === "closed") {
        return s === "REJECTED" || s === "WITHDRAWN";
      }
      return true;
    });
  }, [apps, activeTab]);

  // Aggregate stats
  const stats = useMemo(() => {
    let total = apps.length;
    let inProgress = apps.filter((a) => a.status === "APPLIED" || a.status === "SHORTLISTED" || a.status.startsWith("INTERVIEW")).length;
    let offers = apps.filter((a) => a.status === "SELECTED" || a.status === "PPO_OFFERED").length;
    let successRate = total > 0 ? Math.round(((offers + inProgress) / total) * 100) : 0;

    return { total, inProgress, offers, successRate };
  }, [apps]);

  // Funnel logic helper for students to visualize application steps
  const getFunnelStep = (status: PlacementDriveApplicationStatus) => {
    if (status === "REJECTED" || status === "WITHDRAWN") return -1;
    if (status === "SELECTED" || status === "PPO_OFFERED") return 4;
    if (status.startsWith("INTERVIEW")) return 3;
    if (status === "SHORTLISTED") return 2;
    return 1; // APPLIED
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/jobs"
            className="flex h-10 w-10 items-center justify-center rounded-xl transition shrink-0" style={{ background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Placement Dashboard</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Track your campus placement rounds, check scheduling details, and view corporate offers.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="panel p-5 border rounded-2xl flex items-center gap-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
            <Briefcase size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Applied Drives</span>
            <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stats.total}</span>
          </div>
        </div>

        <div className="panel p-5 border rounded-2xl flex items-center gap-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0">
            <Clock size={22} className="animate-spin duration-3000" style={{ animationDuration: "10s" }} />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>In Progress</span>
            <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stats.inProgress}</span>
          </div>
        </div>

        <div className="panel p-5 border rounded-2xl flex items-center gap-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 shrink-0">
            <Trophy size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Offers Received</span>
            <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stats.offers}</span>
          </div>
        </div>

        <div className="panel p-5 border rounded-2xl flex items-center gap-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Active Ratio</span>
            <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stats.successRate}%</span>
          </div>
        </div>

      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        
        {/* Left Column: Filter and Applications Feed */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Tab Selection */}
          <div className="panel p-1.5 overflow-x-auto rounded-2xl" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
            <nav className="flex space-x-1">
              {(
                [
                  { id: "all", label: "All Drives" },
                  { id: "in_progress", label: "In Progress" },
                  { id: "offers", label: "Offers" },
                  { id: "closed", label: "Closed/Archived" },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition shrink-0 ${
                      isActive
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                        : "hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                    style={!isActive ? { color: "var(--text-secondary)" } : {}}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Applications list */}
          <div className="space-y-4">
            {appsQuery.isLoading ? (
              <div className="panel p-20 flex flex-col items-center justify-center rounded-2xl gap-2" style={{ color: "var(--text-muted)" }}>
                <Loader2 className="animate-spin text-indigo-600" size={32} />
                <span className="text-sm font-semibold">Loading placement pipeline...</span>
              </div>
            ) : filteredApps.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No drives found"
                text={
                  activeTab === "all"
                    ? "You haven't applied to any campus placement drives yet."
                    : `No drives match the filter "${activeTab.replace("_", " ")}".`
                }
              />
            ) : (
              filteredApps.map((app) => {
                const drive = app.drive;
                const company = drive?.company;
                const status = STATUS_CONFIG[app.status] || STATUS_CONFIG.APPLIED;
                const StatusIcon = status.icon;
                const funnelStep = getFunnelStep(app.status);

                return (
                  <article
                    key={app.id}
                    className="panel rounded-2xl overflow-hidden hover:shadow-md transition group"
                  >
                    {/* Header line */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 to-indigo-600" />

                    <div className="p-6 space-y-6">
                      
                      {/* Company Info + Status */}
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex items-start gap-3">
                          {cleanLogoUrl(company?.logoUrl) ? (
                            <img
                              src={cleanLogoUrl(company?.logoUrl)!}
                              alt={company?.name}
                              className="h-11 w-11 rounded-xl border border-slate-100 object-cover shadow-sm shrink-0"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 shrink-0">
                              <Building2 size={20} />
                            </div>
                          )}
                          <div>
                            <h3 className="text-sm font-bold group-hover:text-indigo-600 transition flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                              {drive?.driveTitle}
                              {drive?.isDreamCompany && (
                                <span className="text-[9px] bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                  Dream
                                </span>
                              )}
                            </h3>
                            <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--text-muted)" }}>
                              {company?.name} · {drive?.driveType === "PLACEMENT" ? "Placement Drive" : "Internship Drive"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold self-start sm:self-center shrink-0 ${status.bg} ${status.text}`}
                        >
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </div>

                      {/* Funnel Progress Tracker */}
                      {funnelStep !== -1 ? (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Recruitment Funnel
                          </span>
                          <div className="relative flex items-center justify-between">
                            {/* Connector line */}
                            <div className="absolute left-0 right-0 h-1 -z-10 rounded-full" style={{ background: "var(--bg-surface-2)" }} />
                            <div
                              className="absolute left-0 h-1 bg-indigo-600 -z-10 rounded-full transition-all duration-500"
                              style={{ width: `${((funnelStep - 1) / 3) * 100}%` }}
                            />

                            {[
                              { step: 1, label: "Applied" },
                              { step: 2, label: "Shortlisted" },
                              { step: 3, label: "Interviews" },
                              { step: 4, label: "Selected" },
                            ].map((s) => {
                              const isPassed = funnelStep >= s.step;
                              const isCurrent = funnelStep === s.step;
                              return (
                                <div key={s.step} className="flex flex-col items-center gap-1.5">
                                  <div
                                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition shadow-sm ${
                                      isPassed
                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                        : "border-slate-200 dark:border-slate-600 text-slate-400"
                                    } ${isCurrent ? "ring-4 ring-indigo-100 dark:ring-indigo-900/50" : ""}`}
                                  style={!isPassed ? { background: "var(--bg-surface)" } : {}}
                                  >
                                    {isPassed && funnelStep > s.step ? "✓" : s.step}
                                  </div>
                                  <span
                                    className={`text-[9px] font-bold ${
                                      isCurrent
                                        ? "text-indigo-600 dark:text-indigo-400"
                                        : isPassed
                                        ? ""
                                        : ""
                                    }`}
                                  style={{ color: isCurrent ? undefined : isPassed ? "var(--text-primary)" : "var(--text-muted)" }}
                                  >
                                    {s.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="border rounded-xl p-3 flex items-center gap-2.5 text-xs font-semibold select-none" style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
                          <XCircle size={15} style={{ color: "var(--text-muted)" } as React.CSSProperties} />
                          <span>This recruitment pipeline is completed or withdrawn.</span>
                        </div>
                      )}

                      {/* Drive details */}
                      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                        {drive?.driveDate && (
                          <span className="flex items-center gap-1.5">
                            <Calendar size={13} style={{ color: "var(--text-muted)" } as React.CSSProperties} />
                            Drive Date: {formatDate(drive.driveDate)}
                          </span>
                        )}
                        {(drive?.stipendMin || drive?.salaryMin) && (
                          <span className="flex items-center gap-1.5 font-semibold" style={{ color: "var(--text-secondary)" }}>
                            <IndianRupee size={13} style={{ color: "var(--text-muted)" } as React.CSSProperties} />
                            Compensation:{" "}
                            {drive.driveType === "PLACEMENT"
                              ? `${((drive.salaryMin || 0) / 100000).toFixed(1)} LPA`
                              : `₹${(drive.stipendMin || 0).toLocaleString()}/mo`}
                          </span>
                        )}
                      </div>

                    </div>
                  </article>
                );
              })
            )}
          </div>

        </div>

        {/* Right Column: Placement Policy details & info */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="panel p-5 bg-gradient-to-br from-indigo-950 to-slate-900 border-0 rounded-2xl text-white shadow-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Trophy size={16} /> Placement Policy Guidelines
            </h3>
            <p className="text-xs text-indigo-100/80 leading-relaxed">
              Your institutional Placement Cell enforces strict application policies to ensure fair opportunities for all candidates.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex gap-2">
                <span className="text-indigo-400 font-bold text-xs shrink-0">1.</span>
                <p className="text-xs text-indigo-100/70">
                  <strong className="text-white">Offer Lock:</strong> Upon receiving a selection offer, student applications for other non-dream companies will be locked automatically.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="text-indigo-400 font-bold text-xs shrink-0">2.</span>
                <p className="text-xs text-indigo-100/70">
                  <strong className="text-white">Dream Companies:</strong> Student candidates are eligible to apply to companies flagged as "Dream" even if they hold a standard corporate offer.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="text-indigo-400 font-bold text-xs shrink-0">3.</span>
                <p className="text-xs text-indigo-100/70">
                  <strong className="text-white">Autoverification:</strong> Direct verification using email domains auto-unlocks eligibility checks instantly.
                </p>
              </div>
            </div>
          </div>

          <div className="panel p-5 rounded-2xl space-y-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
              <FileText size={14} className="text-indigo-500" /> Need Assistance?
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              If your academic credentials, year of study, CGPA, or backlog indicators are incorrect, please contact your designated College Admin or TPO coordinator immediately to request updates.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
