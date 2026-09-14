import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Copy, LogIn, Mic, MicOff, PhoneOff, ShieldCheck } from "lucide-react";
import { useAvTable } from "@/lib/multiplayer/use-av-table";
import { useP2PRoom } from "@/lib/multiplayer/use-p2p-room";

type SessionRole = "guest" | "operator";
interface TarotSessionProps { code: string; guestName: string; role: SessionRole; onLeave: () => void }

function StreamVideo({ stream, muted, label }: { stream: MediaStream | null; muted?: boolean; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream }, [stream]);
  return <div className="reading-video">{stream ? <video ref={ref} autoPlay playsInline muted={muted} aria-label={label} /> : <div className="reading-video-placeholder"><span>♠</span><p>{label}</p></div>}</div>;
}

export function TarotSession({ code, guestName, role, onLeave }: TarotSessionProps) {
  const room = `tarot-${code.toLowerCase()}`;
  const displayName = role === "operator" ? "Six" : guestName;
  const presence = useP2PRoom({ room: `${room}-lobby`, name: displayName });
  const { broadcast, joined, onMessage, peers } = presence;
  const [active, setActive] = useState(role === "operator");
  useEffect(() => onMessage((_from, data) => { if (typeof data === "object" && data && "type" in data && data.type === "session-active") setActive(true) }), [onMessage]);
  useEffect(() => { if (role === "operator" && joined && peers.length > 0) broadcast({ type: "session-active" }) }, [broadcast, joined, peers.length, role]);
  return <section className="session-shell" aria-labelledby="session-title"><div className="session-heading"><div><p className="eyebrow"><ShieldCheck size={15} /> Private reading room</p><h2 id="session-title">Room {code}</h2></div><button className="ghost-button" type="button" onClick={() => navigator.clipboard?.writeText(code)}><Copy size={16} /> Copy code</button></div>{active ? <ActiveVideoRoom room={room} name={displayName} onLeave={onLeave} /> : <div className="waiting-room"><video src="/brand/penny-avatar.webm" autoPlay muted loop playsInline /><div><p className="eyebrow">The velvet rope is closed</p><h3>Your reader will open the room.</h3><p>Keep this window open. Camera and microphone access begin only after Six activates the session.</p><span className="waiting-pulse">Waiting for operator</span></div></div>}</section>;
}

function ActiveVideoRoom({ room, name, onLeave }: { room: string; name: string; onLeave: () => void }) {
  const av = useAvTable(room, name);
  const primaryRemote = av.remotes[0];
  return <div className="active-room"><div className="video-grid"><StreamVideo stream={primaryRemote?.stream ?? null} label={primaryRemote?.name ?? "Waiting for the other guest"} /><div className="local-video"><StreamVideo stream={av.localStream} muted label={`${name} preview`} /></div></div>{av.error ? <p className="session-error">{av.error}</p> : null}<div className="call-controls" aria-label="Call controls"><button type="button" onClick={av.toggleMute}>{av.muted ? <MicOff /> : <Mic />}<span>{av.muted ? "Unmute" : "Mute"}</span></button><button type="button" onClick={av.toggleCam}>{av.camOff ? <CameraOff /> : <Camera />}<span>{av.camOff ? "Camera on" : "Camera off"}</span></button><button className="end-call" type="button" onClick={onLeave}><PhoneOff /><span>Leave</span></button></div></div>;
}

export function JoinSession({ onJoin }: { onJoin: (code: string, name: string) => void }) {
  const [code, setCode] = useState(""); const [name, setName] = useState("");
  return <form className="join-form" onSubmit={(event) => { event.preventDefault(); if (code.trim() && name.trim()) onJoin(code.trim().toUpperCase(), name.trim()) }}><label>Name<input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" /></label><label>Room code<input value={code} onChange={(event) => setCode(event.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 6))} required /></label><button className="primary-button" type="submit"><LogIn size={17} /> Enter waiting room</button></form>;
}



