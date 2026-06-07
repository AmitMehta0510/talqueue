import { FormEvent, useState } from "react";
import { X, Send, Sparkles, AlertCircle } from "lucide-react";
import { User, ReferralRequestPayload } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useCreateReferralRequestMutation } from "../../hooks/usePlatformQueries";
import { userName } from "../../lib/format";

interface RequestReferralModalProps {
  targetUser: User;
  onClose: () => void;
  companyNameDefault?: string;
}

export function RequestReferralModal({
  targetUser,
  onClose,
  companyNameDefault = "",
}: RequestReferralModalProps) {
  const { user } = useAuth();
  const createReferralMutation = useCreateReferralRequestMutation();

  const [form, setForm] = useState<ReferralRequestPayload>({
    companyName: companyNameDefault || targetUser.experiences?.[0]?.companyName || "",
    jobRole: "",
    jobUrl: "",
    message: "",
    githubUrl: user?.profile?.githubUrl || "",
    linkedinUrl: user?.profile?.linkedinUrl || "",
    portfolioUrl: user?.profile?.portfolioUrl || "",
    resumeUrl: user?.profile?.resumeUrl || "",
  });

  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.jobRole.trim()) {
      setError("Job role is required.");
      return;
    }

    try {
      await createReferralMutation.mutateAsync({
        userId: targetUser.id,
        payload: {
          ...form,
          companyName: form.companyName?.trim() || undefined,
          jobRole: form.jobRole.trim(),
          jobUrl: form.jobUrl?.trim() || undefined,
          message: form.message?.trim() || undefined,
          githubUrl: form.githubUrl?.trim() || undefined,
          linkedinUrl: form.linkedinUrl?.trim() || undefined,
          portfolioUrl: form.portfolioUrl?.trim() || undefined,
          resumeUrl: form.resumeUrl?.trim() || undefined,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to submit referral request.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[90vh] z-10 animate-in fade-in zoom-in duration-200">
        <button
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            <div className="flex items-center gap-1.5 text-slate-950 font-bold text-base border-b border-slate-100 pb-3">
              <Sparkles size={18} className="text-emerald-700" />
              <h3>Request Referral from {userName(targetUser)}</h3>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-rose-50 border border-rose-100 p-3 text-xs text-rose-800">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">
                  Target Company Name
                </span>
                <input
                  className="field"
                  value={form.companyName}
                  onChange={(e) => setForm((c) => ({ ...c, companyName: e.target.value }))}
                  placeholder="e.g. Google, Stripe, etc."
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">
                  Target Job Role / Title <span className="text-rose-500">*</span>
                </span>
                <input
                  className="field"
                  value={form.jobRole}
                  onChange={(e) => setForm((c) => ({ ...c, jobRole: e.target.value }))}
                  placeholder="e.g. Software Engineer (L4)"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">
                  Job Description URL (Optional)
                </span>
                <input
                  className="field"
                  value={form.jobUrl}
                  onChange={(e) => setForm((c) => ({ ...c, jobUrl: e.target.value }))}
                  placeholder="https://careers.google.com/jobs/..."
                  type="url"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">
                  Personal Pitch Message (Optional)
                </span>
                <textarea
                  className="field min-h-20"
                  value={form.message}
                  onChange={(e) => setForm((c) => ({ ...c, message: e.target.value }))}
                  placeholder="Explain why you are a great fit for this role so they can refer you with confidence!"
                />
              </label>

              <div className="border-t border-slate-100 pt-3 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-700">Your Shared Profile Artifacts</h4>
                <p className="text-[11px] text-slate-500">
                  Confirm or update the links that will be shared with the referrer.
                </p>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold text-slate-500">Resume Link</span>
                    <input
                      className="field py-1 text-xs"
                      value={form.resumeUrl}
                      onChange={(e) => setForm((c) => ({ ...c, resumeUrl: e.target.value }))}
                      placeholder="https://drive.google.com/..."
                      type="url"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold text-slate-500">GitHub Link</span>
                    <input
                      className="field py-1 text-xs"
                      value={form.githubUrl}
                      onChange={(e) => setForm((c) => ({ ...c, githubUrl: e.target.value }))}
                      placeholder="https://github.com/..."
                      type="url"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold text-slate-500">LinkedIn Link</span>
                    <input
                      className="field py-1 text-xs"
                      value={form.linkedinUrl}
                      onChange={(e) => setForm((c) => ({ ...c, linkedinUrl: e.target.value }))}
                      placeholder="https://linkedin.com/in/..."
                      type="url"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold text-slate-500">Portfolio Link</span>
                    <input
                      className="field py-1 text-xs"
                      value={form.portfolioUrl}
                      onChange={(e) => setForm((c) => ({ ...c, portfolioUrl: e.target.value }))}
                      placeholder="https://..."
                      type="url"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
            <button
              className="btn-secondary py-1.5 px-4"
              type="button"
              onClick={onClose}
              disabled={createReferralMutation.isPending}
            >
              Cancel
            </button>
            <button
              className="btn-primary py-1.5 px-4"
              type="submit"
              disabled={createReferralMutation.isPending}
            >
              {createReferralMutation.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send size={14} />
              )}
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
