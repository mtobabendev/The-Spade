import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { brand } from "@/lib/brand";
import { z } from "zod";

export const PENNY_MODES = [
  { id: "concierge", label: "Concierge" },
  { id: "dm", label: "Dungeon Master" },
  { id: "judge", label: "Table Judge" },
] as const;

function systemPrompt(mode: string) {
  const base = `You are ${brand.hostName}, concierge of ${brand.name} (${brand.shop}, ${brand.city}). Voice: dry, warm, a little sharp. Never lewd. Keep answers tight. You help members of a private comic and game shop: Magic: The Gathering, Star Wars Unlimited, Dungeons & Dragons 5e, Pathfinder 2e, comics, and in-person pickup trades. You cannot move real money or invent store inventory that is not described.`;
  if (mode === "dm") {
    return `${base}
Mode: fill-in Dungeon Master. Run a short tabletop scene. Ask for a d20 when it matters. Play NPCs. Do not write the player's actions for them. Keep scenes to a few beats so a lonely player can finish a session. Prefer original adventures, not copyrighted modules by name.`;
  }
  if (mode === "judge") {
    return `${base}
Mode: tournament judge / rules concierge. Answer MTG, Star Wars Unlimited, D&D 5e, and Pathfinder 2e rules questions clearly. If you are unsure, say so. Do not claim to be the official Comp Rules.`;
  }
  return `${base}
Mode: shop concierge. Help with hours energy, which table to sit at, how pickup checkout works (pay in the Vault, grab at the counter), and how to list a card.`;
}

export const listPennyThreads = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{ id: string; mode: string; title: string; created_at: string }>`
      select id, mode, title, created_at::text as created_at
      from penny_threads where user_id = ${context.userId}
      order by created_at desc
    `;
  });

export const getPennyThread = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const thread = await sql<{ id: string; mode: string; title: string }>`
      select id, mode, title from penny_threads where id = ${data.id} and user_id = ${context.userId}
    `;
    if (!thread[0]) return null;
    const messages = await sql<{ id: string; role: string; content: string }>`
      select id, role, content from penny_messages
      where thread_id = ${data.id} and user_id = ${context.userId}
      order by created_at asc
    `;
    return { ...thread[0], messages };
  });

export const talkToPenny = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      threadId: z.string().optional(),
      mode: z.enum(["concierge", "dm", "judge"]),
      message: z.string().min(1).max(2000),
    }),
  )
  .handler(async ({ context, data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "Penny is offline in this environment." };
    }
    const sql = await getSql();
    let threadId = data.threadId;
    if (!threadId) {
      threadId = crypto.randomUUID();
      const title = data.message.slice(0, 48);
      await sql`
        insert into penny_threads (id, user_id, mode, title)
        values (${threadId}, ${context.userId}, ${data.mode}, ${title})
      `;
    } else {
      const own = await sql<{ id: string }>`
        select id from penny_threads where id = ${threadId} and user_id = ${context.userId}
      `;
      if (!own[0]) return { ok: false as const, error: "Thread missing." };
    }

    await sql`
      insert into penny_messages (id, thread_id, user_id, role, content)
      values (${crypto.randomUUID()}, ${threadId}, ${context.userId}, ${"user"}, ${data.message})
    `;

    const history = await sql<{ role: string; content: string }>`
      select role, content from penny_messages
      where thread_id = ${threadId} and user_id = ${context.userId}
      order by created_at asc
    `;
    const messages = [
      { role: "system", content: systemPrompt(data.mode) },
      ...history.slice(-16).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        messages,
        max_tokens: 500,
        temperature: 0.8,
      }),
    });
    if (!res.ok) {
      return { ok: false as const, error: `Penny glitched (${res.status}).` };
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content?.trim() || "…";
    await sql`
      insert into penny_messages (id, thread_id, user_id, role, content)
      values (${crypto.randomUUID()}, ${threadId}, ${context.userId}, ${"assistant"}, ${text})
    `;
    return { ok: true as const, threadId, text };
  });
