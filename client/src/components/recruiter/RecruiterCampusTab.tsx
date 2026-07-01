import { Send, Trophy, Users, ClipboardList, GraduationCap, Loader2, MapPin, X, CheckCircle, ArrowRight, Calendar } from "lucide-react";
import { titleCase } from "../../core/utils/format";

interface College {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
}

interface InboundInvite {
  id: string;
  status: string;
  driveTitle?: string | null;
  college?: College | null;
  placementDrive?: {
    id: string;
  } | null;
}

interface SentInvite {
  id: string;
  status: string;
  driveTitle?: string | null;
  college?: College | null;
}

interface ActiveDrive {
  id: string;
  title?: string | null;
  status?: string | null;
  driveType?: string | null;
  applicationsCount?: number | null;
  _count?: { applications?: number } | null;
  driveDate?: string | null;
  targetCollege?: {
    name: string;
  } | null;
}

interface RecruiterCampusTabProps {
  inboundInvites: InboundInvite[];
  isInboundInvitesLoading: boolean;
  onRespondToInvite: (payload: { inviteId: string; action: "ACCEPT" | "REJECT" }) => void;
  isRespondToInvitePending: boolean;

  sentInvites: SentInvite[];
  isSentInvitesLoading: boolean;
  onWithdrawInvite: (inviteId: string) => void;
  isWithdrawInvitePending: boolean;
  onSendCampusInviteClick: () => void;
  hasCompanyId: boolean;

  activeDrives: ActiveDrive[];
  isActiveDrivesLoading: boolean;
  onNavigateToDrive: (driveId: string) => void;

  totalStudentsEngaged: number;
  conversionRatio: string;
}

