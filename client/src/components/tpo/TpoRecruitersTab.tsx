import { Users, Send, Upload, Building2 } from "lucide-react";
import { InlineLoader, ErrorState } from "../ui";

interface RecruiterInteraction {
  id: string;
  officeCity?: string | null;
  user?: {
    profile?: {
      fullName?: string | null;
      avatarUrl?: string | null;
    } | null;
  } | null;
  company?: {
    name: string;
    logoUrl?: string | null;
    industry?: string | null;
  } | null;
}

interface TpoRecruitersTabProps {
  recruiters: RecruiterInteraction[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onOpenInviteForm: () => void;
  onOpenCsvUpload: () => void;
}

export function TpoRecruitersTab({
  recruiters,
  isLoading,
  isError,
  onOpenInviteForm,
  onOpenCsvUpload,
}: TpoRecruitersTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left outreach controls (2 cols) */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-800 p-8 rounded-2xl shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-gray-955 dark:text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              Corporate Network Growth
            </h3>
            <p className="text-sm text-gray-500 mt-1.5" style={{ color: "var(--text-secondary)" }}>
              Connect with recruiters by sending them official invitations. When they sign up using their corporate email domain, they automatically claim their company profile, take ownership of pre-scraped job listings, and link to your college for campus placements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="border border-gray-200 dark:border-gray-800 p-6 rounded-2xl bg-gray-50/50 dark:bg-gray-955/10 space-y-4">
              <div className="h-10 w-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-650 dark:text-blue-400">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">Quick Single/Batch Invite</h4>
                <p className="text-xs text-gray-500 mt-1" style={{ color: "var(--text-secondary)" }}>Invite recruiters directly by entering their email address and company name.</p>
              </div>
              <button
                onClick={onOpenInviteForm}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors shadow-sm"
              >
                Open Invite Form
              </button>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 p-6 rounded-2xl bg-gray-50/50 dark:bg-gray-955/10 space-y-4">
              <div className="h-10 w-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-650 dark:text-green-400">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">Bulk CSV Upload</h4>
                <p className="text-xs text-gray-500 mt-1" style={{ color: "var(--text-secondary)" }}>Upload a CSV list of recruiter emails and company names for automated batch onboarding.</p>
              </div>
              <button
                onClick={onOpenCsvUpload}
                className="w-full bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors border border-transparent dark:border-gray-700 shadow-sm"
              >
                Upload CSV File
              </button>
            </div>
          </div>

          <div className="border-t border-gray-150 dark:border-gray-850 pt-6 space-y-4">
            <h4 className="font-bold text-gray-905 dark:text-white text-sm">How the onboarding loop works:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-500">
              <div className="space-y-1">
                <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <span className="h-5 w-5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-extrabold text-[10px]">1</span>
                  TPO Invites
                </div>
                <p style={{ color: "var(--text-secondary)" }}>You send a customized claim invitation containing a secure registration link to the recruiter's official business email.</p>
              </div>
              <div className="space-y-1">
                <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <span className="h-5 w-5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-extrabold text-[10px]">2</span>
                  Self-Claim Profile
                </div>
                <p style={{ color: "var(--text-secondary)" }}>Recruiter registers. Our backend checks the email domain against the company domain, auto-verifying and assigning privileges.</p>
              </div>
              <div className="space-y-1">
                <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <span className="h-5 w-5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-extrabold text-[10px]">3</span>
                  Pre-scraped Jobs
                </div>
                <p style={{ color: "var(--text-secondary)" }}>Pre-scraped job postings are automatically linked to the recruiter's dashboard, ready for campus placement drive scheduling.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connected recruiters list (1 col) */}
      <div className="space-y-4">
        <div className="border border-gray-255 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-650" />
              Recruiter Network ({recruiters?.length || 0})
            </h3>
            <p className="text-xs text-gray-500 mt-0.5" style={{ color: "var(--text-secondary)" }}>Recruiters currently associated with your campus placement catalog.</p>
          </div>

          {isLoading ? (
            <InlineLoader label="Loading connections..." />
          ) : isError ? (
            <ErrorState title="Failed to fetch recruiters" />
          ) : !recruiters || recruiters.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">No active recruiter connections. Start by sending invitations!</div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {recruiters.map((recruiter) => (
                <div
                  key={recruiter.id}
                  className="p-3 border border-gray-150 dark:border-gray-855 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-955/20 transition-all flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 bg-gray-50 border border-gray-150 dark:border-gray-850 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                      {recruiter.company?.logoUrl ? (
                        <img src={recruiter.company.logoUrl} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <Building2 className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white truncate">
                        {recruiter.user?.profile?.fullName || "Recruiter"}
                      </p>
                      <p className="text-[10px] text-gray-450 dark:text-gray-400 truncate">
                        {recruiter.company?.name} {recruiter.officeCity ? `• ${recruiter.officeCity}` : "• Remote"}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 bg-gray-50 dark:bg-gray-950 border border-gray-150 dark:border-gray-850 rounded-full font-medium text-[10px]">
                    {recruiter.company?.industry || "Tech"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
