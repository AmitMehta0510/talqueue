import {
  Briefcase,
  Calendar,
  Code2,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Sparkles,
} from "lucide-react";
import { User as UserType } from "../../lib/api";
import { titleCase, compactPayload } from "../../core/utils/format";
import { ConfirmDialog } from "../ui/ConfirmDialog";

// Subcomponents
import { ProfileHeader } from "./ProfileHeader";
import { ProfileOverview } from "./ProfileOverview";
import { ProfileSkills } from "./ProfileSkills";
import { ProfileExperience } from "./ProfileExperience";
import { ProfileEducation } from "./ProfileEducation";
import { ProfileProjects } from "./ProfileProjects";
import { ProfileSettings } from "./ProfileSettings";
import { ProfileAIReview } from "./ProfileAIReview";
import { AlumniAvailabilityManager } from "./AlumniAvailabilityManager";
import { MentorshipBookingsList } from "./MentorshipBookingsList";
import { useProfileWorkspace } from "../../hooks/useProfileWorkspace";

type Tab = "overview" | "experience" | "skills" | "education" | "projects" | "settings" | "ai-review" | "mentorship";

const TABS: { id: Tab; label: string; icon: React.FC<{ size?: number }> }[] = [
  { id: "overview",   label: "Overview",   icon: LayoutDashboard },
  { id: "experience", label: "Experience",  icon: Briefcase },
  { id: "skills",     label: "Skills",      icon: Code2 },
  { id: "education",  label: "Education",   icon: GraduationCap },
  { id: "projects",   label: "Projects",    icon: FolderKanban },
  { id: "ai-review",  label: "AI Review",   icon: Sparkles },
  { id: "mentorship", label: "Mentorship",  icon: Calendar },
  { id: "settings",   label: "Settings",    icon: Settings },
];

interface ProfileWorkspaceProps {
  fallbackUser: UserType;
}

