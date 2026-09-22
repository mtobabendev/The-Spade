import { observePeer, waitForIceComplete } from "./rtc-session-utils";
import type { RoomParticipant, RoomRole, RoomSignal, SignalKind } from "./rtc-protocol";

interface Options {
  code: string;
  name: string;
  role: RoomRole;
  onLocal: (stream: MediaStream) => void;
  onPending: (guests: { id: string; name: string }[]) => void;
  onParticipants: (participants: RoomParticipant[]) => void;
  onStatus: (status: string) => void;
}

// One controller per mounted room. Each admitted guest owns one peer and stream.
export class RtcSession {
  readonly room: string;
  readonly selfId: string;
  private peers = new Map<string, RTCPeerConnection>();
  private participants = new Map<string, RoomParticipant>();
  private pending = new Map<string, { id: string; name: string }>();
  private accepting = new Set<string>();
  private local: Promise<MediaStream> | undefined;
  private config: Promise<RTCConfiguration> | undefined;
  private cursor = 0;
  private stopped = false;
  private started = false;
  private approved = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private abort = new AbortController();
  constructor(private options: Options) {
    this.room = `tarot-${options.code.toLowerCase()}`;
    this.selfId =
      options.role === "operator" ? "host" : `guest_${crypto.randomUUID().replaceAll("-", "")}`;
  }
  private status(message: string) {
    if (!this.stopped) this.options.onStatus(message);
  }
  private trace(peer: string, line: string) {
    console.info(`[rtc:${peer}] ${line}`);
    if (this.stopped) return;
    void fetch("/api/rtc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: this.abort.signal,
      body: JSON.stringify({
        op: "trace",
        room: this.room,
        peer: this.selfId,
        role: this.options.role,
        line: `target=${peer} ${line}`.slice(0, 500),
      }),
    }).catch(() => {});
  }
  private async send(to: string, kind: SignalKind, payload: RoomSignal["payload"] = {}) {
    if (this.stopped) throw new Error("Room closed");
    const response = await fetch("/api/rtc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: this.abort.signal,
      body: JSON.stringify({ op: "signal", room: this.room, from: this.selfId, to, kind, payload }),
    });
    if (!response.ok) throw new Error(`Could not send ${kind} (${response.status})`);
    this.trace(to, `sent ${kind}`);
  }
  private media() {
    this.local ??= navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (this.stopped) {
          stream.getTracks().forEach((track) => track.stop());
          throw new Error("Room closed");
        }
        this.options.onLocal(stream);
        return stream;
      })
      .catch((error) => {
        this.local = undefined;
        throw error;
      });
    return this.local;
  }
  private configuration() {
    this.config ??= fetch("/api/rtc?op=config", { cache: "no-store", signal: this.abort.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "TURN configuration is unavailable");
        const configuration = body.configuration as RTCConfiguration;
        if (
          !configuration.iceServers?.some(
            (server) =>
              (Array.isArray(server.urls) ? server.urls : [server.urls]).some((url) =>
                /^turns?:/.test(url),
              ) &&
              server.username &&
              server.credential,
          )
        )
          throw new Error("The server did not provide authenticated TURN configuration");
        return configuration;
      })
      .catch((error) => {
        this.config = undefined;
        throw error;
      });
    return this.config;
  }
  private publish() {
    if (!this.stopped) this.options.onParticipants([...this.participants.values()]);
  }
  private publishPending() {
    if (!this.stopped) this.options.onPending([...this.pending.values()]);
  }
  private async createPeer(id: string, name: string) {
    const [stream, config] = await Promise.all([this.media(), this.configuration()]);
    if (this.stopped) throw new Error("Room closed");
    this.removePeer(id);
    const pc = new RTCPeerConnection(config);
    const remote = new MediaStream();
    this.peers.set(id, pc);
    const participant: RoomParticipant = { id, name, stream: null, state: pc.connectionState };
    this.participants.set(id, participant);
    observePeer(pc, (line) => this.trace(id, line));
    pc.ontrack = (event) => {
      if (this.peers.get(id) !== pc || this.stopped) return;
      if (!remote.getTracks().some((track) => track.id === event.track.id))
        remote.addTrack(event.track);
      participant.stream = remote;
      this.publish();
    };
    pc.onconnectionstatechange = () => {
      if (this.peers.get(id) !== pc || this.stopped) return;
      participant.state = pc.connectionState;
      this.publish();
      if (pc.connectionState === "connected") this.status(`${name} connected`);
      if (pc.connectionState === "failed")
        this.status(`${name}: connection failed. Check the room's TURN relay diagnostics.`);
      if (pc.connectionState === "disconnected") this.status(`${name}: connection interrupted`);
    };
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    this.publish();
    return pc;
  }
  private async completeDescription(pc: RTCPeerConnection) {
    await waitForIceComplete(pc, this.abort.signal);
    if (this.stopped || pc.signalingState === "closed") throw new Error("Room closed");
    if (!pc.localDescription) throw new Error("Missing local description");
    if (!/ typ relay\b/.test(pc.localDescription.sdp)) {
      this.trace("room", "TURN failed: ICE gathering completed without a relay candidate");
      throw new Error(
        "TURN did not provide a relay candidate. Check the configured server and credentials.",
      );
    }
    return pc.localDescription.toJSON();
  }
  async start() {
    if (this.started) return;
    this.started = true;
    void this.poll();
    try {
      await this.media();
      if (this.options.role === "guest") {
        await this.send("host", "guest-request", { name: this.options.name.trim() || "Guest" });
        this.status("Waiting for host approval…");
      } else this.status("Room open. Waiting for guest requests…");
    } catch (error) {
      this.status(this.error(error));
    }
  }
  async accept(id: string) {
    const guest = this.pending.get(id);
    if (!guest || this.accepting.has(id) || this.stopped) return;
    this.accepting.add(id);
    try {
      const pc = await this.createPeer(id, guest.name);
      await this.send(id, "guest-accepted");
      await pc.setLocalDescription(await pc.createOffer());
      this.status(`Accepting ${guest.name}: gathering connection routes…`);
      const description = await this.completeDescription(pc);
      await this.send(id, "offer", { description });
      this.pending.delete(id);
      this.publishPending();
      this.status(`Connecting to ${guest.name}…`);
    } catch (error) {
      this.removePeer(id);
      this.status(this.error(error));
    } finally {
      this.accepting.delete(id);
    }
  }
  private async receive(signal: RoomSignal) {
    if (signal.room !== this.room || signal.to !== this.selfId) return;
    this.trace(signal.from, `received ${signal.kind} id=${signal.id}`);
    if (signal.kind === "participant-left") {
      this.pending.delete(signal.from);
      this.publishPending();
      this.removePeer(signal.from);
      if (signal.from === "host") {
        this.approved = false;
        this.status("The host left the room.");
      }
    } else if (this.options.role === "operator") {
      if (
        signal.kind === "guest-request" &&
        signal.from !== "host" &&
        !this.peers.has(signal.from)
      ) {
        this.pending.set(signal.from, {
          id: signal.from,
          name: signal.payload.name?.trim() || "Guest",
        });
        this.publishPending();
      } else if (signal.kind === "answer") {
        const pc = this.peers.get(signal.from);
        if (
          pc?.signalingState === "have-local-offer" &&
          signal.payload.description?.type === "answer"
        )
          await pc.setRemoteDescription(signal.payload.description);
      }
    } else if (signal.from === "host") {
      if (signal.kind === "guest-accepted") {
        this.approved = true;
        this.status("Host accepted. Waiting for complete offer…");
      } else if (
        signal.kind === "offer" &&
        this.approved &&
        signal.payload.description?.type === "offer"
      ) {
        const pc = await this.createPeer("host", "Host");
        try {
          await pc.setRemoteDescription(signal.payload.description);
          await pc.setLocalDescription(await pc.createAnswer());
          this.status("Gathering connection routes…");
          const description = await this.completeDescription(pc);
          await this.send("host", "answer", { description });
          this.status(
            pc.connectionState === "connected" ? "Host connected" : "Connecting to host…",
          );
        } catch (error) {
          this.removePeer("host");
          throw error;
        }
      }
    }
  }
  private async poll() {
    if (this.stopped) return;
    try {
      const response = await fetch(
        `/api/rtc?${new URLSearchParams({ room: this.room, peer: this.selfId, since: String(this.cursor) })}`,
        { cache: "no-store", signal: this.abort.signal },
      );
      if (!response.ok) throw new Error(`Room signaling unavailable (${response.status})`);
      const body = (await response.json()) as { signals: RoomSignal[] };
      for (const signal of body.signals) {
        if (this.stopped) return;
        // Consume explicitly handled failures too; never recreate a peer on every poll.
        try {
          await this.receive(signal);
        } catch (error) {
          this.status(this.error(error));
        }
        this.cursor = Math.max(this.cursor, signal.id);
      }
    } catch (error) {
      this.status(this.error(error));
    }
    if (!this.stopped) this.timer = setTimeout(() => void this.poll(), 600);
  }
  private error(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
  private removePeer(id: string) {
    const pc = this.peers.get(id);
    this.peers.delete(id);
    pc?.close();
    this.participants.delete(id);
    this.publish();
  }
  async toggle(kind: "audio" | "video") {
    const stream = await this.media();
    const tracks = stream.getTracks().filter((track) => track.kind === kind);
    const enabled = !tracks.some((track) => track.enabled);
    tracks.forEach((track) => {
      track.enabled = enabled;
    });
    return !enabled;
  }
  stop() {
    if (this.stopped) return;
    this.stopped = true;
    clearTimeout(this.timer);
    this.abort.abort();
    const targets =
      this.options.role === "operator"
        ? new Set([...this.pending.keys(), ...this.peers.keys()])
        : new Set(["host"]);
    for (const to of targets)
      void fetch("/api/rtc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          op: "signal",
          room: this.room,
          from: this.selfId,
          to,
          kind: "participant-left",
          payload: {},
        }),
      }).catch(() => {});
    for (const pc of this.peers.values()) pc.close();
    this.peers.clear();
    void this.local
      ?.then((stream) => stream.getTracks().forEach((track) => track.stop()))
      .catch(() => {});
  }
}
