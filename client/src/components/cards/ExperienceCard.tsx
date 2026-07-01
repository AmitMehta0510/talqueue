import { useState } from "react";
import { Briefcase, Calendar, Users, Code2, Pencil, Trash2, X, Loader2, ShieldCheck } from "lucide-react";
import { Experience } from "../../lib/api";
import { formatMonthYear } from "../../core/utils/format";

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  INTERN: "Internship",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
  FREELANCE: "Freelance",
};

interface ExperienceCardProps {
  /** The experience record to display. */
  experience: Experience;
  /** Callback to trigger editing. */
  onEdit?: () => void;
  /** Callback to trigger deletion. */
  onDelete?: () => void;
  /** Optional callback to verify work email. */
  onVerify?: (email: string, code?: string) => Promise<unknown>;
}

/**
 * Renders an engineer's work experience details, showing company, role, timeline,
 * team description, technical stack, and inline email verification controls.
 */
export function ExperienceCard({
  experience,
  onEdit,
  onDelete,
  onVerify,
}: ExperienceCardProps) {
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [emailInput, setEmailInput] = useState(experience.workEmail || "");
  const [codeInput, setCodeInput] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stack = [...(experience.techStack || []), ...(experience.skillsUsed || [])];
  const companyName = experience.companyName || experience.company?.name || "Company";
  const employmentLabel = EMPLOYMENT_LABELS[experience.employmentType || ""] || experience.employmentType;
  const startLabel = formatMonthYear(experience.startDate);
  const endLabel = experience.isCurrent ? "Present" : formatMonthYear(experience.endDate ?? undefined);

  const isVerified = experience.verified || experience.workEmailVerified;

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

        {/* Company logo placeholder */}
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 dark:from-slate-800 dark:to-slate-900 dark:text-slate-500">
          <Briefcase size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-primary">{experience.title || "Role"}</h4>
              <p className="mt-0.5 text-sm text-secondary">{companyName}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5 pr-12">
              {isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:ring-indigo-900/40">
                  <ShieldCheck size={11} />
                  Verified
                </span>
              )}
              {employmentLabel && (
                <span className="chip">
                  {employmentLabel}
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-fg">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {startLabel} – {endLabel}
            </span>
            {experience.teamSize && (
              <span className="flex items-center gap-1">
                <Users size={12} />
                Team of {experience.teamSize}
              </span>
            )}
          </div>

          {experience.description && (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-secondary">
              {experience.description}
            </p>
          )}

          {stack.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Code2 size={13} className="mt-0.5 shrink-0 text-muted-fg" />
              {stack.slice(0, 6).map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-secondary border border-base"
                >
                  {item}
                </span>
              ))}
              {stack.length > 6 && (
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted-fg border border-base">
                  +{stack.length - 6}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {!isVerified && onVerify && (
        <div className="border-t border-base pt-3">
          {!showVerifyForm ? (
            <button
              onClick={() => setShowVerifyForm(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
            >
              Verify Work Email
            </button>
          ) : (
            <div className="space-y-2 rounded-lg bg-surface-2 border border-base p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-secondary">Verify Work Email</span>
                <button
                  onClick={() => { setShowVerifyForm(false); setStep("email"); }}
                  className="text-muted-fg hover:text-secondary"
                >
                  <X size={12} />
                </button>
              </div>
              {step === "email" ? (
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="yourname@company.com"
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
