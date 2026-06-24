import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Building2,
  Mail,
  FileText,
  Upload,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  UserCheck,
  Building,
  Check,
} from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../contexts/ToastContext";
import { useFileUpload } from "../hooks/useFileUpload";

// --- VALIDATION SCHEMAS (Client-side mirror of server schemas) ---
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

export function BusinessOnboardingPage() {
  const { showToast } = useToast();
  const { upload, uploading } = useFileUpload();
  const [activeFunnel, setActiveFunnel] = useState<"recruiter" | "claim" | null>(null);
  
  // Autocomplete / Company list state
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Recruiter flow state
  const [recruiterSuccess, setRecruiterSuccess] = useState(false);
  const [otpRequestId, setOtpRequestId] = useState<string | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");

  // KYC Claim state
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Form hooks
  const {
    register: registerRecruiter,
    handleSubmit: handleRecruiterSubmit,
    setValue: setRecruiterValue,
    watch: watchRecruiter,
    formState: { errors: recruiterErrors, isSubmitting: recruiterSubmitting },
    reset: resetRecruiter,
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
    watch: watchClaim,
    formState: { errors: claimErrors, isSubmitting: claimSubmitting },
    reset: resetClaim,
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

  // Watchers
  const watchedCompanyName = watchRecruiter("companyName");
  const watchedCorporateDoc = watchClaim("corporateDoc");

  // Fetch companies for dropdown/selection
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const res = await api.companies();
        setCompanies(res.data.companies || []);
      } catch (err) {
        console.error("Failed to load companies", err);
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);

  // Filter companies matching search query
  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Recruiter Access Submission Handler
  const onRecruiterSubmit = async (data: RecruiterFormValues) => {
    try {
      const res = await api.submitRecruiterOnboarding({
        companyId: data.companyId,
        companyName: data.companyName,
        businessEmail: data.businessEmail,
      });

      const responseData = res.data;
      if (responseData.requiresOtpVerification) {
        setOtpRequestId(responseData.requestId);
        setShowOtpModal(true);
        showToast("success", responseData.message || "OTP verification required.");
      } else {
        setRecruiterSuccess(true);
        showToast("success", responseData.message || "Shadow company created & profile linked!");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to process recruiter onboarding");
    }
  };

  // OTP Verification Handler
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP code");
      return;
    }

    setVerifyingOtp(true);
    setOtpError("");

    // Simulate OTP server validation delay
    setTimeout(() => {
      setVerifyingOtp(false);
      setShowOtpModal(false);
      setRecruiterSuccess(true);
      showToast("success", "OTP verified! Onboarding request is pending admin review.");
    }, 1500);
  };

  // KYC Claim Submission Handler
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
    } catch (err: any) {
      showToast("error", err?.message || "Failed to submit claim request");
    }
  };

  // KYC Document S3 Upload Handler
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
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#0f0e2e] rounded-full blur-[120px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-950 rounded-full blur-[120px] opacity-35 pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl z-10 space-y-8">
        
        {/* Page Header */}
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Sparkles size={12} /> B2B SaaS Enterprise Portal
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
            Engineering Platform <span className="text-indigo-400">For Business</span>
          </h1>
          <p className="max-w-2xl mx-auto text-sm text-secondary">
            Select your path to request corporate access, recruit verified engineering talent, or claim ownership of your brand.
          </p>
        </div>

        {/* Funnel Selection Split Grid */}
        {activeFunnel === null ? (
          <div className="grid gap-6 md:grid-cols-2 mt-8">
            
            {/* Card 1: Recruiter access */}
            <button
              onClick={() => setActiveFunnel("recruiter")}
              className="group text-left p-8 rounded-2xl border border-base bg-surface-2/40 hover:border-indigo-500/50 hover:bg-[#11102a]/30 transition-all duration-500 relative overflow-hidden flex flex-col justify-between h-80 shadow-2xl"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <UserCheck size={120} className="text-indigo-400" />
              </div>
              <div className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <UserCheck size={24} />
                </div>
                <h3 className="text-2xl font-bold text-primary group-hover:text-indigo-400 transition-colors">
                  Recruiter Access Console
                </h3>
                <p className="text-sm text-secondary leading-relaxed">
                  Join an existing company or create a shadow brand workspace. Post jobs, invite colleges, and evaluate candidates in a dedicated pipeline.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400 group-hover:translate-x-1 transition-transform">
                Get Recruiter License &rarr;
              </span>
            </button>

            {/* Card 2: Company Claim */}
            <button
              onClick={() => setActiveFunnel("claim")}
              className="group text-left p-8 rounded-2xl border border-base bg-surface-2/40 hover:border-indigo-500/50 hover:bg-[#161a35]/30 transition-all duration-500 relative overflow-hidden flex flex-col justify-between h-80 shadow-2xl"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Building2 size={120} className="text-indigo-400" />
              </div>
              <div className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Building2 size={24} />
                </div>
                <h3 className="text-2xl font-bold text-primary group-hover:text-indigo-400 transition-colors">
                  Claim Page Ownership
                </h3>
                <p className="text-sm text-secondary leading-relaxed">
                  Verify business credentials (GSTIN/CIN) and secure global administrative authority. Manage offices, configure department scopes, and assign recruiters.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400 group-hover:translate-x-1 transition-transform">
                Submit KYC & Claim Page &rarr;
              </span>
            </button>

          </div>
        ) : (
          /* Interactive Form Funnels */
          <div className="w-full max-w-2xl mx-auto">
            
            {/* Back Button */}
            <button
              onClick={() => {
                setActiveFunnel(null);
                setRecruiterSuccess(false);
                setClaimSuccess(false);
                resetRecruiter();
                resetClaim();
                setUploadedFileName(null);
                setUploadProgress(null);
              }}
              className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-fg hover:text-primary transition"
            >
              &larr; Back to select account path
            </button>

            {/* FUNNEL: RECRUITER ONBOARDING */}
            {activeFunnel === "recruiter" && (
              <div className="rounded-2xl border border-base bg-surface-2/50 p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-6">
                
                <div className="flex items-center gap-3 border-b border-base pb-4">
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/25">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-primary">Recruiter License Registration</h2>
                    <p className="text-xs text-muted-fg">Provide company credentials to request Recruiter privileges.</p>
                  </div>
                </div>

                {recruiterSuccess ? (
                  <div className="py-8 text-center space-y-4">
                    <div className="mx-auto h-16 w-16 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/30 text-indigo-400 animate-bounce">
                      <CheckCircle2 size={36} />
                    </div>
                    <h3 className="text-xl font-bold text-primary">Application Received!</h3>
                    <p className="text-xs text-secondary max-w-sm mx-auto">
                      Your request has been filed. If matching domain verification succeeds or a platform administrator approves your onboarding, you will gain access immediately.
                    </p>
                    <button
                      onClick={() => {
                        setActiveFunnel(null);
                        setRecruiterSuccess(false);
                      }}
                      className="btn-primary px-6 py-2 text-xs font-semibold"
                    >
                      Return to Business Portal
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRecruiterSubmit(onRecruiterSubmit)} className="space-y-4">
                    
                    {/* Autocomplete / Select Company */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                        Target Corporate Brand
                      </label>
                      
                      <div className="relative">
                        <input
                          type="text"
                          className="field pr-10"
                          placeholder="Type to search existing company or input custom brand..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setRecruiterValue("companyName", e.target.value);
                            setRecruiterValue("companyId", null); // Custom company input resets UUID
                          }}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-fg">
                          {loadingCompanies ? <Loader2 size={16} className="animate-spin" /> : <Building size={16} />}
                        </div>
                      </div>

                      {/* Dropdown Suggestions */}
                      {searchQuery.trim().length > 0 && filteredCompanies.length > 0 && (
                        <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-base bg-surface-3 shadow-2xl z-20 absolute w-[calc(100%-2px)] max-w-md">
                          {filteredCompanies.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setRecruiterValue("companyId", c.id, { shouldValidate: true });
                                setRecruiterValue("companyName", c.name, { shouldValidate: true });
                                setSearchQuery(c.name);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-secondary hover:bg-indigo-500/10 hover:text-primary transition flex items-center justify-between"
                            >
                              <span>{c.name}</span>
                              <span className="text-[9px] font-bold bg-surface-3 border border-base text-muted-fg px-1 rounded">MATCH</span>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-[10px] text-muted-fg mt-1">
                        {watchRecruiter("companyId") 
                          ? `✓ Selected existing brand: ${watchRecruiter("companyName")}`
                          : watchedCompanyName 
                            ? `⚡ Brand not in directory. We'll set up a Shadow Workspace for: "${watchedCompanyName}"`
                            : "Select from the list or type a brand name to register."
                        }
                      </p>
                      
                      {recruiterErrors.companyName && (
                        <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                           <AlertCircle size={12} /> {recruiterErrors.companyName.message}
                        </p>
                      )}
                    </div>

                    {/* Business Email */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                        Corporate Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          className="field pl-9"
                          placeholder="you@company.com"
                          {...registerRecruiter("businessEmail")}
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-fg">
                          <Mail size={15} />
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-fg font-medium mt-1">Use your corporate domain. Matching domains will bypass admin reviews.</p>
                      {recruiterErrors.businessEmail && (
                        <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                          <AlertCircle size={12} /> {recruiterErrors.businessEmail.message}
                        </p>
                      )}
                    </div>

                    {/* Submit Recruiter */}
                    <button
                      type="submit"
                      disabled={recruiterSubmitting}
                      className="btn-primary w-full py-2.5 mt-4 text-xs font-bold flex items-center justify-center gap-2"
                    >
                      {recruiterSubmitting ? (
                        <>
                          <Loader2 size={15} className="animate-spin" /> Processing Access...
                        </>
                      ) : (
                        <>
                          <Lock size={14} /> Submit Recruiter Request
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* FUNNEL: KYC CLAIM PAGE */}
            {activeFunnel === "claim" && (
              <div className="rounded-2xl border border-base bg-surface-2/50 p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-6">
                
                <div className="flex items-center gap-3 border-b border-base pb-4">
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/25">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-primary">Claim Corporate Brand Page</h2>
                    <p className="text-xs text-muted-fg">Register business identifiers and KYC documents to claim ownership.</p>
                  </div>
                </div>

                {claimSuccess ? (
                  <div className="py-8 text-center space-y-4">
                    <div className="mx-auto h-16 w-16 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/30 text-indigo-400 animate-bounce">
                      <CheckCircle2 size={36} />
                    </div>
                    <h3 className="text-xl font-bold text-primary">KYC Submitted Successfully</h3>
                    <p className="text-xs text-secondary max-w-sm mx-auto">
                      Our moderation team will audit the GSTIN, CIN records, and files. You'll receive a system notification once global administrative access is assigned.
                    </p>
                    <button
                      onClick={() => {
                        setActiveFunnel(null);
                        setClaimSuccess(false);
                      }}
                      className="btn-primary bg-indigo-650 hover:bg-indigo-500 text-white px-6 py-2 text-xs font-semibold"
                    >
                      Return to Business Portal
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleClaimSubmit(onClaimSubmit)} className="space-y-4">
                    
                    {/* Select Brand (Must select an existing one to claim) */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                        Select Corporate Brand Page
                      </label>
                      <select
                        className="field select"
                        {...registerClaim("companyId")}
                      >
                        <option value="">-- Choose Brand to Claim --</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.verified ? "Verified" : "Unverified Shadow Page"})
                          </option>
                        ))}
                      </select>
                      {claimErrors.companyId && (
                        <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                          <AlertCircle size={12} /> {claimErrors.companyId.message}
                        </p>
                      )}
                    </div>

                    {/* GSTIN */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                        GSTIN (15 Alphanumeric Characters)
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

                    {/* CIN */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                        CIN (21 Alphanumeric Characters)
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

                    {/* Business Email */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                        Brand Admin Work Email
                      </label>
                      <input
                        type="email"
                        className="field"
                        placeholder="admin@brand.com"
                        {...registerClaim("businessEmail")}
                      />
                      {claimErrors.businessEmail && (
                        <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                          <AlertCircle size={12} /> {claimErrors.businessEmail.message}
                        </p>
                      )}
                    </div>

                    {/* KYC Document Picker (S3 Upload link simulation) */}
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
                          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-surface-3 text-muted-fg">
                            {uploading ? <Loader2 size={18} className="animate-spin text-indigo-400" /> : <Upload size={18} />}
                          </div>
                          <p className="text-xs text-primary font-semibold">
                            {uploadedFileName ? `Selected: ${uploadedFileName}` : "Click or drag to select PDF Document"}
                          </p>
                          <p className="text-[10px] text-muted-fg">Max file size: 10MB. Document must confirm GSTIN/CIN.</p>
                        </div>
                      </div>

                      {/* File Upload Progress */}
                      {uploadProgress !== null && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-muted-fg font-semibold">
                            <span>{uploadProgress < 105 ? "Uploading to Cloud..." : "Upload Completed"}</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Hidden Validation Input for Form Hook */}
                      <input type="hidden" {...registerClaim("corporateDoc")} />

                      {claimErrors.corporateDoc && (
                        <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                          <AlertCircle size={12} /> Document upload is required for verification.
                        </p>
                      )}
                    </div>

                    {/* Submit Claim */}
                    <button
                      type="submit"
                      disabled={claimSubmitting || uploading}
                      className="btn-primary bg-indigo-600 hover:bg-indigo-500 text-white w-full py-2.5 mt-4 text-xs font-bold flex items-center justify-center gap-2 transition"
                    >
                      {claimSubmitting ? (
                        <>
                          <Loader2 size={15} className="animate-spin" /> Verifying Identifiers...
                        </>
                      ) : (
                        <>
                          <Lock size={14} /> Submit KYC Verification
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {/* OTP MODAL OVERLAY */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-base bg-surface-3 p-6 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Lock size={20} className="animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-primary">Enter Verification Code</h3>
              <p className="text-xs text-muted-fg">
                A 6-digit verification code was generated. Please input it to confirm access.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <input
                  type="text"
                  maxLength={6}
                  className="field text-center tracking-widest text-lg font-extrabold focus:border-indigo-500"
                  placeholder="000000"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/[^0-9]/g, ""))}
                  required
                />
                {otpError && (
                  <p className="text-xs text-rose-500 text-center flex items-center justify-center gap-1 mt-1">
                    <AlertCircle size={12} /> {otpError}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={verifyingOtp}
                  className="btn-primary w-full py-2 text-xs font-bold flex items-center justify-center gap-2"
                >
                  {verifyingOtp ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Verifying...
                    </>
                  ) : (
                    "Verify OTP Code"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpModal(false);
                    setOtpValue("");
                    setOtpError("");
                  }}
                  className="rounded-lg border border-base px-4 py-2 text-xs text-muted-fg hover:text-primary transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
