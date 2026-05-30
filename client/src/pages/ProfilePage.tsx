import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Circle,
  ExternalLink,
  GraduationCap,
  Link as LinkIcon,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { api, College, Skill, User } from "../lib/api";
import {
  compactPayload,
  formatCount,
  getErrorMessage,
  splitCsv,
  titleCase,
  userHeadline,
  userName,
} from "../lib/format";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Avatar, ErrorState, InlineLoader, Metric } from "../components/ui";
import { EducationCard, ExperienceCard, SkillPill } from "../components/cards/ProfileCards";
import {
  useAddEducationMutation,
  useAddExperienceMutation,
  useAddSkillMutation,
  useCreateDepartmentMutation,
  useDepartmentsQuery,
  useMyEducationsQuery,
  useMyExperiencesQuery,
  useMyFullProfileQuery,
  useMySkillsQuery,
  useSkillSearchQuery,
  useUpdateProfileMutation,
} from "../hooks/usePlatformQueries";

const emptyExperienceForm = {
  companyName: "",
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
  degree: "",
  fieldOfStudy: "",
  startYear: "",
  endYear: "",
  current: false,
};

function flattenPages<T, K extends string>(pages: Array<Record<K, T[]>>, key: K) {
  return pages.flatMap((page) => page[key] || []);
}

const hasValue = (value?: string | null) => Boolean(value && value.trim());

const getProfileCompletionTasks = (
  profile: User,
  counts: {
    skills: number;
    experiences: number;
    educations: number;
  },
) => [
  {
    label: "Add name and headline",
    complete: hasValue(profile.profile?.fullName) && hasValue(profile.profile?.headline),
  },
  {
    label: "Write a short bio",
    complete: hasValue(profile.profile?.bio),
  },
  {
    label: "Select college and department",
    complete: Boolean(profile.profile?.collegeId && profile.profile?.departmentId),
  },
  {
    label: "Add at least 3 skills",
    complete: counts.skills >= 3,
  },
  {
    label: "Add experience",
    complete: counts.experiences > 0,
  },
  {
    label: "Add education",
    complete: counts.educations > 0,
  },
  {
    label: "Add GitHub, LinkedIn, or portfolio",
    complete: Boolean(
      profile.profile?.githubUrl ||
        profile.profile?.linkedinUrl ||
        profile.profile?.portfolioUrl,
    ),
  },
];

export function ProfilePage() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <ProfileWorkspace fallbackUser={user} />;
}

