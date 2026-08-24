import { coerceLatLng, haversineMiles, type LatLng } from "./geo";
import { formatTimeLabel, nextMeetingTiming } from "./when";
import type { Meeting, VenueKind } from "./types";

function decodeEntities(value: string) {
  return value
    .replace(/\u0026amp;/g, "\u0026")
    .replace(/\u0026lt;/g, "<")
    .replace(/\u0026gt;/g, ">")
    .replace(/\u0026quot;/g, '"')
    .replace(/\u0026#39;/g, "'")
    .replace(/\u0026nbsp;/g, " ");
}

function asString(value: unknown) {
  return typeof value === "string" ? decodeEntities(value) : value == null ? "" : decodeEntities(String(value));
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function typeList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => asString(v).toUpperCase()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[,/|]/)
      .map((v) => v.trim().toUpperCase())
      .filter(Boolean);
  }
  return [];
}

function venueFromAttendance(value: unknown, types: string[]): VenueKind {
  const v = asString(value).toLowerCase();
  if (v === "online" || v === "virtual") return "online";
  if (v === "hybrid") return "hybrid";
  if (types.includes("ONL") || types.includes("OL")) return "online";
  return "in_person";
}

function mapsUrl(lat: number | null, lng: number | null, address: string) {
  if (lat != null && lng != null) return `https://maps.google.com/?q=${lat},${lng}`;
  if (address) return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  return null;
}

function womenFrom(name: string, types: string[]) {
  if (types.includes("W") || types.includes("WOMEN")) return true;
  return /\bwomen|\bwomens|\bwomen's/i.test(name);
}

export function fromTsml(
  raw: Record<string, unknown>,
  origin: LatLng,
  nowMs: number,
  timeZone: string,
  sourceName: string,
  radiusMiles: number,
): Meeting | null {
  const attendance = asString(raw.attendance_option).toLowerCase();
  if (attendance === "inactive") return null;
  const day = asNumber(raw.day);
  const time = asString(raw.time);
  if (day == null || !time) return null;
  const coords = coerceLatLng(raw.latitude, raw.longitude);
  const distanceMiles = coords ? haversineMiles(origin, coords) : null;
  if (distanceMiles != null && distanceMiles > radiusMiles) return null;
  const tz = asString(raw.timezone) || timeZone;
  const timing = nextMeetingTiming(day, time, nowMs, tz);
  if (!timing) return null;
  const types = typeList(raw.types);
  const name = asString(raw.name) || "Meeting";
  const address = asString(raw.formatted_address);
  const location = asString(raw.location) || asString(raw.group) || address;
  return {
    id: `aa-${asString(raw.id) || asString(raw.slug) || `${name}-${day}-${time}`}`,
    fellowship: "aa",
    name,
    location,
    address,
    city: asString(raw.region) || asString(raw.source_region),
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    distanceMiles,
    day,
    time,
    timeLabel: asString(raw.time_formatted) || formatTimeLabel(time),
    timezone: tz,
    venue: venueFromAttendance(raw.attendance_option, types),
    women: womenFrom(name, types),
    open: types.includes("O") && !types.includes("C"),
    wheelchair: types.includes("X") || types.includes("XB"),
    url: asString(raw.url),
    mapsUrl: mapsUrl(coords?.lat ?? null, coords?.lng ?? null, address),
    sourceName,
    startsAtMs: timing.startsAtMs,
    minutesUntil: timing.minutesUntil,
    live: timing.live,
  };
}

function bmltDay(value: unknown) {
  const n = asNumber(value);
  if (n == null) return null;
  // BMLT: 1 = Sunday … 7 = Saturday
  if (n >= 1 && n <= 7) return n - 1;
  if (n >= 0 && n <= 6) return n;
  return null;
}

function bmltVenue(value: unknown, formats: string[]): VenueKind {
  const n = asNumber(value);
  if (n === 2) return "online";
  if (n === 3) return "hybrid";
  if (formats.includes("VM") || formats.includes("TC")) return "online";
  return "in_person";
}

export function fromBmlt(
  raw: Record<string, unknown>,
  origin: LatLng,
  nowMs: number,
  timeZone: string,
  radiusMiles: number,
): Meeting | null {
  const day = bmltDay(raw.weekday_tinyint);
  const time = asString(raw.start_time);
  if (day == null || !time) return null;
  const coords = coerceLatLng(raw.latitude, raw.longitude);
  const reported = asNumber(raw.distance_in_miles);
  const distanceMiles = coords ? haversineMiles(origin, coords) : reported;
  if (distanceMiles != null && distanceMiles > radiusMiles) return null;
  const formats = typeList(raw.formats);
  const name = asString(raw.meeting_name) || "NA Meeting";
  const street = asString(raw.location_street);
  const city = asString(raw.location_municipality);
  const province = asString(raw.location_province);
  const zip = asString(raw.location_postal_code_1);
  const address = [street, city, province, zip].filter(Boolean).join(", ");
  const location = asString(raw.location_text) || address;
  const tz = asString(raw.time_zone) || timeZone;
  const timing = nextMeetingTiming(day, time, nowMs, tz);
  if (!timing) return null;
  const virtual = asString(raw.virtual_meeting_link);
  const venue = bmltVenue(raw.venue_type, formats);
  return {
    id: `na-${asString(raw.id_bigint) || asString(raw.worldid_mixed) || `${name}-${day}-${time}`}`,
    fellowship: "na",
    name,
    location,
    address,
    city,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    distanceMiles,
    day,
    time,
    timeLabel: formatTimeLabel(time),
    timezone: tz,
    venue: virtual && venue === "in_person" ? "hybrid" : venue,
    women: womenFrom(name, formats),
    open: formats.includes("O") && !formats.includes("C"),
    wheelchair: formats.includes("WC") || formats.includes("WCHR"),
    url: virtual || asString(raw.root_server_uri) || "https://www.na.org/meetingsearch/",
    mapsUrl: mapsUrl(coords?.lat ?? null, coords?.lng ?? null, address),
    sourceName: asString(raw.service_body_name) || "BMLT (NA)",
    startsAtMs: timing.startsAtMs,
    minutesUntil: timing.minutesUntil,
    live: timing.live,
  };
}

export function sortMeetings(meetings: Meeting[]) {
  return [...meetings].sort((a, b) => {
    if (a.live !== b.live) return a.live ? -1 : 1;
    if (a.minutesUntil !== b.minutesUntil) return a.minutesUntil - b.minutesUntil;
    const da = a.distanceMiles ?? 9999;
    const db = b.distanceMiles ?? 9999;
    return da - db;
  });
}

export function dedupeMeetings(meetings: Meeting[]) {
  const seen = new Set<string>();
  const out: Meeting[] = [];
  for (const m of meetings) {
    const key = [
      m.fellowship,
      m.name.toLowerCase().replace(/\s+/g, " ").trim(),
      m.day,
      m.time,
      m.address.toLowerCase().slice(0, 40),
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}
