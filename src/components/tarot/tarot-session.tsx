import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Copy, Mic, MicOff, PhoneOff, ShieldCheck } from "lucide-react";

type SessionRole = "guest" | "operator";
interface TarotSessionProps { code:string; guestName:string; role:SessionRole; onLeave:()=>void; onActivate?:()=>void }
type WireSignal = { id:number; from:string; kind:"offer"|"answer"|"ice"; payload:any };

const RTC_CONFIG: RTCConfiguration = { iceServers:[
  {urls:"stun:stun.l.google.com:19302"},
  {urls:"stun:stun.cloudflare.com:3478"},
  {urls:"turn:openrelay.metered.ca:80",username:"openrelayproject",credential:"openrelayproject"},
  {urls:"turn:openrelay.metered.ca:443",username:"openrelayproject",credential:"openrelayproject"},
  {urls:"turn:openrelay.metered.ca:443?transport=tcp",username:"openrelayproject",credential:"openrelayproject"},
  {urls:"turns:openrelay.metered.ca:443?transport=tcp",username:"openrelayproject",credential:"openrelayproject"}
] };

function waitForIce(pc:RTCPeerConnection) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = () => { if (pc.iceGatheringState === "complete") { pc.removeEventListener("icegatheringstatechange", done); resolve(); } };
    pc.addEventListener("icegatheringstatechange", done);
    window.setTimeout(() => { pc.removeEventListener("icegatheringstatechange", done); resolve(); }, 8000);
  });
}

