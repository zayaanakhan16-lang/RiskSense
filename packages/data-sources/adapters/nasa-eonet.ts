import { z } from "zod";
import {
  confidenceFromScore,
  severityFromScore,
  toIso,
  type EventGeometry,
  type HazardEvent,
  type HazardType,
} from "@risksense/shared";
import { fetchWithTimeout, statusFor, type AdapterResult, type FetchContext, type HazardAdapter } from "../types.ts";

/**
 * NASA EONET — Earth Observatory Natural Event Tracker (v3).
 * Docs: https://eonet.gsfc.nasa.gov/docs/v3
 * Public, no key. Events are curated from multiple agency feeds and carry a
 * source list, so RiskSense attributes each event back to its origin.
 */

const EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events";

const CATEGORY_MAP: Record<string, HazardType> = {
  wildfires: "wildfire",
  floods: "flood",
  earthquakes: "earthquake",
  severeStorms: "severe-weather",
  volcanoes: "volcano",
  drought: "drought",
  landslides: "landslide",
  manmade: "industrial",
  tempExtremes: "extreme-heat",
  dustHaze: "air-quality",
  snow: "severe-weather",
  seaLakeIce: "other",
  waterColor: "air-quality",
};

const GeometrySchema = z.object({
  magnitudeValue: z.number().nullable().optional(),
  magnitudeUnit: z.string().nullable().optional(),
  date: z.string(),
  type: z.string(),
  coordinates: z.union([z.array(z.number()), z.array(z.array(z.number()))]),
});

const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  link: z.string().optional(),
  closed: z.string().nullable().optional(),
  categories: z.array(z.object({ id: z.string(), title: z.string() })),
  sources: z.array(z.object({ id: z.string(), url: z.string() })).optional(),
  geometry: z.array(GeometrySchema),
});

const CollectionSchema = z.object({ events: z.array(EventSchema) });

function geometryFrom(
  type: string,
  coordinates: number[] | number[][],
): EventGeometry | undefined {
  if (type === "Point" && Array.isArray(coordinates[0])) {
    const [lon, lat] = coordinates[0] as number[];
    return { type: "Point", coordinates: [lon, lat] };
  }
  if (type === "Point") {
    const [lon, lat] = coordinates as number[];
    return { type: "Point", coordinates: [lon, lat] };
  }
  if (type === "Polygon") {
    return { type: "Polygon", coordinates: [coordinates as number[][]] };
  }
  return undefined;
}

export class NasaEonetAdapter implements HazardAdapter {
  readonly id = "nasa-eonet";
  readonly name = "NASA EONET";
  readonly url = "https://eonet.gsfc.nasa.gov/";
  readonly license = "NASA EONET is free and open, with attribution to source agencies";
  readonly hazards: HazardType[] = [
    "wildfire",
    "flood",
    "earthquake",
    "severe-weather",
    "volcano",
    "drought",
    "landslide",
    "industrial",
    "extreme-heat",
    "air-quality",
  ];
  readonly refreshMinutes = 60;
  readonly requiresKey = false;

  async fetch(ctx: FetchContext): Promise<AdapterResult> {
    const days = Math.max(1, Math.ceil(ctx.windowHours / 24));
    const params = new URLSearchParams({
      days: String(days),
      limit: "500",
    });
    try {
      const res = await fetchWithTimeout(`${EONET_URL}?${params}`, {
        timeoutMs: 15_000,
        signal: ctx.signal,
        headers: { "User-Agent": "RiskSense/0.1" },
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
      let newest = 0;

      for (const ev of parsed.data.events) {
        const category = ev.categories[0]?.id;
        const hazard = CATEGORY_MAP[category] ?? "other";
        const latest = ev.geometry[ev.geometry.length - 1];
        if (!latest) continue;
        const geom = geometryFrom(latest.type, latest.coordinates);
        if (!geom) continue;

        const detectedAt = toIso(latest.date);
        const time = new Date(detectedAt).getTime();
        if (time < cutoff) continue;
        if (time > newest) newest = time;

        const point: [number, number] =
          geom.type === "Point"
            ? geom.coordinates
            : geom.type === "Polygon"
              ? (geom.coordinates[0][0] as [number, number])
              : ([0, 0] as [number, number]);

        const magnitude = latest.magnitudeValue ?? undefined;
        // EONET magnitudes are heterogeneous (acres, NM^2, kt); we only use them
        // for relative ranking within the event, never as a physical claim.
        const score = magnitude
          ? Math.min(0.85, Math.log10(magnitude + 1) / 6)
          : 0.35;

        events.push({
          id: `${this.id}:${ev.id}`,
          hazard,
          title: ev.title,
          description: ev.description ?? undefined,
          lat: point[1],
          lon: point[0],
          detectedAt,
          updatedAt: detectedAt,
          ingestedAt: new Date().toISOString(),
          source: {
            id: this.id,
            name: this.name,
            url: this.url,
            recordUrl: ev.link,
            license: this.license,
          },
          severity: severityFromScore(
            score,
            magnitude
              ? `Reported magnitude ${magnitude} ${latest.magnitudeUnit ?? ""}`.trim()
              : "Curated natural event without published magnitude",
          ),
          confidence: confidenceFromScore(
            0.8,
            `Curated by NASA EONET from ${ev.sources?.map((s) => s.id).join(", ") || "agency feeds"}`,
          ),
          status: ev.closed ? "resolved" : "confirmed",
          geometry: geom,
          isDetection: false,
          issuingAuthority: ev.sources?.[0]?.id,
          raw: {
            category,
            sources: ev.sources,
            magnitudeValue: magnitude,
            magnitudeUnit: latest.magnitudeUnit,
            closed: ev.closed,
          },
        });
      }

      return {
        events,
        status: statusFor(this, "ok", {
          lastSuccessAt: newest ? toIso(newest) : new Date().toISOString(),
          eventCount: events.length,
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
