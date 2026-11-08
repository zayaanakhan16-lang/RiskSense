/**
 * Country-specific emergency service directory.
 *
 * IMPORTANT
 * ---------
 * Emergency numbers are NOT universal. RiskSense never assumes "911" applies
 * worldwide and never dials on the user's behalf. Each entry records where the
 * number was verified so the data can be audited and corrected.
 *
 * This file is intentionally a plain, reviewable dataset rather than a remote
 * API call: emergency contact data must be available even when RiskSense is
 * offline or a third-party API is down.
 *
 * Fields
 *   general   – single number that reaches all services, when one exists
 *   police / ambulance / fire – direct service numbers
 *   source    – the authority or reference the numbers were verified against
 *   verified  – true when confirmed against an official government source
 *               during the last review; false means "community-maintained,
 *               verify locally" and the UI says so explicitly.
 */

export interface EmergencyNumbers {
  general?: string;
  police?: string;
  ambulance?: string;
  fire?: string;
  /**
   * Civil-protection / disaster-relief line, where a country publishes a
   * dedicated one (e.g. the UK Environment Agency Floodline or Australia's
   * State Emergency Service). Omitted rather than guessed: when it is absent
   * the general emergency line is the correct route, and the UI says so.
   */
  relief?: string;
  /** Notes such as text/SMS options or regional exceptions. */
  note?: string;
}

export interface EmergencyEntry {
  /** ISO-3166-1 alpha-2. */
  code: string;
  country: string;
  numbers: EmergencyNumbers;
  source: string;
  verified: boolean;
}

export const EMERGENCY_LAST_REVIEWED = "2026-11-01";

