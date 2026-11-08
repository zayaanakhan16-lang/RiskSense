import { NextResponse } from "next/server";
import { ADAPTERS } from "@risksense/data-sources";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * GET /api/sources
 *
 * The data-source directory: every adapter RiskSense ships, the hazard families
 * it contributes, its documented refresh cadence, and its license terms. This
 * is the machine-readable half of the human-facing data-sources documentation.
 */
export async function GET() {
  const sources = ADAPTERS.map((a) => ({
    id: a.id,
    name: a.name,
    url: a.url,
    license: a.license,
    hazards: a.hazards,
    expectedRefreshMinutes: a.refreshMinutes,
    requiresKey: a.requiresKey,
    configured: a.requiresKey ? Boolean(process.env.FIRMS_MAP_KEY) : true,
  }));

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      count: sources.length,
      sources,
      note:
        "RiskSense presents source data as published. Licenses and access terms " +
        "remain with the originating agency; attribution is required.",
    },
    {
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=86400",
        "access-control-allow-origin": "*",
      },
    },
  );
}
