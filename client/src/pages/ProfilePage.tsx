import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Award,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  Circle,
  Code2,
  ExternalLink,
  FolderKanban,
  GraduationCap,
  Github,
  Globe,
  Linkedin,
  Link as LinkIcon,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  Users,
  X,
  Zap,
  MessageSquare,
} from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { api, College, Department, Project, Skill, User as UserType, StandardDepartment } from "../lib/api";
import {
  compactPayload,
  formatCount,
  getErrorMessage,
  splitCsv,
  titleCase,
  userHeadline,
  userName,
} from "../core/utils/format";
import { useAuth } from "../core/contexts/AuthContext";
import { useToast } from "../core/contexts/ToastContext";
import { Avatar, ErrorState, InlineLoader } from "../components/ui";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import {
  EducationCard,
  ExperienceCard,
  SkillPill,
} from "../components/cards/ProfileCards";
import { ProjectCard } from "../components/cards/ProjectCard";
import {
  useAddEducationMutation,
  useAddExperienceMutation,
  useAddSkillMutation,
  useCreateDepartmentMutation,
  useDepartmentsQuery,
  useMyEducationsQuery,
  useMyExperiencesQuery,
  useMyFullProfileQuery,
  useMyProjectsQuery,
  useMySkillsQuery,
  useRemoveEducationMutation,
  useRemoveExperienceMutation,
  useRemoveSkillMutation,
  useVerifySkillsMutation,
  useSkillSearchQuery,
  useUpdateEducationMutation,
  useUpdateExperienceMutation,
  useUpdateProfileMutation,
  useCompaniesQuery,
  useVerifyCollegeEmailMutation,
  useVerifyWorkEmailMutation,
  useStandardDepartmentsQuery,
  useUserTimelineQuery,
  usePostReactionMutation,
  useCommentOnPostMutation,
  useRepostMutation,
} from "../hooks/usePlatformQueries";
import { FeedCard } from "../components/cards/FeedCard";
import { useFileUpload } from "../features/storage/hooks/useFileUpload";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "about" | "posts" | "experience" | "skills" | "education" | "projects" | "settings";

const MAX_SKILLS = 30;

const emptyExperienceForm = {
  companyName: "",
  companyWebsiteUrl: "",
  title: "",
  employmentType: "FULL_TIME",
  startDate: "",
  endDate: "",
  isCurrent: false,
  description: "",
  workEmail: "",
  managerName: "",
  managerEmail: "",
  managerLinkedinUrl: "",
  techStack: "",
  skillsUsed: "",
  teamSize: "",
};

const emptyEducationForm = {
  collegeId: "",
  collegeName: "",
  isOtherCollege: false,
  customCollegeName: "",
  departmentId: "",
  isOtherDepartment: false,
  customDepartmentName: "",
  degree: "",
  fieldOfStudy: "",
  startYear: "",
  endYear: "",
  current: false,
};

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

// ─── Workspace ────────────────────────────────────────────────────────────────