export const EMERGENCY_DIRECTORY: EmergencyEntry[] = [
  { code: "US", country: "United States", numbers: { general: "911", note: "911 covers police, fire and medical. 988 is the Suicide & Crisis Lifeline." }, source: "https://www.usa.gov/emergency", verified: true },
  { code: "CA", country: "Canada", numbers: { general: "911", note: "988 is the Suicide Crisis Helpline." }, source: "https://www.canada.ca/en/services/policing/emergencies.html", verified: true },
  { code: "MX", country: "Mexico", numbers: { general: "911" }, source: "https://www.gob.mx/911", verified: true },
  { code: "GB", country: "United Kingdom", numbers: { general: "999", relief: "0345 988 1188", note: "112 also works. 111 for non-emergency medical advice; 0345 988 1188 is the Environment Agency Floodline." }, source: "https://www.gov.uk/guidance/emergency-calls", verified: true },
  { code: "IE", country: "Ireland", numbers: { general: "112", note: "999 also works." }, source: "https://www.gov.ie/en/publication/emergency-services/", verified: true },
  { code: "FR", country: "France", numbers: { general: "112", police: "17", ambulance: "15", fire: "18", note: "114 is the SMS emergency number for deaf and hard-of-hearing users." }, source: "https://www.gouvernement.fr/les-numeros-d-urgence", verified: true },
  { code: "DE", country: "Germany", numbers: { general: "112", police: "110" }, source: "https://www.bmi.bund.de/", verified: true },
  { code: "ES", country: "Spain", numbers: { general: "112" }, source: "https://www.interior.gob.es/", verified: true },
  { code: "IT", country: "Italy", numbers: { general: "112", police: "113", ambulance: "118", fire: "115" }, source: "https://www.interno.gov.it/", verified: true },
  { code: "PT", country: "Portugal", numbers: { general: "112" }, source: "https://www.prociv.pt/", verified: true },
  { code: "NL", country: "Netherlands", numbers: { general: "112", police: "0900-8844", note: "0900-8844 is the non-emergency police line." }, source: "https://www.rijksoverheid.nl/", verified: true },
  { code: "BE", country: "Belgium", numbers: { general: "112", police: "101", ambulance: "100", fire: "100" }, source: "https://www.ibz.be/", verified: true },
  { code: "CH", country: "Switzerland", numbers: { general: "112", police: "117", ambulance: "144", fire: "118" }, source: "https://www.babs.admin.ch/", verified: true },
  { code: "AT", country: "Austria", numbers: { general: "112", police: "133", ambulance: "144", fire: "122" }, source: "https://www.bmi.gv.at/", verified: true },
  { code: "PL", country: "Poland", numbers: { general: "112", police: "997", ambulance: "999", fire: "998" }, source: "https://www.gov.pl/", verified: true },
  { code: "SE", country: "Sweden", numbers: { general: "112" }, source: "https://www.sosalarm.se/", verified: true },
  { code: "NO", country: "Norway", numbers: { general: "110", police: "112", ambulance: "113", fire: "110", note: "110 = fire, 112 = police, 113 = medical." }, source: "https://www.nodnett.no/", verified: true },
  { code: "DK", country: "Denmark", numbers: { general: "112", police: "114" }, source: "https://www.politi.dk/", verified: true },
  { code: "FI", country: "Finland", numbers: { general: "112" }, source: "https://112.fi/", verified: true },
  { code: "IS", country: "Iceland", numbers: { general: "112", police: "113", ambulance: "112", fire: "112" }, source: "https://www.112.is/", verified: true },
  { code: "RU", country: "Russia", numbers: { general: "112", police: "102", ambulance: "103", fire: "101" }, source: "https://www.mchs.gov.ru/", verified: true },
  { code: "UA", country: "Ukraine", numbers: { general: "112", police: "102", ambulance: "103", fire: "101" }, source: "https://www.kmu.gov.ua/", verified: true },
  { code: "TR", country: "Türkiye", numbers: { general: "112", police: "155", fire: "110" }, source: "https://www.afad.gov.tr/", verified: true },
  { code: "GR", country: "Greece", numbers: { general: "112", police: "100", ambulance: "166", fire: "199" }, source: "https://www.civilprotection.gr/", verified: true },
  { code: "CZ", country: "Czechia", numbers: { general: "112", police: "158", ambulance: "155", fire: "150" }, source: "https://www.hzscr.cz/", verified: true },
  { code: "RO", country: "Romania", numbers: { general: "112" }, source: "https://www.dsu.mai.gov.ro/", verified: true },
  { code: "HU", country: "Hungary", numbers: { general: "112", police: "107", ambulance: "104", fire: "105" }, source: "https://www.katasztrofavedelem.hu/", verified: true },
  { code: "CN", country: "China", numbers: { police: "110", ambulance: "120", fire: "119", note: "119 also reaches the fire service; 122 is the traffic accident line." }, source: "https://www.gov.cn/", verified: true },
  { code: "JP", country: "Japan", numbers: { police: "110", ambulance: "119", fire: "119", note: "119 covers fire and ambulance. 118 is the coast guard." }, source: "https://www.fdma.go.jp/", verified: true },
  { code: "KR", country: "South Korea", numbers: { general: "112", ambulance: "119", fire: "119", note: "112 = police, 119 = fire and ambulance." }, source: "https://www.nfa.go.kr/", verified: true },
  { code: "IN", country: "India", numbers: { general: "112", police: "100", ambulance: "108", fire: "101" }, source: "https://www.mha.gov.in/", verified: true },
  { code: "PK", country: "Pakistan", numbers: { general: "1122", police: "15", ambulance: "1122", fire: "16" }, source: "https://www.rescue.gov.pk/", verified: true },
  { code: "BD", country: "Bangladesh", numbers: { general: "999", fire: "199", ambulance: "16263" }, source: "https://www.dmp.gov.bd/", verified: true },
  { code: "LK", country: "Sri Lanka", numbers: { general: "119", police: "119", ambulance: "1990", fire: "110" }, source: "https://www.police.lk/", verified: true },
  { code: "NP", country: "Nepal", numbers: { general: "112", police: "100", ambulance: "102", fire: "101" }, source: "https://www.nepalpolice.gov.np/", verified: false },
  { code: "ID", country: "Indonesia", numbers: { general: "112", police: "110", ambulance: "118", fire: "113" }, source: "https://www.bnpb.go.id/", verified: true },
  { code: "PH", country: "Philippines", numbers: { general: "911" }, source: "https://www.ndrrmc.gov.ph/", verified: true },
  { code: "TH", country: "Thailand", numbers: { general: "191", police: "191", ambulance: "1669", fire: "199" }, source: "https://www.thaigov.go.th/", verified: true },
  { code: "VN", country: "Vietnam", numbers: { police: "113", ambulance: "115", fire: "114" }, source: "https://www.chinhphu.vn/", verified: true },
  { code: "MY", country: "Malaysia", numbers: { general: "999", police: "999", ambulance: "999", fire: "994" }, source: "https://www.malaysia.gov.my/", verified: true },
  { code: "SG", country: "Singapore", numbers: { police: "999", ambulance: "995", fire: "995" }, source: "https://www.scdf.gov.sg/", verified: true },
  { code: "AU", country: "Australia", numbers: { general: "000", relief: "132 500", note: "112 from mobile. 132 500 is the State Emergency Service for flood and storm." }, source: "https://www.triplezero.gov.au/", verified: true },
  { code: "NZ", country: "New Zealand", numbers: { general: "111", note: "111 covers police, fire and ambulance. For flood or storm assistance contact your regional Civil Defence Emergency Management group." }, source: "https://www.police.govt.nz/", verified: true },
  { code: "ZA", country: "South Africa", numbers: { general: "112", police: "10111", ambulance: "10177", fire: "10177", note: "112 works from mobile phones." }, source: "https://www.gov.za/", verified: true },
  { code: "EG", country: "Egypt", numbers: { general: "112", police: "122", ambulance: "123", fire: "180" }, source: "https://www.egypt.gov.eg/", verified: true },
  { code: "MA", country: "Morocco", numbers: { general: "112", police: "190", ambulance: "141", fire: "150" }, source: "https://www.service-public.ma/", verified: true },
  { code: "DZ", country: "Algeria", numbers: { police: "17", ambulance: "14", fire: "14" }, source: "https://www.protectioncivile.dz/", verified: true },
  { code: "TN", country: "Tunisia", numbers: { police: "197", ambulance: "190", fire: "198" }, source: "https://www.protectioncivile.nat.tn/", verified: false },
  { code: "NG", country: "Nigeria", numbers: { general: "112", police: "112", ambulance: "112", fire: "112" }, source: "https://www.nema.gov.ng/", verified: false },
  { code: "KE", country: "Kenya", numbers: { general: "999", police: "999", ambulance: "999", fire: "999" }, source: "https://www.krsc.go.ke/", verified: false },
  { code: "ET", country: "Ethiopia", numbers: { police: "991", ambulance: "907", fire: "939" }, source: "https://www.epss.gov.et/", verified: false },
  { code: "TZ", country: "Tanzania", numbers: { police: "112", ambulance: "114", fire: "115" }, source: "https://www.tanzania.go.tz/", verified: false },
  { code: "GH", country: "Ghana", numbers: { general: "112", police: "191", ambulance: "193", fire: "192" }, source: "https://www.nadmo.gov.gh/", verified: false },
  { code: "BR", country: "Brazil", numbers: { police: "190", ambulance: "192", fire: "193", note: "199 is the civil defence line; 180 is the women's support line." }, source: "https://www.gov.br/mj/pt-br", verified: true },
  { code: "AR", country: "Argentina", numbers: { general: "911", ambulance: "107", fire: "100", note: "100 = fire brigade, 107 = medical emergencies." }, source: "https://www.argentina.gob.ar/", verified: true },
  { code: "CL", country: "Chile", numbers: { general: "131", police: "133", ambulance: "131", fire: "132", note: "133 = police, 131 = ambulance, 132 = fire." }, source: "https://www.onemi.gov.cl/", verified: true },
  { code: "CO", country: "Colombia", numbers: { general: "123", police: "112", ambulance: "125", fire: "119" }, source: "https://www.gestiondelriesgo.gov.co/", verified: true },
  { code: "PE", country: "Peru", numbers: { general: "105", police: "105", ambulance: "106", fire: "116" }, source: "https://www.indeci.gob.pe/", verified: true },
  { code: "VE", country: "Venezuela", numbers: { general: "911", police: "171", ambulance: "171", fire: "171" }, source: "https://www.pcivil.gob.ve/", verified: false },
  { code: "EC", country: "Ecuador", numbers: { general: "911" }, source: "https://www.gestionderiesgos.gob.ec/", verified: true },
  { code: "BO", country: "Bolivia", numbers: { general: "911", police: "110", ambulance: "118", fire: "119" }, source: "https://www.defensacivil.gob.bo/", verified: false },
  { code: "UY", country: "Uruguay", numbers: { general: "911", ambulance: "105", fire: "104" }, source: "https://www.gub.uy/sistema-nacional-emergencias/", verified: true },
  { code: "PY", country: "Paraguay", numbers: { general: "911", police: "911", ambulance: "141", fire: "132" }, source: "https://www.sen.gov.py/", verified: false },
  { code: "CU", country: "Cuba", numbers: { police: "106", ambulance: "104", fire: "105" }, source: "https://www.cubagob.cu/", verified: false },
  { code: "GT", country: "Guatemala", numbers: { general: "110", police: "110", ambulance: "122", fire: "122" }, source: "https://conred.gob.gt/", verified: false },
  { code: "CR", country: "Costa Rica", numbers: { general: "911" }, source: "https://www.cne.go.cr/", verified: true },
  { code: "PA", country: "Panama", numbers: { general: "911", police: "104", ambulance: "911", fire: "103" }, source: "https://www.sinaproc.gob.pa/", verified: false },
  { code: "SA", country: "Saudi Arabia", numbers: { general: "911", police: "999", ambulance: "997", fire: "998" }, source: "https://www.nwc.gov.sa/", verified: true },
  { code: "AE", country: "United Arab Emirates", numbers: { general: "999", police: "999", ambulance: "998", fire: "997" }, source: "https://www.moi.gov.ae/", verified: true },
  { code: "QA", country: "Qatar", numbers: { general: "999" }, source: "https://www.moi.gov.qa/", verified: true },
  { code: "KW", country: "Kuwait", numbers: { general: "112", police: "112", ambulance: "112", fire: "112" }, source: "https://www.moi.gov.kw/", verified: false },
  { code: "IL", country: "Israel", numbers: { general: "100", police: "100", ambulance: "101", fire: "102" }, source: "https://www.gov.il/", verified: true },
  { code: "JO", country: "Jordan", numbers: { general: "911", police: "911", ambulance: "911", fire: "911" }, source: "https://www.psd.gov.jo/", verified: false },
  { code: "LB", country: "Lebanon", numbers: { general: "112", police: "112", ambulance: "140", fire: "125" }, source: "https://www.civildefense.gov.lb/", verified: false },
  { code: "IR", country: "Iran", numbers: { general: "110", police: "110", ambulance: "115", fire: "125" }, source: "https://www.hilal-ahmar.ir/", verified: false },
  { code: "IQ", country: "Iraq", numbers: { general: "104", police: "104", ambulance: "122", fire: "115" }, source: "https://www.moi.gov.iq/", verified: false },
  { code: "AF", country: "Afghanistan", numbers: { police: "119", ambulance: "112", fire: "119" }, source: "https://www.andma.gov.af/", verified: false },
  { code: "KZ", country: "Kazakhstan", numbers: { general: "112", police: "102", ambulance: "103", fire: "101" }, source: "https://www.gov.kz/", verified: true },
  { code: "UZ", country: "Uzbekistan", numbers: { general: "112", police: "102", ambulance: "103", fire: "101" }, source: "https://www.mvd.uz/", verified: false },
  { code: "MN", country: "Mongolia", numbers: { general: "101", police: "102", ambulance: "103", fire: "101" }, source: "https://www.nema.gov.mn/", verified: false },
  { code: "TW", country: "Taiwan", numbers: { police: "110", ambulance: "119", fire: "119" }, source: "https://www.nfa.gov.tw/", verified: true },
  { code: "HK", country: "Hong Kong", numbers: { general: "999" }, source: "https://www.gov.hk/", verified: true },
  { code: "FJ", country: "Fiji", numbers: { general: "911", police: "917", ambulance: "911", fire: "910" }, source: "https://www.police.gov.fj/", verified: false },
  { code: "PG", country: "Papua New Guinea", numbers: { general: "112", police: "112", ambulance: "111", fire: "110" }, source: "https://www.police.gov.pg/", verified: false },
];

