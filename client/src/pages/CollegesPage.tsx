import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useUrlState } from "../core/utils/useUrlState";
import { useAuth } from "../core/contexts/AuthContext";
import {
  useCollegesQuery,
  useSearchCollegesQuery,
  useCreateCollegeMutation,
} from "../hooks/usePlatformQueries";
import { College } from "../lib/api";
import { compactPayload } from "../core/utils/format";
import { isSuperOrPlatformAdmin } from "../core/utils/roles";

// Extracted Presentational Components
import { CollegeList } from "../components/colleges/CollegeList";
import { CollegeDetailWrapper } from "../components/colleges/CollegeDetailWrapper";

const flattenColleges = (pages?: Array<{ colleges: College[] }>) =>
  (pages || []).flatMap((page) => page.colleges || []);

export function CollegesPage() {
  const { collegeSlug } = useParams<{ collegeSlug?: string }>();
  const { user } = useAuth();
  const [query, setQuery] = useUrlState("search", "", { replace: true });
  const [stateFilter] = useUrlState("state", "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const collegesQuery = useCollegesQuery(40);
  const searchCollegesQuery = useSearchCollegesQuery(debouncedQuery);

  const isSearching = debouncedQuery.length >= 2;
  const isAdmin = isSuperOrPlatformAdmin(user);

  const filteredColleges = useMemo(() => {
    const list = isSearching
      ? searchCollegesQuery.data || []
      : flattenColleges(collegesQuery.data?.pages);
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedState = stateFilter.trim().toLowerCase();

    return list.filter((college) => {
      const matchQuery = !normalizedQuery || 
        [college.name, college.city, college.state].filter(Boolean).join(" ").toLowerCase().includes(normalizedQuery);
      const matchState = !normalizedState || 
        (college.state && college.state.toLowerCase() === normalizedState);
      return matchQuery && matchState;
    });
  }, [collegesQuery.data?.pages, query, stateFilter, isSearching, searchCollegesQuery.data]);

  const createCollege = useCreateCollegeMutation();

  const handleCreateCollege = async (payload: {
    name: string;
    city: string;
    state: string;
    website: string;
    logoUrl: string;
  }) => {
    await createCollege.mutateAsync({
      name: payload.name,
      ...compactPayload({
        city: payload.city,
        state: payload.state,
        website: payload.website,
        logoUrl: payload.logoUrl,
      }),
    });
  };

  if (collegeSlug) {
    return <CollegeDetailWrapper collegeId={collegeSlug} />;
  }

  const isFetchingList = isSearching ? searchCollegesQuery.isFetching : collegesQuery.isFetching;

  return (
    <CollegeList
      query={query}
      setQuery={setQuery}
      filteredColleges={filteredColleges}
      isFetchingList={isFetchingList}
      isSearching={isSearching}
      hasNextPage={!isSearching && collegesQuery.hasNextPage}
      isFetchingNextPage={collegesQuery.isFetchingNextPage}
      fetchNextPage={() => collegesQuery.fetchNextPage()}
      isAdmin={isAdmin}
      user={user}
      onCreateCollege={handleCreateCollege}
      isCreatingCollege={createCollege.isPending}
    />
  );
}
export default CollegesPage;
