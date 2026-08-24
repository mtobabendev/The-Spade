import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { brand } from "@/lib/brand";
import { emptySheet, type SheetData } from "@/lib/sheets";
import { z } from "zod";

function id() {
  return crypto.randomUUID();
}

export type Profile = {
  user_id: string;
  handle: string;
  display_name: string;
  bio: string;
  invited: boolean;
};

export type Listing = {
  id: string;
  seller_id: string;
  title: string;
  game: string;
  category: string;
  condition: string;
  price_cents: number;
  description: string;
  status: string;
  created_at: string;
};

export type Order = {
  id: string;
  buyer_id: string;
  listing_id: string;
  seller_id: string;
  amount_cents: number;
  status: string;
  card_last4: string | null;
  card_brand: string | null;
  created_at: string;
  title?: string;
};

export type SheetRow = {
  id: string;
  user_id: string;
  system: string;
  name: string;
  data: SheetData;
  updated_at: string;
};

function normalizeSheet(row: { id: string; user_id: string; system: string; name: string; data: unknown; updated_at: string }): SheetRow {
  let data: unknown = row.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  }
  const parsed = data && typeof data === "object" && !Array.isArray(data) ? (data as Partial<SheetData>) : {};
  return { ...row, data: { ...emptySheet(), ...parsed, abilities: { ...emptySheet().abilities, ...parsed.abilities } } };
}

export type EventRow = {
  id: string;
  title: string;
  game: string;
  starts_at: string;
  seats: number;
  blurb: string;
  host: string;
  filled: number;
  mine: boolean;
};

