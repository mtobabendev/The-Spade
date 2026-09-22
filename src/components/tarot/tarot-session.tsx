import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Copy, Mic, MicOff, PhoneOff, ShieldCheck } from "lucide-react";

type SessionRole = "guest" | "operator";
interface TarotSessionProps { code: string; guestName: string; role: SessionRole; onLeave: () => void; onActivate?: () => void }
type WireSignal = { id:number; from:string; kind:"offer"|"answer"|"ice"; payload:any };

export function TarotSession({ code, guestName, role, onLeave }: TarotSessionProps) {
  const room = `tarot-${code.toLowerCase()}`;
  const [guestId] = useState(() => `guest_${Math.random().toString(36).slice(2,10)}`);
  const selfId = role === "operator" ? "host" : guestId;
  const name = role === "operator" ? "Host" : guestName;
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const incomingOffer = useRef<{ from:string; offer:RTCSessionDescriptionInit } | null>(null);
  const cursor = useRef(0);
  const [incomingName, setIncomingName] = useState<string | null>(null);
  const [status, setStatus] = useState(role === "operator" ? "Waiting for guest to call…" : "Calling host…");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  async function send(to:string, kind:"offer"|"answer"|"ice", payload:any) {
    await fetch("/api/rtc", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({op:"signal",room,from:selfId,to,kind,payload}) });
  }

  async function media() {
    if (localStream.current) return localStream.current;
    const stream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
    localStream.current = stream;
    if (localVideo.current) localVideo.current.srcObject = stream;
    return stream;
  }

  function newPeer(remoteId:string) {
    pc.current?.close();
    const next = new RTCPeerConnection({iceServers:[{urls:["stun:stun.l.google.com:19302","stun:stun.cloudflare.com:3478"]}]});
    pc.current = next;
    next.onicecandidate = (e) => { if(e.candidate) void send(remoteId,"ice",e.candidate.toJSON()); };
    next.ontrack = (e) => { if(remoteVideo.current) remoteVideo.current.srcObject = e.streams[0]; };
    next.onconnectionstatechange = () => setStatus(next.connectionState === "connected" ? "Connected" : `Connection: ${next.connectionState}`);
    return next;
  }

  async function startGuestCall() {
    try {
      const stream = await media();
      const next = newPeer("host");
      stream.getTracks().forEach(t => next.addTrack(t,stream));
      const offer = await next.createOffer();
      await next.setLocalDescription(offer);
      await send("host","offer",offer);
      setStatus("Waiting for host to accept…");
    } catch(e) { setStatus(`Camera/mic error: ${e instanceof Error ? e.message : "unknown error"}`); }
  }

  async function acceptCall() {
    const call = incomingOffer.current;
    if(!call) return;
    try {
      const stream = await media();
      const next = newPeer(call.from);
      stream.getTracks().forEach(t => next.addTrack(t,stream));
      await next.setRemoteDescription(call.offer);
      for(const c of candidateQueue.current) await next.addIceCandidate(c);
      candidateQueue.current=[];
      const answer=await next.createAnswer();
      await next.setLocalDescription(answer);
      await send(call.from,"answer",answer);
      incomingOffer.current=null;
      setIncomingName(null);
      setStatus("Connecting…");
    } catch(e) { setStatus(`Accept failed: ${e instanceof Error ? e.message : "unknown error"}`); }
  }

  useEffect(() => {
    let dead=false; let timer:number|undefined;
    async function poll(){
      if(dead) return;
      try {
        const q=new URLSearchParams({room,peer:selfId,name,since:String(cursor.current)});
        const res=await fetch(`/api/rtc?${q}`,{cache:"no-store"});
        if(res.ok){
          const body=await res.json() as {signals:WireSignal[]};
          for(const sig of body.signals){
            cursor.current=Math.max(cursor.current,sig.id);
            if(sig.kind==="offer" && role==="operator"){
              incomingOffer.current={from:sig.from,offer:sig.payload};
              setIncomingName(guestName || "Guest");
              setStatus("Guest is waiting for your approval");
            } else if(sig.kind==="answer" && role==="guest" && pc.current){
              await pc.current.setRemoteDescription(sig.payload);
              for(const c of candidateQueue.current) await pc.current.addIceCandidate(c);
              candidateQueue.current=[];
            } else if(sig.kind==="ice"){
              if(pc.current?.remoteDescription) await pc.current.addIceCandidate(sig.payload);
              else candidateQueue.current.push(sig.payload);
            }
          }
        }
      } catch { /* retry */ }
      if(!dead) timer=window.setTimeout(poll,500);
    }
    void poll();
    if(role==="guest") void startGuestCall();
    return()=>{dead=true;if(timer)clearTimeout(timer);pc.current?.close();localStream.current?.getTracks().forEach(t=>t.stop());void fetch("/api/rtc",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({op:"leave",room,peer:selfId}),keepalive:true});};
  // one call session per mounted modal
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  function toggleMute(){const track=localStream.current?.getAudioTracks()[0];if(track){track.enabled=!track.enabled;setMuted(!track.enabled)}}
  function toggleCam(){const track=localStream.current?.getVideoTracks()[0];if(track){track.enabled=!track.enabled;setCamOff(!track.enabled)}}

  return <section className="session-shell" aria-labelledby="session-title">
    <div className="session-heading"><div><p className="eyebrow"><ShieldCheck size={15}/> Private video room</p><h2 id="session-title">Room {code}</h2></div><button className="ghost-button" type="button" onClick={()=>navigator.clipboard?.writeText(code)}><Copy size={16}/> Copy code</button></div>
    {role==="operator" ? <div className="participant-picker" style={{position:"relative",zIndex:50}}><p className="eyebrow">HOST CONTROLS</p>{incomingName ? <button className="primary-button" style={{width:"100%",minHeight:56,fontSize:18}} type="button" onClick={()=>void acceptCall()}>ACCEPT {incomingName.toUpperCase()}</button> : <p>Waiting for guest request…</p>}</div> : null}
    <p className="form-note">{status}</p>
    <div className="video-grid"><div className="reading-video"><video ref={remoteVideo} autoPlay playsInline /></div><div className="local-video"><div className="reading-video"><video ref={localVideo} autoPlay playsInline muted /></div></div></div>
    <div className="call-controls"><button type="button" onClick={toggleMute}>{muted?<MicOff/>:<Mic/>}<span>{muted?"Unmute":"Mute"}</span></button><button type="button" onClick={toggleCam}>{camOff?<CameraOff/>:<Camera/>}<span>{camOff?"Camera on":"Camera off"}</span></button><button className="end-call" type="button" onClick={onLeave}><PhoneOff/><span>Leave</span></button></div>
  </section>;
}
