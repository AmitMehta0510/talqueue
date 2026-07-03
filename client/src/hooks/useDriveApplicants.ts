import { useState } from "react";
import { PlacementDriveApplicationStatus, PlacementDriveRound } from "../lib/api";
import {
  useDriveApplicantsQuery,
  useUpdateDriveApplicationStatusMutation,
  useDriveRoundsQuery,
  useCreateDriveRoundMutation,
  useUpdateDriveRoundMutation,
  useDeleteDriveRoundMutation,
  useShortlistForRoundMutation,
} from "./usePlatformQueries";

export function useDriveApplicants(driveId: string) {
  const [activeTab, setActiveTab] = useState<"applicants" | "rounds">("applicants");

  // Queries & Mutations
  const applicantsQuery = useDriveApplicantsQuery(driveId);
  const updateStatusMutation = useUpdateDriveApplicationStatusMutation();

  const roundsQuery = useDriveRoundsQuery(driveId);
  const createRoundMutation = useCreateDriveRoundMutation();
  const updateRoundMutation = useUpdateDriveRoundMutation();
  const deleteRoundMutation = useDeleteDriveRoundMutation(driveId);
  const shortlistForRoundMutation = useShortlistForRoundMutation(driveId);

  // Applicants filter states
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Round Creation/Editing State
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [roundType, setRoundType] = useState("APTITUDE_TEST");
  const [scheduledAt, setScheduledAt] = useState("");
  const [venue, setVenue] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [notes, setNotes] = useState("");

  // Shortlisting workflow state
  const [shortlistRoundId, setShortlistRoundId] = useState<string | null>(null);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [targetStatus, setTargetStatus] = useState<PlacementDriveApplicationStatus | "">("");

  const applicants = applicantsQuery.data || [];
  const rounds = roundsQuery.data || [];

  const filteredApplicants = applicants.filter((app) => {
    if (statusFilter === "ALL") return true;
    return app.status === statusFilter;
  });

  const handleStatusChange = async (applicationId: string, status: PlacementDriveApplicationStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ applicationId, status });
      setActiveDropdownId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditRound = (round: PlacementDriveRound) => {
    setEditingRoundId(round.id);
    setRoundType(round.roundType);
    setScheduledAt(round.scheduledAt ? new Date(round.scheduledAt).toISOString().slice(0, 16) : "");
    setVenue(round.venue || "");
    setMeetLink(round.meetLink || "");
    setDurationMin(round.durationMin || 60);
    setNotes(round.notes || "");
    setShowRoundForm(true);
  };

  const handleResetRoundForm = () => {
    setEditingRoundId(null);
    setRoundType("APTITUDE_TEST");
    setScheduledAt("");
    setVenue("");
    setMeetLink("");
    setDurationMin(60);
    setNotes("");
    setShowRoundForm(false);
  };

  const handleSaveRound = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      roundType,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      venue: venue || undefined,
      meetLink: meetLink || undefined,
      durationMin: Number(durationMin) || undefined,
      notes: notes || undefined,
    };

    try {
      if (editingRoundId) {
        await updateRoundMutation.mutateAsync({ roundId: editingRoundId, body: payload });
      } else {
        await createRoundMutation.mutateAsync({ driveId, body: payload });
      }
      handleResetRoundForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRound = async (roundId: string) => {
    if (confirm("Are you sure you want to delete this round?")) {
      await deleteRoundMutation.mutateAsync(roundId);
    }
  };

  const handleStartShortlist = (roundId: string) => {
    setShortlistRoundId(roundId);
    setSelectedApps([]);
    setTargetStatus("");
  };

  const handleToggleSelectApp = (appId: string) => {
    setSelectedApps((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const handleSelectAllApps = (isAll: boolean) => {
    if (isAll) {
      setSelectedApps(applicants.map((a) => a.id));
    } else {
      setSelectedApps([]);
    }
  };

  const handleSaveShortlist = async () => {
    if (selectedApps.length === 0) return;
    try {
      await shortlistForRoundMutation.mutateAsync({
        roundId: shortlistRoundId!,
        applicationIds: selectedApps,
        updateStatus: targetStatus || undefined,
      });
      setShortlistRoundId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const currentShortlistRound = rounds.find((r) => r.id === shortlistRoundId);

  return {
    activeTab,
    setActiveTab,
    applicantsQuery,
    updateStatusMutation,
    roundsQuery,
    createRoundMutation,
    updateRoundMutation,
    deleteRoundMutation,
    shortlistForRoundMutation,
    statusFilter,
    setStatusFilter,
    activeDropdownId,
    setActiveDropdownId,
    showRoundForm,
    setShowRoundForm,
    editingRoundId,
    setEditingRoundId,
    roundType,
    setRoundType,
    scheduledAt,
    setScheduledAt,
    venue,
    setVenue,
    meetLink,
    setMeetLink,
    durationMin,
    setDurationMin,
    notes,
    setNotes,
    shortlistRoundId,
    setShortlistRoundId,
    selectedApps,
    setSelectedApps,
    targetStatus,
    setTargetStatus,
    applicants,
    rounds,
    filteredApplicants,
    handleStatusChange,
    handleStartEditRound,
    handleResetRoundForm,
    handleSaveRound,
    handleDeleteRound,
    handleStartShortlist,
    handleToggleSelectApp,
    handleSelectAllApps,
    handleSaveShortlist,
    currentShortlistRound,
  };
}
export default useDriveApplicants;
