import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, ExternalLink, LocateFixed, MapPin, Navigation } from "lucide-react";
import { searchMeetings } from "@/lib/server/meetings";
import { dayName } from "@/lib/meetings/when";
import type { Meeting, SearchMeetingsResult } from "@/lib/meetings/types";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FellowshipFilter = "both" | "aa" | "na";
type VenueFilter = "any" | "in_person" | "online";

function whenLabel(m: Meeting) {
  if (m.live) return "Happening now";
  if (m.minutesUntil < 60) return `In ${Math.max(1, m.minutesUntil)} min`;
  const start = new Date(m.startsAtMs);
  const now = new Date();
  if (start.toDateString() === now.toDateString()) return `Today · ${m.timeLabel}`;
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (start.toDateString() === tomorrow.toDateString()) return `Tomorrow · ${m.timeLabel}`;
  return `${dayName(m.day)} · ${m.timeLabel}`;
}

function distanceLabel(m: Meeting) {
  if (m.venue === "online" && m.distanceMiles == null) return "Online";
  if (m.distanceMiles == null) return m.city || "";
  if (m.distanceMiles < 0.2) return "Under a block";
  return `${m.distanceMiles < 10 ? m.distanceMiles.toFixed(1) : Math.round(m.distanceMiles)} mi`;
}

