import type { Metadata } from "next";
import Link from "next/link";
import ContentPage, { Callout, Card, Section } from "@/components/ContentPage";
import { SEVERITY_COLORS, SEVERITY_LABELS } from "@risksense/shared";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How RiskSense normalizes events, derives severity and confidence, classifies freshness, and handles uncertainty.",
};

const SEVERITY_ROWS = [
  { level: "minor" as const, note: "Detectable but limited impact. Low-magnitude seismic events, small detections." },
  { level: "moderate" as const, note: "Notable event. Moderate magnitude, developing flood, significant fire cluster." },
  { level: "severe" as const, note: "Serious event with likely impact. Strong quake, major flood, large fire complex." },
  { level: "extreme" as const, note: "Highest intensity. Destructive quake, catastrophic flood, extreme warning." },
];

export default function MethodologyPage() {
  return (
    <ContentPage
      breadcrumb="Methodology"
      title="Methodology"
      lede="RiskSense normalizes heterogeneous hazard feeds into one model, then derives a small number of values from them. This page documents those rules so the output can be audited, challenged and improved."
    >
      <Section title="The normalized event">
        <p>
          Every adapter emits the same shape, defined once in the shared package. Fields that the
          source does not publish are left absent rather than guessed.
        </p>
        <div className="mt-3 overflow-hidden rounded-[var(--r-md)] border border-line bg-white">
          <table className="w-full border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="bg-paper-2 text-[10.5px] uppercase tracking-wide text-ink-3">
                <th className="px-3 py-2 font-semibold">Field</th>
                <th className="px-3 py-2 font-semibold">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                ["id", "Deterministic identifier: source id plus the native record id."],
                ["hazard", "One of the canonical hazard families."],
                ["detectedAt", "When the hazard occurred or was observed, in UTC."],
                ["updatedAt", "When the source last revised the record."],
                ["ingestedAt", "When RiskSense retrieved it. Used for freshness only."],
                ["source", "Publisher identity, landing page, record link and license."],
                ["severity", "Level, normalized score and the measurement it came from."],
                ["confidence", "Level and the reason it was assigned."],
                ["status", "Lifecycle position, never advanced by RiskSense alone."],
                ["isDetection", "True for remote-sensing detections such as satellite hotspots."],
                ["officialGuidance", "Verbatim text from the issuing authority, when published."],
                ["raw", "Source-specific extras, preserved for transparency."],
              ].map(([f, d]) => (
                <tr key={f}>
                  <td className="px-3 py-2 font-mono text-[11.5px] text-ink">{f}</td>
                  <td className="px-3 py-2 text-ink-2">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Severity derivation">
        <p>
          Severity is derived from a physical measurement the source published, and the basis string
          records which one. Nothing is scored on appearance or prominence.
        </p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {SEVERITY_ROWS.map((r) => (
            <Card key={r.level} className="flex gap-3">
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: SEVERITY_COLORS[r.level] }}
                aria-hidden
              />
              <div>
                <p className="text-[13px] font-semibold text-ink">{SEVERITY_LABELS[r.level]}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">{r.note}</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Confidence">
        <p>
          Confidence describes the record, not the danger. A satellite detection at high confidence
          is still a detection; it is simply a strong one. Adapters assign confidence from the
          source&apos;s own indicators where they exist — for example, a VIIRS fire pixel carries a
          confidence value, and a USGS event carries a review status.
        </p>
        <Callout tone="info" title="Uncertainty is preserved, not smoothed away">
          Where a source is uncertain, RiskSense shows that uncertainty rather than resolving it.
          A low-confidence detection is labelled as such in the feed, in the details panel and on the
          map.
        </Callout>
      </Section>

      <Section title="Status lifecycle">
        <p>
          An event moves through detected, under review, confirmed by source, official warning and
          resolved. RiskSense may place an event at &quot;detected&quot; on its own. It never promotes an
          event to &quot;confirmed&quot; or &quot;official warning&quot; — only the issuing authority can do that, and
          only when the source itself publishes that classification.
        </p>
      </Section>

      <Section title="De-duplication">
        <p>
          Aggregators republish events that primary agencies already publish. RiskSense collapses
          records of the same hazard type within roughly 25 km and one day, keeping the record from
          the source that owns the data. The priority order is: primary agencies, then official
          warning services, then global aggregators, then curated compilations.
        </p>
      </Section>

      <Section title="Freshness classification">
        <p>
          Each source declares its documented refresh cadence. An event or feed is classified as
          fresh, aging, stale or expired by comparing its age to that cadence. This prevents two
          common errors: calling a slow feed broken, and calling a fast feed healthy when it has
          silently stopped.
        </p>
      </Section>

      <Section title="Known limitations">
        <ul className="list-disc space-y-2 pl-5">
          <li>Coverage is uneven by design; it reflects what agencies publish openly.</li>
          <li>Satellite fire detections include non-wildfire thermal sources.</li>
          <li>Country attribution depends on source metadata and may be missing.</li>
          <li>Statistics describe the retrieved sample, not the true global total.</li>
          <li>Emergency numbers are verified where possible and marked where they are not.</li>
        </ul>
        <p className="mt-3">
          See the{" "}
          <Link href="/sources" className="text-navy-3 underline underline-offset-2">
            data source directory
          </Link>{" "}
          for the exact sources behind these rules.
        </p>
      </Section>
    </ContentPage>
  );
}
