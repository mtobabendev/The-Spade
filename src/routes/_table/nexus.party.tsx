import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LIVE, REPOS } from "@/lib/nexus";
import { createPartyPost, listPartyPosts, type PartyPost } from "@/lib/server/nexus";
import { RepoLink } from "@/components/nexus/watch-rail";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export const Route = createFileRoute("/_table/nexus/party")({ component: ThePool });

const BANNED = [
  "Penny at the table",
  "Shop night, no ads",
  "WildCard DEV page",
  "Commander, not content",
  "The last story",
  "Grid square six",
];

function ThePool() {
  const [posts, setPosts] = useState<PartyPost[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPartyPosts()
      .then(setPosts)
      .catch(() => setPosts([]));
  }, []);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      const post = await createPartyPost({ data: { body } });
      setPosts((p) => [post, ...p]);
      setDraft("");
    } catch {
      setError("The pool swallowed that. Try again.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="pool-noodle" aria-hidden />
        <div className="relative px-4 pb-5 pt-4">
          <div className="water-wings" aria-hidden>
            <span />
            <span />
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-pink">The Pool</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            What Facebook could be if Mark loosened the reins.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Each member gets a little piece of the internet that is not an ad farm. Chronological wall.
            No suggested rage. No kiddie-pool lifeguard with a spreadsheet. Bring water wings and a
            pool noodle.
          </p>
          <p className="mt-3 font-display text-lg text-pink">Unauthorized fun detected.</p>
          <p className="mt-3 text-sm text-muted">
            Penny's Instagram and the WildCard DEV Facebook page got dunked by an angry little
            algorithm. We have not been back. The Arthur Fleck prototype is the receipt. This pool
            is the replacement — chronological, no ads, no suggested rage.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4">
            <RepoLink href={REPOS.party}>wildcard-party</RepoLink>
            <a
              href={LIVE.party}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center text-sm text-blue hover:underline"
            >
              Live house party
            </a>
            <RepoLink href={REPOS.fleck}>Arthur-Fleck-FB prototype</RepoLink>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">The banned grid</h2>
          <p className="text-xs text-faint">Instagram exhibit A</p>
        </div>
        <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-md border border-line">
          {BANNED.map((caption) => (
            <figure key={caption} className="banned-tile">
              <figcaption>{caption}</figcaption>
              <span>Removed</span>
            </figure>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Six squares. Zero ads. The algorithm still took it personally.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">The wall</h2>
        <form onSubmit={publish} className="mb-4 space-y-2 rounded-lg border border-line bg-surface p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={280}
            placeholder="Write on the wall. It stays where you put it."
            className="min-h-24"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-faint">{280 - draft.length} left · no boosts</p>
            <Button type="submit" size="sm" disabled={busy || !draft.trim()}>
              {busy ? "Posting…" : "Post"}
            </Button>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </form>
        <ul className="space-y-2">
          {posts.map((post) => (
            <li key={post.id} className="rounded-md border border-line bg-surface px-4 py-3">
              <p className="text-sm font-medium">
                {post.display_name}{" "}
                <span className="font-normal text-faint">@{post.handle}</span>
              </p>
              <p className="mt-1 text-sm">{post.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
