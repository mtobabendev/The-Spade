import { haversineMiles, type LatLng } from "./geo";

export type AaFeed = {
  id: string;
  name: string;
  url: string;
  lat: number;
  lng: number;
  radiusMiles: number;
};

/** Public Meeting Guide / 12-step-meeting-list JSON feeds. Add cities as we learn them. */
export const AA_FEEDS: AaFeed[] = [
  {
    id: "omaha",
    name: "Omaha Metro Intergroup",
    url: "https://www.omahaaa.org/wp-admin/admin-ajax.php?action=meetings",
    lat: 41.2565,
    lng: -95.9345,
    radiusMiles: 45,
  },
  {
    id: "area41",
    name: "Nebraska Area 41",
    url: "https://www.area41.org/wp-admin/admin-ajax.php?action=meetings",
    lat: 41.5,
    lng: -99.75,
    radiusMiles: 280,
  },
  {
    id: "denver",
    name: "Denver Central Office",
    url: "https://www.daccaa.org/wp-admin/admin-ajax.php?action=meetings",
    lat: 39.7392,
    lng: -104.9903,
    radiusMiles: 60,
  },
  {
    id: "minneapolis",
    name: "Minneapolis Intergroup",
    url: "https://www.aaminneapolis.org/wp-admin/admin-ajax.php?action=meetings",
    lat: 44.9778,
    lng: -93.265,
    radiusMiles: 50,
  },
  {
    id: "stl",
    name: "St. Louis Central Service",
    url: "https://www.aastl.org/wp-admin/admin-ajax.php?action=meetings",
    lat: 38.627,
    lng: -90.1994,
    radiusMiles: 50,
  },
];

export const BMLT_SEARCH =
  "https://aggregator.bmltenabled.org/main_server/client_interface/json/";

export function feedsNear(origin: LatLng, limit = 2): AaFeed[] {
  const ranked = AA_FEEDS.map((feed) => ({
    feed,
    miles: haversineMiles(origin, { lat: feed.lat, lng: feed.lng }),
  }))
    .filter((row) => row.miles <= row.feed.radiusMiles)
    .sort((a, b) => a.miles - b.miles);
  const local = ranked.filter((row) => row.feed.radiusMiles <= 80);
  return (local.length ? local : ranked).slice(0, limit).map((row) => row.feed);
}

export const USER_AGENT = "TheSpade-Meetings/1.0 (recovery meeting finder; not affiliated with AA or NA)";
