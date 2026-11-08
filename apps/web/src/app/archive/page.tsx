"use client";

import { useCallback, useEffect, useState } from "react";
import ContentPage, { Callout, Card, Section } from "@/components/ContentPage";
import { formatCoord } from "@risksense/shared";

interface ArchiveEvent {
  id: string;
  hazard: string;
  title: string;
  place?: string;
  lat: number;
  lon: number;
  detectedAt: string;
  severity: { level: string; score: number; basis: string };
  confidence: { level: string; basis: string };
  status: string;
  depthKm?: number;
  measurement?: { label: string; value: number; unit: string };
  source: { id: string; name: string; recordUrl?: string };
}

interface ArchiveResponse {
  from: string;
  to: string;
  minMagnitude: number;
  count: number;
  events: ArchiveEvent[];
  note: string;
  source: { id: string; name: string; url: string; license: string };
  status?: { state: string; message?: string };
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Historical archive. Backed by a live date-ranged query against a source that
 * genuinely retains history, so the page never presents a fabricated record.
 */
export default function ArchivePage() {
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [minMagnitude, setMinMagnitude] = useState(4.5);
  const [data, setData] = useState<ArchiveResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from, to, minMagnitude: String(minMagnitude) });
      const res = await fetch(`/api/archive?${params}`);
      const body = await res.json();
      if (!res.ok) {
        throw new Error(
          body.error === "RANGE_TOO_LARGE"
            ? "Please choose a range of 90 days or fewer."
            : body.error ?? "The archive query failed.",
        );
      }
      setData(body as ArchiveResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The archive query failed.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, minMagnitude]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ContentPage
      breadcrumb="Event Archive"
      title="Event archive"
      lede="Query historical events from sources that genuinely retain them. This is a live query against the source, not a RiskSense dataset, so coverage reflects what the publisher keeps."
    >
      <Section title="Query">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="rs-overline text-ink-3">From</span>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1.5 w-full rounded-[var(--r-sm)] border border-line bg-white px-3 py-2 text-[13px] text-ink"
            />
          </label>
          <label className="block">
            <span className="rs-overline text-ink-3">To</span>
            <input
              type="date"
              value={to}
              min={from}
              max={isoDaysAgo(0)}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1.5 w-full rounded-[var(--r-sm)] border border-line bg-white px-3 py-2 text-[13px] text-ink"
            />
          </label>
          <label className="block">
            <span className="rs-overline text-ink-3">Min magnitude</span>
            <input
              type="number"
              step={0.5}
              min={1}
              max={9}
              value={minMagnitude}
              onChange={(e) => setMinMagnitude(Number(e.target.value))}
              className="mt-1.5 w-full rounded-[var(--r-sm)] border border-line bg-white px-3 py-2 text-[13px] text-ink"
            />
          </label>
          <div className="flex items-end">
            <button
              onClick={load}
              disabled={loading}
              className="h-10 w-full rounded-[var(--r-sm)] bg-navy px-3 text-[13px] font-medium text-white transition-colors hover:bg-navy-2 disabled:opacity-60"
            >
              {loading ? "Querying…" : "Query archive"}
            </button>
          </div>
        </div>
        <Callout tone="info" title="Why only earthquakes?">
          USGS publishes an open, date-ranged historical query, which makes an honest archive
          possible. Most hazard feeds publish only the current state, so RiskSense does not
          pretend to have history it cannot retrieve.
        </Callout>
      </Section>

      {error && (
        <Callout tone="warn" title="Query failed">
          {error}
        </Callout>
      )}

      {data && (
        <Section title={`${data.count.toLocaleString()} events`}>
          <p className="text-[12.5px] text-ink-3">
            {data.from.slice(0, 10)} to {data.to.slice(0, 10)} · magnitude ≥ {data.minMagnitude} ·{" "}
            {data.source.name}
          </p>
          {data.count === 0 ? (
            <Card>
              <p className="text-[13px] text-ink-2">
                No events matched this query. Try lowering the minimum magnitude or widening the
                date range.
              </p>
            </Card>
          ) : (
            <div className="mt-3 overflow-hidden rounded-[var(--r-md)] border border-line bg-white">
              <table className="w-full border-collapse text-left text-[12.5px]">
                <thead>
                  <tr className="bg-paper-2 text-[10.5px] uppercase tracking-wide text-ink-3">
                    <th className="px-3 py-2 font-semibold">Time</th>
                    <th className="px-3 py-2 font-semibold">Event</th>
                    <th className="hidden px-3 py-2 font-semibold sm:table-cell">Location</th>
                    <th className="px-3 py-2 font-semibold">Depth</th>
                    <th className="px-3 py-2 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.events.slice(0, 200).map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap px-3 py-2 text-ink-2">
                        {new Date(e.detectedAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 font-medium text-ink">{e.title}</td>
                      <td className="hidden px-3 py-2 text-ink-2 sm:table-cell">
                        {e.place ?? formatCoord(e.lat, e.lon, 1)}
                      </td>
                      <td className="rs-tabular px-3 py-2 text-ink-2">
                        {e.depthKm !== undefined ? `${e.depthKm.toFixed(0)} km` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {e.source.recordUrl && (
                          <a
                            href={e.source.recordUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-[11.5px] text-navy-3 underline underline-offset-2"
                          >
                            Source
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.events.length > 200 && (
            <p className="mt-2 text-[11.5px] text-ink-3">
              Showing the first 200 of {data.count.toLocaleString()} events.
            </p>
          )}
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">{data.note}</p>
        </Section>
      )}
    </ContentPage>
  );
}