export function TarotSession({code, guestName, role, onLeave}:TarotSessionProps) {
  const room=`tarot-${code.toLowerCase()}`;
  const [guestId]=useState(()=>`guest_${crypto.randomUUID().replaceAll("-","").slice(0,12)}`);
  const selfId=role==="operator"?"host":guestId;
  const localVideo=useRef<HTMLVideoElement>(null), remoteVideo=useRef<HTMLVideoElement>(null);
  const localStream=useRef<MediaStream|null>(null), peer=useRef<RTCPeerConnection|null>(null);
  const pendingOffer=useRef<{from:string;offer:RTCSessionDescriptionInit}|null>(null), cursor=useRef(0);
  const [incoming,setIncoming]=useState(false), [status,setStatus]=useState(role==="operator"?"HOST: open this room first. Waiting for guest…":"GUEST: starting camera and calling host…"), [muted,setMuted]=useState(false), [camOff,setCamOff]=useState(false);

  async function send(to:string,kind:"offer"|"answer",payload:RTCSessionDescriptionInit){const r=await fetch("/api/rtc",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({op:"signal",room,from:selfId,to,kind,payload})});if(!r.ok)throw new Error(`Signaling failed (${r.status})`)}
  async function getMedia(){if(localStream.current)return localStream.current;const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});localStream.current=stream;if(localVideo.current){localVideo.current.srcObject=stream;localVideo.current.muted=true;await localVideo.current.play().catch(()=>{})}return stream}
  function makePeer(){peer.current?.close();const pc=new RTCPeerConnection(RTC_CONFIG);peer.current=pc;const remote=new MediaStream();if(remoteVideo.current)remoteVideo.current.srcObject=remote;pc.ontrack=e=>{if(!remote.getTracks().some(t=>t.id===e.track.id))remote.addTrack(e.track);if(remoteVideo.current){remoteVideo.current.srcObject=remote;void remoteVideo.current.play().catch(()=>{})}};pc.onconnectionstatechange=()=>{if(pc.connectionState==="connected")setStatus("Connected");else if(["failed","disconnected","closed"].includes(pc.connectionState))setStatus(`Connection ${pc.connectionState}`);else setStatus("Connecting…")};return pc}
  async function startGuestCall(){try{const stream=await getMedia(),pc=makePeer();stream.getTracks().forEach(t=>pc.addTrack(t,stream));await pc.setLocalDescription(await pc.createOffer());await waitForIce(pc);if(!pc.localDescription)throw new Error("No local offer");await send("host","offer",pc.localDescription.toJSON());setStatus("Waiting for host to press ACCEPT GUEST…")}catch(e){setStatus(`Call failed: ${e instanceof Error?e.message:String(e)}`)}}
  async function acceptGuest(){const call=pendingOffer.current;if(!call)return;setIncoming(false);setStatus("Connecting…");try{const stream=await getMedia(),pc=makePeer();stream.getTracks().forEach(t=>pc.addTrack(t,stream));await pc.setRemoteDescription(call.offer);await pc.setLocalDescription(await pc.createAnswer());await waitForIce(pc);if(!pc.localDescription)throw new Error("No local answer");await send(call.from,"answer",pc.localDescription.toJSON());pendingOffer.current=null}catch(e){setStatus(`Accept failed: ${e instanceof Error?e.message:String(e)}`)}}

  useEffect(()=>{let stopped=false,timer:number|undefined;void getMedia().catch(e=>setStatus(`Camera/mic failed: ${e instanceof Error?e.message:String(e)}`));async function poll(){if(stopped)return;try{const q=new URLSearchParams({room,peer:selfId,since:String(cursor.current)}),r=await fetch(`/api/rtc?${q}`,{cache:"no-store"});if(!r.ok)throw new Error(`Signaling failed (${r.status})`);const body=await r.json() as {signals:WireSignal[]};for(const signal of body.signals){cursor.current=Math.max(cursor.current,signal.id);if(signal.kind==="offer"&&role==="operator"){pendingOffer.current={from:signal.from,offer:signal.payload};setIncoming(true);setStatus("Guest is calling. Press ACCEPT GUEST.")}else if(signal.kind==="answer"&&role==="guest"&&peer.current){await peer.current.setRemoteDescription(signal.payload);setStatus("Connecting…")}}}catch(e){setStatus(`Room connection error: ${e instanceof Error?e.message:String(e)}`)}if(!stopped)timer=window.setTimeout(poll,600)}void poll();if(role==="guest")void startGuestCall();return()=>{stopped=true;if(timer)clearTimeout(timer);peer.current?.close();localStream.current?.getTracks().forEach(t=>t.stop())}},[]);
  function toggleMute(){const t=localStream.current?.getAudioTracks()[0];if(t){t.enabled=!t.enabled;setMuted(!t.enabled)}}function toggleCam(){const t=localStream.current?.getVideoTracks()[0];if(t){t.enabled=!t.enabled;setCamOff(!t.enabled)}}

  return <section className="session-shell" aria-labelledby="session-title"><div className="session-heading"><div><p className="eyebrow"><ShieldCheck size={15}/> Private video room</p><h2 id="session-title">{role==="operator"?"HOST":"GUEST"} ROOM · {code}</h2></div><button className="ghost-button" type="button" onClick={()=>navigator.clipboard?.writeText(code)}><Copy size={16}/> Copy code</button></div>{role==="operator"&&<div className="participant-picker" style={{position:"relative",zIndex:100}}><p className="eyebrow">HOST CONTROLS</p>{incoming?<button className="primary-button" style={{display:"block",width:"100%",minHeight:64,fontSize:20,fontWeight:800}} type="button" onClick={()=>void acceptGuest()}>ACCEPT GUEST</button>:<p>Waiting for guest request…</p>}</div>}<p className="form-note" style={{fontWeight:700}}>{status}</p><div className="video-grid"><div className="reading-video"><video ref={remoteVideo} autoPlay playsInline/></div><div className="local-video"><div className="reading-video"><video ref={localVideo} autoPlay playsInline muted/></div></div></div><div className="call-controls"><button type="button" onClick={toggleMute}>{muted?<MicOff/>:<Mic/>}<span>{muted?"Unmute":"Mute"}</span></button><button type="button" onClick={toggleCam}>{camOff?<CameraOff/>:<Camera/>}<span>{camOff?"Camera on":"Camera off"}</span></button><button className="end-call" type="button" onClick={onLeave}><PhoneOff/><span>Leave</span></button></div></section>;
}
