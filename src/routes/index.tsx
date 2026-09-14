import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Clock3, KeyRound, MoonStar, Sparkles, Video } from "lucide-react";
import { JoinSession, TarotSession } from "@/components/tarot/tarot-session";

export const Route = createFileRoute("/")({ component: Landing });
const readings = [
  { name: "Three Card Pull", duration: "15 minutes", price: "$20 cash", copy: "A focused look at the situation, the obstacle, and the next move." },
  { name: "Crossroads Reading", duration: "30 minutes", price: "$40 cash", copy: "Two paths, their tradeoffs, and the energy surrounding your decision." },
  { name: "Full Table", duration: "60 minutes", price: "$75 cash", copy: "A longer private session for a layered question or a wider life reading." },
] as const;
type Mode = "browse" | "book" | "join" | "operator" | "session";
const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

function Landing() {
  const [mode, setMode] = useState<Mode>("browse");
  const [selected, setSelected] = useState<(typeof readings)[number]>(readings[1]);
  const [session, setSession] = useState<{ code: string; name: string; role: "guest" | "operator" } | null>(null);
  const close = () => { setMode("browse"); setSession(null) };
  return <main className="spade-site">
    <header className="spade-header"><a className="spade-brand" href="#top" aria-label="The Spade home"><span>♠</span><strong>THE SPADE</strong></a><nav aria-label="Primary navigation"><a href="#readings">Readings</a><a href="#how">How it works</a><button type="button" onClick={() => setMode("join")}>Enter a room</button></nav></header>
    <section className="speakeasy-hero" id="top"><div className="hero-copy"><p className="eyebrow"><MoonStar size={16} /> Penny keeps the late table</p><h1>A quiet room.<br /><em>An honest reading.</em></h1><p className="hero-lede">Private live tarot readings from The Spade. Choose your table, pay cash at the point of sale, and receive a private room code.</p><div className="hero-actions"><button className="primary-button" type="button" onClick={() => setMode("book")}><CalendarDays size={18} /> Reserve a reading</button><button className="text-button" type="button" onClick={() => setMode("join")}><Video size={18} /> I have a room code</button></div><p className="door-note">For entertainment purposes. No guaranteed outcomes.</p></div><div className="penny-stage" aria-label="Penny, your host"><video src="/brand/penny-avatar.webm" poster="/brand/penny-tarot.jpg" autoPlay muted loop playsInline /><div className="penny-plaque"><span>YOUR HOST</span><strong>Penny</strong><small>Cards read after dark</small></div></div></section>
    <section className="reading-section" id="readings"><div className="section-heading"><p className="eyebrow">Choose your table</p><h2>One price. One private reading.</h2><p>No credits, subscriptions, or online payment. Cash is collected in person before the session is activated.</p></div><div className="reading-grid">{readings.map((reading) => <article key={reading.name} className={selected.name === reading.name ? "reading-card is-selected" : "reading-card"}><Sparkles aria-hidden="true" /><p>{reading.duration}</p><h3>{reading.name}</h3><span>{reading.price}</span><p>{reading.copy}</p><button type="button" onClick={() => { setSelected(reading); setMode("book") }}>Choose this reading</button></article>)}</div></section>
    <section className="how-section" id="how"><div><span>01</span><Clock3 /><h3>Reserve</h3><p>Choose a reading and tell us when you would like to meet.</p></div><div><span>02</span><KeyRound /><h3>Get your code</h3><p>After cash payment, your private six-character room code is issued.</p></div><div><span>03</span><Video /><h3>Meet privately</h3><p>Six activates the session; camera and microphone start only after the room opens.</p></div></section>
    <footer><span>♠</span><p>The Spade · Private tarot appointments</p><button type="button" onClick={() => setMode("operator")}>Operator entrance</button></footer>
    {mode !== "browse" ? <Modal title={mode === "operator" ? "Operator entrance" : mode === "session" ? "Private reading" : mode === "join" ? "Enter a room" : "Reserve your table"} onClose={close}>{mode === "book" ? <Booking reading={selected} onCreated={(code, name) => { setSession({ code, name, role: "guest" }); setMode("session") }} /> : null}{mode === "join" ? <JoinSession onJoin={(code, name) => { setSession({ code, name, role: "guest" }); setMode("session") }} /> : null}{mode === "operator" ? <OperatorLogin onAuthenticated={(code) => { setSession({ code, name: "Six", role: "operator" }); setMode("session") }} /> : null}{mode === "session" && session ? <TarotSession {...session} guestName={session.name} onLeave={close} /> : null}</Modal> : null}
  </main>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="spade-modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-bar"><span>♠</span><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close">×</button></div>{children}</section></div>;
}

function Booking({ reading, onCreated }: { reading: (typeof readings)[number]; onCreated: (code: string, name: string) => void }) {
  const [name, setName] = useState(""); const [contact, setContact] = useState(""); const code = useMemo(makeCode, []);
  return <form className="booking-form" onSubmit={(event) => { event.preventDefault(); onCreated(code, name.trim()) }}><div className="booking-summary"><p>{reading.duration}</p><h3>{reading.name}</h3><strong>{reading.price}</strong><small>Cash due before activation</small></div><label>Your name<input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" /></label><label>Phone or email<input value={contact} onChange={(event) => setContact(event.target.value)} required autoComplete="email" /></label><label>Preferred date and time<input type="datetime-local" required /></label><label>What would you like to explore?<textarea rows={3} placeholder="A short note is enough." /></label><button className="primary-button" type="submit">Request reading</button><p className="form-note">Submitting creates a provisional room code. The appointment is confirmed separately after cash payment.</p></form>;
}

function OperatorLogin({ onAuthenticated }: { onAuthenticated: (code: string) => void }) {
  const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [code, setCode] = useState(""); const [error, setError] = useState("");
  return <form className="operator-form" onSubmit={async (event) => { event.preventDefault(); setError(""); const response = await fetch("/api/operator", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) }); if (!response.ok) { setError("That key does not open this door."); return } onAuthenticated(code.trim().toUpperCase()) }}><p className="operator-intro">Operator credentials are verified on the server. Enter the customer’s room code to activate that session.</p><label>Operator name<input value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="username" /></label><label>Passcode<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" inputMode="numeric" /></label><label>Customer room code<input value={code} onChange={(event) => setCode(event.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 6))} required /></label>{error ? <p className="login-error" role="alert">{error}</p> : null}<button className="primary-button" type="submit"><KeyRound size={17} /> Activate session</button></form>;
}
