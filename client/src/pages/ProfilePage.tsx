import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Briefcase,
  Code2,
  FolderKanban,
  GraduationCap,
  Loader2,
  MessageSquare,
  Settings,
  User,
} from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { useUrlState } from "../core/utils/useUrlState";
import { api, College, User as UserType } from "../lib/api";
import {
  compactPayload,
  getErrorMessage,
  splitCsv,
  titleCase,
} from "../core/utils/format";
import { useAuth } from "../core/contexts/AuthContext";
import { useToast } from "../core/contexts/ToastContext";
import { ErrorState } from "../components/ui";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import {
  useAddEducationMutation,
  useAddExperienceMutation,
  useAddSkillMutation,
  useMyEducationsQuery,
  useMyExperiencesQuery,
  useMyFullProfileQuery,
  useMyProjectsQuery,
  useMySkillsQuery,
  useRemoveEducationMutation,
  useRemoveExperienceMutation,
  useRemoveSkillMutation,
  useVerifySkillsMutation,
  useUpdateEducationMutation,
  useUpdateExperienceMutation,
  useUpdateProfileMutation,
  useVerifyCollegeEmailMutation,
  useVerifyWorkEmailMutation,
  useStandardDepartmentsQuery,
  useUserTimelineQuery,
  usePostReactionMutation,
  useCommentOnPostMutation,
  useRepostMutation,
} from "../hooks/usePlatformQueries";
import { FeedCard } from "../components/cards/FeedCard";

// Subcomponents
import { ProfileHeader } from "../components/profile/ProfileHeader";
import { ProfileOverview } from "../components/profile/ProfileOverview";
import { ProfileSkills } from "../components/profile/ProfileSkills";
import { ProfileExperience } from "../components/profile/ProfileExperience";
import { ProfileEducation } from "../components/profile/ProfileEducation";
import { ProfileProjects } from "../components/profile/ProfileProjects";
import { ProfileSettings } from "../components/profile/ProfileSettings";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "about" | "posts" | "experience" | "skills" | "education" | "projects" | "settings";

import { emptyExperienceForm, emptyEducationForm } from "../components/profile/ProfileHelpers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenPages<T, K extends string>(pages: Array<Record<K, T[]>>, key: K) {
  return pages.flatMap((page) => page[key] || []);
}

const hasValue = (value?: string | null) => Boolean(value && value.trim());

const getProfileCompletionTasks = (
  profile: UserType,
  counts: { skills: number; experiences: number; educations: number },
) => [
    {
      label: "Add name and headline",
      complete: hasValue(profile.profile?.fullName) && hasValue(profile.profile?.headline),
    },
    { label: "Write a short bio", complete: hasValue(profile.profile?.bio) },
    {
      label: "Select college and department",
      complete: Boolean(profile.profile?.collegeId && profile.profile?.departmentId),
    },
    { label: "Add at least 3 skills", complete: counts.skills >= 3 },
    { label: "Add experience", complete: counts.experiences > 0 },
    { label: "Add education", complete: counts.educations > 0 },
    {
      label: "Add GitHub, LinkedIn, or portfolio",
      complete: Boolean(
        profile.profile?.githubUrl ||
        profile.profile?.linkedinUrl ||
        profile.profile?.portfolioUrl,
      ),
    },
  ];

// ─── Root ─────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <ProfileWorkspace fallbackUser={user} />;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.FC<{ size?: number }> }[] = [
  { id: "about", label: "About", icon: User },
  { id: "posts", label: "Posts & Reposts", icon: MessageSquare },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "skills", label: "Skills", icon: Code2 },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "settings", label: "Settings", icon: Settings },
];

// ─── Workspace ────────────────────────────────────────────────────────────────

