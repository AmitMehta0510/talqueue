import { Calendar, MapPin, Video } from "lucide-react";
import { useEventsQuery } from "../../hooks/usePlatformQueries";
import { WidgetContainer } from "../ui/WidgetContainer";
import { SkeletonBlock } from "../ui";
import { Event } from "../../lib/api";

export function UpcomingEventsWidget() {
  const { data: events, isLoading, error } = useEventsQuery();

  if (isLoading) {
    return (
      <WidgetContainer title="Upcoming Events">
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex gap-3">
              <SkeletonBlock className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-3 w-3/4" />
                <SkeletonBlock className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </WidgetContainer>
    );
  }

  if (error || !events) {
    return (
      <WidgetContainer title="Upcoming Events">
        <div className="text-center py-4 text-xs text-danger">
          Failed to load upcoming events
        </div>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer title="Upcoming Events">
      {events.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted flex flex-col items-center justify-center gap-2">
          <Calendar size={24} className="text-muted" />
          <span>No upcoming events scheduled</span>
        </div>
      ) : (
        <div className="space-y-3.5">
          {events.slice(0, 4).map((event: Event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 p-2 rounded-xl border border-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--bg-surface-2)] transition-all duration-200"
            >
              {/* Event Date Block */}
              <div className="flex flex-col items-center justify-center h-10 w-10 rounded-xl bg-brand-light text-brand shrink-0 border border-brand/5">
                <span className="text-[10px] font-black uppercase leading-none">
                  {new Date(event.startDate).toLocaleString("en-US", { month: "short" })}
                </span>
                <span className="text-sm font-black leading-none mt-0.5">
                  {new Date(event.startDate).getDate()}
                </span>
              </div>

              {/* Event Details */}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-primary truncate hover:text-brand transition-colors duration-200">
                  {event.title}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted">
                  <span className="px-1.5 py-0.5 rounded bg-surface-3 text-[9px] font-extrabold uppercase tracking-wide border border-[color:var(--border)]">
                    {event.type}
                  </span>
                  <span className="flex items-center gap-0.5 truncate">
                    {event.meetingUrl ? (
                      <>
                        <Video size={10} />
                        Online
                      </>
                    ) : (
                      <>
                        <MapPin size={10} />
                        {event.location || "On campus"}
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetContainer>
  );
}
