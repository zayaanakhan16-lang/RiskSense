import type { Metadata } from "next";
import Link from "next/link";
import ContentPage, { Callout, Card, Section } from "@/components/ContentPage";
import { ADAPTERS } from "@risksense/data-sources";
import { hazardMeta } from "@risksense/shared";

export const metadata: Metadata = {
  title: "Data Sources",
  description:
    "Every data source RiskSense reads, with its license, cadence and the hazards it contributes.",
};

export const revalidate = 3600;

export default function SourcesPage() {
  return (
    <ContentPage
      breadcrumb="Data Sources"
      title="Data source directory"
      lede="RiskSense reads data that public agencies and open projects already publish. This directory lists every source, what it contributes, how often it updates, and the terms under which it is used."
    >
      <Callout tone="info" title="Licenses belong to the publishers">
        Open-source code does not make third-party data open for unrestricted redistribution. Each
        source below remains governed by its own terms. RiskSense presents the data with attribution
        and links back to the original record.
      </Callout>

      <Section title="Registered sources">
        <div className="space-y-3">
          {ADAPTERS.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[14px] font-semibold text-ink underline underline-offset-2 hover:text-navy-3"
                  >
                    {a.name}
                  </a>
                  <p className="rs-tabular mt-0.5 font-mono text-[11px] text-ink-3">{a.id}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-[var(--r-pill)] bg-paper-2 px-2 py-0.5 text-[10.5px] font-medium text-ink-2">
                    ~{a.refreshMinutes} min
                  </span>
                  {a.requiresKey && (
                    <span className="rounded-[var(--r-pill)] bg-warn-soft px-2 py-0.5 text-[10.5px] font-medium text-[#854d0e]">
                      API key
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {a.hazards.map((h) => {
                  const meta = hazardMeta(h);
                  return (
                    <span
                      key={h}
                      className="rounded-[var(--r-xs)] px-1.5 py-0.5 text-[10.5px] font-medium"
                      style={{ backgroundColor: meta.soft, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  );
                })}
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
                <span className="font-medium text-ink">License:</span> {a.license}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Supporting services">
        <p>
          Alongside hazard feeds, RiskSense uses a small number of public supporting services. These
          are not hazard sources; they make the map usable.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Card>
            <p className="text-[13px] font-semibold text-ink">OpenFreeMap · OpenStreetMap</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              Basemap tiles and map style, built from OpenStreetMap data. Attribution is rendered on
              the map. Self-hosters can point RiskSense at their own tile server.
            </p>
          </Card>
          <Card>
            <p className="text-[13px] font-semibold text-ink">Open-Meteo geocoding</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              Forward geocoding for place search. Public, keyless, and used only to move the map.
            </p>
          </Card>
          <Card>
            <p className="text-[13px] font-semibold text-ink">Nominatim (OpenStreetMap)</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              Reverse geocoding to identify the country for a point, used for emergency numbers and
              alert context. Requests carry a descriptive user agent and are rate limited.
            </p>
          </Card>
          <Card>
            <p className="text-[13px] font-semibold text-ink">Overpass API (OpenStreetMap)</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              Nearby mapped hospitals, fire stations and police stations in the Emergency Assistance
              panel. These are directory listings, not availability information.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Adding a source">
        <p>
          A new hazard source is one file that satisfies the adapter interface and one line in the
          registry. See{" "}
          <Link href="/contribute" className="text-navy-3 underline underline-offset-2">
            Contribute
          </Link>{" "}
          and the{" "}
          <Link href="/methodology" className="text-navy-3 underline underline-offset-2">
            methodology
          </Link>
          .
        </p>
      </Section>
    </ContentPage>
  );
}
