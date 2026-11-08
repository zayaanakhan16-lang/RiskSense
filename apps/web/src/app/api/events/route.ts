import { NextRequest, NextResponse } from "next/server";
import { aggregateEvents } from "@risksense/hazard-engine";
import type { EventsResponse, HazardEvent } from "@risksense/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/events
 *
 * Aggregates every registered hazard source into the normalized RiskSense
 * event model. Read-only and public — no credentials are ever required to
 * consume this endpoint.
 *
 * Query params
 *   window      hours of history to include (6 | 24 | 72 | 168). Default 24.
 *   hazard      comma-separated hazard families to include.
 *   minSeverity minor | moderate | severe | extreme
 *   source      comma-separated source ids
 *   limit       max events returned (default 2000, max 5000)
 */

const VALID_WINDOWS = [6, 24, 72, 168];
const SEVERITY_ORDER = ["minor", "moderate", "severe", "extreme"];
const SEVERITY_RANK: Record<string, number> = {
  minor: 0,
  moderate: 1,
  severe: 2,
  extreme: 3,
};

/**
 * Share of the result budget any single source may occupy. Without this a
 * single prolific feed (wildfire detections number in the thousands) would
 * crowd every other hazard out of the map and the feed. The cap is a floor on
 * diversity, not a filter: unused slots are handed to the remaining sources.
 */
const PER_SOURCE_SHARE = 0.4;

// In-process cache: several visitors hit the same upstream within seconds.
const CACHE_TTL_MS = 3 * 60 * 1000;
const cache = new Map<number, { at: number; payload: EventsResponse }>();

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const windowParam = Number.parseInt(sp.get("window") ?? "24", 10);
  const windowHours = VALID_WINDOWS.includes(windowParam) ? windowParam : 24;
  const limit = Math.min(
    5000,
    Math.max(1, Number.parseInt(sp.get("limit") ?? "2000", 10) || 2000),
  );

  const hit = cache.get(windowHours);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return json(applyQuery(hit.payload, sp, limit), { "x-cache": "hit" });
  }

  const data = await aggregateEvents({
    windowHours,
    firmsMapKey: process.env.FIRMS_MAP_KEY,
  });
  cache.set(windowHours, { at: Date.now(), payload: data });

  return json(applyQuery(data, sp, limit), { "x-cache": "miss" });
}

function applyQuery(data: EventsResponse, sp: URLSearchParams, limit: number): EventsResponse {
  let events: HazardEvent[] = [...data.events];

  const hazards = sp.get("hazard")?.split(",").filter(Boolean);
  if (hazards?.length) events = events.filter((e) => hazards.includes(e.hazard));

  const sources = sp.get("source")?.split(",").filter(Boolean);
  if (sources?.length) events = events.filter((e) => sources.includes(e.source.id));

  const statuses = sp.get("status")?.split(",").filter(Boolean);
  if (statuses?.length) events = events.filter((e) => statuses.includes(e.status));

  const minSeverity = sp.get("minSeverity");
  if (minSeverity && SEVERITY_ORDER.includes(minSeverity)) {
    const min = SEVERITY_ORDER.indexOf(minSeverity);
    events = events.filter((e) => SEVERITY_RANK[e.severity.level] >= min);
  }

  const q = sp.get("q")?.trim().toLowerCase();
  if (q) {
    events = events.filter((e) =>
      `${e.title} ${e.place ?? ""} ${e.description ?? ""}`.toLowerCase().includes(q),
    );
  }

  // Most severe first, then most recent, so the feed's head is what matters.
  events.sort((a, b) => {
    const bySeverity = SEVERITY_RANK[b.severity.level] - SEVERITY_RANK[a.severity.level];
    if (bySeverity !== 0) return bySeverity;
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
  });

  const total = events.length;
  return { ...data, events: balance(events, limit), total };
}

/**
 * Selects up to `limit` events while guaranteeing that no single source
 * dominates the result. Each source gets `limit * PER_SOURCE_SHARE` slots in
 * the first pass; whatever is left is then filled from the remaining events in
 * severity order. This keeps a global picture global.
 */
function balance(events: HazardEvent[], limit: number): HazardEvent[] {
  if (events.length <= limit) return events;

  const perSourceCap = Math.max(1, Math.floor(limit * PER_SOURCE_SHARE));
  const used = new Map<string, number>();
  const picked: HazardEvent[] = [];
  const deferred: HazardEvent[] = [];

  for (const event of events) {
    const count = used.get(event.source.id) ?? 0;
    if (count < perSourceCap) {
      used.set(event.source.id, count + 1);
      picked.push(event);
    } else {
      deferred.push(event);
    }
  }

  for (const event of deferred) {
    if (picked.length >= limit) break;
    picked.push(event);
  }

  // Restore severity-then-recency ordering after the two-pass selection.
  picked.sort((a, b) => {
    const bySeverity = SEVERITY_RANK[b.severity.level] - SEVERITY_RANK[a.severity.level];
    if (bySeverity !== 0) return bySeverity;
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
  });

  return picked.slice(0, limit);
}

function json(body: unknown, headers: Record<string, string> = {}) {
  return NextResponse.json(body, {
    headers: {
      "cache-control": "public, max-age=120, s-maxage=180, stale-while-revalidate=600",
      "access-control-allow-origin": "*",
      ...headers,
    },
  });
}
