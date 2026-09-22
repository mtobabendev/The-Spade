import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Check, Copy, Mic, MicOff, PhoneOff, ShieldCheck, Video } from "lucide-react";
import { useAvTable } from "@/lib/multiplayer/use-av-table";
import { useP2PRoom } from "@/lib/multiplayer/use-p2p-room";

type SessionRole = "guest" | "operator";
interface TarotSessionProps { code: string; guestName: string; role: SessionRole; onLeave: () => void; onActivate?: () => void }

function StreamVideo({ stream, muted, label }: { stream: MediaStream | null; muted?: boolean; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream }, [stream]);
  return <div className="reading-video">{stream ? <video ref={ref} autoPlay playsInline muted={muted} aria-label={label} /> : <div className="reading-video-placeholder"><span>♠</span><p>{label}</p></div>}</div>;
}

export function TarotSession({ code, guestName, role, onLeave }: TarotSessionProps) {
  const room = `tarot-${code.toLowerCase()}`;
  const displayName = role === "operator" ? "Host" : guestName;
  const lobby = useP2PRoom({ room: `${room}-lobby`, name: displayName });
  const [admitted, setAdmitted] = useState(role === "operator");
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => lobby.onMessage((from, data) => {
    if (role !== "guest" || typeof data !== "object" || !data || !("type" in data)) return;
    if (data.type === "admitted") setAdmitted(true);
  }), [lobby.onMessage, role]);

  const waitingGuests = role === "operator" ? lobby.peers.filter((peer) => !acceptedIds.has(peer.id)) : [];

  function acceptGuest(peerId: string) {
    lobby.send({ type: "admitted" }, peerId);
    setAcceptedIds((current) => new Set(current).add(peerId));
  }

  return <section className="session-shell" aria-labelledby="session-title">
    <div className="session-heading">
      <div><p className="eyebrow"><ShieldCheck size={15} /> Private video room</p><h2 id="session-title">Room {code}</h2></div>
      <button className="ghost-button" type="button" onClick={() => navigator.clipboard?.writeText(code)}><Copy size={16} /> Copy code</button>
    </div>

    {role === "operator" && waitingGuests.length > 0 ? <div className="participant-picker" aria-label="Guests waiting for admission">
      <p className="eyebrow">Waiting to join</p>
      <div className="call-controls">{waitingGuests.map((peer) => <button className="primary-button" type="button" key={peer.id} onClick={() => acceptGuest(peer.id)}><Check size={17} /><span>ACCEPT {peer.name}</span></button>)}</div>
    </div> : null}

    {admitted ? <ActiveVideoRoom room={room} name={displayName} role={role} onLeave={onLeave} /> : <div className="waiting-room">
      <div><p className="eyebrow">Waiting for host</p><h3>The host has been notified.</h3><p>Keep this screen open. Your camera and microphone will start after the host taps ACCEPT.</p><span className="waiting-pulse">Waiting for host to accept you</span></div>
    </div>}
  </section>;
}

function ActiveVideoRoom({ room, name, role, onLeave }: { room: string; name: string; role: SessionRole; onLeave: () => void }) {
  const av = useAvTable(room, name);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);

  useEffect(() => {
    if (av.remotes.length === 0) { setSelectedPeerId(null); return; }
    if (!selectedPeerId || !av.remotes.some((remote) => remote.id === selectedPeerId)) setSelectedPeerId(av.remotes[0].id);
  }, [av.remotes, selectedPeerId]);

  const primaryRemote = av.remotes.find((remote) => remote.id === selectedPeerId) ?? av.remotes[0];

  return <div className="active-room">
    {role === "operator" && av.remotes.length > 0 ? <div className="participant-picker" aria-label="Room participants">
      <p className="eyebrow">Participants · {av.remotes.length + 1} in room</p>
      <div className="call-controls">{av.remotes.map((remote) => <button type="button" key={remote.id} aria-pressed={remote.id === primaryRemote?.id} onClick={() => setSelectedPeerId(remote.id)}><Video size={16} /><span>{remote.name}</span></button>)}</div>
    </div> : null}
    <div className="video-grid">
      <StreamVideo stream={primaryRemote?.stream ?? null} label={primaryRemote?.name ?? "Waiting for the other person"} />
      <div className="local-video"><StreamVideo stream={av.localStream} muted label={`${name} preview`} /></div>
    </div>
    {av.error ? <p className="session-error">{av.error}</p> : null}
    <div className="call-controls" aria-label="Call controls">
      <button type="button" onClick={av.toggleMute}>{av.muted ? <MicOff /> : <Mic />}<span>{av.muted ? "Unmute" : "Mute"}</span></button>
      <button type="button" onClick={av.toggleCam}>{av.camOff ? <CameraOff /> : <Camera />}<span>{av.camOff ? "Camera on" : "Camera off"}</span></button>
      <button className="end-call" type="button" onClick={onLeave}><PhoneOff /><span>Leave</span></button>
    </div>
  </div>;
}
