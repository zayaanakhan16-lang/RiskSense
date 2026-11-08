export type FreshnessState = "fresh" | "aging" | "stale" | "expired";

export interface Freshness {
  state: FreshnessState;
  /** Age of the newest data point, in minutes. */
  ageMinutes: number;
  /** Human label, e.g. "12 min ago". */
  label: string;
  /** Explanation shown to the user, e.g. "FIRMS NRT updates every ~3 hours." */
  detail: string;
}

/**
 * Classifies data age relative to a source's documented refresh cadence.
 * A source that publishes hourly is not "stale" at 40 minutes; one that
 * publishes every 10 minutes is.
 */
export function computeFreshness(
  observedAt: string | undefined,
  expectedRefreshMinutes: number,
  now: number = Date.now(),
): Freshness {
  if (!observedAt) {
    return {
      state: "expired",
      ageMinutes: Number.POSITIVE_INFINITY,
      label: "no data",
      detail: "No observation timestamp is available from this source.",
    };
  }

  const ageMinutes = Math.max(
    0,
    (now - new Date(observedAt).getTime()) / 60_000,
  );
  const refresh = Math.max(1, expectedRefreshMinutes);

  let state: FreshnessState = "fresh";
  if (ageMinutes > refresh * 12) state = "expired";
  else if (ageMinutes > refresh * 4) state = "stale";
  else if (ageMinutes > refresh * 1.5) state = "aging";

  return {
    state,
    ageMinutes,
    label: humanAge(ageMinutes),
    detail: `Source refreshes roughly every ${formatRefresh(refresh)}.`,
  };
}

export function humanAge(ageMinutes: number): string {
  if (!Number.isFinite(ageMinutes)) return "unknown";
  if (ageMinutes < 1) return "just now";
  if (ageMinutes < 60) return `${Math.round(ageMinutes)} min ago`;
  const hours = ageMinutes / 60;
  if (hours < 48) return `${Math.round(hours)} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/** Short relative age used inside compact list rows, e.g. "12 min", "3 h". */
export function shortAge(ageMinutes: number): string {
  if (!Number.isFinite(ageMinutes)) return "—";
  if (ageMinutes < 1) return "now";
  if (ageMinutes < 60) return `${Math.round(ageMinutes)} min`;
  const hours = ageMinutes / 60;
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} d`;
}

export function formatRefresh(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} minutes`;
  const hours = minutes / 60;
  if (hours < 24) return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hours`;
  return `${Math.round(hours / 24)} day(s)`;
}

export const FRESHNESS_COLORS: Record<FreshnessState, string> = {
  fresh: "#3E9B6E",
  aging: "#CA8A04",
  stale: "#EA580C",
  expired: "#DC2626",
};
