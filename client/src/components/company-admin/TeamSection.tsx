import { FormEvent } from "react";
import { Plus, UserPlus, ShieldCheck, MapPin, Trash2 } from "lucide-react";
import { Avatar } from "../ui";
import { userName } from "../../core/utils/format";
import { UserSearchAutocomplete } from "../../pages/AdminPages/shared";

import { User } from "../../core/types/models";

interface ManagerInfo {
  id: string;
  officeCity?: string | null;
  user: User;
}

interface TeamSectionProps {
  globalAdmins: ManagerInfo[];
  officeManagers: ManagerInfo[];
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  targetUserId: string;
  setTargetUserId: (val: string) => void;
  targetUserLabel: string;
  setTargetUserLabel: (val: string) => void;
  officeCity: string;
  setOfficeCity: (val: string) => void;
  onAddManager: (userId: string, officeCity: string) => void;
  onRevokeManager: (userId: string, officeCity: string | undefined, label: string) => void;
}

export function TeamSection({
  globalAdmins,
  officeManagers,
  showAddForm,
  setShowAddForm,
  targetUserId,
  setTargetUserId,
  targetUserLabel,
  setTargetUserLabel,
  officeCity,
  setOfficeCity,
  onAddManager,
  onRevokeManager,
}: TeamSectionProps) {

  const handleAddManagerSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim() || !officeCity.trim()) return;
    onAddManager(targetUserId.trim(), officeCity.trim());
  };

  return (
    <div className="space-y-4 animate-fade-in">
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
            {globalAdmins.map((admin) => {
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
              {officeManagers.map((admin) => {
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
                      type="button"
                      onClick={() => onRevokeManager(u.id, admin.officeCity || undefined, label)}
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
  );
}
