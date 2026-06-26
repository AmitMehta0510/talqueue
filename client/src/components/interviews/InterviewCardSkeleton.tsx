import { SkeletonBlock } from "../ui";

/**
 * Shimmer placeholder rendered while interview resources are loading.
 * Matches the card dimensions exactly to prevent layout shift.
 */
export function InterviewCardSkeleton() {
  return (
    <div className="panel p-4 flex flex-col gap-3 animate-pulse">
      {/* Thumbnail */}
      <SkeletonBlock className="h-40 w-full rounded-xl" />
      {/* Tag row */}
      <div className="flex gap-2">
        <SkeletonBlock className="h-5 w-16 rounded-full" />
        <SkeletonBlock className="h-5 w-20 rounded-full" />
        <SkeletonBlock className="h-5 w-14 rounded-full" />
      </div>
      {/* Title */}
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-4/5" />
      {/* Channel + save row */}
      <div className="flex items-center justify-between mt-auto pt-2">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-7 w-16 rounded-lg" />
      </div>
    </div>
  );
}
