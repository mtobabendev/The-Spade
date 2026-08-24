import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { brand, TABLES } from "@/lib/brand";
import { knockPenny } from "@/components/easter/knock-messenger";
import { listEvents, listListings, myOrders, type EventRow, type Listing, type Order } from "@/lib/server/spade";
import { BrandSlot } from "@/components/brand/spade-mark";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";

export const Route = createFileRoute("/_table/hall")({ component: Hall });

function Hall() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    listListings().then(setListings).catch(() => setListings([]));
    listEvents().then(setEvents).catch(() => setEvents([]));
    myOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  return (
    <div className="space-y-10">
      <section className="grid gap-6 md:grid-cols-[1.3fr_0.7fr] md:items-end">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-pink">Hall</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">The floor is open.</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Sit a table, list a card, or ask {brand.hostName} to DM. Spade images are the
            white-label slots — swap the art, keep the wiring.
          </p>
        </div>
        <img
          src="/brand/penny.jpg"
          alt={brand.hostName}
          className="hidden h-40 w-full cursor-pointer rounded-lg object-cover object-top md:block"
          onClick={() => knockPenny()}
        />
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold">Tables</h2>
          <Link to="/floor" className="text-sm text-blue hover:underline">
            All tables
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TABLES.map((t) => (
            <Link
              key={t.id}
              to="/floor/$tableId"
              params={{ tableId: t.id }}
              className="rounded-lg border border-line bg-surface p-4 transition-colors hover:border-silver/40"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-blue">{t.game}</p>
              <h3 className="mt-1 font-display text-lg font-semibold">{t.name}</h3>
              <p className="mt-1 text-sm text-muted">{t.blurb}</p>
              <p className="mt-3 text-xs text-faint">{t.seats} seats</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold">On the wall</h2>
          <Link to="/vault" className="text-sm text-blue hover:underline">
            Vault
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {listings.slice(0, 4).map((item) => (
            <Link key={item.id} to="/vault/$listingId" params={{ listingId: item.id }} className="group">
              <BrandSlot className="aspect-[3/4] rounded-md" caption="Swap art" />
              <p className="mt-2 text-sm font-medium leading-snug group-hover:text-silver">{item.title}</p>
              <p className="text-xs text-muted">{money(item.price_cents)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-semibold">Nights</h2>
            <Link to="/events" className="text-sm text-blue hover:underline">
              Calendar
            </Link>
          </div>
          <ul className="space-y-2">
            {events.slice(0, 3).map((ev) => (
              <li key={ev.id} className="rounded-md border border-line bg-surface px-4 py-3">
                <p className="text-sm font-medium">{ev.title}</p>
                <p className="text-xs text-muted">
                  {ev.filled}/{ev.seats} seats · {ev.host}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-display text-xl font-semibold">Your pickups</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-muted">Nothing waiting at the counter.</p>
          ) : (
            <ul className="space-y-2">
              {orders.slice(0, 4).map((o) => (
                <li key={o.id} className="rounded-md border border-line bg-surface px-4 py-3 text-sm">
                  <span className="font-medium">{o.title}</span>
                  <span className="ml-2 text-muted">{money(o.amount_cents)} · {o.status}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex gap-2">
            <Link to="/penny">
              <Button variant="pink" size="sm">
                Talk to {brand.hostName}
              </Button>
            </Link>
            <Link to="/duel">
              <Button variant="outline" size="sm">
                Duel Penny
              </Button>
            </Link>
          </div>
        </div>
      </section>
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold">Nexus</h2>
          <Link to="/nexus" className="text-sm text-blue hover:underline">
            Matt's page
          </Link>
        </div>
        <p className="mb-3 max-w-xl text-sm text-muted">
          Backstage of the house: the pool Meta banned, the office for people coming home, a garage
          AI, and ChatGPT's wreck next to the rebuild.
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Link to="/nexus/party" className="rounded-lg border border-line bg-surface p-4 hover:border-silver/40">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pink">Pool</p>
            <p className="mt-1 text-sm font-medium">What Facebook could be</p>
          </Link>
          <Link to="/nexus/office" className="rounded-lg border border-line bg-surface p-4 hover:border-silver/40">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pink">Office</p>
            <p className="mt-1 text-sm font-medium">Coming out, coming home</p>
          </Link>
          <Link to="/nexus/approach" className="rounded-lg border border-line bg-surface p-4 hover:border-silver/40">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pink">Mark I</p>
            <p className="mt-1 text-sm font-medium">ChatGPT vs Grok</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
