import { ShieldCheck, Plus, Check, Loader2 } from "lucide-react";
import { Company } from "../../lib/api";
import { titleCase, cleanLogoUrl } from "../../core/utils/format";
import { useAuth } from "../../core/contexts/AuthContext";
import { useFollowCompanyMutation, useUnfollowCompanyMutation } from "../../hooks/usePlatformQueries";
import { useState, useEffect } from "react";

export function CompanyFeedCard({ company }: { company: Company }) {
  const { user } = useAuth();
  const followMutation = useFollowCompanyMutation();
  const unfollowMutation = useUnfollowCompanyMutation();
  const [isFollowing, setIsFollowing] = useState(!!company.isFollowing);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsFollowing(!!company.isFollowing);
  }, [company.isFollowing]);

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user || loading) return;
    setLoading(true);
    const originalFollowing = isFollowing;
    setIsFollowing(!isFollowing);

    try {
      if (originalFollowing) {
        await unfollowMutation.mutateAsync({
          companyId: company.id,
          slug: company.slug,
          companyName: company.name,
        });
      } else {
        await followMutation.mutateAsync({
          companyId: company.id,
          slug: company.slug,
          companyName: company.name,
        });
      }
    } catch {
      setIsFollowing(originalFollowing);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRedirect = () => {
    const url = company.careersPageUrl || company.websiteUrl;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <article className="panel p-5 hover-lift">
      <div className="flex items-start gap-4">
        {cleanLogoUrl(company.logoUrl) ? (
          <img
            src={cleanLogoUrl(company.logoUrl)!}
            alt={`${company.name} logo`}
            className="h-11 w-11 shrink-0 rounded-lg object-cover border border-base"
          />
        ) : (
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400 font-bold text-lg">
            {company.name.substring(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-primary">
              {company.name}
            </h3>
            {company.verified && <ShieldCheck size={16} className="text-indigo-500 shrink-0" />}
            <span className="chip uppercase tracking-wider text-[9px]">Company</span>
          </div>
          <p className="mt-1 text-sm text-muted-fg">
            {company.tagline || "Technology Company"}
          </p>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-secondary">
            {company.description || "Leading software development and engineering solutions provider."}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {company.industry && (
          <span className="chip" key={company.industry}>
            {company.industry}
          </span>
        )}
        {company.headquarters && (
          <span className="chip" key={company.headquarters}>
            📍 {company.headquarters}
          </span>
        )}
        {company.size && (
          <span className="chip" key={company.size}>
            👥 {titleCase(company.size)}
          </span>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-base pt-4">
        <div className="flex gap-2">
          {user && (
            <button
              onClick={handleFollowToggle}
              disabled={loading}
              className={`btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 ${
                isFollowing ? "text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-400" : ""
              }`}
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isFollowing ? (
                <Check size={14} />
              ) : (
                <Plus size={14} />
              )}
              {isFollowing ? "Following" : "Follow Company"}
            </button>
          )}
        </div>
        {(company.careersPageUrl || company.websiteUrl) && (
          <button
            onClick={handleApplyRedirect}
            className="btn-primary text-xs px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all"
          >
            Visit Careers Website
          </button>
        )}
      </div>
    </article>
  );
}
