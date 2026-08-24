import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCart } from "@/lib/cart-store";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { BrandSlot } from "@/components/brand/spade-mark";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";

export const Route = createFileRoute("/_table/cart")({ component: CartPage });

function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const total = items.reduce((n, i) => n + i.price_cents * i.qty, 0);
  const [paid, setPaid] = useState<string | null>(null);

  if (paid) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-line bg-surface p-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-pink">Pickup</p>
        <h1 className="font-display text-3xl font-semibold">Paid. Bring ID to the counter.</h1>
        <p className="text-sm text-muted">
          Card •••• {paid}. No shipping, no ads, no Venmo. The shop has your hold.
        </p>
        <Link to="/hall">
          <Button>Back to the hall</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-pink">Cart</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Hold at the counter.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          The storefront that ran out of time, finished. Square when the merchant keys are on the shop.
          Demo drawer until then. No ads.
        </p>
        <ul className="mt-6 space-y-3">
          {items.length === 0 ? (
            <li className="text-sm text-muted">
              Empty. <Link to="/vault" className="text-blue hover:underline">Open the Vault.</Link>
            </li>
          ) : (
            items.map((item) => (
              <li key={item.id} className="flex gap-3 rounded-lg border border-line bg-surface p-3">
                <BrandSlot className="size-20 shrink-0 rounded-md" caption={item.game} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{item.title}</p>
                  <p className="text-xs text-muted">{money(item.price_cents)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="size-9 rounded-md border border-line"
                      onClick={() => setQty(item.id, item.qty - 1)}
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm">{item.qty}</span>
                    <button
                      type="button"
                      className="size-9 rounded-md border border-line"
                      onClick={() => setQty(item.id, item.qty + 1)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="ml-auto text-xs text-danger"
                      onClick={() => remove(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
      <aside>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-muted">Subtotal</p>
          <p className="font-display text-2xl font-semibold">{money(total)}</p>
          <p className="mt-1 text-xs text-faint">Tax at the register if the shop charges it. Pickup only.</p>
        </div>
        {items.length ? (
          <div className="mt-4">
            <CheckoutForm
              items={items.map((i) => ({ listingId: i.id, qty: i.qty }))}
              totalCents={total}
              onPaid={(last4) => {
                clear();
                setPaid(last4);
              }}
            />
          </div>
        ) : (
          <Link to="/vault" className="mt-4 inline-block">
            <Button variant="outline">Shop the wall</Button>
          </Link>
        )}
      </aside>
    </div>
  );
}
