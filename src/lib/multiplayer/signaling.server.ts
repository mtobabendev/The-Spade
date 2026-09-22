/** One non-trickle mailbox for host-approved video rooms. */
import { z } from "zod";
import { redisCommand } from "./redis.server";
import { getRtcConfiguration } from "./rtc-config.server";
import type { RoomSignal } from "../../components/tarot/rtc-protocol";

const ID = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const description = z.object({
  type: z.enum(["offer", "answer"]),
  sdp: z.string().min(1).max(32768),
});
const signalSchema = z.object({
  op: z.literal("signal"),
  room: ID,
  from: ID,
  to: ID,
  kind: z.enum(["guest-request", "guest-accepted", "offer", "answer", "participant-left"]),
  payload: z.object({ name: z.string().max(100).optional(), description: description.optional() }),
});
const traceSchema = z.object({
  op: z.literal("trace"),
  room: ID,
  peer: ID,
  role: z.enum(["guest", "operator"]),
  line: z.string().min(1).max(500),
});
const postSchema = z.discriminatedUnion("op", [signalSchema, traceSchema]);
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
function inbox(room: string, peer: string) {
  return `spade:rtc:${room}:${peer}:inbox`;
}
function signalKey(room: string, id: number) {
  return `spade:rtc:${room}:signal:${id}`;
}
function traceKey(room: string) {
  return `spade:rtc:${room}:trace`;
}

// Allocate and publish together: a concurrent poll must never skip an earlier,
// partially written message. Time-based IDs stay monotonic after mailbox expiry.
const publish = `
local time = redis.call('TIME')
local id = math.max(tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000), tonumber(redis.call('GET', KEYS[1]) or '0') + 1)
local message = cjson.decode(ARGV[1])
message.id = id
local encodedId = string.format('%.0f', id)
redis.call('SET', KEYS[1], encodedId, 'EX', 86400)
redis.call('SET', ARGV[2] .. encodedId, cjson.encode(message), 'EX', 3600)
redis.call('ZADD', KEYS[2], id, encodedId)
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', id - 3600000)
redis.call('EXPIRE', KEYS[2], 3600)
return encodedId
`;

async function handleGet(url: URL) {
  if (url.searchParams.get("op") === "config") {
    try {
      return json({ configuration: getRtcConfiguration(process.env) });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 503);
    }
  }
  if (url.searchParams.get("op") === "trace") {
    const room = ID.safeParse(url.searchParams.get("room"));
    if (!room.success) return json({ error: "invalid room" }, 400);
    const raw = await redisCommand(["LRANGE", traceKey(room.data), 0, 199]);
    return json({ room: room.data, lines: Array.isArray(raw) ? raw : [] });
  }
  const query = z.object({ room: ID, peer: ID, since: z.coerce.number().int().min(0) }).safeParse({
    room: url.searchParams.get("room"),
    peer: url.searchParams.get("peer"),
    since: url.searchParams.get("since") ?? 0,
  });
  if (!query.success) return json({ error: "invalid query" }, 400);
  const { room, peer, since } = query.data;
  const raw = await redisCommand([
    "ZRANGEBYSCORE",
    inbox(room, peer),
    `(${since}`,
    "+inf",
    "LIMIT",
    0,
    200,
  ]);
  const ids = Array.isArray(raw)
    ? raw.filter((value): value is string => typeof value === "string")
    : [];
  const signals: RoomSignal[] = [];
  if (ids.length) {
    const values = await redisCommand(["MGET", ...ids.map((id) => signalKey(room, Number(id)))]);
    if (Array.isArray(values))
      for (const value of values) {
        if (typeof value !== "string") continue;
        try {
          signals.push(JSON.parse(value));
        } catch {
          /* expired or invalid record */
        }
      }
  }
  return json({ signals });
}
async function handlePost(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid request" }, 400);
  const msg = parsed.data;
  if (msg.op === "trace") {
    const key = traceKey(msg.room);
    await redisCommand([
      "RPUSH",
      key,
      `${new Date().toISOString()} [${msg.role}:${msg.peer}] ${msg.line}`,
    ]);
    await redisCommand(["LTRIM", key, -200, -1]);
    await redisCommand(["EXPIRE", key, 1800]);
    return json({ ok: true });
  }
  if (msg.from === msg.to) return json({ error: "invalid target" }, 400);
  const guest = msg.from === "host" ? msg.to : msg.from;
  const admission = `spade:rtc:${msg.room}:${guest}:admission`;
  if (msg.kind === "guest-request") {
    if (msg.to !== "host" || msg.from === "host")
      return json({ error: "invalid admission request" }, 400);
    await redisCommand(["SET", admission, "pending", "EX", 3600]);
  } else if (msg.kind === "guest-accepted") {
    if (msg.from !== "host") return json({ error: "only the host accepts guests" }, 403);
    if (!["pending", "accepted"].includes(String(await redisCommand(["GET", admission]))))
      return json({ error: "guest has no pending request" }, 409);
    await redisCommand(["SET", admission, "accepted", "EX", 3600]);
  } else if (msg.kind === "offer" || msg.kind === "answer") {
    if (
      (msg.kind === "offer" && msg.from !== "host") ||
      (msg.kind === "answer" && msg.to !== "host") ||
      msg.payload.description?.type !== msg.kind
    )
      return json({ error: "invalid description direction" }, 400);
    if ((await redisCommand(["GET", admission])) !== "accepted")
      return json({ error: "host approval required" }, 403);
  } else if (msg.kind === "participant-left") {
    if (msg.from !== "host" && msg.to !== "host")
      return json({ error: "invalid leave target" }, 400);
    await redisCommand(["DEL", admission]);
  }
  const id = await redisCommand([
    "EVAL",
    publish,
    2,
    `spade:rtc:${msg.room}:seq`,
    inbox(msg.room, msg.to),
    JSON.stringify({
      room: msg.room,
      from: msg.from,
      to: msg.to,
      kind: msg.kind,
      payload: msg.payload,
    }),
    `spade:rtc:${msg.room}:signal:`,
  ]);
  return json({ ok: true, id: Number(id) });
}
export async function handleSignaling(request: Request): Promise<Response> {
  try {
    if (request.method === "GET") return await handleGet(new URL(request.url));
    if (request.method === "POST") return await handlePost(request);
    return json({ error: "method not allowed" }, 405);
  } catch (error) {
    console.error("[rtc] signaling error", error);
    return json({ error: "signaling unavailable" }, 503);
  }
}
