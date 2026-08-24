import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { REPOS } from "@/lib/nexus";
import { listGotham, sendGotham, type GothamMessage } from "@/lib/server/nexus";
import { RepoLink } from "@/components/nexus/watch-rail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_table/nexus/messenger")({ component: Gotham });

function Gotham() {
  const [messages, setMessages] = useState<GothamMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const rows = await listGotham();
      setMessages(rows);
    } catch {
      /* keep last */
    }
  }

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    setDraft("");
    const res = await sendGotham({ data: { body } });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setDraft(body);
      return;
    }
    setMessages((m) => [...m, res.message]);
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-pink">Gotham Messenger</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Clock tower.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          House channel for members. No stories, no reach, no blue unread dots harvesting your
          evening. If you spam, Penny will tell you to stop it.
        </p>
        <RepoLink href={REPOS.gotham}>Gotham-Messenger on GitHub</RepoLink>
      </section>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div ref={scroller} className="flex max-h-[52vh] min-h-64 flex-col gap-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <article key={m.id} className="max-w-[34rem]">
              <p className="text-xs text-faint">
                {m.display_name} <span className="text-muted">@{m.handle}</span>
              </p>
              <p
                className={cn(
                  "mt-1 rounded-md px-3 py-2 text-sm",
                  m.user_id === "house" ? "bg-raised text-silver" : "bg-bg text-fg",
                )}
              >
                {m.body}
              </p>
            </article>
          ))}
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={400}
            placeholder="Message the tower"
            aria-label="Message"
          />
          <Button type="submit" disabled={busy || !draft.trim()}>
            Send
          </Button>
        </form>
        {error ? <p className="px-3 pb-3 text-sm text-danger">{error}</p> : null}
      </div>
    </div>
  );
}
