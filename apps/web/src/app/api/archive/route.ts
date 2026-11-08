import { NextRequest, NextResponse } from "next/server";
import { UsgsEarthquakeAdapter } from "@risksense/data-sources";
import type { HazardEvent } from "@risksense/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/archive?from=2026-09-01&to=2026-09-30&minMagnitude=4.5
 *
 * Historical event archive. USGS serves genuine date-ranged queries, so the
 * archive is a live query against the source rather than a stored copy.
 * Ranges are capped at 90 days to keep upstream queries reasonable.
 */

const MAX_RANGE_DAYS = 90;
const adapter = new UsgsEarthquakeAdapter();

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const to = sp.get("to") ? new Date(sp.get("to")!) : new Date();
  const from = sp.get("from")
    ? new Date(sp.get("from")!)
    : new Date(to.getTime() - 30 * 86_400_000);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "INVALID_DATE_RANGE" }, { status: 400 });
  }
  if (from > to) {
    return NextResponse.json({ error: "FROM_AFTER_TO" }, { status: 400 });
  }
  const days = (to.getTime() - from.getTime()) / 86_400_000;
  if (days > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: "RANGE_TOO_LARGE", maxDays: MAX_RANGE_DAYS },
      { status: 400 },
    );
  }

  const minMagnitude = Number.parseFloat(sp.get("minMagnitude") ?? "4.5") || 4.5;

  const result = await adapter.fetchRange({
    from: from.toISOString(),
    to: to.toISOString(),
    minMagnitude,
  });

  return NextResponse.json(
    {
      from: from.toISOString(),
      to: to.toISOString(),
      minMagnitude,
      count: result.events.length,
      status: result.status,
      source: {
        id: adapter.id,
        name: adapter.name,
        url: adapter.url,
        license: adapter.license,
      },
      events: result.events.map(slim),
      note:
        "The archive is a live query against the source, not a stored RiskSense dataset. " +
        "Availability therefore depends on the source retaining historical records.",
    },
    {
      headers: {
        "cache-control": "public, max-age=600, s-maxage=3600",
        "access-control-allow-origin": "*",
      },
    },
  );
}

function slim(e: HazardEvent) {
  return {
    id: e.id,
    hazard: e.hazard,
    title: e.title,
    place: e.place,
    lat: e.lat,
    lon: e.lon,
    detectedAt: e.detectedAt,
    severity: e.severity,
    confidence: e.confidence,
    status: e.status,
    depthKm: e.depthKm,
    measurement: e.measurement,
    source: { id: e.source.id, name: e.source.name, recordUrl: e.source.recordUrl },
  };
}
