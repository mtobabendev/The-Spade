import { createFileRoute, Link } from "@tanstack/react-router";
import { LIVE, REPOS } from "@/lib/nexus";
import { RepoLink } from "@/components/nexus/watch-rail";
import { MeetingFinder } from "@/components/meetings/finder";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_table/nexus/office")({ component: Office });

const RAILS = [
  {
    title: "Housing path",
    body: "Entry through D into independent living. Structure without a speech. Different Approach Omaha holds the beds and the process.",
  },
  {
    title: "Paper that matters",
    body: "ID, birth certificate, Social Security card. The boring stack is the one that unlocks work and a lease.",
  },
  {
    title: "Work",
    body: "A job is not a vibe. Transportation, a working phone, and someone who will pick up when a manager calls.",
  },
  {
    title: "People",
    body: "You do not have to do this alone, and you do not have to perform gratitude for a brochure.",
  },
];

function Office() {
  return (
    <div className="space-y-8">
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-pink">Penny's Office</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          For the ones coming out.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Matt built this after prison, not as a brand story — as a working bench. If you are coming
          home, this room is for you. No ads. No savior copy. Practical rails and a door that stays open.
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4">
          <RepoLink href={REPOS.office}>wildcard-office on GitHub</RepoLink>
          <a
            href={LIVE.office}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center text-sm text-blue hover:underline"
          >
            Office live
          </a>
          <Link to="/meetings" className="inline-flex min-h-11 items-center text-sm text-blue hover:underline">
            Public meeting button
          </Link>
          <Link to="/easy" className="inline-flex min-h-11 items-center text-sm text-blue hover:underline">
            Easy button / QR
          </Link>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-line bg-surface p-4 sm:p-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pink">Ask Penny</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">Need a meeting.</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            We are normies. We still know the chair matters. This button pulls live AA and NA
            listings around you. No lecture. If you cannot get a sponsor on the phone, go sit down.
          </p>
        </div>
        <MeetingFinder />
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-blue">From the owner</p>
        <p className="mt-3 text-sm text-muted">
          I came out of prison. I own this stack and I pay the bills. WildCard Office is the handoff
          for guys and gals doing the same walk: housing, IDs, work, and a person who will answer.
          If you need the long version of the program, that is Different Approach — and if you want
          to see what ChatGPT did to that site versus what it should be, the next card is Mark I.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {RAILS.map((rail) => (
          <article key={rail.title} className="rounded-lg border border-line bg-surface p-4">
            <h2 className="font-display text-lg font-semibold">{rail.title}</h2>
            <p className="mt-1 text-sm text-muted">{rail.body}</p>
          </article>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link to="/nexus/approach">
          <Button size="sm">ChatGPT vs Grok</Button>
        </Link>
        <a href="mailto:info@differentapproachomaha.org">
          <Button variant="outline" size="sm">
            Email Different Approach
          </Button>
        </a>
      </div>
    </div>
  );
}
