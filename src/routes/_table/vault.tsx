import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GAMES } from "@/lib/brand";
import { useCart } from "@/lib/cart-store";
import { listListings, type Listing } from "@/lib/server/spade";
import { BrandSlot } from "@/components/brand/spade-mark";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_table/vault")({ component: Vault });

function Vault() {
  const game = useRouterState({
    select: (s) => {
      const raw = s.location.search as { game?: unknown };
      return typeof raw.game === "string" ? raw.game : "all";
    },
  });
  const [listings, setListings] = useState<Listing[]>([]);
  const add = useCart((s) => s.add);

  useEffect(() => {
    listListings().then(setListings).catch(() => setListings([]));
  }, []);

  const shown = useMemo(
    () => (game === "all" ? listings : listings.filter((l) => l.game === game)),
    [listings, game],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-pink">Vault</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Pay here. Pickup at the counter.</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            The shop wall, with a cart. Square when the merchant account is on. No ads. No Venmo scavenger hunt.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/cart">
            <Button variant="outline">Cart</Button>
          </Link>
          <Link to="/sell">
            <Button>List a piece</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip game="all" active={game === "all"}>
          All
        </FilterChip>
        {GAMES.map((g) => (
          <FilterChip key={g.id} game={g.id} active={game === g.id}>
            {g.label}
          </FilterChip>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((item) => (
          <article key={item.id} className="group">
            <Link to="/vault/$listingId" params={{ listingId: item.id }}>
              <BrandSlot className="aspect-[3/4] rounded-md" caption={`${item.game} · swap`} />
            </Link>
            <p className="mt-2 text-sm font-medium leading-snug">{item.title}</p>
            <p className="text-xs text-muted">
              {item.condition} · {money(item.price_cents)}
            </p>
            <button
              type="button"
              className="mt-2 h-9 w-full rounded-md border border-line text-xs text-muted hover:text-fg"
              onClick={() => {
                add({
                  id: item.id,
                  title: item.title,
                  price_cents: item.price_cents,
                  game: item.game,
                  category: item.category,
                });
                toast.success("In the cart.");
              }}
            >
              Add to cart
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  game,
  children,
}: {
  active: boolean;
  game: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to="/vault"
      search={{ game }}
      className={
        active
          ? "inline-flex h-9 items-center rounded-full bg-fg px-3 text-xs font-medium text-bg"
          : "inline-flex h-9 items-center rounded-full border border-line px-3 text-xs text-muted hover:text-fg"
      }
    >
      {children}
    </Link>
  );
}
