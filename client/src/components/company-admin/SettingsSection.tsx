import { FormEvent } from "react";
import { Settings, Building2, Loader2 } from "lucide-react";

interface SettingsFormState {
  name: string;
  tagline: string;
  description: string;
  headquarters: string;
  industry: string;
  websiteUrl: string;
  careersPageUrl: string;
  logoUrl: string;
  coverImageUrl: string;
  githubUrl: string;
  foundedYear: string;
  type: string;
  size: string;
  hiringEnabled: boolean;
  referralEnabled: boolean;
}

interface SettingsSectionProps {
  settingsForm: SettingsFormState;
  onUpdateSetting: (key: string, value: any) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingLogo: boolean;
  onCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingCover: boolean;
  onSubmitSettings: (e: FormEvent) => void;
  isPending: boolean;
}

export function SettingsSection({
  settingsForm,
  onUpdateSetting,
  onLogoUpload,
  uploadingLogo,
  onCoverUpload,
  uploadingCover,
  onSubmitSettings,
  isPending,
}: SettingsSectionProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-sm font-bold flex items-center gap-1.5 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          <Settings size={14} className="text-indigo-500" />
          Company Profile Settings
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>Update branding details, media covers, and recruitment coordinates.</p>
      </div>

      <form onSubmit={onSubmitSettings} className="space-y-6">
        {/* Media Uploads Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Logo Picker */}
          <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
            <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Company Logo</label>
            <div className="flex items-center gap-4">
              {settingsForm.logoUrl ? (
                <img src={settingsForm.logoUrl} alt="Logo" className="h-16 w-16 rounded-xl object-contain border p-1" style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)" }} />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-600/30">
                  <Building2 size={24} className="text-indigo-400" />
                </div>
              )}
              <label className="relative cursor-pointer btn-secondary text-xs px-3 py-2">
                {uploadingLogo ? (
                  <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin text-indigo-500" /> Uploading...</span>
                ) : (
                  "Choose Logo"
                )}
                <input type="file" accept="image/*" onChange={onLogoUpload} disabled={uploadingLogo || isPending} className="hidden" />
              </label>
            </div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Supported formats: JPG, PNG, GIF. Max file size: 2MB.</p>
          </div>

          {/* Cover Image Picker */}
          <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
            <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Cover Banner</label>
            <div className="flex flex-col gap-3">
              {settingsForm.coverImageUrl ? (
                <img src={settingsForm.coverImageUrl} alt="Cover" className="h-16 w-full rounded-xl object-cover border" style={{ borderColor: "var(--border)" }} />
              ) : (
                <div className="h-16 w-full rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-700/20 border border-indigo-600/30 flex items-center justify-center text-xs text-indigo-400 font-semibold">
                  No Cover Banner Uploaded
                </div>
              )}
              <label className="self-start relative cursor-pointer btn-secondary text-xs px-3 py-2">
                {uploadingCover ? (
                  <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin text-indigo-500" /> Uploading...</span>
                ) : (
                  "Choose Cover Banner"
                )}
                <input type="file" accept="image/*" onChange={onCoverUpload} disabled={uploadingCover || isPending} className="hidden" />
              </label>
            </div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Aspect ratio: 4:1 recommended. Supported formats: JPG, PNG.</p>
          </div>
        </div>

        {/* Details Form Grid */}
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Company Name *</span>
              <input className="field" value={settingsForm.name} onChange={(e) => onUpdateSetting("name", e.target.value)} required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Tagline</span>
              <input className="field" value={settingsForm.tagline} onChange={(e) => onUpdateSetting("tagline", e.target.value)} placeholder="e.g. Elevating engineering collaboration" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Founded Year</span>
              <input type="number" min={1800} max={new Date().getFullYear()} className="field" value={settingsForm.foundedYear} onChange={(e) => onUpdateSetting("foundedYear", e.target.value)} placeholder="e.g. 2015" />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Description</span>
            <textarea className="field min-h-24 resize-none" value={settingsForm.description} onChange={(e) => onUpdateSetting("description", e.target.value)} placeholder="Tell candidates about your company's mission and engineering culture..." />
          </label>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Industry</span>
              <input className="field" value={settingsForm.industry} onChange={(e) => onUpdateSetting("industry", e.target.value)} placeholder="e.g. Fintech, Healthcare" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Headquarters City</span>
              <input className="field" value={settingsForm.headquarters} onChange={(e) => onUpdateSetting("headquarters", e.target.value)} placeholder="e.g. Bangalore, SF" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Company Type</span>
              <select className="field" value={settingsForm.type} onChange={(e) => onUpdateSetting("type", e.target.value)}>
                <option value="">Select Type</option>
                <option value="STARTUP">Startup</option>
                <option value="PRODUCT_BASED">Product Based</option>
                <option value="SERVICE_BASED">Service Based</option>
                <option value="ENTERPRISE">Enterprise</option>
                <option value="MNC">MNC</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Company Size</span>
              <select className="field" value={settingsForm.size} onChange={(e) => onUpdateSetting("size", e.target.value)}>
                <option value="">Select Size</option>
                <option value="SOLO">Solo (1)</option>
                <option value="SMALL">Small (2-49)</option>
                <option value="MEDIUM">Medium (50-249)</option>
                <option value="LARGE">Large (250-999)</option>
                <option value="ENTERPRISE">Enterprise (1000+)</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Website Link</span>
              <input type="url" className="field" value={settingsForm.websiteUrl} onChange={(e) => onUpdateSetting("websiteUrl", e.target.value)} placeholder="https://company.com" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Careers Page Link</span>
              <input type="url" className="field" value={settingsForm.careersPageUrl} onChange={(e) => onUpdateSetting("careersPageUrl", e.target.value)} placeholder="https://company.com/careers" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>GitHub Org Link</span>
              <input type="url" className="field" value={settingsForm.githubUrl} onChange={(e) => onUpdateSetting("githubUrl", e.target.value)} placeholder="https://github.com/org" />
            </label>
          </div>

          <div className="flex gap-6 text-xs pt-2 border-t" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
            <label className="flex cursor-pointer items-center gap-2 select-none">
              <input type="checkbox" checked={settingsForm.hiringEnabled} onChange={(e) => onUpdateSetting("hiringEnabled", e.target.checked)} className="accent-indigo-600 h-3.5 w-3.5" />
              Hiring active
            </label>
            <label className="flex cursor-pointer items-center gap-2 select-none">
              <input type="checkbox" checked={settingsForm.referralEnabled} onChange={(e) => onUpdateSetting("referralEnabled", e.target.checked)} className="accent-indigo-600 h-3.5 w-3.5" />
              Referral coordinates open
            </label>
          </div>
        </div>

        {/* Actions Submit */}
        <div className="flex gap-2 justify-end border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <button
            type="submit"
            disabled={isPending || uploadingLogo || uploadingCover}
            className="btn-primary px-5 py-2.5 text-xs disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPending && <Loader2 size={13} className="animate-spin" />}
            Save Profile Changes
          </button>
        </div>
      </form>
    </div>
  );
}