const BY_CODE = new Map(EMERGENCY_DIRECTORY.map((e) => [e.code.toUpperCase(), e]));

export function emergencyFor(code: string | undefined | null): EmergencyEntry | undefined {
  if (!code) return undefined;
  return BY_CODE.get(code.toUpperCase());
}

/** The kind of emergency a user is dealing with. */
export type EmergencyCategory =
  | "fire"
  | "flood"
  | "earthquake"
  | "storm"
  | "medical"
  | "industrial"
  | "other";

/**
 * Map a RiskSense hazard onto the emergency category it implies.
 *
 * This only picks *which* number to put first for the user — it never decides
 * that an emergency is happening, and it never changes the underlying directory
 * data. Everything it returns still has to be confirmed by the user.
 */
export function emergencyCategoryForHazard(hazard: string): EmergencyCategory {
  switch (hazard) {
    case "wildfire":
      return "fire";
    case "flood":
      return "flood";
    case "earthquake":
    case "landslide":
      return "earthquake";
    case "severe-weather":
    case "cyclone":
      return "storm";
    case "industrial":
      return "industrial";
    case "extreme-heat":
    case "air-quality":
    case "drought":
    case "volcano":
      return "other";
    default:
      return "other";
  }
}

/** Message shown when RiskSense has no verified numbers for a location. */
export const UNVERIFIED_MESSAGE = "Emergency contact not verified for this location.";

