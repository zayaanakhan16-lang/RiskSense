import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 3600;

/** GET /api/openapi – the OpenAPI 3.1 description of the public RiskSense API. */
export async function GET() {
  return NextResponse.json(openApiDocument, {
    headers: {
      "cache-control": "public, max-age=3600",
      "access-control-allow-origin": "*",
    },
  });
}

const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "RiskSense Public API",
    version: "0.1.0",
    description:
      "Read-only public API for normalized global hazard events. RiskSense " +
      "aggregates official and open data sources; it does not dispatch " +
      "emergency services and does not author emergency guidance.",
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  servers: [{ url: "/", description: "Current deployment" }],
  paths: {
    "/api/events": {
      get: {
        summary: "List normalized hazard events",
        parameters: [
          {
            name: "window",
            in: "query",
            schema: { type: "integer", enum: [6, 24, 72, 168] },
            description: "Hours of history to include. Default 24.",
          },
          {
            name: "hazard",
            in: "query",
            schema: { type: "string" },
            description: "Comma-separated hazard families, e.g. wildfire,flood.",
          },
          {
            name: "minSeverity",
            in: "query",
            schema: { type: "string", enum: ["minor", "moderate", "severe", "extreme"] },
          },
          { name: "source", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", maximum: 2000 } },
        ],
        responses: {
          "200": {
            description: "Normalized event envelope",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EventsResponse" },
              },
            },
          },
        },
      },
    },
    "/api/sources": {
      get: {
        summary: "Data source directory",
        responses: { "200": { description: "Registered sources with licenses" } },
      },
    },
    "/api/stats": {
      get: {
        summary: "Observatory statistics computed from retrieved events",
        parameters: [
          {
            name: "window",
            in: "query",
            schema: { type: "integer", enum: [6, 24, 72, 168] },
          },
        ],
        responses: { "200": { description: "Aggregated statistics" } },
      },
    },
    "/api/emergency": {
      get: {
        summary: "Verified country-specific emergency numbers",
        parameters: [
          { name: "country", in: "query", schema: { type: "string" }, description: "ISO-3166-1 alpha-2" },
        ],
        responses: { "200": { description: "Emergency directory entry or full directory" } },
      },
    },
    "/api/geocode": {
      get: {
        summary: "Forward or reverse geocoding",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "lat", in: "query", schema: { type: "number" } },
          { name: "lon", in: "query", schema: { type: "number" } },
        ],
        responses: { "200": { description: "Geocoding results" } },
      },
    },
    "/api/reports": {
      get: {
        summary: "Recent community reports (unverified)",
        responses: { "200": { description: "Community reports" } },
      },
      post: {
        summary: "Submit a community report",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CommunityReportInput" } },
          },
        },
        responses: {
          "201": { description: "Report accepted and marked unverified" },
          "429": { description: "Rate limited" },
        },
      },
    },
  },
  components: {
    schemas: {
      EventsResponse: {
        type: "object",
        required: ["generatedAt", "windowHours", "total", "events", "sources"],
        properties: {
          generatedAt: { type: "string", format: "date-time" },
          windowHours: { type: "integer" },
          total: { type: "integer" },
          events: { type: "array", items: { $ref: "#/components/schemas/HazardEvent" } },
          sources: { type: "array", items: { $ref: "#/components/schemas/SourceStatus" } },
          warnings: { type: "array", items: { type: "string" } },
        },
      },
      HazardEvent: {
        type: "object",
        required: ["id", "hazard", "title", "lat", "lon", "detectedAt", "source", "severity", "confidence", "status"],
        properties: {
          id: { type: "string" },
          hazard: {
            type: "string",
            enum: [
              "wildfire", "flood", "earthquake", "severe-weather", "cyclone",
              "volcano", "extreme-heat", "air-quality", "drought", "landslide",
              "industrial", "other",
            ],
          },
          title: { type: "string" },
          description: { type: "string" },
          lat: { type: "number" },
          lon: { type: "number" },
          place: { type: "string" },
          countryCode: { type: "string" },
          detectedAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          ingestedAt: { type: "string", format: "date-time" },
          source: { $ref: "#/components/schemas/SourceRef" },
          severity: {
            type: "object",
            properties: {
              level: { type: "string", enum: ["minor", "moderate", "severe", "extreme"] },
              score: { type: "number" },
              basis: { type: "string" },
            },
          },
          confidence: {
            type: "object",
            properties: {
              level: { type: "string", enum: ["low", "medium", "high"] },
              score: { type: "number" },
              basis: { type: "string" },
            },
          },
          status: {
            type: "string",
            enum: ["detected", "under-review", "confirmed", "warning", "resolved"],
          },
          isDetection: {
            type: "boolean",
            description: "True for remote-sensing detections such as satellite fire hotspots.",
          },
          issuingAuthority: { type: "string" },
          officialGuidance: { type: "string" },
        },
      },
      SourceRef: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          url: { type: "string" },
          recordUrl: { type: "string" },
          license: { type: "string" },
        },
      },
      SourceStatus: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          url: { type: "string" },
          license: { type: "string" },
          hazards: { type: "array", items: { type: "string" } },
          expectedRefreshMinutes: { type: "integer" },
          state: { type: "string", enum: ["ok", "degraded", "unavailable", "not-configured"] },
          lastSuccessAt: { type: "string", format: "date-time" },
          eventCount: { type: "integer" },
          message: { type: "string" },
          requiresKey: { type: "boolean" },
        },
      },
      CommunityReportInput: {
        type: "object",
        required: ["category", "lat", "lon", "description"],
        properties: {
          category: {
            type: "string",
            enum: [
              "fire-observed", "flooding-observed", "road-blocked",
              "severe-damage", "resource-needed", "other",
            ],
          },
          lat: { type: "number" },
          lon: { type: "number" },
          description: { type: "string", minLength: 10, maxLength: 1200 },
          place: { type: "string" },
          countryCode: { type: "string" },
          photoUrl: { type: "string", format: "uri" },
        },
      },
    },
  },
} as const;
