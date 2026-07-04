import { useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../core/contexts/AuthContext";
import {
  useUserTimelineQuery,
  usePostReactionMutation,
  useCommentOnPostMutation,
  useRepostMutation,
} from "../../hooks/usePlatformQueries";
import { FeedCard } from "../cards/FeedCard";

interface PostsTabProps {
  userId: string;
}

export function PostsTab({ userId }: PostsTabProps) {
  const { user } = useAuth();
  const timelineQuery = useUserTimelineQuery(userId);
  const postReaction = usePostReactionMutation();
  const commentOnPost = useCommentOnPostMutation();
  const repost = useRepostMutation();

  const handleLike = useCallback((id: string) => {
    if (postReaction.isPending) return;
    postReaction.mutate({ id, action: "like" });
  }, [postReaction]);

  const handleSave = useCallback((id: string) => {
    if (postReaction.isPending) return;
    postReaction.mutate({ id, action: "save" });
  }, [postReaction]);

  const handleComment = useCallback(async (id: string, content: string, parentCommentId?: string) => {
    try {
      await commentOnPost.mutateAsync({ id, content, parentCommentId });
      return true;
    } catch {
      return false;
    }
  }, [commentOnPost]);

  const handleRepost = useCallback(async (id: string, caption?: string) => {
    try {
      await repost.mutateAsync({ id, caption });
      return true;
    } catch {
      return false;
    }
  }, [repost]);

  const timeline = timelineQuery.data || [];
  const interacting = postReaction.isPending || commentOnPost.isPending || repost.isPending;

  if (timelineQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-brand" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timeline.length ? (
        timeline.map((item, index) => (
          <FeedCard
            key={`${item.type}-${(item.data as { id?: string }).id || index}`}
            item={item}
            position={index}
            trackImpression={false}
            canInteract={Boolean(user) && !interacting}
            onLike={handleLike}
            onSave={handleSave}
            onComment={handleComment}
            onRepost={handleRepost}
          />
        ))
      ) : (
        <div className="panel p-8 text-center text-muted-fg">
          No posts or reposts published by this engineer yet.
        </div>
      )}
    </div>
  );
}
export default PostsTab;
