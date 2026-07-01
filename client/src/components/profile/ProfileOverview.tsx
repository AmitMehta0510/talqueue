import React, { ReactNode } from "react";
import {
  Sparkles,
  CheckCircle2,
  Circle,
  MapPin,
  Building2,
  GraduationCap,
  Github,
  Linkedin,
  User,
  Zap,
} from "lucide-react";
import { User as UserType } from "../../lib/api";

export interface ProfileOverviewProps {
  profile: UserType;
  completedTasks: number;
  tasks: Array<{ label: string; complete: boolean }>;
}

export function ProfileOverview({
  profile,
  completedTasks,
  tasks,
}: ProfileOverviewProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-5">
        {/* Bio */}
        {profile.profile?.bio ? (
          <SectionCard title="About" icon={User}>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{profile.profile.bio}</p>
          </SectionCard>
        ) : (
          <SectionCard title="About" icon={User}>
            <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
              No bio added yet — share your story in the Settings tab.
            </p>
          </SectionCard>
        )}

        {/* Availability text */}
        {profile.profile?.availabilityText && (
          <SectionCard title="Availability" icon={Zap}>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {profile.profile.availabilityText}
            </p>
          </SectionCard>
        )}
      </div>

      {/* Right sidebar */}
      <div className="space-y-5">
        {/* Profile foundation */}
        <div className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Profile foundation</h3>
            </div>
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              {completedTasks}/{tasks.length}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-surface-2)" }}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-500 transition-all duration-700"
              style={{ width: `${tasks.length ? (completedTasks / tasks.length) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-4 space-y-2">
            {tasks.map((task) => {
              const Icon = task.complete ? CheckCircle2 : Circle;
              return (
                <div
                  key={task.label}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${task.complete
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                      : ""
                    }`}
                  style={!task.complete ? { background: "var(--bg-surface-2)", color: "var(--text-muted)" } : {}}
                >
                  <Icon size={13} />
                  {task.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Signals */}
        <div className="panel p-5">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Profile signals</h3>
          <div className="space-y-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>
            <InfoRow icon={MapPin}>{profile.profile?.location || "No location"}</InfoRow>
            <InfoRow icon={Building2}>
              {profile.profile?.college?.name || "No college selected"}
            </InfoRow>
            <InfoRow icon={GraduationCap}>
              {profile.profile?.department?.name || "No department"}
            </InfoRow>
            {profile.profile?.githubUrl && (
              <InfoRow icon={Github}>
                <a
                  href={profile.profile.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-700 hover:underline"
                >
                  GitHub
                </a>
              </InfoRow>
            )}
            {profile.profile?.linkedinUrl && (
              <InfoRow icon={Linkedin}>
                <a
                  href={profile.profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  LinkedIn
                </a>
              </InfoRow>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="panel p-5">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Activity</h3>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Skills" value={profile._count?.skills ?? 0} />
            <MiniStat label="Experiences" value={profile._count?.experiences ?? 0} />
            <MiniStat label="Educations" value={profile._count?.educations ?? 0} />
            <MiniStat label="Roles" value={profile._count?.roles ?? 0} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
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
      <div className="mb-3 flex items-center gap-2">
        <Icon size={15} className="text-brand" />
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<any>;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="mt-0.5 shrink-0 text-muted-fg" />
      <span className="break-all">{children}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg p-3 bg-surface-2">
      <div className="text-lg font-bold text-primary">{value}</div>
      <div className="text-xs text-muted-fg">{label}</div>
    </div>
  );
}
