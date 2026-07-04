import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  GraduationCap,
} from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../core/contexts/ToastContext";
import { useFileUpload } from "../features/storage/hooks/useFileUpload";

const tpoSchema = z.object({
  collegeName: z.string().trim().min(3, "College name must be at least 3 characters"),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
  website: z.string().trim().url("Please enter a valid website URL").optional().or(z.literal("")),
  aisheCode: z.string().trim().optional(),
  officialEmail: z.string().trim().email("Please enter a valid official institutional email"),
  authorityLetterheadDoc: z.string().url("Please upload authorization document").optional().or(z.literal("")),
});

type TpoFormValues = z.infer<typeof tpoSchema>;

export function InstitutionOnboardingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { upload, uploading } = useFileUpload();

  const [tpoSuccess, setTpoSuccess] = useState(false);
  const [tpoUploadedFileName, setTpoUploadedFileName] = useState<string | null>(null);
  const [tpoUploadProgress, setTpoUploadProgress] = useState<number | null>(null);
  
  // 3-step TPO OTP flow
  const [tpoStep, setTpoStep] = useState<1 | 2 | 3>(1);
  const [tpoInitiating, setTpoInitiating] = useState(false);
  const [tpoOtpValue, setTpoOtpValue] = useState("");
  const [tpoOtpError, setTpoOtpError] = useState("");
  const [tpoVerifying, setTpoVerifying] = useState(false);

  // Future-proofing for other institution flows (e.g. CDCR)
  const [activeTab, setActiveTab] = useState<"tpo" | "cdcr">("tpo");

  const {
    register: registerTpo,
    handleSubmit: handleTpoSubmit,
    setValue: setTpoValue,
    watch: watchTpo,
    formState: { errors: tpoErrors },
    reset: resetTpo,
  } = useForm<TpoFormValues>({
    resolver: zodResolver(tpoSchema),
    defaultValues: {
      collegeName: "",
      city: "",
      state: "",
      country: "India",
      website: "",
      aisheCode: "",
      officialEmail: "",
      authorityLetterheadDoc: "",
    },
  });

  const onTpoInitiate = async (data: TpoFormValues) => {
    setTpoInitiating(true);
    try {
      await api.tpoClaimInitiate({
        officialEmail: data.officialEmail,
        collegeName: data.collegeName,
      });
      setTpoStep(2);
      showToast("success", `OTP sent to ${data.officialEmail} — check your institutional inbox.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast("error", msg || "Failed to send OTP — verify your institutional email.");
    } finally {
      setTpoInitiating(false);
    }
  };

  const onTpoVerifyAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tpoOtpValue.length !== 6) {
      setTpoOtpError("Please enter the 6-digit OTP sent to your email.");
      return;
    }
    setTpoVerifying(true);
    setTpoOtpError("");
    const data = watchTpo();
    try {
      await api.tpoClaimVerify({
        officialEmail: data.officialEmail,
        collegeName: data.collegeName,
        otp: tpoOtpValue,
        city: data.city || undefined,
        state: data.state || undefined,
        country: data.country || undefined,
        website: data.website || undefined,
        aisheCode: data.aisheCode || undefined,
        authorityLetterheadDoc: data.authorityLetterheadDoc || undefined,
      });
      setTpoSuccess(true);
      setTpoStep(3);
      showToast("success", "OTP verified! College onboarding request submitted to admin queue.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("otp") || msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("expired")) {
        setTpoOtpError(msg);
      } else {
        showToast("error", msg);
      }
    } finally {
      setTpoVerifying(false);
    }
  };

  const handleTpoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      showToast("error", "Only PDF files are allowed for authorization letters");
      return;
    }

    setTpoUploadedFileName(file.name);
    setTpoUploadProgress(10);

    try {
      setTpoUploadProgress(40);
      const result = await upload(file, "letterhead");
      setTpoUploadProgress(100);
      setTpoValue("authorityLetterheadDoc", result.fileUrl, { shouldValidate: true });
      showToast("success", "Authorization letter uploaded successfully");
    } catch (err) {
      setTpoUploadProgress(null);
      setTpoUploadedFileName(null);
      showToast("error", err instanceof Error ? err.message : "Failed to upload document");
    }
  };

  return (
    <div className="min-h-screen bg-surface text-primary flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-950 rounded-full blur-[120px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-950 rounded-full blur-[120px] opacity-35 pointer-events-none" />

      <div className="w-full max-w-2xl z-10 space-y-6">
        
        {/* Back Button */}
        <button
          onClick={() => navigate("/business")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-fg hover:text-primary transition"
        >
          &larr; Back to select account path
        </button>

        {/* FUNNEL: TPO ONBOARDING */}
        <div className="rounded-2xl border border-base bg-surface-2/50 p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-6">
          
          <div className="flex items-center gap-3 border-b border-base pb-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/25">
              <GraduationCap size={20} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-primary">TPO Institutional Onboarding</h2>
              <p className="text-xs text-muted-fg">3-step verified onboarding: details → email OTP → submit.</p>
            </div>
            {!tpoSuccess && (
              <div className="flex items-center gap-1.5">
                {([1, 2, 3] as const).map((s) => (
                  <div
                    key={s}
                    className={`h-2 w-2 rounded-full transition-all duration-300 ${
                      s < tpoStep ? "bg-indigo-500" :
                      s === tpoStep ? "bg-indigo-400 ring-2 ring-indigo-400/30" :
                      "bg-surface-3"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sub-selector for Future CDCR integration */}
          <div className="flex border-b border-base text-xs">
            <button
              onClick={() => setActiveTab("tpo")}
              className={`pb-2 px-4 font-bold border-b-2 transition ${
                activeTab === "tpo"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-muted-fg hover:text-primary"
              }`}
            >
              TPO Coordinator
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cdcr")}
              disabled
              className="pb-2 px-4 text-muted-fg opacity-40 cursor-not-allowed font-medium"
            >
              CDCR Representative (Coming Soon)
            </button>
          </div>

          {tpoSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto h-16 w-16 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/30 text-indigo-400 animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-xl font-bold text-primary">Onboarding Request Filed!</h3>
              <p className="text-xs text-secondary max-w-sm mx-auto">
                Your OTP-verified institutional claim has been queued for admin review.
                Once approved, you will receive TPO coordinator access and can manage campus drives.
              </p>
              <button
                onClick={() => {
                  setTpoSuccess(false);
                  resetTpo();
                  setTpoStep(1);
                  setTpoOtpValue("");
                  navigate("/business");
                }}
                className="btn-primary px-6 py-2 text-xs font-semibold"
              >
                Return to Portal Selector
              </button>
            </div>

          ) : tpoStep === 1 ? (
            <form onSubmit={handleTpoSubmit(onTpoInitiate)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                  College / Institution Name
                </label>
                <input
                  type="text"
                  className="field"
                  placeholder="e.g. Indian Institute of Technology Delhi"
                  {...registerTpo("collegeName")}
                />
                {tpoErrors.collegeName && (
                  <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle size={12} /> {tpoErrors.collegeName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                  Official Institutional Email
                  <span className="ml-2 text-[9px] normal-case font-normal text-indigo-400">(OTP will be sent here)</span>
                </label>
                <input
                  type="email"
                  className="field"
                  placeholder="tpo@college.edu.in"
                  {...registerTpo("officialEmail")}
                />
                {tpoErrors.officialEmail && (
                  <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle size={12} /> {tpoErrors.officialEmail.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary">City</label>
                  <input type="text" className="field" placeholder="Delhi" {...registerTpo("city")} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary">State</label>
                  <input type="text" className="field" placeholder="Delhi" {...registerTpo("state")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary">Institutional Website</label>
                  <input type="text" className="field" placeholder="https://college.edu.in" {...registerTpo("website")} />
                  {tpoErrors.website && (
                    <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle size={12} /> {tpoErrors.website.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary">AISHE Code (Optional)</label>
                  <input type="text" className="field uppercase" placeholder="C-12345" {...registerTpo("aisheCode")} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                  Authorization / Appointment Letterhead (PDF)
                </label>
                <div className="border-2 border-dashed border-base hover:border-indigo-500/50 rounded-xl p-6 text-center bg-surface-3/30 transition relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleTpoFileUpload}
                    disabled={uploading}
                  />
                  <div className="space-y-2">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-surface-3 text-muted-fg">
                      {uploading ? <Loader2 size={18} className="animate-spin text-indigo-400" /> : <Upload size={18} />}
                    </div>
                    <p className="text-xs text-primary font-semibold">
                      {tpoUploadedFileName ? `Selected: ${tpoUploadedFileName}` : "Click or drag to select Authorization PDF"}
                    </p>
                    <p className="text-[10px] text-muted-fg">Upload signed/stamped declaration on college letterhead.</p>
                  </div>
                </div>
                {tpoUploadProgress !== null && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-muted-fg font-semibold">
                      <span>{tpoUploadProgress < 105 ? "Uploading to Cloud..." : "Upload Completed"}</span>
                      <span>{tpoUploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${tpoUploadProgress}%` }} />
                    </div>
                  </div>
                )}
                <input type="hidden" {...registerTpo("authorityLetterheadDoc")} />
              </div>

              <button
                type="submit"
                disabled={tpoInitiating || uploading}
                className="btn-primary bg-indigo-600 hover:bg-indigo-500 text-white w-full py-2.5 mt-4 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                {tpoInitiating ? (
                  <><Loader2 size={15} className="animate-spin" /> Sending OTP...</>
                ) : (
                  <><Mail size={14} /> Send Verification OTP &rarr;</>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                <p className="text-xs font-bold text-primary">Check your institutional inbox</p>
                <p className="text-xs text-muted-fg mt-0.5">
                  A 6-digit OTP was sent to <span className="font-bold text-indigo-400">{watchTpo("officialEmail")}</span>.
                </p>
              </div>

              <form onSubmit={onTpoVerifyAndSubmit} className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  className="field text-center tracking-widest text-lg font-extrabold focus:border-indigo-500"
                  placeholder="000000"
                  value={tpoOtpValue}
                  onChange={(e) => { setTpoOtpValue(e.target.value.replace(/[^0-9]/g, "")); setTpoOtpError(""); }}
                />
                {tpoOtpError && (
                  <p className="text-xs text-rose-500 text-center flex items-center justify-center gap-1">
                    <AlertCircle size={12} /> {tpoOtpError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={tpoVerifying || tpoOtpValue.length !== 6}
                  className="btn-primary bg-indigo-600 hover:bg-indigo-500 text-white w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition"
                >
                  {tpoVerifying ? "Verifying..." : "Verify & Submit"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
