import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CONDITIONS, GAMES } from "@/lib/brand";
import { createListing } from "@/lib/server/spade";
import { BrandSlot } from "@/components/brand/spade-mark";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_table/sell")({ component: Sell });

function Sell() {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("mtg");
  const [category, setCategory] = useState("single");
  const [condition, setCondition] = useState("NM");
  const [price, setPrice] = useState("20");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const dollars = Number(price);
      const res = await createListing({
        data: {
          title,
          game,
          category,
          condition,
          price_cents: Math.round(dollars * 100),
          description,
        },
      });
      toast.success("On the wall. Spade art until you swap a photo.");
      void nav({ to: "/vault/$listingId", params: { listingId: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not list.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-pink">List</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Put it on the wall.</h1>
        <p className="mt-2 text-sm text-muted">
          Photo slot stays the spade until the shop drops real pictures. Mechanics do not change.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Game</Label>
              <select
                className="h-11 w-full rounded-md border border-line bg-raised px-3 text-sm"
                value={game}
                onChange={(e) => setGame(e.target.value)}
              >
                {GAMES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                className="h-11 w-full rounded-md border border-line bg-raised px-3 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="single">Single</option>
                <option value="sealed">Sealed</option>
                <option value="comic">Comic</option>
                <option value="book">Book</option>
                <option value="accessory">Accessory</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Condition</Label>
              <select
                className="h-11 w-full rounded-md border border-line bg-raised px-3 text-sm"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                {CONDITIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price (USD)</Label>
              <Input
                id="price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d">Notes</Label>
            <Textarea id="d" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Listing…" : "Hang it"}
          </Button>
        </form>
      </div>
      <BrandSlot className="aspect-[3/4] rounded-lg" caption="Art slot" />
    </div>
  );
}
