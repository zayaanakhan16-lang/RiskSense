import type { Metadata } from "next";
import Link from "next/link";
import ContentPage, { Callout, Card, Section } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "API & Docs",
  description:
    "The public read-only RiskSense API for normalized hazard events, with an OpenAPI specification.",
};

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/events",
    desc: "Normalized hazard events aggregated from every registered source.",
    params: "window, hazard, minSeverity, source, limit",
  },
  {
    method: "GET",
    path: "/api/stats",
    desc: "Observatory statistics computed from the retrieved events.",
    params: "window",
  },
  {
    method: "GET",
    path: "/api/sources",
    desc: "Data source directory with licenses and cadences.",
    params: "—",
  },
  {
    method: "GET",
    path: "/api/emergency",
    desc: "Verified country-specific emergency numbers.",
    params: "country",
  },
  {
    method: "GET",
    path: "/api/geocode",
    desc: "Forward or reverse geocoding for place search and country detection.",
    params: "q | lat+lon",
  },
  {
    method: "GET",
    path: "/api/archive",
    desc: "Historical events from sources that retain them.",
    params: "from, to, minMagnitude",
  },
  {
    method: "GET",
    path: "/api/reports",
    desc: "Recent unverified community reports.",
    params: "limit",
  },
  {
    method: "POST",
    path: "/api/reports",
    desc: "Submit a community report. Rate limited and coarsened.",
    params: "JSON body",
  },
  {
    method: "GET",
    path: "/api/openapi",
    desc: "This API described as an OpenAPI 3.1 document.",
    params: "—",
  },
];

const EXAMPLE_EVENT = `{
  "id": "usgs-earthquakes:us7000abcd",
  "hazard": "earthquake",
  "title": "M 5.4 earthquake",
  "place": "87 km SW of Somewhere",
  "lat": -12.345,
  "lon": 145.678,
  "detectedAt": "2026-11-07T18:22:11.040Z",
  "updatedAt": "2026-11-07T18:40:02.000Z",
  "ingestedAt": "2026-11-07T18:41:09.512Z",
  "source": {
    "id": "usgs-earthquakes",
    "name": "USGS Earthquake Hazards Program",
    "url": "https://earthquake.usgs.gov/",
    "recordUrl": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abcd",
    "license": "Public domain (U.S. Government work)"
  },
  "severity": { "level": "severe", "score": 0.62, "basis": "Magnitude 5.4" },
  "confidence": { "level": "high", "basis": "Reviewed by a seismic analyst" },
  "status": "confirmed",
  "isDetection": false,
  "measurement": { "label": "Magnitude", "value": 5.4, "unit": "M" },
  "depthKm": 32.1
}`;

export default function ApiDocsPage() {
  return (
    <ContentPage
      breadcrumb="API & Docs"
      title="Public API"
      lede="RiskSense exposes a read-only public API over normalized hazard events. It requires no key, exposes no private user data, and never includes provider credentials."
    >
      <Callout tone="info" title="Try it">
        Open{" "}
        <a href="/api/events?window=24" className="font-medium underline underline-offset-2">
          /api/events?window=24
        </a>{" "}
        in your browser, or fetch the machine-readable specification at{" "}
        <a href="/api/openapi" className="font-medium underline underline-offset-2">
          /api/openapi
        </a>
        .
      </Callout>

      <Section title="Endpoints">
        <div className="overflow-hidden rounded-[var(--r-md)] border border-line bg-white">
          <table className="w-full border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="bg-paper-2 text-[10.5px] uppercase tracking-wide text-ink-3">
                <th className="px-3 py-2 font-semibold">Method</th>
                <th className="px-3 py-2 font-semibold">Path</th>
                <th className="px-3 py-2 font-semibold">Description</th>
                <th className="hidden px-3 py-2 font-semibold sm:table-cell">Parameters</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ENDPOINTS.map((e) => (
                <tr key={`${e.method}-${e.path}`}>
                  <td className="px-3 py-2">
                    <span
                      className={
                        "rounded-[var(--r-xs)] px-1.5 py-0.5 font-mono text-[10.5px] font-semibold " +
                        (e.method === "GET"
                          ? "bg-water-soft text-[#075985]"
                          : "bg-emergency-soft text-[#9a3412]")
                      }
                    >
                      {e.method}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11.5px] text-ink">{e.path}</td>
                  <td className="px-3 py-2 text-ink-2">{e.desc}</td>
                  <td className="hidden px-3 py-2 font-mono text-[11px] text-ink-3 sm:table-cell">
                    {e.params}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Example: list recent events">
        <Card>
          <p className="font-mono text-[12px] text-ink-2">GET /api/events?window=24&hazard=earthquake</p>
        </Card>
        <p>Each event in the response uses the normalized model:</p>
        <pre className="rs-scroll overflow-x-auto rounded-[var(--r-md)] border border-line bg-navy p-4 font-mono text-[11.5px] leading-relaxed text-[#e6edf3]">
{EXAMPLE_EVENT}
        </pre>
      </Section>

      <Section title="Error handling">
        <p>
          Errors return a JSON object with an <code className="font-mono text-[12px]">error</code>{" "}
          code and, where useful, additional context. Common responses:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <code className="font-mono text-[12px]">400</code> — invalid parameters, for example an
            archive range longer than 90 days.
          </li>
          <li>
            <code className="font-mono text-[12px]">429</code> — community report rate limit
            exceeded.
          </li>
          <li>
            <code className="font-mono text-[12px]">502</code> — an upstream service could not be
            reached.
          </li>
        </ul>
        <p>
          A failing upstream source never fails the whole events response. Its events are omitted,
          its status is reported in the <code className="font-mono text-[12px]">sources</code> array,
          and a warning is added.
        </p>
      </Section>

      <Section title="Attribution and licenses">
        <p>
          Data remains the property of the publishing agencies. If you build on the RiskSense API,
          preserve the <code className="font-mono text-[12px]">source</code> object in your own
          output and honour each source&apos;s terms. The{" "}
          <Link href="/sources" className="text-navy-3 underline underline-offset-2">
            data source directory
          </Link>{" "}
          lists licenses.
        </p>
      </Section>

      <Section title="Self-hosting">
        <p>
          The API is part of the open-source application. Run the repository yourself to host your
          own instance, with your own tile server and your own optional persistence. See the
          deployment guide in the repository.
        </p>
      </Section>
    </ContentPage>
  );
}
