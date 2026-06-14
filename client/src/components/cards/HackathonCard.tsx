import { CalendarDays, Check, MapPin, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Hackathon } from "../../lib/api";
import { formatCount, formatDate, titleCase, userName } from "../../lib/format";
import { Avatar } from "../ui";

const PLATFORM_COLORS: Record<string, string> = {
  Devpost: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Devfolio: "bg-blue-50 text-blue-700 border-blue-200",
  Unstop: "bg-indigo-50 text-indigo-700 border-indigo-200",
  TAIKAI: "bg-orange-50 text-orange-700 border-orange-200",
  HackerEarth: "bg-purple-50 text-purple-700 border-purple-200",
  Reskilll: "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_CHIP_CLASSES: Record<string, string> = {
  LIVE: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  OPEN: "bg-blue-50 text-blue-700 border border-blue-200",
  COMPLETED: "bg-slate-100 text-slate-500 border border-slate-200",
  DRAFT: "bg-amber-50 text-amber-700 border border-amber-200",
  ARCHIVED: "bg-rose-50 text-rose-600 border border-rose-200",
};


const hackathonCount = (
  hackathon: Hackathon,
  key: "registrations" | "submissions" | "judges" | "winners",
) => {
  if (hackathon._count?.[key]) return hackathon._count[key] || 0;
  if (key === "registrations") return hackathon.registrationCount || 0;
  if (key === "submissions") return hackathon.submissionCount || 0;
  if (key === "judges") return hackathon.judgeCount || 0;
  return hackathon.winnerCount || 0;
};

export function HackathonCard({ hackathon }: { hackathon: Hackathon }) {
  const registrationTotal = Number(hackathonCount(hackathon, "registrations"));
  const submissionTotal = Number(hackathonCount(hackathon, "submissions"));
  const judgeTotal = Number(hackathonCount(hackathon, "judges"));

  return (
    <article className="panel overflow-hidden flex flex-col justify-between">
      <div>
        {hackathon.bannerUrl && (
          <Link to={`/hackathons/${hackathon.id}`}>
            <img
              className="h-36 w-full object-cover"
              src={hackathon.bannerUrl}
              alt={hackathon.title}
            />
          </Link>
        )}
        <div className="p-5 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-slate-955">
                  <Link className="hover:text-emerald-700" to={`/hackathons/${hackathon.id}`}>
                    {hackathon.title}
                  </Link>
                </h3>
                {hackathon.verified && (
                  <span className="chip text-emerald-700">
                    <Check size={13} />
                    Verified
                  </span>
                )}
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                {hackathon.shortDescription || hackathon.description}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {hackathon.isExternal && (
                <span className={`chip border font-bold ${PLATFORM_COLORS[hackathon.sourcePlatform || ""] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                  {hackathon.sourcePlatform || "External"}
                </span>
              )}
              <span className={`chip ${(STATUS_CHIP_CLASSES[(hackathon.status || "DRAFT").toUpperCase()]) || "bg-slate-50 text-slate-500 border border-slate-200"}`}>
                {titleCase(hackathon.status || "DRAFT")}
              </span>

            </div>
          </div>

          {hackathon.isExternal ? (
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div className="rounded-lg border border-slate-100 p-3 bg-slate-50/30 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <CalendarDays size={14} className="text-blue-500" />
                  {formatDate(hackathon.startDate)}
                </div>
                <div className="mt-1 text-slate-400 font-medium">Starts</div>
              </div>
              <div className="rounded-lg border border-slate-100 p-3 bg-slate-50/30 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-1.5 font-semibold text-rose-600">
                  <CalendarDays size={14} className="text-rose-500" />
                  {formatDate(hackathon.registrationDeadline)}
                </div>
                <div className="mt-1 text-slate-400 font-medium">Deadline</div>
              </div>
              <div className="rounded-lg border border-slate-100 p-3 bg-slate-50/30 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Users size={14} className="text-emerald-500" />
                  {(() => {
                    const min = hackathon.minTeamSize ?? 1;
                    const max = hackathon.maxTeamSize ?? 1;
                    if (min === max) {
                      return max === 1 ? "Solo" : `${max} Members`;
                    }
                    return `${min} - ${max} Members`;
                  })()}
                </div>
                <div className="mt-1 text-slate-400 font-medium">Team Size</div>
              </div>
              <div className="rounded-lg border border-slate-100 p-3 bg-slate-50/30 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <MapPin size={14} className="text-amber-500" />
                  <span className="truncate">{hackathon.mode === "ONLINE" ? "Online" : hackathon.location || "Offline"}</span>
                </div>
                <div className="mt-1 text-slate-400 font-medium">Location</div>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div className="rounded-lg border border-slate-100 p-3 bg-slate-50/30 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <CalendarDays size={14} className="text-blue-500" />
                  {formatDate(hackathon.startDate)}
                </div>
                <div className="mt-1 text-slate-400 font-medium">Starts</div>
              </div>
              <div className="rounded-lg border border-slate-100 p-3 bg-slate-50/30 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Users size={14} className="text-emerald-500" />
                  {formatCount(registrationTotal)}
                </div>
                <div className="mt-1 text-slate-400 font-medium">Teams</div>
              </div>
              <div className="rounded-lg border border-slate-100 p-3 bg-slate-50/30 hover:bg-slate-50 transition-colors">
                <div className="font-semibold text-slate-900">{formatCount(submissionTotal)}</div>
                <div className="mt-1 text-slate-400 font-medium">Submissions</div>
              </div>
              <div className="rounded-lg border border-slate-100 p-3 bg-slate-50/30 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Trophy size={14} className="text-amber-500" />
                  {formatCount(judgeTotal)}
                </div>
                <div className="mt-1 text-slate-400 font-medium">Judges</div>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {hackathon.mode && <span className="chip">{titleCase(hackathon.mode)}</span>}
            {hackathon.location && (
              <span className="chip">
                <MapPin size={13} />
                {hackathon.location}
              </span>
            )}
            {hackathon.tags?.slice(0, 3).map((tag) => (
              <span className="chip" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 pt-0">
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
            <Avatar user={hackathon.createdBy} size="sm" />
            <span className="truncate">{hackathon.organizerName || userName(hackathon.createdBy)}</span>
          </div>
          <Link className="btn-secondary px-3 py-1.5" to={`/hackathons/${hackathon.id}`}>
            Open
          </Link>
        </div>
      </div>
    </article>
  );
}
