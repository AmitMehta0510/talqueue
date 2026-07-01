import { X, Send, Upload, Loader2 } from "lucide-react";

interface TpoInviteRecruitersModalProps {
  onClose: () => void;
  inviteEmailsText: string;
  setInviteEmailsText: (val: string) => void;
  inviteCompanyText: string;
  setInviteCompanyText: (val: string) => void;
  csvFile: File | null;
  parsedCsvInvites: Array<{ email: string; companyName: string }>;
  onCsvChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onManualMode: () => void;
  onCsvMode: () => void;
  onSendInvites: () => void;
  isSending: boolean;
}

export function TpoInviteRecruitersModal({
  onClose,
  inviteEmailsText,
  setInviteEmailsText,
  inviteCompanyText,
  setInviteCompanyText,
  csvFile,
  parsedCsvInvites,
  onCsvChange,
  onManualMode,
  onCsvMode,
  onSendInvites,
  isSending,
}: TpoInviteRecruitersModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-850 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150 dark:border-gray-855 bg-gray-50 dark:bg-gray-950/20">
          <h3 className="font-bold text-gray-955 dark:text-white flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-600" />
            Invite Corporate Recruiters
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-650 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="flex bg-gray-100 dark:bg-gray-950 p-1 rounded-xl">
            <button
              type="button"
              onClick={onManualMode}
              className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all ${
                !csvFile
                  ? "bg-white dark:bg-gray-850 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              Manual Form
            </button>
            <button
              type="button"
              onClick={onCsvMode}
              className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all ${
                csvFile
                  ? "bg-white dark:bg-gray-850 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              CSV Upload
            </button>
          </div>

          {!csvFile ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-750 dark:text-gray-300">Recruiter Emails</label>
                <textarea
                  placeholder="Enter email addresses (separated by commas or newlines)..."
                  value={inviteEmailsText}
                  onChange={(e) => setInviteEmailsText(e.target.value)}
                  rows={4}
                  className="w-full text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-400 text-gray-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-750 dark:text-gray-300">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Google India"
                  value={inviteCompanyText}
                  onChange={(e) => setInviteCompanyText(e.target.value)}
                  className="w-full text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-955 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-400 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-205 dark:border-gray-800 rounded-2xl p-6 text-center bg-gray-50/50 dark:bg-gray-955/10 hover:bg-gray-50 dark:hover:bg-gray-955/20 transition-colors">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-700 dark:text-gray-350">CSV Onboarding List</p>
                <p className="text-[10px] text-gray-400 mt-0.5" style={{ color: "var(--text-secondary)" }}>CSV must have column headers: email, companyName</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={onCsvChange}
                  className="mt-4 text-xs max-w-[200px] mx-auto text-gray-500"
                />
              </div>

              {parsedCsvInvites.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-350">Parsed Contacts ({parsedCsvInvites.length})</p>
                  <div className="border border-gray-150 dark:border-gray-85 rounded-xl overflow-hidden max-h-[200px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 dark:bg-gray-950 text-gray-500 font-bold border-b border-gray-150 dark:border-gray-85 border-base">
                        <tr>
                          <th className="px-4 py-2">Email</th>
                          <th className="px-4 py-2">Company</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 dark:divide-gray-85 bg-white dark:bg-gray-900">
                        {parsedCsvInvites.map((inv, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-gray-905 dark:text-white font-medium">{inv.email}</td>
                            <td className="px-4 py-2 text-gray-500">{inv.companyName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-150 dark:border-gray-850 bg-gray-50 dark:bg-gray-950/20 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-950 text-gray-700 dark:text-gray-300 font-semibold rounded-xl text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSendInvites}
            disabled={
              !!(
                isSending ||
                (!csvFile && (!inviteEmailsText || !inviteCompanyText)) ||
                (csvFile && parsedCsvInvites.length === 0)
              )
            }
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Send Invitations
          </button>
        </div>
      </div>
    </div>
  );
}
