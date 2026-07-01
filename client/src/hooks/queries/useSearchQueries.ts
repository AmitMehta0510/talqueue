import {
  useQuery,
  useMutation
} from "@tanstack/react-query";
import {
  api,
  Project,
  SearchResults,
  SearchMutationResult,
  RankedUser,
  RankedProject,
  User
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";

export type PlatformSearchPayload =
  | { tab: "all"; q: string }
  | { tab: "people"; q: string; people?: { college?: string; year?: string; skills?: string; role?: string; openToWork?: boolean; acceptingReferrals?: boolean; verifiedSkillsOnly?: boolean } }
  | { tab: "projects"; q: string; project?: { techStack?: string; status?: string; acceptingCollaborators?: boolean } }
  | { tab: "jobs"; q: string; job?: { company?: string; location?: string; workMode?: string; experienceLevel?: string; salaryMin?: string; salaryMax?: string; skills?: string; freshness?: string } }
  | { tab: "hackathons"; q: string; hack?: { tags?: string; upcomingOnly?: boolean } }
  | { tab: "companies"; q: string; company?: { industry?: string; location?: string; hiringEnabled?: boolean; referralEnabled?: boolean } }
  | { tab: "communities"; q: string; community?: { type?: string; category?: string } }
  | { tab: "posts"; q: string };

export const useSkillSearchQuery = (query: string) =>
  useQuery({
    queryKey: queryKeys.users.skillSearch(query.trim()),
    queryFn: async ({ signal }) => {
      const result = await api.searchSkills(query.trim(), { signal });
      return result.data || [];
    },
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60_000,
  });


export const usePlatformSearchMutation = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: PlatformSearchPayload | string): Promise<SearchMutationResult> => {
      // Legacy string support
      if (typeof payload === "string") {
        const q = payload.trim();
        if (!q) return {};
        const [globalResult, userResult, projectResult] = await Promise.all([
          api.searchGlobal(q),
          api.searchUsers({ q }),
          api.searchProjects({ q }),
        ]);
        // Server returns { user, relevanceScore }[] — flatten to raw User[]
        const rawUsers = (userResult.data || []) as (RankedUser | User)[];
        const flatUsers = rawUsers.map((item) =>
          "id" in item ? item : { ...item.user, affinityScore: item.relevanceScore }
        );
        // Server returns { project, relevanceScore }[] — flatten to raw Project[]
        const rawProjects = (projectResult.data || []) as (RankedProject | Project)[];
        const flatProjects = rawProjects.map((item) =>
          "id" in item ? item : { ...item.project }
        );
        return { ...globalResult.data, users: flatUsers, projects: flatProjects };
      }

      const q = payload.q.trim();

      // Helper: server returns { user, relevanceScore, matchReasons }[] from searchUsers
      const flattenUsers = (data: (RankedUser | User)[]): User[] => {
        if (!data?.length) return [];
        // If first item is a raw user (has 'id'), return as-is
        if ("id" in data[0]) return data as User[];
        // Otherwise flatten the wrapped format
        return data.map((item) => {
          const ranked = item as RankedUser;
          return {
            ...ranked.user,
            affinityScore: ranked.relevanceScore,
          };
        });
      };

      // Helper: server returns { project, relevanceScore }[] from searchProjects
      const flattenProjects = (data: (RankedProject | Project)[]): Project[] => {
        if (!data?.length) return [];
        if ("id" in data[0]) return data as Project[];
        return data.map((item) => {
          const ranked = item as RankedProject;
          return { ...ranked.project, relevanceScore: ranked.relevanceScore };
        });
      };

      // ── People ────────────────────────────────────────────────────────────
      if (payload.tab === "people") {
        const f = payload.people || {};
        const result = await api.searchUsers({
          ...(q && { q }),
          ...(f.college && { collegeName: f.college }),
          ...(f.year && { graduationYears: f.year }),
          ...(f.skills && { skills: f.skills }),
          ...(f.openToWork && { openToWork: true }),
          ...(f.acceptingReferrals && { acceptingReferrals: true }),
          ...(f.role && { role: f.role }),
          ...(f.verifiedSkillsOnly && { verifiedSkillsOnly: true }),
        });
        return { users: flattenUsers(result.data) };
      }

      // ── Projects ──────────────────────────────────────────────────────────
      if (payload.tab === "projects") {
        const f = payload.project || {};
        const result = await api.searchProjects({
          ...(q && { q }),
          ...(f.techStack && { techStack: f.techStack }),
          ...(f.status && { status: f.status }),
          ...(f.acceptingCollaborators && { lookingForCollaborators: true }),
        });
        return { projects: flattenProjects(result.data) };
      }

      // ── Jobs ──────────────────────────────────────────────────────────────
      if (payload.tab === "jobs") {
        const f = payload.job || {};
        const result = await api.searchJobs({
          ...(q && { q }),
          ...(f.company && { companyName: f.company }),
          ...(f.location && { location: f.location }),
          ...(f.workMode && { workMode: f.workMode }),
          ...(f.experienceLevel && { experienceLevel: f.experienceLevel }),
          ...(f.skills && { skills: f.skills }),
          ...(f.salaryMin && { salaryMin: Number(f.salaryMin) }),
          ...(f.salaryMax && { salaryMax: Number(f.salaryMax) }),
          ...(f.freshness && { postedWithinDays: Number(f.freshness) }),
        });
        return { jobs: result.data.jobs, jobsTotal: result.data.total };
      }

      // ── Hackathons ────────────────────────────────────────────────────────
      if (payload.tab === "hackathons") {
        const f = payload.hack || {};
        const result = await api.searchHackathons({
          ...(q && { q }),
          ...(f.tags && { tags: f.tags }),
          ...(f.upcomingOnly && { upcomingOnly: true }),
        });
        return { hackathons: result.data };
      }

      // ── Companies ─────────────────────────────────────────────────────────
      if (payload.tab === "companies") {
        const f = payload.company || {};
        const result = await api.searchCompanies({
          ...(q && { q }),
          ...(f.industry && { industry: f.industry }),
          ...(f.location && { location: f.location }),
          ...(f.hiringEnabled && { hiringEnabled: "true" }),
          ...(f.referralEnabled && { referralEnabled: "true" }),
        });
        return { companies: result.data };
      }

      // ── Communities ───────────────────────────────────────────────────────
      if (payload.tab === "communities") {
        const f = payload.community || {};
        const result = await api.searchCommunities({
          ...(q && { q }),
          ...(f.type && { type: f.type }),
          ...(f.category && { category: f.category }),
        });
        return { communities: result.data };
      }

      // ── All (global) ──────────────────────────────────────────────────────
      // Run with whatever query is available; even empty query returns top results
      const searchQuery = q || undefined;
      const [globalResult, userResult, projectResult, jobResult, companyResult, communityResult] = await Promise.all([
        searchQuery ? api.searchGlobal(searchQuery) : Promise.resolve({ data: {} as SearchResults }),
        api.searchUsers({ ...(searchQuery && { q: searchQuery }), limit: 12 }),
        api.searchProjects({ ...(searchQuery && { q: searchQuery }), limit: 12 }),
        api.searchJobs({ ...(searchQuery && { q: searchQuery }), limit: 12 }),
        api.searchCompanies({ ...(searchQuery && { q: searchQuery }), limit: 8 }),
        api.searchCommunities({ ...(searchQuery && { q: searchQuery }), limit: 8 }),
      ]);
      return {
        ...(searchQuery ? globalResult.data : {}),
        users: flattenUsers(userResult.data),
        projects: flattenProjects(projectResult.data),
        jobs: jobResult.data.jobs,
        jobsTotal: jobResult.data.total,
        companies: companyResult.data,
        communities: communityResult.data,
      };
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};
