import React, { FormEvent, ReactNode } from "react";
import { Field } from "./ProfileHelpers";
import {
  User,
  Link as LinkIcon,
  Github,
  Linkedin,
  Globe,
  ExternalLink,
  Loader2,
  Save,
} from "lucide-react";
import { useToast } from "../../core/contexts/ToastContext";
import { useFileUpload } from "../../features/storage/hooks/useFileUpload";

export interface ProfileSettingsProps {
  profileForm: Record<string, any>;
  onProfileFormChange: (form: any) => void;
  onSave: (e: FormEvent) => void;
  isSavePending: boolean;
}

export function ProfileSettings({
  profileForm,
  onProfileFormChange,
  onSave,
  isSavePending,
}: ProfileSettingsProps) {
  const { showToast } = useToast();
  const avatarUpload = useFileUpload();
  const bannerUpload = useFileUpload();
  const resumeUpload = useFileUpload();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { fileUrl } = await avatarUpload.upload(file, "avatar");
      onProfileFormChange({ ...profileForm, avatarUrl: fileUrl });
      showToast("success", "Avatar uploaded successfully");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to upload avatar");
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { fileUrl } = await bannerUpload.upload(file, "avatar");
      onProfileFormChange({ ...profileForm, bannerUrl: fileUrl });
      showToast("success", "Banner uploaded successfully");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to upload banner");
    }
  };

  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { fileUrl } = await resumeUpload.upload(file, "attachment");
      onProfileFormChange({ ...profileForm, resumeUrl: fileUrl });
      showToast("success", "Resume uploaded successfully");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to upload resume");
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    onProfileFormChange({ ...profileForm, [key]: e.target.value });

  return (
    <form onSubmit={onSave} className="space-y-5">
      {/* Basic info */}
      <SettingsSection title="Basic information" icon={User}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Full name">
            <input className="field" value={profileForm.fullName} onChange={set("fullName")} placeholder="Full name" minLength={2} />
          </Field>
          <Field label="Username">
            <input className="field" value={profileForm.username} onChange={set("username")} placeholder="username" minLength={3} pattern="[A-Za-z0-9_]+" />
          </Field>
          <Field label="Headline" className="md:col-span-2">
            <input className="field" value={profileForm.headline} onChange={set("headline")} placeholder="Backend engineer, ML intern..." maxLength={160} />
          </Field>
          <Field label="Location">
            <input className="field" value={profileForm.location} onChange={set("location")} placeholder="Mumbai, India" />
          </Field>

          <Field label="Bio" className="md:col-span-2">
            <textarea className="field min-h-28" value={profileForm.bio} onChange={set("bio")} placeholder="What you build, what you're learning, what kind of work you want..." maxLength={1000} />
          </Field>
          <Field label="Availability Status">
            <select
              className="field"
              value={profileForm.availabilityStatus || "NOT_AVAILABLE"}
              onChange={(e) => {
                const val = e.target.value;
                onProfileFormChange({
                  ...profileForm,
                  availabilityStatus: val,
                  openToWork: val === "OPEN_TO_WORK" || val === "OPEN_TO_BOTH",
                  openToInternship: val === "OPEN_TO_INTERNSHIP" || val === "OPEN_TO_BOTH",
                });
              }}
            >
              <option value="NOT_AVAILABLE">Not Available / Paused</option>
              <option value="OPEN_TO_WORK">Open to Work (Full-Time)</option>
              <option value="OPEN_TO_INTERNSHIP">Open to Internships</option>
              <option value="OPEN_TO_BOTH">Open to Both (Jobs &amp; Internships)</option>
            </select>
          </Field>
          <Field label="Accepting Referrals">
            <select
              className="field"
              value={profileForm.acceptingReferrals ? "true" : "false"}
              onChange={(e) =>
                onProfileFormChange({ ...profileForm, acceptingReferrals: e.target.value === "true" })
              }
            >
              <option value="false">No (Inactive / Paused)</option>
              <option value="true">Yes (Active / Accepting Requests)</option>
            </select>
          </Field>
          <Field label="Availability custom note" className="md:col-span-2">
            <input className="field" value={profileForm.availabilityText} onChange={set("availabilityText")} placeholder="Open to internships, referrals, mentoring..." maxLength={240} />
          </Field>
        </div>
      </SettingsSection>

      {/* Links */}
      <SettingsSection title="Links & media" icon={LinkIcon}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Avatar">
            <div className="mt-1 flex flex-col gap-2">
              {profileForm.avatarUrl && (
                <div className="flex items-center gap-2">
                  <img src={profileForm.avatarUrl} alt="Avatar Preview" className="h-12 w-12 rounded-full object-cover ring-2 ring-indigo-500/20" />
                  <span className="text-xs truncate max-w-xs text-muted-fg">{profileForm.avatarUrl}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={avatarUpload.uploading}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/30 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50 transition text-muted-fg"
                />
                {avatarUpload.uploading && <Loader2 className="animate-spin text-indigo-600 shrink-0" size={16} />}
              </div>
            </div>
          </Field>

          <Field label="Banner Image">
            <div className="mt-1 flex flex-col gap-2">
              {profileForm.bannerUrl && (
                <div className="flex flex-col gap-1">
                  <img src={profileForm.bannerUrl} alt="Banner Preview" className="h-20 w-full rounded-xl object-cover ring-2 ring-indigo-500/20" />
                  <span className="text-xs truncate max-w-xs text-muted-fg">{profileForm.bannerUrl}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  disabled={bannerUpload.uploading}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/30 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50 transition text-muted-fg"
                />
                {bannerUpload.uploading && <Loader2 className="animate-spin text-indigo-600 shrink-0" size={16} />}
              </div>
            </div>
          </Field>

          <Field label="GitHub URL">
            <div className="relative">
              <Github size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-fg" />
              <input className="field pl-8" value={profileForm.githubUrl} onChange={set("githubUrl")} placeholder="https://github.com/..." type="url" />
            </div>
          </Field>
          <Field label="LinkedIn URL">
            <div className="relative">
              <Linkedin size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-fg" />
              <input className="field pl-8" value={profileForm.linkedinUrl} onChange={set("linkedinUrl")} placeholder="https://linkedin.com/in/..." type="url" />
            </div>
          </Field>
          <Field label="Portfolio URL">
            <div className="relative">
              <Globe size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-fg" />
              <input className="field pl-8" value={profileForm.portfolioUrl} onChange={set("portfolioUrl")} placeholder="https://yoursite.com" type="url" />
            </div>
          </Field>
          <Field label="LeetCode Profile URL">
            <div className="relative">
              <Globe size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-fg" />
              <input className="field pl-8" value={profileForm.leetcodeUrl} onChange={set("leetcodeUrl")} placeholder="https://leetcode.com/username" type="url" />
            </div>
          </Field>
          <Field label="HackerRank Profile URL">
            <div className="relative">
              <Globe size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-fg" />
              <input className="field pl-8" value={profileForm.hackerrankUrl} onChange={set("hackerrankUrl")} placeholder="https://hackerrank.com/username" type="url" />
            </div>
          </Field>
          <Field label="GeeksforGeeks Profile URL">
            <div className="relative">
              <Globe size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-fg" />
              <input className="field pl-8" value={profileForm.gfgUrl} onChange={set("gfgUrl")} placeholder="https://geeksforgeeks.org/user/username" type="url" />
            </div>
          </Field>

          <Field label="Resume (PDF)">
            <div className="mt-1 flex flex-col gap-2">
              {profileForm.resumeUrl && (
                <div className="flex items-center gap-2">
                  <a
                    href={profileForm.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:underline"
                  >
                    <ExternalLink size={12} /> View current resume
                  </a>
                  <span className="text-xs truncate max-w-xs text-muted-fg">{profileForm.resumeUrl}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleResumeChange}
                  disabled={resumeUpload.uploading}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/30 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50 transition text-muted-fg"
                />
                {resumeUpload.uploading && <Loader2 className="animate-spin text-indigo-600 shrink-0" size={16} />}
              </div>
            </div>
          </Field>
        </div>
      </SettingsSection>

      <div className="flex justify-end">
        <button className="btn-primary gap-2 px-6" type="submit" disabled={isSavePending}>
          {isSavePending ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
          Save changes
        </button>
      </div>
    </form>
  );
}

function SettingsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.FC<{ size?: number; className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center gap-2 border-b pb-3 border-base">
        <Icon size={16} className="text-brand" />
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
      </div>
      {children}
    </div>
  );
}


