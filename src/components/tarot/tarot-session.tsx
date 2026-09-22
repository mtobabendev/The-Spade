import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Copy, Mic, MicOff, PhoneOff, ShieldCheck } from "lucide-react";

type SessionRole = "guest" | "operator";
interface TarotSessionProps { code:string; guestName:string; role:SessionRole; onLeave:()=>void; onActivate?:()=>void }
type WireSignal = { id:number; from:string; kind:"offer"|"answer"|"ice"; payload:any };
type PendingGuest = { id:string; name:string; offer:RTCSessionDescriptionInit };
type Participant = { id:string; name:string; stream:MediaStream|null; state:RTCPeerConnectionState };

function rtcConfig(): RTCConfiguration {
  const turnUrls=(import.meta.env.VITE_TURN_URLS as string|undefined)?.split(",").map(v=>v.trim()).filter(Boolean);
  const turnUser=import.meta.env.VITE_TURN_USERNAME as string|undefined;
  const turnCredential=import.meta.env.VITE_TURN_CREDENTIAL as string|undefined;
  const iceServers:RTCIceServer[]=[{urls:["stun:stun.l.google.com:19302","stun:stun.cloudflare.com:3478"]}];
  if(turnUrls?.length&&turnUser&&turnCredential) iceServers.push({urls:turnUrls,username:turnUser,credential:turnCredential});
  else iceServers.push({urls:["turn:openrelay.metered.ca:80","turn:openrelay.metered.ca:443","turn:openrelay.metered.ca:443?transport=tcp","turns:openrelay.metered.ca:443?transport=tcp"],username:"openrelayproject",credential:"openrelayproject"});
  return {iceServers,iceCandidatePoolSize:4};
}

function waitForIceComplete(pc:RTCPeerConnection):Promise<void>{
  if(pc.iceGatheringState==="complete")return Promise.resolve();
  return new Promise(resolve=>{
    const done=()=>{if(pc.iceGatheringState==="complete"){pc.removeEventListener("icegatheringstatechange",done);resolve();}};
    pc.addEventListener("icegatheringstatechange",done);
  });
}

function StreamVideo({stream,muted=false}:{stream:MediaStream|null;muted?:boolean}){
  const ref=useRef<HTMLVideoElement>(null);
  useEffect(()=>{if(!ref.current)return;ref.current.srcObject=stream;void ref.current.play().catch(()=>{});},[stream]);
  return <video ref={ref} autoPlay playsInline muted={muted}/>;
}

