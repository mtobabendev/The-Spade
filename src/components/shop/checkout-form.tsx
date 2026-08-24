import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { checkoutCart, getPayConfig, type PayConfig } from "@/lib/server/payments";
import { money } from "@/lib/utils";
import { toast } from "sonner";

declare global {
  interface Window {
    Square?: {
      payments: (
        appId: string,
        locationId: string,
      ) => Promise<{
        card: () => Promise<{
          attach: (sel: string) => Promise<void>;
          destroy?: () => Promise<void>;
          tokenize: () => Promise<{ status: string; token?: string }>;
        }>;
      }>;
    };
  }
}

type Item = { listingId: string; qty: number };

type Props = {
  items: Item[];
  totalCents: number;
  onPaid: (last4: string) => void;
};

function loadSquare(env: "sandbox" | "production") {
  const id = "square-web-payments";
  if (document.getElementById(id)) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.id = id;
    s.src =
      env === "production"
        ? "https://web.squarecdn.com/v1/square.js"
        : "https://sandbox.web.squarecdn.com/v1/square.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Square failed to load."));
    document.head.appendChild(s);
  });
}

export function CheckoutForm({ items, totalCents, onPaid }: Props) {
  const [config, setConfig] = useState<PayConfig | null>(null);
  const [name, setName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const cardRef = useRef<{ tokenize: () => Promise<{ status: string; token?: string }> } | null>(null);

  useEffect(() => {
    getPayConfig().then(setConfig).catch(() => setConfig({ provider: "demo" }));
  }, []);

  useEffect(() => {
    if (!config || config.provider !== "square") return;
    let dead = false;
    (async () => {
      await loadSquare(config.env);
      if (dead || !window.Square) return;
      const payments = await window.Square.payments(config.applicationId, config.locationId);
      const card = await payments.card();
      await card.attach("#square-card");
      if (dead) {
        await card.destroy?.();
        return;
      }
      cardRef.current = card;
      setReady(true);
    })().catch(() => {
      toast.error("Square card field could not start. Using the demo drawer.");
      setConfig({ provider: "demo" });
    });
    return () => {
      dead = true;
    };
  }, [config]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length) return;
    setBusy(true);
    try {
      let sourceId: string | undefined;
      if (config?.provider === "square") {
        const token = await cardRef.current?.tokenize();
        if (!token || token.status !== "OK" || !token.token) {
          toast.error("Card did not tokenize.");
          setBusy(false);
          return;
        }
        sourceId = token.token;
      }
      const res = await checkoutCart({
        data: {
          items,
          name,
          sourceId,
          cardNumber: config?.provider === "demo" ? cardNumber : undefined,
          expiry: config?.provider === "demo" ? expiry : undefined,
          cvc: config?.provider === "demo" ? cvc : undefined,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.provider === "square"
          ? "Square charged. Pickup at the counter."
          : "Paid. Pickup at the counter.",
      );
      onPaid(res.last4);
    } finally {
      setBusy(false);
    }
  }

  if (!config) return <div className="h-40 animate-pulse rounded-lg bg-raised" />;

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-line bg-surface p-4">
      <p className="text-xs text-faint">
        {config.provider === "square"
          ? "Square merchant checkout. Pickup at the counter — no Venmo scavenger hunt."
          : "Demo drawer until Square keys are on this shop. Last four only. Never a full number stored."}
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="cc-name">Name on card</Label>
        <Input id="cc-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      {config.provider === "square" ? (
        <div>
          <Label>Card</Label>
          <div id="square-card" className="mt-1.5 min-h-12 rounded-md border border-line bg-raised p-2" />
          {!ready ? <p className="mt-1 text-xs text-faint">Loading Square…</p> : null}
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="cc-num">Card number</Label>
            <Input
              id="cc-num"
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="4242 4242 4242 4242"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cc-exp">Expiry</Label>
              <Input id="cc-exp" placeholder="12/28" value={expiry} onChange={(e) => setExpiry(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-cvc">CVC</Label>
              <Input id="cc-cvc" inputMode="numeric" value={cvc} onChange={(e) => setCvc(e.target.value)} required />
            </div>
          </div>
        </>
      )}
      <Button type="submit" className="w-full" disabled={busy || (config.provider === "square" && !ready)}>
        {busy ? "Charging…" : `Pay ${money(totalCents)}`}
      </Button>
    </form>
  );
}