function handleFrom(name: string, userId: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12);
  return `${base || "player"}${userId.slice(-4)}`;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Profile>`
      select user_id, handle, display_name, bio, invited
      from profiles where user_id = ${context.userId}
    `;
    if (rows[0]) return rows[0];
    const display = "Player";
    const handle = handleFrom(display, context.userId);
    await sql`
      insert into profiles (user_id, handle, display_name, bio, invited)
      values (${context.userId}, ${handle}, ${display}, ${""}, ${false})
      on conflict (user_id) do nothing
    `;
    const again = await sql<Profile>`
      select user_id, handle, display_name, bio, invited
      from profiles where user_id = ${context.userId}
    `;
    return again[0]!;
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      display_name: z.string().min(1).max(40),
      handle: z.string().min(2).max(20).regex(/^[a-z0-9_]+$/),
      bio: z.string().max(280),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      update profiles
      set display_name = ${data.display_name},
          handle = ${data.handle},
          bio = ${data.bio}
      where user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const redeemInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ code: z.string().min(1).max(40) }))
  .handler(async ({ context, data }) => {
    const ok = data.code.trim().toUpperCase() === brand.inviteCode;
    if (!ok) return { ok: false as const, error: "Wrong table password." };
    const sql = await getSql();
    await sql`update profiles set invited = true where user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const listListings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    return sql<Listing>`
      select id, seller_id, title, game, category, condition, price_cents, description, status, created_at::text as created_at
      from listings
      where status = 'live'
      order by created_at desc
    `;
  });

export const getListing = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<Listing>`
      select id, seller_id, title, game, category, condition, price_cents, description, status, created_at::text as created_at
      from listings where id = ${data.id}
    `;
    return rows[0] ?? null;
  });

export const createListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      title: z.string().min(2).max(80),
      game: z.string().min(1).max(24),
      category: z.string().min(1).max(24),
      condition: z.string().min(1).max(16),
      price_cents: z.number().int().min(100).max(99_000_000),
      description: z.string().max(600),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const listingId = id();
    await sql`
      insert into listings (id, seller_id, title, game, category, condition, price_cents, description, status)
      values (${listingId}, ${context.userId}, ${data.title}, ${data.game}, ${data.category}, ${data.condition}, ${data.price_cents}, ${data.description}, ${"live"})
    `;
    return { id: listingId };
  });

export const checkoutListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      listingId: z.string(),
      cardNumber: z.string().min(12).max(24),
      expiry: z.string().min(4).max(7),
      cvc: z.string().min(3).max(4),
      name: z.string().min(2).max(60),
    }),
  )
  .handler(async ({ context, data }) => {
    const digits = data.cardNumber.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) {
      return { ok: false as const, error: "Card number looks wrong." };
    }
    if (!/^\d{3,4}$/.test(data.cvc)) {
      return { ok: false as const, error: "CVC looks wrong." };
    }
    const sql = await getSql();
    const rows = await sql<Listing>`
      select id, seller_id, title, game, category, condition, price_cents, description, status, created_at::text as created_at
      from listings where id = ${data.listingId}
    `;
    const listing = rows[0];
    if (!listing || listing.status !== "live") {
      return { ok: false as const, error: "That piece is gone." };
    }
    if (listing.seller_id === context.userId) {
      return { ok: false as const, error: "You already own the table copy." };
    }
    const last4 = digits.slice(-4);
    const brandGuess =
      digits.startsWith("4") ? "visa" : digits.startsWith("5") ? "mastercard" : digits.startsWith("3") ? "amex" : "card";
    const orderId = id();
    await sql`
      update listings set status = 'sold' where id = ${listing.id} and status = 'live'
    `;
    await sql`
      insert into orders (id, buyer_id, listing_id, seller_id, amount_cents, status, card_last4, card_brand)
      values (${orderId}, ${context.userId}, ${listing.id}, ${listing.seller_id}, ${listing.price_cents}, ${"paid"}, ${last4}, ${brandGuess})
    `;
    return { ok: true as const, orderId, last4 };
  });

export const myOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<Order>`
      select o.id, o.buyer_id, o.listing_id, o.seller_id, o.amount_cents, o.status, o.card_last4, o.card_brand, o.created_at::text as created_at, l.title
      from orders o
      join listings l on l.id = o.listing_id
      where o.buyer_id = ${context.userId}
      order by o.created_at desc
    `;
  });

export const listSheets = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<SheetRow>`
      select id, user_id, system, name, data, updated_at::text as updated_at
      from sheets where user_id = ${context.userId}
      order by updated_at desc
    `;
    return rows.map(normalizeSheet);
  });

export const getSheet = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<SheetRow>`
      select id, user_id, system, name, data, updated_at::text as updated_at
      from sheets where id = ${data.id} and user_id = ${context.userId}
    `;
    return rows[0] ? normalizeSheet(rows[0]) : null;
  });

export const saveSheet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string().optional(),
      system: z.enum(["dnd5e", "pf2e"]),
      name: z.string().min(1).max(40),
      data: z.object({
        className: z.string(),
        level: z.number(),
        ancestry: z.string(),
        background: z.string(),
        alignment: z.string(),
        hp: z.number(),
        hpMax: z.number(),
        ac: z.number(),
        speed: z.number(),
        abilities: z.object({
          str: z.number(),
          dex: z.number(),
          con: z.number(),
          int: z.number(),
          wis: z.number(),
          cha: z.number(),
        }),
        notes: z.string(),
      }),
    }),
  )
  .handler(async ({ context, data }) => {
    const sheetId = data.id ?? id();
    const payload = JSON.stringify(data.data);
    const sql = await getSql();
    if (data.id) {
      await sql.query(
        `update sheets
         set name = $1, system = $2, data = $3::jsonb, updated_at = now()
         where id = $4 and user_id = $5`,
        [data.name, data.system, payload, sheetId, context.userId],
      );
    } else {
      await sql.query(
        `insert into sheets (id, user_id, system, name, data)
         values ($1, $2, $3, $4, $5::jsonb)`,
        [sheetId, context.userId, data.system, data.name, payload],
      );
    }
    return { id: sheetId };
  });

export const listEvents = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const events = await sql<{
      id: string;
      title: string;
      game: string;
      starts_at: string;
      seats: number;
      blurb: string;
      host: string;
    }>`
      select id, title, game, starts_at::text as starts_at, seats, blurb, host
      from events order by starts_at asc
    `;
    const mine = await sql<{ event_id: string }>`
      select event_id from rsvps where user_id = ${context.userId}
    `;
    const counts = await sql<{ event_id: string; n: number }>`
      select event_id, count(*)::int as n from rsvps group by event_id
    `;
    const mineSet = new Set(mine.map((r) => r.event_id));
    const countMap = new Map(counts.map((r) => [r.event_id, r.n]));
    return events.map((e) => ({
      ...e,
      filled: countMap.get(e.id) ?? 0,
      mine: mineSet.has(e.id),
    })) satisfies EventRow[];
  });

export const toggleRsvp = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ eventId: z.string() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await sql<{ event_id: string }>`
      select event_id from rsvps where event_id = ${data.eventId} and user_id = ${context.userId}
    `;
    if (existing[0]) {
      await sql`delete from rsvps where event_id = ${data.eventId} and user_id = ${context.userId}`;
      return { mine: false };
    }
    const ev = await sql<{ seats: number }>`select seats from events where id = ${data.eventId}`;
    const filled = await sql<{ n: number }>`select count(*)::int as n from rsvps where event_id = ${data.eventId}`;
    if (!ev[0] || (filled[0]?.n ?? 0) >= ev[0].seats) {
      return { mine: false, error: "Table is full." };
    }
    await sql`insert into rsvps (event_id, user_id) values (${data.eventId}, ${context.userId})`;
    return { mine: true };
  });
