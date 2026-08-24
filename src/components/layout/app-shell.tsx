import { Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { brand } from "@/lib/brand";
import { useCart } from "@/lib/cart-store";
import { getMyProfile, redeemInvite, type Profile } from "@/lib/server/spade";
import { SpadeMark } from "@/components/brand/spade-mark";
import { SpinnerNav } from "@/components/nav/spinner-nav";
import { KnockMessenger, knockPenny } from "@/components/easter/knock-messenger";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function AppShell() {
  const { user, isPending } = useCurrentUserState();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [cartCount, setCartCount] = useState(0);


  useEffect(() => {
    const sync = () =>
      setCartCount(useCart.getState().items.reduce((n, i) => n + i.qty, 0));
    sync();
    return useCart.subscribe(sync);
  }, []);

  useEffect(() => {
    if (!user) return;
    let live = true;
    getMyProfile()
      .then((p) => {
        if (live) setProfile(p);
      })
      .catch(() => {
        if (live) setProfile(null);
      })
      .finally(() => {
        if (live) setLoadingProfile(false);
      });
    return () => {
      live = false;
    };
  }, [user]);

  if (isPending) {
    return <div className="min-h-dvh bg-bg" />;
  }
  if (!user) return <RedirectToSignIn />;

  if (!loadingProfile && profile && !profile.invited) {
    return <PennyDoor onJoined={(p) => setProfile(p)} />;
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link to="/hall" className="flex items-center gap-2 text-fg">
            <SpadeMark className="size-8" />
            <span className="font-display text-sm font-semibold tracking-tight">{brand.name}</span>
          </Link>
          <p className="hidden text-xs text-muted sm:block">{brand.shop} · {brand.city}</p>
          <div className="ml-auto flex items-center gap-3">
            <Link
              to="/cart"
              className="relative inline-flex h-11 items-center rounded-md px-3 text-sm text-muted hover:text-fg"
            >
              Cart
              {cartCount ? (
                <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-pink px-1.5 text-xs font-medium text-bg">
                  {cartCount}
                </span>
              ) : null}
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-48 pt-6 md:pb-44">
        {loadingProfile ? <div className="h-40 animate-pulse rounded-xl bg-surface" /> : <Outlet />}
      </main>

      <SpinnerNav />
      <KnockMessenger />
    </div>
  );
}

function PennyDoor({ onJoined }: { onJoined: (p: Profile) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await redeemInvite({ data: { code } });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const p = await getMyProfile();
    onJoined(p);
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg text-fg">
      <img
        src="/brand/penny.jpg"
        alt={`${brand.hostName} at the door`}
        data-knock-target
        onClick={() => knockPenny()}
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/75 to-bg/20" />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-end px-4 pb-10 pt-16">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-pink">Personal table</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Password to get past {brand.hostName}.
        </h1>
        <p className="mt-2 text-sm text-muted">
          This is Matt's side of the shop. {brand.inviteHint}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3 rounded-xl border border-line bg-bg/80 p-4 backdrop-blur">
          <div className="space-y-1.5">
            <Label htmlFor="invite">Table password</Label>
            <Input
              id="invite"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Checking…" : "Come in"}
          </Button>
        </form>
      </div>
      <KnockMessenger />
    </div>
  );
}
