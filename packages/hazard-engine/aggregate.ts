import {
  severityRank,
  type EventsResponse,
  type HazardEvent,
  type SourceStatus,
} from "@risksense/shared";
import { ADAPTERS, type FetchContext } from "@risksense/data-sources";

export interface AggregateOptions {
  windowHours: number;
  firmsMapKey?: string;
  /** Per-source hard deadline; a slow source must not stall the response. */
  sourceTimeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 16_000;

/**
 * Fetches every registered adapter in parallel, normalises the results and
 * returns a single envelope. A failing source degrades gracefully: its events
 * are omitted, its status is reported, and the rest of the platform still
 * works.
 */
export async function aggregateEvents(
  options: AggregateOptions,
): Promise<EventsResponse> {
  const { windowHours, firmsMapKey, sourceTimeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const warnings: string[] = [];

  const results = await Promise.all(
    ADAPTERS.map(async (adapter) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), sourceTimeoutMs);
      const ctx: FetchContext = {
        windowHours,
        signal: controller.signal,
        keys: { firmsMapKey },
      };
      try {
        const result = await adapter.fetch(ctx);
        if (result.status.state !== "ok") {
          warnings.push(`${adapter.id}: ${result.status.message ?? result.status.state}`);
        }
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : "unknown error";
        warnings.push(`${adapter.id}: ${message}`);
        return {
          events: [] as HazardEvent[],
          status: {
            id: adapter.id,
            name: adapter.name,
            url: adapter.url,
            license: adapter.license,
            hazards: adapter.hazards,
            expectedRefreshMinutes: adapter.refreshMinutes,
            state: "unavailable" as const,
            requiresKey: adapter.requiresKey,
            message,
          } satisfies SourceStatus,
        };
      } finally {
        clearTimeout(timer);
      }
    }),
  );

  const events = results.flatMap((r) => r.events);
  const sources = results.map((r) => r.status);

  return {
    generatedAt: new Date().toISOString(),
    windowHours,
    total: events.length,
    events: dedupe(events),
    sources,
    warnings,
  };
}

/**
 * Removes cross-source duplicates. EONET curates many of the same events GDACS
 * and USGS publish, so we keep the record from the source that owns the data
 * (official / primary) and drop the curated echo.
 */
const SOURCE_PRIORITY: Record<string, number> = {
  "usgs-earthquakes": 100,
  "nws-alerts": 95,
  "nasa-firms": 90,
  gdacs: 80,
  "nasa-eonet": 40,
};

export function dedupe(events: HazardEvent[]): HazardEvent[] {
  const kept: HazardEvent[] = [];
  const index = new Map<string, number>();

  for (const event of events) {
    const key = dedupeKey(event);
    const existingIdx = index.get(key);
    if (existingIdx === undefined) {
      index.set(key, kept.length);
      kept.push(event);
      continue;
    }
    const existing = kept[existingIdx];
    if (priority(event) > priority(existing)) kept[existingIdx] = event;
  }

  return kept;
}

function priority(event: HazardEvent): number {
  return SOURCE_PRIORITY[event.source.id] ?? 50;
}

/** Same hazard within ~25 km and a day of each other is treated as one event. */
function dedupeKey(event: HazardEvent): string {
  const day = event.detectedAt.slice(0, 10);
  const lat = Math.round(event.lat / 0.25) * 0.25;
  const lon = Math.round(event.lon / 0.25) * 0.25;
  return `${event.hazard}:${lat.toFixed(2)}:${lon.toFixed(2)}:${day}`;
}

/** Sort: most severe first, then most recent. Used as the feed's default order. */
export function sortEvents(events: HazardEvent[]): HazardEvent[] {
  return [...events].sort((a, b) => {
    const bySeverity = severityRank(b.severity.level) - severityRank(a.severity.level);
    if (bySeverity !== 0) return bySeverity;
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
  });
}
