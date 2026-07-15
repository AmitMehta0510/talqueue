import { useState } from "react";
import { Users, Plus, Trash2, Loader2, Search, ShieldCheck, UserMinus } from "lucide-react";
import { useToast } from "../../core/contexts/ToastContext";
import { InlineLoader, ErrorState, EmptyState } from "../ui";

interface CdcrMember {
  id: string;
  userId: string;
  collegeId: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    profile?: {
      fullName?: string | null;
      avatarUrl?: string | null;
      headline?: string | null;
    } | null;
  };
  college: { id: string; name: string };
}

interface TpoCdcrTabProps {
  members: CdcrMember[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onRefresh: () => void;
}

export function TpoCdcrTab({ members, isLoading, isError, onRetry, onRefresh }: TpoCdcrTabProps) {
  const { showToast } = useToast();
  const [addEmail, setAddEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const handleAdd = async () => {
    if (!addEmail.trim()) return;
    setAdding(true);
    try {
      const resp = await fetch("/api/v1/tpo/dashboard/cdcr", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail.trim().toLowerCase() }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.message || "Failed to add CDCR member");
      showToast("success", `${addEmail} added as CDCR member`);
      setAddEmail("");
      onRefresh();
    } catch (err: any) {
      showToast("error", err?.message || "Failed to add member");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (memberId: string, name: string) => {
    if (!confirm(`Remove ${name} from CDCR?`)) return;
    setRemovingId(memberId);
    try {
      const resp = await fetch(`/api/v1/tpo/dashboard/cdcr/${memberId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!resp.ok) {
        const json = await resp.json();
        throw new Error(json?.message || "Failed to remove");
      }
      showToast("success", `${name} removed from CDCR`);
      onRefresh();
    } catch (err: any) {
      showToast("error", err?.message || "Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  };

  const filtered = (members ?? []).filter((m) => {
    const name = m.user.profile?.fullName ?? m.user.username;
    return name.toLowerCase().includes(search.toLowerCase()) || m.user.username.includes(search.toLowerCase());
  });

  if (isLoading) return <InlineLoader label="Loading CDCR members..." />;
  if (isError) return <ErrorState title="Error loading CDCR members" onRetry={onRetry} />;

  return (
    <div className="space-y-6">

      {/* Header + Add */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              CDCR Student Coordinators
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Career Development Cell Representatives help coordinate placement drives and communicate with students.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
            <Users size={12} /> {members?.length ?? 0} Members
          </span>
        </div>

        {/* Add member by email */}
        <div className="mt-4 flex gap-2">
          <input
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="student@college.edu"
            className="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !addEmail.trim()}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-60"
          >
            {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            {adding ? "Adding..." : "Add"}
          </button>
        </div>
      </div>

      {/* Search */}
      {(members?.length ?? 0) > 4 && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full text-sm pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Member List */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No CDCR Members Yet"
          description="Add student coordinators by entering their registered email address above."
          icon={<Users className="h-10 w-10 text-gray-300 dark:text-gray-600" />}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((member) => {
            const displayName = member.user.profile?.fullName ?? member.user.username;
            const avatar = member.user.profile?.avatarUrl;
            const headline = member.user.profile?.headline;
            const isRemoving = removingId === member.id;

            return (
              <div
                key={member.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition"
              >
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {avatar ? (
                    <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                  {headline && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{headline}</p>}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">@{member.user.username}</p>
                </div>

                {/* Badge */}
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  <ShieldCheck size={10} /> CDCR
                </span>

                {/* Remove */}
                <button
                  onClick={() => handleRemove(member.id, displayName)}
                  disabled={isRemoving}
                  className="ml-2 p-2 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                  title="Remove CDCR member"
                >
                  {isRemoving ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
