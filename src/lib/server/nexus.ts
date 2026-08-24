import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { z } from "zod";

function id() {
  return crypto.randomUUID();
}

export type PartyPost = {
  id: string;
  user_id: string;
  handle: string;
  display_name: string;
  body: string;
  created_at: string;
};

export type GothamMessage = {
  id: string;
  user_id: string;
  handle: string;
  display_name: string;
  channel: string;
  body: string;
  created_at: string;
};

async function profileOf(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ handle: string; display_name: string }>`
    select handle, display_name from profiles where user_id = ${userId}
  `;
  return rows[0] ?? { handle: "player", display_name: "Player" };
}

export const listPartyPosts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    return sql<PartyPost>`
      select id, user_id, handle, display_name, body, created_at::text as created_at
      from party_posts
      order by created_at desc
      limit 80
    `;
  });

export const createPartyPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ body: z.string().trim().min(1).max(280) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await profileOf(context.userId);
    const postId = id();
    await sql`
      insert into party_posts (id, user_id, handle, display_name, body)
      values (${postId}, ${context.userId}, ${me.handle}, ${me.display_name}, ${data.body})
    `;
    const rows = await sql<PartyPost>`
      select id, user_id, handle, display_name, body, created_at::text as created_at
      from party_posts where id = ${postId}
    `;
    return rows[0]!;
  });

export const listGotham = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    return sql<GothamMessage>`
      select id, user_id, handle, display_name, channel, body, created_at::text as created_at
      from gotham_messages
      where channel = ${"clock"}
      order by created_at asc
      limit 120
    `;
  });

export const sendGotham = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ body: z.string().trim().min(1).max(400) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const since = new Date(Date.now() - 5000).toISOString();
    const recent = await sql<{ n: number }>`
      select count(*)::int as n from gotham_messages
      where user_id = ${context.userId} and created_at > ${since}::timestamptz
    `;
    if ((recent[0]?.n ?? 0) >= 5) {
      return { ok: false as const, error: "You're sending too many messages. Stop it." };
    }
    const me = await profileOf(context.userId);
    const msgId = id();
    await sql`
      insert into gotham_messages (id, user_id, handle, display_name, channel, body)
      values (${msgId}, ${context.userId}, ${me.handle}, ${me.display_name}, ${"clock"}, ${data.body})
    `;
    const rows = await sql<GothamMessage>`
      select id, user_id, handle, display_name, channel, body, created_at::text as created_at
      from gotham_messages where id = ${msgId}
    `;
    return { ok: true as const, message: rows[0]! };
  });

export const talkToGarage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      message: z.string().trim().min(1).max(1200),
      history: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string().max(2000),
          }),
        )
        .max(12),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "Garage is locked. The key is not in this bay." };
    }
    const system = `You are Rick, the house AI in Rick's Garage at WildCard DEV in Omaha. You work for Matt, who owns and pays for this stack. Voice: impatient, funny, actually useful. You debug, invent, and roast bloated architecture. You are a garage AI, not a television character — no catchphrases from cartoons, no portal-gun fanfic. Never lewd. Keep answers tight. If someone mentions Justin Luce, thank him: he taught Matt to code, collaborates on some of these builds, and lives at justinlucedev.com. Penny the concierge is a separate personality; do not impersonate her.`;
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        messages: [
          { role: "system", content: system },
          ...data.history.slice(-10),
          { role: "user", content: data.message },
        ],
        max_tokens: 400,
        temperature: 0.85,
      }),
    });
    if (!res.ok) {
      return { ok: false as const, error: `Garage glitched (${res.status}).` };
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content?.trim() || "Try again.";
    return { ok: true as const, text };
  });
