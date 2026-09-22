# The Spade

Members table for [WildCard Games](https://wildcarddev.com). Comics, Magic, Star Wars Unlimited, Pathfinder, D&D. Password past Penny. Pay in the Vault. Pickup at the counter.

This is its own site and its own repo — not Mark V, not The Nexus.

## Stack

TanStack Start, React 19, Tailwind v4, Postgres (Neon / PGLite in preview).

## Scripts

```bash
npm install
npm run dev
npm run build
npm run typecheck
```

## Public surfaces

- `/` — knock / landing
- `/login` — members
- `/easy` — Easy button QR (AA / NA jump, no account)
- `/meetings` — live meeting lists
- `/hall` — the table (signed in)

Invite at the door is shop-side. Preview code is on the landing until that rotates.

## Video rooms: host approval and non-trickle ICE

The landing page and table video use `TarotSession` and one `RtcSession` controller. A guest sends `guest-request` without constructing a peer. Each host Accept sends `guest-accepted`, then an offer only after ICE gathering completes. The guest answers after its own gathering completes. No individual ICE candidate messages are sent or accepted by the video signaling API.

Set runtime `TURN_URLS` (comma-separated `turn:`/`turns:` URLs), `TURN_USERNAME`, and `TURN_CREDENTIAL`. Existing `VITE_TURN_URLS`, `VITE_TURN_USERNAME`, and `VITE_TURN_CREDENTIAL` names are also accepted when available to the server. Use credentials intended for distribution to WebRTC clients; do not place a provider management API key in `TURN_CREDENTIAL`. `/api/rtc?op=config` returns this RTC configuration with no-store caching. There is no public-credential or STUN-only fallback. Missing configuration or failure to gather a relay candidate produces a visible error. Gathering has a 30-second failure deadline; it never sends incomplete SDP on timeout.

Run `npm run typecheck`, `npm run test:rtc`, and the production build before deployment. On Windows, the build wrapper can be invoked with `node scripts/with-app-env.mjs node node_modules/vite/bin/vite.js build` to avoid spawning a `.cmd` launcher. The production compilation does not require running database migrations during local validation.

`npm run test:rtc` exercises the session state machine with simulated peers and the signaling handler with a simulated Redis adapter. Those tests are not proof of actual audio/video or TURN traffic. Final acceptance requires two physical clients with both directions of media, then a second approved guest without disturbing the first. Peer traces use the existing room trace endpoint and include description types, ICE states, relay presence, and selected candidate type without logging credentials or SDP addresses. If browser autoplay blocks remote audio/video, the tile exposes a Play video and audio control.
