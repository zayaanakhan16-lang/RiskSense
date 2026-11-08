import { hazardMeta, type HazardEvent, type HazardType } from "@risksense/shared";

export interface HazardStat {
  hazard: HazardType;
  label: string;
  color: string;
  count: number;
  /** Count at severity >= severe. */
  severeCount: number;
  /** Count officially confirmed or under official warning. */
  officialCount: number;
}

export interface CountryStat {
  countryCode: string;
  count: number;
  hazards: Partial<Record<HazardType, number>>;
  severeCount: number;
}

export interface ActivitySeriesPoint {
  /** ISO date (day bucket). */
  date: string;
  total: number;
  byHazard: Partial<Record<HazardType, number>>;
}

/**
 * All statistics are derived from the exact event list that was retrieved —
 * nothing is estimated or synthesised. When the sample is small the UI says so.
 */
export function hazardStats(events: HazardEvent[]): HazardStat[] {
  const map = new Map<HazardType, HazardStat>();
  for (const e of events) {
    const meta = hazardMeta(e.hazard);
    const entry =
      map.get(e.hazard) ??
      {
        hazard: e.hazard,
        label: meta.label,
        color: meta.color,
        count: 0,
        severeCount: 0,
        officialCount: 0,
      };
    entry.count += 1;
    if (e.severity.level === "severe" || e.severity.level === "extreme") entry.severeCount += 1;
    if (e.status === "warning" || e.status === "confirmed") entry.officialCount += 1;
    map.set(e.hazard, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function countryStats(events: HazardEvent[], limit = 25): CountryStat[] {
  const map = new Map<string, CountryStat>();
  for (const e of events) {
    if (!e.countryCode) continue;
    const cc = e.countryCode.toUpperCase();
    const entry =
      map.get(cc) ?? { countryCode: cc, count: 0, hazards: {}, severeCount: 0 };
    entry.count += 1;
    entry.hazards[e.hazard] = (entry.hazards[e.hazard] ?? 0) + 1;
    if (e.severity.level === "severe" || e.severity.level === "extreme") entry.severeCount += 1;
    map.set(cc, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

/** Daily activity buckets, oldest first, over the requested window. */
export function activitySeries(events: HazardEvent[], windowHours: number): ActivitySeriesPoint[] {
  const days = Math.max(1, Math.ceil(windowHours / 24));
  const buckets = new Map<string, ActivitySeriesPoint>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { date: key, total: 0, byHazard: {} });
  }
  for (const e of events) {
    const key = e.detectedAt.slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.total += 1;
    bucket.byHazard[e.hazard] = (bucket.byHazard[e.hazard] ?? 0) + 1;
  }
  return [...buckets.values()];
}

export function sourceBreakdown(events: HazardEvent[]): { id: string; name: string; count: number }[] {
  const map = new Map<string, { id: string; name: string; count: number }>();
  for (const e of events) {
    const entry = map.get(e.source.id) ?? { id: e.source.id, name: e.source.name, count: 0 };
    entry.count += 1;
    map.set(e.source.id, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}
