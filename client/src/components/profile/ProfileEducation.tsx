import React, { useState, useEffect, ReactNode, FormEvent } from "react";
import {
  GraduationCap,
  Loader2,
  X,
  Plus,
  Save,
  ChevronDown,
} from "lucide-react";
import { College } from "../../lib/api";
import { EducationCard } from "../cards/ProfileCards";
import { Field, EmptySection, emptyEducationForm } from "./ProfileHelpers";

export interface ProfileEducationProps {
  educations: any[];
  isFetching: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  showForm: boolean;
  onToggleForm: () => void;
  form: typeof emptyEducationForm;
  onFormChange: (f: typeof emptyEducationForm) => void;
  onSubmit: (e: FormEvent) => void;
  isPending: boolean;
  editingId: string | null;
  onEdit: (edu: any) => void;
  onDelete: (edu: any) => void;
  onCancel: () => void;
  collegeQuery: string;
  onCollegeQueryChange: (v: string) => void;
  collegeResults: College[];
  onSelectCollege: (college: College) => void;
  onSelectOtherCollege: () => void;
  onCancelOtherCollege: () => void;
  departments: Array<{ id: string; name: string }>;
  departmentsLoading: boolean;
  onVerify?: (educationId: string, email: string, code?: string) => Promise<any>;
  graduationYear: number | null;
  onSaveGraduationYear: (year: number) => Promise<void>;
  isSavingGraduationYear: boolean;
}

