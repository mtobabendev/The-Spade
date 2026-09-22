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
  const remoteStream = useRef<MediaStream>(new MediaStream());
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const incomingOffer = useRef<{ from:string; offer:RTCSessionDescriptionInit } | null>(null);
  const cursor = useRef(0);
  const [incomingName, setIncomingName] = useState<string | null>(null);
  const [status, setStatus] = useState(role === "operator" ? "Waiting for guest to call…" : "Calling host…");
  const [debug, setDebug] = useState<string[]>([`ROLE=${role}`, `ROOM=${room}`, `SELF=${selfId}`]);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const log = (line:string) => setDebug(current => [...current.slice(-11), `${new Date().toLocaleTimeString()} ${line}`]);

  async function send(to:string, kind:"offer"|"answer"|"ice", payload:any) {
    try {
      const res = await fetch("/api/rtc", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({op:"signal",room,from:selfId,to,kind,payload}) });
      log(`${kind.toUpperCase()} POST → ${res.status}`);
      if (!res.ok) log(`POST BODY → ${(await res.text()).slice(0,180)}`);
      return res.ok;
    } catch(e) { log(`${kind.toUpperCase()} POST ERROR → ${e instanceof Error ? e.message : String(e)}`); return false; }
  }

  async function media() {
    if (localStream.current) return localStream.current;
    log("REQUESTING CAMERA/MIC");
    const stream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
    log(`MEDIA OK → video=${stream.getVideoTracks().length} audio=${stream.getAudioTracks().length}`);
    localStream.current = stream;
    if (localVideo.current) localVideo.current.srcObject = stream;
    return stream;
  }

  function newPeer(remoteId:string) {
    pc.current?.close();
    const next = new RTCPeerConnection({iceServers:[{urls:["stun:stun.l.google.com:19302","stun:stun.cloudflare.com:3478"]}]});
    pc.current = next;
    log(`PEER CREATED → ${remoteId}`);
    next.onicecandidate = (e) => { if(e.candidate) { log(`ICE GENERATED → ${remoteId}`); void send(remoteId,"ice",e.candidate.toJSON()); } };
    next.ontrack = (e) => {
      log(`REMOTE TRACK → ${e.track.kind}`);
      if (!remoteStream.current.getTracks().some(track => track.id === e.track.id)) {
        remoteStream.current.addTrack(e.track);
      }
      const video = remoteVideo.current;
      if (video && video.srcObject !== remoteStream.current) {
        video.srcObject = remoteStream.current;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
      }
      if (video && e.track.kind === "video") {
        window.setTimeout(() => {
          void video.play().then(() => { log("REMOTE VIDEO PLAYING"); video.muted = false; }).catch(err => { log(`REMOTE PLAY ERROR → ${err instanceof Error ? err.message : String(err)}`); video.muted = true; void video.play().then(() => log("REMOTE VIDEO PLAYING MUTED")).catch(err2 => log(`REMOTE MUTED PLAY ERROR → ${err2 instanceof Error ? err2.message : String(err2)}`)); });
        }, 0);
      }
    };
    next.onconnectionstatechange = () => { log(`PEER STATE → ${next.connectionState}`); setStatus(next.connectionState === "connected" ? "Connected" : `Connection: ${next.connectionState}`); };
    return next;
  }

  async function startGuestCall() {
    try {
      const stream = await media();
      const next = newPeer("host");
      stream.getTracks().forEach(t => next.addTrack(t,stream));
      const offer = await next.createOffer();
      await next.setLocalDescription(offer);
      log("OFFER CREATED");
      const sent = await send("host","offer",offer);
      setStatus(sent ? "Waiting for host to accept…" : "Offer failed to reach signaling server");
    } catch(e) { const message=e instanceof Error ? e.message : "unknown error"; log(`GUEST START ERROR → ${message}`); setStatus(`Camera/mic error: ${message}`); }
  }

  async function acceptCall() {
    const call = incomingOffer.current;
    if(!call) { log("ACCEPT CLICKED BUT NO OFFER"); return; }
    try {
      log(`ACCEPTING → ${call.from}`);
      const stream = await media();
      const next = newPeer(call.from);
      stream.getTracks().forEach(t => next.addTrack(t,stream));
      await next.setRemoteDescription(call.offer);
      log("HOST REMOTE DESCRIPTION SET");
      const received = next.getReceivers().map(r => r.track).filter((t): t is MediaStreamTrack => Boolean(t));
      for (const track of received) {
        if (!remoteStream.current.getTracks().some(existing => existing.id === track.id)) remoteStream.current.addTrack(track);
      }
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = remoteStream.current;
        void remoteVideo.current.play().catch(() => log("REMOTE PLAY WAITING FOR USER GESTURE"));
      }
      for(const c of candidateQueue.current) await next.addIceCandidate(c);
      candidateQueue.current=[];
      const answer=await next.createAnswer();
      await next.setLocalDescription(answer);
      log("ANSWER CREATED");
      await send(call.from,"answer",answer);
      incomingOffer.current=null;
      setIncomingName(null);
      setStatus("Connecting…");
    } catch(e) { const message=e instanceof Error ? e.message : "unknown error"; log(`ACCEPT ERROR → ${message}`); setStatus(`Accept failed: ${message}`); }
  }

  useEffect(() => {
    let dead=false; let timer:number|undefined;
    async function poll(){
      if(dead) return;
      try {
        const q=new URLSearchParams({room,peer:selfId,name,since:String(cursor.current)});
        const res=await fetch(`/api/rtc?${q}`,{cache:"no-store"});
        if(!res.ok) log(`POLL → ${res.status}`);
        if(res.ok){
          const body=await res.json() as {signals:WireSignal[]};
          if(body.signals.length) log(`POLL → ${res.status}, SIGNALS=${body.signals.length}`);
          for(const sig of body.signals){
            cursor.current=Math.max(cursor.current,sig.id);
            log(`RECEIVED ${sig.kind.toUpperCase()} ← ${sig.from}`);
            if(sig.kind==="offer" && role==="operator"){
              incomingOffer.current={from:sig.from,offer:sig.payload};
              setIncomingName("Guest");
              setStatus("Guest is waiting for your approval");
              log("ACCEPT BUTTON ARMED");
            } else if(sig.kind==="answer" && role==="guest" && pc.current){
              await pc.current.setRemoteDescription(sig.payload);
              log("GUEST REMOTE DESCRIPTION SET");
              for(const c of candidateQueue.current) await pc.current.addIceCandidate(c);
              candidateQueue.current=[];
            } else if(sig.kind==="ice"){
              if(pc.current?.remoteDescription) { await pc.current.addIceCandidate(sig.payload); log("ICE ADDED"); }
              else { candidateQueue.current.push(sig.payload); log(`ICE QUEUED → ${candidateQueue.current.length}`); }
            }
          }
        }
      } catch(e) { log(`POLL ERROR → ${e instanceof Error ? e.message : String(e)}`); }
      if(!dead) timer=window.setTimeout(poll,500);
    }
    log("SIGNAL POLL STARTED");
    void poll();
    if(role==="guest") void startGuestCall();
    return()=>{dead=true;if(timer)clearTimeout(timer);pc.current?.close();localStream.current?.getTracks().forEach(t=>t.stop());void fetch("/api/rtc",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({op:"leave",room,peer:selfId}),keepalive:true});};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  function toggleMute(){const track=localStream.current?.getAudioTracks()[0];if(track){track.enabled=!track.enabled;setMuted(!track.enabled)}}
  function toggleCam(){const track=localStream.current?.getVideoTracks()[0];if(track){track.enabled=!track.enabled;setCamOff(!track.enabled)}}

  return <section className="session-shell" aria-labelledby="session-title">
    <div className="session-heading"><div><p className="eyebrow"><ShieldCheck size={15}/> Private video room</p><h2 id="session-title">Room {code}</h2></div><button className="ghost-button" type="button" onClick={()=>navigator.clipboard?.writeText(code)}><Copy size={16}/> Copy code</button></div>
    {role==="operator" ? <div className="participant-picker" style={{position:"relative",zIndex:50}}><p className="eyebrow">HOST CONTROLS</p>{incomingName ? <button className="primary-button" style={{width:"100%",minHeight:56,fontSize:18}} type="button" onClick={()=>void acceptCall()}>ACCEPT GUEST</button> : <p>Waiting for guest request…</p>}</div> : null}
    <p className="form-note">{status}</p>
    <div style={{background:"#080808",border:"1px solid #777",padding:"10px",margin:"10px 0",fontFamily:"monospace",fontSize:"12px",lineHeight:1.45,whiteSpace:"pre-wrap",overflowWrap:"anywhere",maxHeight:"190px",overflowY:"auto"}} aria-label="Signaling diagnostics"><strong>SIGNAL TRACE</strong>{"\n"}{debug.join("\n")}</div>
    <div className="video-grid">{role==="operator" ? <><div className="reading-video"><video ref={localVideo} autoPlay playsInline muted /></div><div className="local-video"><div className="reading-video"><video ref={remoteVideo} autoPlay playsInline /></div></div></> : <><div className="reading-video"><video ref={remoteVideo} autoPlay playsInline /></div><div className="local-video"><div className="reading-video"><video ref={localVideo} autoPlay playsInline muted /></div></div></>}</div>
    <div className="call-controls"><button type="button" onClick={toggleMute}>{muted?<MicOff/>:<Mic/>}<span>{muted?"Unmute":"Mute"}</span></button><button type="button" onClick={toggleCam}>{camOff?<CameraOff/>:<Camera/>}<span>{camOff?"Camera on":"Camera off"}</span></button><button className="end-call" type="button" onClick={onLeave}><PhoneOff/><span>Leave</span></button></div>
  </section>;
}
