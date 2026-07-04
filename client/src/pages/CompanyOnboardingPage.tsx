import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../core/contexts/ToastContext";
import { useFileUpload } from "../features/storage/hooks/useFileUpload";

const recruiterSchema = z.object({
  companyId: z.string().uuid("Please select a valid company").optional().nullable(),
  companyName: z.string().trim().min(2, "Company name must be at least 2 characters"),
  businessEmail: z.string().trim().email("Please enter a valid business email"),
});

const claimSchema = z.object({
  companyId: z.string().uuid("Please select a valid company"),
  gstin: z.string().trim().min(15, "GSTIN must be 15 alphanumeric characters").max(15, "GSTIN must be 15 alphanumeric characters"),
  cin: z.string().trim().min(21, "CIN must be 21 alphanumeric characters").max(21, "CIN must be 21 alphanumeric characters"),
  businessEmail: z.string().trim().email("Please enter a valid business email"),
  corporateDoc: z.string().url("Please upload a valid document"),
});

type RecruiterFormValues = z.infer<typeof recruiterSchema>;
type ClaimFormValues = z.infer<typeof claimSchema>;

interface CompanyData {
  id: string;
  name: string;
  verified?: boolean;
}

export function CompanyOnboardingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { upload, uploading } = useFileUpload();

  const [activeTab, setActiveTab] = useState<"recruiter" | "claim">("recruiter");
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Recruiter flow state
  const [recruiterSuccess, setRecruiterSuccess] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");

  // KYC Claim state
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const {
    register: registerRecruiter,
    handleSubmit: handleRecruiterSubmit,
    setValue: setRecruiterValue,
    formState: { errors: recruiterErrors, isSubmitting: recruiterSubmitting },
  } = useForm<RecruiterFormValues>({
    resolver: zodResolver(recruiterSchema),
    defaultValues: {
      companyId: null,
      companyName: "",
      businessEmail: "",
    },
  });

  const {
    register: registerClaim,
    handleSubmit: handleClaimSubmit,
    setValue: setClaimValue,
    formState: { errors: claimErrors, isSubmitting: claimSubmitting },
  } = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      companyId: "",
      gstin: "",
      cin: "",
      businessEmail: "",
      corporateDoc: "",
    },
  });

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await api.companies();
        setCompanies((res.data.companies as CompanyData[]) || []);
      } catch (err) {
        console.error("Failed to load companies", err);
      }
    };
    fetchCompanies();
  }, []);

  const filteredCompanies = companies.filter((c: CompanyData) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onRecruiterSubmit = async (data: RecruiterFormValues) => {
    try {
      const res = await api.submitRecruiterOnboarding({
        companyId: data.companyId,
        companyName: data.companyName,
        businessEmail: data.businessEmail,
      });

      const responseData = res.data;
      if (responseData.requiresOtpVerification) {
        setShowOtpModal(true);
        showToast("success", responseData.message || "OTP verification required.");
      } else {
        setRecruiterSuccess(true);
        showToast("success", responseData.message || "Shadow company created & profile linked!");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast("error", msg || "Failed to process recruiter onboarding");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP code");
      return;
    }
    setOtpError("");
    setTimeout(() => {
      setShowOtpModal(false);
      setRecruiterSuccess(true);
      showToast("success", "OTP verified! Onboarding request is pending admin review.");
    }, 1500);
  };

  const onClaimSubmit = async (data: ClaimFormValues) => {
    try {
      await api.submitCompanyClaim(data.companyId, {
        gstin: data.gstin,
        cin: data.cin,
        businessEmail: data.businessEmail,
        corporateDoc: data.corporateDoc,
      });
      setClaimSuccess(true);
      showToast("success", "Corporate claim request submitted successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast("error", msg || "Failed to submit claim request");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      showToast("error", "Only PDF files are allowed for KYC verification");
      return;
    }

    setUploadedFileName(file.name);
    setUploadProgress(10);

    try {
      setUploadProgress(40);
      const result = await upload(file, "letterhead");
      setUploadProgress(100);
      setClaimValue("corporateDoc", result.fileUrl, { shouldValidate: true });
      showToast("success", "Document uploaded successfully");
    } catch (err) {
      setUploadProgress(null);
      setUploadedFileName(null);
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

        <div className="rounded-2xl border border-base bg-surface-2/50 p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-6">
          
          {/* Header tabs switcher */}
          <div className="flex border-b border-base text-xs">
            <button
              onClick={() => { setActiveTab("recruiter"); setRecruiterSuccess(false); setClaimSuccess(false); }}
              className={`pb-2 px-4 font-bold border-b-2 transition ${
                activeTab === "recruiter"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-muted-fg hover:text-primary"
              }`}
            >
              Recruiter License
            </button>
            <button
              onClick={() => { setActiveTab("claim"); setRecruiterSuccess(false); setClaimSuccess(false); }}
              className={`pb-2 px-4 font-bold border-b-2 transition ${
                activeTab === "claim"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-muted-fg hover:text-primary"
              }`}
            >
              Claim Company Page
            </button>
          </div>

          {activeTab === "recruiter" ? (
            /* Recruiter licensing form */
            recruiterSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto h-16 w-16 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/30 text-indigo-400 animate-bounce">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-xl font-bold text-primary">Application Received!</h3>
                <p className="text-xs text-secondary max-w-sm mx-auto">
                  Your request has been filed. If matching domain verification succeeds or a platform administrator approves your onboarding, you will gain access immediately.
                </p>
                <button
                  onClick={() => navigate("/business")}
                  className="btn-primary px-6 py-2 text-xs font-semibold"
                >
                  Return to Portal Selector
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecruiterSubmit(onRecruiterSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                    Target Corporate Brand
                  </label>
                  <input
                    type="text"
                    className="field pr-10"
                    placeholder="Search or type brand name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setRecruiterValue("companyName", e.target.value);
                      setRecruiterValue("companyId", null);
                    }}
                  />
                  {searchQuery.trim().length > 0 && filteredCompanies.length > 0 && (
                    <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-base bg-surface-3 shadow-2xl z-20 absolute w-[calc(100%-64px)] max-w-md">
                      {filteredCompanies.map((c: CompanyData) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setRecruiterValue("companyId", c.id, { shouldValidate: true });
                            setRecruiterValue("companyName", c.name, { shouldValidate: true });
                            setSearchQuery(c.name);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-secondary hover:bg-indigo-500/10 hover:text-primary transition flex justify-between"
                        >
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {recruiterErrors.companyName && (
                    <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle size={12} /> {recruiterErrors.companyName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                    Corporate Email Address
                  </label>
                  <input
                    type="email"
                    className="field"
                    placeholder="you@company.com"
                    {...registerRecruiter("businessEmail")}
                  />
                  {recruiterErrors.businessEmail && (
                    <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle size={12} /> {recruiterErrors.businessEmail.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={recruiterSubmitting}
                  className="btn-primary w-full py-2.5 mt-4 text-xs font-bold flex items-center justify-center gap-2"
                >
                  {recruiterSubmitting ? "Processing..." : "Submit Recruiter Request"}
                </button>
              </form>
            )
          ) : (
            /* Claim Page form */
            claimSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto h-16 w-16 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/30 text-indigo-400 animate-bounce">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-xl font-bold text-primary">KYC Submitted</h3>
                <p className="text-xs text-secondary max-w-sm mx-auto">
                  Our moderation team will audit the GSTIN/CIN records. You will be notified once verified.
                </p>
                <button
                  onClick={() => navigate("/business")}
                  className="btn-primary px-6 py-2 text-xs font-semibold"
                >
                  Return to Portal Selector
                </button>
              </div>
            ) : (
              <form onSubmit={handleClaimSubmit(onClaimSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                    Select Corporate Brand
                  </label>
                  <select
                    className="field select"
                    {...registerClaim("companyId")}
                  >
                    <option value="">-- Choose Brand to Claim --</option>
                    {companies.map((c: CompanyData) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {claimErrors.companyId && (
                    <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle size={12} /> {claimErrors.companyId.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    className="field uppercase"
                    maxLength={15}
                    placeholder="29AAAAA0000A1Z5"
                    {...registerClaim("gstin")}
                  />
                  {claimErrors.gstin && (
                    <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle size={12} /> {claimErrors.gstin.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                    CIN
                  </label>
                  <input
                    type="text"
                    className="field uppercase"
                    maxLength={21}
                    placeholder="L01110MH1993PLC072892"
                    {...registerClaim("cin")}
                  />
                  {claimErrors.cin && (
                    <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle size={12} /> {claimErrors.cin.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                    Work Email
                  </label>
                  <input
                    type="email"
                    className="field"
                    placeholder="admin@company.com"
                    {...registerClaim("businessEmail")}
                  />
                  {claimErrors.businessEmail && (
                    <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle size={12} /> {claimErrors.businessEmail.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                    KYC / Incorporation Document (PDF)
                  </label>
                  <div className="border-2 border-dashed border-base hover:border-indigo-500/50 rounded-xl p-6 text-center bg-surface-3/30 transition relative">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <div className="space-y-2">
                      <p className="text-xs text-primary font-semibold">
                        {uploadedFileName ? `Selected: ${uploadedFileName}` : "Select incorporation PDF"}
                      </p>
                    </div>
                  </div>
                  {uploadProgress !== null && (
                    <div className="space-y-1">
                      <div className="h-1 bg-surface-3 rounded overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={claimSubmitting || uploading}
                  className="btn-primary w-full py-2.5 mt-4 text-xs font-bold flex items-center justify-center gap-2"
                >
                  {claimSubmitting ? "Verifying..." : "Submit KYC Request"}
                </button>
              </form>
            )
          )}
        </div>
      </div>

      {showOtpModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-base bg-surface-3 p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-center">Verify Email OTP</h3>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input
                type="text"
                maxLength={6}
                className="field text-center tracking-widest text-lg font-extrabold focus:border-indigo-500"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/[^0-9]/g, ""))}
              />
              {otpError && <p className="text-xs text-rose-500 text-center">{otpError}</p>}
              <div className="flex gap-2">
                <button type="submit" className="btn-primary w-full py-2">Verify</button>
                <button type="button" onClick={() => setShowOtpModal(false)} className="btn-secondary px-4 py-2">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
