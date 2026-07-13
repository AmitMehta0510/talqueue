import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Users,
  MessageSquare,
  X,
  UserPlus,
  Loader2,
  Filter,
  CheckCircle2,
  AlertCircle,
  ThumbsDown,
  Info,
} from "lucide-react";
import { api } from "../../lib/api";
import { useToast } from "../../core/contexts/ToastContext";

interface TeammateMatchmakerWidgetProps {
  hackathonId: string;
}

export function TeammateMatchmakerWidget({ hackathonId }: TeammateMatchmakerWidgetProps) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [roleInput, setRoleInput] = useState("BACKEND");
  const [messageInput, setMessageInput] = useState("");
  
  // Conversational / Traditional Filter States
  const [filterRole, setFilterRole] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filterSearch);
    }, 400);
    return () => clearTimeout(handler);
  }, [filterSearch]);

  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [showInviteModal, setShowInviteModal] = useState<string | null>(null); // Candidate User ID to invite

  // 1. Query Seeker Status
  const { data: seekerStatusRes, isLoading: loadingStatus } = useQuery({
    queryKey: ["seekerStatus", hackathonId],
    queryFn: () => api.getSoloSeekerStatus(hackathonId),
  });
  const isSeeker = !!seekerStatusRes?.data;

  // 2. Query Match Candidates
  const { data: matchesRes, isLoading: loadingMatches, refetch: refetchMatches } = useQuery({
    queryKey: ["hackathonMatches", hackathonId, filterRole, debouncedSearch],
    queryFn: async () => {
      const res = await api.getHackathonMatches(hackathonId, {
        role: filterRole || undefined,
        search: debouncedSearch || undefined,
      });
      return res?.data || { matches: [] };
    },
    enabled: isSeeker,
  });

  const matchData = matchesRes || { matches: [], isFallback: false, userCategory: "OTHER" };
  const candidates = matchData.matches || [];

  // Reset index when candidates list changes
  useEffect(() => {
    setActiveCardIndex(0);
  }, [candidates.length, filterRole, debouncedSearch]);

  // 3. Query User's Teams for Invite Action
  const { data: teamsRes } = useQuery({
    queryKey: ["myTeams"],
    queryFn: () => api.myTeams(),
    enabled: isSeeker,
  });
  const myTeams = teamsRes?.data || [];

  // 4. Seeker Register Mutation
  const registerMutation = useMutation({
    mutationFn: (payload: { role: string; message: string }) =>
      api.registerHackathonSeeker(hackathonId, payload),
    onSuccess: () => {
      showToast("success", "You are now in the matchmaking pool!");
      queryClient.invalidateQueries({ queryKey: ["seekerStatus", hackathonId] });
      queryClient.invalidateQueries({ queryKey: ["hackathonMatches", hackathonId] });
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Failed to register seeker status");
    },
  });

  // 5. Seeker Opt-out Mutation
  const removeMutation = useMutation({
    mutationFn: () => api.removeHackathonSeeker(hackathonId),
    onSuccess: () => {
      showToast("success", "Opted out of the matchmaking pool.");
      queryClient.invalidateQueries({ queryKey: ["seekerStatus", hackathonId] });
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Failed to remove seeker status");
    },
  });

  // 6. Direct Conversation Creator Mutation
  const chatMutation = useMutation({
    mutationFn: (targetUserId: string) => api.createDirectConversation(targetUserId),
    onSuccess: (res) => {
      navigate(`/chat/${res.data.id}`);
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Failed to open direct chat.");
    },
  });

  // 7. Send Team Invitation Mutation
  const inviteMutation = useMutation({
    mutationFn: (payload: { teamId: string; userId: string }) =>
      api.inviteTeamMember(payload.teamId, payload.userId, "Let's join forces for the Hackathon!"),
    onSuccess: () => {
      showToast("success", "Team invitation sent successfully!");
      setShowInviteModal(null);
      setSelectedTeamId("");
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Failed to send team invitation.");
    },
  });

  const handleNextCard = () => {
    setActiveCardIndex((prev) => prev + 1);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !showInviteModal) return;
    inviteMutation.mutate({ teamId: selectedTeamId, userId: showInviteModal });
  };

  if (loadingStatus) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="animate-spin text-indigo-500 mb-2" size={24} />
        <p className="text-xs text-muted-fg">Loading matchmaking status...</p>
      </div>
    );
  }

  // OPT-IN VIEW (If user is not registered as solo seeker)
  if (!isSeeker) {
    return (
      <div className="p-6 border border-border rounded-xl bg-card space-y-4 shadow-sm" style={{ background: "var(--bg-surface)" }}>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-primary flex items-center gap-1.5">
            <Sparkles className="text-amber-500" size={18} />
            Find Hackathon Teammates
          </h3>
          <p className="text-xs text-muted-fg leading-relaxed">
            Register as a solo developer for this event to search, filter, and swipe through complementary teammates matches (Frontend developers matching with Backend, DevOps, etc.).
          </p>
        </div>

        <div className="space-y-3.5 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-fg uppercase tracking-wider block">Your Primary Hackathon Role</label>
            <select
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              className="w-full text-xs text-primary rounded-lg border border-border p-2.5 focus:border-indigo-500 focus:outline-none"
              style={{ background: "var(--bg-surface)" }}
            >
              <option value="FRONTEND">Frontend Developer</option>
              <option value="BACKEND">Backend Developer</option>
              <option value="DEVOPS">DevOps & Cloud Engineer</option>
              <option value="ML_AI">Machine Learning / AI Developer</option>
              <option value="MOBILE">Mobile App Developer</option>
              <option value="DATA">Data Engineer</option>
              <option value="SECURITY">Security Auditor / Cybersecurity</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-fg uppercase tracking-wider block">Seeker Pitch / Message</label>
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="e.g., Looking to build a React SaaS dashboard or a Flask AI app!"
              className="w-full text-xs text-primary rounded-lg border border-border p-2.5 focus:border-indigo-500 focus:outline-none"
              style={{ background: "var(--bg-surface)" }}
            />
          </div>

          <button
            onClick={() => registerMutation.mutate({ role: roleInput, message: messageInput })}
            disabled={registerMutation.isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2.5 text-sm font-semibold transition"
          >
            {registerMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Users size={16} />}
            Enter Matchmaking Pool
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE MATCHES VIEW (Tinder-style swipe deck with chatbot filters)
  const currentCandidate = candidates[activeCardIndex];
  const hasFinishedDeck = activeCardIndex >= candidates.length;

  return (
    <div className="space-y-5">
      {/* Active status info header */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-indigo-50/20 dark:bg-indigo-950/10">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="text-emerald-500" size={16} />
          <div>
            <p className="text-xs font-bold text-primary">Registered Solo Seeker</p>
            <p className="text-[10px] text-muted-fg">Role: {seekerStatusRes.data.role} • Active Matchmaking Enabled</p>
          </div>
        </div>
        <button
          onClick={() => removeMutation.mutate()}
          disabled={removeMutation.isPending}
          className="text-xs font-semibold text-rose-500 hover:underline transition disabled:opacity-50"
        >
          Opt Out
        </button>
      </div>

      {/* Seeker matches deck filters */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-3" style={{ background: "var(--bg-surface)" }}>
        <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
          <Filter size={14} className="text-indigo-500" />
          <span>Teammate Search Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="text-xs text-primary rounded-lg border border-border p-2 focus:border-indigo-500 focus:outline-none"
            style={{ background: "var(--bg-surface)" }}
          >
            <option value="">All Complementary Roles</option>
            <option value="FRONTEND">Frontend Developers</option>
            <option value="BACKEND">Backend Developers</option>
            <option value="DEVOPS">DevOps Specialists</option>
            <option value="ML_AI">ML/AI Engineers</option>
            <option value="MOBILE">Mobile Developers</option>
            <option value="DATA">Data Engineers</option>
            <option value="SECURITY">Security Experts</option>
          </select>

          <input
            type="text"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Type skill e.g. Python, Docker, React"
            className="text-xs text-primary rounded-lg border border-border p-2 focus:border-indigo-500 focus:outline-none"
            style={{ background: "var(--bg-surface)" }}
          />
        </div>
      </div>

      {/* Fallback Banner Alert */}
      {isSeeker && matchData.isFallback && !loadingMatches && (
        <div className="flex gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-[11px] text-amber-700">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>No specific candidates are looking for teams for this hackathon yet. Displaying active complementary engineers from the general platform matching pool.</span>
        </div>
      )}

      {/* Swipe Deck Container */}
      {loadingMatches ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="animate-spin text-indigo-500 mb-2" size={24} />
          <p className="text-xs text-muted-fg">Finding matching developers...</p>
        </div>
      ) : hasFinishedDeck ? (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-border rounded-xl text-center">
          <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-500 mb-3">
            <Users size={18} />
          </div>
          <h4 className="text-sm font-semibold text-primary">End of Matching Deck</h4>
          <p className="text-xs text-muted-fg mt-1 max-w-sm">
            You've swiped through all compatible candidates. Try clearing your filters or checking back as more engineers join the pool.
          </p>
        </div>
      ) : (
        <div className="relative p-5 border border-border rounded-xl shadow-sm transition-all duration-300 transform" style={{ background: "var(--bg-surface)" }}>
          {/* Card Head details */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full overflow-hidden border border-border bg-surface shrink-0">
                {currentCandidate.avatar ? (
                  <img src={currentCandidate.avatar} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm">
                    {(currentCandidate.fullName || currentCandidate.username || "?")[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-primary">
                  {currentCandidate.fullName || currentCandidate.username}
                </h4>
                <p className="text-xs text-muted-fg line-clamp-1">{currentCandidate.headline || "Engineer"}</p>
              </div>
            </div>

            <div className="text-right">
              <span className="chip bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200">
                {currentCandidate.dominantCategory}
              </span>
              <div className="text-[10px] text-muted-fg font-semibold mt-1">Score: {currentCandidate.engineeringScore}</div>
            </div>
          </div>

          {/* Custom Seeker Pitch Message */}
          {currentCandidate.message && (
            <div className="mt-4 p-3 rounded-lg border border-border bg-surface text-xs text-primary leading-relaxed italic">
              "{currentCandidate.message}"
            </div>
          )}

          {/* Matched skills */}
          <div className="mt-4 space-y-1.5">
            <h5 className="text-[10px] font-bold text-muted-fg uppercase tracking-wider">Matched Complementary Skills</h5>
            <div className="flex flex-wrap gap-1.5">
              {currentCandidate.matchedSkills.map((sk: string, i: number) => (
                <span key={i} className="chip bg-surface border border-border rounded px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {sk}
                </span>
              ))}
            </div>
          </div>

          {/* Action buttons (Tinder swipe triggers) */}
          <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-border">
            <button
              onClick={handleNextCard}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 shadow-sm transition hover:scale-105"
              title="Skip / Pass"
            >
              <ThumbsDown size={18} />
            </button>

            <button
              onClick={() => chatMutation.mutate(currentCandidate.id)}
              disabled={chatMutation.isPending}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-500 shadow-sm transition hover:scale-105"
              title="Chat Direct Message"
            >
              {chatMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <MessageSquare size={18} />}
            </button>

            <button
              onClick={() => setShowInviteModal(currentCandidate.id)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-700 hover:bg-indigo-800 text-white shadow-md transition hover:scale-105"
              title="Invite to Hackathon Team"
            >
              <UserPlus size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Select Team Invitation Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border p-5 shadow-lg bg-card" style={{ background: "var(--bg-surface)" }}>
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-sm font-bold text-primary">Select Team to Invite</h4>
              <button onClick={() => setShowInviteModal(null)} className="text-muted-fg hover:text-primary">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              {myTeams.length === 0 ? (
                <div className="p-3 text-center border border-dashed border-border rounded-lg text-xs text-muted-fg">
                  You don't own any active teams. Please create a team first in the Teams workspace tab.
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-fg uppercase tracking-wider block">Your Teams</label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    required
                    className="w-full text-xs text-primary rounded-lg border border-border p-2 focus:border-indigo-500 focus:outline-none"
                    style={{ background: "var(--bg-surface)" }}
                  >
                    <option value="">-- Choose Team --</option>
                    {myTeams.map((team: any) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(null)}
                  className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-primary hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending || !selectedTeamId}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white px-3.5 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {inviteMutation.isPending ? <Loader2 className="animate-spin" size={12} /> : null}
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
