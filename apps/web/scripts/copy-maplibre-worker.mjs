/**
 * Copies the MapLibre GL JS worker into `public/` so it can be served as a
 * static asset.
 *
 * MapLibre resolves its worker URL from `import.meta.url`, which bundlers
 * (Next.js/Turbopack/webpack) rewrite to a path where the worker no longer
 * exists. The map then fails with "Worker failed to load" and draws nothing.
 * Serving the worker from a known URL and calling `setWorkerUrl()` fixes it.
 *
 * The output is generated, but it is committed so it is present even when the
 * build scripts are not run. Re-run this after upgrading `maplibre-gl`.
 */
import { createRequire } from "node:module";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

const pkgPath = require.resolve("maplibre-gl/package.json");
const src = join(dirname(pkgPath), "dist", "maplibre-gl-worker.mjs");
const destDir = join(here, "..", "public");
const dest = join(destDir, "maplibre-gl-worker.mjs");

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);

console.log(`Copied MapLibre worker -> ${dest}`);