function ProfileWorkspace({ fallbackUser }: { fallbackUser: UserType }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("about");
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

  const selectCollege = (college: College) => {
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
  };

  const changeCollegeQuery = (value: string) => {
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
  };

  const selectOtherCollege = () => {
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
  };

  const cancelOtherCollege = () => {
    setEducationForm((e) => ({
      ...e,
      isOtherCollege: false,
      customCollegeName: "",
    }));
  };

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    updateProfile.mutate(
      compactPayload({
        ...profileForm,
        graduationYear: profileForm.graduationYear
          ? Number(profileForm.graduationYear)
          : undefined,
      }),
    );
  };

  const submitExperience = async (event: FormEvent) => {
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
  };

  const submitEducation = async (event: FormEvent) => {
    event.preventDefault();
    // Validate: need either a selected college OR a custom name
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
  };

  const handleEditExperience = (exp: any) => {
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
  };

  const handleCancelExperience = () => {
    setExperienceForm(emptyExperienceForm);
    setShowExperienceForm(false);
    setEditingExperienceId(null);
  };

  const handleEditEducation = (edu: any) => {
    setFormFromEdu(edu);
    setCollegeQuery(edu.college?.name || "");
    setEditingEducationId(edu.id);
    setShowEducationForm(true);
  };

  const setFormFromEdu = (edu: any) => {
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
    });
  };

  const handleCancelEducation = () => {
    setEducationForm(emptyEducationForm);
    setCollegeQuery("");
    setCollegeResults([]);
    setShowEducationForm(false);
    setEditingEducationId(null);
  };

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

  const TABS: { id: Tab; label: string; icon: React.FC<{ size?: number }> }[] = [
    { id: "about", label: "About", icon: User },
    { id: "posts", label: "Posts & Reposts", icon: MessageSquare },
    { id: "experience", label: "Experience", icon: Briefcase },
    { id: "skills", label: "Skills", icon: Code2 },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-0">
      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <ProfileHero
        profile={profile}
        loading={profileQuery.isFetching}
        completedTasks={completedTasks}
        totalTasks={profileTasks.length}
      />

      {/* ── Tab Navigation ──────────────────────────────────────────── */}
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

      {/* ── Tab Content ─────────────────────────────────────────────── */}
      <div className="mt-6">
        {/* ABOUT */}
        {activeTab === "about" && (
          <AboutTab
            profile={profile}
            completedTasks={completedTasks}
            tasks={profileTasks}
          />
        )}

        {/* POSTS & REPOSTS */}
        {activeTab === "posts" && profile.id && (
          <PostsTab userId={profile.id} />
        )}

        {/* EXPERIENCE */}
        {activeTab === "experience" && (
          <ExperienceTab
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
          />
        )}

        {/* SKILLS */}
        {activeTab === "skills" && (
          <SkillsTab
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

        {/* EDUCATION */}
        {activeTab === "education" && (
          <EducationTab
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
            departments={standardDepartments as any}
            departmentsLoading={standardDepartmentsQuery.isFetching}
            onVerify={handleVerifyCollegeEmail}
          />
        )}

        {/* PROJECTS */}
        {activeTab === "projects" && (
          <ProjectsTab
            projects={projectsQuery.data || []}
            isFetching={projectsQuery.isFetching}
            currentUserId={profile.id}
          />
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <SettingsTab
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

// ─── Profile Hero ─────────────────────────────────────────────────────────────

function ProfileHero({
  profile,
  loading,
  completedTasks,
  totalTasks,
}: {
  profile: UserType;
  loading: boolean;
  completedTasks: number;
  totalTasks: number;
}) {
  const completePct = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const links = [
    { icon: Github, label: "GitHub", href: profile.profile?.githubUrl },
    { icon: Linkedin, label: "LinkedIn", href: profile.profile?.linkedinUrl },
    { icon: Globe, label: "Portfolio", href: profile.profile?.portfolioUrl },
    { icon: LinkIcon, label: "Resume", href: profile.profile?.resumeUrl },
  ].filter((l) => l.href);

  const availability = [
    profile.openToWork && "Open to work",
    profile.openToInternship && "Internships",
    profile.acceptingCollaborators && "Collaborators",
    profile.acceptingReferrals && "Referrals",
    profile.acceptingMentorship && "Mentorship",
  ].filter(Boolean) as string[];

  return (
    <div className="overflow-hidden rounded-t-xl border shadow-sm" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
      {/* Banner */}
      <div
        className="relative h-40 bg-cover bg-center"
        style={
          profile.profile?.bannerUrl
            ? { backgroundImage: `url(${profile.profile.bannerUrl})` }
            : { background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a5f 100%)" }
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Avatar + info */}
      <div className="px-6 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="-mt-10 flex items-end gap-4">
            <div className="relative">
              <div className="rounded-full p-1 shadow-lg" style={{ outline: "4px solid var(--bg-surface)", background: "var(--bg-surface)" }}>
                <Avatar user={profile} size="lg" />
              </div>
              {profile.verifiedEngineer && (
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 ring-2 ring-white">
                  <ShieldCheck size={13} className="text-white" />
                </div>
              )}
            </div>
            <div className="mb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{userName(profile)}</h1>
                {loading && <Loader2 className="animate-spin" size={15} style={{ color: "var(--text-muted)" }} />}
              </div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {userHeadline(profile) || `@${profile.username}`}
              </p>
              {profile.profile?.location && (
                <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  <MapPin size={11} />
                  {profile.profile.location}
                </p>
              )}
            </div>
          </div>

          {/* Trust + completion */}
          <div className="flex items-center gap-3">
            <CompletionRing pct={completePct} />
            <span className="chip flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-indigo-600 dark:text-indigo-400" />
              {titleCase(profile.trustLevel || "BEGINNER")}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-5 flex flex-wrap gap-6 border-t pt-5 text-center" style={{ borderColor: "var(--border)" }}>
          <QuickStat label="Reputation" value={formatCount(profile.reputationScore)} accent="indigo" />
          <QuickStat label="Engineering" value={Math.round(profile.engineeringScore || 0)} accent="teal" />
          <QuickStat label="Followers" value={formatCount(profile.followersCount)} accent="slate" />
          <QuickStat label="Connections" value={formatCount(profile.connectionCount)} accent="slate" />
          <QuickStat label="Posts" value={formatCount(profile.postCount)} accent="slate" />
        </div>

        {/* Links */}
        {links.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {links.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href!}
                target="_blank"
                rel="noreferrer"
                className="chip inline-flex items-center gap-1.5 transition hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-400"
              >
                <Icon size={13} />
                {label}
                <ExternalLink size={11} className="opacity-40" />
              </a>
            ))}
          </div>
        )}

        {/* Availability */}
        {availability.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {availability.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-700"
              >
                <Zap size={11} />
                {a}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Completion Ring ──────────────────────────────────────────────────────────

function CompletionRing({ pct }: { pct: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <svg width="56" height="56" className="-rotate-90">
          <circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke="#6366f1"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dash}
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute text-xs font-bold" style={{ color: "var(--text-primary)" }}>{pct}%</span>
      </div>
      <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Profile</span>
    </div>
  );
}

function QuickStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: "indigo" | "teal" | "slate";
}) {
  const textClass =
    accent === "indigo"
      ? "text-indigo-600 dark:text-indigo-400"
      : accent === "teal"
        ? "text-teal-600 dark:text-teal-400"
        : "";

  return (
    <div>
      <div className={`text-lg font-bold ${textClass}`} style={!textClass ? { color: "var(--text-primary)" } : {}}>{value}</div>
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

// ─── About Tab ────────────────────────────────────────────────────────────────

function AboutTab({
  profile,
  completedTasks,
  tasks,
}: {
  profile: UserType;
  completedTasks: number;
  tasks: Array<{ label: string; complete: boolean }>;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-5">
        {/* Bio */}
        {profile.profile?.bio ? (
          <SectionCard title="About" icon={User}>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{profile.profile.bio}</p>
          </SectionCard>
        ) : (
          <SectionCard title="About" icon={User}>
            <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
              No bio added yet — share your story in the Settings tab.
            </p>
          </SectionCard>
        )}

        {/* Availability text */}
        {profile.profile?.availabilityText && (
          <SectionCard title="Availability" icon={Zap}>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {profile.profile.availabilityText}
            </p>
          </SectionCard>
        )}
      </div>

      {/* Right sidebar */}
      <div className="space-y-5">
        {/* Profile foundation */}
        <div className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Profile foundation</h3>
            </div>
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              {completedTasks}/{tasks.length}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-surface-2)" }}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-500 transition-all duration-700"
              style={{ width: `${tasks.length ? (completedTasks / tasks.length) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-4 space-y-2">
            {tasks.map((task) => {
              const Icon = task.complete ? CheckCircle2 : Circle;
              return (
                <div
                  key={task.label}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${task.complete
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                      : ""
                    }`}
                  style={!task.complete ? { background: "var(--bg-surface-2)", color: "var(--text-muted)" } : {}}
                >
                  <Icon size={13} />
                  {task.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Signals */}
        <div className="panel p-5">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Profile signals</h3>
          <div className="space-y-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>
            <InfoRow icon={MapPin}>{profile.profile?.location || "No location"}</InfoRow>
            <InfoRow icon={Building2}>
              {profile.profile?.college?.name || "No college selected"}
            </InfoRow>
            <InfoRow icon={GraduationCap}>
              {profile.profile?.department?.name || "No department"}
            </InfoRow>
            {profile.profile?.githubUrl && (
              <InfoRow icon={Github}>
                <a
                  href={profile.profile.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-700 hover:underline"
                >
                  GitHub
                </a>
              </InfoRow>
            )}
            {profile.profile?.linkedinUrl && (
              <InfoRow icon={Linkedin}>
                <a
                  href={profile.profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  LinkedIn
                </a>
              </InfoRow>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="panel p-5">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Activity</h3>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Skills" value={profile._count?.skills ?? 0} />
            <MiniStat label="Experiences" value={profile._count?.experiences ?? 0} />
            <MiniStat label="Educations" value={profile._count?.educations ?? 0} />
            <MiniStat label="Roles" value={profile._count?.roles ?? 0} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExperienceTab({
  experiences,
  isFetching,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  showForm,
  onToggleForm,
  form,
  onFormChange,
  onSubmit,
  isPending,
  editingId,
  onEdit,
  onDelete,
  onCancel,
  onVerify,
}: {
  experiences: ReturnType<typeof flattenPages<any, any>>;
  isFetching: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  showForm: boolean;
  onToggleForm: () => void;
  form: typeof emptyExperienceForm;
  onFormChange: (f: typeof emptyExperienceForm) => void;
  onSubmit: (e: FormEvent) => void;
  isPending: boolean;
  editingId: string | null;
  onEdit: (exp: any) => void;
  onDelete: (exp: any) => void;
  onCancel: () => void;
  onVerify?: (experienceId: string, email: string, code?: string) => Promise<any>;
}) {
  const { data: companyPage } = useCompaniesQuery({ limit: 100 });
  const companies = companyPage?.companies || [];

  const [isOther, setIsOther] = useState(false);

  // Sync isOther state when editingId changes or form switches
  useEffect(() => {
    if (form.companyName) {
      const exists = companies.some((c) => c.name === form.companyName);
      setIsOther(!exists);
    } else {
      setIsOther(false);
    }
  }, [editingId, companies, showForm]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-primary">Work Experience</h2>
          {isFetching && <Loader2 className="animate-spin text-muted-fg" size={15} />}
        </div>
        <button
          id="profile-add-experience-btn"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
          onClick={editingId ? onCancel : onToggleForm}
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "Add Experience"}
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="panel p-5 border-brand/30">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
            <Briefcase size={15} className="text-brand" />
            {editingId ? "Edit Experience" : "New Experience"}
          </h3>
          <form onSubmit={onSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Company *">
                <select
                  className="field"
                  value={isOther ? "OTHER" : (form.companyName || "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "OTHER") {
                      setIsOther(true);
                      onFormChange({ ...form, companyName: "" });
                    } else {
                      setIsOther(false);
                      const matched = companies.find((c) => c.name === val);
                      onFormChange({
                        ...form,
                        companyName: val,
                        companyWebsiteUrl: matched?.websiteUrl || form.companyWebsiteUrl || "",
                      });
                    }
                  }}
                  required
                >
                  <option value="" disabled>Select a company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  <option value="OTHER">Other (specify name)...</option>
                </select>
              </Field>

              {isOther && (
                <Field label="Specify Company Name *">
                  <input
                    className="field"
                    value={form.companyName}
                    onChange={(e) => onFormChange({ ...form, companyName: e.target.value })}
                    placeholder="E.g. Acme Corp"
                    required
                  />
                </Field>
              )}
              <Field label="Company website URL">
                <input
                  className="field"
                  type="url"
                  value={form.companyWebsiteUrl}
                  onChange={(e) => onFormChange({ ...form, companyWebsiteUrl: e.target.value })}
                  placeholder="https://company.com"
                />
              </Field>
              <Field label="Title *">
                <input
                  className="field"
                  value={form.title}
                  onChange={(e) => onFormChange({ ...form, title: e.target.value })}
                  placeholder="Software Engineer"
                  required
                />
              </Field>
              <Field label="Type">
                <select
                  className="field"
                  value={form.employmentType}
                  onChange={(e) => onFormChange({ ...form, employmentType: e.target.value })}
                >
                  <option value="FULL_TIME">Full-time</option>
                  <option value="INTERNSHIP">Internship</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="FREELANCE">Freelance</option>
                </select>
              </Field>
              <Field label="Start date *">
                <input
                  className="field"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => onFormChange({ ...form, startDate: e.target.value })}
                  required
                />
              </Field>
              <Field label="End date">
                <input
                  className="field"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => onFormChange({ ...form, endDate: e.target.value })}
                  disabled={form.isCurrent}
                />
              </Field>
              <div className="flex items-center">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition hover:border-indigo-500 border-base bg-surface text-secondary">
                  <input
                    type="checkbox"
                    checked={form.isCurrent}
                    onChange={(e) =>
                      onFormChange({ ...form, isCurrent: e.target.checked, endDate: e.target.checked ? "" : form.endDate })
                    }
                  />
                  Current role
                </label>
              </div>
              <Field label="Work email (for verification)">
                <input
                  className="field"
                  value={form.workEmail}
                  onChange={(e) => onFormChange({ ...form, workEmail: e.target.value })}
                  placeholder="you@company.com"
                />
              </Field>
              <Field label="Manager name">
                <input
                  className="field"
                  value={form.managerName}
                  onChange={(e) => onFormChange({ ...form, managerName: e.target.value })}
                  placeholder="Manager's name"
                />
              </Field>
              <Field label="Manager email">
                <input
                  className="field"
                  value={form.managerEmail}
                  onChange={(e) => onFormChange({ ...form, managerEmail: e.target.value })}
                  placeholder="manager@company.com"
                />
              </Field>
              {/* Manager LinkedIn field hidden in UI to avoid direct competing links, preserved in model state */}
              <Field label="Tech stack (comma separated)">
                <input
                  className="field"
                  value={form.techStack}
                  onChange={(e) => onFormChange({ ...form, techStack: e.target.value })}
                  placeholder="React, Node.js, PostgreSQL"
                />
              </Field>
              <Field label="Skills used (comma separated)">
                <input
                  className="field"
                  value={form.skillsUsed}
                  onChange={(e) => onFormChange({ ...form, skillsUsed: e.target.value })}
                  placeholder="TypeScript, Docker"
                />
              </Field>
              <Field label="Team size">
                <input
                  className="field"
                  type="number"
                  value={form.teamSize}
                  onChange={(e) => onFormChange({ ...form, teamSize: e.target.value })}
                  placeholder="5"
                />
              </Field>
              <Field label="Description" className="md:col-span-2">
                <textarea
                  className="field min-h-24"
                  value={form.description}
                  onChange={(e) => onFormChange({ ...form, description: e.target.value })}
                  placeholder="Describe your responsibilities and achievements..."
                />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="btn-primary" type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" size={15} /> : editingId ? <Save size={15} /> : <Plus size={15} />}
                {editingId ? "Save Experience" : "Add Experience"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {experiences.length === 0 && !isFetching ? (
        <EmptySection
          icon={Briefcase}
          title="No experience yet"
          text="Add your first role, internship, or project to showcase your journey."
          action={
            <button className="btn-primary mt-2" onClick={onToggleForm}>
              <Plus size={15} /> Add Experience
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {experiences.map((exp) => (
            <ExperienceCard
              key={exp.id}
              experience={exp}
              onEdit={() => onEdit(exp)}
              onDelete={() => onDelete(exp)}
              onVerify={(email, code) => onVerify ? onVerify(exp.id, email, code) : Promise.reject("Verification not available")}
            />
          ))}
        </div>
      )}

      {hasNextPage && (
        <button
          className="btn-secondary w-full"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? <Loader2 className="animate-spin" size={15} /> : <ChevronDown size={15} />}
          Load more
        </button>
      )}
    </div>
  );
}

// ─── Skills Tab ───────────────────────────────────────────────────────────────

function SkillsTab({
  skills,
  isFetching,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onAddSkill,
  isAdding,
  onRemove,
  onVerify,
  isVerifying,
}: {
  skills: any[];
  isFetching: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onAddSkill: (payload: { skillId: string; level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" }) => Promise<unknown>;
  isAdding: boolean;
  onRemove: (skill: any) => void;
  onVerify: () => void;
  isVerifying: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-primary">Skills</h2>
          <span className="chip rounded-full px-2.5 py-0.5 text-xs font-semibold">
            {skills.length} / {MAX_SKILLS}
          </span>
          {isFetching && <Loader2 className="animate-spin text-muted-fg" size={15} />}
        </div>
        <button
          onClick={onVerify}
          disabled={isVerifying}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:opacity-50"
        >
          {isVerifying ? (
            <Loader2 className="animate-spin" size={15} />
          ) : (
            <ShieldCheck size={15} />
          )}
          {isVerifying ? "Verifying..." : "Verify & Sync Skills"}
        </button>
      </div>

      {/* Add skill widget */}
      <SkillManager onAddSkill={onAddSkill} adding={isAdding} disabled={skills.length >= MAX_SKILLS} />

      {/* Skill grid */}
      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <SkillPill
              key={skill.id}
              skill={skill}
              large
              onRemove={() => onRemove(skill)}
            />
          ))}
        </div>
      ) : (
        !isFetching && (
          <EmptySection
            icon={Code2}
            title="No skills yet"
            text="Search and add skills to power recommendations and discovery."
          />
        )
      )}

      {hasNextPage && (
        <button
          className="btn-secondary w-full"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? <Loader2 className="animate-spin" size={15} /> : <ChevronDown size={15} />}
          Load more
        </button>
      )}
    </div>
  );
}

// ─── Education Tab ────────────────────────────────────────────────────────────

function EducationTab({
  educations,
  isFetching,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  showForm,
  onToggleForm,
  form,
  onFormChange,
  onSubmit,
  isPending,
  editingId,
  onEdit,
  onDelete,
  onCancel,
  collegeQuery,
  onCollegeQueryChange,
  collegeResults,
  onSelectCollege,
  onSelectOtherCollege,
  onCancelOtherCollege,
  departments,
  departmentsLoading,
  onVerify,
}: {
  educations: any[];
  isFetching: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  showForm: boolean;
  onToggleForm: () => void;
  form: typeof emptyEducationForm;
  onFormChange: (f: typeof emptyEducationForm) => void;
  onSubmit: (e: FormEvent) => void;
  isPending: boolean;
  editingId: string | null;
  onEdit: (edu: any) => void;
  onDelete: (edu: any) => void;
  onCancel: () => void;
  collegeQuery: string;
  onCollegeQueryChange: (v: string) => void;
  collegeResults: College[];
  onSelectCollege: (college: College) => void;
  onSelectOtherCollege: () => void;
  onCancelOtherCollege: () => void;
  departments: Department[];
  departmentsLoading: boolean;
  onVerify?: (educationId: string, email: string, code?: string) => Promise<any>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-primary">Education</h2>
          {isFetching && <Loader2 className="animate-spin text-muted-fg" size={15} />}
        </div>
        <button
          id="profile-add-education-btn"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
          onClick={editingId ? onCancel : onToggleForm}
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "Add Education"}
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="panel p-5 border-brand/30">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
            <GraduationCap size={15} className="text-brand" />
            {editingId ? "Edit Education" : "New Education"}
          </h3>
          <form onSubmit={onSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              {/* College selection — normal search OR custom name */}
              <div className="space-y-2">
                {!form.isOtherCollege ? (
                  <div className="relative">
                    <Field label="College *">
                      <input
                        className="field"
                        value={collegeQuery}
                        onChange={(e) => onCollegeQueryChange(e.target.value)}
                        placeholder="Search college name..."
                      />
                    </Field>
                    {collegeResults.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border shadow-lg bg-surface border-base">
                        {collegeResults.map((college) => (
                          <button
                            key={college.id}
                            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-indigo-500/10"
                            type="button"
                            onClick={() => onSelectCollege(college)}
                          >
                            <span className="font-medium text-primary">{college.name}</span>
                            {college.city && (
                              <span className="text-xs text-muted-fg">
                                {college.city}, {college.state}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* "Not listed" trigger */}
                    <button
                      type="button"
                      className="text-muted-fg hover:text-brand transition mt-1.5 text-xs underline underline-offset-2"
                      onClick={onSelectOtherCollege}
                    >
                      My college isn't listed
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Field label="College name *">
                      <input
                        className="field"
                        value={form.customCollegeName}
                        onChange={(e) => onFormChange({ ...form, customCollegeName: e.target.value })}
                        placeholder="Enter your college name exactly"
                        required
                        autoFocus
                      />
                    </Field>
                    <button
                      type="button"
                      className="text-muted-fg hover:text-brand transition text-xs underline underline-offset-2"
                      onClick={onCancelOtherCollege}
                    >
                      ← Search from listed colleges instead
                    </button>
                    {/* Info callout */}
                    <div className="mt-2 flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                      <span className="mt-0.5 text-amber-500">ℹ</span>
                      <p className="text-xs leading-relaxed text-amber-600 dark:text-amber-400">
                        We'll save your education immediately. Our admin team will review and officially add this college within 1–3 days, after which it will be fully linked to your profile.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Department — only when a listed college is selected */}
              {!form.isOtherCollege && (
                <div className="space-y-3">
                  <Field label="Department/Branch">
                    <select
                      className="field"
                      value={form.isOtherDepartment ? "other" : form.departmentId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "other") {
                          onFormChange({
                            ...form,
                            departmentId: "",
                            isOtherDepartment: true,
                            customDepartmentName: "",
                            fieldOfStudy: "",
                          });
                        } else {
                          const dept = departments.find((d) => d.id === val);
                          onFormChange({
                            ...form,
                            departmentId: val,
                            isOtherDepartment: false,
                            customDepartmentName: "",
                            fieldOfStudy: dept ? dept.name : "",
                          });
                        }
                      }}
                      disabled={!form.collegeId || departmentsLoading}
                    >
                      <option value="">
                        {!form.collegeId
                          ? "Select a college first"
                          : departmentsLoading
                            ? "Loading departments..."
                            : "Select Department/Branch (optional)"}
                      </option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                      {form.collegeId && !departmentsLoading && (
                        <option value="other">My department/branch isn't listed</option>
                      )}
                    </select>
                  </Field>

                  {form.isOtherDepartment && (
                    <Field label="Specify Department/Branch *">
                      <input
                        className="field"
                        value={form.customDepartmentName}
                        onChange={(e) => onFormChange({ ...form, customDepartmentName: e.target.value })}
                        placeholder="e.g. Computer Science, AI & ML, Robotics"
                        required
                        autoFocus
                      />
                    </Field>
                  )}
                </div>
              )}

              {/* If other college — allow freetext branch */}
              {form.isOtherCollege && (
                <Field label="Department/Branch">
                  <input
                    className="field"
                    value={form.fieldOfStudy}
                    onChange={(e) => onFormChange({ ...form, fieldOfStudy: e.target.value })}
                    placeholder="e.g. Computer Science"
                  />
                </Field>
              )}

              <Field label="Degree">
                <input
                  className="field"
                  value={form.degree}
                  onChange={(e) => onFormChange({ ...form, degree: e.target.value })}
                  placeholder="B.Tech, M.S., MBA..."
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Start year">
                  <input
                    className="field"
                    type="number"
                    value={form.startYear}
                    onChange={(e) => onFormChange({ ...form, startYear: e.target.value })}
                    placeholder="2020"
                  />
                </Field>
                <Field label="End year">
                  <input
                    className="field"
                    type="number"
                    value={form.endYear}
                    onChange={(e) => onFormChange({ ...form, endYear: e.target.value })}
                    placeholder="2024"
                    disabled={form.current}
                  />
                </Field>
              </div>
              <div className="flex items-center">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition hover:border-indigo-500 border-base bg-surface text-secondary">
                  <input
                    type="checkbox"
                    checked={form.current}
                    onChange={(e) =>
                      onFormChange({ ...form, current: e.target.checked, endYear: e.target.checked ? "" : form.endYear })
                    }
                  />
                  Currently studying
                </label>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="btn-primary"
                type="submit"
                disabled={
                  isPending ||
                  (!form.isOtherCollege && !form.collegeId) ||
                  (form.isOtherCollege && !form.customCollegeName.trim())
                }
              >
                {isPending ? <Loader2 className="animate-spin" size={15} /> : editingId ? <Save size={15} /> : <Plus size={15} />}
                {editingId ? "Save Education" : "Add Education"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {educations.length === 0 && !isFetching ? (
        <EmptySection
          icon={GraduationCap}
          title="No education yet"
          text="Add your degrees and certifications to strengthen your profile."
          action={
            <button className="btn-primary mt-2" onClick={onToggleForm}>
              <Plus size={15} /> Add Education
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {educations.map((edu) => (
            <EducationCard
              key={edu.id}
              education={edu}
              onEdit={() => onEdit(edu)}
              onDelete={() => onDelete(edu)}
              onVerify={(email, code) => onVerify ? onVerify(edu.id, email, code) : Promise.reject("Verification not available")}
            />
          ))}
        </div>
      )}

      {hasNextPage && (
        <button
          className="btn-secondary w-full"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? <Loader2 className="animate-spin" size={15} /> : <ChevronDown size={15} />}
          Load more
        </button>
      )}
    </div>
  );
}

// ─── Projects Tab ─────────────────────────────────────────────────────────────

function ProjectsTab({
  projects,
  isFetching,
  currentUserId,
}: {
  projects: Project[];
  isFetching: boolean;
  currentUserId?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-primary">Projects</h2>
        {isFetching && <Loader2 className="animate-spin text-muted-fg" size={15} />}
      </div>

      {projects.length === 0 && !isFetching ? (
        <EmptySection
          icon={FolderKanban}
          title="No projects showcase yet"
          text="Create a new project or join an existing team project to display them here."
          action={
            <Link to="/projects" className="btn-primary mt-2">
              <Plus size={15} /> Create or Join Project
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((proj) => (
            <ProjectCard
              key={proj.id}
              project={proj}
              currentUserId={currentUserId}
              onJoin={() => { }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({
  profileForm,
  onProfileFormChange,
  onSave,
  isSavePending,
}: {
  profileForm: Record<string, any>;
  onProfileFormChange: (f: any) => void;
  onSave: (e: FormEvent) => void;
  isSavePending: boolean;
}) {
  const { showToast } = useToast();
  const avatarUpload = useFileUpload();
  const bannerUpload = useFileUpload();
  const resumeUpload = useFileUpload();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { fileUrl } = await avatarUpload.upload(file, "avatar");
      onProfileFormChange({ ...profileForm, avatarUrl: fileUrl });
      showToast("success", "Avatar uploaded successfully");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to upload avatar");
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { fileUrl } = await bannerUpload.upload(file, "avatar");
      onProfileFormChange({ ...profileForm, bannerUrl: fileUrl });
      showToast("success", "Banner uploaded successfully");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to upload banner");
    }
  };

  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { fileUrl } = await resumeUpload.upload(file, "attachment");
      onProfileFormChange({ ...profileForm, resumeUrl: fileUrl });
      showToast("success", "Resume uploaded successfully");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to upload resume");
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    onProfileFormChange({ ...profileForm, [key]: e.target.value });

  return (
    <form onSubmit={onSave} className="space-y-5">
      {/* Basic info */}
      <SettingsSection title="Basic information" icon={User}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Full name">
            <input className="field" value={profileForm.fullName} onChange={set("fullName")} placeholder="Full name" minLength={2} />
          </Field>
          <Field label="Username">
            <input className="field" value={profileForm.username} onChange={set("username")} placeholder="username" minLength={3} pattern="[A-Za-z0-9_]+" />
          </Field>
          <Field label="Headline" className="md:col-span-2">
            <input className="field" value={profileForm.headline} onChange={set("headline")} placeholder="Backend engineer, ML intern..." maxLength={160} />
          </Field>
          <Field label="Location">
            <input className="field" value={profileForm.location} onChange={set("location")} placeholder="Mumbai, India" />
          </Field>
          <Field label="Graduation year">
            <input className="field" type="number" value={profileForm.graduationYear} onChange={set("graduationYear")} placeholder="2027" min={1970} max={2100} />
          </Field>
          <Field label="Bio" className="md:col-span-2">
            <textarea className="field min-h-28" value={profileForm.bio} onChange={set("bio")} placeholder="What you build, what you're learning, what kind of work you want..." maxLength={1000} />
          </Field>
          <Field label="Availability Status">
            <select
              className="field"
              value={profileForm.availabilityStatus || "NOT_AVAILABLE"}
              onChange={(e) => {
                const val = e.target.value;
                onProfileFormChange({
                  ...profileForm,
                  availabilityStatus: val,
                  openToWork: val === "OPEN_TO_WORK" || val === "OPEN_TO_BOTH",
                  openToInternship: val === "OPEN_TO_INTERNSHIP" || val === "OPEN_TO_BOTH",
                });
              }}
            >
              <option value="NOT_AVAILABLE">Not Available / Paused</option>
              <option value="OPEN_TO_WORK">Open to Work (Full-Time)</option>
              <option value="OPEN_TO_INTERNSHIP">Open to Internships</option>
              <option value="OPEN_TO_BOTH">Open to Both (Jobs &amp; Internships)</option>
            </select>
          </Field>
          <Field label="Accepting Referrals">
            <select
              className="field"
              value={profileForm.acceptingReferrals ? "true" : "false"}
              onChange={(e) =>
                onProfileFormChange({ ...profileForm, acceptingReferrals: e.target.value === "true" })
              }
            >
              <option value="false">No (Inactive / Paused)</option>
              <option value="true">Yes (Active / Accepting Requests)</option>
            </select>
          </Field>
          <Field label="Availability custom note" className="md:col-span-2">
            <input className="field" value={profileForm.availabilityText} onChange={set("availabilityText")} placeholder="Open to internships, referrals, mentoring..." maxLength={240} />
          </Field>
        </div>
      </SettingsSection>

      {/* Links */}
      <SettingsSection title="Links & media" icon={LinkIcon}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Avatar">
            <div className="mt-1 flex flex-col gap-2">
              {profileForm.avatarUrl && (
                <div className="flex items-center gap-2">
                  <img src={profileForm.avatarUrl} alt="Avatar Preview" className="h-12 w-12 rounded-full object-cover ring-2 ring-indigo-500/20" />
                  <span className="text-xs truncate max-w-xs text-muted-fg">{profileForm.avatarUrl}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={avatarUpload.uploading}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/30 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50 transition text-muted-fg"
                />
                {avatarUpload.uploading && <Loader2 className="animate-spin text-indigo-600 shrink-0" size={16} />}
              </div>
            </div>
          </Field>

          <Field label="Banner Image">
            <div className="mt-1 flex flex-col gap-2">
              {profileForm.bannerUrl && (
                <div className="flex flex-col gap-1">
                  <img src={profileForm.bannerUrl} alt="Banner Preview" className="h-20 w-full rounded-xl object-cover ring-2 ring-indigo-500/20" />
                  <span className="text-xs truncate max-w-xs text-muted-fg">{profileForm.bannerUrl}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  disabled={bannerUpload.uploading}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/30 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50 transition text-muted-fg"
                />
                {bannerUpload.uploading && <Loader2 className="animate-spin text-indigo-600 shrink-0" size={16} />}
              </div>
            </div>
          </Field>

          <Field label="GitHub URL">
            <div className="relative">
              <Github size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-fg" />
              <input className="field pl-8" value={profileForm.githubUrl} onChange={set("githubUrl")} placeholder="https://github.com/..." type="url" />
            </div>
          </Field>
          <Field label="Portfolio URL">
            <div className="relative">
              <Globe size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-fg" />
              <input className="field pl-8" value={profileForm.portfolioUrl} onChange={set("portfolioUrl")} placeholder="https://yoursite.com" type="url" />
            </div>
          </Field>
          <Field label="LeetCode Profile URL">
            <div className="relative">
              <Globe size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-fg" />
              <input className="field pl-8" value={profileForm.leetcodeUrl} onChange={set("leetcodeUrl")} placeholder="https://leetcode.com/username" type="url" />
            </div>
          </Field>
          <Field label="HackerRank Profile URL">
            <div className="relative">
              <Globe size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-fg" />
              <input className="field pl-8" value={profileForm.hackerrankUrl} onChange={set("hackerrankUrl")} placeholder="https://hackerrank.com/username" type="url" />
            </div>
          </Field>
          <Field label="GeeksforGeeks Profile URL">
            <div className="relative">
              <Globe size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-fg" />
              <input className="field pl-8" value={profileForm.gfgUrl} onChange={set("gfgUrl")} placeholder="https://geeksforgeeks.org/user/username" type="url" />
            </div>
          </Field>

          <Field label="Resume (PDF)">
            <div className="mt-1 flex flex-col gap-2">
              {profileForm.resumeUrl && (
                <div className="flex items-center gap-2">
                  <a
                    href={profileForm.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:underline"
                  >
                    <ExternalLink size={12} /> View current resume
                  </a>
                  <span className="text-xs truncate max-w-xs text-muted-fg">{profileForm.resumeUrl}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleResumeChange}
                  disabled={resumeUpload.uploading}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/30 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50 transition text-muted-fg"
                />
                {resumeUpload.uploading && <Loader2 className="animate-spin text-indigo-600 shrink-0" size={16} />}
              </div>
            </div>
          </Field>
        </div>
      </SettingsSection>

      <div className="flex justify-end">
        <button className="btn-primary gap-2 px-6" type="submit" disabled={isSavePending}>
          {isSavePending ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
          Save changes
        </button>
      </div>
    </form>
  );
}

function SkillManager({
  adding,
  onAddSkill,
  disabled,
}: {
  adding: boolean;
  onAddSkill: (payload: {
    skillId: string;
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  }) => Promise<unknown>;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<{ id: string; name: string } | null>(null);
  const [level, setLevel] = useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT">("INTERMEDIATE");
  const [creatingCustom, setCreatingCustom] = useState(false);
  const skillSearch = useSkillSearchQuery(query);

  const selectSkill = (skill: Skill) => {
    setSelectedSkill({ id: skill.id, name: skill.name });
    setQuery("");
  };

  const handleCreateCustomSkill = async () => {
    if (!query.trim() || query.trim().length < 2) return;
    setCreatingCustom(true);
    try {
      const result = await api.createCustomSkill(query.trim());
      setSelectedSkill({ id: result.data.id, name: result.data.name });
      setQuery("");
    } catch {
      // error shown by hook
    } finally {
      setCreatingCustom(false);
    }
  };

  const handleSave = async () => {
    if (!selectedSkill) return;
    try {
      await onAddSkill({ skillId: selectedSkill.id, level });
      setSelectedSkill(null);
    } catch {
      // hook shows toast
    }
  };

  const noResults =
    query.length >= 2 &&
    !skillSearch.isFetching &&
    (!skillSearch.data || skillSearch.data.length === 0);

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-primary">Add a skill</h3>
      </div>
      {disabled ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
          <strong>Skill limit reached:</strong> You can add up to {MAX_SKILLS} skills. Remove some existing skills to add new ones.
        </div>
      ) : (
        <div className="space-y-4">
          {!selectedSkill ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-muted-fg" size={15} />
              <input
                className="field pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search skill (e.g. React, Python)..."
              />
              {query.length >= 2 && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border shadow-lg bg-surface border-base">
                  {skillSearch.isFetching ? (
                    <div className="p-3"><InlineLoader label="Searching..." /></div>
                  ) : skillSearch.data && skillSearch.data.length > 0 ? (
                    skillSearch.data.slice(0, 8).map((skill) => (
                      <button
                        key={skill.id}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-indigo-500/10"
                        type="button"
                        onClick={() => selectSkill(skill)}
                      >
                        <span className="font-medium text-primary">{skill.name}</span>
                        {skill.verified && (
                          <span className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-xs text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-700">
                            Verified
                          </span>
                        )}
                      </button>
                    ))
                  ) : noResults ? (
                    <div className="p-3">
                      <p className="text-sm text-muted-fg">No matching skills found.</p>
                      <button
                        className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2.5 text-left text-sm font-medium text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                        type="button"
                        disabled={creatingCustom}
                        onClick={handleCreateCustomSkill}
                      >
                        {creatingCustom ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                        Add "{query.trim()}" as a custom skill
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/20 p-4 transition-all bg-brand-light/20">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-fg">Selected Skill:</span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm">
                  {selectedSkill.name}
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-indigo-700 transition"
                    onClick={() => setSelectedSkill(null)}
                    title="Change skill"
                  >
                    <X size={14} />
                  </button>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="field py-1 text-sm"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as typeof level)}
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </select>
                <button
                  type="button"
                  className="btn-primary py-1.5"
                  disabled={adding}
                  onClick={handleSave}
                >
                  {adding ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  Save Skill
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── Shared small components ──────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.FC<{ size?: number; className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={15} className="text-brand" />
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SettingsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.FC<{ size?: number; className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center gap-2 border-b pb-3 border-base">
        <Icon size={16} className="text-brand" />
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-muted-fg">{label}</span>
      {children}
    </label>
  );
}

function InfoRow({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<any>;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="mt-0.5 shrink-0 text-muted-fg" />
      <span className="break-all">{children}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg p-3 bg-surface-2">
      <div className="text-lg font-bold text-primary">{value}</div>
      <div className="text-xs text-muted-fg">{label}</div>
    </div>
  );
}

function EmptySection({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: React.ComponentType<any>;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 text-center border-strong bg-surface-2">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-surface-3">
        <Icon size={22} className="text-muted-fg" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-secondary">{title}</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-fg">{text}</p>
      </div>
      {action}
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

  const handleLike = (id: string) => {
    if (postReaction.isPending) return;
    postReaction.mutate({ id, action: "like" });
  };

  const handleSave = (id: string) => {
    if (postReaction.isPending) return;
    postReaction.mutate({ id, action: "save" });
  };

  const handleComment = async (id: string, content: string, parentCommentId?: string) => {
    try {
      await commentOnPost.mutateAsync({ id, content, parentCommentId });
      return true;
    } catch {
      return false;
    }
  };

  const handleRepost = async (id: string, caption?: string) => {
    try {
      await repost.mutateAsync({ id, caption });
      return true;
    } catch {
      return false;
    }
  };

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