export function RecruiterCampusTab({
  inboundInvites,
  isInboundInvitesLoading,
  onRespondToInvite,
  isRespondToInvitePending,
  sentInvites,
  isSentInvitesLoading,
  onWithdrawInvite,
  isWithdrawInvitePending,
  onSendCampusInviteClick,
  hasCompanyId,
  activeDrives,
  isActiveDrivesLoading,
  onNavigateToDrive,
  totalStudentsEngaged,
  conversionRatio,
}: RecruiterCampusTabProps) {
  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    ACCEPTED: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    REJECTED: "bg-rose-500/15 text-rose-500 border-rose-500/20",
    WITHDRAWN: "bg-slate-500/15 text-slate-500 border-slate-500/20",
  };

  const driveStatusColors: Record<string, string> = {
    OPEN: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    CLOSED: "bg-slate-500/15 text-slate-500 border-slate-500/20",
    CANCELLED: "bg-rose-500/15 text-rose-500 border-rose-500/20",
    COMPLETED: "bg-purple-500/15 text-purple-500 border-purple-500/20",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Campus Placement Drives</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Manage college invitations, track drive progress, and review applicants.
          </p>
        </div>
      </div>

      {/* Premium Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sent Invites */}
        <div className="panel p-4 flex items-center justify-between bg-surface" style={{ border: "1px solid var(--border)" }}>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>Sent Invites</p>
            <h3 className="text-xl font-black mt-1" style={{ color: "var(--text-primary)" }}>
              {sentInvites.length}
            </h3>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500">
            <Send size={18} />
          </div>
        </div>

        {/* Card 2: Active Drives */}
        <div className="panel p-4 flex items-center justify-between bg-surface" style={{ border: "1px solid var(--border)" }}>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>Active Drives</p>
            <h3 className="text-xl font-black mt-1" style={{ color: "var(--text-primary)" }}>
              {activeDrives.length}
            </h3>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
            <Trophy size={18} />
          </div>
        </div>

        {/* Card 3: Students Engaged */}
        <div className="panel p-4 flex items-center justify-between bg-surface" style={{ border: "1px solid var(--border)" }}>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>Students Engaged</p>
            <h3 className="text-xl font-black mt-1" style={{ color: "var(--text-primary)" }}>
              {totalStudentsEngaged}
            </h3>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
            <Users size={18} />
          </div>
        </div>

        {/* Card 4: Conversion Rate */}
        <div className="panel p-4 flex items-center justify-between bg-surface" style={{ border: "1px solid var(--border)" }}>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>Conversion Ratio</p>
            <h3 className="text-xl font-black mt-1" style={{ color: "var(--text-primary)" }}>
              {conversionRatio}
            </h3>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
            <ClipboardList size={18} />
          </div>
        </div>
      </div>

      {/* Received Invites Section (Inbound COLLEGE_TO_COMPANY) */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <GraduationCap size={12} />
          Received Invites ({inboundInvites.length})
        </h4>

        {isInboundInvitesLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-indigo-500" /></div>
        ) : inboundInvites.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center bg-surface" style={{ borderColor: "var(--border)" }}>
            <GraduationCap size={24} className="mx-auto mb-2 opacity-40" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No received invites yet</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              When a college's TPO sends your company a drive request, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {inboundInvites.map((invite) => (
              <div key={invite.id} className="panel p-4 flex flex-col gap-3 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <GraduationCap size={14} className="text-indigo-400 shrink-0" />
                      <span className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                        {invite.college?.name || "College"}
                      </span>
                    </div>
                    {invite.college?.city && (
                      <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        <MapPin size={10} />
                        {[invite.college.city, invite.college.state].filter(Boolean).join(", ")}
                      </div>
                    )}
                    <p className="text-xs mt-1 font-medium" style={{ color: "var(--text-secondary)" }}>
                      Drive: <span className="font-semibold">{invite.driveTitle}</span>
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[invite.status] || "bg-slate-500/15 text-slate-500 border-slate-500/20"}`}>
                    {invite.status}
                  </span>
                </div>

                {/* Action buttons — only for PENDING */}
                {invite.status === "PENDING" && (
                  <div className="flex items-center gap-2">
                    <button
                      className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-1 disabled:opacity-60"
                      onClick={() => onRespondToInvite({ inviteId: invite.id, action: "ACCEPT" })}
                      disabled={isRespondToInvitePending}
                    >
                      {isRespondToInvitePending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                      Accept
                    </button>
                    <button
                      className="flex-1 text-xs font-bold py-1.5 rounded-lg border text-rose-500 hover:bg-rose-500/10 transition flex items-center justify-center gap-1 disabled:opacity-60"
                      style={{ borderColor: "rgba(244,63,94,0.3)" }}
                      onClick={() => onRespondToInvite({ inviteId: invite.id, action: "REJECT" })}
                      disabled={isRespondToInvitePending}
                    >
                      <X size={11} />
                      Decline
                    </button>
                  </div>
                )}

                {/* Post-acceptance drive link */}
                {invite.status === "ACCEPTED" && invite.placementDrive && (
                  <button
                    className="self-start text-xs font-semibold text-indigo-500 flex items-center gap-1 hover:underline"
                    onClick={() => onNavigateToDrive(invite.placementDrive!.id)}
                  >
                    <ArrowRight size={11} /> View Active Drive
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sent Invites Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
            <Send size={12} />
            Sent Invites ({sentInvites.length})
          </h4>
          {hasCompanyId && (
            <button
              className="btn-primary py-1 px-3 text-xs font-semibold shrink-0 flex items-center gap-1.5"
              onClick={onSendCampusInviteClick}
            >
              <Send size={12} />
              Send Campus Invite
            </button>
          )}
        </div>

        {isSentInvitesLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-indigo-500" /></div>
        ) : sentInvites.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center bg-surface" style={{ borderColor: "var(--border)" }}>
            <Send size={24} className="mx-auto mb-2 opacity-40" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No invites sent yet</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Send a campus invite to a college to start a placement drive.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sentInvites.map((invite) => (
              <div
                key={invite.id}
                className="panel p-4 flex flex-col gap-2 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <GraduationCap size={14} className="text-indigo-400 shrink-0" />
                      <span className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                        {invite.college?.name || "College"}
                      </span>
                    </div>
                    {invite.college?.city && (
                      <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        <MapPin size={10} />
                        {[invite.college.city, invite.college.state].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[invite.status] || "bg-slate-500/15 text-slate-500 border-slate-500/20"}`}>
                    {invite.status}
                  </span>
                </div>

                {invite.driveTitle && (
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    Drive: <span className="font-semibold">{invite.driveTitle}</span>
                  </p>
                )}

                {invite.status === "PENDING" && (
                  <button
                    className="self-start flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-400 transition"
                    onClick={() => onWithdrawInvite(invite.id)}
                    disabled={isWithdrawInvitePending}
                  >
                    {isWithdrawInvitePending ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
                    Withdraw Invite
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Drives Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <Trophy size={12} />
          Active Campus Drives ({activeDrives.length})
        </h4>

        {isActiveDrivesLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-indigo-500" /></div>
        ) : activeDrives.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center bg-surface" style={{ borderColor: "var(--border)" }}>
            <GraduationCap size={24} className="mx-auto mb-2 opacity-40" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No active campus drives</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Drives are created automatically when a college accepts your invite.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeDrives.map((drive) => (
              <div
                key={drive.id}
                className="panel p-4 flex flex-col gap-3 hover:shadow-lg transition cursor-pointer group"
                onClick={() => onNavigateToDrive(drive.id)}
              >
                {/* Drive Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-sm truncate group-hover:text-indigo-500 transition" style={{ color: "var(--text-primary)" }}>
                      {drive.title}
                    </h5>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {drive.targetCollege?.name || "College TBD"}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${(drive.status && drive.status in driveStatusColors) ? driveStatusColors[drive.status] : "bg-slate-500/15 text-slate-500 border-slate-500/20"}`}>
                    {drive.status}
                  </span>
                </div>

                {/* Drive Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg p-2 text-center" style={{ background: "var(--bg-surface-2)" }}>
                    <div className="text-lg font-black" style={{ color: "var(--text-primary)" }}>
                      {drive._count?.applications ?? drive.applicationsCount ?? 0}
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Applicants</div>
                  </div>
                  <div className="rounded-lg p-2 text-center" style={{ background: "var(--bg-surface-2)" }}>
                    <div className="text-lg font-black text-xs md:text-sm font-semibold truncate pt-1" style={{ color: "var(--text-primary)" }}>
                      {drive.driveType || "FULL_TIME"}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Type</div>
                  </div>
                </div>

                {/* Drive Date */}
                {drive.driveDate && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    <Calendar size={11} />
                    {new Date(drive.driveDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                )}

                {/* View Applicants CTA */}
                <button
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold transition hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-500"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                  onClick={(e) => { e.stopPropagation(); onNavigateToDrive(drive.id); }}
                >
                  View Applicants <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
