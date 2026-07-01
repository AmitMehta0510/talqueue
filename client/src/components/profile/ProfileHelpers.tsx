import React, { ReactNode } from "react";

// ─── Shared Components ────────────────────────────────────────────────────────

export function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-muted-fg">{label}</span>
      {children}
    </label>
  );
}

export function EmptySection({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: React.ComponentType<any>;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 text-center border-strong bg-surface-2">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-surface-3">
        <Icon size={22} className="text-muted-fg" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-secondary">{title}</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-fg">{text}</p>
      </div>
      {action}
    </div>
  );
}

// ─── Shared Constants ─────────────────────────────────────────────────────────

export const emptyExperienceForm = {
  companyName: "",
  companyWebsiteUrl: "",
  title: "",
  employmentType: "FULL_TIME",
  startDate: "",
  endDate: "",
  isCurrent: false,
  description: "",
  workEmail: "",
  managerName: "",
  managerEmail: "",
  managerLinkedinUrl: "",
  techStack: "",
  skillsUsed: "",
  teamSize: "",
};

export const emptyEducationForm = {
  collegeId: "",
  collegeName: "",
  isOtherCollege: false,
  customCollegeName: "",
  departmentId: "",
  isOtherDepartment: false,
  customDepartmentName: "",
  degree: "",
  fieldOfStudy: "",
  startYear: "",
  endYear: "",
  current: false,
  cgpa: "",
  backlogs: "",
  currentYear: "",
};
