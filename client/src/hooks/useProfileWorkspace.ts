import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useUrlState } from "../core/utils/useUrlState";
import { api, College, User as UserType, Experience, Education, UserSkill } from "../lib/api";
import {
  compactPayload,
  splitCsv,
} from "../core/utils/format";
import { useToast } from "../core/contexts/ToastContext";
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
} from "./usePlatformQueries";
import { emptyExperienceForm, emptyEducationForm } from "../components/profile/ProfileHelpers";

type Tab = "about" | "posts" | "experience" | "skills" | "education" | "projects" | "settings";

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

export function useProfileWorkspace(fallbackUser: UserType) {
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
    () => flattenPages(skillsQuery.data?.pages || [], "skills") as UserSkill[],
    [skillsQuery.data?.pages],
  );
  const experiences = useMemo(
    () => flattenPages(experiencesQuery.data?.pages || [], "experiences") as Experience[],
    [experiencesQuery.data?.pages],
  );
  const educations = useMemo(
    () => flattenPages(educationsQuery.data?.pages || [], "educations") as Education[],
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

  const leetcodeProfile = profile.codingProfiles?.find((p) => p.platform.toLowerCase() === "leetcode");
  const hackerrankProfile = profile.codingProfiles?.find((p) => p.platform.toLowerCase() === "hackerrank");
  const gfgProfile = profile.codingProfiles?.find((p) => p.platform.toLowerCase() === "geeksforgeeks");

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
    acceptingCollaborators: profile.acceptingCollaborators || false,
    acceptingMentorship: profile.acceptingMentorship || false,
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
    const lc = profile.codingProfiles?.find((p) => p.platform.toLowerCase() === "leetcode");
    const hr = profile.codingProfiles?.find((p) => p.platform.toLowerCase() === "hackerrank");
    const gfg = profile.codingProfiles?.find((p) => p.platform.toLowerCase() === "geeksforgeeks");

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
      acceptingCollaborators: profile.acceptingCollaborators || false,
      acceptingMentorship: profile.acceptingMentorship || false,
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

  const handleEditExperience = useCallback((exp: Experience) => {
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

  const setFormFromEdu = useCallback((edu: Education) => {
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

  const handleEditEducation = useCallback((edu: Education) => {
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

  return {
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
  };
}
