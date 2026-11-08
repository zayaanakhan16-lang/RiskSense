import type { Metadata } from "next";
import Link from "next/link";
import ContentPage, { Card, Section } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about RiskSense, its data and its limits.",
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is RiskSense an official warning service?",
    a: "No. RiskSense aggregates and presents data that official agencies publish. It does not issue warnings and it does not replace official alert channels. For official warnings, always follow the issuing authority.",
  },
  {
    q: "Will RiskSense call emergency services for me?",
    a: "No, and it never claims to. The Emergency Assistance panel shows verified, country-specific numbers and official guidance, and requires an explicit confirmation before opening your phone dialler. You place the call.",
  },
  {
    q: "Why does a wildfire marker appear where I see no fire?",
    a: "Satellite fire detections are thermal anomalies. A hotspot is a detection, not a confirmed wildfire. Industrial flares, agricultural burning and hot rock can all register. RiskSense labels every detection as such and shows its confidence.",
  },
  {
    q: "Why is the map empty when I know something is happening?",
    a: "Either the relevant feed has nothing to report, or the feed is delayed or unavailable. The source panel shows the state of every feed so you can tell the difference. An empty map is not a statement that conditions are safe.",
  },
  {
    q: "How current is the data?",
    a: "Each source has its own cadence, from near-real-time to daily. RiskSense classifies freshness against the publisher's documented schedule and shows it per source and per event.",
  },
  {
    q: "Does RiskSense use AI to generate events or warnings?",
    a: "No. Coordinates, severity, status and emergency guidance come from the source. AI is not used to invent events, and it never promotes a detection to a confirmed incident.",
  },
  {
    q: "Are the community reports verified?",
    a: "No. Citizen reports are explicitly unverified until a moderator reviews them. They are rate limited, coarsened to roughly one kilometre, and can never trigger an automatic dispatch.",
  },
  {
    q: "Why does RiskSense not just show 911 everywhere?",
    a: "Because emergency numbers are not universal. They differ by country and change over time. RiskSense only shows numbers it can verify for the location, and says plainly when it cannot.",
  },
  {
    q: "Can I run RiskSense myself?",
    a: "Yes. The whole platform is open source under Apache-2.0 and is designed to be self-hosted, including the data ingestion and the database schema. See the deployment guide in the repository.",
  },
  {
    q: "Which hazards are covered?",
    a: "Wildfires, floods, earthquakes, severe weather, cyclones, volcanic activity, extreme heat, air quality, drought, landslides and industrial incidents, wherever a reliable source exists. Coverage varies by region and by hazard.",
  },
  {
    q: "Why is coverage better in some countries than others?",
    a: "Because publishing agencies differ. Global sources such as USGS and GDACS give worldwide coverage for their hazard types; national meteorological and hydrological services vary widely in what they publish openly.",
  },
  {
    q: "How do I report an incident?",
    a: "Use the Report an incident action in the top bar or the map controls. Reports are unverified, coarsened for privacy, and reviewed before they appear as corroborated context.",
  },
];

export default function FaqPage() {
  return (
    <ContentPage
      breadcrumb="FAQ"
      title="Frequently asked questions"
      lede="Straight answers about what RiskSense does, what it cannot do, and how to read what you see."
    >
      <Section title="Questions">
        <div className="space-y-2.5">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-[var(--r-md)] border border-line bg-white px-4 py-3"
            >
              <summary className="cursor-pointer list-none text-[13.5px] font-medium text-ink marker:content-none">
                <span className="flex items-center justify-between gap-3">
                  {f.q}
                  <span className="text-ink-3 transition-transform group-open:rotate-90">›</span>
                </span>
              </summary>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section title="Still unsure?">
        <Card>
          <p className="text-[13px] leading-relaxed text-ink-2">
            Read the{" "}
            <Link href="/methodology" className="text-navy-3 underline underline-offset-2">
              methodology
            </Link>{" "}
            for how events are normalized, or the{" "}
            <Link href="/sources" className="text-navy-3 underline underline-offset-2">
              data source directory
            </Link>{" "}
            for licenses and cadences.
          </p>
        </Card>
      </Section>
    </ContentPage>
  );
}
