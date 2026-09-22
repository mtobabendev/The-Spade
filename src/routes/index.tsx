import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, LogIn, Video } from "lucide-react";
import { TarotSession } from "@/components/tarot/tarot-session";

export const Route = createFileRoute("/")({ component: Landing });

type Mode = "browse" | "host" | "join" | "session";
type Session = { code: string; name: string; role: "guest" | "operator" };

const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

function Landing() {
  const [mode, setMode] = useState<Mode>("browse");
  const [session, setSession] = useState<Session | null>(null);
  const close = () => { setMode("browse"); setSession(null); };

  return <main className="spade-site">
    <header className="spade-header">
      <a className="spade-brand" href="#top" aria-label="The Spade home"><span>♠</span><strong>THE SPADE</strong></a>
      <nav aria-label="Primary navigation"><button type="button" onClick={() => setMode("join")}>Join a room</button></nav>
    </header>

    <section className="speakeasy-hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow">♠ Private two-person video room</p>
        <h1>One person hosts.<br /><em>The other person joins.</em></h1>
        <p className="hero-lede">No account. No payment. No guessing which button to press. The host opens the room first and sends the six-character room code to the guest.</p>
        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={() => setMode("host")}><Video size={18} /> I AM THE HOST</button>
          <button className="text-button" type="button" onClick={() => setMode("join")}><LogIn size={18} /> I AM JOINING</button>
        </div>
      </div>
      <div className="penny-stage" aria-label="The Spade"><video src="/brand/penny-avatar.webm" poster="/brand/penny-tarot.jpg" autoPlay muted loop playsInline /></div>
    </section>

    <section className="how-section" id="how">
      <div><span>01</span><h3>HOST GOES FIRST</h3><p>On phone #1 tap <strong>I AM THE HOST</strong>. A room code is created. Keep that phone on the room screen.</p></div>
      <div><span>02</span><h3>SEND THE CODE</h3><p>Send the displayed six-character code to the other person. They do not create another room.</p></div>
      <div><span>03</span><h3>GUEST JOINS</h3><p>On phone #2 tap <strong>I AM JOINING</strong>, enter the same code and a name, then allow camera and microphone.</p></div>
    </section>

    <footer><span>♠</span><p>The Spade · Private room test</p></footer>

    {mode !== "browse" ? <Modal title={mode === "host" ? "HOST · OPEN THIS FIRST" : mode === "join" ? "GUEST · JOIN THE HOST" : session?.role === "operator" ? "HOST ROOM" : "GUEST ROOM"} onClose={close}>
      {mode === "host" ? <HostStart onStart={(code) => { setSession({ code, name: "Host", role: "operator" }); setMode("session"); }} /> : null}
      {mode === "join" ? <GuestJoin onJoin={(code, name) => { setSession({ code, name, role: "guest" }); setMode("session"); }} /> : null}
      {mode === "session" && session ? <TarotSession code={session.code} guestName={session.name} role={session.role} onLeave={close} /> : null}
    </Modal> : null}
  </main>;
}

function HostStart({ onStart }: { onStart: (code: string) => void }) {
  const code = useMemo(makeCode, []);
  const [copied, setCopied] = useState(false);
  return <div className="join-form">
    <div className="booking-summary"><p>PHONE #1</p><h3>You are the host.</h3><strong>{code}</strong><small>This is the only room code. The guest uses this exact code.</small></div>
    <button className="text-button" type="button" onClick={async () => { await navigator.clipboard?.writeText(code); setCopied(true); }}><Copy size={17} /> {copied ? "CODE COPIED" : "COPY ROOM CODE"}</button>
    <p className="form-note">1. Copy or send the code. 2. Tap OPEN HOST ROOM. 3. Allow camera and microphone. 4. Keep this screen open while the guest joins.</p>
    <button className="primary-button" type="button" onClick={() => onStart(code)}><Video size={17} /> OPEN HOST ROOM</button>
  </div>;
}

function GuestJoin({ onJoin }: { onJoin: (code: string, name: string) => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  return <form className="join-form" onSubmit={(event) => { event.preventDefault(); const cleanCode = code.trim().toUpperCase(); const cleanName = name.trim(); if (cleanCode && cleanName) onJoin(cleanCode, cleanName); }}>
    <div className="booking-summary"><p>PHONE #2</p><h3>The host must already have the room open.</h3><small>Do not create a new room. Enter the host's six-character code below.</small></div>
    <label>Your name<input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" /></label>
    <label>HOST'S ROOM CODE<input value={code} onChange={(event) => setCode(event.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase())} required minLength={6} maxLength={6} autoCapitalize="characters" /></label>
    <p className="form-note">After you tap JOIN HOST ROOM, allow camera and microphone when the browser asks.</p>
    <button className="primary-button" type="submit"><LogIn size={17} /> JOIN HOST ROOM</button>
  </form>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" role="presentation"><section className="spade-modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-bar"><span>♠</span><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close">×</button></div>{children}</section></div>;
}
