import {
  Briefcase,
  Code2,
  FolderKanban,
  GraduationCap,
  MessageSquare,
  Settings,
  User,
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
import { PostsTab } from "./PostsTab";
import { useProfileWorkspace } from "../../hooks/useProfileWorkspace";

type Tab = "about" | "posts" | "experience" | "skills" | "education" | "projects" | "settings";

const TABS: { id: Tab; label: string; icon: React.FC<{ size?: number }> }[] = [
  { id: "about", label: "About", icon: User },
  { id: "posts", label: "Posts & Reposts", icon: MessageSquare },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "skills", label: "Skills", icon: Code2 },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "settings", label: "Settings", icon: Settings },
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

  return (
    <div className="mx-auto max-w-5xl space-y-0">
      <ProfileHeader
        profile={profile}
        loading={profileQuery.isFetching}
        completedTasks={completedTasks}
        totalTasks={profileTasks.length}
      />

      {/* Tab Navigation */}
      <div className="sticky top-0 z-20 -mx-0 mt-0 border-b backdrop-blur-sm shadow-sm border-base bg-surface/90">
        <div className="flex overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`profile-tab-${id}`}
              className={`relative flex shrink-0 items-center gap-2 px-5 py-3.5 text-sm font-medium transition
                ${activeTab === id
                  ? "text-brand"
                  : "text-muted-fg hover:text-primary"
                }`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={16} />
              {label}
              {activeTab === id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "about" && (
          <ProfileOverview
            profile={profile}
            completedTasks={completedTasks}
            tasks={profileTasks}
          />
        )}

        {activeTab === "posts" && profile.id && (
          <PostsTab userId={profile.id} />
        )}

        {activeTab === "experience" && (
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

        {activeTab === "skills" && (
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

        {activeTab === "education" && (
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

        {activeTab === "projects" && (
          <ProfileProjects
            projects={projectsQuery.data || []}
            isFetching={projectsQuery.isFetching}
            currentUserId={profile.id}
          />
        )}

        {activeTab === "settings" && (
          <ProfileSettings
            profileForm={profileForm}
            onProfileFormChange={setProfileForm}
            onSave={saveProfile}
            isSavePending={updateProfile.isPending}
          />
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
