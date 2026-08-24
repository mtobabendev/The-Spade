import { createFileRoute, Link } from "@tanstack/react-router";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { brand } from "@/lib/brand";
import { knockPenny, KnockMessenger } from "@/components/easter/knock-messenger";
import { SpadeMark } from "@/components/brand/spade-mark";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg">
      <SpadeMark
        title=""
        className="pointer-events-none absolute -right-28 -top-20 size-[280px] select-none opacity-45 mix-blend-screen md:-right-20 md:-top-4 md:size-[540px] md:opacity-80"
      />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <SpadeMark className="size-8" />
          <span className="font-display text-sm font-semibold">{brand.name}</span>
        </div>
        <p className="hidden text-xs text-muted sm:block">{brand.legalName}</p>
      </header>

      <section className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-6 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pt-16">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-pink">
            Private LGS · {brand.city}
          </p>
          <h1 className="mt-4 max-w-xl font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Sit down.
            <span className="block text-silver">Spin the deck.</span>
            Play the night.
          </h1>
          <p className="mt-5 max-w-md text-base text-muted">
            {brand.name} is Matt's members table for {brand.shop}. Comics, Magic, Star Wars Unlimited,
            Pathfinder, D&D. Password past {brand.hostName}. Pay in the Vault. Pickup at the counter.
            No ads. Ever.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <SignedOut>
              <Link to="/login">
                <Button size="lg">Knock</Button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link to="/hall">
                <Button size="lg">Open the hall</Button>
              </Link>
            </SignedIn>
            <Link to="/meetings">
              <Button size="lg" variant="outline">
                Need a meeting
              </Button>
            </Link>
            <Link to="/easy">
              <Button size="lg" variant="pink">
                Easy button
              </Button>
            </Link>
          </div>
          <p className="mt-6 font-mono text-xs text-faint">
            Preview door code · {brand.inviteCode}
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            className="block w-full overflow-hidden rounded-xl border border-line bg-surface text-left shadow-[var(--shadow-soft)]"
            onClick={() => knockPenny()}
            aria-label={`${brand.hostName}, ${brand.hostRole}. Knock five times.`}
          >
            <img
              src="/brand/penny.jpg"
              alt={`${brand.hostName}, ${brand.hostRole}`}
              className="aspect-[3/4] w-full object-cover object-top"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/70 to-transparent p-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-pink">{brand.hostName}</p>
              <p className="font-display text-xl font-semibold">{brand.hostRole}</p>
              <p className="mt-1 text-sm text-muted">
                Business-card Penny. Judge, fill-in DM, and the door.
              </p>
            </div>
          </button>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-6xl gap-3 px-4 pb-20 md:grid-cols-3">
        {[
          { k: "Vault", t: "Cart, then a card. Meet at the shop.", d: "Square when the merchant account is live. Demo drawer until then. Pickup at the counter." },
          { k: "Spinner", t: "The deck is the nav.", d: "Main spinner stays. Folders spin up as you walk the tree, then vanish after five quiet seconds." },
          { k: "Floor", t: "Video tables that actually call.", d: "Commander, Unlimited, Pathfinder, Dungeon. Penny hosts if the chair is empty." },
        ].map((b) => (
          <article key={b.k} className="rounded-lg border border-line bg-surface p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-blue">{b.k}</p>
            <h2 className="mt-2 font-display text-xl font-semibold">{b.t}</h2>
            <p className="mt-2 text-sm text-muted">{b.d}</p>
          </article>
        ))}
      </section>
      <KnockMessenger />
    </div>
  );
}
