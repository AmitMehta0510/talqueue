import { useState } from "react";
import { ExternalLink, CheckCircle, ArrowRight, X, Globe } from "lucide-react";
import { Job } from "../../lib/api";
import { useCreateExternalApplicationMutation } from "../../hooks/usePlatformQueries";

interface ExternalApplyModalProps {
  job: Job;
  onClose: () => void;
}

export function ExternalApplyModal({ job, onClose }: ExternalApplyModalProps) {
  const [step, setStep] = useState<"confirm" | "success">("confirm");
  const [notes, setNotes] = useState("");
  const createExternal = useCreateExternalApplicationMutation();

  const handleDidApply = async () => {
    // Open external URL
    if (job.applyUrl) {
      window.open(job.applyUrl, "_blank", "noopener,noreferrer");
    }

    // Track the application
    try {
      await createExternal.mutateAsync({
        jobId: job.id,
        jobTitle: job.title || "Unknown Position",
        companyName: job.company?.name || "Unknown Company",
        companyLogoUrl: job.company?.logoUrl || undefined,
        applyUrl: job.applyUrl || undefined,
        location: job.location || undefined,
        jobType: job.type || undefined,
        status: "APPLIED",
        notes: notes.trim() || undefined,
      });
    } catch {
      // Error already toasted
    }
    setStep("success");
  };

  const handleJustBrowse = () => {
    if (job.applyUrl) {
      window.open(job.applyUrl, "_blank", "noopener,noreferrer");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-snug">External Application</h2>
              <p className="text-xs text-blue-100 mt-0.5 truncate max-w-[200px]">
                {job.title} · {job.company?.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/20 transition"
          >
            <X size={15} />
          </button>
        </div>

        {step === "confirm" ? (
          <div className="px-6 py-6 space-y-5">
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3.5">
              <p className="text-sm font-semibold text-amber-800">
                You're about to apply on the company's website
              </p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                This job is managed externally. We can't auto-track your application status — but you can log it here and update the progress manually.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Notes (optional)
              </label>
              <textarea
                className="field w-full text-sm resize-none"
                rows={2}
                placeholder="e.g. Applied via LinkedIn referral, follow up in 2 weeks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleDidApply}
                disabled={createExternal.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {createExternal.isPending ? (
                  "Tracking..."
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Yes, I'm applying — track this
                    <ExternalLink size={14} className="ml-auto opacity-60" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleJustBrowse}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                <ArrowRight size={16} />
                Just browse — don't track
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border-2 border-emerald-200">
              <CheckCircle size={32} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Application tracked!</h3>
              <p className="text-sm text-slate-500 mt-1">
                It's been added to your Applications tracker. Update the status as you progress through rounds.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