export function MeetingFinder({ autoLocate = true }: { autoLocate?: boolean }) {
  const [query, setQuery] = useState("");
  const [fellowship, setFellowship] = useState<FellowshipFilter>("both");
  const [venue, setVenue] = useState<VenueFilter>("any");
  const [womenOnly, setWomenOnly] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState(15);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchMeetingsResult | null>(null);
  const runId = useRef(0);
  const filters = useRef({ fellowship, radiusMiles, query });
  filters.current = { fellowship, radiusMiles, query };

  async function run(opts: {
    lat?: number;
    lng?: number;
    query?: string;
    radiusMiles?: number;
  }) {
    const id = ++runId.current;
    setBusy(true);
    setError(null);
    try {
      const res = await searchMeetings({
        data: {
          lat: opts.lat,
          lng: opts.lng,
          query: opts.query,
          fellowship: "both",
          radiusMiles: opts.radiusMiles ?? filters.current.radiusMiles,
          nowMs: Date.now(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      if (id !== runId.current) return;
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res);
    } catch {
      if (id !== runId.current) return;
      setError("Could not reach the meeting lists. Try again in a minute.");
    } finally {
      if (id === runId.current) {
        setBusy(false);
        setLocating(false);
      }
    }
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setError("This browser will not share a location. Type a zip.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void run({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setError("Location was blocked. Type a city or zip — Omaha works if you leave it blank.");
        void run({ query: filters.current.query || "Omaha, NE" });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  useEffect(() => {
    void run({ query: "Omaha, NE" });
    if (!autoLocate || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void run({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60_000 },
    );
    // First paint only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    if (!result) return [];
    return result.meetings.filter((m) => {
      if (fellowship !== "both" && m.fellowship !== fellowship) return false;
      if (womenOnly && !m.women) return false;
      if (venue === "online" && m.venue === "in_person") return false;
      if (venue === "in_person" && m.venue === "online") return false;
      return true;
    });
  }, [result, fellowship, womenOnly, venue]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    void run({ query: query || "Omaha, NE" });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSearch} className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="pink"
            className="min-h-12 flex-1"
            onClick={useLocation}
            disabled={busy || locating}
          >
            <LocateFixed className="size-4" />
            {locating ? "Finding you…" : "Use my location"}
          </Button>
          <div className="flex min-w-0 flex-1 gap-2">
            <div className="min-w-0 flex-1">
              <Label htmlFor="meeting-place" className="sr-only">
                City or zip
              </Label>
              <Input
                id="meeting-place"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="City or zip"
                autoComplete="postal-code"
              />
            </div>
            <Button type="submit" variant="outline" disabled={busy}>
              Search
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["both", "AA + NA"],
              ["aa", "AA"],
              ["na", "NA"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cn(
                "h-11 rounded-full px-4 text-sm",
                fellowship === id ? "bg-fg text-bg" : "border border-line text-muted",
              )}
              onClick={() => setFellowship(id)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className={cn(
              "h-11 rounded-full px-4 text-sm",
              womenOnly ? "bg-pink text-bg" : "border border-line text-muted",
            )}
            onClick={() => setWomenOnly((v) => !v)}
          >
            Women's
          </button>
          {(
            [
              ["any", "Any door"],
              ["in_person", "In person"],
              ["online", "Online"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cn(
                "h-11 rounded-full px-4 text-sm",
                venue === id ? "bg-raised text-fg" : "border border-line text-muted",
              )}
              onClick={() => setVenue(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm text-muted">
          <label className="flex items-center gap-2">
            Within
            <select
              className="h-11 rounded-md border border-line bg-raised px-2 text-fg"
              value={radiusMiles}
              onChange={(e) => {
                const next = Number(e.target.value);
                setRadiusMiles(next);
                if (result) void run({ lat: result.origin.lat, lng: result.origin.lng, radiusMiles: next });
              }}
            >
              <option value={5}>5 miles</option>
              <option value={15}>15 miles</option>
              <option value={30}>30 miles</option>
            </select>
          </label>
          {result ? (
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
              {result.origin.label}
            </span>
          ) : null}
        </div>
      </form>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {busy ? <p className="text-sm text-muted">Pulling the live lists…</p> : null}

      {!busy && result && visible.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface p-4 text-sm text-muted">
          <p>Nothing in that radius on the lists we can see.</p>
          <p className="mt-2">Widen the miles, drop a filter, or open the official apps below. The next chair still exists.</p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {visible.map((m) => (
          <li key={m.id}>
            <article className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pink">
                    {m.fellowship === "aa" ? "AA" : "NA"}
                    {m.live ? " · now" : ""}
                    {m.women ? " · women" : ""}
                    {m.venue === "online" ? " · online" : m.venue === "hybrid" ? " · hybrid" : ""}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-semibold leading-snug">{m.name}</h3>
                </div>
                <p className="text-sm text-silver">{distanceLabel(m)}</p>
              </div>
              <p className="mt-2 flex items-center gap-2 text-sm text-fg">
                <Clock className="size-4 shrink-0 text-muted" />
                {whenLabel(m)}
              </p>
              <p className="mt-1 flex items-start gap-2 text-sm text-muted">
                <MapPin className="size-4 shrink-0 mt-0.5" />
                <span>
                  {m.location}
                  {m.address ? <span className="block text-faint">{m.address}</span> : null}
                </span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {m.mapsUrl && m.venue !== "online" ? (
                  <a href={m.mapsUrl} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">
                      <Navigation className="size-3.5" />
                      Map
                    </Button>
                  </a>
                ) : null}
                {m.url ? (
                  <a href={m.url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="size-3.5" />
                      Listing
                    </Button>
                  </a>
                ) : null}
              </div>
            </article>
          </li>
        ))}
      </ul>

      <footer className="space-y-3 border-t border-line pt-4 text-sm text-muted">
        <p>
          Not AA. Not NA. Penny is a shop concierge pointing at public lists so you can get to a
          chair. Times come from local service entities (Meeting Guide feeds and BMLT) and can be
          wrong. If the door is locked, try the next one.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <a
            className="text-blue hover:underline"
            href="https://www.aa.org/meeting-guide-app"
            target="_blank"
            rel="noreferrer"
          >
            Meeting Guide app
          </a>
          <a
            className="text-blue hover:underline"
            href="https://www.aa.org/find-aa"
            target="_blank"
            rel="noreferrer"
          >
            Find A.A. near you
          </a>
          <a
            className="text-blue hover:underline"
            href="https://www.na.org/meetingsearch/"
            target="_blank"
            rel="noreferrer"
          >
            NA meeting search
          </a>
        </div>
        <p className="text-xs text-faint">
          Medical emergency: 911. SAMHSA helpline: 1-800-662-4357.
        </p>
      </footer>
    </div>
  );
}
