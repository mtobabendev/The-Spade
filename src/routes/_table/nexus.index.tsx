import { createFileRoute, Link } from "@tanstack/react-router";
import { JUSTIN, LIVE, NEXUS_ROOMS, REPOS } from "@/lib/nexus";
import { RepoLink } from "@/components/nexus/watch-rail";

export const Route = createFileRoute("/_table/nexus/")({ component: NexusHub });

function NexusHub() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-pink">The N€XU$</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Personal page. Paid receipt.</h1>
        <p className="max-w-xl text-sm text-muted">
          This is Matt's side of the internet. He owns it, he pays for it, and he is the top admin
          for every room on this spinner. Watch and phone first. Desktop is the full show.
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4">
          <RepoLink href={REPOS.nexus}>The-Nexus on GitHub</RepoLink>
          <a
            href={LIVE.markV}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center text-sm text-blue hover:underline"
          >
            Mark V live
          </a>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {NEXUS_ROOMS.filter((r) => r.id !== "hub").map((room) => (
          <Link
            key={room.id}
            to={room.to}
            className="rounded-lg border border-line bg-surface p-4 transition-colors hover:border-silver/40"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-blue">{room.kicker}</p>
            <h2 className="mt-1 font-display text-lg font-semibold">{room.label}</h2>
            <p className="mt-1 text-sm text-muted">{room.blurb}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pink">Thanks</p>
        <h2 className="mt-1 font-display text-xl font-semibold">{JUSTIN.name}</h2>
        <p className="mt-2 text-sm text-muted">{JUSTIN.note}</p>
        <p className="mt-2 text-sm text-muted">
          The course notes still live in AI-Starter-Stuff. The naming overlap with Penny is coincidence.
          The debt is not.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4">
          <a
            href={JUSTIN.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center text-sm text-blue hover:underline"
          >
            justinlucedev.com
          </a>
          <RepoLink href={REPOS.starter}>AI-Starter-Stuff</RepoLink>
        </div>
      </section>
    </div>
  );
}
