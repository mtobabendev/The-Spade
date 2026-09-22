import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Check, Copy, Mic, MicOff, PhoneOff, ShieldCheck, Video } from "lucide-react";
import { useAvTable } from "@/lib/multiplayer/use-av-table";

type SessionRole = "guest" | "operator";
interface TarotSessionProps { code: string; guestName: string; role: SessionRole; onLeave: () => void; onActivate?: () => void }
type WaitingGuest = { id: string; name: string };

function StreamVideo({ stream, muted, label }: { stream: MediaStream | null; muted?: boolean; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream }, [stream]);
  return <div className="reading-video">{stream ? <video ref={ref} autoPlay playsInline muted={muted} aria-label={label} /> : <div className="reading-video-placeholder"><span>♠</span><p>{label}</p></div>}</div>;
}

export function TarotSession({ code, guestName, role, onLeave }: TarotSessionProps) {
  const room = `tarot-${code.toLowerCase()}`;
  const displayName = role === "operator" ? "Host" : guestName;
  const [guestId] = useState(() => `g-${Math.random().toString(36).slice(2, 10)}`);
  const [admitted, setAdmitted] = useState(role === "operator");
  const [waitingGuests, setWaitingGuests] = useState<WaitingGuest[]>([]);

  useEffect(() => {
    let dead = false;
    let timer: number | undefined;
    async function poll() {
      if (dead) return;
      try {
        if (role === "guest") {
          await fetch("/api/rtc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "request-join", room, peer: guestId, name: displayName }) });
          const res = await fetch(`/api/rtc?op=admissions&room=${encodeURIComponent(room)}&peer=${encodeURIComponent(guestId)}`, { cache: "no-store" });
          if (res.ok) { const body = await res.json() as { accepted?: boolean }; if (body.accepted) setAdmitted(true); }
        } else {
          const res = await fetch(`/api/rtc?op=admissions&room=${encodeURIComponent(room)}`, { cache: "no-store" });
          if (res.ok) { const body = await res.json() as { waiting?: WaitingGuest[] }; setWaitingGuests(body.waiting ?? []); }
        }
      } catch { /* next poll retries */ }
      if (!dead) timer = window.setTimeout(poll, 1000);
    }
    void poll();
    return () => { dead = true; if (timer) window.clearTimeout(timer); };
  }, [displayName, guestId, role, room]);

  async function acceptGuest(peerId: string) {
    const res = await fetch("/api/rtc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "accept-join", room, peer: peerId }) });
    if (res.ok) setWaitingGuests((current) => current.filter((guest) => guest.id !== peerId));
  }

  return <section className="session-shell" aria-labelledby="session-title">
    <div className="session-heading"><div><p className="eyebrow"><ShieldCheck size={15} /> Private video room</p><h2 id="session-title">Room {code}</h2></div><button className="ghost-button" type="button" onClick={() => navigator.clipboard?.writeText(code)}><Copy size={16} /> Copy code</button></div>
    {role === "operator" ? <div className="participant-picker" aria-label="Guests waiting for admission">
      <p className="eyebrow">Guest admission</p>
      {waitingGuests.length > 0 ? <div className="call-controls">{waitingGuests.map((guest) => <button className="primary-button" type="button" key={guest.id} onClick={() => void acceptGuest(guest.id)}><Check size={17} /><span>ACCEPT {guest.name}</span></button>)}</div> : <p>Waiting for a guest to enter this room code…</p>}
    </div> : null}
    {admitted ? <ActiveVideoRoom room={room} name={displayName} role={role} onLeave={onLeave} /> : <div className="waiting-room"><div><p className="eyebrow">Waiting for host</p><h3>Your request is at the host's door.</h3><p>Keep this screen open. Camera and microphone start after the host taps ACCEPT.</p><span className="waiting-pulse">WAITING FOR HOST ACCEPTANCE</span></div></div>}
  </section>;
}

function ActiveVideoRoom({ room, name, role, onLeave }: { room: string; name: string; role: SessionRole; onLeave: () => void }) {
  const av = useAvTable(room, name); const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  useEffect(() => { if (av.remotes.length === 0) { setSelectedPeerId(null); return; } if (!selectedPeerId || !av.remotes.some((remote) => remote.id === selectedPeerId)) setSelectedPeerId(av.remotes[0].id); }, [av.remotes, selectedPeerId]);
  const primaryRemote = av.remotes.find((remote) => remote.id === selectedPeerId) ?? av.remotes[0];
  return <div className="active-room">
    {role === "operator" && av.remotes.length > 0 ? <div className="participant-picker" aria-label="Room participants"><p className="eyebrow">Participants · {av.remotes.length + 1} in room</p><div className="call-controls">{av.remotes.map((remote) => <button type="button" key={remote.id} aria-pressed={remote.id === primaryRemote?.id} onClick={() => setSelectedPeerId(remote.id)}><Video size={16} /><span>{remote.name}</span></button>)}</div></div> : null}
    <div className="video-grid"><StreamVideo stream={primaryRemote?.stream ?? null} label={primaryRemote?.name ?? "Waiting for the other person"} /><div className="local-video"><StreamVideo stream={av.localStream} muted label={`${name} preview`} /></div></div>
    {av.error ? <p className="session-error">{av.error}</p> : null}
    <div className="call-controls" aria-label="Call controls"><button type="button" onClick={av.toggleMute}>{av.muted ? <MicOff /> : <Mic />}<span>{av.muted ? "Unmute" : "Mute"}</span></button><button type="button" onClick={av.toggleCam}>{av.camOff ? <CameraOff /> : <Camera />}<span>{av.camOff ? "Camera on" : "Camera off"}</span></button><button className="end-call" type="button" onClick={onLeave}><PhoneOff /><span>Leave</span></button></div>
  </div>;
}
