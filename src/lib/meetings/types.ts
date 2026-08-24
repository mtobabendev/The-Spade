export type Fellowship = "aa" | "na";

export type VenueKind = "in_person" | "online" | "hybrid";

export type Meeting = {
  id: string;
  fellowship: Fellowship;
  name: string;
  location: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  distanceMiles: number | null;
  day: number;
  time: string;
  timeLabel: string;
  timezone: string;
  venue: VenueKind;
  women: boolean;
  open: boolean;
  wheelchair: boolean;
  url: string;
  mapsUrl: string | null;
  sourceName: string;
  startsAtMs: number;
  minutesUntil: number;
  live: boolean;
};

export type SearchMeetingsInput = {
  lat?: number;
  lng?: number;
  query?: string;
  fellowship?: "aa" | "na" | "both";
  radiusMiles?: number;
  nowMs?: number;
  timeZone?: string;
};

export type SearchMeetingsResult = {
  ok: true;
  origin: { lat: number; lng: number; label: string };
  radiusMiles: number;
  meetings: Meeting[];
  sources: { id: string; name: string; ok: boolean; detail?: string }[];
};

export type SearchMeetingsFailure = {
  ok: false;
  error: string;
};
