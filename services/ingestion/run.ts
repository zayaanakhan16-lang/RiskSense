/**
 * Headless ingestion runner.
 *
 * Fetches every registered hazard source through the same aggregation path the
 * web API uses, then writes one snapshot to disk. It is the batch counterpart to
 * `/api/events`: useful for cron jobs, archival, and for environments that want
 * a local copy of the current picture without running the web app.
 *
 *   npm run ingest
 *
 * Environment
 *   INGESTION_OUTPUT_DIR  directory for the snapshot (default ./data/local)
 *   INGESTION_WINDOW      hours of history to include (default 24)
 *   FIRMS_MAP_KEY         optional; without it the FIRMS archives are read
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { aggregateEvents } from "@risksense/hazard-engine";
import type { HazardEvent } from "@risksense/shared";

const outDir = resolve(process.env.INGESTION_OUTPUT_DIR ?? "./data/local");
const windowHours = Number.parseInt(process.env.INGESTION_WINDOW ?? "24", 10) || 24;

function countBy(events: HazardEvent[], key: (e: HazardEvent) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) {
    const k = key(e);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const data = await aggregateEvents({
    windowHours,
    firmsMapKey: process.env.FIRMS_MAP_KEY,
  });

  const snapshot = {
    generatedAt: data.generatedAt,
    windowHours: data.windowHours,
    total: data.total,
    byHazard: countBy(data.events, (e) => e.hazard),
    bySource: countBy(data.events, (e) => e.source.id),
    sources: data.sources,
    warnings: data.warnings,
    events: data.events,
  };

  await mkdir(outDir, { recursive: true });
  const latest = resolve(outDir, "latest.json");
  await writeFile(latest, JSON.stringify(snapshot, null, 2), "utf8");

  // A timestamped copy preserves history between runs.
  const stamped = resolve(outDir, `events-${data.generatedAt.replace(/[:.]/g, "-")}.json`);
  await writeFile(stamped, JSON.stringify(snapshot), "utf8");

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`RiskSense ingestion — ${data.total} events in ${elapsed}s`);
  console.log(`  by hazard: ${JSON.stringify(snapshot.byHazard)}`);
  for (const s of data.sources) {
    const n = snapshot.bySource[s.id] ?? 0;
    console.log(`  [${s.state.padEnd(14)}] ${s.id} (${n})${s.message ? ` — ${s.message}` : ""}`);
  }
  if (data.warnings.length) {
    console.log(`  warnings: ${data.warnings.join("; ")}`);
  }
  console.log(`  written: ${latest}`);

  const everySourceDown =
    data.sources.length > 0 && data.sources.every((s) => s.state !== "ok");
  if (everySourceDown) {
    console.error("Every source is degraded or unavailable — check outbound network access.");
    process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
