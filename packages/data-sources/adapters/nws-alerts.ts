import { z } from "zod";
import {
  confidenceFromScore,
  severityFromScore,
  toIso,
  type EventGeometry,
  type HazardEvent,
  type SeverityLevel,
} from "@risksense/shared";
import { fetchWithTimeout, statusFor, type AdapterResult, type FetchContext, type HazardAdapter } from "../types.ts";

/**
 * NOAA / National Weather Service — active alerts API.
 * Docs: https://www.weather.gov/documentation/services-web-api
 * Public, no key, but a descriptive User-Agent is required.
 *
 * NWS alerts are official products issued by a named authority. RiskSense
 * preserves the issuing office and the verbatim instruction text; it never
 * authors emergency guidance itself.
 */

const NWS_URL = "https://api.weather.gov/alerts/active";

const FeatureSchema = z.object({
  id: z.string(),
  geometry: z
    .union([
      z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(z.array(z.number()))) }),
      z.object({
        type: z.literal("MultiPolygon"),
        coordinates: z.array(z.array(z.array(z.array(z.number())))),
      }),
    ])
    .nullable(),
  properties: z.object({
    id: z.string().optional(),
    areaDesc: z.string().optional(),
    event: z.string(),
    severity: z.string().optional(),
    certainty: z.string().optional(),
    urgency: z.string().optional(),
    headline: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    instruction: z.string().nullable().optional(),
    senderName: z.string().nullable().optional(),
    effective: z.string().nullable().optional(),
    onset: z.string().nullable().optional(),
    expires: z.string().nullable().optional(),
    ends: z.string().nullable().optional(),
  }),
});

const CollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(FeatureSchema),
});

const SEVERITY_MAP: Record<string, number> = {
  Extreme: 0.95,
  Severe: 0.72,
  Moderate: 0.42,
  Minor: 0.2,
  Unknown: 0.3,
};

const LEVEL_FOR: Record<string, SeverityLevel> = {
  Extreme: "extreme",
  Severe: "severe",
  Moderate: "moderate",
  Minor: "minor",
};

/** Hazard families by NWS product family. */
function classify(event: string): HazardEvent["hazard"] {
  const e = event.toLowerCase();
  if (e.includes("flood")) return "flood";
  if (e.includes("tornado") || e.includes("thunderstorm") || e.includes("wind") || e.includes("winter") || e.includes("blizzard") || e.includes("snow") || e.includes("ice"))
    return "severe-weather";
  if (e.includes("hurricane") || e.includes("tropical") || e.includes("storm surge"))
    return "cyclone";
  if (e.includes("heat")) return "extreme-heat";
  if (e.includes("air quality") || e.includes("smoke") || e.includes("dust"))
    return "air-quality";
  if (e.includes("fire")) return "wildfire";
  return "severe-weather";
}

function centroidOf(geom: EventGeometry): [number, number] | undefined {
  if (geom.type === "Polygon") {
    const ring = geom.coordinates[0];
    const [lon, lat] = ring.reduce(
      (acc, [x, y]) => [acc[0] + x / ring.length, acc[1] + y / ring.length],
      [0, 0],
    );
    return [lon, lat];
  }
  if (geom.type === "MultiPolygon") {
    const ring = geom.coordinates[0][0];
    const [lon, lat] = ring.reduce(
      (acc, [x, y]) => [acc[0] + x / ring.length, acc[1] + y / ring.length],
      [0, 0],
    );
    return [lon, lat];
  }
  if (geom.type === "Point") return geom.coordinates;
  return undefined;
}

export class NwsAlertsAdapter implements HazardAdapter {
  readonly id = "nws-alerts";
  readonly name = "NOAA / National Weather Service";
  readonly url = "https://www.weather.gov/";
  readonly license = "Public domain (U.S. Government work)";
  readonly hazards = [
    "severe-weather",
    "flood",
    "cyclone",
    "extreme-heat",
    "air-quality",
    "wildfire",
  ] as const;
  readonly refreshMinutes = 10;
  readonly requiresKey = false;

