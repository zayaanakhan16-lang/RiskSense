import { z } from "zod";
import {
  confidenceFromScore,
  severityFromScore,
  toIso,
  type HazardEvent,
  type HazardType,
  type SeverityLevel,
} from "@risksense/shared";
import { fetchWithTimeout, statusFor, type AdapterResult, type FetchContext, type HazardAdapter } from "../types.ts";

/**
 * GDACS — Global Disaster Alert and Coordination System (EC JRC + UN OCHA).
 * Docs: https://www.gdacs.org/gdacsapi/
 * Public, no key. Alert levels (Green/Orange/Red) are assigned by GDACS itself.
 */

const GDACS_SEARCH = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH";

/** GDACS event type codes to RiskSense hazard families. */
const TYPE_MAP: Record<string, HazardType> = {
  EQ: "earthquake",
  TC: "cyclone",
  FL: "flood",
  VO: "volcano",
  WF: "wildfire",
  DR: "drought",
};

const EVENT_TYPES = Object.keys(TYPE_MAP);

const FeatureSchema = z.object({
  geometry: z.object({
    type: z.string(),
    coordinates: z.array(z.number()).min(2),
  }),
  properties: z.object({
    eventtype: z.string(),
    eventid: z.number(),
    episodeid: z.number().optional(),
    eventname: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    htmldescription: z.string().optional(),
    alertlevel: z.string().optional(),
    alertscore: z.number().optional(),
    country: z.string().optional(),
    fromdate: z.string().optional(),
    todate: z.string().optional(),
    datemodified: z.string().optional(),
    iso3: z.string().optional(),
    source: z.string().optional(),
    url: z
      .object({ report: z.string().optional(), details: z.string().optional() })
      .optional(),
    affectedcountries: z
      .array(z.object({ iso2: z.string().optional(), countryname: z.string().optional() }))
      .optional(),
    severitydata: z
      .object({
        severity: z.number().optional(),
        severitytext: z.string().optional(),
        severityunit: z.string().optional(),
      })
      .optional(),
  }),
});

const CollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(FeatureSchema),
});

const ALERT_LEVELS: Record<string, { level: SeverityLevel; score: number }> = {
  Green: { level: "minor", score: 0.22 },
  Orange: { level: "severe", score: 0.62 },
  Red: { level: "extreme", score: 0.95 },
};

function statusFromLevel(level: SeverityLevel): HazardEvent["status"] {
  return level === "extreme" || level === "severe" ? "warning" : "confirmed";
}

export class GdacsAdapter implements HazardAdapter {
  readonly id = "gdacs";
  readonly name = "GDACS (EC JRC / UN OCHA)";
  readonly url = "https://www.gdacs.org/";
  readonly license = "GDACS data is published for public use with attribution";
  readonly hazards: HazardType[] = Object.values(TYPE_MAP);
  readonly refreshMinutes = 30;
  readonly requiresKey = false;

  async fetch(ctx: FetchContext): Promise<AdapterResult> {
    // GDACS filters on the event's active window, so widen the requested range
    // to catch long-running episodes (droughts last months).
    const from = new Date(Date.now() - Math.max(ctx.windowHours, 168) * 3_600_000);
    const params = new URLSearchParams({
      eventlist: EVENT_TYPES.join(","),
      fromDate: from.toISOString().slice(0, 10),
      toDate: new Date().toISOString().slice(0, 10),
    });

    try {
      const res = await fetchWithTimeout(`${GDACS_SEARCH}?${params}`, {
        timeoutMs: 15_000,
        signal: ctx.signal,
        headers: { "User-Agent": "RiskSense/0.1", Accept: "application/json" },
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
      for (const f of parsed.data.features) {
        const p = f.properties;
        const hazard = TYPE_MAP[p.eventtype];
        if (!hazard) continue;
        const [lon, lat] = f.geometry.coordinates;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

        const detectedAt = toIso(p.fromdate ?? p.datemodified ?? Date.now());
        // Keep the event when it is still current or was updated inside the window.
        const updatedAt = p.datemodified ? new Date(p.datemodified).getTime() : 0;
        const stillActive = p.todate ? new Date(p.todate).getTime() >= Date.now() : true;
        if (!stillActive && updatedAt < cutoff) continue;

        const alert = ALERT_LEVELS[p.alertlevel ?? "Green"] ?? ALERT_LEVELS.Green;
        const countryName = p.country ?? p.affectedcountries?.[0]?.countryname;
        events.push({
          id: `${this.id}:${p.eventtype}:${p.eventid}:${p.episodeid ?? 0}`,
          hazard,
          title: p.name || p.eventname || `${hazard} event`,
          description: p.severitydata?.severitytext ?? p.description ?? undefined,
          lat,
          lon,
          place: countryName,
          countryCode: p.affectedcountries?.[0]?.iso2,
          detectedAt,
          updatedAt: p.datemodified ? toIso(p.datemodified) : undefined,
          ingestedAt: new Date().toISOString(),
          source: {
            id: this.id,
            name: this.name,
            url: this.url,
            recordUrl: p.url?.report ?? p.url?.details,
            license: this.license,
          },
          severity: severityFromScore(
            alert.score,
            `GDACS alert level ${p.alertlevel ?? "Green"}`,
          ),
          confidence: confidenceFromScore(
            0.85,
            "GDACS automated alert with analyst review",
          ),
          status: statusFromLevel(alert.level),
          geometry: { type: "Point", coordinates: [lon, lat] },
          isDetection: false,
          issuingAuthority: "GDACS",
          officialGuidance: p.htmldescription ?? undefined,
          raw: {
            eventtype: p.eventtype,
            glide: undefined,
            alertlevel: p.alertlevel,
            alertscore: p.alertscore,
            iso3: p.iso3,
            source: p.source,
            severitydata: p.severitydata,
          },
        });
      }

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
}
