import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Search,
  Building2,
  Users,
  Briefcase,
  ExternalLink,
  Award,
  BookOpen,
  ArrowRight,
  TrendingUp,
  MapPin,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { usePublicBatchStudentsQuery } from "../hooks/usePlatformQueries";
import { InlineLoader, ErrorState } from "../components/ui";

export function PublicBatchPage() {
  const { collegeSlug, graduationYear: gradYearParam } = useParams<{
    collegeSlug: string;
    graduationYear: string;
  }>();
  const navigate = useNavigate();

  const graduationYear = gradYearParam ? parseInt(gradYearParam, 10) : new Date().getFullYear();
  const collegeIdOrSlug = collegeSlug || "";

  // Query public batch students (no login required)
  const batchQuery = usePublicBatchStudentsQuery(collegeIdOrSlug, graduationYear);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");

  const data = batchQuery.data;
  const collegeName = data?.collegeName || "IIT Delhi";
  const students = data?.students || [];

  // Get unique skills list for filter dropdown
  const allSkills = useMemo(() => {
    const skillsSet = new Set<string>();
    students.forEach((student) => {
      student.skills?.forEach((us: any) => {
        if (us.skill?.name) skillsSet.add(us.skill.name);
      });
    });
    return Array.from(skillsSet).sort();
  }, [students]);

  // Filter students based on name/degree/skills
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const name = student.profile?.fullName || "";
      const headline = student.profile?.headline || "";
      const matchesSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.username.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSkill =
        !selectedSkill ||
        student.skills?.some((us: any) => us.skill?.name === selectedSkill);

      return matchesSearch && matchesSkill;
    });
  }, [students, searchTerm, selectedSkill]);

  // Summarise statistics
  const stats = useMemo(() => {
    const total = students.length;
    const verified = students.filter((s) => s.verifiedEngineer).length;
    const avgScore = total
      ? Math.round(students.reduce((acc, s) => acc + (s.engineeringScore || 0), 0) / total)
      : 0;
    return { total, verified, avgScore };
  }, [students]);

  if (batchQuery.isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
        <InlineLoader label="Retrieving secure cohort profiles..." />
      </div>
    );
  }

  if (batchQuery.isError || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 min-h-[60vh]">
        <ErrorState
          title="Batch Catalog Unavailable"
          text="Could not load the requested public cohort directory. Please check the URL parameters."
          onRetry={() => batchQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-black/20 pb-16">
      {/* Dynamic Jumbotron Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-900 text-white py-12 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent opacity-50" />
        <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-xs font-semibold text-indigo-200">
              <Sparkles className="h-3.5 w-3.5" />
              Verified Institutional Cohort Directory
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              {collegeName}
            </h1>
            <p className="text-indigo-200 text-lg md:text-xl font-medium">
              Class of {graduationYear} • Candidate Profiles
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-indigo-150 pt-2">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" /> {stats.total} Active Engineers
              </span>
              <span className="flex items-center gap-1">
                <Award className="h-4 w-4" /> {stats.verified} Verified Badge Holders
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" /> Avg Score: {stats.avgScore}
              </span>
            </div>
          </div>

          <div className="w-full md:w-auto bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl md:max-w-sm space-y-4 shadow-xl">
            <div className="space-y-1">
              <h4 className="font-bold text-base">Corporate Recruitment</h4>
              <p className="text-xs text-indigo-200">Connect with this college cohort, search with premium filters, and request campus drives.</p>
            </div>
            <Link
              to="/business"
              className="w-full inline-flex items-center justify-center gap-1.5 bg-white hover:bg-indigo-50 text-slate-900 font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md hover:scale-[1.01]"
            >
              Sign Up as Recruiter
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Filters Column */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm space-y-6 sticky top-24">
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">Filter Directory</h3>
              <p className="text-xs text-gray-400">Search and sort candidates matching specific target roles.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Text Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search name, headline..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-xs border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-955 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors text-gray-955 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Technical Skill</label>
                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="w-full text-xs border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-955 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 transition-colors text-gray-955 dark:text-white"
                >
                  <option value="">All Skills</option>
                  {allSkills.map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Student Directory Grid */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Showing <span className="text-gray-900 dark:text-white font-bold">{filteredStudents.length}</span> eligible engineer(s)
              </p>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-800 p-12 text-center rounded-2xl shadow-sm text-gray-450 text-sm">
                No students match your search criteria. Try modifying your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredStudents.map((student) => {
                  const safeProfile = student.profile || {};
                  const currentExperience = student.experiences?.find((e: any) => e.isCurrent);
                  const education = student.educations?.[0];

                  return (
                    <div
                      key={student.id}
                      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 bg-gray-50 border border-gray-150 rounded-xl overflow-hidden shrink-0">
                            {safeProfile.avatarUrl ? (
                              <img src={safeProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-indigo-50 text-indigo-705 font-bold text-base">
                                {safeProfile.fullName?.charAt(0) || student.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-base text-gray-955 dark:text-white truncate flex items-center gap-1.5">
                              {safeProfile.fullName || `@${student.username}`}
                              {student.verifiedEngineer && (
                                <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 border border-blue-200 animate-pulse">
                                  VERIFIED
                                </span>
                              )}
                            </h3>
                            <p className="text-xs text-indigo-650 dark:text-indigo-400 font-medium truncate mt-0.5">
                              {safeProfile.headline || "Engineering Student"}
                            </p>
                          </div>
                        </div>

                        {safeProfile.about && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                            {safeProfile.about}
                          </p>
                        )}

                        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-405 bg-gray-50/50 dark:bg-gray-955/20 p-3 rounded-xl border border-gray-150 dark:border-gray-85">
                          {education && (
                            <p className="flex items-center gap-1.5">
                              <BookOpen className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <span className="truncate">
                                <strong>Degree:</strong> {education.degree} in {education.fieldOfStudy}
                              </span>
                            </p>
                          )}
                          {currentExperience ? (
                            <p className="flex items-center gap-1.5">
                              <Briefcase className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <span className="truncate">
                                <strong>Interning:</strong> {currentExperience.title} @ {currentExperience.companyName}
                              </span>
                            </p>
                          ) : (
                            <p className="flex items-center gap-1.5">
                              <Briefcase className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <span>Open to Work / Placement Drive Invites</span>
                            </p>
                          )}
                        </div>

                        {student.skills?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {student.skills.slice(0, 3).map((us: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-gray-50 dark:bg-gray-95 border border-gray-150 dark:border-gray-85 text-[10px] text-gray-605 rounded-md"
                              >
                                {us.skill?.name}
                              </span>
                            ))}
                            {student.skills.length > 3 && (
                              <span className="px-2 py-0.5 bg-gray-50 dark:bg-gray-95 border border-gray-150 dark:border-gray-85 text-[10px] text-gray-405 rounded-md">
                                +{student.skills.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-gray-150 dark:border-gray-85 pt-4 mt-5 flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-700 dark:text-gray-300">
                          Platform Score: <span className="text-blue-600">⚡{Math.round(student.engineeringScore || 0)}</span>
                        </span>

                        <Link
                          to={`/auth?redirect=/users/${student.id}`}
                          className="text-indigo-650 hover:text-indigo-800 font-bold inline-flex items-center gap-1"
                        >
                          View Full Profile
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
