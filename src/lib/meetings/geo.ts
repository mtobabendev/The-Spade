export type LatLng = { lat: number; lng: number };

const EARTH_MILES = 3958.8;

export function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineMiles(a: LatLng, b: LatLng) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function coerceLatLng(lat: unknown, lng: unknown): LatLng | null {
  const a = asFiniteNumber(lat);
  const b = asFiniteNumber(lng);
  if (a == null || b == null || Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return { lat: a, lng: b };
}

export const OMAHA: LatLng & { label: string } = {
  lat: 41.2565,
  lng: -95.9345,
  label: "Omaha, NE",
};