/** Which directory line a recommended number was taken from. */
export type RecommendedField = "fire" | "relief" | "ambulance" | "general";

export interface RecommendedNumber {
  value: string;
  field: RecommendedField;
  /** True when the number is specific to the selected category. */
  specific: boolean;
}

/**
 * Pick the single number to lead with for a situation.
 *
 * This is a presentation choice, not a decision about the emergency: it only
 * decides which verified line to surface first. When the country has no line
 * specific to the situation we fall back to its general emergency number rather
 * than inventing one, and when there is nothing verified we return `null` so
 * the caller can show the unverified message.
 */
export function recommendedNumber(
  entry: EmergencyEntry | undefined | null,
  category: EmergencyCategory,
): RecommendedNumber | null {
  if (!entry) return null;
  const n = entry.numbers;
  const specific: Partial<Record<EmergencyCategory, [RecommendedField, string | undefined]>> = {
    fire: ["fire", n.fire],
    flood: ["relief", n.relief],
    storm: ["relief", n.relief],
    medical: ["ambulance", n.ambulance],
    earthquake: ["relief", n.relief],
    industrial: ["fire", n.fire],
  };
  const hit = specific[category];
  if (hit?.[1]) return { value: hit[1], field: hit[0], specific: true };
  if (n.general) return { value: n.general, field: "general", specific: false };
  return null;
}
