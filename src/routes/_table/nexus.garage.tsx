import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { JUSTIN, REPOS } from "@/lib/nexus";
import { talkToGarage } from "@/lib/server/nexus";
import { RepoLink } from "@/components/nexus/watch-rail";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_table/nexus/garage")({ component: Garage });

type Line = { role: "user" | "assistant"; content: string };

const OPENING: Line[] = [
  {
    role: "assistant",
    content:
      "Garage is open. Don't ask me to write a 40-file framework for a wall of text. Tell me what is broken.",
  },
];

const STORAGE = "spade-garage";

function loadLines(): Line[] {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return OPENING;
    const parsed = JSON.parse(raw) as Line[];
    return Array.isArray(parsed) && parsed.length ? parsed.slice(-20) : OPENING;
  } catch {
    return OPENING;
  }
}

function Garage() {
  const [lines, setLines] = useState<Line[]>(OPENING);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLines(loadLines());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(lines.slice(-20)));
    } catch {
      /* ignore */
    }
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    setBusy(true);
    setError(null);
    const history = lines.filter((l) => l.role === "user" || l.role === "assistant").slice(-10);
    setLines((m) => [...m, { role: "user", content: text }]);
    const res = await talkToGarage({ data: { message: text, history } });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setLines((m) => [...m, { role: "assistant", content: res.text }]);
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-pink">Rick's Garage</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Ambitious. Still here.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          A real garage AI on the house key. User-started, capped, no cartoons. If it helps you ship,
          thank {JUSTIN.name} — he is why Matt started writing code in the first place.
        </p>
        <div className="flex flex-wrap gap-x-4">
          <RepoLink href={REPOS.garage}>Rick-Garage on GitHub</RepoLink>
          <RepoLink href={REPOS.starter}>Justin's starter notes</RepoLink>
        </div>
      </section>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div ref={scroller} className="flex max-h-[52vh] min-h-64 flex-col gap-3 overflow-y-auto p-4">
          {lines.map((line, i) => (
            <p
              key={`${line.role}-${i}`}
              className={cn(
                "max-w-[36rem] rounded-md px-3 py-2 text-sm",
                line.role === "assistant" ? "bg-raised text-silver" : "ml-auto bg-bg text-fg",
              )}
            >
              {line.content}
            </p>
          ))}
          {busy ? <p className="text-xs text-faint">Ratcheting something together…</p> : null}
        </div>
        <form onSubmit={send} className="space-y-2 border-t border-line p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1200}
            placeholder="What's on the bench?"
            className="min-h-20"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-faint">House quota. Don't idle the key.</p>
            <Button type="submit" size="sm" disabled={busy || !draft.trim()}>
              {busy ? "Working…" : "Ask Rick"}
            </Button>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </form>
      </div>

      <p className="text-xs text-muted">
        Nod to{" "}
        <a href={JUSTIN.url} target="_blank" rel="noreferrer" className="text-blue hover:underline">
          {JUSTIN.name}
        </a>
        . Teacher, collaborator, the reason this garage exists.
      </p>
    </div>
  );
}
