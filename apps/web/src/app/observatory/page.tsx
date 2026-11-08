import type { Metadata } from "next";
import Link from "next/link";
import ContentPage, { Callout, Card, Section } from "@/components/ContentPage";
import { aggregateEvents, activitySeries, countryStats, hazardStats, sourceBreakdown } from "@risksense/hazard-engine";
import { countryName, flagEmoji, type EventsResponse } from "@risksense/shared";

export const metadata: Metadata = {
  title: "Observatory",
  description:
    "Global hazard activity computed from the events RiskSense actually retrieved in the current window.",
};

export const revalidate = 300;

const WINDOWS = [24, 72, 168] as const;

export default async function ObservatoryPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const sp = await searchParams;
  const requested = Number.parseInt(sp.window ?? "72", 10);
  const windowHours = (WINDOWS as readonly number[]).includes(requested) ? requested : 72;

  let data: EventsResponse | null = null;
  let failure: string | null = null;
  try {
    data = await aggregateEvents({
      windowHours,
      firmsMapKey: process.env.FIRMS_MAP_KEY,
    });
  } catch (e) {
    failure = e instanceof Error ? e.message : "The observatory could not retrieve data.";
  }

  const events = data?.events ?? [];
  const byHazard = hazardStats(events);
  const byCountry = countryStats(events, 24);
  const series = activitySeries(events, windowHours);
  const bySource = sourceBreakdown(events);

  const maxSeries = Math.max(1, ...series.map((p) => p.total));
  const maxHazard = Math.max(1, ...byHazard.map((h) => h.count));
  const maxCountry = Math.max(1, ...byCountry.map((c) => c.count));
  const maxSource = Math.max(1, ...bySource.map((s) => s.count));
  const severeTotal = events.filter((e) => e.severity.level === "severe" || e.severity.level === "extreme").length;
  const officialTotal = events.filter((e) => e.status === "warning" || e.status === "confirmed").length;

  return (
    <ContentPage
      breadcrumb="Observatory"
      title="Global observatory"
      lede="Everything on this page is computed from the events RiskSense retrieved in the selected window. Nothing is estimated, projected or padded."
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rs-overline text-ink-3">Window</span>
        {WINDOWS.map((w) => (
          <Link
            key={w}
            href={`/observatory?window=${w}`}
            className={
              "rounded-[var(--r-pill)] border px-3 py-1 text-[12px] font-medium transition-colors " +
              (windowHours === w
                ? "border-transparent bg-navy text-white"
                : "border-line bg-white text-ink-2 hover:text-ink")
            }
          >
            {w === 24 ? "24 hours" : w === 72 ? "72 hours" : "7 days"}
          </Link>
        ))}
      </div>

      {failure && (
        <Callout tone="warn" title="Live data unavailable">
          {failure}. Statistics cannot be computed without retrieved events, so none are shown.
        </Callout>
      )}

      {data && (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Events in window" value={data.total} note={`${windowHours} h window`} />
            <Stat label="Severe or extreme" value={severeTotal} note="severity derived from source measurement" />
            <Stat label="Official status" value={officialTotal} note="confirmed or under official warning" />
            <Stat label="Sources reporting" value={data.sources.filter((s) => s.state === "ok").length} note={`of ${data.sources.length} registered`} />
          </div>

          <Section title="Activity by day">
            <div className="flex items-end gap-1.5 sm:gap-2">
              {series.map((p) => (
                <div key={p.date} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="rs-tabular text-[10.5px] text-ink-3">{p.total}</span>
                  <div
                    className="w-full rounded-t-[var(--r-xs)] bg-navy-3"
                    style={{ height: `${Math.max(3, (p.total / maxSeries) * 130)}px` }}
                    title={`${p.date}: ${p.total} events`}
                  />
                  <span className="text-[10px] text-ink-3">{p.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="By hazard family">
            {byHazard.length === 0 ? (
              <p className="text-[13px] text-ink-3">No events were retrieved in this window.</p>
            ) : (
              <ul className="space-y-2">
                {byHazard.map((h) => (
                  <li key={h.hazard} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-[12.5px] text-ink">{h.label}</span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${(h.count / maxHazard) * 100}%`, backgroundColor: h.color }}
                      />
                    </span>
                    <span className="rs-tabular w-24 shrink-0 text-right text-[11.5px] text-ink-2">
                      {h.count} · {h.severeCount} severe
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="By country">
            {byCountry.length === 0 ? (
              <p className="text-[13px] text-ink-3">
                Country attribution was not present on the retrieved events.
              </p>
            ) : (
              <ul className="space-y-2">
                {byCountry.map((c) => (
                  <li key={c.countryCode} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-[12.5px] text-ink">
                      {flagEmoji(c.countryCode)} {countryName(c.countryCode)}
                    </span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                      <span
                        className="block h-full rounded-full bg-navy-3"
                        style={{ width: `${(c.count / maxCountry) * 100}%` }}
                      />
                    </span>
                    <span className="rs-tabular w-16 shrink-0 text-right text-[11.5px] text-ink-2">
                      {c.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="By source">
            <ul className="space-y-2">
              {bySource.map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-[12.5px] text-ink">{s.name}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                    <span
                      className="block h-full rounded-full bg-emergency"
                      style={{ width: `${(s.count / maxSource) * 100}%` }}
                    />
                  </span>
                  <span className="rs-tabular w-16 shrink-0 text-right text-[11.5px] text-ink-2">
                    {s.count}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="How to read this">
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <p className="text-[13px] font-semibold text-ink">These are retrieved counts</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                  They describe the sample RiskSense received from the listed sources, not a global
                  total. A hazard type with few events may simply be under-reported.
                </p>
              </Card>
              <Card>
                <p className="text-[13px] font-semibold text-ink">Long events fall outside windows</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                  Droughts and ongoing floods can span weeks. A short window will not contain their
                  onset, only their latest update.
                </p>
              </Card>
            </div>
          </Section>

          <Callout tone="warn" title="Source warnings">
            {data.warnings.length === 0
              ? "All registered sources responded normally for this window."
              : data.warnings.join(" · ")}
          </Callout>
        </>
      )}
    </ContentPage>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <Card>
      <p className="rs-overline text-ink-3">{label}</p>
      <p className="rs-tabular mt-1 text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-[11.5px] leading-snug text-ink-3">{note}</p>
    </Card>
  );
}
