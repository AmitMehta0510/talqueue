import React, { FormEvent, ReactNode, useState, useRef } from "react";
import { Field } from "./ProfileHelpers";
import {
  User,
  Link as LinkIcon,
  Github,
  Globe,
  ExternalLink,
  Loader2,
  Save,
  Briefcase,
  GraduationCap,
  Gift,
  Users,
  Heart,
  ImageIcon,
  FileText,
  AlertCircle,
  CheckCircle2,
  Code2,
  Trophy,
  Flame,
  Zap,
} from "lucide-react";
import { useToast } from "../../core/contexts/ToastContext";
import { useFileUpload } from "../../features/storage/hooks/useFileUpload";
import { useUpdateCampusOutreachPreferenceMutation } from "../../hooks/queries/useProfileQueries";

import { User as UserType } from "../../lib/api";

export interface ProfileSettingsProps {
  profile: UserType;
  profileForm: Record<string, any>;
  onProfileFormChange: (form: any) => void;
  onSave: (e: FormEvent) => void;
  isSavePending: boolean;
}

// ── Availability toggle signals config ────────────────────────────────────────
const AVAILABILITY_SIGNALS = [
  {
    key: "openToWork",
    label: "Open to Work",
    description: "Recruiters & companies can see you're actively seeking full-time roles",
    colorClass: "border-emerald-500/40 bg-emerald-500/5",
    activeClass: "border-emerald-500/60 bg-emerald-500/10",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-400",
    icon: Briefcase,
  },
  {
    key: "openToInternship",
    label: "Open to Internships",
    description: "Show that you're available for internship opportunities",
    colorClass: "border-sky-500/40 bg-sky-500/5",
    activeClass: "border-sky-500/60 bg-sky-500/10",
    dotClass: "bg-sky-500",
    textClass: "text-sky-400",
    icon: GraduationCap,
  },
  {
    key: "acceptingReferrals",
    label: "Accepting Referrals",
    description: "Professionals on your profile will see an 'Ask Referral' button",
    colorClass: "border-amber-500/40 bg-amber-500/5",
    activeClass: "border-amber-500/60 bg-amber-500/10",
    dotClass: "bg-amber-500",
    textClass: "text-amber-400",
    icon: Gift,
  },
  {
    key: "acceptingCollaborators",
    label: "Accepting Collaborators",
    description: "Signal you're open to joining or forming project teams",
    colorClass: "border-violet-500/40 bg-violet-500/5",
    activeClass: "border-violet-500/60 bg-violet-500/10",
    dotClass: "bg-violet-500",
    textClass: "text-violet-400",
    icon: Users,
  },
  {
    key: "acceptingMentorship",
    label: "Offering Mentorship",
    description: "Let junior engineers know you're willing to guide them",
    colorClass: "border-rose-500/40 bg-rose-500/5",
    activeClass: "border-rose-500/60 bg-rose-500/10",
    dotClass: "bg-rose-500",
    textClass: "text-rose-400",
    icon: Heart,
  },
] as const;

// ── Coding platform links ──────────────────────────────────────────────────────
const CODING_PLATFORMS = [
  {
    key: "leetcodeUrl",
    label: "LeetCode",
    placeholder: "https://leetcode.com/username",
    colorClass: "text-amber-500",
    bgClass: "bg-amber-500/10",
    icon: Code2,
  },
  {
    key: "hackerrankUrl",
    label: "HackerRank",
    placeholder: "https://hackerrank.com/username",
    colorClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10",
    icon: Trophy,
  },
  {
    key: "gfgUrl",
    label: "GeeksforGeeks",
    placeholder: "https://geeksforgeeks.org/user/username",
    colorClass: "text-green-600",
    bgClass: "bg-green-500/10",
    icon: Flame,
  },
] as const;

