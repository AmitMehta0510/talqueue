import { Link, useLocation } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { useConversationsQuery } from "../../hooks/usePlatformQueries";

/**
 * Header chat icon button. Shows total unread message count as a badge.
 * Only rendered for authenticated users (caller's responsibility to gate).
 */
export function ChatIconButton() {
  const { data: conversations } = useConversationsQuery();
  const location = useLocation();

  const totalUnread = (conversations || []).reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0
  );

  const isActive = location.pathname.startsWith("/chat");

  return (
    <Link
      to="/chat"
      title="Messages"
      className={`icon-btn rounded-full relative transition-colors duration-200 ${
        isActive ? "text-brand" : ""
      }`}
    >
      <MessageSquare size={16} />

      {totalUnread > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black leading-none border-2 border-[color:var(--bg-surface)]">
          {totalUnread > 99 ? "99+" : totalUnread}
        </span>
      )}
    </Link>
  );
}
