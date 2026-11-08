import {
  haversineKm,
  severityRank,
  type HazardEvent,
  type HazardType,
  type SeverityLevel,
} from "@risksense/shared";

export interface AlertArea {
  id: string;
  label: string;
  lat: number;
  lon: number;
  /** Monitoring radius in kilometres. */
  radiusKm: number;
}

export interface AlertRule {
  areas: AlertArea[];
  hazards: HazardType[];
  /** Minimum severity that triggers a match. */
  minSeverity: SeverityLevel;
  enabled: boolean;
}

export interface AlertMatch {
  rule: AlertRule;
  area: AlertArea;
  event: HazardEvent;
  distanceKm: number;
  /** Plain-language explanation of why the user received this alert. */
  reason: string;
}

/**
 * Matches real, already-fetched events against a user's configured rules.
 * It never fabricates an alert and never claims an area is safe when nothing
 * matches.
 */
export function matchAlerts(
  events: HazardEvent[],
  rules: AlertRule[],
  now: number = Date.now(),
): AlertMatch[] {
  const matches: AlertMatch[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    for (const area of rule.areas) {
      for (const event of events) {
        if (rule.hazards.length > 0 && !rule.hazards.includes(event.hazard)) continue;
        if (severityRank(event.severity.level) < severityRank(rule.minSeverity)) continue;
        const distanceKm = haversineKm(area.lat, area.lon, event.lat, event.lon);
        if (distanceKm > area.radiusKm) continue;
        const ageHours = (now - new Date(event.detectedAt).getTime()) / 3_600_000;
        matches.push({
          rule,
          area,
          event,
          distanceKm,
          reason:
            `${event.severity.level} ${event.hazard.replace("-", " ")} event ` +
            `${Math.round(distanceKm)} km from ${area.label}, detected ${Math.round(ageHours)} h ago, ` +
            `reported by ${event.source.name}.`,
        });
      }
    }
  }
  // De-duplicate the same event matched by multiple areas.
  const seen = new Set<string>();
  return matches
    .sort((a, b) => {
      const bySeverity = severityRank(b.event.severity.level) - severityRank(a.event.severity.level);
      if (bySeverity !== 0) return bySeverity;
      return a.distanceKm - b.distanceKm;
    })
    .filter((m) => {
      const key = `${m.event.id}:${m.area.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Areas are "quiet" — not "safe". Wording matters for a public-safety tool. */
export function quietSummary(matchCount: number, areaCount: number): string {
  if (matchCount > 0) {
    return `${matchCount} event${matchCount === 1 ? "" : "s"} matched your monitored areas.`;
  }
  if (areaCount === 0) return "No monitored areas configured yet.";
  return (
    "No matching events are currently reported for your monitored areas. " +
    "This does not mean conditions are safe — RiskSense only shows what its data sources report."
  );
}
