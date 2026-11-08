"use client";

import { FRESHNESS_COLORS, computeFreshness, type EventsResponse } from "@risksense/shared";
import { InfoIcon } from "@/components/Icons";
import { cx } from "@/components/ui/Primitives";
import type { Dict } from "@/lib/i18n";

interface Props {
  data: EventsResponse | null;
  loading: boolean;
  dict: Dict;
  onOpenSources: () => void;
}

/**
 * Data freshness strip. It reports, per source, when data last arrived and
 * whether that is normal for the publisher's cadence — so a quiet feed is
 * distinguishable from a broken one.
 */
export default function SourceStatusBar({ data, loading, dict, onOpenSources }: Props) {
  if (!data) {
    return (
      <div className="pointer-events-auto flex items-center gap-2 rounded-[var(--r-pill)] border border-line bg-white/95 px-3 py-1.5 text-[11.5px] text-ink-2 shadow-[var(--sh-2)] backdrop-blur-md">
        <span className="h-2 w-2 animate-pulse rounded-full bg-line-strong" />
        {loading ? "Contacting data sources…" : "No data"}
      </div>
    );
  }

  const worst = data.sources.reduce(
    (acc, s) => {
      if (s.state === "unavailable") return Math.max(acc, 3);
      if (s.state === "degraded") return Math.max(acc, 2);
      const f = computeFreshness(s.lastSuccessAt, s.expectedRefreshMinutes);
      const rank = f.state === "expired" ? 3 : f.state === "stale" ? 2 : f.state === "aging" ? 1 : 0;
      return Math.max(acc, rank);
    },
    0,
  );

  const okCount = data.sources.filter((s) => s.state === "ok").length;
  const dotColor =
    worst >= 3 ? "#dc2626" : worst === 2 ? "#ea580c" : worst === 1 ? "#ca8a04" : "#0f9d58";

  return (
    <button
      onClick={onOpenSources}
      className="pointer-events-auto flex items-center gap-2 rounded-[var(--r-pill)] border border-line bg-white/95 px-3 py-1.5 text-[11.5px] text-ink-2 shadow-[var(--sh-2)] backdrop-blur-md transition-colors hover:text-ink"
      title={dict.nav.sources}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
      <span className="rs-tabular font-medium text-ink">
        {okCount}/{data.sources.length}
      </span>
      <span>sources reporting</span>
      <span className="rs-tabular text-ink-3">· {data.total} events</span>
      {data.warnings.length > 0 && (
        <span className="inline-flex items-center gap-1 text-warn">
          <InfoIcon size={12} />
          {data.warnings.length}
        </span>
      )}
    </button>
  );
}

export function FreshnessDot({
  observedAt,
  refreshMinutes,
  label,
}: {
  observedAt?: string;
  refreshMinutes: number;
  label?: string;
}) {
  const f = computeFreshness(observedAt, refreshMinutes);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cx("h-1.5 w-1.5 rounded-full")}
        style={{ backgroundColor: FRESHNESS_COLORS[f.state] }}
      />
      <span className="text-[10.5px] text-ink-3">{label ?? f.label}</span>
    </span>
  );
}