export function ProfileWorkspace({ fallbackUser }: ProfileWorkspaceProps) {
  const {
    activeTab,
    setActiveTab,
    showExperienceForm,
    setShowExperienceForm,
    showEducationForm,
    setShowEducationForm,
    editingExperienceId,
    editingEducationId,
    confirmDelete,
    setConfirmDelete,
    profileQuery,
    skillsQuery,
    experiencesQuery,
    educationsQuery,
    projectsQuery,
    updateProfile,
    addSkill,
    addExperience,
    addEducation,
    updateExperience,
    updateEducation,
    removeSkill,
    removeExperience,
    removeEducation,
    verifySkills,
    profile,
    skills,
    experiences,
    educations,
    handleConfirmDelete,
    collegeQuery,
    collegeResults,
    profileForm,
    setProfileForm,
    experienceForm,
    setExperienceForm,
    educationForm,
    setEducationForm,
    standardDepartments,
    standardDepartmentsQuery,
    completedTasks,
    profileTasks,
    selectCollege,
    changeCollegeQuery,
    selectOtherCollege,
    cancelOtherCollege,
    saveProfile,
    submitExperience,
    submitEducation,
    handleEditExperience,
    handleCancelExperience,
    handleEditEducation,
    handleCancelEducation,
    handleVerifyCollegeEmail,
    handleVerifyWorkEmail,
  } = useProfileWorkspace(fallbackUser);

  // Cast to the wider type so the hook's stored "about" value still works
  const resolvedTab = (activeTab === "about" ? "overview" : activeTab) as Tab;

  return (
    <div className="mx-auto max-w-5xl space-y-0">
      <ProfileHeader
        profile={profile}
        loading={profileQuery.isFetching}
        completedTasks={completedTasks}
        totalTasks={profileTasks.length}
      />

      {/* ── Tab Navigation ─────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 mt-0 border-b backdrop-blur-sm shadow-sm"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--bg-surface) 95%, transparent)",
        }}
      >
        <div className="flex overflow-x-auto no-scrollbar">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = resolvedTab === id;
            return (
              <button
                key={id}
                id={`profile-tab-${id}`}
                type="button"
                className="relative flex shrink-0 items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all duration-200"
                style={
                  isActive
                    ? { color: "var(--brand)" }
                    : { color: "var(--text-muted)" }
                }
                onClick={() => setActiveTab(id as any)}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                }}
              >
                <Icon size={15} />
                {label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: "linear-gradient(90deg, var(--brand), #6366f1)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ────────────────────────────────────────── */}
      <div className="mt-6">
        {resolvedTab === "overview" && (
          <ProfileOverview
            profile={profile}
            completedTasks={completedTasks}
            tasks={profileTasks}
          />
        )}

        {resolvedTab === "experience" && (
          <ProfileExperience
            experiences={experiences}
            isFetching={experiencesQuery.isFetching}
            hasNextPage={experiencesQuery.hasNextPage}
            isFetchingNextPage={experiencesQuery.isFetchingNextPage}
            onLoadMore={() => experiencesQuery.fetchNextPage()}
            showForm={showExperienceForm}
            onToggleForm={() => setShowExperienceForm((v) => !v)}
            form={experienceForm}
            onFormChange={setExperienceForm}
            onSubmit={submitExperience}
            isPending={addExperience.isPending || updateExperience.isPending}
            editingId={editingExperienceId}
            onEdit={handleEditExperience}
            onDelete={(exp) => setConfirmDelete({ type: "experience", id: exp.id, label: exp.title || exp.companyName || "" })}
            onCancel={handleCancelExperience}
            onVerify={handleVerifyWorkEmail}
            tpoMemberships={profile.tpoMemberships}
            collegeAdminships={profile.collegeAdminships}
          />
        )}

        {resolvedTab === "skills" && (
          <ProfileSkills
            skills={skills}
            isFetching={skillsQuery.isFetching}
            hasNextPage={skillsQuery.hasNextPage}
            isFetchingNextPage={skillsQuery.isFetchingNextPage}
            onLoadMore={() => skillsQuery.fetchNextPage()}
            onAddSkill={addSkill.mutateAsync}
            isAdding={addSkill.isPending}
            onRemove={(skill) => setConfirmDelete({ type: "skill", id: skill.skill?.id || "", label: skill.skill?.name || "" })}
            onVerify={() => verifySkills.mutate()}
            isVerifying={verifySkills.isPending}
          />
        )}

        {resolvedTab === "education" && (
          <ProfileEducation
            educations={educations}
            isFetching={educationsQuery.isFetching}
            hasNextPage={educationsQuery.hasNextPage}
            isFetchingNextPage={educationsQuery.isFetchingNextPage}
            onLoadMore={() => educationsQuery.fetchNextPage()}
            showForm={showEducationForm}
            onToggleForm={() => {
              if (showEducationForm) {
                handleCancelEducation();
              } else {
                setShowEducationForm(true);
              }
            }}
            form={educationForm}
            onFormChange={setEducationForm}
            onSubmit={submitEducation}
            isPending={addEducation.isPending || updateEducation.isPending}
            editingId={editingEducationId}
            onEdit={handleEditEducation}
            onDelete={(edu) => setConfirmDelete({ type: "education", id: edu.id, label: edu.degree || edu.college?.name || edu.customCollegeName || "" })}
            onCancel={handleCancelEducation}
            collegeQuery={collegeQuery}
            onCollegeQueryChange={changeCollegeQuery}
            collegeResults={collegeResults}
            onSelectCollege={selectCollege}
            onSelectOtherCollege={selectOtherCollege}
            onCancelOtherCollege={cancelOtherCollege}
            departments={standardDepartments}
            departmentsLoading={standardDepartmentsQuery.isFetching}
            onVerify={handleVerifyCollegeEmail}
            graduationYear={profileForm.graduationYear ? Number(profileForm.graduationYear) : null}
            onSaveGraduationYear={async (year) => {
              await updateProfile.mutateAsync({
                ...compactPayload({
                  graduationYear: year,
                })
              });
            }}
            isSavingGraduationYear={updateProfile.isPending}
          />
        )}

        {resolvedTab === "projects" && (
          <ProfileProjects
            projects={projectsQuery.data || []}
            isFetching={projectsQuery.isFetching}
            currentUserId={profile.id}
          />
        )}

        {resolvedTab === "settings" && (
          <ProfileSettings
            profile={profile}
            profileForm={profileForm}
            onProfileFormChange={setProfileForm}
            onSave={saveProfile}
            isSavePending={updateProfile.isPending}
          />
        )}

        {resolvedTab === "ai-review" && (
          <ProfileAIReview />
        )}

        {resolvedTab === "mentorship" && (
          <div className="space-y-6">
            {/* Show scheduler if user is verified alumni */}
            {(educations || []).some((edu: any) => edu.isAlumni && edu.alumniVerified) ? (
              <AlumniAvailabilityManager />
            ) : (
              <div className="p-5 border border-border rounded-xl bg-card text-center" style={{ background: "var(--bg-surface)" }}>
                <p className="text-xs text-muted-fg leading-relaxed">
                  You are not registered as a verified alumni of any college.
                  Only Training and Placement Officer (TPO) verified alumni can publish mentorship availability slots.
                </p>
              </div>
            )}
            
            {/* Always show student's outgoing booked sessions list */}
            <div className="border-t border-border pt-6">
              <MentorshipBookingsList />
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title={`Delete ${confirmDelete ? titleCase(confirmDelete.type) : ""}`}
        message={`Are you sure you want to delete the ${confirmDelete?.type} "${confirmDelete?.label}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isPending={removeSkill.isPending || removeExperience.isPending || removeEducation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