  async fetch(ctx: FetchContext): Promise<AdapterResult> {
    const params = new URLSearchParams({
      status: "actual",
      message_type: "alert",
      urgency: "Immediate,Expected,Future",
    });
    try {
      const res = await fetchWithTimeout(`${NWS_URL}?${params}`, {
        timeoutMs: 15_000,
        signal: ctx.signal,
        headers: {
          "User-Agent": "(RiskSense/0.1, open-source emergency intelligence)",
          Accept: "application/geo+json",
        },
        cache: "no-store",
      });
      if (!res.ok) {
        return {
          events: [],
          status: statusFor(this, "degraded", {
            message: `Upstream returned HTTP ${res.status}`,
          }),
        };
      }
      const parsed = CollectionSchema.safeParse(await res.json());
      if (!parsed.success) {
        return {
          events: [],
          status: statusFor(this, "degraded", {
            message: "Response failed schema validation",
          }),
        };
      }

      const cutoff = Date.now() - ctx.windowHours * 3_600_000;
      const events: HazardEvent[] = [];
      let skippedNoGeometry = 0;
      let newest = 0;

      for (const f of parsed.data.features) {
        const p = f.properties;
        // Zone-based alerts without published geometry are skipped rather than
        // plotted at a guessed coordinate.
        if (!f.geometry) {
          skippedNoGeometry++;
          continue;
        }
        const geom: EventGeometry =
          f.geometry.type === "Polygon"
            ? { type: "Polygon", coordinates: f.geometry.coordinates }
            : { type: "MultiPolygon", coordinates: f.geometry.coordinates };
        const center = centroidOf(geom);
        if (!center) continue;

        const detectedAt = toIso(p.onset ?? p.effective ?? Date.now());
        const time = new Date(detectedAt).getTime();
        if (time < cutoff) continue;
        if (time > newest) newest = time;

        const nwsSeverity = p.severity ?? "Unknown";
        const certainty = (p.certainty ?? "Unknown").toLowerCase();
        const confidenceScore = certainty === "observed" ? 0.95 : certainty === "likely" ? 0.8 : 0.6;

        events.push({
          id: `${this.id}:${p.id ?? f.id}`,
          hazard: classify(p.event),
          title: p.event,
          description: p.headline ?? p.description?.slice(0, 400) ?? undefined,
          lat: center[1],
          lon: center[0],
          place: p.areaDesc,
          countryCode: "US",
          detectedAt,
          updatedAt: p.effective ? toIso(p.effective) : undefined,
          ingestedAt: new Date().toISOString(),
          source: {
            id: this.id,
            name: this.name,
            url: this.url,
            recordUrl: `https://api.weather.gov/alerts/${encodeURIComponent(p.id ?? "")}`,
            license: this.license,
          },
          severity: severityFromScore(
            SEVERITY_MAP[nwsSeverity] ?? 0.3,
            `NWS severity "${nwsSeverity}"`,
          ),
          confidence: confidenceFromScore(confidenceScore, `NWS certainty "${p.certainty ?? "unknown"}"`),
          status: "warning",
          geometry: geom,
          isDetection: false,
          issuingAuthority: p.senderName ?? this.name,
          officialGuidance: p.instruction ?? undefined,
          raw: {
            severity: nwsSeverity,
            certainty: p.certainty,
            urgency: p.urgency,
            expires: p.expires ?? p.ends,
            areaDesc: p.areaDesc,
            level: LEVEL_FOR[nwsSeverity] ?? "minor",
          },
        });
      }

      return {
        events,
        status: statusFor(this, "ok", {
          lastSuccessAt: newest ? toIso(newest) : new Date().toISOString(),
          eventCount: events.length,
          message:
            skippedNoGeometry > 0
              ? `${skippedNoGeometry} zone-based alerts without published geometry were not plotted`
              : undefined,
        }),
      };
    } catch (e) {
      return {
        events: [],
        status: statusFor(this, "unavailable", {
          message: e instanceof Error ? e.message : "Unknown fetch error",
        }),
      };
    }
  }
}