export function ProfileSettings({
  profile,
  profileForm,
  onProfileFormChange,
  onSave,
  isSavePending,
}: ProfileSettingsProps) {
  const { showToast } = useToast();
  const avatarUpload = useFileUpload();
  const updateOutreachPreference = useUpdateCampusOutreachPreferenceMutation();
  const openToCampusOutreach = Boolean(profile.openToCampusOutreach);
  const bannerUpload = useFileUpload();
  const resumeUpload = useFileUpload();
  const availabilityTextLen = (profileForm.availabilityText || "").length;

  const lc = profile.codingProfiles?.find((p) => p.platform.toLowerCase() === "leetcode")?.url || "";
  const hr = profile.codingProfiles?.find((p) => p.platform.toLowerCase() === "hackerrank")?.url || "";
  const gfg = profile.codingProfiles?.find((p) => p.platform.toLowerCase() === "geeksforgeeks")?.url || "";

  const isDirty =
    (profileForm.fullName || "") !== (profile.profile?.fullName || "") ||
    (profileForm.username || "") !== (profile.username || "") ||
    (profileForm.headline || "") !== (profile.profile?.headline || "") ||
    (profileForm.bio || "") !== (profile.profile?.bio || "") ||
    (profileForm.location || "") !== (profile.profile?.location || "") ||
    (profileForm.availabilityText || "") !== (profile.profile?.availabilityText || "") ||
    (profileForm.avatarUrl || "") !== (profile.profile?.avatarUrl || "") ||
    (profileForm.bannerUrl || "") !== (profile.profile?.bannerUrl || "") ||
    (profileForm.resumeUrl || "") !== (profile.profile?.resumeUrl || "") ||
    (profileForm.githubUrl || "") !== (profile.profile?.githubUrl || "") ||
    (profileForm.portfolioUrl || "") !== (profile.profile?.portfolioUrl || "") ||
    (profileForm.leetcodeUrl || "") !== lc ||
    (profileForm.hackerrankUrl || "") !== hr ||
    (profileForm.gfgUrl || "") !== gfg ||
    (profileForm.graduationYear || "") !== (profile.profile?.graduationYear?.toString() || "") ||
    Boolean(profileForm.acceptingReferrals) !== Boolean(profile.acceptingReferrals) ||
    Boolean(profileForm.openToWork) !== Boolean(profile.openToWork) ||
    Boolean(profileForm.openToInternship) !== Boolean(profile.openToInternship) ||
    Boolean(profileForm.acceptingCollaborators) !== Boolean(profile.acceptingCollaborators) ||
    Boolean(profileForm.acceptingMentorship) !== Boolean(profile.acceptingMentorship) ||
    (profileForm.availabilityStatus || "NOT_AVAILABLE") !== (profile.availabilityStatus || "NOT_AVAILABLE");

  // Wrap onChange
  const change = (updates: Record<string, any>) => {
    onProfileFormChange({ ...profileForm, ...updates });
  };

  const set = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      change({ [key]: e.target.value });

  const handleSave = (e: FormEvent) => {
    onSave(e);
  };

  // ── File upload handlers ───────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { fileUrl } = await avatarUpload.upload(file, "avatar");
      change({ avatarUrl: fileUrl });
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
      change({ bannerUrl: fileUrl });
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
      change({ resumeUrl: fileUrl });
      showToast("success", "Resume uploaded successfully");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to upload resume");
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">

      {/* ── Unsaved changes banner ─────────────────────────────────────── */}
      {isDirty && (
        <div
          className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
          style={{ background: "rgba(234,179,8,0.06)", borderColor: "rgba(234,179,8,0.3)" }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-500">
            <AlertCircle size={14} />
            You have unsaved changes
          </div>
          <button
            type="submit"
            disabled={isSavePending}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all duration-150 hover:opacity-90 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, var(--brand), #6366f1)" }}
          >
            {isSavePending ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
            Save now
          </button>
        </div>
      )}

      {/* ── 1. Basic Information ──────────────────────────────────────────── */}
      <SettingsSection title="Basic Information" icon={User}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name">
            <input
              className="field"
              value={profileForm.fullName || ""}
              onChange={set("fullName")}
              placeholder="Full name"
              minLength={2}
            />
          </Field>
          <Field label="Username">
            <div className="relative">
              <span
                className="pointer-events-none absolute left-3 top-2.5 text-xs font-semibold"
                style={{ color: "var(--text-muted)" }}
              >
                @
              </span>
              <input
                className="field pl-7"
                value={profileForm.username || ""}
                onChange={set("username")}
                placeholder="username"
                minLength={3}
                pattern="[A-Za-z0-9_]+"
              />
            </div>
          </Field>
          <Field label="Headline" className="md:col-span-2">
            <input
              className="field"
              value={profileForm.headline || ""}
              onChange={set("headline")}
              placeholder="Backend engineer · ML intern · Open source contributor…"
              maxLength={160}
            />
          </Field>
          <Field label="Location">
            <input
              className="field"
              value={profileForm.location || ""}
              onChange={set("location")}
              placeholder="Mumbai, India"
            />
          </Field>
          <Field label="Bio" className="md:col-span-2">
            <textarea
              className="field min-h-28 resize-y"
              value={profileForm.bio || ""}
              onChange={set("bio")}
              placeholder="What you build, what you're learning, what kind of work you want…"
              maxLength={1000}
            />
          </Field>
        </div>
      </SettingsSection>

      {/* ── 2. Availability & Open Signals ───────────────────────────────── */}
      <SettingsSection title="Availability & Open Signals" icon={Briefcase}>
        <div className="space-y-3">
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Toggle which signals appear on your public profile. These let recruiters, teams, and engineers know how to engage with you.
          </p>
          {AVAILABILITY_SIGNALS.map((signal) => {
            const isOn = Boolean(profileForm[signal.key]);
            return (
              <div
                key={signal.key}
                className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-200 cursor-pointer select-none ${
                  isOn ? signal.activeClass : signal.colorClass
                }`}
                onClick={() => change({ [signal.key]: !isOn })}
                role="switch"
                aria-checked={isOn}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); change({ [signal.key]: !isOn }); } }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`shrink-0 flex items-center justify-center h-9 w-9 rounded-xl border transition-all duration-200 ${
                      isOn ? signal.activeClass : "border-transparent"
                    }`}
                    style={{ background: isOn ? undefined : "var(--bg-surface-2)" }}
                  >
                    <signal.icon size={16} className={isOn ? signal.textClass : ""} style={!isOn ? { color: "var(--text-muted)" } : {}} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-bold"
                      style={{ color: isOn ? undefined : "var(--text-primary)" }}
                    >
                      <span className={isOn ? signal.textClass : ""}>{signal.label}</span>
                    </p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {signal.description}
                    </p>
                  </div>
                </div>

                {/* Toggle switch */}
                <div
                  className={`relative shrink-0 h-6 w-10 rounded-full transition-all duration-300 ${
                    isOn ? signal.dotClass : ""
                  }`}
                  style={!isOn ? { background: "var(--bg-surface-2)", border: "1px solid var(--border)" } : { border: "none" }}
                >
                  <div
                    className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300"
                    style={{ left: isOn ? "calc(100% - 22px)" : "2px" }}
                  />
                </div>
              </div>
            );
          })}

          <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <Field label="Add a custom note (optional)">
              <div className="relative">
                <input
                  className="field pr-14"
                  value={profileForm.availabilityText || ""}
                  onChange={set("availabilityText")}
                  placeholder="e.g. Open to React roles in Bangalore, available from August 2026…"
                  maxLength={240}
                />
                <span
                  className="absolute right-3 top-2.5 text-[10px] font-semibold"
                  style={{ color: availabilityTextLen > 200 ? "#f59e0b" : "var(--text-muted)" }}
                >
                  {availabilityTextLen}/240
                </span>
              </div>
            </Field>
          </div>

          {/* Premium Recruiter Outreach Toggle */}
          <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <div
              className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-200 cursor-pointer select-none ${
                openToCampusOutreach
                  ? "border-indigo-500/40 bg-indigo-500/5 dark:bg-indigo-950/15"
                  : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/5"
              }`}
              onClick={() => updateOutreachPreference.mutate({ openToCampusOutreach: !openToCampusOutreach })}
              role="switch"
              aria-checked={openToCampusOutreach}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  updateOutreachPreference.mutate({ openToCampusOutreach: !openToCampusOutreach });
                }
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`shrink-0 flex items-center justify-center h-9 w-9 rounded-xl border transition-all duration-200 ${
                    openToCampusOutreach
                      ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400"
                      : "border-transparent text-gray-400"
                  }`}
                  style={{ background: openToCampusOutreach ? undefined : "var(--bg-surface-2)" }}
                >
                  {updateOutreachPreference.isPending ? (
                    <Loader2 size={16} className="animate-spin text-indigo-500" />
                  ) : (
                    <Zap size={16} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    Premium Recruiter Visibility (RESDEX)
                  </p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    Allow verified campus hiring partners on the platform to view your contact information (email & phone) directly in search results.
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <div
                className={`relative shrink-0 h-6 w-10 rounded-full transition-all duration-300 ${
                  openToCampusOutreach ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-850 border border-gray-300 dark:border-gray-700"
                }`}
              >
                <div
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300"
                  style={{ left: openToCampusOutreach ? "calc(100% - 22px)" : "2px" }}
                />
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* ── 3. Links & Profiles ──────────────────────────────────────────── */}
      <SettingsSection title="Links & Profiles" icon={LinkIcon}>
        <div className="grid gap-4 md:grid-cols-2">

          {/* GitHub */}
          <Field label="GitHub">
            <div className="relative">
              <div
                className="pointer-events-none absolute left-3 top-2.5 flex h-4 w-4 items-center justify-center rounded"
                style={{ color: "var(--text-muted)" }}
              >
                <Github size={14} />
              </div>
              <input
                className="field pl-9"
                value={profileForm.githubUrl || ""}
                onChange={set("githubUrl")}
                placeholder="https://github.com/username"
                type="url"
              />
            </div>
          </Field>

          {/* Portfolio */}
          <Field label="Portfolio / Website">
            <div className="relative">
              <Globe size={14} className="pointer-events-none absolute left-3 top-2.5" style={{ color: "var(--text-muted)" }} />
              <input
                className="field pl-9"
                value={profileForm.portfolioUrl || ""}
                onChange={set("portfolioUrl")}
                placeholder="https://yoursite.com"
                type="url"
              />
            </div>
          </Field>

          {/* Coding Platforms */}
          {CODING_PLATFORMS.map((platform) => (
            <Field key={platform.key} label={platform.label}>
              <div className="relative">
                <div
                  className={`pointer-events-none absolute left-2.5 top-2 flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-black ${platform.colorClass} ${platform.bgClass}`}
                >
                  <platform.icon size={12} />
                </div>
                <input
                  className="field pl-9"
                  value={profileForm[platform.key] || ""}
                  onChange={set(platform.key)}
                  placeholder={platform.placeholder}
                  type="url"
                />
              </div>
            </Field>
          ))}
        </div>
      </SettingsSection>

      {/* ── 4. Media ─────────────────────────────────────────────────────── */}
      <SettingsSection title="Media & Resume" icon={ImageIcon}>
        <div className="grid gap-6 md:grid-cols-2">

          {/* Avatar */}
          <div>
            <p className="mb-2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Profile Photo</p>
            <div
              className="relative overflow-hidden rounded-2xl border"
              style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)", minHeight: "96px" }}
            >
              {profileForm.avatarUrl ? (
                <div className="flex items-center gap-4 p-4">
                  <img
                    src={profileForm.avatarUrl}
                    alt="Avatar"
                    className="h-16 w-16 rounded-xl object-cover ring-2"
                    style={{ boxShadow: "0 0 0 2px var(--brand)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Current photo</p>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all duration-150"
                      style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-surface)" }}>
                      {avatarUpload.uploading ? <Loader2 className="animate-spin" size={12} /> : <ImageIcon size={12} />}
                      Change photo
                      <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} disabled={avatarUpload.uploading} />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center hover:bg-indigo-500/5 transition-all duration-150">
                  {avatarUpload.uploading ? (
                    <Loader2 className="animate-spin" size={22} style={{ color: "var(--brand)" }} />
                  ) : (
                    <ImageIcon size={22} style={{ color: "var(--text-muted)" }} />
                  )}
                  <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                    {avatarUpload.uploading ? "Uploading…" : "Click to upload photo"}
                  </span>
                  <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} disabled={avatarUpload.uploading} />
                </label>
              )}
            </div>
          </div>

          {/* Banner */}
          <div>
            <p className="mb-2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Profile Banner</p>
            <div
              className="relative overflow-hidden rounded-2xl border"
              style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)", minHeight: "96px" }}
            >
              {profileForm.bannerUrl ? (
                <div className="relative">
                  <img
                    src={profileForm.bannerUrl}
                    alt="Banner"
                    className="h-24 w-full object-cover"
                  />
                  <label
                    className="absolute bottom-2 right-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md transition-all duration-150"
                    style={{ background: "rgba(0,0,0,0.55)" }}
                  >
                    {bannerUpload.uploading ? <Loader2 className="animate-spin" size={12} /> : <ImageIcon size={12} />}
                    Change
                    <input type="file" accept="image/*" className="sr-only" onChange={handleBannerChange} disabled={bannerUpload.uploading} />
                  </label>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center hover:bg-indigo-500/5 transition-all duration-150">
                  {bannerUpload.uploading ? (
                    <Loader2 className="animate-spin" size={22} style={{ color: "var(--brand)" }} />
                  ) : (
                    <ImageIcon size={22} style={{ color: "var(--text-muted)" }} />
                  )}
                  <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                    {bannerUpload.uploading ? "Uploading…" : "Click to upload banner"}
                  </span>
                  <input type="file" accept="image/*" className="sr-only" onChange={handleBannerChange} disabled={bannerUpload.uploading} />
                </label>
              )}
            </div>
          </div>

          {/* Resume */}
          <div className="md:col-span-2">
            <p className="mb-2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Resume (PDF)</p>
            <div
              className="flex items-center gap-4 rounded-2xl border p-4"
              style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.25)" }}
              >
                <FileText size={20} style={{ color: "var(--brand)" }} />
              </div>
              <div className="flex-1 min-w-0">
                {profileForm.resumeUrl ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <a
                      href={profileForm.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold hover:underline"
                      style={{ color: "var(--brand)" }}
                    >
                      <ExternalLink size={12} />
                      View current resume
                    </a>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>·</span>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all duration-150"
                      style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-surface)", cursor: "pointer" }}>
                      {resumeUpload.uploading ? <Loader2 className="animate-spin" size={12} /> : <FileText size={12} />}
                      Replace
                      <input type="file" accept="application/pdf" className="sr-only" onChange={handleResumeChange} disabled={resumeUpload.uploading} />
                    </label>
                  </div>
                ) : (
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold transition-all duration-150"
                    style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-surface)" }}>
                    {resumeUpload.uploading ? <Loader2 className="animate-spin" size={12} /> : <FileText size={12} />}
                    {resumeUpload.uploading ? "Uploading…" : "Upload PDF resume"}
                    <input type="file" accept="application/pdf" className="sr-only" onChange={handleResumeChange} disabled={resumeUpload.uploading} />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* ── Save button ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 pt-2">
        {isDirty ? (
          <p className="text-xs flex items-center gap-1.5 font-medium" style={{ color: "var(--text-muted)" }}>
            <AlertCircle size={12} className="text-amber-500" />
            Unsaved changes
          </p>
        ) : (
          <p className="text-xs flex items-center gap-1.5 font-medium" style={{ color: "var(--text-muted)" }}>
            <CheckCircle2 size={12} className="text-emerald-500" />
            All changes saved
          </p>
        )}
        <button
          className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-60 shadow-lg"
          style={{ background: "linear-gradient(135deg, var(--brand), #6366f1)", boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}
          type="submit"
          disabled={isSavePending}
        >
          {isSavePending ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
          Save changes
        </button>
      </div>
    </form>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
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
    <div
      className="rounded-xl border p-5"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      <div
        className="mb-4 flex items-center gap-2 border-b pb-3"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: "var(--brand-light)", color: "var(--brand)" }}
        >
          <Icon size={14} />
        </div>
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}
