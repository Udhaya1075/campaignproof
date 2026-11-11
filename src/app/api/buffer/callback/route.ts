import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { decrypt, safeEqual } from "@/lib/crypto";
import { exchangeCode } from "@/lib/buffer/oauth";
import { bufferRequest } from "@/lib/buffer/client";
import { Q_ACCOUNT } from "@/lib/buffer/queries";
import { saveTokens } from "@/lib/buffer/tokens";
import { OAUTH_COOKIE } from "@/lib/buffer/cookie";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const back = (q: string) => {
    const res = NextResponse.redirect(new URL(`/settings?${q}`, req.nextUrl));
    res.cookies.set(OAUTH_COOKIE, "", { path: "/api/buffer", maxAge: 0 });
    return res;
  };
  try {
    const { data: { user } } = await supabaseServer().auth.getUser();
    if (!user) return NextResponse.redirect(new URL("/login?next=/settings", req.nextUrl));
    const env = serverEnv();

    const sp = req.nextUrl.searchParams;
    if (sp.get("error")) {
      const err = (sp.get("error") ?? "").slice(0, 60);
      const desc = (sp.get("error_description") ?? "").slice(0, 200);
      console.error("buffer authorize error:", err, desc); // safe to log: no secrets in these values
      return back(`error=${err === "access_denied" ? "denied" : "buffer_error"}&code=${encodeURIComponent(err)}&desc=${encodeURIComponent(desc)}`);
    }
    const code = sp.get("code");
    const state = sp.get("state");
    const raw = req.cookies.get(OAUTH_COOKIE)?.value;
    if (!code || !state || !raw) return back("error=invalid_state");

    let saved: { state: string; verifier: string; uid: string; exp: number };
    try { saved = JSON.parse(decrypt(raw, env.TOKEN_ENCRYPTION_KEY)); } catch { return back("error=invalid_state"); }
    // OAuth state verification: constant-time compare, same user, not expired.
    if (!safeEqual(saved.state, state) || saved.uid !== user.id || saved.exp < Date.now()) return back("error=invalid_state");

    const tokens = await exchangeCode({
      clientId: env.BUFFER_CLIENT_ID, clientSecret: env.BUFFER_CLIENT_SECRET || undefined,
      redirectUri: env.BUFFER_REDIRECT_URI, code, verifier: saved.verifier,
    });
    await saveTokens(user.id, tokens);

    const acct = await bufferRequest<{ account: { id: string; email: string; organizations: { id: string; name: string }[] } }>(tokens.accessToken, Q_ACCOUNT);
    const org = acct.account.organizations[0];
    await supabaseAdmin().from("buffer_connections").upsert({
      user_id: user.id, buffer_account_id: acct.account.id, buffer_email: acct.account.email,
      organization_id: org?.id ?? null, organization_name: org?.name ?? null, scopes: tokens.scope, status: "active", connected_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    return back("connected=1");
  } catch (e) {
    console.error("buffer callback failed:", e instanceof Error ? e.message : "unknown");
    return back("error=connect_failed");
  }
}