export function ProfileEducation({
  educations,
  isFetching,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  showForm,
  onToggleForm,
  form,
  onFormChange,
  onSubmit,
  isPending,
  editingId,
  onEdit,
  onDelete,
  onCancel,
  collegeQuery,
  onCollegeQueryChange,
  collegeResults,
  onSelectCollege,
  onSelectOtherCollege,
  onCancelOtherCollege,
  departments,
  departmentsLoading,
  onVerify,
  graduationYear,
  onSaveGraduationYear,
  isSavingGraduationYear,
}: ProfileEducationProps) {
  const [localGradYear, setLocalGradYear] = useState(graduationYear?.toString() || "");

  useEffect(() => {
    setLocalGradYear(graduationYear?.toString() || "");
  }, [graduationYear]);

  const handleSaveGradYear = async () => {
    const parsed = parseInt(localGradYear, 10);
    if (isNaN(parsed) || parsed < 1970 || parsed > 2100) return;
    await onSaveGraduationYear(parsed);
  };

  return (
    <>
      {/* Graduation & Eligibility Settings */}
      <div className="panel p-5 bg-indigo-50/20 dark:bg-indigo-950/5 border border-indigo-150/40 dark:border-indigo-900/40 rounded-2xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
            <GraduationCap size={15} />
            Academic Graduation Year
          </h3>
          <p className="text-xs text-muted-fg mt-0.5">
            Set your expected graduation year. This is required for recruiter campus placement drive filters.
          </p>
        </div>

        <div className="max-w-xs space-y-1">
          <label className="block text-xs font-semibold text-secondary">Expected Graduation Year</label>
          <div className="flex gap-2">
            <input
              type="number"
              className="field text-sm py-1.5 px-3"
              placeholder="e.g. 2026"
              value={localGradYear}
              onChange={(e) => setLocalGradYear(e.target.value)}
              min={1970}
              max={2100}
            />
            <button
              type="button"
              onClick={handleSaveGradYear}
              disabled={isSavingGraduationYear || localGradYear === (graduationYear?.toString() || "")}
              className="btn-primary py-1.5 px-4 text-xs font-bold shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition"
            >
              {isSavingGraduationYear ? <Loader2 size={12} className="animate-spin" /> : "Save"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-primary">Education</h2>
            {isFetching && <Loader2 className="animate-spin text-muted-fg" size={15} />}
          </div>
          <button
            id="profile-add-education-btn"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
            onClick={editingId ? onCancel : onToggleForm}
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? "Cancel" : "Add Education"}
          </button>
        </div>

        {/* Add/Edit form */}
        {showForm && (
          <div className="panel p-5 border-brand/30">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
              <GraduationCap size={15} className="text-brand" />
              {editingId ? "Edit Education" : "New Education"}
            </h3>
            <form onSubmit={onSubmit}>
              <div className="grid gap-3 md:grid-cols-2">
                {/* College selection — normal search OR custom name */}
                <div className="space-y-2">
                  {!form.isOtherCollege ? (
                    <div className="relative">
                      <Field label="College *">
                        <input
                          className="field"
                          value={collegeQuery}
                          onChange={(e) => onCollegeQueryChange(e.target.value)}
                          placeholder="Search college name..."
                        />
                      </Field>
                      {collegeResults.length > 0 && (
                        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border shadow-lg bg-surface border-base">
                          {collegeResults.map((college) => (
                            <button
                              key={college.id}
                              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-indigo-500/10"
                              type="button"
                              onClick={() => onSelectCollege(college)}
                            >
                              <span className="font-medium text-primary">{college.name}</span>
                              {college.city && (
                                <span className="text-xs text-muted-fg">
                                  {college.city}, {college.state}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {/* "Not listed" trigger */}
                      <button
                        type="button"
                        className="text-muted-fg hover:text-brand transition mt-1.5 text-xs underline underline-offset-2"
                        onClick={onSelectOtherCollege}
                      >
                        My college isn't listed
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Field label="College name *">
                        <input
                          className="field"
                          value={form.customCollegeName}
                          onChange={(e) => onFormChange({ ...form, customCollegeName: e.target.value })}
                          placeholder="Enter your college name exactly"
                          required
                          autoFocus
                        />
                      </Field>
                      <button
                        type="button"
                        className="text-muted-fg hover:text-brand transition text-xs underline underline-offset-2"
                        onClick={onCancelOtherCollege}
                      >
                        ← Search from listed colleges instead
                      </button>
                      {/* Info callout */}
                      <div className="mt-2 flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                        <span className="mt-0.5 text-amber-500">ℹ</span>
                        <p className="text-xs leading-relaxed text-amber-600 dark:text-amber-400">
                          We'll save your education immediately. Our admin team will review and officially add this college within 1–3 days, after which it will be fully linked to your profile.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Department — only when a listed college is selected */}
                {!form.isOtherCollege && (
                  <div className="space-y-3">
                    <Field label="Department/Branch">
                      <select
                        className="field"
                        value={form.isOtherDepartment ? "other" : form.departmentId}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "other") {
                            onFormChange({
                              ...form,
                              departmentId: "",
                              isOtherDepartment: true,
                              customDepartmentName: "",
                              fieldOfStudy: "",
                            });
                          } else {
                            const dept = departments.find((d) => d.id === val);
                            onFormChange({
                              ...form,
                              departmentId: val,
                              isOtherDepartment: false,
                              customDepartmentName: "",
                              fieldOfStudy: dept ? dept.name : "",
                            });
                          }
                        }}
                        disabled={!form.collegeId || departmentsLoading}
                      >
                        <option value="">
                          {!form.collegeId
                            ? "Select a college first"
                            : departmentsLoading
                              ? "Loading departments..."
                              : "Select Department/Branch (optional)"}
                        </option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                        {form.collegeId && !departmentsLoading && (
                          <option value="other">My department/branch isn't listed</option>
                        )}
                      </select>
                    </Field>

                    {form.isOtherDepartment && (
                      <Field label="Specify Department/Branch *">
                        <input
                          className="field"
                          value={form.customDepartmentName}
                          onChange={(e) => onFormChange({ ...form, customDepartmentName: e.target.value })}
                          placeholder="e.g. Computer Science, AI & ML, Robotics"
                          required
                          autoFocus
                        />
                      </Field>
                    )}
                  </div>
                )}

                {/* If other college — allow freetext branch */}
                {form.isOtherCollege && (
                  <Field label="Department/Branch">
                    <input
                      className="field"
                      value={form.fieldOfStudy}
                      onChange={(e) => onFormChange({ ...form, fieldOfStudy: e.target.value })}
                      placeholder="e.g. Computer Science"
                    />
                  </Field>
                )}

                <Field label="Degree">
                  <input
                    className="field"
                    value={form.degree}
                    onChange={(e) => onFormChange({ ...form, degree: e.target.value })}
                    placeholder="B.Tech, M.S., MBA..."
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Start year">
                    <input
                      className="field"
                      type="number"
                      value={form.startYear}
                      onChange={(e) => onFormChange({ ...form, startYear: e.target.value })}
                      placeholder="2020"
                    />
                  </Field>
                  <Field label="End year">
                    <input
                      className="field"
                      type="number"
                      value={form.endYear}
                      onChange={(e) => onFormChange({ ...form, endYear: e.target.value })}
                      placeholder="2024"
                      disabled={form.current}
                    />
                  </Field>
                </div>
                <div className="flex items-center">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition hover:border-indigo-500 border-base bg-surface text-secondary">
                    <input
                      type="checkbox"
                      checked={form.current}
                      onChange={(e) =>
                        onFormChange({ ...form, current: e.target.checked, endYear: e.target.checked ? "" : form.endYear })
                      }
                    />
                    Currently studying
                  </label>
                </div>

                <Field label="Current CGPA / GPA">
                  <input
                    className="field"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={form.cgpa}
                    onChange={(e) => onFormChange({ ...form, cgpa: e.target.value })}
                    placeholder="e.g. 8.5"
                  />
                </Field>

                <Field label="Active Backlogs">
                  <input
                    className="field"
                    type="number"
                    min="0"
                    value={form.backlogs}
                    onChange={(e) => onFormChange({ ...form, backlogs: e.target.value })}
                    placeholder="e.g. 0"
                  />
                </Field>

                <Field label="Current Year of Study">
                  <select
                    className="field"
                    value={form.currentYear}
                    onChange={(e) => onFormChange({ ...form, currentYear: e.target.value })}
                  >
                    <option value="">Select Year (optional)</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year (Final)</option>
                    <option value="5">5th Year</option>
                    <option value="6">6th Year</option>
                  </select>
                </Field>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={
                    isPending ||
                    (!form.isOtherCollege && !form.collegeId) ||
                    (form.isOtherCollege && !form.customCollegeName.trim())
                  }
                >
                  {isPending ? <Loader2 className="animate-spin" size={15} /> : editingId ? <Save size={15} /> : <Plus size={15} />}
                  {editingId ? "Save Education" : "Add Education"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List */}
        {educations.length === 0 && !isFetching ? (
          <EmptySection
            icon={GraduationCap}
            title="No education yet"
            text="Add your degrees and certifications to strengthen your profile."
            action={
              <button className="btn-primary mt-2" onClick={onToggleForm}>
                <Plus size={15} /> Add Education
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {educations.map((edu) => (
              <EducationCard
                key={edu.id}
                education={edu}
                onEdit={() => onEdit(edu)}
                onDelete={() => onDelete(edu)}
                onVerify={(email, code) => onVerify ? onVerify(edu.id, email, code) : Promise.reject("Verification not available")}
              />
            ))}
          </div>
        )}

        {hasNextPage && (
          <button
            className="btn-secondary w-full"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? <Loader2 className="animate-spin" size={15} /> : <ChevronDown size={15} />}
            Load more
          </button>
        )}
      </div>
    </>
  );
}


