import { FormEvent } from "react";
import { Plus, MapPin, Building2, Loader2 } from "lucide-react";

interface OfficeItem {
  id: string;
  name: string;
  city: string;
  address?: string | null;
  managerId?: string | null;
}

interface AdminOption {
  user?: {
    id: string;
    username: string;
    profile?: {
      fullName?: string | null;
    } | null;
  } | null;
  officeCity?: string | null;
}

interface OfficesSectionProps {
  offices: OfficeItem[];
  admins: AdminOption[];
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  officeName: string;
  setOfficeName: (val: string) => void;
  officeCityInput: string;
  setOfficeCityInput: (val: string) => void;
  officeAddress: string;
  setOfficeAddress: (val: string) => void;
  officeManagerId: string;
  setOfficeManagerId: (val: string) => void;
  submittingOffice: boolean;
  onCreateOffice: (e: FormEvent) => void;
}

export function OfficesSection({
  offices,
  admins,
  showAddForm,
  setShowAddForm,
  officeName,
  setOfficeName,
  officeCityInput,
  setOfficeCityInput,
  officeAddress,
  setOfficeAddress,
  officeManagerId,
  setOfficeManagerId,
  submittingOffice,
  onCreateOffice,
}: OfficesSectionProps) {
  return (
    <div className="space-y-6 animate-fade-in">
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
          onSubmit={onCreateOffice}
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
              {admins.map((adm) => (
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
        {offices.length === 0 ? (
          <div className="col-span-2 flex flex-col items-center justify-center border border-dashed rounded-xl p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
            <MapPin size={24} className="mb-2" style={{ color: "var(--text-muted)" }} />
            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>No Offices Registered</h4>
            <p className="text-[11px] max-w-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Register office locations to distribute regional candidate hiring coordinates and site allocations.
            </p>
          </div>
        ) : (
          offices.map((office) => (
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
  );
}
