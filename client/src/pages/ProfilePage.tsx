import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  Link,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
} from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { api, College, Department, User } from "../lib/api";
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
import { Avatar, Metric } from "../components/ui";
import { EducationCard, ExperienceCard, SkillPill } from "../components/cards/ProfileCards";

const emptyExperienceForm = {
  companyName: "",
  title: "",
  employmentType: "FULL_TIME",
  startDate: "",
  endDate: "",
  isCurrent: false,
  description: "",
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

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <ProfileWorkspace user={user} onUserChange={setUser} />;
}

function ProfileWorkspace({
  user,
  onUserChange,
}: {
  user: User;
  onUserChange: (user: User) => void;
}) {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<User>(user);
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [addingExperience, setAddingExperience] = useState(false);
  const [addingEducation, setAddingEducation] = useState(false);
  const [collegeQuery, setCollegeQuery] = useState("");
  const [collegeResults, setCollegeResults] = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profileForm, setProfileForm] = useState({
    fullName: user.profile?.fullName || "",
    username: user.username || "",
    headline: user.profile?.headline || "",
    bio: user.profile?.bio || "",
    location: user.profile?.location || "",
    availabilityText: user.profile?.availabilityText || "",
    githubUrl: user.profile?.githubUrl || "",
    linkedinUrl: user.profile?.linkedinUrl || "",
    portfolioUrl: user.profile?.portfolioUrl || "",
    graduationYear: user.profile?.graduationYear?.toString() || "",
    collegeId: user.profile?.collegeId || "",
    departmentId: user.profile?.departmentId || "",
  });
  const [experienceForm, setExperienceForm] = useState(emptyExperienceForm);
  const [educationForm, setEducationForm] = useState(emptyEducationForm);

  const syncProfileForm = (nextUser: User) => {
    setProfile(nextUser);
    onUserChange(nextUser);
    setProfileForm({
      fullName: nextUser.profile?.fullName || "",
      username: nextUser.username || "",
      headline: nextUser.profile?.headline || "",
      bio: nextUser.profile?.bio || "",
      location: nextUser.profile?.location || "",
      availabilityText: nextUser.profile?.availabilityText || "",
      githubUrl: nextUser.profile?.githubUrl || "",
      linkedinUrl: nextUser.profile?.linkedinUrl || "",
      portfolioUrl: nextUser.profile?.portfolioUrl || "",
      graduationYear: nextUser.profile?.graduationYear?.toString() || "",
      collegeId: nextUser.profile?.collegeId || "",
      departmentId: nextUser.profile?.departmentId || "",
    });
    setCollegeQuery(nextUser.profile?.college?.name || "");
  };

  const reloadProfile = useCallback(async () => {
    setProfileLoading(true);

    try {
      const result = await api.myFullProfile();
      syncProfileForm(result.data);

      if (result.data.profile?.collegeId) {
        const departmentsResult = await api.departments(result.data.profile.collegeId);
        setDepartments(departmentsResult.data);
      }
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setProfileLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    reloadProfile();
  }, [reloadProfile]);

  useEffect(() => {
    const query = collegeQuery.trim();

    if (query.length < 2) {
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
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [collegeQuery]);

  const selectCollege = async (college: College) => {
    setCollegeQuery(college.name);
    setCollegeResults([]);
    setProfileForm((current) => ({
      ...current,
      collegeId: college.id,
      departmentId: "",
    }));

    try {
      const result = await api.departments(college.id);
      setDepartments(result.data);
    } catch (error) {
      showToast("error", getErrorMessage(error));
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);

    try {
      const result = await api.updateProfile(
        compactPayload({
          ...profileForm,
          graduationYear: profileForm.graduationYear
            ? Number(profileForm.graduationYear)
            : undefined,
          departmentId: profileForm.departmentId || undefined,
        }),
      );
      syncProfileForm(result.data);
      showToast("success", "Profile updated");
      await reloadProfile();
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const addExperience = async (event: FormEvent) => {
    event.preventDefault();
    setAddingExperience(true);

    try {
      await api.addExperience({
        companyName: experienceForm.companyName,
        title: experienceForm.title,
        employmentType: experienceForm.employmentType,
        startDate: experienceForm.startDate,
        ...compactPayload({
          endDate: experienceForm.isCurrent ? undefined : experienceForm.endDate,
          isCurrent: experienceForm.isCurrent,
          description: experienceForm.description,
          techStack: splitCsv(experienceForm.techStack),
          skillsUsed: splitCsv(experienceForm.skillsUsed),
          teamSize: experienceForm.teamSize ? Number(experienceForm.teamSize) : undefined,
        }),
      });
      setExperienceForm(emptyExperienceForm);
      showToast("success", "Experience added");
      await reloadProfile();
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setAddingExperience(false);
    }
  };

  const addEducation = async (event: FormEvent) => {
    event.preventDefault();

    if (!profileForm.collegeId) {
      showToast("error", "Select a college first");
      return;
    }

    setAddingEducation(true);

    try {
      await api.addEducation({
        collegeId: profileForm.collegeId,
        ...compactPayload({
          departmentId: profileForm.departmentId || undefined,
          degree: educationForm.degree,
          fieldOfStudy: educationForm.fieldOfStudy,
          startYear: educationForm.startYear ? Number(educationForm.startYear) : undefined,
          endYear: educationForm.current ? undefined : Number(educationForm.endYear),
          current: educationForm.current,
        }),
      });
      setEducationForm(emptyEducationForm);
      showToast("success", "Education added");
      await reloadProfile();
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setAddingEducation(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
      <section className="space-y-5">
        <div className="panel overflow-hidden">
          <div className="h-28 bg-[#18332d]" />
          <div className="px-5 pb-5">
            <div className="-mt-8 flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <Avatar user={profile} />
                <div className="pb-1">
                  <h3 className="text-xl font-bold text-slate-950">{userName(profile)}</h3>
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
          </div>
        </div>

        <form className="panel p-5" onSubmit={saveProfile}>
          <div className="mb-4 flex items-center gap-2">
            <Pencil size={18} className="text-emerald-700" />
            <h3 className="text-base font-semibold text-slate-950">Profile basics</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="field" value={profileForm.fullName} onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Full name" minLength={2} />
            <input className="field" value={profileForm.username} onChange={(event) => setProfileForm((current) => ({ ...current, username: event.target.value }))} placeholder="Username" minLength={3} />
            <input className="field md:col-span-2" value={profileForm.headline} onChange={(event) => setProfileForm((current) => ({ ...current, headline: event.target.value }))} placeholder="Headline" maxLength={160} />
            <input className="field" value={profileForm.location} onChange={(event) => setProfileForm((current) => ({ ...current, location: event.target.value }))} placeholder="Location" />
            <input className="field" value={profileForm.graduationYear} onChange={(event) => setProfileForm((current) => ({ ...current, graduationYear: event.target.value }))} placeholder="Graduation year" type="number" />
            <textarea className="field min-h-24 md:col-span-2" value={profileForm.bio} onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))} placeholder="Bio" maxLength={1000} />
            <input className="field md:col-span-2" value={profileForm.availabilityText} onChange={(event) => setProfileForm((current) => ({ ...current, availabilityText: event.target.value }))} placeholder="Availability" maxLength={240} />
            <input className="field" value={profileForm.githubUrl} onChange={(event) => setProfileForm((current) => ({ ...current, githubUrl: event.target.value }))} placeholder="GitHub URL" />
            <input className="field" value={profileForm.linkedinUrl} onChange={(event) => setProfileForm((current) => ({ ...current, linkedinUrl: event.target.value }))} placeholder="LinkedIn URL" />
            <input className="field md:col-span-2" value={profileForm.portfolioUrl} onChange={(event) => setProfileForm((current) => ({ ...current, portfolioUrl: event.target.value }))} placeholder="Portfolio URL" />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="relative">
              <input className="field" value={collegeQuery} onChange={(event) => setCollegeQuery(event.target.value)} placeholder="Search college" />
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
            </div>
            <select className="field" value={profileForm.departmentId} onChange={(event) => setProfileForm((current) => ({ ...current, departmentId: event.target.value }))} disabled={!profileForm.collegeId}>
              <option value="">Department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 flex justify-end">
            <button className="btn-primary" type="submit" disabled={savingProfile || profileLoading}>
              {savingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Save profile
            </button>
          </div>
        </form>

        <form className="panel p-5" onSubmit={addExperience}>
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
            <input className="field" value={experienceForm.techStack} onChange={(event) => setExperienceForm((current) => ({ ...current, techStack: event.target.value }))} placeholder="Tech stack" />
            <input className="field" value={experienceForm.skillsUsed} onChange={(event) => setExperienceForm((current) => ({ ...current, skillsUsed: event.target.value }))} placeholder="Skills used" />
            <textarea className="field min-h-24 md:col-span-2" value={experienceForm.description} onChange={(event) => setExperienceForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" />
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn-primary" type="submit" disabled={addingExperience}>
              {addingExperience ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Add experience
            </button>
          </div>
        </form>

        <form className="panel p-5" onSubmit={addEducation}>
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
            <button className="btn-primary" type="submit" disabled={addingEducation || !profileForm.collegeId}>
              {addingEducation ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
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
            <div className="flex items-center gap-2"><Link size={16} className="text-slate-400" />{profile.profile?.portfolioUrl || profile.profile?.githubUrl || "No links yet"}</div>
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="text-sm font-semibold text-slate-950">Skills</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.skills?.length ? profile.skills.map((skill) => <SkillPill key={skill.id} skill={skill} />) : <p className="text-sm text-slate-500">Skills will appear here after a skill catalog is connected.</p>}
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="text-sm font-semibold text-slate-950">Experience</h3>
          <div className="mt-4 space-y-3">
            {profile.experiences?.length ? profile.experiences.map((experience) => <ExperienceCard key={experience.id} experience={experience} />) : <p className="text-sm text-slate-500">Add your first role or internship.</p>}
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="text-sm font-semibold text-slate-950">Education</h3>
          <div className="mt-4 space-y-3">
            {profile.educations?.length ? profile.educations.map((education) => <EducationCard key={education.id} education={education} />) : <p className="text-sm text-slate-500">Select a college and add education.</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}
