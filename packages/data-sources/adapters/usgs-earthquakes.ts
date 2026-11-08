import { z } from "zod";
import {
  confidenceFromScore,
  severityFromScore,
  toIso,
  type HazardEvent,
} from "@risksense/shared";
import { fetchWithTimeout, statusFor, type AdapterResult, type FetchContext, type HazardAdapter } from "../types.ts";

/**
 * USGS Earthquake Hazards Program — FDSN event web service.
 * Docs: https://earthquake.usgs.gov/fdsnws/event/1/
 * Public, no key. Feeds refresh every minute; records are revised as reviews
 * complete, so `updated` moves independently of `time`.
 */

const USGS_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query";

const FeatureSchema = z.object({
  id: z.string(),
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.array(z.number()).min(3),
  }),
  properties: z.object({
    mag: z.number().nullable().optional(),
    place: z.string().nullable().optional(),
    time: z.number(),
    updated: z.number().nullable().optional(),
    url: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    alert: z.string().nullable().optional(),
    tsunami: z.number().nullable().optional(),
    sig: z.number().nullable().optional(),
    felt: z.number().nullable().optional(),
    mmi: z.number().nullable().optional(),
    status: z.string().nullable().optional(),
  }),
});

const CollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  metadata: z
    .object({ generated: z.number().optional(), count: z.number().optional() })
    .optional(),
  features: z.array(FeatureSchema),
});

/** Magnitude to 0..1 severity. M 2 is barely felt; M 7.5+ is catastrophic. */
function magnitudeSeverity(mag: number): number {
  if (mag < 2) return 0.08;
  if (mag >= 7.5) return 1;
  const anchors: [number, number][] = [
    [2, 0.08],
    [3.5, 0.25],
    [4.5, 0.4],
    [5.5, 0.58],
    [6.5, 0.78],
    [7.5, 1],
  ];
  for (let i = 1; i < anchors.length; i++) {
    const [m0, s0] = anchors[i - 1];
    const [m1, s1] = anchors[i];
    if (mag <= m1) return s0 + ((mag - m0) / (m1 - m0)) * (s1 - s0);
  }
  return 1;
}

/** USGS "place" strings sometimes end with a two-letter US state code. */
function countryFromPlace(place: string | null | undefined): string | undefined {
  if (!place) return undefined;
  const parts = place.split(",").map((p) => p.trim());
  const tail = parts[parts.length - 1];
  if (tail && tail.length === 2 && /^[A-Z]{2}$/.test(tail)) return "US";
  return undefined;
}

export class UsgsEarthquakeAdapter implements HazardAdapter {
  readonly id = "usgs-earthquakes";
  readonly name = "USGS Earthquake Hazards Program";
  readonly url = "https://earthquake.usgs.gov/";
  readonly license = "Public domain (U.S. Government work)";
  readonly hazards = ["earthquake"] as const;
  readonly refreshMinutes = 5;
  readonly requiresKey = false;

  async fetch(ctx: FetchContext): Promise<AdapterResult> {
    const start = new Date(Date.now() - ctx.windowHours * 3_600_000);
    const params = new URLSearchParams({
      format: "geojson",
      starttime: start.toISOString(),
      orderby: "time",
      minmagnitude: "1.5",
      limit: "2000",
    });
    try {
      const res = await fetchWithTimeout(`${USGS_URL}?${params}`, {
        timeoutMs: 12_000,
        signal: ctx.signal,
        headers: { "User-Agent": "RiskSense/0.1 (open-source emergency intelligence)" },
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

      const events = parsed.data.features.flatMap((f) => {
        const event = this.toEvent(f);
        return event ? [event] : [];
      });

      return {
        events,
        status: statusFor(this, "ok", {
          lastSuccessAt: new Date().toISOString(),
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

  /**
   * Historical query. USGS genuinely serves arbitrary date ranges, so the
   * archive is a live query rather than a stored copy of the feed.
   */
  async fetchRange(options: {
    from: string;
    to: string;
    minMagnitude: number;
    limit?: number;
  }): Promise<AdapterResult> {
    const params = new URLSearchParams({
      format: "geojson",
      starttime: options.from,
      endtime: options.to,
      orderby: "time",
      minmagnitude: String(options.minMagnitude),
      limit: String(options.limit ?? 1000),
    });
    try {
      const res = await fetchWithTimeout(`${USGS_URL}?${params}`, {
        timeoutMs: 20_000,
        headers: { "User-Agent": "RiskSense/0.1 (open-source emergency intelligence)" },
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
      const events = parsed.data.features.flatMap((f) => {
        const event = this.toEvent(f);
        return event ? [event] : [];
      });
      return {
        events,
        status: statusFor(this, "ok", {
          lastSuccessAt: new Date().toISOString(),
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

  private toEvent(f: z.infer<typeof FeatureSchema>): HazardEvent | null {
    const p = f.properties;
    const [lon, lat, depth] = f.geometry.coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const mag = p.mag ?? 0;
    const reviewed = p.status === "reviewed";
    return {
      id: `${this.id}:${f.id}`,
      hazard: "earthquake",
      title: mag ? `M ${mag.toFixed(1)} earthquake` : "Earthquake",
      description: p.place ?? undefined,
      lat,
      lon,
      place: p.place ?? undefined,
      countryCode: countryFromPlace(p.place),
      detectedAt: toIso(p.time),
      updatedAt: p.updated ? toIso(p.updated) : undefined,
      ingestedAt: new Date().toISOString(),
      source: {
        id: this.id,
        name: this.name,
        url: this.url,
        recordUrl: p.url ?? undefined,
        license: this.license,
      },
      severity: severityFromScore(magnitudeSeverity(mag), `Magnitude ${mag.toFixed(1)}`),
      confidence: confidenceFromScore(
        reviewed ? 0.95 : 0.7,
        reviewed ? "Reviewed by a seismic analyst" : "Automatic solution, pending review",
      ),
      status: reviewed ? "confirmed" : "detected",
      geometry: { type: "Point", coordinates: [lon, lat] },
      measurement: { label: "Magnitude", value: mag, unit: "M" },
      depthKm: Number.isFinite(depth) ? depth : undefined,
      isDetection: false,
      issuingAuthority: this.name,
      raw: {
        type: p.type,
        alert: p.alert,
        tsunami: p.tsunami,
        significance: p.sig,
        felt: p.felt,
        mmi: p.mmi,
        reviewStatus: p.status,
      },
    };
  }
}
