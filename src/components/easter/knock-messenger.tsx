import { useEffect, useRef, useState } from "react";
import { brand } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Msg = { from: "you" | "them"; text: string };

const OPENING: Msg[] = [
  { from: "them", text: "You're at the table. That's already a green flag." },
  { from: "them", text: "This is not Tinder. This is worse. This is Commander night." },
];

const REPLIES = [
  "Bring a deck, not a manifesto.",
  "Counter pickup only. I don't do porch pirates.",
  "If you ask for Venmo I will pretend the wifi died.",
  "Sit down. The lonely-nerd chair is still warm.",
  "Judge call: that's a maybe, honey.",
];

function unlocked() {
  try {
    return localStorage.getItem("spade-knock") === "1";
  } catch {
    return false;
  }
}

export function KnockMessenger() {
  const [open, setOpen] = useState(false);
  const [match, setMatch] = useState(false);
  const [found, setFound] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Msg[]>(OPENING);
  const taps = useRef<{ n: number; t: number }>({ n: 0, t: 0 });
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFound(unlocked());
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, open]);

  useEffect(() => {
    function onKnock() {
      const now = Date.now();
      if (now - taps.current.t > 2600) taps.current.n = 0;
      taps.current.t = now;
      taps.current.n += 1;
      if (taps.current.n >= 5) {
        taps.current.n = 0;
        try {
          localStorage.setItem("spade-knock", "1");
        } catch {
          /* ignore */
        }
        setFound(true);
        setMatch(true);
        setOpen(true);
        window.setTimeout(() => setMatch(false), 1600);
      }
    }
    window.addEventListener("spade-knock", onKnock);
    return () => window.removeEventListener("spade-knock", onKnock);
  }, []);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setMessages((m) => [...m, { from: "you", text }]);
    const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)] ?? REPLIES[0];
    window.setTimeout(() => {
      setMessages((m) => [...m, { from: "them", text: reply }]);
    }, 500);
  }

  return (
    <>
      {found ? (
        <button
          type="button"
          className="knock-fab"
          aria-label="Open Knock"
          onClick={() => setOpen(true)}
        />
      ) : (
        <button
          type="button"
          className="knock-fab"
          aria-label="Knock"
          onClick={() => window.dispatchEvent(new Event("spade-knock"))}
        />
      )}

      {open ? (
        <aside className="knock-sheet" role="dialog" aria-label="Knock messenger">
          {match ? (
            <div className="knock-match">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-pink">It is a match</p>
                <p className="mt-2 font-display text-3xl font-semibold">Knock.</p>
                <p className="mt-2 text-sm text-muted">
                  {brand.hostName} found you hiding behind the ads that are not here.
                </p>
              </div>
            </div>
          ) : null}
          <header>
            <img
              src="/brand/penny.jpg"
              alt=""
              className="size-10 rounded-full object-cover object-top"
            />
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold leading-none">Knock</p>
              <p className="mt-1 truncate text-xs text-muted">
                Dating-app energy. Table-only rules. No ads.
              </p>
            </div>
            <button
              type="button"
              className="text-xs text-muted hover:text-fg"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </header>
          <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <p
                key={`${m.from}-${i}`}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  m.from === "you"
                    ? "ml-auto bg-purple text-fg"
                    : "bg-raised text-fg",
                )}
              >
                {m.text}
              </p>
            ))}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Say something at the table"
            />
            <Button type="submit" size="sm">
              Send
            </Button>
          </form>
        </aside>
      ) : null}
    </>
  );
}

export function knockPenny() {
  window.dispatchEvent(new Event("spade-knock"));
}
