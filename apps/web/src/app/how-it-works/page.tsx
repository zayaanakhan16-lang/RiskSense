import type { Metadata } from "next";
import Link from "next/link";
import ContentPage, { Callout, Card, Section } from "@/components/ContentPage";
import { HAZARDS, HAZARD_ORDER } from "@risksense/shared";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How RiskSense collects official and open hazard data, normalizes it, and turns it into a map, a live feed and personal alerts.",
};

export default function HowItWorksPage() {
  return (
    <ContentPage
      breadcrumb="How It Works"
      title="How RiskSense works"
      lede="RiskSense is a reading layer over data that public agencies already publish. It does not detect hazards itself and it does not issue warnings. It collects, normalizes, and presents — with the source, the time and the uncertainty always attached."
    >
      <Section title="The pipeline">
        <ol className="list-decimal space-y-3 pl-5">
          <li>
            <strong className="font-semibold text-ink">Collect.</strong> Each hazard source has its
            own adapter — a small module that knows one API and nothing else. Adapters run in
            parallel with a hard timeout, so a slow or failing provider can never stall the map.
          </li>
          <li>
            <strong className="font-semibold text-ink">Normalize.</strong> Every adapter converts
            its native payload into one shared event model: hazard type, coordinates, time, source,
            severity, confidence and status. Downstream code never sees a provider-specific shape.
          </li>
          <li>
            <strong className="font-semibold text-ink">De-duplicate.</strong> Curated aggregators
            republish events that the original agencies already publish. RiskSense keeps the record
            from the source that owns the data and drops the echo.
          </li>
          <li>
            <strong className="font-semibold text-ink">Present.</strong> The map, the live feed, the
            event details and the alert engine all read the same normalized events. Every view can
            show where a record came from and how old it is.
          </li>
        </ol>
      </Section>

      <Section title="What the map shows">
        <p>
          Markers are real events retrieved from real sources. RiskSense never places a marker to
          make the map look busier. Dense regions — wildfire hotspots in particular — are clustered
          so the globe stays readable; zooming in expands a cluster into its individual detections.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {HAZARD_ORDER.map((h) => (
            <Card key={h} className="flex gap-3">
              <span
                className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: HAZARDS[h].color }}
                aria-hidden
              />
              <div>
                <p className="text-[13px] font-semibold text-ink">{HAZARDS[h].label}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">
                  {HAZARDS[h].description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Severity, confidence and status are different things">
        <p>
          These three values are frequently conflated, and conflating them is how public-safety
          tools mislead people. RiskSense keeps them separate.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Card>
            <p className="text-[13px] font-semibold text-ink">Severity</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              How intense the event is, from minor to extreme. Derived from the measurement the
              source published — magnitude, fire radiative power, wind speed — and the derivation is
              shown.
            </p>
          </Card>
          <Card>
            <p className="text-[13px] font-semibold text-ink">Confidence</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              How much to trust the record itself. A satellite hotspot at low confidence is a real
              detection of something uncertain; an official warning is a considered human judgement.
            </p>
          </Card>
          <Card>
            <p className="text-[13px] font-semibold text-ink">Status</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              Where the event sits in its lifecycle: detected, under review, confirmed by source,
              official warning, or resolved. Only the issuing authority can move an event to
              &quot;official warning&quot;.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Data freshness">
        <p>
          Sources publish on their own schedules. RiskSense classifies the age of each feed against
          that documented cadence, so an hourly feed is not called stale at forty minutes and a
          ten-minute feed is not called fresh at two hours. The source panel shows the state of
          every feed, including the ones that are down.
        </p>
        <Callout tone="warn" title="A quiet map is not proof of safety">
          If a feed is delayed, unavailable, or simply has nothing to report, the map will be quiet.
          That is not the same as the world being quiet. RiskSense says which it is.
        </Callout>
      </Section>

      <Section title="Where AI is and is not used">
        <p>
          RiskSense does not use AI to generate events, coordinates, severity levels or emergency
          instructions. Those come from the source. Language-model assistance, where used at all, is
          confined to summarizing already-verified text while preserving the source and the
          uncertainty — never to inventing a hazard or a warning.
        </p>
      </Section>

      <Section title="Open source and self-hostable">
        <p>
          The frontend, the adapters, the hazard engine, the API and the database schema are all in
          one open-source repository under Apache-2.0. There is no closed core and no proprietary
          service required to run the platform. See the{" "}
          <Link href="/methodology" className="text-navy-3 underline underline-offset-2">
            methodology
          </Link>{" "}
          and{" "}
          <Link href="/sources" className="text-navy-3 underline underline-offset-2">
            data source directory
          </Link>
          .
        </p>
      </Section>
    </ContentPage>
  );
}
