import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listSheets, saveSheet, type SheetRow } from "@/lib/server/spade";
import { emptySheet } from "@/lib/sheets";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_table/sheets")({ component: SheetsIndex });

function SheetsIndex() {
  const [rows, setRows] = useState<SheetRow[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    listSheets().then(setRows).catch(() => setRows([]));
  }, []);

  async function create(system: "dnd5e" | "pf2e") {
    const res = await saveSheet({
      data: {
        system,
        name: system === "dnd5e" ? "New 5e" : "New Pathfinder",
        data: emptySheet(),
      },
    });
    toast.success("Sheet opened.");
    void nav({ to: "/sheets/$sheetId", params: { sheetId: res.id } });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-pink">Binder</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Character sheets.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          D&D 5e and Pathfinder 2e. Bring these to the table so the paper copy can stay in the
          bag.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => create("dnd5e")}>New D&D 5e</Button>
        <Button variant="outline" onClick={() => create("pf2e")}>
          New Pathfinder
        </Button>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {rows.map((s) => (
          <li key={s.id}>
            <Link
              to="/sheets/$sheetId"
              params={{ sheetId: s.id }}
              className="block rounded-lg border border-line bg-surface p-4 hover:border-silver/40"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-blue">
                {s.system === "pf2e" ? "Pathfinder 2e" : "D&D 5e"}
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold">{s.name}</h2>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
