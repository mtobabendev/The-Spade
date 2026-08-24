import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { isUniqueSku } from "@/lib/nav-tree";
import { z } from "zod";
import type { Listing } from "@/lib/server/spade";

export type PayConfig =
  | { provider: "square"; applicationId: string; locationId: string; env: "sandbox" | "production" }
  | { provider: "demo" };

function squareEnv(): "sandbox" | "production" {
  return process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";
}

function readPayConfig(): PayConfig {
  const applicationId = process.env.SQUARE_APPLICATION_ID ?? process.env.SQUARE_APP_ID;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (applicationId && locationId && token) {
    return { provider: "square", applicationId, locationId, env: squareEnv() };
  }
  return { provider: "demo" };
}

export const getPayConfig = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => readPayConfig());

type SquareCharge = { ok: true; paymentId: string } | { ok: false; error: string };

async function chargeSquare(opts: {
  sourceId: string;
  amountCents: number;
  idempotencyKey: string;
}): Promise<SquareCharge> {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!token || !locationId) return { ok: false, error: "Square is not wired on this shop yet." };
  const host =
    squareEnv() === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
  const res = await fetch(`${host}/v2/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Square-Version": "2025-01-23",
    },
    body: JSON.stringify({
      source_id: opts.sourceId,
      idempotency_key: opts.idempotencyKey,
      autocomplete: true,
      location_id: locationId,
      amount_money: { amount: opts.amountCents, currency: "USD" },
    }),
  });
  const body = (await res.json()) as {
    payment?: { id?: string };
    errors?: { detail?: string }[];
  };
  if (!res.ok) {
    return { ok: false, error: body.errors?.[0]?.detail ?? `Square declined (${res.status}).` };
  }
  return { ok: true, paymentId: body.payment?.id ?? opts.idempotencyKey };
}

function guessBrand(digits: string) {
  if (digits.startsWith("4")) return "visa";
  if (digits.startsWith("5")) return "mastercard";
  if (digits.startsWith("3")) return "amex";
  return "card";
}

export const checkoutCart = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      items: z
        .array(z.object({ listingId: z.string(), qty: z.number().int().min(1).max(20) }))
        .min(1)
        .max(30),
      name: z.string().min(2).max(60),
      sourceId: z.string().max(200).optional(),
      cardNumber: z.string().max(24).optional(),
      expiry: z.string().max(7).optional(),
      cvc: z.string().max(4).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<Listing>`
      select id, seller_id, title, game, category, condition, price_cents, description, status, created_at::text as created_at
      from listings
    `;
    const byId = new Map(rows.map((r) => [r.id, r]));
    let total = 0;
    const line: { listing: Listing; qty: number; unique: boolean }[] = [];
    for (const item of data.items) {
      const listing = byId.get(item.listingId);
      if (!listing || listing.status !== "live") {
        return { ok: false as const, error: `${listing?.title ?? "A piece"} is gone.` };
      }
      if (listing.seller_id === context.userId) {
        return { ok: false as const, error: "You already own that table copy." };
      }
      const unique = isUniqueSku(listing.category);
      const qty = unique ? 1 : item.qty;
      total += listing.price_cents * qty;
      line.push({ listing, qty, unique });
    }

    const config = readPayConfig();
    let last4 = "0000";
    let brandGuess = "card";
    let provider: "square" | "demo" = "demo";
    let providerRef: string | null = null;

    if (config.provider === "square") {
      if (!data.sourceId) {
        return { ok: false as const, error: "Card did not tokenize." };
      }
      const charged = await chargeSquare({
        sourceId: data.sourceId,
        amountCents: total,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!charged.ok) return { ok: false as const, error: charged.error };
      provider = "square";
      providerRef = charged.paymentId;
      last4 = "sqre";
      brandGuess = "square";
    } else {
      const digits = (data.cardNumber ?? "").replace(/\D/g, "");
      if (digits.length < 13 || digits.length > 19) {
        return { ok: false as const, error: "Card number looks wrong." };
      }
      if (!data.cvc || !/^\d{3,4}$/.test(data.cvc)) {
        return { ok: false as const, error: "CVC looks wrong." };
      }
      last4 = digits.slice(-4);
      brandGuess = guessBrand(digits);
    }

    const orderIds: string[] = [];
    for (const row of line) {
      if (row.unique) {
        const updated = await sql<{ id: string }>`
          update listings set status = 'sold'
          where id = ${row.listing.id} and status = 'live'
          returning id
        `;
        if (!updated[0]) {
          return { ok: false as const, error: `${row.listing.title} sold while you were looking.` };
        }
      }
      const orderId = crypto.randomUUID();
      await sql`
        insert into orders (id, buyer_id, listing_id, seller_id, amount_cents, status, card_last4, card_brand)
        values (
          ${orderId},
          ${context.userId},
          ${row.listing.id},
          ${row.listing.seller_id},
          ${row.listing.price_cents * row.qty},
          ${"paid"},
          ${last4},
          ${brandGuess}
        )
      `;
      try {
        await sql.query(`update orders set provider = $1, provider_ref = $2 where id = $3`, [
          provider,
          providerRef,
          orderId,
        ]);
      } catch {
        /* 0003 adds these columns; demo still records the sale */
      }
      orderIds.push(orderId);
    }

    return { ok: true as const, orderIds, last4, provider, totalCents: total };
  });
