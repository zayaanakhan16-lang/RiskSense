import { NextRequest, NextResponse } from "next/server";
import { aggregateEvents, activitySeries, countryStats, hazardStats, sourceBreakdown } from "@risksense/hazard-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stats?window=72
 *
 * Observatory statistics computed only from the events that were actually
 * retrieved in this window. When the sample is small the response says so
 * rather than extrapolating.
 */
export async function GET(req: NextRequest) {
  const windowParam = Number.parseInt(req.nextUrl.searchParams.get("window") ?? "72", 10);
  const windowHours = [6, 24, 72, 168].includes(windowParam) ? windowParam : 72;

  const data = await aggregateEvents({
    windowHours,
    firmsMapKey: process.env.FIRMS_MAP_KEY,
  });

  const byHazard = hazardStats(data.events);
  const byCountry = countryStats(data.events, 30);
  const series = activitySeries(data.events, windowHours);
  const bySource = sourceBreakdown(data.events);

  return NextResponse.json(
    {
      generatedAt: data.generatedAt,
      windowHours,
      totalEvents: data.events.length,
      byHazard,
      byCountry,
      series,
      bySource,
      sources: data.sources,
      warnings: data.warnings,
      limitations: [
        "Counts reflect only events currently published by the listed sources.",
        "Satellite fire detections are thermal anomalies, not confirmed wildfires.",
        "Coverage varies by region: some national services publish more than others.",
        windowHours < 168
          ? "Long-running disasters (droughts, ongoing floods) may fall outside short windows."
          : "Drought events may span months and are counted by their latest update.",
      ],
    },
    {
      headers: {
        "cache-control": "public, max-age=120, s-maxage=300, stale-while-revalidate=900",
        "access-control-allow-origin": "*",
      },
    },
  );
}
