import { Code2, ExternalLink } from "lucide-react";

export interface CodingProfileData {
  id: string;
  platform: string;
  username: string;
  url?: string | null;
  rating?: number;
  solvedCount?: number;
  globalRank?: number;
}

interface CodingProfileCardProps {
  /** The coding profile record to display. */
  profile: CodingProfileData;
}

const PLATFORM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  leetcode: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-900/50",
  },
  hackerrank: {
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-900/50",
  },
  geeksforgeeks: {
    bg: "bg-green-50 dark:bg-green-950/20",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-900/50",
  },
};

/**
 * Renders an engineer's public competitive programming profile card (e.g., LeetCode, HackerRank),
 * showing their rating, solved problem counts, and global rank.
 */
export function CodingProfileCard({ profile }: CodingProfileCardProps) {
  const platform = profile.platform.toLowerCase();
  const theme = PLATFORM_COLORS[platform] || {
    bg: "bg-slate-50 dark:bg-slate-900",
    text: "text-slate-700 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-800",
  };

  return (
    <article className="panel p-5 hover-lift flex flex-col gap-4 border border-base">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-surface-2 border border-base flex items-center justify-center text-secondary">
            <Code2 size={18} />
          </div>
          <div>
            <h4 className="font-semibold text-primary">{profile.platform}</h4>
            <p className="text-xs text-muted-fg">@{profile.username}</p>
          </div>
        </div>
        {profile.url && (
          <a
            href={profile.url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${theme.bg} ${theme.text} ${theme.border} hover:opacity-90`}
            title={`View ${profile.platform} profile`}
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1">
        {profile.rating !== undefined && profile.rating !== null && (
          <div className="rounded-lg bg-surface-2 border border-base p-2.5 text-center">
            <div className="text-sm font-bold text-primary">{profile.rating}</div>
            <div className="text-[10px] text-muted-fg mt-0.5">Rating</div>
          </div>
        )}
        {profile.solvedCount !== undefined && profile.solvedCount !== null && (
          <div className="rounded-lg bg-surface-2 border border-base p-2.5 text-center">
            <div className="text-sm font-bold text-primary">{profile.solvedCount}</div>
            <div className="text-[10px] text-muted-fg mt-0.5">Solved</div>
          </div>
        )}
        {profile.globalRank !== undefined && profile.globalRank !== null && (
          <div className="rounded-lg bg-surface-2 border border-base p-2.5 text-center">
            <div className="text-sm font-bold text-primary">#{profile.globalRank}</div>
            <div className="text-[10px] text-muted-fg mt-0.5">Rank</div>
          </div>
        )}
      </div>
    </article>
  );
}