function ProfileWorkspace({ fallbackUser }: { fallbackUser: UserType }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useUrlState<Tab>("tab", "about", {
    serialize: (val) => val === "about" ? "overview" : val,
    deserialize: (str) => str === "overview" ? "about" : str as Tab
  });
  const [showExperienceForm, setShowExperienceForm] = useState(false);
  const [showEducationForm, setShowEducationForm] = useState(false);
  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
  const [editingEducationId, setEditingEducationId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "skill" | "experience" | "education"; id: string; label: string } | null>(null);

  const profileQuery = useMyFullProfileQuery();
  const skillsQuery = useMySkillsQuery(20);
  const experiencesQuery = useMyExperiencesQuery(10);
  const educationsQuery = useMyEducationsQuery(10);
  const projectsQuery = useMyProjectsQuery();
  const updateProfile = useUpdateProfileMutation();
  const addSkill = useAddSkillMutation();
  const addExperience = useAddExperienceMutation();
  const addEducation = useAddEducationMutation();
  const removeSkill = useRemoveSkillMutation();
  const removeExperience = useRemoveExperienceMutation();
  const removeEducation = useRemoveEducationMutation();
  const updateExperience = useUpdateExperienceMutation();
  const updateEducation = useUpdateEducationMutation();
  const verifySkills = useVerifySkillsMutation();
  const verifyCollegeEmail = useVerifyCollegeEmailMutation();
  const verifyWorkEmail = useVerifyWorkEmailMutation();

  const profile = profileQuery.data || fallbackUser;

  const skills = useMemo(
    () => flattenPages(skillsQuery.data?.pages || [], "skills"),
    [skillsQuery.data?.pages],
  );
  const experiences = useMemo(
    () => flattenPages(experiencesQuery.data?.pages || [], "experiences"),
    [experiencesQuery.data?.pages],
  );
  const educations = useMemo(
    () => flattenPages(educationsQuery.data?.pages || [], "educations"),
    [educationsQuery.data?.pages],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === "skill") await removeSkill.mutateAsync(confirmDelete.id);
      else if (confirmDelete.type === "experience") await removeExperience.mutateAsync(confirmDelete.id);
      else if (confirmDelete.type === "education") await removeEducation.mutateAsync(confirmDelete.id);
    } catch {
      // Mutation hook shows toast
    }
    setConfirmDelete(null);
  }, [confirmDelete, removeSkill, removeExperience, removeEducation]);

  const leetcodeProfile = profile.codingProfiles?.find((p: any) => p.platform.toLowerCase() === "leetcode");
  const hackerrankProfile = profile.codingProfiles?.find((p: any) => p.platform.toLowerCase() === "hackerrank");
  const gfgProfile = profile.codingProfiles?.find((p: any) => p.platform.toLowerCase() === "geeksforgeeks");

  // Profile form state
  const [collegeQuery, setCollegeQuery] = useState("");
  const [collegeResults, setCollegeResults] = useState<College[]>([]);
  const [profileForm, setProfileForm] = useState({
    fullName: profile.profile?.fullName || "",
    username: profile.username || "",
    headline: profile.profile?.headline || "",
    bio: profile.profile?.bio || "",
    location: profile.profile?.location || "",
    availabilityText: profile.profile?.availabilityText || "",
    avatarUrl: profile.profile?.avatarUrl || "",
    bannerUrl: profile.profile?.bannerUrl || "",
    resumeUrl: profile.profile?.resumeUrl || "",
    githubUrl: profile.profile?.githubUrl || "",
    linkedinUrl: profile.profile?.linkedinUrl || "",
    portfolioUrl: profile.profile?.portfolioUrl || "",
    leetcodeUrl: leetcodeProfile?.url || "",
    hackerrankUrl: hackerrankProfile?.url || "",
    gfgUrl: gfgProfile?.url || "",
    graduationYear: profile.profile?.graduationYear?.toString() || "",
    acceptingReferrals: profile.acceptingReferrals || false,
    openToWork: profile.openToWork || false,
    openToInternship: profile.openToInternship || false,
    availabilityStatus: profile.availabilityStatus || "NOT_AVAILABLE",
  });
  const [experienceForm, setExperienceForm] = useState(emptyExperienceForm);
  const [educationForm, setEducationForm] = useState(emptyEducationForm);

  const standardDepartmentsQuery = useStandardDepartmentsQuery();

  const profileTasks = getProfileCompletionTasks(profile, {
    skills: skills.length,
    experiences: experiences.length,
    educations: educations.length,
  });
  const completedTasks = profileTasks.filter((t) => t.complete).length;
  const standardDepartments = standardDepartmentsQuery.data || [];

  // Sync form when profile loads
  useEffect(() => {
    if (!profileQuery.data) return;
    const lc = profile.codingProfiles?.find((p: any) => p.platform.toLowerCase() === "leetcode");
    const hr = profile.codingProfiles?.find((p: any) => p.platform.toLowerCase() === "hackerrank");
    const gfg = profile.codingProfiles?.find((p: any) => p.platform.toLowerCase() === "geeksforgeeks");

    setProfileForm({
      fullName: profile.profile?.fullName || "",
      username: profile.username || "",
      headline: profile.profile?.headline || "",
      bio: profile.profile?.bio || "",
      location: profile.profile?.location || "",
      availabilityText: profile.profile?.availabilityText || "",
      avatarUrl: profile.profile?.avatarUrl || "",
      bannerUrl: profile.profile?.bannerUrl || "",
      resumeUrl: profile.profile?.resumeUrl || "",
      githubUrl: profile.profile?.githubUrl || "",
      linkedinUrl: profile.profile?.linkedinUrl || "",
      portfolioUrl: profile.profile?.portfolioUrl || "",
      leetcodeUrl: lc?.url || "",
      hackerrankUrl: hr?.url || "",
      gfgUrl: gfg?.url || "",
      graduationYear: profile.profile?.graduationYear?.toString() || "",
      acceptingReferrals: profile.acceptingReferrals || false,
      openToWork: profile.openToWork || false,
      openToInternship: profile.openToInternship || false,
      availabilityStatus: profile.availabilityStatus || "NOT_AVAILABLE",
    });
  }, [profile, profileQuery.data]);

  // College search
  useEffect(() => {
    const query = collegeQuery.trim();
    if (query.length < 2 || query === educationForm.collegeName) {
      setCollegeResults([]);
      return;
    }
    const timeout = window.setTimeout(async () => {
      try {
        const result = await api.searchColleges(query);
        setCollegeResults(result.data);
      } catch {
        setCollegeResults([]);
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [collegeQuery, educationForm.collegeName]);

  const selectCollege = useCallback((college: College) => {
    setCollegeQuery(college.name);
    setCollegeResults([]);
    setEducationForm((e) => ({
      ...e,
      collegeId: college.id,
      collegeName: college.name,
      departmentId: "",
      isOtherDepartment: false,
      customDepartmentName: "",
      fieldOfStudy: "",
    }));
  }, []);

  const changeCollegeQuery = useCallback((value: string) => {
    setCollegeQuery(value);
    setEducationForm((e) => {
      if (value !== e.collegeName) {
        return {
          ...e,
          collegeId: "",
          collegeName: "",
          isOtherCollege: false,
          departmentId: "",
          isOtherDepartment: false,
          customDepartmentName: "",
          fieldOfStudy: "",
        };
      }
      return e;
    });
  }, []);

  const selectOtherCollege = useCallback(() => {
    setCollegeQuery("");
    setCollegeResults([]);
    setEducationForm((e) => ({
      ...e,
      collegeId: "",
      collegeName: "",
      isOtherCollege: true,
      departmentId: "",
      isOtherDepartment: false,
      customDepartmentName: "",
      fieldOfStudy: "",
    }));
  }, []);

  const cancelOtherCollege = useCallback(() => {
    setEducationForm((e) => ({
      ...e,
      isOtherCollege: false,
      customCollegeName: "",
    }));
  }, []);

  const saveProfile = useCallback((event: FormEvent) => {
    event.preventDefault();
    updateProfile.mutate(
      compactPayload({
        ...profileForm,
        graduationYear: profileForm.graduationYear
          ? Number(profileForm.graduationYear)
          : undefined,
      }),
    );
  }, [profileForm, updateProfile]);

  const submitExperience = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (
      experienceForm.startDate &&
      experienceForm.endDate &&
      !experienceForm.isCurrent &&
      new Date(experienceForm.endDate) < new Date(experienceForm.startDate)
    ) {
      showToast("error", "End date cannot be before start date");
      return;
    }
    try {
      if (editingExperienceId) {
        await updateExperience.mutateAsync({
          id: editingExperienceId,
          companyWebsiteUrl: experienceForm.companyWebsiteUrl || undefined,
          title: experienceForm.title,
          employmentType: experienceForm.employmentType,
          startDate: experienceForm.startDate,
          ...compactPayload({
            endDate: experienceForm.isCurrent ? undefined : experienceForm.endDate,
            isCurrent: experienceForm.isCurrent,
            description: experienceForm.description,
            workEmail: experienceForm.workEmail,
            managerName: experienceForm.managerName,
            managerEmail: experienceForm.managerEmail,
            managerLinkedinUrl: experienceForm.managerLinkedinUrl,
            techStack: splitCsv(experienceForm.techStack),
            skillsUsed: splitCsv(experienceForm.skillsUsed),
            teamSize: experienceForm.teamSize ? Number(experienceForm.teamSize) : undefined,
          }),
        });
      } else {
        await addExperience.mutateAsync({
          companyName: experienceForm.companyName,
          companyWebsiteUrl: experienceForm.companyWebsiteUrl || undefined,
          title: experienceForm.title,
          employmentType: experienceForm.employmentType,
          startDate: experienceForm.startDate,
          ...compactPayload({
            endDate: experienceForm.isCurrent ? undefined : experienceForm.endDate,
            isCurrent: experienceForm.isCurrent,
            description: experienceForm.description,
            workEmail: experienceForm.workEmail,
            managerName: experienceForm.managerName,
            managerEmail: experienceForm.managerEmail,
            managerLinkedinUrl: experienceForm.managerLinkedinUrl,
            techStack: splitCsv(experienceForm.techStack),
            skillsUsed: splitCsv(experienceForm.skillsUsed),
            teamSize: experienceForm.teamSize ? Number(experienceForm.teamSize) : undefined,
          }),
        });
      }
      setExperienceForm(emptyExperienceForm);
      setShowExperienceForm(false);
      setEditingExperienceId(null);
    } catch {
      // Mutation hook shows toast
    }
  }, [experienceForm, editingExperienceId, updateExperience, addExperience, showToast]);

  const submitEducation = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (!educationForm.isOtherCollege && !educationForm.collegeId) {
      showToast("error", "Select a college from the list, or choose 'My college isn't listed'");
      return;
    }
    if (educationForm.isOtherCollege && !educationForm.customCollegeName.trim()) {
      showToast("error", "Please enter your college name");
      return;
    }
    if (educationForm.isOtherDepartment && !educationForm.customDepartmentName.trim()) {
      showToast("error", "Please enter your department/branch name");
      return;
    }
    if (
      educationForm.startYear &&
      educationForm.endYear &&
      !educationForm.current &&
      Number(educationForm.endYear) < Number(educationForm.startYear)
    ) {
      showToast("error", "End year cannot be before start year");
      return;
    }

    const deptIdToSend = educationForm.isOtherDepartment
      ? educationForm.customDepartmentName.trim()
      : educationForm.departmentId;

    const fieldOfStudyToSend = educationForm.isOtherDepartment
      ? educationForm.customDepartmentName.trim()
      : educationForm.fieldOfStudy;

    try {
      if (editingEducationId) {
        await updateEducation.mutateAsync({
          id: editingEducationId,
          ...compactPayload({
            collegeId: educationForm.isOtherCollege ? undefined : educationForm.collegeId || undefined,
            customCollegeName: educationForm.isOtherCollege ? educationForm.customCollegeName || undefined : undefined,
            departmentId: deptIdToSend || undefined,
            degree: educationForm.degree || undefined,
            fieldOfStudy: fieldOfStudyToSend || undefined,
            startYear: educationForm.startYear ? Number(educationForm.startYear) : undefined,
            endYear:
              educationForm.current || !educationForm.endYear
                ? undefined
                : Number(educationForm.endYear),
            current: educationForm.current,
            cgpa: educationForm.cgpa ? Number(educationForm.cgpa) : undefined,
            backlogs: educationForm.backlogs !== "" ? Number(educationForm.backlogs) : undefined,
            currentYear: educationForm.currentYear ? Number(educationForm.currentYear) : undefined,
          }),
        });
      } else {
        await addEducation.mutateAsync({
          ...compactPayload({
            collegeId: educationForm.isOtherCollege ? undefined : educationForm.collegeId || undefined,
            customCollegeName: educationForm.isOtherCollege ? educationForm.customCollegeName || undefined : undefined,
            departmentId: deptIdToSend || undefined,
            degree: educationForm.degree || undefined,
            fieldOfStudy: fieldOfStudyToSend || undefined,
            startYear: educationForm.startYear ? Number(educationForm.startYear) : undefined,
            endYear:
              educationForm.current || !educationForm.endYear
                ? undefined
                : Number(educationForm.endYear),
            current: educationForm.current,
            cgpa: educationForm.cgpa ? Number(educationForm.cgpa) : undefined,
            backlogs: educationForm.backlogs !== "" ? Number(educationForm.backlogs) : undefined,
            currentYear: educationForm.currentYear ? Number(educationForm.currentYear) : undefined,
          }),
        });
      }
      setEducationForm(emptyEducationForm);
      setCollegeQuery("");
      setCollegeResults([]);
      setShowEducationForm(false);
      setEditingEducationId(null);
    } catch {
      // Mutation hook shows toast
    }
  }, [educationForm, editingEducationId, updateEducation, addEducation, showToast]);

  const handleEditExperience = useCallback((exp: any) => {
    setExperienceForm({
      companyName: exp.companyName || exp.company?.name || "",
      companyWebsiteUrl: exp.company?.websiteUrl || "",
      title: exp.title || "",
      employmentType: exp.employmentType || "FULL_TIME",
      startDate: exp.startDate ? exp.startDate.split("T")[0] : "",
      endDate: exp.endDate ? exp.endDate.split("T")[0] : "",
      isCurrent: exp.isCurrent || false,
      description: exp.description || "",
      workEmail: exp.workEmail || "",
      managerName: exp.managerName || "",
      managerEmail: exp.managerEmail || "",
      managerLinkedinUrl: exp.managerLinkedinUrl || "",
      techStack: exp.techStack ? exp.techStack.join(", ") : "",
      skillsUsed: exp.skillsUsed ? exp.skillsUsed.join(", ") : "",
      teamSize: exp.teamSize ? exp.teamSize.toString() : "",
    });
    setEditingExperienceId(exp.id);
    setShowExperienceForm(true);
  }, []);

  const handleCancelExperience = useCallback(() => {
    setExperienceForm(emptyExperienceForm);
    setShowExperienceForm(false);
    setEditingExperienceId(null);
  }, []);

  const setFormFromEdu = useCallback((edu: any) => {
    const isOther = !edu.collegeId && Boolean(edu.customCollegeName);
    const standardId = edu.department?.standardDepartmentId || null;
    const isOtherDept = edu.departmentId ? !standardId : false;

    setEducationForm({
      collegeId: edu.collegeId || "",
      collegeName: edu.college?.name || "",
      isOtherCollege: isOther,
      customCollegeName: edu.customCollegeName || "",
      departmentId: standardId || edu.departmentId || "",
      isOtherDepartment: isOtherDept,
      customDepartmentName: isOtherDept ? edu.department?.name || edu.fieldOfStudy || "" : "",
      degree: edu.degree || "",
      fieldOfStudy: edu.fieldOfStudy || "",
      startYear: edu.startYear ? edu.startYear.toString() : "",
      endYear: edu.endYear ? edu.endYear.toString() : "",
      current: edu.current || false,
      cgpa: edu.cgpa !== null && edu.cgpa !== undefined ? edu.cgpa.toString() : "",
      backlogs: edu.backlogs !== null && edu.backlogs !== undefined ? edu.backlogs.toString() : "",
      currentYear: edu.currentYear !== null && edu.currentYear !== undefined ? edu.currentYear.toString() : "",
    });
  }, []);

  const handleEditEducation = useCallback((edu: any) => {
    setFormFromEdu(edu);
    setCollegeQuery(edu.college?.name || "");
    setEditingEducationId(edu.id);
    setShowEducationForm(true);
  }, [setFormFromEdu]);

  const handleCancelEducation = useCallback(() => {
    setEducationForm(emptyEducationForm);
    setCollegeQuery("");
    setCollegeResults([]);
    setShowEducationForm(false);
    setEditingEducationId(null);
  }, []);

  const handleVerifyCollegeEmail = useCallback(async (educationId: string, email: string, code?: string) => {
    return verifyCollegeEmail.mutateAsync({ educationId, email, code });
  }, [verifyCollegeEmail]);

  const handleVerifyWorkEmail = useCallback(async (experienceId: string, email: string, code?: string) => {
    return verifyWorkEmail.mutateAsync({ experienceId, email, code });
  }, [verifyWorkEmail]);

  if (profileQuery.isError) {
    return (
      <ErrorState
        title="Profile could not load"
        text={getErrorMessage(profileQuery.error)}
        onRetry={() => profileQuery.refetch()}
      />
    );
  }


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

// ─── Posts Tab ────────────────────────────────────────────────────────────────
function PostsTab({ userId }: { userId: string }) {
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
            key={`${item.type}-${(item.data as any).id || index}`}
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
