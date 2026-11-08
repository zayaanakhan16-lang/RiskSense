import type { Metadata } from "next";
import Link from "next/link";
import ContentPage, { Callout, Card, Section } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "About",
  description:
    "RiskSense is an open-source global emergency intelligence platform built on official and open hazard data.",
};

export default function AboutPage() {
  return (
    <ContentPage
      breadcrumb="About"
      title="About RiskSense"
      lede="RiskSense makes global emergency intelligence accessible to everyone through open-source technology and trustworthy public data."
    >
      <Section title="Mission">
        <p>
          Hazards do not respect borders, and the data that describes them is scattered across
          dozens of agencies, formats and update schedules. RiskSense brings that information into
          one place, keeps the source attached to every record, and refuses to invent what it does
          not know.
        </p>
        <p>
          The platform exists to help people answer eight questions quickly: what is happening, where,
          what kind of hazard, how serious, how reliable, how fresh, whether it could affect them,
          and where to find official help.
        </p>
      </Section>

      <Section title="What RiskSense is">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <p className="text-[13px] font-semibold text-ink">A reading layer</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              It reads what agencies publish and presents it clearly, with attribution and
              timestamps intact.
            </p>
          </Card>
          <Card>
            <p className="text-[13px] font-semibold text-ink">Open source</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              Apache-2.0 licensed, self-hostable, with no closed core and no proprietary service
              required to run it.
            </p>
          </Card>
          <Card>
            <p className="text-[13px] font-semibold text-ink">Multi-hazard</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              Wildfires, floods, earthquakes, storms, cyclones, volcanoes, heat, air quality and
              more — in one normalized model.
            </p>
          </Card>
          <Card>
            <p className="text-[13px] font-semibold text-ink">Honest about gaps</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              Unavailable, delayed and stale feeds are shown as such, and a quiet map is never
              presented as a safety guarantee.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="What RiskSense is not">
        <Callout tone="warn" title="Not an emergency service">
          RiskSense does not dispatch responders, does not replace official alert channels, and does
          not author emergency guidance. It is an information service. In an emergency, contact your
          local emergency service directly.
        </Callout>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>It does not confirm a hazard from a satellite detection.</li>
          <li>It does not use AI to generate coordinates, severity or instructions.</li>
          <li>It does not treat a citizen report as verified before review.</li>
          <li>It does not assume a universal emergency number.</li>
          <li>It does not claim that a location is safe because nothing is displayed.</li>
        </ul>
      </Section>

      <Section title="Credibility">
        <p>
          Trust in a public-safety tool comes from showing your work. Every event links to its source
          record. Every feed reports its own health. Every derived value states its basis. The{" "}
          <Link href="/methodology" className="text-navy-3 underline underline-offset-2">
            methodology
          </Link>{" "}
          documents the normalization rules, and the{" "}
          <Link href="/sources" className="text-navy-3 underline underline-offset-2">
            data source directory
          </Link>{" "}
          lists licenses and cadences.
        </p>
      </Section>

      <Section title="Contribute">
        <p>
          RiskSense is built to be extended. Adding a hazard source means writing one adapter that
          satisfies a small interface and registering it — nothing else changes. See{" "}
          <Link href="/contribute" className="text-navy-3 underline underline-offset-2">
            Contribute
          </Link>{" "}
          for the data-source contribution guide.
        </p>
      </Section>
    </ContentPage>
  );
}
