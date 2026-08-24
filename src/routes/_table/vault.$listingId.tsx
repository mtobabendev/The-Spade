import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getListing, type Listing } from "@/lib/server/spade";
import { useCart } from "@/lib/cart-store";
import { BrandSlot } from "@/components/brand/spade-mark";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_table/vault/$listingId")({ component: ListingPage });

function ListingPage() {
  const { listingId } = Route.useParams();
  const nav = useNavigate();
  const [item, setItem] = useState<Listing | null | undefined>(undefined);
  const add = useCart((s) => s.add);

  useEffect(() => {
    getListing({ data: { id: listingId } }).then(setItem);
  }, [listingId]);

  if (item === undefined) return <div className="h-64 animate-pulse rounded-xl bg-surface" />;
  if (!item) {
    return (
      <p className="text-sm text-muted">
        Not on the wall. <Link to="/vault">Back to the Vault.</Link>
      </p>
    );
  }

  function bag(thenCart: boolean) {
    add({
      id: item!.id,
      title: item!.title,
      price_cents: item!.price_cents,
      game: item!.game,
      category: item!.category,
    });
    toast.success("In the cart.");
    if (thenCart) void nav({ to: "/cart" });
  }

  return (
    <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
      <BrandSlot className="aspect-[3/4] rounded-lg" caption="Client art slot" />
      <div>
        <Link to="/vault" className="text-xs text-muted hover:text-fg">
          Vault
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{item.title}</h1>
        <p className="mt-2 text-lg">{money(item.price_cents)}</p>
        <p className="mt-1 text-sm text-muted">
          {item.game} · {item.condition} · {item.category}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted">{item.description}</p>
        {item.status !== "live" ? (
          <p className="mt-6 text-sm text-ok">Sold. Ask the counter if a hold is still sitting.</p>
        ) : (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => bag(false)}>Add to cart</Button>
            <Button variant="pink" onClick={() => bag(true)}>
              Pay and hold
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
