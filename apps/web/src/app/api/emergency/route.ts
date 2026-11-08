import { NextRequest, NextResponse } from "next/server";
import {
  EMERGENCY_DIRECTORY,
  EMERGENCY_LAST_REVIEWED,
  UNVERIFIED_MESSAGE,
  emergencyFor,
} from "@risksense/shared";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * GET /api/emergency?country=FR
 *
 * Country-specific emergency numbers. RiskSense never assumes a universal
 * emergency number and never places a call on the user's behalf — this endpoint
 * only reports verified directory entries, and says so plainly when a country
 * is not in the directory.
 */
export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get("country");
  const headers = {
    "cache-control": "public, max-age=3600, s-maxage=86400",
    "access-control-allow-origin": "*",
  };

  if (country) {
    const entry = emergencyFor(country);
    if (!entry) {
      return NextResponse.json(
        {
          country: country.toUpperCase(),
          verified: false,
          message: UNVERIFIED_MESSAGE,
          lastReviewed: EMERGENCY_LAST_REVIEWED,
        },
        { headers },
      );
    }
    return NextResponse.json(
      { ...entry, lastReviewed: EMERGENCY_LAST_REVIEWED },
      { headers },
    );
  }

  return NextResponse.json(
    {
      count: EMERGENCY_DIRECTORY.length,
      lastReviewed: EMERGENCY_LAST_REVIEWED,
      disclaimer:
        "Emergency numbers vary by country and can change. Always confirm with " +
        "your local authority. RiskSense does not dispatch emergency services.",
      entries: EMERGENCY_DIRECTORY,
    },
    { headers },
  );
}
