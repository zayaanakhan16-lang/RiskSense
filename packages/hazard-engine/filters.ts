import {
  severityRank,
  type EventStatus,
  type HazardEvent,
  type HazardType,
  type SeverityLevel,
} from "@risksense/shared";
import { isUrgent } from "@risksense/shared";

export type TimeWindow = 6 | 24 | 72 | 168;

export interface EventFilter {
  hazards: HazardType[];
  /** Empty means "all statuses". */
  statuses: EventStatus[];
  /** Empty means "all severities". */
  severities: SeverityLevel[];
  /** Empty means "all sources" (by SourceRef.id). */
  sourceIds: string[];
  windowHours: TimeWindow;
  urgentOnly: boolean;
  query?: string;
  now?: number;
}

export function defaultFilter(windowHours: TimeWindow = 24): EventFilter {
  return {
    hazards: [],
    statuses: [],
    severities: [],
    sourceIds: [],
    windowHours,
    urgentOnly: false,
  };
}

export function applyFilter(events: HazardEvent[], filter: EventFilter): HazardEvent[] {
  const now = filter.now ?? Date.now();
  const cutoff = now - filter.windowHours * 3_600_000;
  const q = filter.query?.trim().toLowerCase();

  return events.filter((e) => {
    if (new Date(e.detectedAt).getTime() < cutoff) return false;
    if (filter.hazards.length > 0 && !filter.hazards.includes(e.hazard)) return false;
    if (filter.statuses.length > 0 && !filter.statuses.includes(e.status)) return false;
    if (filter.severities.length > 0 && !filter.severities.includes(e.severity.level)) return false;
    if (filter.sourceIds.length > 0 && !filter.sourceIds.includes(e.source.id)) return false;
    if (filter.urgentOnly && !isUrgent(e.severity, e.detectedAt, now, filter.windowHours)) return false;
    if (q) {
      const haystack = `${e.title} ${e.place ?? ""} ${e.description ?? ""} ${e.countryCode ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function sortBySeverityThenTime(a: HazardEvent, b: HazardEvent): number {
  const bySeverity = severityRank(b.severity.level) - severityRank(a.severity.level);
  if (bySeverity !== 0) return bySeverity;
  return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
}
