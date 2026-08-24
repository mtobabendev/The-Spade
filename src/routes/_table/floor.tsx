import { createFileRoute, Link } from "@tanstack/react-router";
import { TABLES } from "@/lib/brand";
import { BrandSlot } from "@/components/brand/spade-mark";

export const Route = createFileRoute("/_table/floor")({ component: Floor });

function Floor() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-pink">Floor</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Sit a table.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Camera and mic stay in the browser. Chat is peer-to-peer. Empty seat? Penny will still play.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {TABLES.map((t) => (
          <Link
            key={t.id}
            to="/floor/$tableId"
            params={{ tableId: t.id }}
            className="overflow-hidden rounded-lg border border-line bg-surface"
          >
            <BrandSlot className="h-36" caption={`${t.name} · swap`} />
            <div className="p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-blue">{t.game}</p>
              <h2 className="mt-1 font-display text-xl font-semibold">{t.name}</h2>
              <p className="mt-1 text-sm text-muted">{t.blurb}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
