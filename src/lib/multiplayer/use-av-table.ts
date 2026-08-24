import { useEffect, useRef, useState } from "react";
import { defaultIceServers, type RtcPollResponse, type SignalKind } from "./p2p";

type Remote = {
  id: string;
  name: string;
  stream: MediaStream | null;
  state: RTCPeerConnectionState;
};

type Slot = {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pending: RTCIceCandidateInit[];
};

/**
 * Video+audio mesh on a separate room id from the chat P2PRoom
 * so SDP does not collide. Perfect negotiation: polite = smaller id.
 */
export function useAvTable(room: string, name: string) {
  const [selfId] = useState(() => `v-${Math.random().toString(36).slice(2, 10)}`);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slots = useRef(new Map<string, Slot>());
  const names = useRef(new Map<string, string>());
  const streams = useRef(new Map<string, MediaStream>());
  const localRef = useRef<MediaStream | null>(null);
  const since = useRef(0);

  const publish = () => {
    setRemotes(
      [...slots.current.entries()].map(([id, s]) => ({
        id,
        name: names.current.get(id) ?? id,
        stream: streams.current.get(id) ?? null,
        state: s.pc.connectionState,
      })),
    );
  };

  useEffect(() => {
    let dead = false;
    let timer: number | undefined;

    async function signal(to: string, kind: SignalKind, payload: unknown) {
      await fetch("/api/rtc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "signal", room, from: selfId, to, kind, payload }),
      });
    }

    function ensure(peerId: string) {
      let slot = slots.current.get(peerId);
      if (slot) return slot;
      const pc = new RTCPeerConnection({ iceServers: defaultIceServers() });
      slot = { pc, makingOffer: false, ignoreOffer: false, pending: [] };
      const local = localRef.current;
      if (local) {
        for (const track of local.getTracks()) pc.addTrack(track, local);
      }
      pc.onicecandidate = (e) => {
        if (e.candidate) void signal(peerId, "ice", e.candidate.toJSON());
      };
      pc.ontrack = (e) => {
        streams.current.set(peerId, e.streams[0] ?? new MediaStream([e.track]));
        publish();
      };
      pc.onconnectionstatechange = () => publish();
      pc.onnegotiationneeded = async () => {
        try {
          slot!.makingOffer = true;
          await pc.setLocalDescription(await pc.createOffer());
          if (pc.localDescription) void signal(peerId, "offer", pc.localDescription);
        } catch (err) {
          console.warn("negotiate", err);
        } finally {
          slot!.makingOffer = false;
        }
      };
      slots.current.set(peerId, slot);
      publish();
      return slot;
    }

    async function onSignal(from: string, kind: SignalKind, payload: unknown) {
      const polite = selfId < from;
      const slot = ensure(from);
      const { pc } = slot;
      try {
        if (kind === "offer") {
          const offerCollision = slot.makingOffer || pc.signalingState !== "stable";
          slot.ignoreOffer = !polite && offerCollision;
          if (slot.ignoreOffer) return;
          await pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
          for (const c of slot.pending) await pc.addIceCandidate(c);
          slot.pending = [];
          await pc.setLocalDescription(await pc.createAnswer());
          if (pc.localDescription) void signal(from, "answer", pc.localDescription);
        } else if (kind === "answer") {
          await pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
          for (const c of slot.pending) await pc.addIceCandidate(c);
          slot.pending = [];
        } else if (kind === "ice") {
          const cand = payload as RTCIceCandidateInit;
          if (pc.remoteDescription) await pc.addIceCandidate(cand);
          else slot.pending.push(cand);
        }
      } catch (err) {
        console.warn("signal", err);
      }
    }

    async function poll() {
      if (dead) return;
      try {
        const qs = new URLSearchParams({
          room,
          peer: selfId,
          name,
          since: String(since.current),
        });
        const res = await fetch(`/api/rtc?${qs}`);
        if (res.ok) {
          const body = (await res.json()) as RtcPollResponse;
          for (const p of body.peers) {
            if (p.id === selfId) continue;
            names.current.set(p.id, p.name);
            ensure(p.id);
          }
          const live = new Set(body.peers.map((p) => p.id));
          for (const id of [...slots.current.keys()]) {
            if (!live.has(id)) {
              slots.current.get(id)?.pc.close();
              slots.current.delete(id);
              streams.current.delete(id);
            }
          }
          for (const s of body.signals) {
            since.current = Math.max(since.current, s.id);
            await onSignal(s.from, s.kind, s.payload);
          }
          publish();
        }
      } catch {
        /* retry */
      }
      if (!dead) timer = window.setTimeout(poll, 800);
    }

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (dead) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localRef.current = stream;
        setLocalStream(stream);
      } catch {
        setError("Camera blocked. Chat still works.");
      }
      void poll();
    })();

    return () => {
      dead = true;
      if (timer) window.clearTimeout(timer);
      localRef.current?.getTracks().forEach((t) => t.stop());
      for (const s of slots.current.values()) s.pc.close();
      slots.current.clear();
      void fetch("/api/rtc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "leave", room, peer: selfId }),
      });
    };
  }, [room, name, selfId]);

  function toggleMute() {
    const next = !muted;
    localRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    setMuted(next);
  }

  function toggleCam() {
    const next = !camOff;
    localRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !next;
    });
    setCamOff(next);
  }

  return { selfId, localStream, remotes, muted, camOff, error, toggleMute, toggleCam };
}
