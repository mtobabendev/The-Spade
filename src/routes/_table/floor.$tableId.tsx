import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { TarotSession } from "@/components/tarot/tarot-session";
import { TABLES } from "@/lib/brand";
import { useP2PRoom } from "@/lib/multiplayer";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_table/floor/$tableId")({ component: TableRoom });

type ChatLine = { from: string; name: string; text: string };

function TableRoom() {
  const { tableId } = Route.useParams();
  const table = TABLES.find((t) => t.id === tableId);
  const user = useCurrentUser();
  const name = user?.displayName ?? "Player";
  const chatRoom = `tbl${tableId}chat`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  const avRoom = `tbl${tableId}av`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  const p2p = useP2PRoom({ room: chatRoom, name });
  const [videoRole, setVideoRole] = useState<"operator" | "guest" | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return p2p.onMessage((_from, data) => {
      const msg = data as { chat?: string; name?: string; from?: string };
      if (!msg.chat) return;
      setLines((prev) => [
        ...prev,
        { from: msg.from ?? "?", name: msg.name ?? "Player", text: msg.chat! },
      ]);
    });
  }, [p2p.onMessage]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines]);

  if (!table) {
    return (
      <p className="text-sm text-muted">
        Unknown table. <Link to="/floor">Back to the floor.</Link>
      </p>
    );
  }

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    p2p.send({ chat: text, name, from: p2p.selfId });
    setLines((prev) => [...prev, { from: p2p.selfId, name, text }]);
    setDraft("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Link to="/floor" className="text-xs text-muted hover:text-fg">
            Floor
          </Link>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{table.name}</h1>
          <p className="text-sm text-muted">{table.blurb}</p>
        </div>
        <p className="font-mono text-[11px] text-faint">
          {p2p.joined ? `${p2p.peers.length + 1} seated` : "joining…"}
        </p>
      </div>

      {videoRole ? (
        <TarotSession
          code={avRoom}
          guestName={name}
          role={videoRole}
          onLeave={() => setVideoRole(null)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setVideoRole("operator")}>
            Host table video
          </Button>
          <Button variant="outline" onClick={() => setVideoRole("guest")}>
            Request to join table video
          </Button>
        </div>
      )}
      <div className="rounded-lg border border-line bg-surface">
        <div ref={scroller} className="h-48 space-y-2 overflow-y-auto p-3 text-sm">
          {lines.length === 0 ? (
            <p className="text-muted">Table chat. Pass priority in here if the call drops.</p>
          ) : (
            lines.map((l, i) => (
              <p key={`${l.from}-${i}`}>
                <span className="text-pink">{l.name}</span>
                <span className="text-muted"> · </span>
                {l.text}
              </p>
            ))
          )}
        </div>
        <form onSubmit={sendChat} className="flex gap-2 border-t border-line p-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Say something"
          />
          <Button type="submit" size="sm">
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
