import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { brand } from "@/lib/brand";
import { PENNY_MODES, getPennyThread, listPennyThreads, talkToPenny } from "@/lib/server/penny";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_table/penny")({ component: PennyDesk });

function PennyDesk() {
  const [mode, setMode] = useState<(typeof PENNY_MODES)[number]["id"]>("concierge");
  const [threadId, setThreadId] = useState<string | undefined>();
  const [threads, setThreads] = useState<{ id: string; mode: string; title: string }[]>([]);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listPennyThreads().then(setThreads).catch(() => setThreads([]));
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, busy]);

  async function openThread(id: string) {
    const t = await getPennyThread({ data: { id } });
    if (!t) return;
    setThreadId(t.id);
    setMode(t.mode as typeof mode);
    setMessages(t.messages);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    setBusy(true);
    setError(null);
    setMessages((m) => [...m, { role: "user", content: text }]);
    const res = await talkToPenny({ data: { threadId, mode, message: text } });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setThreadId(res.threadId);
    setMessages((m) => [...m, { role: "assistant", content: res.text }]);
    listPennyThreads().then(setThreads).catch(() => undefined);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="space-y-3">
        <img
          src="/brand/penny.jpg"
          alt={brand.hostName}
          className="hidden h-40 w-full cursor-pointer rounded-md object-cover object-top lg:block"
          onClick={() => window.dispatchEvent(new Event("spade-knock"))}
        />
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-pink">{brand.hostName}</p>
        <div className="flex flex-wrap gap-2">
          {PENNY_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id);
                setThreadId(undefined);
                setMessages([]);
              }}
              className={cn(
                "h-9 rounded-full px-3 text-xs",
                mode === m.id ? "bg-pink text-bg" : "border border-line text-muted",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <Link to="/meetings" className="block text-sm text-blue hover:underline">
          Need a meeting
        </Link>
        <Link to="/easy" className="block text-sm text-blue hover:underline">
          Easy button
        </Link>
        <Link to="/duel" className="block text-sm text-blue hover:underline">
          Duel her instead
        </Link>
        <ul className="space-y-1 text-sm">
          {threads.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => openThread(t.id)}
                className={cn(
                  "w-full truncate rounded-md px-2 py-2 text-left text-muted hover:text-fg",
                  t.id === threadId && "bg-raised text-fg",
                )}
              >
                {t.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex min-h-[60vh] flex-col rounded-lg border border-line bg-surface">
        <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="max-w-md text-sm text-muted">
              {mode === "dm"
                ? "She will run the NPCs. You roll. Keep it to a table that can finish tonight."
                : mode === "judge"
                  ? "Rules questions for Magic, Unlimited, 5e, or Pathfinder. She will say when she is guessing."
                  : "Shop concierge. Tables, pickup, what is on the wall."}
            </p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "ml-8" : "mr-8"}>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                  {m.role === "user" ? "You" : brand.hostName}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
              </div>
            ))
          )}
          {busy ? <p className="text-sm text-pink">Penny is thinking…</p> : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
        <form onSubmit={send} className="border-t border-line p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Talk to Penny"
            className="min-h-20"
          />
          <Button type="submit" className="mt-2" disabled={busy}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
