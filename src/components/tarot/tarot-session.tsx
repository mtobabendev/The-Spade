import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Copy, Mic, MicOff, PhoneOff, ShieldCheck } from "lucide-react";
import { RtcSession } from "./rtc-session";
import type { RoomParticipant, RoomRole } from "./rtc-protocol";

interface TarotSessionProps {
  code: string;
  guestName: string;
  role: RoomRole;
  onLeave: () => void;
}
function StreamVideo({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let active = true;
    video.srcObject = stream;
    setBlocked(false);
    if (stream)
      void video.play().catch(() => {
        if (active) setBlocked(true);
      });
    return () => {
      active = false;
      video.srcObject = null;
    };
  }, [stream]);
  return (
    <>
      <video ref={ref} autoPlay playsInline />
      {blocked && (
        <button
          type="button"
          onClick={() =>
            void ref.current
              ?.play()
              .then(() => setBlocked(false))
              .catch(() => setBlocked(true))
          }
        >
          Play video and audio
        </button>
      )}
    </>
  );
}
export function TarotSession({ code, guestName, role, onLeave }: TarotSessionProps) {
  const session = useRef<RtcSession | null>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const [pending, setPending] = useState<{ id: string; name: string }[]>([]);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [status, setStatus] = useState("Starting camera and microphone…");
  const [muted, setMuted] = useState(false),
    [camOff, setCamOff] = useState(false);
  useEffect(() => {
    const controller = new RtcSession({
      code,
      name: guestName,
      role,
      onPending: setPending,
      onParticipants: setParticipants,
      onStatus: setStatus,
      onLocal: (stream) => {
        if (localVideo.current) {
          localVideo.current.srcObject = stream;
          void localVideo.current.play().catch(() => {});
        }
      },
    });
    session.current = controller;
    void controller.start();
    const leave = () => controller.stop();
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      controller.stop();
      if (session.current === controller) session.current = null;
    };
  }, [code, guestName, role]);
  return (
    <section className="session-shell" aria-labelledby="session-title">
      <div className="session-heading">
        <div>
          <p className="eyebrow">
            <ShieldCheck size={15} /> Private video room
          </p>
          <h2 id="session-title">
            {role === "operator" ? "HOST" : "GUEST"} ROOM · {code}
          </h2>
        </div>
        <button
          className="ghost-button"
          type="button"
          onClick={() => navigator.clipboard?.writeText(code)}
        >
          <Copy size={16} /> Copy code
        </button>
      </div>
      {role === "operator" && (
        <div className="participant-picker" style={{ position: "relative", zIndex: 100 }}>
          <p className="eyebrow">HOST ADMISSION · {pending.length} WAITING</p>
          {pending.length ? (
            pending.map((g) => (
              <button
                key={g.id}
                className="primary-button"
                style={{
                  display: "block",
                  width: "100%",
                  minHeight: 60,
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 8,
                }}
                type="button"
                onClick={() => void session.current?.accept(g.id)}
              >
                ACCEPT {g.name.toUpperCase()}
              </button>
            ))
          ) : (
            <p>Waiting for guest requests…</p>
          )}
        </div>
      )}
      <p className="form-note" style={{ fontWeight: 700 }}>
        {status}
      </p>
      <div className="video-grid">
        {role === "operator" ? (
          participants.map((p) => (
            <div className="reading-video" key={p.id}>
              <StreamVideo stream={p.stream} />
              <div className="video-label">
                {p.name} · {p.state}
              </div>
            </div>
          ))
        ) : (
          <div className="reading-video">
            <StreamVideo stream={participants.find((p) => p.id === "host")?.stream ?? null} />
          </div>
        )}
        <div className="local-video">
          <div className="reading-video">
            <video ref={localVideo} autoPlay playsInline muted />
            <div className="video-label">{role === "operator" ? "HOST" : "YOU"}</div>
          </div>
        </div>
      </div>
      <div className="call-controls">
        <button
          type="button"
          onClick={() =>
            void session.current
              ?.toggle("audio")
              .then(setMuted)
              .catch((error) => setStatus(String(error)))
          }
        >
          {muted ? <MicOff /> : <Mic />}
          <span>{muted ? "Unmute" : "Mute"}</span>
        </button>
        <button
          type="button"
          onClick={() =>
            void session.current
              ?.toggle("video")
              .then(setCamOff)
              .catch((error) => setStatus(String(error)))
          }
        >
          {camOff ? <CameraOff /> : <Camera />}
          <span>{camOff ? "Camera on" : "Camera off"}</span>
        </button>
        <button className="end-call" type="button" onClick={onLeave}>
          <PhoneOff />
          <span>Leave</span>
        </button>
      </div>
    </section>
  );
}
