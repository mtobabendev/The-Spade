/** Only TURN credentials intended for browser clients are returned here. */
export function getRtcConfiguration(env: Record<string, string | undefined>): RTCConfiguration {
  const urls = (env.TURN_URLS ?? env.VITE_TURN_URLS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const username = env.TURN_USERNAME ?? env.VITE_TURN_USERNAME;
  const credential = env.TURN_CREDENTIAL ?? env.VITE_TURN_CREDENTIAL;
  if (
    !urls.length ||
    urls.some((url) => !/^turns?:[^\s]+$/.test(url)) ||
    !username?.trim() ||
    !credential?.trim()
  ) {
    throw new Error(
      "TURN is not configured. Set TURN_URLS, TURN_USERNAME and TURN_CREDENTIAL (or their VITE_ equivalents).",
    );
  }
  return {
    iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }, { urls, username, credential }],
    iceCandidatePoolSize: 0,
  };
}
