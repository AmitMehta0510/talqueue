import { useState, useMemo, FormEvent, useEffect, lazy, Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Building2, Users, Briefcase, Shield, ShieldCheck, Plus, Trash2, MapPin, Loader2,
  TrendingUp, ArrowLeft, RefreshCw, Sparkles, UserPlus, CheckCircle2, ChevronRight, X, Settings
} from "lucide-react";
import { useAuth } from "../core/contexts/AuthContext";
import { useToast } from "../core/contexts/ToastContext";
import { api } from "../lib/api";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Avatar, PageLoader } from "../components/ui";
import { userName } from "../core/utils/format";
import { UserSearchAutocomplete } from "./AdminPages/shared";
const KanbanPipeline = lazy(() => import("../components/recruiter/KanbanPipeline").then(m => ({ default: m.KanbanPipeline })));
import { useFileUpload } from "../features/storage/hooks/useFileUpload";
import {
  useCompanyQuery,
  useCompanyJobsQuery,
  useCompanyAdminStatsQuery,
  useCompanyAdminsForDashboardQuery,
  useCompanyRecruitersQuery,
  useAssignCompanyAdminFromDashboardMutation,
  useRemoveCompanyAdminFromDashboardMutation,
  useAssignCompanyRecruiterMutation,
  useRemoveCompanyRecruiterMutation,
  useUpdateCompanyMutation
} from "../hooks/usePlatformQueries";

type Tab = "overview" | "managers" | "recruiters" | "jobs" | "offices" | "departments" | "settings";

