import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const transpile = async (file) =>
  ts.transpileModule(await readFile(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
const data = (source) => "data:text/javascript;base64," + Buffer.from(source).toString("base64");
const config = data(await transpile("../src/lib/multiplayer/rtc-config.server.ts"));
const source = (await transpile("../src/lib/multiplayer/signaling.server.ts"))
  .replace('"zod"', JSON.stringify(import.meta.resolve("zod")))
  .replace(
    'import { redisCommand } from "./redis.server";',
    "const redisCommand = (...args) => globalThis.__rtcRedis(...args);",
  )
  .replace('"./rtc-config.server"', JSON.stringify(config));
const { handleSignaling } = await import(data(source));
const request = (kind, from = "guest_a", to = "host", payload = {}) =>
  new Request("http://localhost/api/rtc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "signal", room: "tarot-test", from, to, kind, payload }),
  });

test("signaling enforces admission, SDP direction and non-trickle schema", async () => {
  const store = new Map(),
    published = [];
  globalThis.__rtcRedis = async (args) => {
    const [command, key, value] = args;
    if (command === "GET") return store.get(key) ?? null;
    if (command === "SET") {
      store.set(key, value);
      return "OK";
    }
    if (command === "DEL") {
      store.delete(key);
      return 1;
    }
    if (command === "EVAL") {
      published.push(JSON.parse(args[5]));
      return "1790000000001";
    }
    throw new Error(`unexpected ${command}`);
  };
  try {
    assert.equal((await handleSignaling(request("ice"))).status, 400);
    assert.equal(
      (
        await handleSignaling(
          request("offer", "host", "guest_a", { description: { type: "offer", sdp: "complete" } }),
        )
      ).status,
      403,
    );
    assert.equal(
      (await handleSignaling(request("guest-request", "guest_a", "host", { name: "Eogcha" })))
        .status,
      200,
    );
    assert.equal((await handleSignaling(request("guest-accepted", "guest_a", "host"))).status, 403);
    assert.equal((await handleSignaling(request("guest-accepted", "host", "guest_a"))).status, 200);
    assert.equal(
      (await handleSignaling(request("guest-accepted", "host", "guest_a"))).status,
      200,
      "approval retry is idempotent",
    );
    assert.equal(
      (
        await handleSignaling(
          request("offer", "host", "guest_a", { description: { type: "offer", sdp: "complete" } }),
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await handleSignaling(
          request("answer", "guest_a", "host", {
            description: { type: "answer", sdp: "complete" },
          }),
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await handleSignaling(
          request("answer", "guest_b", "host", {
            description: { type: "answer", sdp: "complete" },
          }),
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await handleSignaling(
          request("offer", "guest_a", "host", { description: { type: "offer", sdp: "complete" } }),
        )
      ).status,
      400,
    );
    assert.equal((await handleSignaling(request("participant-left"))).status, 200);
    assert.equal(
      (
        await handleSignaling(
          request("answer", "guest_a", "host", {
            description: { type: "answer", sdp: "complete" },
          }),
        )
      ).status,
      403,
    );
    assert.ok(
      published.every(
        (message) => message.room && message.from && message.to && message.kind && message.payload,
      ),
    );
  } finally {
    delete globalThis.__rtcRedis;
  }
});
