import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listEvents, toggleRsvp, type EventRow } from "@/lib/server/spade";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_table/events")({ component: Events });

function Events() {
  const [rows, setRows] = useState<EventRow[]>([]);

  useEffect(() => {
    listEvents().then(setRows).catch(() => setRows([]));
  }, []);

  async function rsvp(id: string) {
    const res = await toggleRsvp({ data: { eventId: id } });
    if ("error" in res && res.error) toast.error(res.error);
    const next = await listEvents();
    setRows(next);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-pink">Nights</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">What is on the floor.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Reserve a seat. Pay entry in the Vault if the night has a fee. Penny hosts the empty chairs.
        </p>
      </div>
      <ul className="space-y-3">
        {rows.map((ev) => (
          <li
            key={ev.id}
            className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-blue">{ev.game}</p>
              <h2 className="font-display text-xl font-semibold">{ev.title}</h2>
              <p className="text-sm text-muted">{ev.blurb}</p>
              <p className="mt-1 text-xs text-faint">
                {ev.filled}/{ev.seats} · {ev.host}
              </p>
            </div>
            <Button variant={ev.mine ? "outline" : "primary"} onClick={() => rsvp(ev.id)}>
              {ev.mine ? "Drop seat" : "Take a seat"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
