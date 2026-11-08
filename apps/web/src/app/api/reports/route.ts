import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { coarsen, insertReport, listReports } from "@/lib/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Community reports.
 *
 * GET  /api/reports   – recent unverified citizen reports.
 * POST /api/reports   – submit a report.
 *
 * Reports are rate limited, coarsened to ~1 km, stored as "pending", and can
 * never trigger an automatic dispatch. Only reports a moderator has explicitly
 * verified are eligible to be surfaced as corroborated context.
 */

const ReportSchema = z.object({
  category: z.enum([
    "fire-observed",
    "flooding-observed",
    "road-blocked",
    "severe-damage",
    "resource-needed",
    "other",
  ]),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  description: z.string().min(10).max(1200),
  place: z.string().max(200).optional(),
  countryCode: z.string().length(2).optional(),
  photoUrl: z.string().url().max(500).optional(),
  // Honeypot: bots fill it, humans never see it.
  website: z.string().max(0).optional(),
});

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const buckets = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  return false;
}

export async function GET(req: NextRequest) {
  const limit = Math.min(
    200,
    Number.parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10) || 100,
  );
  const reports = await listReports(limit);
  return NextResponse.json(
    {
      count: reports.length,
      disclaimer:
        "Community reports are unverified citizen submissions. They are never " +
        "official warnings and never trigger emergency dispatch.",
      // `reporterToken` is stripped: it is an anonymous handle, but publishing it
      // would still let anyone link every report from one submitter together.
      reports: reports.map(({ reporterToken, ...rest }) => {
        void reporterToken;
        return rest;
      }),
    },
    { headers: { "cache-control": "no-store", "access-control-allow-origin": "*" } },
  );
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many reports. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = ReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_FAILED", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.website) {
    return NextResponse.json({ accepted: true, status: "pending" }, { status: 202 });
  }

  const report = await insertReport({
    category: data.category,
    lat: coarsen(data.lat),
    lon: coarsen(data.lon),
    place: data.place,
    countryCode: data.countryCode?.toUpperCase(),
    description: data.description,
    photoUrl: data.photoUrl,
    reporterToken: crypto.randomUUID(),
  });

  return NextResponse.json(
    {
      accepted: true,
      report,
      message:
        "Report received and marked unverified. It will be reviewed before it " +
        "appears as corroborated context. For an emergency, contact your local " +
        "emergency service directly.",
    },
    { status: 201 },
  );
}
