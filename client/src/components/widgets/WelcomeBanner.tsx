import { useAuth } from "../../core/contexts/AuthContext";
import { Sparkles } from "lucide-react";

export function WelcomeBanner() {
  const { user } = useAuth();
  const fullName = user?.profile?.fullName || user?.username || "Developer";
  const firstName = fullName.split(" ")[0];

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-1 py-1">
      <h2 className="text-2xl font-black text-primary flex items-center gap-1.5">
        {getGreeting()}, {firstName} 👋
      </h2>
      <p className="text-xs text-secondary font-medium">
        Let's build something amazing today!
      </p>
    </div>
  );
}
