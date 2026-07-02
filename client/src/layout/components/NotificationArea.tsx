import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import {
  NotificationBellButton,
  NotificationPreview,
} from "../../components/ui/NotificationCenter";
import { User } from "../../lib/api";

type NotificationAreaProps = {
  /** Current authenticated user, or null if anonymous */
  user: User | null;
};

/**
 * Renders the notification bell button and handles the preview dropdown.
 */
export function NotificationArea({ user }: NotificationAreaProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={notificationRef}>
      <button
        className="icon-btn rounded-full relative"
        type="button"
        title="Notifications"
        disabled={!user}
        onClick={() => setNotificationsOpen((o) => !o)}
      >
        {user ? <NotificationBellButton /> : <Bell size={16} />}
      </button>
      {user && notificationsOpen && <NotificationPreview />}
    </div>
  );
}
