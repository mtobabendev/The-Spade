import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const transpile = async (file) =>
  ts.transpileModule(await readFile(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
const data = (source) => "data:text/javascript;base64," + Buffer.from(source).toString("base64");
const utils = data(await transpile("../src/components/tarot/rtc-session-utils.ts"));
const source = (await transpile("../src/components/tarot/rtc-session.ts")).replace(
  '"./rtc-session-utils"',
  JSON.stringify(utils),
);
const { RtcSession } = await import(data(source));
const { getRtcConfiguration } = await import(
  data(await transpile("../src/lib/multiplayer/rtc-config.server.ts"))
);
const until = async (predicate) => {
  const deadline = Date.now() + 6000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, "condition did not arrive");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

class Stream {
  constructor() {
    this.tracks = [];
  }
  getTracks() {
    return this.tracks;
  }
  addTrack(track) {
    this.tracks.push(track);
  }
}
class Peer extends EventTarget {
  static all = [];
  constructor(config) {
    super();
    this.config = config;
    this.signalingState = "stable";
    this.connectionState = "new";
    this.iceConnectionState = "new";
    this.iceGatheringState = "new";
    this.localDescription = null;
    this.remoteDescription = null;
    this.tracks = [];
    Peer.all.push(this);
  }
  getConfiguration() {
    return this.config;
  }
  addTrack(track) {
    this.tracks.push(track);
  }
  async createOffer() {
    return { type: "offer", sdp: "offer" };
  }
  async createAnswer() {
    return { type: "answer", sdp: "answer" };
  }
  async setLocalDescription(description) {
    this.localDescription = {
      ...description,
      toJSON() {
        return { type: this.type, sdp: this.sdp };
      },
    };
    this.signalingState = description.type === "offer" ? "have-local-offer" : "stable";
    this.iceGatheringState = "gathering";
    setTimeout(() => {
      if (this.connectionState === "closed") return;
      this.localDescription.sdp += "\r\na=candidate:1 1 udp 1 192.0.2.1 123 typ relay";
      this.iceGatheringState = "complete";
      this.dispatchEvent(new Event("icegatheringstatechange"));
    }, 10);
  }
  async setRemoteDescription(description) {
    this.remoteDescription = description;
    this.signalingState = description.type === "offer" ? "have-remote-offer" : "stable";
    for (const kind of ["audio", "video"])
      this.ontrack?.({ track: { kind, id: kind, readyState: "live" } });
    this.connectionState = "connected";
    this.onconnectionstatechange?.();
  }
  close() {
    this.connectionState = "closed";
    this.signalingState = "closed";
  }
  async getStats() {
    return new Map();
  }
}

test("host approval, complete SDP, second guest isolation and cleanup", async () => {
  const original = {
    fetch: globalThis.fetch,
    navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
    pc: globalThis.RTCPeerConnection,
    stream: globalThis.MediaStream,
    info: console.info,
  };
  const signals = [];
  let next = 0;
  let captures = 0;
  const acquired = [];
  console.info = () => {};
  globalThis.MediaStream = Stream;
  globalThis.RTCPeerConnection = Peer;
  Peer.all = [];
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: async () => {
          captures++;
          const stream = new Stream();
          for (const kind of ["audio", "video"])
            stream.addTrack({
              kind,
              enabled: true,
              stopped: false,
              stop() {
                this.stopped = true;
              },
            });
          acquired.push(stream);
          return stream;
        },
      },
    },
  });
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input, "http://localhost");
    if (options.method === "POST") {
      const message = JSON.parse(options.body);
      if (message.op === "signal") {
        if (["offer", "answer"].includes(message.kind))
          assert.match(message.payload.description.sdp, /typ relay/, "must wait for complete SDP");
        signals.push({ ...message, id: ++next });
      }
      return Response.json({ ok: true });
    }
    if (url.searchParams.get("op") === "config")
      return Response.json({
        configuration: getRtcConfiguration({
          TURN_URLS: "turn:test.invalid",
          TURN_USERNAME: "test",
          TURN_CREDENTIAL: "test",
        }),
      });
    return Response.json({
      signals: signals.filter(
        (s) =>
          s.room === url.searchParams.get("room") &&
          s.to === url.searchParams.get("peer") &&
          s.id > Number(url.searchParams.get("since")),
      ),
    });
  };
  const states = [];
  const sessions = [];
  const make = (role, name) => {
    const state = { pending: [], participants: [], status: "" };
    states.push(state);
    const session = new RtcSession({
      code: "TEST42",
      role,
      name,
      onLocal: () => {},
      onPending: (v) => (state.pending = v),
      onParticipants: (v) => (state.participants = v),
      onStatus: (v) => (state.status = v),
    });
    sessions.push(session);
    return { session, state };
  };
  try {
    const host = make("operator", "Host"),
      a = make("guest", "Eogcha");
    await host.session.start();
    await a.session.start();
    await until(() => host.state.pending.length === 1);
    assert.equal(Peer.all.length, 0, "no peer before host approval");
    const id = host.state.pending[0].id;
    await Promise.all([host.session.accept(id), host.session.accept(id)]);
    await until(() => host.state.participants[0]?.stream?.getTracks().length === 2);
    assert.equal(Peer.all.length, 2, "duplicate accept must not replace peer");
    const first = Peer.all[0];
    const firstStream = host.state.participants[0].stream;
    assert.equal(first.localDescription.type, "offer");
    assert.equal(first.remoteDescription.type, "answer");
    assert.equal(Peer.all[1].remoteDescription.type, "offer");
    assert.equal(Peer.all[1].localDescription.type, "answer");
    const b = make("guest", "Penny");
    await b.session.start();
    await until(() => host.state.pending.length === 1);
    assert.equal(Peer.all.length, 2, "second guest also waits for approval");
    await host.session.accept(host.state.pending[0].id);
    await until(
      () =>
        host.state.participants.length === 2 &&
        host.state.participants.every((p) => p.stream?.getTracks().length === 2),
    );
    assert.equal(captures, 3, "host captures once across both guests");
    assert.equal(first.connectionState, "connected");
    assert.equal(host.state.participants.find((p) => p.id === id).stream, firstStream);
    b.session.stop();
    await until(() => host.state.participants.length === 1);
    assert.equal(first.connectionState, "connected", "leaving B must preserve A");
    assert.ok(!signals.some((s) => s.kind === "ice"));
    host.session.stop();
    await until(() => a.state.status === "The host left the room.");
  } finally {
    sessions.forEach((s) => s.stop());
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.ok(acquired.every((stream) => stream.getTracks().every((track) => track.stopped)));
    globalThis.fetch = original.fetch;
    Object.defineProperty(globalThis, "navigator", original.navigator);
    globalThis.RTCPeerConnection = original.pc;
    globalThis.MediaStream = original.stream;
    console.info = original.info;
  }
});

test("TURN configuration accepts runtime and legacy build names and refuses missing credentials", () => {
  assert.throws(() => getRtcConfiguration({}), /TURN is not configured/);
  assert.throws(
    () =>
      getRtcConfiguration({ TURN_URLS: "stun:wrong", TURN_USERNAME: "u", TURN_CREDENTIAL: "p" }),
    /TURN is not configured/,
  );
  for (const prefix of ["", "VITE_"]) {
    const configuration = getRtcConfiguration({
      [prefix + "TURN_URLS"]: "turn:test:3478, turns:test:443?transport=tcp",
      [prefix + "TURN_USERNAME"]: "u",
      [prefix + "TURN_CREDENTIAL"]: "p",
    });
    assert.equal(configuration.iceServers[1].urls.length, 2);
    assert.equal(configuration.iceServers[1].username, "u");
  }
});
