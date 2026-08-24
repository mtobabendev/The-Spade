import { createFileRoute } from "@tanstack/react-router";
import { LIVE, REPOS } from "@/lib/nexus";
import { RepoLink } from "@/components/nexus/watch-rail";

export const Route = createFileRoute("/_table/nexus/labs")({ component: Labs });

const RAILS = [
  { name: "Roco Room", href: "https://labs.wildcarddev.com/", note: "Watch opens this first." },
  { name: "Roku Channel", href: "https://therokuchannel.roku.com/", note: "Official surface." },
  { name: "YouTube", href: "https://www.youtube.com/", note: "Official surface." },
  { name: "Spotify", href: "https://open.spotify.com/", note: "Official surface." },
];

function Labs() {
  return (
    <div className="space-y-8">
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-pink">WildCard Labs</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Placeholder. On purpose.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Labs is the Roco Room. Watch is the portal. Phone and desktop are the theater engines.
          No DRM bypass. No credentials in the code. Owner gate required.
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4">
          <RepoLink href={REPOS.labs}>WildCard-Labs on GitHub</RepoLink>
          <a
            href={LIVE.labs}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center text-sm text-blue hover:underline"
          >
            Labs live
          </a>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-blue">Protocol</p>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>Watch opens Roco first. Heavier playback lives on phone or desktop.</li>
          <li>Official surfaces only — Roku, YouTube, Spotify, the house site.</li>
          <li>Barn-door lockdown: if you cannot see the state, Penny will not pretend she remembers it.</li>
          <li>This card is a stub until the room is loaded for real. The repo is the receipt.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Official rails</h2>
        <ul className="space-y-2">
          {RAILS.map((rail) => (
            <li key={rail.name}>
              <a
                href={rail.href}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 items-center justify-between rounded-md border border-line bg-surface px-4 text-sm hover:border-silver/40"
              >
                <span>{rail.name}</span>
                <span className="text-xs text-faint">{rail.note}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
