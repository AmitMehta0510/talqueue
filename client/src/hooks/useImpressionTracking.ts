import { useEffect, useRef } from "react";
import { api, FeedItemType } from "../lib/api";

const trackedImpressions = new Set<string>();

export const useImpressionTracking = ({
  entityId,
  entityType,
  enabled,
  position,
}: {
  entityId?: string;
  entityType?: FeedItemType;
  enabled: boolean;
  position?: number;
}) => {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;

    if (!node || !enabled || !entityId || !entityType) {
      return;
    }

    const key = `${entityType}:${entityId}`;

    if (trackedImpressions.has(key)) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || entry.intersectionRatio < 0.5) {
          return;
        }

        trackedImpressions.add(key);
        observer.disconnect();

        api
          .trackFeedImpression({
            entityId,
            entityType,
            position,
          })
          .catch(() => {
            trackedImpressions.delete(key);
          });
      },
      {
        threshold: [0.5],
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [enabled, entityId, entityType, position]);

  return ref;
};
