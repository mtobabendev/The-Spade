import assert from "node:assert/strict";
import { test } from "node:test";
import { waitForIceComplete, observePeer } from "./rtc-session-utils.ts";

class Peer extends EventTarget {
  iceGatheringState = "gathering";
  signalingState = "stable";
  connectionState = "new";
  iceConnectionState = "new";
  localDescription = { type: "offer", sdp: "a=candidate:1 1 udp 1 192.0.2.1 123 typ relay\r\n" };
  remoteDescription = null;
  getConfiguration() {
    return {
      iceServers: [
        { urls: "turn:example.test", username: "private-user", credential: "private-secret" },
      ],
    };
  }
}
const asPeer = (pc: Peer) => pc as unknown as RTCPeerConnection;

test("non-trickle waits for gathering complete, not just a candidate", async () => {
  const pc = new Peer();
  let resolved = false;
  const waiting = waitForIceComplete(asPeer(pc)).then(() => {
    resolved = true;
  });
  pc.dispatchEvent(new Event("icecandidate"));
  await Promise.resolve();
  assert.equal(resolved, false);
  pc.iceGatheringState = "complete";
  pc.dispatchEvent(new Event("icegatheringstatechange"));
  await waiting;
  assert.equal(resolved, true);
});

test("already complete resolves, closing rejects unfinished gathering", async () => {
  const complete = new Peer();
  complete.iceGatheringState = "complete";
  await waitForIceComplete(asPeer(complete));
  const closed = new Peer();
  const waiting = waitForIceComplete(asPeer(closed));
  closed.signalingState = "closed";
  closed.dispatchEvent(new Event("signalingstatechange"));
  await assert.rejects(waiting, /closed before ICE/);
});

test("traces expose relay and description state without credentials or SDP addresses", () => {
  const pc = new Peer();
  const lines: string[] = [];
  observePeer(asPeer(pc), (line) => lines.push(line));
  pc.iceGatheringState = "complete";
  pc.dispatchEvent(new Event("icegatheringstatechange"));
  assert.match(lines.join("\n"), /relay=true/);
  assert.match(lines.join("\n"), /local=offer remote=none/);
  assert.doesNotMatch(lines.join("\n"), /private-user|private-secret|192\.0\.2\.1/);
});

test("leaving cancels ICE gathering even when browser close emits no event", async () => {
  const pc = new Peer();
  const abort = new AbortController();
  const waiting = waitForIceComplete(asPeer(pc), abort.signal);
  abort.abort();
  await assert.rejects(waiting, /Room closed/);
});
