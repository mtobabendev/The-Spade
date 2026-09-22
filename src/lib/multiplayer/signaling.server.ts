/**
 * WebRTC signaling plus simple server-backed room admission state.
 */
import { z } from "zod";
import { getSql, type Sql } from "@/lib/db";
import type { PeerRow, RtcPollResponse, SignalRow } from "./p2p";

const ID = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const signalSchema = z.object({ op: z.literal("signal"), room: ID, from: ID, to: ID, kind: z.enum(["offer", "answer", "ice"]), payload: z.unknown().refine((v) => v !== undefined && JSON.stringify(v).length <= 32_768) });
const leaveSchema = z.object({ op: z.literal("leave"), room: ID, peer: ID });
const requestJoinSchema = z.object({ op: z.literal("request-join"), room: ID, peer: ID, name: z.string().min(1).max(64) });
const acceptJoinSchema = z.object({ op: z.literal("accept-join"), room: ID, peer: ID });
const postSchema = z.discriminatedUnion("op", [signalSchema, leaveSchema, requestJoinSchema, acceptJoinSchema]);

const PEER_TTL_SECONDS = 30;
const SIGNAL_TTL_SECONDS = 60;
const globalRef = globalThis as typeof globalThis & { __rtcSchemaPromise__?: Promise<void> };

function ensureSchema(sql: Sql): Promise<void> {
  globalRef.__rtcSchemaPromise__ ??= (async () => {
    await sql.query(`CREATE TABLE IF NOT EXISTS webrtc_peers (room TEXT NOT NULL, peer_id TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', last_seen TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (room, peer_id))`);
    await sql.query(`CREATE TABLE IF NOT EXISTS webrtc_signals (id BIGSERIAL PRIMARY KEY, room TEXT NOT NULL, to_peer TEXT NOT NULL, from_peer TEXT NOT NULL, kind TEXT NOT NULL, payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await sql.query(`CREATE INDEX IF NOT EXISTS webrtc_signals_inbox ON webrtc_signals (room, to_peer, id)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS room_admissions (room TEXT NOT NULL, peer_id TEXT NOT NULL, name TEXT NOT NULL, accepted BOOLEAN NOT NULL DEFAULT false, last_seen TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (room, peer_id))`);
  })().catch((err) => { globalRef.__rtcSchemaPromise__ = undefined; throw err; });
  return globalRef.__rtcSchemaPromise__;
}

async function roster(sql: Sql, room: string): Promise<PeerRow[]> {
  const rows = await sql.query<{ peer_id: string; name: string }>(`SELECT peer_id, name FROM webrtc_peers WHERE room = $1 AND last_seen > now() - make_interval(secs => $2) ORDER BY peer_id LIMIT 32`, [room, PEER_TTL_SECONDS]);
  return rows.map((r) => ({ id: r.peer_id, name: r.name }));
}
async function touchPeer(sql: Sql, room: string, peer: string, name: string) { await sql.query(`INSERT INTO webrtc_peers (room, peer_id, name, last_seen) VALUES ($1,$2,$3,now()) ON CONFLICT (room,peer_id) DO UPDATE SET last_seen=now(), name=EXCLUDED.name`, [room, peer, name]); }
async function prune(sql: Sql) { await Promise.all([sql.query(`DELETE FROM webrtc_signals WHERE created_at < now() - make_interval(secs => $1)`, [SIGNAL_TTL_SECONDS]), sql.query(`DELETE FROM webrtc_peers WHERE last_seen < now() - make_interval(secs => $1)`, [PEER_TTL_SECONDS]), sql.query(`DELETE FROM room_admissions WHERE last_seen < now() - interval '5 minutes'`)]); }
function json(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } }); }

async function handleGet(url: URL): Promise<Response> {
  if (url.searchParams.get("op") === "admissions") {
    const parsed = z.object({ room: ID, peer: ID.optional() }).safeParse({ room: url.searchParams.get("room"), peer: url.searchParams.get("peer") ?? undefined });
    if (!parsed.success) return json({ error: "invalid query" }, 400);
    const sql = await getSql(); await ensureSchema(sql);
    if (parsed.data.peer) {
      const rows = await sql.query<{ accepted: boolean }>(`SELECT accepted FROM room_admissions WHERE room=$1 AND peer_id=$2`, [parsed.data.room, parsed.data.peer]);
      return json({ accepted: rows[0]?.accepted ?? false });
    }
    const rows = await sql.query<{ peer_id: string; name: string }>(`SELECT peer_id,name FROM room_admissions WHERE room=$1 AND accepted=false ORDER BY last_seen`, [parsed.data.room]);
    return json({ waiting: rows.map((r) => ({ id: r.peer_id, name: r.name })) });
  }
  const parsed = z.object({ room: ID, peer: ID, name: z.string().max(64).default(""), since: z.coerce.number().int().min(0).default(0) }).safeParse({ room: url.searchParams.get("room"), peer: url.searchParams.get("peer"), name: url.searchParams.get("name") ?? "", since: url.searchParams.get("since") ?? 0 });
  if (!parsed.success) return json({ error: "invalid query" }, 400);
  const { room, peer, name, since } = parsed.data; const sql = await getSql(); await ensureSchema(sql); if (since === 0 || Math.random() < .02) await prune(sql); await touchPeer(sql, room, peer, name);
  const rows = await sql.query<{ id:number; from_peer:string; kind:SignalRow["kind"]; payload:unknown }>(`SELECT id,from_peer,kind,payload FROM webrtc_signals WHERE room=$1 AND to_peer=$2 AND id>$3 ORDER BY id LIMIT 200`, [room, peer, since]);
  const body: RtcPollResponse = { peers: await roster(sql, room), signals: rows.map((r) => ({ id:r.id, from:r.from_peer, kind:r.kind, payload:r.payload })) }; return json(body);
}

async function handlePost(request: Request): Promise<Response> {
  let body: unknown; try { body = await request.json(); } catch { return json({ error:"invalid JSON" },400); }
  const parsed = postSchema.safeParse(body); if (!parsed.success) return json({ error:"invalid request" },400); const msg=parsed.data; const sql=await getSql(); await ensureSchema(sql);
  if (msg.op === "signal") await sql.query(`INSERT INTO webrtc_signals (room,to_peer,from_peer,kind,payload) VALUES ($1,$2,$3,$4,$5)`, [msg.room,msg.to,msg.from,msg.kind,JSON.stringify(msg.payload)]);
  else if (msg.op === "leave") await sql.query(`DELETE FROM webrtc_peers WHERE room=$1 AND peer_id=$2`, [msg.room,msg.peer]);
  else if (msg.op === "request-join") await sql.query(`INSERT INTO room_admissions (room,peer_id,name,accepted,last_seen) VALUES ($1,$2,$3,false,now()) ON CONFLICT (room,peer_id) DO UPDATE SET name=EXCLUDED.name,last_seen=now()`, [msg.room,msg.peer,msg.name]);
  else if (msg.op === "accept-join") await sql.query(`UPDATE room_admissions SET accepted=true,last_seen=now() WHERE room=$1 AND peer_id=$2`, [msg.room,msg.peer]);
  return json({ ok:true });
}
export async function handleSignaling(request: Request): Promise<Response> { try { if(request.method==="GET") return await handleGet(new URL(request.url)); if(request.method==="POST") return await handlePost(request); return json({error:"method not allowed"},405); } catch(error) { console.error("[rtc] signaling error:",error); return json({error:"signaling failed"},500); } }
