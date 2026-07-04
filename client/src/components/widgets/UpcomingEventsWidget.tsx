import React from "react";
import { Calendar, MapPin, Video, Laptop, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { useEventsQuery } from "../../hooks/usePlatformQueries";
import { WidgetContainer } from "../ui/WidgetContainer";
import { SkeletonBlock } from "../ui";
import { Event } from "../../lib/api";

export function UpcomingEventsWidget() {
  const { data: events, isLoading, error } = useEventsQuery();

  const getEventIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("hackathon")) return Laptop;
    if (t.includes("workshop") || t.includes("course") || t.includes("bootcamp")) return Laptop;
    if (t.includes("placement") || t.includes("talk") || t.includes("hiring")) return Award;
    return Calendar;
  };

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
        <div className="flex flex-col h-full justify-between">
          <div className="space-y-3.5">
            {events.slice(0, 3).map((event: Event) => {
              const EventIcon = getEventIcon(event.type);
              const eventDate = new Date(event.startDate);
              const monthStr = eventDate.toLocaleString("en-US", { month: "short" }).toUpperCase();
              const dayStr = eventDate.getDate().toString().padStart(2, "0");

              return (
                <Link
                  key={event.id}
                  to="/campus/events"
                  className="flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--bg-surface-2)] transition-all duration-200"
                >
                  {/* Event Icon Block */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-brand-light text-brand shrink-0 border border-brand/5">
                      <EventIcon size={16} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-primary truncate">
                        {event.title}
                      </h4>
                      <p className="text-[10px] text-secondary truncate mt-0.5 font-medium flex items-center gap-1">
                        {event.meetingUrl ? (
                          <>
                            <Video size={10} className="shrink-0" />
                            Online
                          </>
                        ) : (
                          <>
                            <MapPin size={10} className="shrink-0" />
                            {event.location || "On campus"}
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Event Date Block (Right aligned) */}
                  <div className="flex flex-col items-center justify-center pl-2 shrink-0 text-right">
                    <span className="text-xs font-extrabold text-primary leading-none">
                      {dayStr}
                    </span>
                    <span className="text-[8px] font-black uppercase text-muted tracking-wider mt-0.5">
                      {monthStr}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <Link
            to="/campus/events"
            className="text-[11px] text-brand hover:underline font-bold mt-4 block"
          >
            View all events →
          </Link>
        </div>
      )}
    </WidgetContainer>
  );
}
