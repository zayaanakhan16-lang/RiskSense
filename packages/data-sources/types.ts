import type { HazardEvent, SourceStatus } from "@risksense/shared";

export interface FetchContext {
  /** Window requested by the caller, in hours. */
  windowHours: number;
  /** Abort signal so a slow upstream cannot hold the whole aggregation. */
  signal?: AbortSignal;
  /** Optional API keys supplied by the host environment. */
  keys: {
    firmsMapKey?: string;
  };
}

export interface AdapterResult {
  events: HazardEvent[];
  /** Status snapshot for the freshness panel, even when the fetch failed. */
  status: SourceStatus;
}

/**
 * Contract every hazard data source implements. Adding a new source means
 * adding one file that satisfies this interface and registering it in
 * `registry.ts` — nothing else in the platform needs to change.
 */
export interface HazardAdapter {
  /** Stable machine id; also used as the SourceRef.id namespace. */
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly license: string;
  readonly hazards: readonly HazardEvent["hazard"][];
  /** Documented refresh cadence, in minutes. */
  readonly refreshMinutes: number;
  /** True when the adapter needs an API key to function. */
  readonly requiresKey: boolean;
  fetch(ctx: FetchContext): Promise<AdapterResult>;
}

/** Small helper so adapters can build a consistent status object. */
export function statusFor(
  adapter: Pick<
    HazardAdapter,
    "id" | "name" | "url" | "license" | "hazards" | "refreshMinutes" | "requiresKey"
  >,
  state: SourceStatus["state"],
  patch: Partial<SourceStatus> = {},
): SourceStatus {
  return {
    id: adapter.id,
    name: adapter.name,
    url: adapter.url,
    license: adapter.license,
    hazards: [...adapter.hazards],
    expectedRefreshMinutes: adapter.refreshMinutes,
    state,
    requiresKey: adapter.requiresKey,
    ...patch,
  };
}

/** Wraps fetch with a hard timeout so one dead upstream cannot stall the API. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 12_000, signal, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
