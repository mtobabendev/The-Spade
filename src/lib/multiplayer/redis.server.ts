import net from "node:net";
import tls from "node:tls";

type RedisValue = string | number | null | RedisValue[];

function redisUrl(): URL {
  // Vercel Marketplace integrations can expose the connection as REDIS_URL,
  // STORAGE_URL, or (when a custom prefix is used) STORAGE_REDIS_URL.
  const raw =
    process.env.STORAGE_REDIS_URL ??
    process.env.REDIS_URL ??
    process.env.STORAGE_URL;

  if (!raw) {
    throw new Error(
      "Redis is not connected: expected STORAGE_REDIS_URL, REDIS_URL, or STORAGE_URL",
    );
  }

  const url = new URL(raw);
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error(`Unsupported Redis URL protocol: ${url.protocol}`);
  }
  return url;
}

function encode(args: Array<string | number>): Buffer {
  const parts = [`*${args.length}\r\n`];
  for (const arg of args) {
    const value = String(arg);
    parts.push(`$${Buffer.byteLength(value)}\r\n${value}\r\n`);
  }
  return Buffer.from(parts.join(""));
}

function parse(buffer: Buffer, offset = 0): { value: RedisValue; next: number } | null {
  if (offset >= buffer.length) return null;
  const type = String.fromCharCode(buffer[offset]);
  const end = buffer.indexOf("\r\n", offset + 1);
  if (end < 0) return null;
  const head = buffer.toString("utf8", offset + 1, end);
  const body = end + 2;
  if (type === "+") return { value: head, next: body };
  if (type === ":") return { value: Number(head), next: body };
  if (type === "-") throw new Error(`Redis error: ${head}`);
  if (type === "$") {
    const length = Number(head);
    if (length === -1) return { value: null, next: body };
    if (buffer.length < body + length + 2) return null;
    return { value: buffer.toString("utf8", body, body + length), next: body + length + 2 };
  }
  if (type === "*") {
    const count = Number(head);
    if (count === -1) return { value: null, next: body };
    const values: RedisValue[] = [];
    let cursor = body;
    for (let i = 0; i < count; i++) {
      const item = parse(buffer, cursor);
      if (!item) return null;
      values.push(item.value);
      cursor = item.next;
    }
    return { value: values, next: cursor };
  }
  throw new Error(`Unsupported Redis response type: ${type}`);
}

export async function redisCommand(args: Array<string | number>): Promise<RedisValue> {
  const url = redisUrl();
  const secure = url.protocol === "rediss:";
  const port = Number(url.port || (secure ? 6380 : 6379));
  const host = url.hostname;
  const username = decodeURIComponent(url.username || "default");
  const password = decodeURIComponent(url.password || "");

  return await new Promise<RedisValue>((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host })
      : net.connect({ host, port });
    let buffer = Buffer.alloc(0);
    let stage = password ? 0 : 1;
    let settled = false;
    const finish = (error?: Error, value?: RedisValue) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error); else resolve(value ?? null);
    };
    socket.setTimeout(5000, () => finish(new Error("Redis connection timed out")));
    socket.on("error", (error) => finish(error));
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        const result = parse(buffer);
        if (!result) return;
        buffer = buffer.subarray(result.next);
        if (stage === 0) {
          if (result.value !== "OK") return finish(new Error("Redis authentication failed"));
          stage = 1;
          socket.write(encode(args));
        } else finish(undefined, result.value);
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)));
      }
    });
    socket.once("connect", () => {
      if (password) socket.write(encode(["AUTH", username, password]));
      else socket.write(encode(args));
    });
  });
}
