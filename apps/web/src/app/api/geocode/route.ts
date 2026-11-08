import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/geocode?q=Tokyo            forward geocoding (city/region/country)
 * GET /api/geocode?lat=..&lon=..      reverse geocoding (point -> place)
 *
 * Uses Open-Meteo's geocoding service (forward) and OpenStreetMap Nominatim
 * (reverse). Both are public. Responses are cached and requests are attributed
 * with a descriptive User-Agent as both services require.
 */

const UA = "RiskSense/0.1 (open-source emergency intelligence; +https://github.com/)";

interface GeoResult {
  name: string;
  admin?: string;
  country?: string;
  countryCode?: string;
  lat: number;
  lon: number;
  population?: number;
  kind?: string;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const headers = {
    "cache-control": "public, max-age=600, s-maxage=86400",
    "access-control-allow-origin": "*",
  };

  const lat = sp.get("lat");
  const lon = sp.get("lon");
  if (lat && lon) {
    const latN = Number.parseFloat(lat);
    const lonN = Number.parseFloat(lon);
    if (!Number.isFinite(latN) || !Number.isFinite(lonN)) {
      return NextResponse.json({ error: "INVALID_COORDINATES" }, { status: 400, headers });
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latN}&lon=${lonN}&zoom=10&addressdetails=1`,
        { headers: { "User-Agent": UA, Accept: "application/json" }, cache: "no-store" },
      );
      if (!res.ok) return NextResponse.json({ error: "GEOCODER_UNAVAILABLE" }, { status: 502, headers });
      const data = (await res.json()) as {
        address?: Record<string, string>;
        display_name?: string;
      };
      const a = data.address ?? {};
      return NextResponse.json(
        {
          name: a.city ?? a.town ?? a.village ?? a.county ?? a.state ?? a.country ?? "Unknown",
          admin: a.state ?? a.county,
          country: a.country,
          countryCode: a.country_code?.toUpperCase(),
          displayName: data.display_name,
          lat: latN,
          lon: lonN,
        },
        { headers },
      );
    } catch {
      return NextResponse.json({ error: "GEOCODER_UNAVAILABLE" }, { status: 502, headers });
    }
  }

  const q = sp.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "MISSING_QUERY" }, { status: 400, headers });
  }

  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`,
      { headers: { "User-Agent": UA }, cache: "no-store" },
    );
    if (!res.ok) return NextResponse.json({ error: "GEOCODER_UNAVAILABLE" }, { status: 502, headers });
    const data = (await res.json()) as {
      results?: Array<{
        name: string;
        admin1?: string;
        country?: string;
        country_code?: string;
        latitude: number;
        longitude: number;
        population?: number;
        feature_code?: string;
      }>;
    };
    const results: GeoResult[] = (data.results ?? []).map((r) => ({
      name: r.name,
      admin: r.admin1,
      country: r.country,
      countryCode: r.country_code?.toUpperCase(),
      lat: r.latitude,
      lon: r.longitude,
      population: r.population,
      kind: r.feature_code,
    }));
    return NextResponse.json({ query: q, count: results.length, results }, { headers });
  } catch {
    return NextResponse.json({ error: "GEOCODER_UNAVAILABLE" }, { status: 502, headers });
  }
}
