import React from "react";
import { Zap, Plus, Loader2, Building2, Calendar, Clock, XCircle, CheckCircle2, TrendingUp, Award, BookOpen } from "lucide-react";
import { EmptyState } from "../ui";
import { PlacementDrive, PlacementDriveInvite, PlacementStats } from "../../lib/api";
import { formatDate, cleanLogoUrl, STATUS_CHIP_CLASSES } from "../../core/utils/format";

export interface CollegePlacementProps {
  tpoSubTab: "drives" | "sent-invites" | "company-invites" | "stats";
  isUserTpo: boolean;
  isUserCdcr: boolean;
  isTpo: boolean;
  onInviteCompanyClick: () => void;
  onViewApplicants: (drive: { id: string; title: string }) => void;
  allDrives: PlacementDrive[];
  isAllDrivesLoading: boolean;
  onOpenDrive: (driveId: string) => void;
  isOpenDrivePending: boolean;
  onCloseDrive: (driveId: string) => void;
  isCloseDrivePending: boolean;
  sentInvites: PlacementDriveInvite[];
  isSentInvitesLoading: boolean;
  onWithdrawInvite: (inviteId: string) => void;
  isWithdrawInvitePending: boolean;
  driveInvites: PlacementDriveInvite[];
  isDriveInvitesLoading: boolean;
  onRespondToInvite: (payload: { inviteId: string; action: "ACCEPT" | "REJECT" }) => void;
  isRespondToInvitePending: boolean;
  stats: PlacementStats | undefined;
  isStatsLoading: boolean;
  selectedYear: number | undefined;
  setSelectedYear: (year: number | undefined) => void;
}