export function TarotSession({code,guestName,role,onLeave}:TarotSessionProps){
  const room=`tarot-${code.toLowerCase()}`;
  const [guestId]=useState(()=>`guest_${crypto.randomUUID().replaceAll("-","").slice(0,12)}`);
  const selfId=role==="operator"?"host":guestId;
  const localVideo=useRef<HTMLVideoElement>(null),localStream=useRef<MediaStream|null>(null),guestPeer=useRef<RTCPeerConnection|null>(null),cursor=useRef(0);
  const hostPeers=useRef(new Map<string,RTCPeerConnection>()),pendingRef=useRef(new Map<string,PendingGuest>());
  const [pending,setPending]=useState<PendingGuest[]>([]),[participants,setParticipants]=useState<Participant[]>([]),[guestRemote,setGuestRemote]=useState<MediaStream|null>(null);
  const [status,setStatus]=useState(role==="operator"?"HOST: room open. Waiting for guests…":"GUEST: starting camera and requesting admission…"),[muted,setMuted]=useState(false),[camOff,setCamOff]=useState(false);

  async function send(to:string,kind:"offer"|"answer",payload:unknown){const r=await fetch("/api/rtc",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({op:"signal",room,from:selfId,to,kind,payload})});if(!r.ok)throw new Error(`Signaling failed (${r.status})`)}
  async function getMedia(){if(localStream.current)return localStream.current;const s=await navigator.mediaDevices.getUserMedia({video:true,audio:true});localStream.current=s;if(localVideo.current){localVideo.current.srcObject=s;localVideo.current.muted=true;void localVideo.current.play().catch(()=>{})}return s}
  function publishParticipant(id:string,name:string,stream:MediaStream|null,state:RTCPeerConnectionState){setParticipants(current=>{const next=current.filter(p=>p.id!==id);next.push({id,name,stream,state});return next})}

  function makeHostPeer(id:string,name:string){hostPeers.current.get(id)?.close();const pc=new RTCPeerConnection(rtcConfig());hostPeers.current.set(id,pc);const remote=new MediaStream();pc.ontrack=e=>{if(!remote.getTracks().some(t=>t.id===e.track.id))remote.addTrack(e.track);publishParticipant(id,name,remote,pc.connectionState)};pc.onconnectionstatechange=()=>publishParticipant(id,name,remote.getTracks().length?remote:null,pc.connectionState);return pc}
  function makeGuestPeer(){guestPeer.current?.close();const pc=new RTCPeerConnection(rtcConfig());guestPeer.current=pc;const remote=new MediaStream();pc.ontrack=e=>{if(!remote.getTracks().some(t=>t.id===e.track.id))remote.addTrack(e.track);setGuestRemote(remote)};pc.onconnectionstatechange=()=>setStatus(pc.connectionState==="connected"?"Connected to host":`Connection: ${pc.connectionState}`);return pc}

  async function startGuest(){try{const stream=await getMedia(),pc=makeGuestPeer();stream.getTracks().forEach(t=>pc.addTrack(t,stream));await pc.setLocalDescription(await pc.createOffer());setStatus("Gathering secure connection routes…");await waitForIceComplete(pc);if(!pc.localDescription)throw new Error("Offer was not created");await send("host","offer",{description:pc.localDescription.toJSON(),name:guestName.trim()||"Guest"});setStatus("Waiting for host to accept you…")}catch(e){setStatus(`Call failed: ${e instanceof Error?e.message:String(e)}`)}}

  async function acceptGuest(id:string){const call=pendingRef.current.get(id);if(!call)return;try{const stream=await getMedia(),pc=makeHostPeer(call.id,call.name);stream.getTracks().forEach(t=>pc.addTrack(t,stream));await pc.setRemoteDescription(call.offer);await pc.setLocalDescription(await pc.createAnswer());setStatus(`Accepting ${call.name}: gathering secure connection routes…`);await waitForIceComplete(pc);if(!pc.localDescription)throw new Error("Answer was not created");await send(call.id,"answer",pc.localDescription.toJSON());pendingRef.current.delete(id);setPending([...pendingRef.current.values()]);publishParticipant(call.id,call.name,null,pc.connectionState);setStatus(`${call.name} accepted. ${pendingRef.current.size?`${pendingRef.current.size} guest(s) still waiting.`:"Room active."}`)}catch(e){setStatus(`Could not accept ${call.name}: ${e instanceof Error?e.message:String(e)}`)}}

  useEffect(()=>{let stopped=false,timer:number|undefined;void getMedia().catch(e=>setStatus(`Camera/mic failed: ${e instanceof Error?e.message:String(e)}`));async function poll(){if(stopped)return;try{const q=new URLSearchParams({room,peer:selfId,since:String(cursor.current)}),r=await fetch(`/api/rtc?${q}`,{cache:"no-store"});if(!r.ok)throw new Error(`Signaling failed (${r.status})`);const body=await r.json() as{signals:WireSignal[]};for(const s of body.signals){cursor.current=Math.max(cursor.current,s.id);if(s.kind==="offer"&&role==="operator"){const wrapped=s.payload as{description?:RTCSessionDescriptionInit;name?:string};const call:PendingGuest={id:s.from,name:wrapped.name?.trim()||"Guest",offer:wrapped.description??s.payload};pendingRef.current.set(s.from,call);setPending([...pendingRef.current.values()]);setStatus(`${pendingRef.current.size} guest(s) waiting for host approval.`)}else if(s.kind==="answer"&&role==="guest"&&guestPeer.current){await guestPeer.current.setRemoteDescription(s.payload);setStatus("Connecting to host…");}}}catch(e){setStatus(`Room connection error: ${e instanceof Error?e.message:String(e)}`)}if(!stopped)timer=window.setTimeout(poll,600)}void poll();if(role==="guest")void startGuest();return()=>{stopped=true;if(timer)clearTimeout(timer);guestPeer.current?.close();for(const pc of hostPeers.current.values())pc.close();hostPeers.current.clear();localStream.current?.getTracks().forEach(t=>t.stop());void fetch("/api/rtc",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({op:"leave",room,peer:selfId}),keepalive:true}).catch(()=>{})}},[]);

  function toggleMute(){const t=localStream.current?.getAudioTracks()[0];if(t){t.enabled=!t.enabled;setMuted(!t.enabled)}}function toggleCam(){const t=localStream.current?.getVideoTracks()[0];if(t){t.enabled=!t.enabled;setCamOff(!t.enabled)}}

  return <section className="session-shell" aria-labelledby="session-title"><div className="session-heading"><div><p className="eyebrow"><ShieldCheck size={15}/> Private video room</p><h2 id="session-title">{role==="operator"?"HOST":"GUEST"} ROOM · {code}</h2></div><button className="ghost-button" type="button" onClick={()=>navigator.clipboard?.writeText(code)}><Copy size={16}/> Copy code</button></div>{role==="operator"&&<div className="participant-picker" style={{position:"relative",zIndex:100}}><p className="eyebrow">HOST ADMISSION · {pending.length} WAITING</p>{pending.length?pending.map(g=><button key={g.id} className="primary-button" style={{display:"block",width:"100%",minHeight:60,fontSize:18,fontWeight:800,marginBottom:8}} type="button" onClick={()=>void acceptGuest(g.id)}>ACCEPT {g.name.toUpperCase()}</button>):<p>Waiting for guest requests…</p>}</div>}<p className="form-note" style={{fontWeight:700}}>{status}</p><div className="video-grid">{role==="operator"?participants.map(p=><div className="reading-video" key={p.id}><StreamVideo stream={p.stream}/><div className="video-label">{p.name} · {p.state}</div></div>):<div className="reading-video"><StreamVideo stream={guestRemote}/></div>}<div className="local-video"><div className="reading-video"><video ref={localVideo} autoPlay playsInline muted/><div className="video-label">{role==="operator"?"HOST":"YOU"}</div></div></div></div><div className="call-controls"><button type="button" onClick={toggleMute}>{muted?<MicOff/>:<Mic/>}<span>{muted?"Unmute":"Mute"}</span></button><button type="button" onClick={toggleCam}>{camOff?<CameraOff/>:<Camera/>}<span>{camOff?"Camera on":"Camera off"}</span></button><button className="end-call" type="button" onClick={onLeave}><PhoneOff/><span>Leave</span></button></div></section>;
}
