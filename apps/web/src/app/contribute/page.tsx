import type { Metadata } from "next";
import Link from "next/link";
import ContentPage, { Callout, Card, Section } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Contribute",
  description:
    "How to contribute to RiskSense: add a hazard data source, report a bug, improve the map or correct emergency data.",
};

export default function ContributePage() {
  return (
    <ContentPage
      breadcrumb="Contribute"
      title="Contribute to RiskSense"
      lede="RiskSense is built to be extended by the community. The highest-value contribution is a new, well-documented hazard data source — and the most important is a correction to something we got wrong."
    >
      <Section title="Add a hazard data source">
        <p>
          The platform is deliberately structured so that adding a source touches one new file and
          one registry line. Nothing else in the application needs to change.
        </p>
        <ol className="list-decimal space-y-3 pl-5">
          <li>
            <strong className="font-semibold text-ink">Check the access terms.</strong> Confirm the
            source is public, that automated access is permitted, and what attribution it requires.
            If the terms are unclear, open an issue before writing code.
          </li>
          <li>
            <strong className="font-semibold text-ink">Write the adapter.</strong> Implement the
            adapter interface: an id, name, url, license, the hazards it contributes, its documented
            refresh cadence, and a fetch method that returns normalized events plus a status object.
          </li>
          <li>
            <strong className="font-semibold text-ink">Normalize honestly.</strong> Map only what the
            source actually provides. Do not infer coordinates, severity or status. Set
            isDetection correctly. Keep the raw payload.
          </li>
          <li>
            <strong className="font-semibold text-ink">Handle failure.</strong> A source that times
            out or returns an unexpected shape must report a status, not throw into the aggregation.
          </li>
          <li>
            <strong className="font-semibold text-ink">Register it.</strong> Add it to the adapter
            registry and add a test fixture.
          </li>
          <li>
            <strong className="font-semibold text-ink">Document it.</strong> Add the source to the{" "}
            <Link href="/sources" className="text-navy-3 underline underline-offset-2">
              data source directory
            </Link>{" "}
            with its license and cadence.
          </li>
        </ol>
      </Section>

      <Section title="Correct emergency data">
        <p>
          Emergency numbers change and vary by region within a country. If an entry is wrong or
          missing, that is a high-priority correction. Include the official source you verified it
          against — a government page, not a directory of directories.
        </p>
      </Section>

      <Section title="Other ways to help">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <p className="text-[13px] font-semibold text-ink">Report a bug</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              Include what you expected, what happened, the browser, and — where relevant — the
              event id or source involved.
            </p>
          </Card>
          <Card>
            <p className="text-[13px] font-semibold text-ink">Request a feature</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              Describe the user need first. Features that add credibility, coverage or clarity are
              prioritised over features that add decoration.
            </p>
          </Card>
          <Card>
            <p className="text-[13px] font-semibold text-ink">Improve translations</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              The interface ships in several languages. Event content stays in the language its
              source published, and is never machine-translated into a warning.
            </p>
          </Card>
          <Card>
            <p className="text-[13px] font-semibold text-ink">Improve accessibility</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              Contrast, focus order, keyboard reachability and screen-reader labelling on a
              map-centric interface are hard and always welcome.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Community reports">
        <p>
          You can also report what you observe directly from the map. Reports are unverified until
          reviewed, rate limited, and coarsened for privacy. They are a signal for humans, never an
          automatic trigger for a response.
        </p>
      </Section>

      <Callout tone="warn" title="Code of conduct">
        This is public-safety software. Contributions are reviewed against a single question: does
        this make the platform more accurate, more honest, or more useful to someone in danger?
      </Callout>
    </ContentPage>
  );
}
