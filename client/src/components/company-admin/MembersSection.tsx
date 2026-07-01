import { FormEvent } from "react";
import { Plus, UserPlus, Users, Trash2 } from "lucide-react";
import { Avatar } from "../ui";
import { userName } from "../../core/utils/format";
import { UserSearchAutocomplete } from "../../pages/AdminPages/shared";

import { User } from "../../core/types/models";

interface RecruiterSeat {
  id: string;
  title?: string | null;
  user: User;
}

interface MembersSectionProps {
  recruiters: RecruiterSeat[];
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  targetUserId: string;
  setTargetUserId: (val: string) => void;
  targetUserLabel: string;
  setTargetUserLabel: (val: string) => void;
  recruiterTitle: string;
  setRecruiterTitle: (val: string) => void;
  onAddRecruiter: (userId: string, recruiterTitle: string) => void;
  onRevokeRecruiter: (userId: string, label: string) => void;
}

export function MembersSection({
  recruiters,
  showAddForm,
  setShowAddForm,
  targetUserId,
  setTargetUserId,
  targetUserLabel,
  setTargetUserLabel,
  recruiterTitle,
  setRecruiterTitle,
  onAddRecruiter,
  onRevokeRecruiter,
}: MembersSectionProps) {

  const handleAddRecruiterSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim() || !recruiterTitle.trim()) return;
    onAddRecruiter(targetUserId.trim(), recruiterTitle.trim());
  };

  return (
    <div className="space-y-4 animate-fade-in">
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
            {recruiters.map((rec) => {
              const u = rec.user;
              const label = userName(u);
              return (
                <div key={rec.id} className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                  <div className="flex items-center gap-2.5">
                    <Avatar user={u} size="sm" />
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{label}</div>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{rec.title || "Recruiter"} • @{u.username}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRevokeRecruiter(u.id, label)}
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
  );
}
