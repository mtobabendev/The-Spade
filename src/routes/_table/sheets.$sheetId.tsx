import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSheet, saveSheet } from "@/lib/server/spade";
import { ABILITIES, emptySheet, modLabel, type SheetData } from "@/lib/sheets";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_table/sheets/$sheetId")({ component: SheetEditor });

function asSheet(raw: unknown): SheetData {
  const base = emptySheet();
  if (!raw || typeof raw !== "object") return base;
  return { ...base, ...(raw as Partial<SheetData>) };
}

function SheetEditor() {
  const { sheetId } = Route.useParams();
  const [system, setSystem] = useState<"dnd5e" | "pf2e">("dnd5e");
  const [name, setName] = useState("");
  const [data, setData] = useState<SheetData>(emptySheet());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSheet({ data: { id: sheetId } }).then((row) => {
      if (!row) return;
      setSystem(row.system === "pf2e" ? "pf2e" : "dnd5e");
      setName(row.name);
      setData(asSheet(row.data));
      setReady(true);
    });
  }, [sheetId]);

  function patch(partial: Partial<SheetData>) {
    setData((d) => ({ ...d, ...partial }));
  }

  async function persist() {
    await saveSheet({
      data: { id: sheetId, system, name, data },
    });
    toast.success("Sheet saved.");
  }

  if (!ready) return <div className="h-64 animate-pulse rounded-xl bg-surface" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/sheets" className="text-xs text-muted hover:text-fg">
            Binder
          </Link>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {system === "pf2e" ? "Pathfinder 2e" : "D&D 5e"}
          </h1>
        </div>
        <Button onClick={persist}>Save</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Class" value={data.className} onChange={(v) => patch({ className: v })} />
        <Field
          label="Level"
          value={String(data.level)}
          onChange={(v) => patch({ level: Number(v) || 1 })}
        />
        <Field
          label={system === "pf2e" ? "Ancestry" : "Species"}
          value={data.ancestry}
          onChange={(v) => patch({ ancestry: v })}
        />
        <Field label="Background" value={data.background} onChange={(v) => patch({ background: v })} />
        <Field label="Alignment" value={data.alignment} onChange={(v) => patch({ alignment: v })} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Num label="HP" value={data.hp} onChange={(v) => patch({ hp: v })} />
        <Num label="Max HP" value={data.hpMax} onChange={(v) => patch({ hpMax: v })} />
        <Num label="AC" value={data.ac} onChange={(v) => patch({ ac: v })} />
        <Num label="Speed" value={data.speed} onChange={(v) => patch({ speed: v })} />
      </div>

      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {ABILITIES.map((a) => (
          <div key={a.id} className="rounded-md border border-line bg-surface p-3 text-center">
            <p className="font-mono text-[11px] text-muted">{a.label}</p>
            <input
              className="mt-1 w-full bg-transparent text-center font-display text-2xl font-semibold outline-none"
              value={data.abilities[a.id]}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  abilities: { ...d.abilities, [a.id]: Number(e.target.value) || 0 },
                }))
              }
            />
            <p className="text-xs text-pink">{modLabel(data.abilities[a.id])}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>Notes / features</Label>
        <Textarea value={data.notes} onChange={(e) => patch({ notes: e.target.value })} />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        inputMode="numeric"
        value={String(value)}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}
