import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ZodError } from "zod";
import { supabaseServer } from "./supabase/server.ts";
import { isSameOrigin, rateLimit } from "./security.ts";
import { BufferError } from "./buffer/errors.ts";

export interface Ctx {
  req: NextRequest;
  user: User;
  db: SupabaseClient;
  params: Record<string, string>;
}

interface Opts { limit?: number; windowMs?: number }

export function fail(status: number, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Wraps a route handler: auth, CSRF origin check for mutations, rate limit, uniform error mapping. */
export function api(handler: (ctx: Ctx) => Promise<Response | Record<string, unknown>>, opts: Opts = {}) {
  return async (req: NextRequest, ctx: { params: Record<string, string> }) => {
    try {
      const db = supabaseServer();
      const { data: { user } } = await db.auth.getUser();
      if (!user) return fail(401, "Please sign in again.", { code: "unauthenticated" });

      if (req.method !== "GET" && req.method !== "HEAD") {
        const allowed = [req.nextUrl.origin, process.env.NEXT_PUBLIC_APP_URL ?? ""].filter(Boolean);
        if (!isSameOrigin(req.headers.get("origin"), allowed)) return fail(403, "Cross-site request blocked.", { code: "csrf" });
      }
      const rl = rateLimit(`${user.id}:${req.method}:${req.nextUrl.pathname.replace(/[0-9a-f-]{36}/g, ":id")}`, opts.limit ?? 60, opts.windowMs ?? 60_000);
      if (!rl.ok) return NextResponse.json({ error: "Too many requests. Slow down a little.", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

      const out = await handler({ req, user, db, params: ctx?.params ?? {} });
      return out instanceof Response ? out : NextResponse.json(out);
    } catch (e) {
      if (e instanceof ZodError) return fail(400, e.issues[0]?.message ?? "Invalid input", { code: "invalid_input", issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
      if (e instanceof BufferError) {
        if (e.code === "auth" || e.code === "not_connected") return fail(401, e.message, { code: e.code === "auth" ? "buffer_auth" : "buffer_not_connected" });
        if (e.code === "rate_limit") return NextResponse.json({ error: `Buffer rate limit reached. Try again in ${e.retryAfter ?? 60} seconds.`, code: "buffer_rate_limit" }, { status: 429, headers: { "Retry-After": String(e.retryAfter ?? 60) } });
        return fail(e.code === "timeout" ? 504 : 502, e.message, { code: `buffer_${e.code}` });
      }
      console.error("api error:", e instanceof Error ? e.message : "unknown"); // message only: never log tokens or bodies
      return fail(500, e instanceof Error && process.env.NODE_ENV !== "production" ? e.message : "Something went wrong. Please try again.");
    }
  };
}

export async function jsonBody(req: NextRequest): Promise<unknown> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) throw new ZodError([{ code: "custom", path: [], message: "Expected a JSON body" }]);
  try { return await req.json(); } catch { throw new ZodError([{ code: "custom", path: [], message: "Malformed JSON" }]); }
}
