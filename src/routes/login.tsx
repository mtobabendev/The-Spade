import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { brand } from "@/lib/brand";
import { knockPenny } from "@/components/easter/knock-messenger";
import { SpadeMark } from "@/components/brand/spade-mark";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({ email, password, name: name || "Player" });
        if (res.error) throw new Error(res.error.message);
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message);
      }
      window.location.assign("/hall");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh bg-bg md:grid-cols-2">
      <button
        type="button"
        className="relative hidden overflow-hidden md:block"
        onClick={() => knockPenny()}
        aria-label={`${brand.hostName} at the door`}
      >
        <img src="/brand/penny.jpg" alt="" className="h-full w-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 text-left">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-pink">{brand.hostName}</p>
          <p className="font-display text-2xl font-semibold">Password after you sit down.</p>
        </div>
      </button>
      <div className="relative grid place-items-center overflow-hidden px-4 py-10">
        <SpadeMark
          title=""
          className="pointer-events-none absolute left-1/2 top-8 size-[min(88vw,380px)] -translate-x-1/2 select-none opacity-55 mix-blend-screen md:top-12"
        />
        <div className="relative w-full max-w-sm space-y-6">
          <Link to="/" className="flex items-center gap-2 text-fg">
            <SpadeMark className="size-8" />
            <span className="font-display font-semibold">{brand.name}</span>
          </Link>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Members only.</h1>
            <p className="mt-1 text-sm text-muted">Sign in, then the table password past Penny.</p>
          </div>

          {authEnabled ? (
            <div className="space-y-2">
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  variant="outline"
                  className="w-full"
                  onClick={() => signIn(p.providerId, { callbackURL: "/hall" })}
                >
                  Continue with {p.label}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          )}

          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-faint">
            <span className="h-px flex-1 bg-line" />
            or email
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={onEmail} className="space-y-3">
            {mode === "up" ? (
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Working…" : mode === "up" ? "Create member" : "Sign in"}
            </Button>
          </form>
          <button
            type="button"
            className="text-sm text-muted hover:text-fg"
            onClick={() => setMode(mode === "up" ? "in" : "up")}
          >
            {mode === "up" ? "Already have a seat? Sign in" : "New to the shop? Create a member"}
          </button>
          <Link to="/meetings" className="block text-sm text-pink hover:underline">
            Need a meeting? No account required.
          </Link>
        </div>
      </div>
    </main>
  );
}
