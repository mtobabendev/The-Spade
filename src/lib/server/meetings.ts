import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { BMLT_SEARCH, USER_AGENT, feedsNear } from "@/lib/meetings/feeds";
import { OMAHA, coerceLatLng } from "@/lib/meetings/geo";
import { dedupeMeetings, fromBmlt, fromTsml, sortMeetings } from "@/lib/meetings/normalize";
import type { Meeting, SearchMeetingsResult } from "@/lib/meetings/types";

const UA = { "User-Agent": USER_AGENT, Accept: "application/json" };

type CacheEntry = { at: number; data: unknown };
const cache = new Map<string, CacheEntry>();
const CACHE_MS = 30 * 60 * 1000;

async function fetchJson(url: string, timeoutMs = 10000): Promise<unknown> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as unknown;
    cache.set(url, { at: Date.now(), data });
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function geocode(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const zip = /^(\d{5})(?:-\d{4})?$/.exec(trimmed);
  const url = zip
    ? `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip[1])}&country=us&format=json&limit=1`
    : `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&countrycodes=us&format=json&limit=1`;
  const data = await fetchJson(url, 8000);
  if (!Array.isArray(data) || !data[0]) return null;
  const row = data[0] as { lat?: string; lon?: string; display_name?: string };
  const coords = coerceLatLng(row.lat, row.lon);
  if (!coords) return null;
  return { ...coords, label: row.display_name || trimmed };
}

function asRecords(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is Record<string, unknown> => !!row && typeof row === "object");
}

export const searchMeetings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      lat: z.number().optional(),
      lng: z.number().optional(),
      query: z.string().max(80).optional(),
      fellowship: z.enum(["aa", "na", "both"]).optional(),
      radiusMiles: z.number().min(2).max(50).optional(),
      nowMs: z.number().optional(),
      timeZone: z.string().max(80).optional(),
    }),
  )
  .handler(async ({ data }): Promise<SearchMeetingsResult | { ok: false; error: string }> => {
    const radiusMiles = data.radiusMiles ?? 15;
    const fellowship = data.fellowship ?? "both";
    const nowMs = data.nowMs && Number.isFinite(data.nowMs) ? data.nowMs : Date.now();
    const timeZone = data.timeZone || "America/Chicago";
    const given = coerceLatLng(data.lat, data.lng);

    let origin = given ? { ...given, label: "Your location" } : null;
    if (!origin && data.query?.trim()) {
      try {
        origin = await geocode(data.query);
      } catch {
        return { ok: false, error: "Could not read that city or zip." };
      }
      if (!origin) return { ok: false, error: "Could not find that city or zip in the US." };
    }
    if (!origin) origin = { ...OMAHA };

    const sources: SearchMeetingsResult["sources"] = [];
    const meetings: Meeting[] = [];
    const jobs: Promise<void>[] = [];

    if (fellowship === "aa" || fellowship === "both") {
      const feeds = feedsNear(origin, 2);
      if (feeds.length === 0) {
        sources.push({
          id: "aa-none",
          name: "Alcoholics Anonymous",
          ok: false,
          detail: "No local AA list wired for this city yet. Use Meeting Guide (free) below.",
        });
      }
      for (const feed of feeds) {
        jobs.push(
          (async () => {
            try {
              const raw = asRecords(await fetchJson(feed.url, 12000));
              let kept = 0;
              for (const row of raw) {
                const meeting = fromTsml(row, origin, nowMs, timeZone, feed.name, radiusMiles);
                if (meeting) {
                  meetings.push(meeting);
                  kept += 1;
                }
              }
              sources.push({
                id: feed.id,
                name: feed.name,
                ok: true,
                detail: `${kept} within ${radiusMiles} mi`,
              });
            } catch (err) {
              sources.push({
                id: feed.id,
                name: feed.name,
                ok: false,
                detail: err instanceof Error ? err.message : "feed failed",
              });
            }
          })(),
        );
      }
    }

    if (fellowship === "na" || fellowship === "both") {
      jobs.push(
        (async () => {
    const bmltLat = origin.lat.toFixed(3);
    const bmltLng = origin.lng.toFixed(3);
    const url =
            `${BMLT_SEARCH}?switcher=GetSearchResults` +
            `&lat_val=${bmltLat}&long_val=${bmltLng}&geo_width=-${radiusMiles}`;
          try {
            const raw = asRecords(await fetchJson(url, 12000));
            let kept = 0;
            for (const row of raw) {
              const meeting = fromBmlt(row, origin, nowMs, timeZone, radiusMiles);
              if (meeting) {
                meetings.push(meeting);
                kept += 1;
              }
            }
            sources.push({
              id: "bmlt",
              name: "BMLT (Narcotics Anonymous)",
              ok: true,
              detail: `${kept} within ${radiusMiles} mi`,
            });
          } catch (err) {
            sources.push({
              id: "bmlt",
              name: "BMLT (Narcotics Anonymous)",
              ok: false,
              detail: err instanceof Error ? err.message : "search failed",
            });
          }
        })(),
      );
    }

    await Promise.all(jobs);
    const ranked = sortMeetings(dedupeMeetings(meetings)).slice(0, 40);
    return {
      ok: true,
      origin,
      radiusMiles,
      meetings: ranked,
      sources,
    };
  });
