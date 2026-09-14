import { createHash, timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
const OPERATOR = "Six";
const PASSWORD_SHA256 = "83e35ecb553ab49c80d163541253ca5161b6d6e6ebbbac2e77a72a6e90da15d6";
function safeEqual(left: string, right: string) { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b) }
const handle = async ({ request }: { request: Request }) => { const body = await request.json().catch(() => null) as { username?: string; password?: string } | null; const username = body?.username?.trim() ?? ""; const passwordHash = createHash("sha256").update(body?.password ?? "").digest("hex"); const valid = safeEqual(username, OPERATOR) && safeEqual(passwordHash, PASSWORD_SHA256); return Response.json({ valid }, { status: valid ? 200 : 401 }) };
export const Route = createFileRoute("/api/operator")({ server: { handlers: { POST: handle } } });