export function CollegePlacement({
  tpoSubTab,
  isUserTpo,
  isUserCdcr,
  isTpo,
  onInviteCompanyClick,
  onViewApplicants,
  allDrives,
  isAllDrivesLoading,
  onOpenDrive,
  isOpenDrivePending,
  onCloseDrive,
  isCloseDrivePending,
  sentInvites,
  isSentInvitesLoading,
  onWithdrawInvite,
  isWithdrawInvitePending,
  driveInvites,
  isDriveInvitesLoading,
  onRespondToInvite,
  isRespondToInvitePending,
  stats,
  isStatsLoading,
  selectedYear,
  setSelectedYear,
}: CollegePlacementProps) {
  if (tpoSubTab === "drives") {
    return (
      <div className="panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
              <Zap size={16} className="text-indigo-600" />
              Placement Drives
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              All drives for this college — invite companies, manage status, and track applications.
            </p>
          </div>
          <button
            type="button"
            onClick={onInviteCompanyClick}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 transition shadow-sm"
          >
            <Plus size={13} /> Invite Company
          </button>
        </div>

        {isAllDrivesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-slate-400" size={20} />
          </div>
        ) : allDrives.length ? (
          <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <table className="w-full border-collapse text-left text-xs">
              <thead className="text-[10px] font-bold uppercase tracking-wider" style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}>
                <tr>
                  <th className="px-4 py-3">Drive</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {allDrives.map((drive) => (
                  <tr key={drive.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold truncate max-w-[180px]" style={{ color: "var(--text-primary)" }}>{drive.driveTitle}</p>
                      {drive.roles.length > 0 && <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{drive.roles.join(", ")}</p>}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{drive.company?.name}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{drive.driveDate ? formatDate(drive.driveDate) : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        STATUS_CHIP_CLASSES[drive.status] || STATUS_CHIP_CLASSES.CLOSED
                      }`}>
                        {drive.status === "ONGOING" ? "Open" : drive.status === "UPCOMING" ? "Upcoming" : "Closed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewApplicants({ id: drive.id, title: drive.driveTitle })}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
                        >
                          Applicants
                        </button>
                        {drive.status === "UPCOMING" && (
                          <button
                            type="button"
                            onClick={() => onOpenDrive(drive.id)}
                            disabled={isOpenDrivePending}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition disabled:opacity-50"
                          >
                            Open
                          </button>
                        )}
                        {drive.status !== "CLOSED" && (
                          <button
                            type="button"
                            onClick={() => { if (confirm("Close this drive?")) onCloseDrive(drive.id); }}
                            disabled={isCloseDrivePending}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition disabled:opacity-50"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Zap} title="No drives yet" text="Send a placement drive invitation to a company to get started." />
        )}
      </div>
    );
  }

  if (tpoSubTab === "sent-invites") {
    return (
      <div className="panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
              <Building2 size={16} className="text-indigo-600" />
              Sent Invites
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Placement drive invitations sent by your college to companies.
            </p>
          </div>
          <button
            type="button"
            onClick={onInviteCompanyClick}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 transition shadow-sm"
          >
            <Plus size={13} /> Invite Company
          </button>
        </div>

        {isSentInvitesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-slate-400" size={20} />
          </div>
        ) : sentInvites.length ? (
          <div className="space-y-3">
            {sentInvites.map((invite) => (
              <div key={invite.id} className={`rounded-xl border p-4 space-y-3 transition ${
                invite.status === "PENDING" ? "border-indigo-200 dark:border-indigo-700 bg-indigo-50/20 dark:bg-indigo-900/10" : "opacity-60"
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{invite.driveTitle}</p>
                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                      <Building2 size={10} />
                      {invite.company?.name}
                    </p>
                    {invite.message && (
                      <p className="text-xs mt-1.5 italic border-l-2 border-indigo-300 pl-2" style={{ color: "var(--text-secondary)" }}>"{invite.message}"</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    STATUS_CHIP_CLASSES[invite.status] || "bg-slate-100 text-slate-500 border-slate-200"
                  }`}>
                    {invite.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {invite.driveDate && <span className="flex items-center gap-1"><Calendar size={9} />Drive: {formatDate(invite.driveDate)}</span>}
                  {invite.applyDeadline && <span className="flex items-center gap-1"><Clock size={9} />Deadline: {formatDate(invite.applyDeadline)}</span>}
                  {invite.roles.length > 0 && <span>Roles: {invite.roles.join(", ")}</span>}
                </div>

                {invite.status === "PENDING" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { if (confirm("Withdraw this invite?")) onWithdrawInvite(invite.id); }}
                      disabled={isWithdrawInvitePending}
                      className="flex items-center gap-1 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold px-3 py-2 transition disabled:opacity-50"
                    >
                      <XCircle size={13} /> Withdraw
                    </button>
                  </div>
                )}
                {invite.status === "ACCEPTED" && invite.placementDrive && (
                  <p className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={10} /> Drive created
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Building2} title="No invites sent yet" text="Use 'Invite Company' to send a placement drive request to a company." />
        )}
      </div>
    );
  }

  if (tpoSubTab === "company-invites") {
    return (
      <div className="panel p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
            <Building2 size={16} className="text-violet-600" />
            Company Invitations
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Companies requesting to conduct placement drives at your college.
          </p>
        </div>

        {isDriveInvitesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-slate-400" size={20} />
          </div>
        ) : driveInvites.length ? (
          <div className="space-y-3">
            {driveInvites.map((invite) => (
              <div key={invite.id} className={`rounded-xl border p-4 space-y-3 transition ${
                invite.status === "PENDING" ? "border-violet-200 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-900/10" : "opacity-60"
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{invite.driveTitle}</p>
                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                      <Building2 size={10} />
                      {invite.company?.name}
                    </p>
                    {invite.message && (
                      <p className="text-xs mt-1.5 italic border-l-2 border-violet-300 pl-2" style={{ color: "var(--text-secondary)" }}>"{invite.message}"</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    STATUS_CHIP_CLASSES[invite.status] || "bg-slate-100 text-slate-500 border-slate-200"
                  }`}>
                    {invite.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {invite.driveDate && <span className="flex items-center gap-1"><Calendar size={9} />Drive: {formatDate(invite.driveDate)}</span>}
                  {invite.applyDeadline && <span className="flex items-center gap-1"><Clock size={9} />Deadline: {formatDate(invite.applyDeadline)}</span>}
                  {invite.roles.length > 0 && <span>Roles: {invite.roles.join(", ")}</span>}
                </div>

                {/* Accept/Reject only for TPO and CollegeAdmin — CDCR cannot action inbound invites */}
                {invite.status === "PENDING" && isUserTpo && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onRespondToInvite({ inviteId: invite.id, action: "ACCEPT" })}
                      disabled={isRespondToInvitePending}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 transition disabled:opacity-50"
                    >
                      {isRespondToInvitePending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      Accept & Create Drive
                    </button>
                    <button
                      type="button"
                      onClick={() => onRespondToInvite({ inviteId: invite.id, action: "REJECT" })}
                      disabled={isRespondToInvitePending}
                      className="flex items-center gap-1 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold px-3 py-2 transition disabled:opacity-50"
                    >
                      <XCircle size={13} /> Decline
                    </button>
                  </div>
                )}
                {!isUserTpo && invite.status === "PENDING" && (
                  <p className="text-[10px] text-amber-600 font-semibold">Only the TPO can accept or decline company invitations.</p>
                )}
                {invite.status === "ACCEPTED" && invite.placementDrive && (
                  <p className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={10} /> Drive created successfully
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Building2} title="No company invitations" text="When companies invite your college to their placement drives, they'll appear here for you to accept or decline." />
        )}
      </div>
    );
  }

  // stats sub-tab
  return (
    <div className="space-y-6">
      {/* Year filter selector */}
      <div className="panel p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Placement &amp; Internship Analytics</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Academic statistics and performance overview.</p>
        </div>
        <select
          value={selectedYear || ""}
          onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : undefined)}
          className="field py-1 px-3 text-xs w-full sm:w-48 rounded-lg shadow-sm" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <option value="">All Academic Years</option>
          <option value="2026">2026 - 2027</option>
          <option value="2025">2025 - 2026</option>
          <option value="2024">2024 - 2025</option>
        </select>
      </div>

      {isStatsLoading ? (
        <div className="panel p-12 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
          <Loader2 size={32} className="animate-spin text-indigo-600 mb-2" />
          <p className="text-xs text-slate-400">Loading statistics...</p>
        </div>
      ) : !stats ? (
        <div className="panel p-12 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl text-slate-400">
          <Building2 size={40} className="mb-2 text-slate-300" />
          <p className="text-sm font-semibold">No statistical data available</p>
          <p className="text-xs text-slate-400 mt-1">Try changing the year filter or adding placement drives.</p>
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="panel p-4 flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Total Drives</span>
              <span className="text-3xl font-extrabold mt-2" style={{ color: "var(--text-primary)" }}>{stats.summary.totalDrives}</span>
              <span className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>{stats.summary.totalInternshipDrives} Internship drives</span>
            </div>

            <div className="panel p-4 flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Total Applicants</span>
              <span className="text-3xl font-extrabold mt-2" style={{ color: "var(--text-primary)" }}>{stats.summary.totalApplicants}</span>
              <span className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>Applications received</span>
            </div>

            <div className="panel p-4 flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Students Placed</span>
              <span className="text-3xl font-extrabold mt-2 text-indigo-600">{stats.summary.totalSelected}</span>
              <span className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>Successful offers</span>
            </div>

            <div className="panel p-4 flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Placement %</span>
              <span className="text-3xl font-extrabold mt-2 text-indigo-600">{stats.summary.placementPercent}%</span>
              <div className="w-full h-1.5 rounded-full mt-2.5 overflow-hidden" style={{ background: "var(--bg-surface-2)" }}>
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${stats.summary.placementPercent}%` }} />
              </div>
            </div>

            <div className="panel p-4 flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Avg Package</span>
              <span className="text-3xl font-extrabold mt-2" style={{ color: "var(--text-primary)" }}>
                {stats.summary.avgPackageLPA ? `${stats.summary.avgPackageLPA} LPA` : "N/A"}
              </span>
              <span className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>Average selected salary</span>
            </div>

            <div className="panel p-4 flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Max Package</span>
              <span className="text-3xl font-extrabold mt-2" style={{ color: "var(--text-primary)" }}>
                {stats.summary.maxPackageLPA ? `${stats.summary.maxPackageLPA} LPA` : "N/A"}
              </span>
              <span className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>Highest offer package</span>
            </div>
          </div>

          {/* Branch & Company Graphs/Lists */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Branch Breakdown */}
            <div className="panel p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl space-y-4">
              <h4 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Branch Performance</h4>
              {stats.byBranch.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">No department data available.</div>
              ) : (
                <div className="space-y-4">
                  {stats.byBranch.map((b) => (
                    <div key={b.branch} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                        <span>{b.branch}</span>
                        <span className="text-slate-500">{b.selected} / {b.total} placed ({b.placementPercent}%)</span>
                      </div>
                      <div className="h-3 w-full rounded-full overflow-hidden" style={{ background: "var(--bg-surface-2)" }}>
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                          style={{ width: `${b.placementPercent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Companies */}
            <div className="panel p-5 bg-white border border-slate-100 shadow-sm rounded-xl space-y-4">
              <h4 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Top Hiring Partners</h4>
              {stats.byCompany.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">No partner hiring data available.</div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {stats.byCompany.map((c, idx) => (
                    <div key={c.companyId} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-extrabold w-4" style={{ color: "var(--text-muted)" }}>#{idx + 1}</span>
                        {c.companyLogo ? (
                          <img src={cleanLogoUrl(c.companyLogo) || undefined} alt={c.companyName} className="h-7 w-7 rounded-lg object-contain bg-slate-50 border border-slate-100 p-0.5" />
                        ) : (
                          <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                            {c.companyName.charAt(0)}
                          </div>
                        )}
                        <span className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>{c.companyName}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-indigo-600">{c.offers} {c.offers === 1 ? 'Offer' : 'Offers'}</p>
                        {c.avgPackageLPA && (
                          <p className="text-[10px] text-slate-400">Avg {c.avgPackageLPA} LPA</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
