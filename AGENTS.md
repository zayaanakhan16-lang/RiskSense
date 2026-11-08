# AGENTS.md — RiskSense repository notes

## What this is
Multi-hazard global emergency intelligence platform. Next.js 15 (App Router) +
TypeScript + Tailwind, MapLibre GL with globe projection, pnpm/npm workspaces
with `packages/shared`, `packages/data-sources`, `packages/hazard-engine`.

## Commands
- Dev / prod: `cd apps/web && npm run dev` (or `npx next start -p 12000 -H 0.0.0.0`)
- Build: `cd apps/web && npm run build`
- Typecheck: `cd apps/web && npx tsc --noEmit`
- Lint: `cd apps/web && npx eslint src` (must stay clean)
- Tests: `npm run test` from the repo root (node:test; `apps/web/tests/*.test.ts`).
  Workspace symlinks (`node_modules/@risksense/*`) must exist, so run `npm install`
  at the root first — a bare `npm install` inside `apps/web` does not create them.

## Deploying to Vercel
- `apps/web/vercel.json` is the only config. Leave the Vercel project **Root
  Directory empty** (repo root); the install/build commands there `cd ../..` so
  the monorepo installs and builds as a workspace. No env vars are required.
- **Do not set Root Directory to `apps/web`.** Vercel does not reliably honour
  the custom `installCommand` for a nested root, and the `@risksense/*` workspace
  packages then fail to resolve.
- Vercel **blocks the build outright** when the Next.js version is affected by a
  security advisory ("Vulnerable version of Next.js detected"). The fix is to
  bump `next`/`eslint-config-next`; the patched 15.5.x line is published under
  the `backport` dist-tag (`npm view next dist-tags`). Pinned at 15.5.29.
- Live deployment: https://risk-sense12.vercel.app (verified: 1,300+ events from
  5 keyless sources, globe renders, no console errors).

## MapLibre worker (v6)
- MapLibre v6 derives its worker URL from `import.meta.url`, which bundlers
  rewrite to a path where the worker does not exist. The map then logs
  "Worker failed to load" and draws nothing, while the build still passes.
- `apps/web/scripts/copy-maplibre-worker.mjs` copies the worker into `public/`
  (wired as `prebuild`/`predev`), and `MapView` calls `setWorkerUrl()` to point
  at `/maplibre-gl-worker.mjs`. The copied file is committed so it exists even
  when the scripts do not run, and it is excluded from eslint (generated).
- Re-run the copy script after any `maplibre-gl` upgrade.

## Map rendering (learned the hard way)
- `apps/web/src/lib/mapIcons.ts` builds marker sprites. Hazard markers are
  **emoji-first** (real colour emoji with a white keyline, FireSight-style)
  with a drawn vector silhouette fallback when no colour-emoji font exists.
  Requires a colour-emoji font at runtime (`fonts-noto-color-emoji`).
- Sprite registration iterates `HAZARD_ORDER`, **not** `Object.keys(hazardMeta)`
  — `hazardMeta` is a function, so iterating it silently registers zero sprites
  and MapLibre logs "Image ... could not be loaded" for every marker.
- Density is carried by a **per-hazard heatmap glow field** (`rs-heat-<hazard>`,
  one layer per hazard family, ramp from `hazardHeatRamp()`), mirroring
  FireSight's "burning Earth" field generalised per hazard. Markers are small at
  world zoom (icon-size ~0.34) and grow on zoom-in (heatmap fades out by z7).
- **Do not re-enable clustering.** Points must reach the heatmap source; a
  `cluster: true` GeoJSON source strips individual points at low zoom and the
  glow field goes blank.

## Data honesty
- Never fabricate events, counts, severity or coordinates. Adapters only
  normalise real upstream data; empty/degraded/stale states are shown as such.
- `SourceStatus.state` is `ok | degraded | unavailable | not-configured` and is
  surfaced in `SourceStatusBar` and `SourcesModal`.
- Emergency numbers are country-specific and flagged `verified` in
  `packages/shared/emergency-data.ts`; unverified locations must say so.
- AI never promotes an event to "confirmed" or "official warning" — only the
  issuing authority's own classification does.

## Verification
- Headless browser check (Playwright, chromium + `--use-gl=swiftshader`) against
  `http://localhost:12000/` catches MapLibre console errors that a build passes
  over. Always read the console for `styleimagemissing` warnings.

## Community reports (FireSight-style reporting)
- "Report on this area" is a **map-anchored** flow: right-click (desktop) or a
  550 ms long-press (touch) calls `MapView.onPickPoint`, which opens
  `ReportContextMenu` at that screen position. The picked coordinate is passed
  to `ReportModal` as `initialPoint` and dropped as a pin layer (`rs-picked`),
  so the report is visibly tied to a place, not to the map centre.
- The same menu adds an alert area straight from the picked point
  (`alerts.addArea`), matching FireSight's "alert this area".
- Reports are read from `GET /api/reports` into `RiskSenseApp.reports` and
  rendered as `rs-report-points` pins (sprite `rs-report-marker`, emergency
  orange, dashed collar — never a hazard colour). Clicking a pin opens
  `ReportDetails`; the feed has a **Community reports** tab for the same data.
- `ReportDetails` and the feed tab both lead with the unverified status. A
  community report is never a detection and never an official warning.
- `GET /api/reports` strips `reporterToken` before responding — it is anonymous,
  but publishing it would let anyone link one submitter's reports together.
- Report and hazard selections are mutually exclusive: selecting an event clears
  the report and vice versa, so two detail panels never fight for the same slot.
- Persistence: `supabase/migrations/0001_community_reports.sql` defines the
  `community_reports` table with RLS. Anon may insert only as `pending` and may
  select everything except `rejected`; there is no anon update/delete policy.
  Without Supabase credentials the store falls back to in-memory.

## Serving locally
- Run the server from `apps/web`, not the repo root: `npx next start -p 12000`.
  From the repo root Next cannot find `.next` and exits with
  "Could not find a production build".
