import { useState } from "react";
import { GraduationCap, ShieldCheck, Calendar, X, Loader2, Pencil, Trash2 } from "lucide-react";
import { Education } from "../../lib/api";

interface EducationCardProps {
  /** The education record to display. */
  education: Education;
  /** Callback to trigger editing. */
  onEdit?: () => void;
  /** Callback to trigger deletion. */
  onDelete?: () => void;
  /** Optional callback to verify student college email. */
  onVerify?: (email: string, code?: string) => Promise<unknown>;
}

/**
 * Renders an engineer's academic details (college, department, degree, timeline, eligibility criteria),
 * showing verification badges and inline affiliation email verification controls.
 */
export function EducationCard({
  education,
  onEdit,
  onDelete,
  onVerify,
}: EducationCardProps) {
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [emailInput, setEmailInput] = useState(education.collegeEmail || "");
  const [codeInput, setCodeInput] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const yearRange = [
    education.startYear,
    education.current ? "Present" : education.endYear,
  ]
    .filter(Boolean)
    .join(" – ");

  const details = [education.degree, education.fieldOfStudy, education.department?.name]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="group relative flex flex-col gap-4 panel hover-lift p-5 hover:border-indigo-500/40 dark:hover:border-indigo-400/40">
      <div className="flex gap-4">
        {/* Action buttons */}
        {(onEdit || onDelete) && (
          <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {onEdit && (
              <button
                className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 transition hover:bg-brand-light hover:text-brand"
                onClick={onEdit}
                title="Edit"
              >
                <Pencil size={14} />
              </button>
            )}
            {onDelete && (
              <button
                className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 transition hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400"
                onClick={onDelete}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}

        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-teal-100 text-indigo-700 dark:from-indigo-950/60 dark:to-teal-900/60 dark:text-indigo-400">
          <GraduationCap size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2 pr-12">
            <div>
              <h4 className="font-semibold text-primary truncate">
                {education.college?.name || education.customCollegeName || "College"}
              </h4>
              {details && (
                <p className="mt-0.5 text-sm text-secondary">{details}</p>
              )}
            </div>
            {education.collegeEmailVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:ring-indigo-900/40">
                <ShieldCheck size={11} className="text-indigo-600 dark:text-indigo-400" />
                Verified
              </span>
            )}
          </div>
          {yearRange && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-fg">
              <Calendar size={12} />
              {yearRange}
            </p>
          )}

          {/* Eligibility Metrics display */}
          {(education.cgpa || education.backlogs !== undefined || education.currentYear) && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {education.cgpa !== null && education.cgpa !== undefined && (
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/30 text-indigo-750 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 px-2 py-0.5 text-[10px] font-bold">
                  CGPA: {education.cgpa.toFixed(2)}
                </span>
              )}
              {education.backlogs !== null && education.backlogs !== undefined && (
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                  education.backlogs > 0
                    ? "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/60"
                    : "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/60"
                }`}>
                  {education.backlogs} {education.backlogs === 1 ? "Active Backlog" : "Active Backlogs"}
                </span>
              )}
              {education.currentYear && (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800/60 px-2 py-0.5 text-[10px] font-bold">
                  Year {education.currentYear} of Study
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {!education.collegeEmailVerified && education.collegeId && onVerify && (
        <div className="border-t border-base pt-3">
          {!showVerifyForm ? (
            <button
              onClick={() => setShowVerifyForm(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
            >
              Verify Student Email
            </button>
          ) : (
            <div className="space-y-2 rounded-lg bg-surface-2 border border-base p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-secondary">Verify College Affiliation</span>
                <button
                  onClick={() => { setShowVerifyForm(false); setStep("email"); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              </div>
              {step === "email" ? (
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="yourname@college.edu"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="field py-1 px-2 text-xs w-full"
                  />
                  <button
                    onClick={async () => {
                      if (!emailInput.trim()) return;
                      setIsSubmitting(true);
                      try {
                        await onVerify(emailInput, undefined);
                        setStep("code");
                      } catch {}
                      finally { setIsSubmitting(false); }
                    }}
                    disabled={isSubmitting || !emailInput.trim()}
                    className="btn-primary py-1 px-3 text-xs font-semibold disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : "Send Code"}
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-fg">Enter the verification code sent to {emailInput}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Verification Code (e.g. 123456)"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      className="field py-1 px-2 text-xs w-full"
                    />
                    <button
                      onClick={async () => {
                        if (!codeInput.trim()) return;
                        setIsSubmitting(true);
                        try {
                          await onVerify(emailInput, codeInput);
                          setShowVerifyForm(false);
                        } catch {}
                        finally { setIsSubmitting(false); }
                      }}
                      disabled={isSubmitting || !codeInput.trim()}
                      className="btn-primary py-1 px-3 text-xs font-semibold disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : "Verify"}
                    </button>
                  </div>
                  <button
                    onClick={() => setStep("email")}
                    className="text-[10px] text-muted-fg hover:text-brand underline"
                  >
                    Change email
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

