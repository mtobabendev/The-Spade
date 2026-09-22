export function waitForIceComplete(pc: RTCPeerConnection, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = setTimeout(() => {
      cleanup();
      reject(
        new Error("ICE gathering did not complete within 30 seconds. Check TURN reachability."),
      );
    }, 30000);
    const cancelled = () => {
      cleanup();
      reject(new Error("Room closed during ICE gathering"));
    };
    const cleanup = () => {
      clearTimeout(deadline);
      signal?.removeEventListener("abort", cancelled);
      pc.removeEventListener("icegatheringstatechange", check);
      pc.removeEventListener("connectionstatechange", check);
      pc.removeEventListener("signalingstatechange", check);
    };
    const check = () => {
      if (pc.signalingState === "closed" || pc.connectionState === "closed") {
        cleanup();
        reject(new Error("Connection closed before ICE gathering completed"));
      } else if (pc.iceGatheringState === "complete") {
        cleanup();
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", check);
    pc.addEventListener("connectionstatechange", check);
    pc.addEventListener("signalingstatechange", check);
    signal?.addEventListener("abort", cancelled, { once: true });
    if (signal?.aborted) cancelled();
    else check();
  });
}

export function observePeer(pc: RTCPeerConnection, trace: (line: string) => void) {
  const snapshot = (event: string) =>
    trace(
      `${event}: signaling=${pc.signalingState} gathering=${pc.iceGatheringState} ice=${pc.iceConnectionState} connection=${pc.connectionState} local=${pc.localDescription?.type ?? "none"} remote=${pc.remoteDescription?.type ?? "none"}`,
    );
  for (const event of [
    "signalingstatechange",
    "icegatheringstatechange",
    "iceconnectionstatechange",
    "connectionstatechange",
  ]) {
    pc.addEventListener(event, () => snapshot(event));
  }
  const config = pc.getConfiguration();
  const turn =
    config.iceServers?.filter((server) =>
      (Array.isArray(server.urls) ? server.urls : [server.urls]).some((url) =>
        /^turns?:/.test(url),
      ),
    ) ?? [];
  trace(
    `client configuration: TURN servers=${turn.length} authenticated=${turn.every((server) => Boolean(server.username && server.credential))} policy=${config.iceTransportPolicy ?? "all"}`,
  );
  pc.addEventListener("icecandidateerror", (event) => {
    const error = event as RTCPeerConnectionIceErrorEvent;
    trace(`ICE server error: code=${error.errorCode}`);
  });
  pc.addEventListener("icegatheringstatechange", () => {
    if (pc.iceGatheringState !== "complete") return;
    const types = [
      ...(pc.localDescription?.sdp ?? "").matchAll(/ typ (host|srflx|prflx|relay)\b/g),
    ].map((match) => match[1]);
    trace(`gathered candidates: ${types.join(",") || "none"}; relay=${types.includes("relay")}`);
  });
  pc.addEventListener("track", (event) =>
    trace(`remote track: kind=${event.track.kind} state=${event.track.readyState}`),
  );
  pc.addEventListener("connectionstatechange", () => {
    if (!["connected", "failed"].includes(pc.connectionState)) return;
    void pc
      .getStats()
      .then((report) => {
        report.forEach((stat) => {
          if (stat.type !== "transport" || !stat.selectedCandidatePairId) return;
          const pair = report.get(stat.selectedCandidatePairId);
          const local = pair && report.get(pair.localCandidateId);
          const remote = pair && report.get(pair.remoteCandidateId);
          trace(
            `selected pair: state=${pair?.state} local=${local?.candidateType} remote=${remote?.candidateType} bytesSent=${pair?.bytesSent} bytesReceived=${pair?.bytesReceived}`,
          );
        });
      })
      .catch(() => trace("candidate-pair stats unavailable"));
  });
  snapshot("created");
}
