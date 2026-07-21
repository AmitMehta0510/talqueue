/**
 * AdSlot.tsx
 *
 * Drop-in ad placement component.
 * Usage: <AdSlot zone="feed_inline" />
 *
 * Behaviour:
 *  1. Fetches the best matching ad from GET /ads/serve?zone=...
 *  2. Uses IntersectionObserver to fire impression only when ≥50% visible
 *  3. Click → POST /ads/click → redirects to destinationUrl in new tab
 *  4. Renders nothing if no ad returned (graceful empty)
 *  5. "Sponsored" label + dismiss button for user trust
 */

import React, { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ServedAd {
  id: string;
  type: "BANNER" | "CARD" | "SPONSORED_JOB" | "SPONSORED_COMPANY" | "TEXT_LINK";
  zone: string;
  headline: string | null;
  bodyText: string | null;
  imageUrl: string | null;
  ctaText: string;
  destinationUrl: string;
  campaignId: string;
}

interface AdSlotProps {
  zone: string;
  className?: string;
  style?: React.CSSProperties;
}

// ── Session ID helper (persisted per browser session for dedup) ───────────────

function getSessionId(): string {
  const key = "ep_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, id);
  }
  return id;
}

// ── Main Component ────────────────────────────────────────────────────────────

export const AdSlot: React.FC<AdSlotProps> = ({ zone, className, style }) => {
  const [ad, setAd] = useState<ServedAd | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [impressionFired, setImpressionFired] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sessionId = getSessionId();

  // Fetch ad on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.ads.serve(zone);
        if (!cancelled && res.data?.ad) {
          setAd(res.data.ad as ServedAd);
        }
      } catch {
        // silently fail — no ad shown
      }
    })();
    return () => { cancelled = true; };
  }, [zone]);

  // Intersection Observer — fire impression when ad is 50% in view
  useEffect(() => {
    if (!ad || impressionFired || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !impressionFired) {
          setImpressionFired(true);
          api.ads.impression(ad.id, zone, sessionId).catch(() => {});
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [ad, impressionFired, zone, sessionId]);

  // Nothing to show
  if (!ad || dismissed) return null;

  const handleClick = async () => {
    try {
      const res = await api.ads.click(ad.id, zone, sessionId);
      const url = res.data?.destinationUrl ?? ad.destinationUrl;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      window.open(ad.destinationUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div ref={containerRef} className={className} style={style}>
      {ad.type === "CARD" && <AdCard ad={ad} onClick={handleClick} onDismiss={() => setDismissed(true)} />}
      {ad.type === "BANNER" && <AdBanner ad={ad} onClick={handleClick} onDismiss={() => setDismissed(true)} />}
      {ad.type === "TEXT_LINK" && <AdTextLink ad={ad} onClick={handleClick} onDismiss={() => setDismissed(true)} />}
      {(ad.type === "SPONSORED_JOB" || ad.type === "SPONSORED_COMPANY") && (
        <AdCard ad={ad} onClick={handleClick} onDismiss={() => setDismissed(true)} />
      )}
    </div>
  );
};

// ── Ad Card (native feed card style) ─────────────────────────────────────────

const AdCard: React.FC<{
  ad: ServedAd;
  onClick: () => void;
  onDismiss: () => void;
}> = ({ ad, onClick, onDismiss }) => (
  <div
    style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      overflow: "hidden",
      position: "relative",
    }}
  >
    {/* Sponsored label + dismiss */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 12px 0",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Sponsored
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        title="Dismiss ad"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          fontSize: "16px",
          lineHeight: 1,
          padding: "2px 4px",
        }}
      >
        ×
      </button>
    </div>

    {/* Image */}
    {ad.imageUrl && (
      <div
        style={{
          width: "100%",
          height: "140px",
          overflow: "hidden",
          cursor: "pointer",
        }}
        onClick={onClick}
      >
        <img
          src={ad.imageUrl}
          alt={ad.headline ?? "Sponsored"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    )}

    {/* Content */}
    <div style={{ padding: "12px 16px 16px" }}>
      {ad.headline && (
        <div
          style={{
            fontWeight: 700,
            fontSize: "15px",
            color: "var(--text-primary)",
            marginBottom: "4px",
            cursor: "pointer",
          }}
          onClick={onClick}
        >
          {ad.headline}
        </div>
      )}
      {ad.bodyText && (
        <div
          style={{
            fontSize: "13px",
            color: "var(--text-secondary)",
            marginBottom: "12px",
            lineHeight: 1.4,
          }}
        >
          {ad.bodyText}
        </div>
      )}
      <button
        onClick={onClick}
        style={{
          padding: "8px 16px",
          borderRadius: "8px",
          border: "none",
          background: "var(--brand)",
          color: "var(--text-inverse)",
          fontWeight: 600,
          fontSize: "13px",
          cursor: "pointer",
          boxShadow: "0 2px 8px var(--brand-glow)",
        }}
      >
        {ad.ctaText}
      </button>
    </div>
  </div>
);

// ── Banner Ad ─────────────────────────────────────────────────────────────────

const AdBanner: React.FC<{
  ad: ServedAd;
  onClick: () => void;
  onDismiss: () => void;
}> = ({ ad, onClick, onDismiss }) => (
  <div
    style={{
      position: "relative",
      borderRadius: "12px",
      overflow: "hidden",
      border: "1px solid var(--border)",
      cursor: "pointer",
    }}
    onClick={onClick}
  >
    {/* Sponsored label */}
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 10,
        fontSize: "10px",
        fontWeight: 700,
        color: "rgba(255,255,255,0.8)",
        background: "rgba(0,0,0,0.4)",
        padding: "2px 6px",
        borderRadius: "4px",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        zIndex: 2,
      }}
    >
      Sponsored
    </div>

    {/* Dismiss */}
    <button
      onClick={(e) => { e.stopPropagation(); onDismiss(); }}
      style={{
        position: "absolute",
        top: 6,
        right: 8,
        background: "rgba(0,0,0,0.4)",
        border: "none",
        cursor: "pointer",
        color: "rgba(255,255,255,0.8)",
        fontSize: "16px",
        borderRadius: "50%",
        width: 22,
        height: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
      }}
    >
      ×
    </button>

    {ad.imageUrl && (
      <img
        src={ad.imageUrl}
        alt={ad.headline ?? "Sponsored"}
        style={{ width: "100%", display: "block", maxHeight: "90px", objectFit: "cover" }}
      />
    )}
    {!ad.imageUrl && (
      <div
        style={{
          background: "linear-gradient(135deg, var(--brand), #7c3aed)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontWeight: 700, color: "#fff", fontSize: "14px" }}>
          {ad.headline}
        </div>
        <div
          style={{
            padding: "6px 14px",
            borderRadius: "6px",
            background: "rgba(255,255,255,0.2)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "12px",
          }}
        >
          {ad.ctaText}
        </div>
      </div>
    )}
  </div>
);

// ── Text Link Ad ──────────────────────────────────────────────────────────────

const AdTextLink: React.FC<{
  ad: ServedAd;
  onClick: () => void;
  onDismiss: () => void;
}> = ({ ad, onClick, onDismiss }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 14px",
      borderRadius: "8px",
      border: "1px solid var(--border)",
      background: "var(--bg-surface-2)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          border: "1px solid var(--border)",
          padding: "1px 4px",
          borderRadius: "3px",
        }}
      >
        Ad
      </span>
      <button
        onClick={onClick}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--brand)",
          fontSize: "13px",
          fontWeight: 600,
          textDecoration: "underline",
          padding: 0,
        }}
      >
        {ad.headline ?? ad.ctaText}
      </button>
    </div>
    <button
      onClick={onDismiss}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "var(--text-muted)",
        fontSize: "14px",
        padding: "0 4px",
      }}
    >
      ×
    </button>
  </div>
);
