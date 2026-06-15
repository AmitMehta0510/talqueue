import { useState } from "react";
import { GraduationCap, ShieldCheck, Briefcase, Calendar, Users, Code2, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { Education, Experience, UserSkill } from "../../lib/api";
import { formatMonthYear, titleCase } from "../../lib/format";

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER:     "bg-slate-100 text-slate-600 border-slate-200",
  INTERMEDIATE: "bg-blue-50 text-blue-700 border-blue-100",
  ADVANCED:     "bg-emerald-50 text-emerald-700 border-emerald-100",
  EXPERT:       "bg-violet-50 text-violet-700 border-violet-100",
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  INTERN: "Internship",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
  FREELANCE: "Freelance",
};

export function ExperienceCard({
  experience,
  onEdit,
  onDelete,
  onVerify,
}: {
  experience: Experience;
  onEdit?: () => void;
  onDelete?: () => void;
  onVerify?: (email: string, code?: string) => Promise<any>;
}) {
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
    <article className="group relative flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-emerald-200 hover:shadow-md">
      <div className="flex gap-4">
        {/* Action buttons */}
        {(onEdit || onDelete) && (
          <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {onEdit && (
              <button
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                onClick={onEdit}
                title="Edit"
              >
                <Pencil size={14} />
              </button>
            )}
            {onDelete && (
              <button
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                onClick={onDelete}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}

        {/* Company logo placeholder */}
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
          <Briefcase size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-slate-900">{experience.title || "Role"}</h4>
              <p className="mt-0.5 text-sm text-slate-600">{companyName}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5 pr-12">
              {isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                  <ShieldCheck size={11} />
                  Verified
                </span>
              )}
              {employmentLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                  {employmentLabel}
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
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
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
              {experience.description}
            </p>
          )}

          {stack.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Code2 size={13} className="mt-0.5 shrink-0 text-slate-400" />
              {stack.slice(0, 6).map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                >
                  {item}
                </span>
              ))}
              {stack.length > 6 && (
                <span className="rounded-full bg-slate-50 px-2 py-0.5 text-xs text-slate-400 ring-1 ring-slate-200">
                  +{stack.length - 6}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {!isVerified && onVerify && (
        <div className="border-t border-slate-100 pt-3">
          {!showVerifyForm ? (
            <button
              onClick={() => setShowVerifyForm(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Verify Work Email
            </button>
          ) : (
            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Verify Work Email</span>
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
                    placeholder="yourname@company.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none text-slate-800"
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
                    className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-750 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : "Send Code"}
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-slate-500">Enter the verification code sent to {emailInput}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Verification Code (e.g. 123456)"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none text-slate-800"
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
                      className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-750 disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : "Verify"}
                    </button>
                  </div>
                  <button
                    onClick={() => setStep("email")}
                    className="text-[10px] text-slate-400 hover:text-emerald-700 underline"
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

export function EducationCard({
  education,
  onEdit,
  onDelete,
  onVerify,
}: {
  education: Education;
  onEdit?: () => void;
  onDelete?: () => void;
  onVerify?: (email: string, code?: string) => Promise<any>;
}) {
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
    <article className="group relative flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-emerald-200 hover:shadow-md">
      <div className="flex gap-4">
        {/* Action buttons */}
        {(onEdit || onDelete) && (
          <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {onEdit && (
              <button
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                onClick={onEdit}
                title="Edit"
              >
                <Pencil size={14} />
              </button>
            )}
            {onDelete && (
              <button
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                onClick={onDelete}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}

        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-700">
          <GraduationCap size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2 pr-12">
            <div>
              <h4 className="font-semibold text-slate-900 truncate">
                {education.college?.name || education.customCollegeName || "College"}
              </h4>
              {details && (
                <p className="mt-0.5 text-sm text-slate-600">{details}</p>
              )}
            </div>
            {education.collegeEmailVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                <ShieldCheck size={11} className="text-emerald-600" />
                Verified
              </span>
            )}
          </div>
          {yearRange && (
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
              <Calendar size={12} />
              {yearRange}
            </p>
          )}
        </div>
      </div>

      {!education.collegeEmailVerified && education.collegeId && onVerify && (
        <div className="border-t border-slate-100 pt-3">
          {!showVerifyForm ? (
            <button
              onClick={() => setShowVerifyForm(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Verify Student Email
            </button>
          ) : (
            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Verify College Affiliation</span>
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
                    className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none text-slate-800"
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
                    className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-750 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : "Send Code"}
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-slate-500">Enter the verification code sent to {emailInput}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Verification Code (e.g. 123456)"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none text-slate-800"
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
                      className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-750 disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : "Verify"}
                    </button>
                  </div>
                  <button
                    onClick={() => setStep("email")}
                    className="text-[10px] text-slate-400 hover:text-emerald-700 underline"
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

export function SkillPill({
  skill,
  large = false,
  onRemove,
  onClick,
}: {
  skill: UserSkill;
  large?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
}) {
  const levelClass = skill.level ? (LEVEL_COLORS[skill.level] || LEVEL_COLORS.BEGINNER) : "bg-slate-50 text-slate-600 border-slate-200";
  const levelLabel = skill.level ? titleCase(skill.level) : null;

  const verifiedBadge = skill.verified && (
    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-300">
      <ShieldCheck size={10} />
      Verified
    </span>
  );

  const unverifiedBadge = !skill.verified && (
    <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-300 border-dashed">
      Self-Claimed
    </span>
  );

  if (large) {
    return (
      <div 
        className={`group/skill relative flex items-center gap-2 rounded-lg border px-3 py-2 ${levelClass} ${onClick ? "cursor-pointer hover:shadow-sm transition hover:border-slate-300" : ""}`}
        onClick={onClick}
      >
        <span className="text-sm font-medium">
          {skill.skill?.name || skill.skill?.normalizedName || "Skill"}
        </span>
        {levelLabel && (
          <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-xs font-medium">
            {levelLabel}
          </span>
        )}
        {verifiedBadge}
        {unverifiedBadge}
        {onRemove && (
          <button
            className="ml-1 rounded-full p-0.5 opacity-0 transition-opacity hover:bg-red-100 hover:text-red-600 group-hover/skill:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove skill"
          >
            <X size={13} />
          </button>
        )}
      </div>
    );
  }

  return (
    <span 
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${levelClass} ${onClick ? "cursor-pointer hover:shadow-sm transition hover:border-slate-300" : ""}`}
      onClick={onClick}
    >
      {skill.skill?.name || skill.skill?.normalizedName || "Skill"}
      {levelLabel && <span className="opacity-60">· {levelLabel}</span>}
      {skill.verified && <ShieldCheck size={11} className="text-emerald-600 shrink-0" />}
    </span>
  );
}
