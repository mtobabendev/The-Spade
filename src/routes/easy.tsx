import { createFileRoute, Link } from "@tanstack/react-router";
import { EasyButtonQr } from "@/components/easy/easy-button";
import { SpadeMark } from "@/components/brand/spade-mark";
import { brand } from "@/lib/brand";
import { PUBLIC_MEETINGS_URL } from "@/lib/easy";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/easy")({ component: EasyPage });

function EasyPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg text-fg">
      <SpadeMark
        title=""
        className="pointer-events-none absolute -right-24 -top-16 size-[min(70vw,420px)] opacity-50 mix-blend-screen md:-right-10 md:opacity-70"
      />

      <header className="relative border-b border-line/80 print:hidden">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 text-fg">
            <SpadeMark className="size-8" />
            <span className="font-display text-sm font-semibold tracking-tight">{brand.name}</span>
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-pink">Easy</span>
          <div className="ml-auto">
            <Link to="/meetings">
              <Button size="sm" variant="ghost">
                Need a meeting
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl space-y-14 px-4 py-10">
        <section className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-pink">No excuses</p>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight md:text-6xl">
            That was easy.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted">
            Point a phone at Penny’s spade. Live AA and NA lists. No account. No fee. No speech.
            The joke is the button. The point is the chair.
          </p>
        </section>

        <EasyButtonQr />

        <section className="space-y-3 text-center">
          <p className="font-mono text-sm tracking-[0.08em] text-silver">
            {PUBLIC_MEETINGS_URL.replace("https://", "")}
          </p>
          <p className="text-sm text-muted">
            Card. Flyer. Stall door. Windshield. Same jump every time.
          </p>
        </section>

        <section className="space-y-6">
          <div className="text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-pink">The mock-up</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
              The button, as an object.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Same code as the scan above. Screenshot it. Send it. Print it.
            </p>
          </div>
          <img
            src="/brand/easy-button-mock.jpg"
            alt="Easy button with Penny’s neon spade QR"
            className="w-full rounded-xl border border-line shadow-[var(--shadow-soft)]"
          />
          <div className="mx-auto max-w-sm">
            <img
              src="/brand/easy-poster.jpg"
              alt="That was easy poster"
              className="w-full rounded-xl border border-line shadow-[var(--shadow-soft)]"
            />
          </div>
        </section>

        <p className="text-center text-xs leading-relaxed text-faint print:hidden">
          {brand.name} is not AA or NA and is not affiliated with either. The lists come from
          public intergroup and BMLT feeds. Confirm the door when you get there.
        </p>
      </main>
    </div>
  );
}
