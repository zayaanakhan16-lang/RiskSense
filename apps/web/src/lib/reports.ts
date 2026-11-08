import { getSupabase } from "./supabase";

/**
 * Community reports. Reports are citizen submissions and are ALWAYS marked
 * unverified until a moderator reviews them — they can never trigger a
 * dispatch or appear as an official warning.
 */

export type ReportCategory =
  | "fire-observed"
  | "flooding-observed"
  | "road-blocked"
  | "severe-damage"
  | "resource-needed"
  | "other";

export type ReportStatus = "pending" | "under-review" | "verified" | "rejected";

export interface CommunityReport {
  id: string;
  category: ReportCategory;
  /** Deliberately coarse: reports are never stored at full precision publicly. */
  lat: number;
  lon: number;
  place?: string;
  countryCode?: string;
  description: string;
  photoUrl?: string;
  createdAt: string;
  status: ReportStatus;
  /** Anonymous reporter token, never a real identity. */
  reporterToken: string;
  verified: false;
}

/** In-memory fallback used when Supabase is not configured (self-hosted default). */
const memory: CommunityReport[] = [];

export async function listReports(limit = 100): Promise<CommunityReport[]> {
  const supabase = getSupabase();
  if (!supabase) return memory.slice(0, limit);
  const { data, error } = await supabase
    .from("community_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return memory.slice(0, limit);
  return data.map(fromRow);
}

export async function insertReport(
  report: Omit<CommunityReport, "id" | "createdAt" | "status" | "verified">,
): Promise<CommunityReport> {
  const row = {
    category: report.category,
    lat: report.lat,
    lon: report.lon,
    place: report.place ?? null,
    country_code: report.countryCode ?? null,
    description: report.description,
    photo_url: report.photoUrl ?? null,
    reporter_token: report.reporterToken,
    status: "pending" as ReportStatus,
  };

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("community_reports")
      .insert(row)
      .select()
      .single();
    if (!error && data) return fromRow(data);
  }

  const created: CommunityReport = {
    id: crypto.randomUUID(),
    category: report.category,
    lat: report.lat,
    lon: report.lon,
    place: report.place,
    countryCode: report.countryCode,
    description: report.description,
    photoUrl: report.photoUrl,
    createdAt: new Date().toISOString(),
    status: "pending",
    reporterToken: report.reporterToken,
    verified: false,
  };
  memory.unshift(created);
  return created;
}

interface ReportRow {
  id: string;
  category: ReportCategory;
  lat: number;
  lon: number;
  place: string | null;
  country_code: string | null;
  description: string;
  photo_url: string | null;
  created_at: string;
  status: ReportStatus;
  reporter_token: string;
}

function fromRow(row: ReportRow): CommunityReport {
  return {
    id: row.id,
    category: row.category,
    lat: row.lat,
    lon: row.lon,
    place: row.place ?? undefined,
    countryCode: row.country_code ?? undefined,
    description: row.description,
    photoUrl: row.photo_url ?? undefined,
    createdAt: row.created_at,
    status: row.status,
    reporterToken: row.reporter_token,
    verified: false,
  };
}

/**
 * Reduce precision to ~1 km so a public report never exposes an exact private
 * address. The reporter's precise point is never persisted.
 */
export function coarsen(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
