import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { encrypt, pkceChallenge, randomUrlSafe } from "@/lib/crypto";
import { buildAuthorizeUrl } from "@/lib/buffer/oauth";
import { rateLimit } from "@/lib/security";
import { OAUTH_COOKIE } from "@/lib/buffer/cookie";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/settings", req.nextUrl));
  if (!rateLimit(`connect:${user.id}`, 10, 60_000).ok) return NextResponse.redirect(new URL("/settings?error=rate_limited", req.nextUrl));

  let env;
  try { env = serverEnv(); } catch (e) {
    // Names the broken variable(s) only, never their values.
    const detail = e instanceof Error ? e.message.replace("Invalid environment configuration. ", "") : "unknown";
    console.error("buffer connect: bad environment:", detail);
    return NextResponse.redirect(new URL(`/settings?error=not_configured&code=config&desc=${encodeURIComponent(detail.slice(0, 200))}`, req.nextUrl));
  }

  const state = randomUrlSafe(24);
  const verifier = randomUrlSafe(48);
  const res = NextResponse.redirect(buildAuthorizeUrl({
    clientId: env.BUFFER_CLIENT_ID, redirectUri: env.BUFFER_REDIRECT_URI, state, challenge: pkceChallenge(verifier),
  }));
  // State + PKCE verifier travel in an encrypted, HttpOnly cookie bound to this user and valid for 10 minutes.
  res.cookies.set(OAUTH_COOKIE, encrypt(JSON.stringify({ state, verifier, uid: user.id, exp: Date.now() + 600_000 }), env.TOKEN_ENCRYPTION_KEY), {
    httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax", path: "/api/buffer", maxAge: 600,
  });
  return res;
}