function ProfileWorkspace({ fallbackUser }: { fallbackUser: User }) {
  const { showToast } = useToast();
  const profileQuery = useMyFullProfileQuery();
  const skillsQuery = useMySkillsQuery(16);
  const experiencesQuery = useMyExperiencesQuery(8);
  const educationsQuery = useMyEducationsQuery(8);
  const updateProfile = useUpdateProfileMutation();
  const addSkill = useAddSkillMutation();
  const addExperience = useAddExperienceMutation();
  const addEducation = useAddEducationMutation();
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
    graduationYear: profile.profile?.graduationYear?.toString() || "",
    collegeId: profile.profile?.collegeId || "",
    departmentId: profile.profile?.departmentId || "",
  });
  const [experienceForm, setExperienceForm] = useState(emptyExperienceForm);
  const [educationForm, setEducationForm] = useState(emptyEducationForm);
  const [newDepartment, setNewDepartment] = useState("");
  const departmentsQuery = useDepartmentsQuery(profileForm.collegeId || undefined);
  const createDepartment = useCreateDepartmentMutation(profileForm.collegeId || undefined);
  const profileTasks = getProfileCompletionTasks(profile, {
    skills: skills.length,
    experiences: experiences.length,
    educations: educations.length,
  });
  const completedTasks = profileTasks.filter((task) => task.complete).length;
  const departments = departmentsQuery.data || [];

  useEffect(() => {
    if (!profileQuery.data) return;

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
      graduationYear: profile.profile?.graduationYear?.toString() || "",
      collegeId: profile.profile?.collegeId || "",
      departmentId: profile.profile?.departmentId || "",
    });
    setCollegeQuery(profile.profile?.college?.name || "");
  }, [profile, profileQuery.data]);

  useEffect(() => {
    const query = collegeQuery.trim();

    if (query.length < 2 || query === profile.profile?.college?.name) {
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
  }, [collegeQuery, profile.profile?.college?.name]);

  const selectCollege = (college: College) => {
    setCollegeQuery(college.name);
    setCollegeResults([]);
    setProfileForm((current) => ({
      ...current,
      collegeId: college.id,
      departmentId: "",
    }));
  };

  const changeCollegeQuery = (value: string) => {
    setCollegeQuery(value);

    if (value !== profile.profile?.college?.name) {
      setProfileForm((current) => ({
        ...current,
        collegeId: "",
        departmentId: "",
      }));
    }
  };

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();

    if (collegeQuery.trim() && !profileForm.collegeId) {
      showToast("error", "Select a college from the list before saving");
      return;
    }

    updateProfile.mutate(
      compactPayload({
        ...profileForm,
        graduationYear: profileForm.graduationYear
          ? Number(profileForm.graduationYear)
          : undefined,
        departmentId: profileForm.departmentId || undefined,
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
      showToast("error", "Experience end date cannot be before start date");
      return;
    }

    try {
      await addExperience.mutateAsync({
        companyName: experienceForm.companyName,
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
      setExperienceForm(emptyExperienceForm);
    } catch {
      // Mutation hook owns the toast.
    }
  };

  const submitEducation = async (event: FormEvent) => {
    event.preventDefault();

    if (!profileForm.collegeId) {
      showToast("error", "Select a college first");
      return;
    }

    if (
      educationForm.startYear &&
      educationForm.endYear &&
      !educationForm.current &&
      Number(educationForm.endYear) < Number(educationForm.startYear)
    ) {
      showToast("error", "Education end year cannot be before start year");
      return;
    }

    try {
      await addEducation.mutateAsync({
        collegeId: profileForm.collegeId,
        ...compactPayload({
          departmentId: profileForm.departmentId || undefined,
          degree: educationForm.degree,
          fieldOfStudy: educationForm.fieldOfStudy,
          startYear: educationForm.startYear ? Number(educationForm.startYear) : undefined,
          endYear:
            educationForm.current || !educationForm.endYear
              ? undefined
              : Number(educationForm.endYear),
          current: educationForm.current,
        }),
      });
      setEducationForm(emptyEducationForm);
    } catch {
      // Mutation hook owns the toast.
    }
  };

  const submitDepartment = async () => {
    const name = newDepartment.trim();

    if (!name) return;
    if (!profileForm.collegeId) {
      showToast("error", "Select a college first");
      return;
    }

    try {
      const result = await createDepartment.mutateAsync(name);
      setProfileForm((current) => ({
        ...current,
        departmentId: result.data.id,
      }));
      setNewDepartment("");
    } catch {
      // Mutation hook owns the toast.
    }
  };

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
    <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
      <section className="space-y-5">
        <ProfileHeader profile={profile} loading={profileQuery.isFetching} />

        <ProfileCompletionPanel
          completed={completedTasks}
          tasks={profileTasks}
          total={profileTasks.length}
        />

        <form className="panel p-5" onSubmit={saveProfile}>
          <div className="mb-4 flex items-center gap-2">
            <Pencil size={18} className="text-emerald-700" />
            <h3 className="text-base font-semibold text-slate-950">Profile basics</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <LabeledField label="Full name">
              <input className="field" value={profileForm.fullName} onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Full name" minLength={2} />
            </LabeledField>
            <LabeledField label="Username">
              <input className="field" value={profileForm.username} onChange={(event) => setProfileForm((current) => ({ ...current, username: event.target.value }))} placeholder="Username" minLength={3} pattern="[A-Za-z0-9_]+" />
            </LabeledField>
            <LabeledField label="Headline" className="md:col-span-2">
              <input className="field" value={profileForm.headline} onChange={(event) => setProfileForm((current) => ({ ...current, headline: event.target.value }))} placeholder="Backend engineer, ML intern, frontend lead..." maxLength={160} />
            </LabeledField>
            <LabeledField label="Location">
              <input className="field" value={profileForm.location} onChange={(event) => setProfileForm((current) => ({ ...current, location: event.target.value }))} placeholder="City, country" />
            </LabeledField>
            <LabeledField label="Graduation year">
              <input className="field" value={profileForm.graduationYear} onChange={(event) => setProfileForm((current) => ({ ...current, graduationYear: event.target.value }))} placeholder="2027" type="number" min={1970} max={2100} />
            </LabeledField>
            <LabeledField label="Bio" className="md:col-span-2">
              <textarea className="field min-h-24" value={profileForm.bio} onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))} placeholder="What you build, what you are learning, and what kind of work you want." maxLength={1000} />
            </LabeledField>
            <LabeledField label="Availability" className="md:col-span-2">
              <input className="field" value={profileForm.availabilityText} onChange={(event) => setProfileForm((current) => ({ ...current, availabilityText: event.target.value }))} placeholder="Open to internships, teams, referrals, mentoring..." maxLength={240} />
            </LabeledField>
            <LabeledField label="Avatar URL">
              <input className="field" value={profileForm.avatarUrl} onChange={(event) => setProfileForm((current) => ({ ...current, avatarUrl: event.target.value }))} placeholder="https://..." type="url" />
            </LabeledField>
            <LabeledField label="Banner URL">
              <input className="field" value={profileForm.bannerUrl} onChange={(event) => setProfileForm((current) => ({ ...current, bannerUrl: event.target.value }))} placeholder="https://..." type="url" />
            </LabeledField>
            <LabeledField label="GitHub URL">
              <input className="field" value={profileForm.githubUrl} onChange={(event) => setProfileForm((current) => ({ ...current, githubUrl: event.target.value }))} placeholder="https://github.com/..." type="url" />
            </LabeledField>
            <LabeledField label="LinkedIn URL">
              <input className="field" value={profileForm.linkedinUrl} onChange={(event) => setProfileForm((current) => ({ ...current, linkedinUrl: event.target.value }))} placeholder="https://linkedin.com/in/..." type="url" />
            </LabeledField>
            <LabeledField label="Portfolio URL">
              <input className="field" value={profileForm.portfolioUrl} onChange={(event) => setProfileForm((current) => ({ ...current, portfolioUrl: event.target.value }))} placeholder="https://..." type="url" />
            </LabeledField>
            <LabeledField label="Resume URL">
              <input className="field" value={profileForm.resumeUrl} onChange={(event) => setProfileForm((current) => ({ ...current, resumeUrl: event.target.value }))} placeholder="https://..." type="url" />
            </LabeledField>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="relative">
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">College</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
                <input className="field pl-9" value={collegeQuery} onChange={(event) => changeCollegeQuery(event.target.value)} placeholder="Search college" />
              </div>
              {collegeResults.length > 0 && (
                <div className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-panel">
                  {collegeResults.map((college) => (
                    <button className="block w-full px-3 py-2 text-left text-sm hover:bg-emerald-50" key={college.id} type="button" onClick={() => selectCollege(college)}>
                      <div className="font-medium text-slate-800">{college.name}</div>
                      <div className="text-xs text-slate-500">{[college.city, college.state].filter(Boolean).join(", ")}</div>
                    </button>
                  ))}
                </div>
              )}
              {profileForm.collegeId && (
                <p className="mt-1.5 text-xs text-emerald-700">
                  Selected: {collegeQuery}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Department</label>
              <select className="field" value={profileForm.departmentId} onChange={(event) => setProfileForm((current) => ({ ...current, departmentId: event.target.value }))} disabled={!profileForm.collegeId || departmentsQuery.isFetching}>
                <option value="">Department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
              {departmentsQuery.isFetching && <div className="mt-2"><InlineLoader label="Loading departments" /></div>}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              className="field"
              value={newDepartment}
              onChange={(event) => setNewDepartment(event.target.value)}
              placeholder="Add missing department"
              disabled={!profileForm.collegeId}
            />
            <button
              className="btn-secondary shrink-0"
              type="button"
              disabled={!profileForm.collegeId || createDepartment.isPending}
              onClick={submitDepartment}
            >
              {createDepartment.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Add
            </button>
          </div>

          <div className="mt-5 flex justify-end">
            <button className="btn-primary" type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Save profile
            </button>
          </div>
        </form>

        <SkillManager onAddSkill={addSkill.mutateAsync} adding={addSkill.isPending} />

        <form className="panel p-5" onSubmit={submitExperience}>
          <div className="mb-4 flex items-center gap-2">
            <BriefcaseBusiness size={18} className="text-amber-700" />
            <h3 className="text-base font-semibold text-slate-950">Add experience</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="field" value={experienceForm.companyName} onChange={(event) => setExperienceForm((current) => ({ ...current, companyName: event.target.value }))} placeholder="Company" required />
            <input className="field" value={experienceForm.title} onChange={(event) => setExperienceForm((current) => ({ ...current, title: event.target.value }))} placeholder="Title" required />
            <select className="field" value={experienceForm.employmentType} onChange={(event) => setExperienceForm((current) => ({ ...current, employmentType: event.target.value }))}>
              <option value="FULL_TIME">Full time</option>
              <option value="INTERNSHIP">Internship</option>
              <option value="CONTRACT">Contract</option>
              <option value="FREELANCE">Freelance</option>
            </select>
            <input className="field" type="date" value={experienceForm.startDate} onChange={(event) => setExperienceForm((current) => ({ ...current, startDate: event.target.value }))} required />
            <input className="field" type="date" value={experienceForm.endDate} onChange={(event) => setExperienceForm((current) => ({ ...current, endDate: event.target.value }))} disabled={experienceForm.isCurrent} />
            <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600">
              <input type="checkbox" checked={experienceForm.isCurrent} onChange={(event) => setExperienceForm((current) => ({ ...current, isCurrent: event.target.checked, endDate: event.target.checked ? "" : current.endDate }))} />
              Current role
            </label>
            <input className="field" value={experienceForm.workEmail} onChange={(event) => setExperienceForm((current) => ({ ...current, workEmail: event.target.value }))} placeholder="Work email for verification" />
            <input className="field" value={experienceForm.managerEmail} onChange={(event) => setExperienceForm((current) => ({ ...current, managerEmail: event.target.value }))} placeholder="Manager email" />
            <input className="field" value={experienceForm.managerName} onChange={(event) => setExperienceForm((current) => ({ ...current, managerName: event.target.value }))} placeholder="Manager name" />
            <input className="field" value={experienceForm.managerLinkedinUrl} onChange={(event) => setExperienceForm((current) => ({ ...current, managerLinkedinUrl: event.target.value }))} placeholder="Manager LinkedIn URL" />
            <input className="field" value={experienceForm.techStack} onChange={(event) => setExperienceForm((current) => ({ ...current, techStack: event.target.value }))} placeholder="Tech stack" />
            <input className="field" value={experienceForm.skillsUsed} onChange={(event) => setExperienceForm((current) => ({ ...current, skillsUsed: event.target.value }))} placeholder="Skills used" />
            <input className="field" value={experienceForm.teamSize} onChange={(event) => setExperienceForm((current) => ({ ...current, teamSize: event.target.value }))} placeholder="Team size" type="number" />
            <textarea className="field min-h-24 md:col-span-2" value={experienceForm.description} onChange={(event) => setExperienceForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" />
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn-primary" type="submit" disabled={addExperience.isPending}>
              {addExperience.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Add experience
            </button>
          </div>
        </form>

        <form className="panel p-5" onSubmit={submitEducation}>
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap size={18} className="text-emerald-700" />
            <h3 className="text-base font-semibold text-slate-950">Add education</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="field" value={educationForm.degree} onChange={(event) => setEducationForm((current) => ({ ...current, degree: event.target.value }))} placeholder="Degree" />
            <input className="field" value={educationForm.fieldOfStudy} onChange={(event) => setEducationForm((current) => ({ ...current, fieldOfStudy: event.target.value }))} placeholder="Field of study" />
            <input className="field" value={educationForm.startYear} onChange={(event) => setEducationForm((current) => ({ ...current, startYear: event.target.value }))} placeholder="Start year" type="number" />
            <input className="field" value={educationForm.endYear} onChange={(event) => setEducationForm((current) => ({ ...current, endYear: event.target.value }))} placeholder="End year" type="number" disabled={educationForm.current} />
            <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600">
              <input type="checkbox" checked={educationForm.current} onChange={(event) => setEducationForm((current) => ({ ...current, current: event.target.checked, endYear: event.target.checked ? "" : current.endYear }))} />
              Currently studying
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn-primary" type="submit" disabled={addEducation.isPending || !profileForm.collegeId}>
              {addEducation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Add education
            </button>
          </div>
        </form>
      </section>

      <aside className="space-y-5">
        <div className="panel p-5">
          <h3 className="text-sm font-semibold text-slate-950">Profile signals</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-2"><MapPin size={16} className="text-slate-400" />{profile.profile?.location || "No location yet"}</div>
            <div className="flex items-center gap-2"><Building2 size={16} className="text-slate-400" />{profile.profile?.college?.name || "No college selected"}</div>
            <div className="flex items-center gap-2"><LinkIcon size={16} className="text-slate-400" />{profile.profile?.portfolioUrl || profile.profile?.githubUrl || "No links yet"}</div>
          </div>
        </div>

        <ProfileSection title="Skills" loading={skillsQuery.isFetching}>
          <div className="flex flex-wrap gap-2">
            {skills.length ? skills.map((skill) => <SkillPill key={skill.id} skill={skill} />) : <p className="text-sm text-slate-500">Search and add skills to improve recommendations.</p>}
          </div>
          {skillsQuery.hasNextPage && (
            <button className="btn-secondary mt-4 w-full" type="button" disabled={skillsQuery.isFetchingNextPage} onClick={() => skillsQuery.fetchNextPage()}>
              {skillsQuery.isFetchingNextPage ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Load more
            </button>
          )}
        </ProfileSection>

        <ProfileSection title="Experience" loading={experiencesQuery.isFetching}>
          <div className="space-y-3">
            {experiences.length ? experiences.map((experience) => <ExperienceCard key={experience.id} experience={experience} />) : <p className="text-sm text-slate-500">Add your first role or internship.</p>}
          </div>
          {experiencesQuery.hasNextPage && (
            <button className="btn-secondary mt-4 w-full" type="button" disabled={experiencesQuery.isFetchingNextPage} onClick={() => experiencesQuery.fetchNextPage()}>
              {experiencesQuery.isFetchingNextPage ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Load more
            </button>
          )}
        </ProfileSection>

        <ProfileSection title="Education" loading={educationsQuery.isFetching}>
          <div className="space-y-3">
            {educations.length ? educations.map((education) => <EducationCard key={education.id} education={education} />) : <p className="text-sm text-slate-500">Select a college and add education.</p>}
          </div>
          {educationsQuery.hasNextPage && (
            <button className="btn-secondary mt-4 w-full" type="button" disabled={educationsQuery.isFetchingNextPage} onClick={() => educationsQuery.fetchNextPage()}>
              {educationsQuery.isFetchingNextPage ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Load more
            </button>
          )}
        </ProfileSection>
      </aside>
    </div>
  );
}

function ProfileHeader({ profile, loading }: { profile: User; loading: boolean }) {
  const links = [
    { label: "GitHub", href: profile.profile?.githubUrl },
    { label: "LinkedIn", href: profile.profile?.linkedinUrl },
    { label: "Portfolio", href: profile.profile?.portfolioUrl },
    { label: "Resume", href: profile.profile?.resumeUrl },
  ].flatMap((link) => (link.href ? [{ ...link, href: link.href }] : []));

  return (
    <div className="panel overflow-hidden">
      <div
        className="h-28 bg-emerald-950 bg-cover bg-center"
        style={profile.profile?.bannerUrl ? { backgroundImage: `url(${profile.profile.bannerUrl})` } : undefined}
      />
      <div className="px-5 pb-5">
        <div className="-mt-8 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <Avatar user={profile} />
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-950">{userName(profile)}</h3>
                {loading && <Loader2 className="animate-spin text-slate-400" size={16} />}
              </div>
              <p className="text-sm text-slate-500">
                {userHeadline(profile) || `@${profile.username}`}
              </p>
            </div>
          </div>
          <span className="chip bg-white">
            <ShieldCheck size={14} />
            {titleCase(profile.trustLevel || "BEGINNER")}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-4">
          <Metric label="Completeness" value={`${Math.round(profile.profileCompleteness || 0)}%`} />
          <Metric label="Reputation" value={formatCount(profile.reputationScore)} />
          <Metric label="Engineering" value={Math.round(profile.engineeringScore || 0)} />
          <Metric label="Connections" value={formatCount(profile.connectionCount)} />
        </div>
        {links.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {links.map((link) => (
              <a
                className="btn-secondary px-3 py-1.5"
                href={link.href}
                key={link.label}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink size={15} />
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileCompletionPanel({
  completed,
  tasks,
  total,
}: {
  completed: number;
  tasks: Array<{ label: string; complete: boolean }>;
  total: number;
}) {
  const percent = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-emerald-700" size={18} />
            <h3 className="text-base font-semibold text-slate-950">Profile foundation</h3>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Recommendations, jobs, teams, referrals, and discovery use these signals.
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-950">{percent}%</div>
          <div className="text-xs text-slate-500">
            {completed} of {total} complete
          </div>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {tasks.map((task) => {
          const Icon = task.complete ? CheckCircle2 : Circle;

          return (
            <div
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                task.complete
                  ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                  : "border-slate-100 bg-slate-50 text-slate-600"
              }`}
              key={task.label}
            >
              <Icon size={15} />
              {task.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LabeledField({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function ProfileSection({
  title,
  loading,
  children,
}: {
  title: string;
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        {loading && <Loader2 className="animate-spin text-slate-400" size={15} />}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function SkillManager({
  adding,
  onAddSkill,
}: {
  adding: boolean;
  onAddSkill: (payload: {
    skillId: string;
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  }) => Promise<unknown>;
}) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT">("INTERMEDIATE");
  const skillSearch = useSkillSearchQuery(query);

  const add = async (skill: Skill) => {
    try {
      await onAddSkill({ skillId: skill.id, level });
      setQuery("");
    } catch {
      // Mutation hook owns the toast.
    }
  };

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={18} className="text-emerald-700" />
        <h3 className="text-base font-semibold text-slate-950">Add skills</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <input
          className="field"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search skill catalog"
        />
        <select className="field" value={level} onChange={(event) => setLevel(event.target.value as typeof level)}>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
          <option value="EXPERT">Expert</option>
        </select>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {(skillSearch.data || []).map((skill) => (
          <button
            className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
            key={skill.id}
            type="button"
            disabled={adding}
            onClick={() => add(skill)}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900">{skill.name}</span>
              <span className="block truncate text-xs text-slate-500">{skill.category || "Engineering skill"}</span>
            </span>
            {adding ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />}
          </button>
        ))}
      </div>
      {query.trim().length >= 2 && !skillSearch.isFetching && !(skillSearch.data || []).length && (
        <p className="mt-3 text-sm text-slate-500">No matching skills found.</p>
      )}
    </div>
  );
}