export function CompanyAdminPage() {
  const { companySlug } = useParams<{ companySlug: string }>();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [jobPage, setJobPage] = useState(1);
  const [managedJobId, setManagedJobId] = useState<string | null>(null);

  const companyQuery = useCompanyQuery(companySlug);
  const company = companyQuery.data;
  const companyId = company?.id;

  const { upload: uploadLogo, uploading: uploadingLogo } = useFileUpload();
  const { upload: uploadCover, uploading: uploadingCover } = useFileUpload();
  const updateCompanyMutation = useUpdateCompanyMutation();

  const [settingsForm, setSettingsForm] = useState({
    name: "", tagline: "", description: "", headquarters: "", industry: "",
    websiteUrl: "", careersPageUrl: "", logoUrl: "", coverImageUrl: "", githubUrl: "",
    foundedYear: "", type: "" as "" | any, size: "" as "" | any,
    hiringEnabled: true, referralEnabled: true,
  });

  const [hasInitializedSettings, setHasInitializedSettings] = useState(false);
  useEffect(() => {
    if (company && !hasInitializedSettings) {
      setSettingsForm({
        name: company.name || "",
        tagline: company.tagline || "",
        description: company.description || "",
        headquarters: company.headquarters || "",
        industry: company.industry || "",
        websiteUrl: company.websiteUrl || "",
        careersPageUrl: company.careersPageUrl || "",
        logoUrl: company.logoUrl || "",
        coverImageUrl: company.coverImageUrl || "",
        githubUrl: company.githubUrl || "",
        foundedYear: company.foundedYear ? String(company.foundedYear) : "",
        type: company.type || "",
        size: company.size || "",
        hiringEnabled: company.hiringEnabled !== false,
        referralEnabled: company.referralEnabled !== false,
      });
      setHasInitializedSettings(true);
    }
  }, [company, hasInitializedSettings]);

  const updateSetting = (key: string, value: any) => {
    setSettingsForm((p) => ({ ...p, [key]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadLogo(file, "avatar");
      updateSetting("logoUrl", res.fileUrl);
    } catch {}
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadCover(file, "avatar");
      updateSetting("coverImageUrl", res.fileUrl);
    } catch {}
  };

  const handleSettingsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    try {
      await updateCompanyMutation.mutateAsync({
        companyId,
        payload: {
          name: settingsForm.name,
          tagline: settingsForm.tagline || undefined,
          description: settingsForm.description || undefined,
          headquarters: settingsForm.headquarters || undefined,
          industry: settingsForm.industry || undefined,
          websiteUrl: settingsForm.websiteUrl || undefined,
          careersPageUrl: settingsForm.careersPageUrl || undefined,
          logoUrl: settingsForm.logoUrl || undefined,
          coverImageUrl: settingsForm.coverImageUrl || undefined,
          githubUrl: settingsForm.githubUrl || undefined,
          foundedYear: settingsForm.foundedYear ? Number(settingsForm.foundedYear) : undefined,
          type: settingsForm.type || undefined,
          size: settingsForm.size || undefined,
          hiringEnabled: settingsForm.hiringEnabled,
          referralEnabled: settingsForm.referralEnabled,
        }
      });
    } catch {}
  };

  // Queries
  const statsQuery = useCompanyAdminStatsQuery(companyId || "");
  const adminsQuery = useCompanyAdminsForDashboardQuery(companyId || "");
  const recruitersQuery = useCompanyRecruitersQuery(companyId || "");
  const companyJobsQuery = useCompanyJobsQuery(companyId, jobPage, 10);

  // Mutations
  const assignAdmin = useAssignCompanyAdminFromDashboardMutation();
  const removeAdmin = useRemoveCompanyAdminFromDashboardMutation();
  const assignRecruiter = useAssignCompanyRecruiterMutation();
  const removeRecruiter = useRemoveCompanyRecruiterMutation();

  // Dialog State
  const [confirmAction, setConfirmAction] = useState<{
    type: "assign_manager" | "revoke_manager" | "assign_recruiter" | "revoke_recruiter";
    userId: string;
    label: string;
    officeCity?: string;
    recruiterTitle?: string;
  } | null>(null);

  // Form inputs inside tabs
  const [targetUserId, setTargetUserId] = useState("");
  const [targetUserLabel, setTargetUserLabel] = useState("");
  const [officeCity, setOfficeCity] = useState("");
  const [recruiterTitle, setRecruiterTitle] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Office form states
  const [officeName, setOfficeName] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [officeCityInput, setOfficeCityInput] = useState("");
  const [officeManagerId, setOfficeManagerId] = useState("");
  const [submittingOffice, setSubmittingOffice] = useState(false);

  // Department form states
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [submittingDept, setSubmittingDept] = useState(false);


  const stats = statsQuery.data;
  const admins = adminsQuery.data || [];
  const recruiters = recruitersQuery.data || [];

  const globalAdmins = admins.filter((a: any) => !a.officeCity);
  const officeManagers = admins.filter((a: any) => a.officeCity);

  const isGlobalAdmin = useMemo(() => {
    if (!currentUser || !companyId) return false;
    const adminship = currentUser.companyAdminships?.find(
      (a: any) => a.companyId === companyId
    );
    return !!adminship && (adminship.officeCity === null || adminship.officeCity === undefined);
  }, [currentUser, companyId]);

  const tabs = useMemo(() => {
    const list = [
      { id: "overview" as Tab, label: "Stats & Funnel", icon: TrendingUp },
      { id: "managers" as Tab, label: "Office Managers", icon: Shield },
      { id: "recruiters" as Tab, label: "Recruiter Seats", icon: Users },
      { id: "jobs" as Tab, label: "Job Postings", icon: Briefcase },
    ];
    if (isGlobalAdmin) {
      list.push(
        { id: "offices" as Tab, label: "Manage Offices", icon: MapPin },
        { id: "departments" as Tab, label: "Departments", icon: Building2 },
        { id: "settings" as Tab, label: "Profile Settings", icon: Settings }
      );
    }
    return list;
  }, [isGlobalAdmin]);


  const isPending =
    assignAdmin.isPending ||
    removeAdmin.isPending ||
    assignRecruiter.isPending ||
    removeRecruiter.isPending ||
    updateCompanyMutation.isPending;

  const handleConfirmAction = async () => {
    if (!confirmAction || !companyId) return;

    try {
      if (confirmAction.type === "assign_manager") {
        await assignAdmin.mutateAsync({
          companyId,
          userId: confirmAction.userId,
          officeCity: confirmAction.officeCity || undefined
        });
      } else if (confirmAction.type === "revoke_manager") {
        await removeAdmin.mutateAsync({
          companyId,
          userId: confirmAction.userId,
          officeCity: confirmAction.officeCity || undefined
        });
      } else if (confirmAction.type === "assign_recruiter") {
        await assignRecruiter.mutateAsync({
          companyId,
          userId: confirmAction.userId,
          title: confirmAction.recruiterTitle || undefined
        });
      } else if (confirmAction.type === "revoke_recruiter") {
        await removeRecruiter.mutateAsync({
          companyId,
          userId: confirmAction.userId
        });
      }
      // Refetch stats and panels
      statsQuery.refetch();
    } catch { /* shows query error toast */ }
    finally {
      setConfirmAction(null);
    }
  };

  const handleAddManagerSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim() || !companyId) return;

    setConfirmAction({
      type: "assign_manager",
      userId: targetUserId.trim(),
      label: targetUserLabel || targetUserId.trim(),
      officeCity: officeCity.trim() || undefined
    });

    // Reset inputs
    setTargetUserId("");
    setTargetUserLabel("");
    setOfficeCity("");
    setShowAddForm(false);
  };

  const handleAddRecruiterSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim() || !companyId) return;

    setConfirmAction({
      type: "assign_recruiter",
      userId: targetUserId.trim(),
      label: targetUserLabel || targetUserId.trim(),
      recruiterTitle: recruiterTitle.trim() || undefined
    });

    // Reset inputs
    setTargetUserId("");
    setTargetUserLabel("");
    setRecruiterTitle("");
    setShowAddForm(false);
  };

  const loading =
    companyQuery.isFetching ||
    statsQuery.isFetching ||
    adminsQuery.isFetching ||
    recruitersQuery.isFetching ||
    companyJobsQuery.isFetching;

  if (companyQuery.isLoading || (companyId && statsQuery.isLoading)) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3" style={{ color: "var(--text-muted)" }}>
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <p className="text-sm font-semibold">Loading Admin Dashboard...</p>
      </div>
    );
  }

  if (companyQuery.isError || !company || statsQuery.isError || !stats) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border p-6 text-center mt-20" style={{ borderColor: "var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)" }}>
        <Shield size={36} className="mx-auto text-rose-500 mb-3" />
        <h3 className="font-bold text-lg">Access Denied / Load Failed</h3>
        <p className="text-sm mt-2 mb-4" style={{ color: "var(--text-muted)" }}>
          You must be a Global Administrator of the company to view this dashboard, or the server failed to respond.
        </p>
        <Link to="/companies" className="inline-flex items-center gap-1 text-xs font-bold hover:underline" style={{ color: "var(--brand)" }}>
          <ArrowLeft size={12} /> Back to Companies
        </Link>
      </div>
    );
  }

  // Render Visual Pipeline Funnel
  const pipelineStatuses = ["APPLIED", "VIEWED", "SHORTLISTED", "INTERVIEW", "REJECTED", "HIRED"];
  const pipelineCounts = stats.pipeline || [];

  return (
    <div className="min-h-screen px-4 py-6" style={{ color: "var(--text-primary)" }}>
      <div className="mx-auto max-w-screen-xl space-y-6">

        {/* ── Navigation back ── */}
        <Link
          to={`/companies/${company.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold transition hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={12} /> Back to {company.name} profile
        </Link>

        {/* ── Console Header ── */}
        <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-4">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="h-12 w-12 rounded-xl object-contain border p-1" style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)" }} />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-600/30">
                <Building2 size={20} className="text-indigo-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-black tracking-tight flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                {company.name} Admin Portal
                <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400 dark:text-indigo-300">
                  <ShieldCheck size={10} /> Global Scope
                </span>
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Configure access permissions and audit recruitment pipeline statistics.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                companyQuery.refetch();
                statsQuery.refetch();
                adminsQuery.refetch();
                recruitersQuery.refetch();
                companyJobsQuery.refetch();
              }}
              className="btn-secondary text-xs"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Sync Data
            </button>
          </div>
        </div>

        {/* ── Layout Panels ── */}
        <div className="flex flex-col gap-6 md:flex-row">
          
          {/* ── Sidebar Nav ── */}
          <div className="w-full shrink-0 md:w-48">
            <nav className="flex flex-row overflow-x-auto gap-1 border-b pb-2 md:flex-col md:border-none md:pb-0 md:space-y-1" style={{ borderColor: "var(--border)" }}>
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setActiveTab(id); setShowAddForm(false); setManagedJobId(null); }}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap md:whitespace-normal
                    ${activeTab === id
                      ? "bg-indigo-600/10 text-indigo-600 border border-indigo-600/20 dark:text-indigo-400"
                      : "border border-transparent hover:bg-[var(--bg-surface-2)]"
                    }`}
                  style={activeTab !== id ? { color: "var(--text-muted)" } : {}}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Main View Panel ── */}
          <div className="flex-1 min-w-0">

            {/* ── VIEW: OVERVIEW/FUNNEL ── */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                
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
                      <span className="font-black">{pipelineCounts.find((p: any) => p.status === "REJECTED")?.count || 0}</span>
                      <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>Rejected / Drop-offs</span>
                    </div>
                  </div>

                  {/* Funnel Stepper Flow */}
                  <div className="grid gap-4 md:grid-cols-5">
                    {(() => {
                      const funnelOrder = ["APPLIED", "VIEWED", "SHORTLISTED", "INTERVIEW", "HIRED"];
                      return funnelOrder.map((status, index) => {
                        const count = pipelineCounts.find((p: any) => p.status === status)?.count || 0;
                        const prevStatus = index > 0 ? funnelOrder[index - 1] : null;
                        const prevCount = prevStatus ? (pipelineCounts.find((p: any) => p.status === prevStatus)?.count || 0) : 0;
                        
                        // Calculate percentage of total applied
                        const totalApplied = pipelineCounts.find((p: any) => p.status === "APPLIED")?.count || 0;
                        const pctOfTotal = totalApplied > 0 ? Math.round((count / totalApplied) * 100) : 0;

                        // Calculate conversion from previous stage
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
                              {/* Progress bar */}
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
                        {stats.recentJobs?.map((job: any) => (
                          <div key={job.id} className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                            <div>
                              <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{job.title}</div>
                              <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{job.location || "Remote"} · {job.type}</div>
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
                        {stats.recentApplicants?.map((app: any) => {
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
            )}

            {/* ── VIEW: OFFICE MANAGERS ── */}
            {activeTab === "managers" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Office Scope managers</h2>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    <Plus size={12} /> Assign Manager
                  </button>
                </div>

                {showAddForm && (
                  <form onSubmit={handleAddManagerSubmit} className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--border-strong)", background: "var(--bg-surface)" }}>
                    <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                      <UserPlus size={13} className="text-indigo-500" />
                      Add Office Manager
                    </div>

                    <UserSearchAutocomplete
                      value={targetUserId}
                      onChange={(userId, label) => {
                        setTargetUserId(userId);
                        setTargetUserLabel(label);
                      }}
                      placeholder="Search users on platform..."
                    />

                    <input
                      className="field"
                      value={officeCity}
                      onChange={(e) => setOfficeCity(e.target.value)}
                      placeholder="Office City Scope (e.g. Bangalore, London) *"
                      required
                    />

                    <div className="flex gap-2">
                      <button className="btn-primary text-xs px-4 py-2" type="submit">
                        Assign Manager
                      </button>
                      <button type="button" className="btn-secondary text-xs px-4 py-2" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-4">
                  {/* Global Admins read-only preview */}
                  {globalAdmins.length > 0 && (
                    <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                      <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                        <ShieldCheck size={11} />
                        Global Admins ({globalAdmins.length})
                      </div>
                      {globalAdmins.map((admin: any) => {
                        const u = admin.user;
                        const label = userName(u);
                        return (
                          <div key={admin.id} className="flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0" style={{ borderColor: "var(--border)" }}>
                            <div className="flex items-center gap-2">
                              <Avatar user={u} size="sm" />
                              <div>
                                <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{label}</div>
                                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>@{u.username}</div>
                              </div>
                            </div>
                            <span className="chip text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20 text-[9px] font-bold uppercase tracking-wider">
                              Global Privileges
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Scoped Managers */}
                  <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Office Scope Managers ({officeManagers.length})</h3>
                    {officeManagers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center border border-dashed rounded-xl p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg mb-3" style={{ background: "var(--bg-surface-3)", color: "var(--text-muted)" }}>
                          <MapPin size={18} />
                        </div>
                        <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>No Office-Scoped Managers</h4>
                        <p className="text-[11px] max-w-xs mt-1.5 mb-4" style={{ color: "var(--text-muted)" }}>
                          Assign managers to specific office locations (e.g. Bangalore, London) to distribute moderation and recruiter invitation privileges.
                        </p>
                        <button
                          onClick={() => setShowAddForm(true)}
                          className="btn-secondary text-xs px-3 py-1.5"
                        >
                          Assign First Manager
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {officeManagers.map((admin: any) => {
                          const u = admin.user;
                          const label = userName(u);
                          return (
                            <div key={admin.id} className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                              <div className="flex items-center gap-2.5">
                                <Avatar user={u} size="sm" />
                                <div>
                                  <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{label}</div>
                                  <div className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                                    <span>@{u.username}</span>
                                    <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1 py-0.5 text-[8px] font-bold text-amber-600 dark:text-amber-400">
                                      📍 {admin.officeCity}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => setConfirmAction({
                                  type: "revoke_manager",
                                  userId: u.id,
                                  label,
                                  officeCity: admin.officeCity
                                })}
                                className="rounded p-1.5 transition hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
                                style={{ color: "var(--text-muted)" }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── VIEW: RECRUITERS ── */}
            {activeTab === "recruiters" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Recruiter Seats</h2>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    <Plus size={12} /> Add Recruiter
                  </button>
                </div>

                {showAddForm && (
                  <form onSubmit={handleAddRecruiterSubmit} className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--border-strong)", background: "var(--bg-surface)" }}>
                    <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                      <UserPlus size={13} className="text-indigo-500" />
                      Add Recruiter Seat
                    </div>

                    <UserSearchAutocomplete
                      value={targetUserId}
                      onChange={(userId, label) => {
                        setTargetUserId(userId);
                        setTargetUserLabel(label);
                      }}
                      placeholder="Search users on platform..."
                    />

                    <input
                      className="field"
                      value={recruiterTitle}
                      onChange={(e) => setRecruiterTitle(e.target.value)}
                      placeholder="Job Title (e.g. Technical Recruiter, Talent Acquisition) *"
                      required
                    />

                    <div className="flex gap-2">
                      <button className="btn-primary text-xs px-4 py-2" type="submit">
                        Assign Seat
                      </button>
                      <button type="button" className="btn-secondary text-xs px-4 py-2" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Assigned Seats ({recruiters.length})</h3>
                  {recruiters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center border border-dashed rounded-xl p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg mb-3" style={{ background: "var(--bg-surface-3)", color: "var(--text-muted)" }}>
                        <Users size={18} />
                      </div>
                      <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>No Recruiters Assigned</h4>
                      <p className="text-[11px] max-w-xs mt-1.5 mb-4" style={{ color: "var(--text-muted)" }}>
                        Add recruiter seats to allocate licenses for members of your talent acquisition team so they can post jobs and view candidate profiles.
                      </p>
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        Add First Recruiter
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {recruiters.map((rec: any) => {
                        const u = rec.user;
                        const label = userName(u);
                        return (
                          <div key={rec.id} className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                            <div className="flex items-center gap-2.5">
                              <Avatar user={u} size="sm" />
                              <div>
                                <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{label}</div>
                                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{rec.title || "Recruiter"} · @{u.username}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => setConfirmAction({
                                type: "revoke_recruiter",
                                userId: u.id,
                                label
                              })}
                              className="rounded p-1.5 transition hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
                              style={{ color: "var(--text-muted)" }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── VIEW: JOBS DIRECTORY ── */}
            {activeTab === "jobs" && (
              managedJobId ? (
                <div className="space-y-4 rounded-xl border p-5" style={{ borderColor: "var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)" }}>
                  <Suspense fallback={<PageLoader />}>
                    <KanbanPipeline jobId={managedJobId} onBack={() => setManagedJobId(null)} />
                  </Suspense>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Jobs Postings</h2>
                    <Link
                      to="/jobs"
                      className="btn-primary text-xs px-3 py-1.5"
                    >
                      Open Jobs Portal
                    </Link>
                  </div>

                  <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>All Company Job Postings</h3>
                    {companyJobsQuery.isLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-indigo-500" size={20} />
                      </div>
                    ) : !companyJobsQuery.data || companyJobsQuery.data.jobs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center border border-dashed rounded-xl p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg mb-3" style={{ background: "var(--bg-surface-3)", color: "var(--text-muted)" }}>
                          <Briefcase size={18} />
                        </div>
                        <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>No Job Postings Found</h4>
                        <p className="text-[11px] max-w-xs mt-1.5 mb-4" style={{ color: "var(--text-muted)" }}>
                          Once recruiters from your company post open roles, they will appear here along with live candidate counts.
                        </p>
                        <Link
                          to="/jobs"
                          className="btn-secondary text-xs px-3 py-1.5"
                        >
                          Go to Jobs Hub
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {companyJobsQuery.data.jobs.map((job: any) => (
                            <div key={job.id} className="flex items-center justify-between rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                              <div>
                                <div className="text-xs font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                                  {job.title}
                                  <span className="chip text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20 text-[8px] font-bold">
                                    {job.status || "OPEN"}
                                  </span>
                                </div>
                                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                                  {job.location || "Remote"} · {job.type} · Posted {new Date(job.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              
                              <button
                                onClick={() => setManagedJobId(job.id)}
                                className="text-xs font-semibold hover:underline flex items-center gap-0.5"
                                style={{ color: "var(--brand)" }}
                              >
                                Manage <ChevronRight size={12} />
                              </button>
                            </div>
                          ))}
                        </div>

                        {companyJobsQuery.data.totalPages > 1 && (
                          <div className="flex items-center justify-between border-t pt-4 mt-4 text-xs" style={{ borderColor: "var(--border)" }}>
                            <div style={{ color: "var(--text-muted)" }}>
                              Showing page <span className="font-bold" style={{ color: "var(--text-secondary)" }}>{jobPage}</span> of{" "}
                              <span className="font-bold" style={{ color: "var(--text-secondary)" }}>{companyJobsQuery.data.totalPages}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setJobPage((p) => Math.max(1, p - 1))}
                                disabled={jobPage === 1}
                                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 disabled:pointer-events-none"
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => setJobPage((p) => Math.min(companyJobsQuery.data.totalPages, p + 1))}
                                disabled={jobPage === companyJobsQuery.data.totalPages}
                                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 disabled:pointer-events-none"
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
              )
            )}

            {/* ── VIEW: MANAGE OFFICES ── */}
            {activeTab === "offices" && isGlobalAdmin && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Manage Office Locations</h2>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    <Plus size={12} /> Add Office
                  </button>
                </div>

                {showAddForm && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!officeName.trim() || !officeCityInput.trim() || !companyId) return;
                      setSubmittingOffice(true);
                      try {
                        await api.createCompanyOffice(companyId, {
                          name: officeName,
                          address: officeAddress || undefined,
                          city: officeCityInput,
                          managerId: officeManagerId || null,
                        });
                        setOfficeName("");
                        setOfficeAddress("");
                        setOfficeCityInput("");
                        setOfficeManagerId("");
                        setShowAddForm(false);
                        companyQuery.refetch();
                        statsQuery.refetch();
                        showToast("success", "Office location created successfully!");
                      } catch (err: any) {
                        showToast("error", err?.message || "Failed to create office location");
                      } finally {
                        setSubmittingOffice(false);
                      }
                    }}
                    className="rounded-xl border p-5 space-y-4 max-w-lg" style={{ borderColor: "var(--border-strong)", background: "var(--bg-surface)" }}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                      <MapPin size={13} className="text-indigo-500" />
                      Add New Office Location
                    </div>

                    <div className="space-y-3">
                      <input
                        className="field"
                        placeholder="Office Name (e.g. Headquarters, Engineering Hub) *"
                        value={officeName}
                        onChange={(e) => setOfficeName(e.target.value)}
                        required
                      />

                      <input
                        className="field"
                        placeholder="City (e.g. Bangalore, San Francisco) *"
                        value={officeCityInput}
                        onChange={(e) => setOfficeCityInput(e.target.value)}
                        required
                      />

                      <input
                        className="field"
                        placeholder="Address (optional)"
                        value={officeAddress}
                        onChange={(e) => setOfficeAddress(e.target.value)}
                      />

                      <select
                        className="field"
                        value={officeManagerId}
                        onChange={(e) => setOfficeManagerId(e.target.value)}
                      >
                        <option value="">-- Assign Manager (Optional) --</option>
                        {admins.map((adm: any) => (
                          <option key={adm.user?.id} value={adm.user?.id}>
                            {adm.user?.profile?.fullName || adm.user?.username} ({adm.officeCity || "Global"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={submittingOffice}
                        className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                      >
                        {submittingOffice && <Loader2 size={12} className="animate-spin" />}
                        Create Office
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs px-4 py-2"
                        onClick={() => setShowAddForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Offices List */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {(company.offices || []).length === 0 ? (
                    <div className="col-span-2 flex flex-col items-center justify-center border border-dashed rounded-xl p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                      <MapPin size={24} className="mb-2" style={{ color: "var(--text-muted)" }} />
                      <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>No Offices Registered</h4>
                      <p className="text-[11px] max-w-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        Register office locations to distribute regional candidate hiring coordinates and site allocations.
                      </p>
                    </div>
                  ) : (
                    company.offices?.map((office: any) => (
                      <div key={office.id} className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                            <Building2 size={13} style={{ color: "var(--text-muted)" }} />
                            {office.name}
                          </h4>
                          <span className="chip text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20 text-[9px] font-bold uppercase tracking-wider">
                            {office.city}
                          </span>
                        </div>
                        {office.address && (
                          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{office.address}</p>
                        )}
                        {office.managerId && (
                          <div className="text-[10px] border-t pt-2 flex items-center gap-1" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                            <span>Manager Assigned</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── VIEW: DEPARTMENTS ── */}
            {activeTab === "departments" && isGlobalAdmin && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Manage Departments</h2>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    <Plus size={12} /> Add Department
                  </button>
                </div>

                {showAddForm && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!deptName.trim() || !companyId) return;
                      setSubmittingDept(true);
                      try {
                        await api.createCompanyDepartment(companyId, {
                          name: deptName,
                          code: deptCode || undefined,
                        });
                        setDeptName("");
                        setDeptCode("");
                        setShowAddForm(false);
                        companyQuery.refetch();
                        showToast("success", "Department created successfully!");
                      } catch (err: any) {
                        showToast("error", err?.message || "Failed to create department");
                      } finally {
                        setSubmittingDept(false);
                      }
                    }}
                    className="rounded-xl border p-5 space-y-4 max-w-lg" style={{ borderColor: "var(--border-strong)", background: "var(--bg-surface)" }}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                      <Building2 size={13} className="text-indigo-500" />
                      Add New Brand Department
                    </div>

                    <div className="space-y-3">
                      <input
                        className="field"
                        placeholder="Department Name (e.g. Engineering, Sales, Human Resources) *"
                        value={deptName}
                        onChange={(e) => setDeptName(e.target.value)}
                        required
                      />

                      <input
                        className="field"
                        placeholder="Department Code (e.g. ENG, HR)"
                        value={deptCode}
                        onChange={(e) => setDeptCode(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={submittingDept}
                        className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                      >
                        {submittingDept && <Loader2 size={12} className="animate-spin" />}
                        Create Department
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs px-4 py-2"
                        onClick={() => setShowAddForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Departments List */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {(company.departments || []).length === 0 ? (
                    <div className="col-span-2 flex flex-col items-center justify-center border border-dashed rounded-xl p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                      <Building2 size={24} className="mb-2" style={{ color: "var(--text-muted)" }} />
                      <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>No Departments Registered</h4>
                      <p className="text-[11px] max-w-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        Define internal company units to structure job post routing and employee team mappings.
                      </p>
                    </div>
                  ) : (
                    company.departments?.map((dept: any) => (
                      <div key={dept.id} className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                            <Building2 size={13} style={{ color: "var(--text-muted)" }} />
                            {dept.name}
                          </h4>
                          {dept.code && (
                            <span className="chip text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20 text-[9px] font-bold uppercase tracking-wider">
                              {dept.code}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "settings" && isGlobalAdmin && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-1.5 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    <Settings size={14} className="text-indigo-500" />
                    Company Profile Settings
                  </h2>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>Update branding details, media covers, and recruitment coordinates.</p>
                </div>

                <form onSubmit={handleSettingsSubmit} className="space-y-6">
                  {/* Media Uploads Section */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Logo Picker */}
                    <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                      <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Company Logo</label>
                      <div className="flex items-center gap-4">
                        {settingsForm.logoUrl ? (
                          <img src={settingsForm.logoUrl} alt="Logo" className="h-16 w-16 rounded-xl object-contain border p-1" style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)" }} />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-600/30">
                            <Building2 size={24} className="text-indigo-400" />
                          </div>
                        )}
                        <label className="relative cursor-pointer btn-secondary text-xs px-3 py-2">
                          {uploadingLogo ? (
                            <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin text-indigo-500" /> Uploading...</span>
                          ) : (
                            "Choose Logo"
                          )}
                          <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo || isPending} className="hidden" />
                        </label>
                      </div>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Supported formats: JPG, PNG, GIF. Max file size: 2MB.</p>
                    </div>

                    {/* Cover Image Picker */}
                    <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                      <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Cover Banner</label>
                      <div className="flex flex-col gap-3">
                        {settingsForm.coverImageUrl ? (
                          <img src={settingsForm.coverImageUrl} alt="Cover" className="h-16 w-full rounded-xl object-cover border" style={{ borderColor: "var(--border)" }} />
                        ) : (
                          <div className="h-16 w-full rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-700/20 border border-indigo-600/30 flex items-center justify-center text-xs text-indigo-400 font-semibold">
                            No Cover Banner Uploaded
                          </div>
                        )}
                        <label className="self-start relative cursor-pointer btn-secondary text-xs px-3 py-2">
                          {uploadingCover ? (
                            <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin text-indigo-500" /> Uploading...</span>
                          ) : (
                            "Choose Cover Banner"
                          )}
                          <input type="file" accept="image/*" onChange={handleCoverUpload} disabled={uploadingCover || isPending} className="hidden" />
                        </label>
                      </div>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Aspect ratio: 4:1 recommended. Supported formats: JPG, PNG.</p>
                    </div>
                  </div>

                  {/* Details Form Grid */}
                  <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Company Name *</span>
                        <input className="field" value={settingsForm.name} onChange={(e) => updateSetting("name", e.target.value)} required />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Tagline</span>
                        <input className="field" value={settingsForm.tagline} onChange={(e) => updateSetting("tagline", e.target.value)} placeholder="e.g. Elevating engineering collaboration" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Founded Year</span>
                        <input type="number" min={1800} max={new Date().getFullYear()} className="field" value={settingsForm.foundedYear} onChange={(e) => updateSetting("foundedYear", e.target.value)} placeholder="e.g. 2015" />
                      </label>
                    </div>

                    <label className="block">
                      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Description</span>
                      <textarea className="field min-h-24 resize-none" value={settingsForm.description} onChange={(e) => updateSetting("description", e.target.value)} placeholder="Tell candidates about your company's mission and engineering culture..." />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Industry</span>
                        <input className="field" value={settingsForm.industry} onChange={(e) => updateSetting("industry", e.target.value)} placeholder="e.g. Fintech, Healthcare" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Headquarters City</span>
                        <input className="field" value={settingsForm.headquarters} onChange={(e) => updateSetting("headquarters", e.target.value)} placeholder="e.g. Bangalore, SF" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Company Type</span>
                        <select className="field" value={settingsForm.type} onChange={(e) => updateSetting("type", e.target.value)}>
                          <option value="">Select Type</option>
                          <option value="STARTUP">Startup</option>
                          <option value="PRODUCT_BASED">Product Based</option>
                          <option value="SERVICE_BASED">Service Based</option>
                          <option value="ENTERPRISE">Enterprise</option>
                          <option value="MNC">MNC</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Company Size</span>
                        <select className="field" value={settingsForm.size} onChange={(e) => updateSetting("size", e.target.value)}>
                          <option value="">Select Size</option>
                          <option value="SOLO">Solo (1)</option>
                          <option value="SMALL">Small (2-49)</option>
                          <option value="MEDIUM">Medium (50-249)</option>
                          <option value="LARGE">Large (250-999)</option>
                          <option value="ENTERPRISE">Enterprise (1000+)</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Website Link</span>
                        <input type="url" className="field" value={settingsForm.websiteUrl} onChange={(e) => updateSetting("websiteUrl", e.target.value)} placeholder="https://company.com" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Careers Page Link</span>
                        <input type="url" className="field" value={settingsForm.careersPageUrl} onChange={(e) => updateSetting("careersPageUrl", e.target.value)} placeholder="https://company.com/careers" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>GitHub Org Link</span>
                        <input type="url" className="field" value={settingsForm.githubUrl} onChange={(e) => updateSetting("githubUrl", e.target.value)} placeholder="https://github.com/org" />
                      </label>
                    </div>

                    <div className="flex gap-6 text-xs pt-2 border-t" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                      <label className="flex cursor-pointer items-center gap-2 select-none">
                        <input type="checkbox" checked={settingsForm.hiringEnabled} onChange={(e) => updateSetting("hiringEnabled", e.target.checked)} className="accent-indigo-600 h-3.5 w-3.5" />
                        Hiring active
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 select-none">
                        <input type="checkbox" checked={settingsForm.referralEnabled} onChange={(e) => updateSetting("referralEnabled", e.target.checked)} className="accent-indigo-600 h-3.5 w-3.5" />
                        Referral coordinates open
                      </label>
                    </div>
                  </div>

                  {/* Actions Submit */}
                  <div className="flex gap-2 justify-end border-t pt-4" style={{ borderColor: "var(--border)" }}>
                    <button
                      type="submit"
                      disabled={isPending || uploadingLogo || uploadingCover}
                      className="btn-primary px-5 py-2.5 text-xs disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {updateCompanyMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                      Save Profile Changes
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>


        </div>

      </div>

      {/* ── Confirmation Dialog ── */}
      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction?.type === "assign_manager" ? "Assign Office Manager" :
          confirmAction?.type === "revoke_manager" ? "Revoke Office Scope" :
          confirmAction?.type === "assign_recruiter" ? "Add Recruiter Seat" : "Revoke Recruiter Seat"
        }
        message={
          confirmAction?.type === "assign_manager" ? (
            <p>Are you sure you want to assign <strong>{confirmAction.label}</strong> as Manager for the <strong>{confirmAction.officeCity}</strong> office? They will receive a notification.</p>
          ) : confirmAction?.type === "revoke_manager" ? (
            <p>Revoke office manager privileges from <strong>{confirmAction.label}</strong> for the <strong>{confirmAction.officeCity}</strong> office?</p>
          ) : confirmAction?.type === "assign_recruiter" ? (
            <p>Are you sure you want to assign recruiter seat to <strong>{confirmAction.label}</strong> as <strong>{confirmAction.recruiterTitle}</strong>? They will receive a notification.</p>
          ) : (
            <p>Revoke recruiter privileges from <strong>{confirmAction?.label}</strong>? They will no longer be able to post jobs.</p>
          )
        }
        confirmLabel={
          confirmAction?.type === "assign_manager" || confirmAction?.type === "assign_recruiter" ? "Assign Seat" : "Revoke"
        }
        variant={confirmAction?.type?.startsWith("revoke") ? "danger" : "default"}
        isPending={isPending}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />

    </div>
  );
}
