import { FormEvent } from "react";
import { Plus, Building2, Loader2 } from "lucide-react";

interface DepartmentItem {
  id: string;
  name: string;
  code?: string | null;
}

interface DepartmentsSectionProps {
  departments: DepartmentItem[];
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  deptName: string;
  setDeptName: (val: string) => void;
  deptCode: string;
  setDeptCode: (val: string) => void;
  submittingDept: boolean;
  onCreateDept: (e: FormEvent) => void;
}

export function DepartmentsSection({
  departments,
  showAddForm,
  setShowAddForm,
  deptName,
  setDeptName,
  deptCode,
  setDeptCode,
  submittingDept,
  onCreateDept,
}: DepartmentsSectionProps) {
  return (
    <div className="space-y-6 animate-fade-in">
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
          onSubmit={onCreateDept}
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
        {departments.length === 0 ? (
          <div className="col-span-2 flex flex-col items-center justify-center border border-dashed rounded-xl p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
            <Building2 size={24} className="mb-2" style={{ color: "var(--text-muted)" }} />
            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>No Departments Registered</h4>
            <p className="text-[11px] max-w-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Define internal company units to structure job post routing and employee team mappings.
            </p>
          </div>
        ) : (
          departments.map((dept) => (
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
  );
}
