import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { brand } from "@/lib/brand";
import {
  LIBRARY,
  attackAll,
  cardDef,
  newDuel,
  passTurn,
  pennyTurn,
  playCard,
  type DuelState,
} from "@/lib/duel/engine";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_table/duel")({ component: Duel });

function Duel() {
  const [state, setState] = useState<DuelState>(() => newDuel());
  const yourTurn = state.turn === "you" && state.phase === "main";

  function act(next: DuelState) {
    if (next.turn === "penny" && next.phase === "main") {
      setState(pennyTurn(next));
      return;
    }
    setState({ ...next });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-pink">Spade Clash</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Play {brand.hostName}.
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Original table game — not Magic. Energy, creatures, swing. She uses a heuristic, not a
            rules engine in the cloud, so a lonely night does not burn the shop's API bill.
          </p>
        </div>
        <Button variant="outline" onClick={() => setState(newDuel())}>
          New game
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Life name={brand.hostName} life={state.penny.life} energy={state.penny.energy} active={state.turn === "penny"} />
        <Life name="You" life={state.you.life} energy={state.you.energy} active={state.turn === "you"} />
      </div>

      <Board title={`${brand.hostName}'s board`} cards={state.penny.board} />
      <Board title="Your board" cards={state.you.board} />

      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted">Hand</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {state.you.hand.map((id, i) => {
            const c = cardDef(id);
            const can = yourTurn && state.you.energy >= c.cost;
            return (
              <button
                key={`${id}-${i}`}
                type="button"
                disabled={!can}
                onClick={() => act(playCard(state, "you", i))}
                className={cn(
                  "min-w-36 rounded-md border bg-raised p-3 text-left",
                  can ? "border-silver/40 hover:border-pink" : "border-line opacity-60",
                )}
              >
                <p className="font-mono text-[10px] uppercase text-blue">
                  {c.type} · {c.cost}
                </p>
                <p className="font-display text-sm font-semibold">{c.name}</p>
                {c.type === "creature" ? (
                  <p className="text-xs text-muted">
                    {c.atk}/{c.hp}
                  </p>
                ) : (
                  <p className="text-xs text-muted">{c.text}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {state.phase === "over" ? (
        <p className="font-display text-2xl">
          {state.winner === "you" ? "You take the table." : `${brand.hostName} stacks it.`}
        </p>
      ) : (
        <div className="flex gap-2">
          <Button disabled={!yourTurn} onClick={() => act(attackAll(state, "you"))}>
            Swing
          </Button>
          <Button variant="outline" disabled={!yourTurn} onClick={() => act(passTurn(state, "you"))}>
            Pass
          </Button>
        </div>
      )}

      <ol className="max-h-40 space-y-1 overflow-y-auto font-mono text-xs text-muted">
        {state.log.slice(-12).map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ol>

      <p className="text-xs text-faint">
        {LIBRARY.length} card types in the list. Shop can restyle the backs; the engine stays.
      </p>
    </div>
  );
}

function Life({
  name,
  life,
  energy,
  active,
}: {
  name: string;
  life: number;
  energy: number;
  active: boolean;
}) {
  return (
    <div className={cn("rounded-lg border bg-surface p-4", active ? "border-pink/60" : "border-line")}>
      <p className="text-xs text-muted">{name}</p>
      <p className="font-display text-3xl font-semibold tabular-nums">{life}</p>
      <p className="text-xs text-faint">Energy {energy}</p>
    </div>
  );
}

function Board({
  title,
  cards,
}: {
  title: string;
  cards: DuelState["you"]["board"];
}) {
  const defs = useMemo(() => cards.map((c) => ({ ...c, def: cardDef(c.defId) })), [cards]);
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted">{title}</p>
      <div className="flex min-h-16 flex-wrap gap-2">
        {defs.length === 0 ? (
          <p className="text-sm text-faint">Empty.</p>
        ) : (
          defs.map((c) => (
            <div key={c.iid} className="rounded-md border border-line bg-raised px-3 py-2">
              <p className="text-sm font-medium">{c.def.name}</p>
              <p className="text-xs text-muted">
                {c.def.atk}/{c.hp}
                {c.sick ? " · sick" : ""}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
