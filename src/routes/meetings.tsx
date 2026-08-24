import { createFileRoute, Link } from "@tanstack/react-router";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { brand } from "@/lib/brand";
import { MeetingFinder } from "@/components/meetings/finder";
import { SpadeMark } from "@/components/brand/spade-mark";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/meetings")({ component: MeetingsPage });

function MeetingsPage() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-line/80">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 text-fg">
            <SpadeMark className="size-8" />
            <span className="font-display text-sm font-semibold tracking-tight">{brand.name}</span>
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-pink">Meetings</span>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/easy" className="text-sm text-muted hover:text-fg">
              Easy button
            </Link>
            <SignedIn>
              <Link to="/nexus/office" className="text-sm text-muted hover:text-fg">
                Back to the office
              </Link>
            </SignedIn>
            <SignedOut>
              <Link to="/login">
                <Button size="sm" variant="ghost">
                  Members
                </Button>
              </Link>
            </SignedOut>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <section>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-pink">Ask Penny</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Need a chair.</h1>
          <p className="mt-3 max-w-xl text-sm text-muted">
            No account. No fee. No speech. Share a location or a zip and she will pull the live AA
            and NA lists around you — the same kind of directories the free Meeting Guide and NA
            apps use. The point is the next door, not a pep talk.
          </p>
        </section>
        <MeetingFinder />
      </main>
    </div>
  );
}
