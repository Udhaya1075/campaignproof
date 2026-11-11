import { decrypt, encrypt } from "../crypto.ts";
import { serverEnv } from "../env.ts";
import { supabaseAdmin } from "../supabase/admin.ts";
import { BufferError } from "./errors.ts";
import { bufferRequest } from "./client.ts";
import { refreshTokens, type TokenSet } from "./oauth.ts";

const SKEW_MS = 60_000;

export async function saveTokens(userId: string, t: TokenSet): Promise<void> {
  const env = serverEnv();
  const db = supabaseAdmin();
  const { data: existing } = await db.from("buffer_tokens").select("version, refresh_token_enc").eq("user_id", userId).maybeSingle();
  const { error } = await db.from("buffer_tokens").upsert({
    user_id: userId,
    access_token_enc: encrypt(t.accessToken, env.TOKEN_ENCRYPTION_KEY),
    refresh_token_enc: t.refreshToken ? encrypt(t.refreshToken, env.TOKEN_ENCRYPTION_KEY) : existing?.refresh_token_enc ?? null,
    expires_at: t.expiresAt.toISOString(),
    version: (existing?.version ?? 0) + 1,
  });
  if (error) throw new Error("Could not store Buffer credentials.");
}

export async function deleteTokens(userId: string): Promise<void> {
  await supabaseAdmin().from("buffer_tokens").delete().eq("user_id", userId);
}

async function markExpired(userId: string) {
  await supabaseAdmin().from("buffer_connections").update({ status: "expired" }).eq("user_id", userId);
}

/**
 * Returns a usable access token, refreshing when it is about to expire.
 * Buffer refresh tokens are single-use, so the new pair is written with an optimistic version check:
 * if another request already rotated the token, we use the freshly stored access token instead of
 * re-using the old refresh token (which would revoke the whole grant).
 */
export async function getAccessToken(userId: string, forceRefresh = false): Promise<string> {
  const env = serverEnv();
  const db = supabaseAdmin();
  const { data: row } = await db.from("buffer_tokens").select("*").eq("user_id", userId).maybeSingle();
  if (!row) throw new BufferError("not_connected", "Buffer is not connected.");

  const fresh = new Date(row.expires_at).getTime() - Date.now() > SKEW_MS;
  if (fresh && !forceRefresh) return decrypt(row.access_token_enc, env.TOKEN_ENCRYPTION_KEY);

  if (!row.refresh_token_enc) {
    await markExpired(userId);
    throw new BufferError("auth", "Your Buffer session expired. Reconnect your Buffer account.");
  }
  try {
    const t = await refreshTokens({
      clientId: env.BUFFER_CLIENT_ID,
      clientSecret: env.BUFFER_CLIENT_SECRET || undefined,
      refreshToken: decrypt(row.refresh_token_enc, env.TOKEN_ENCRYPTION_KEY),
    });
    const { data: updated } = await db.from("buffer_tokens").update({
      access_token_enc: encrypt(t.accessToken, env.TOKEN_ENCRYPTION_KEY),
      refresh_token_enc: t.refreshToken ? encrypt(t.refreshToken, env.TOKEN_ENCRYPTION_KEY) : row.refresh_token_enc,
      expires_at: t.expiresAt.toISOString(),
      version: row.version + 1,
    }).eq("user_id", userId).eq("version", row.version).select("user_id");
    if (!updated || updated.length === 0) {
      // Lost the race: someone else rotated the token. Use theirs.
      const { data: latest } = await db.from("buffer_tokens").select("access_token_enc").eq("user_id", userId).single();
      if (latest) return decrypt(latest.access_token_enc, env.TOKEN_ENCRYPTION_KEY);
    }
    return t.accessToken;
  } catch (e) {
    if (e instanceof BufferError && e.code === "auth") await markExpired(userId);
    throw e;
  }
}

/** Runs a Buffer call for a user; on an auth failure it refreshes once and retries once. */
export async function bufferForUser<T>(userId: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  let token = await getAccessToken(userId);
  try {
    return await bufferRequest<T>(token, query, variables);
  } catch (e) {
    if (e instanceof BufferError && e.code === "auth") {
      token = await getAccessToken(userId, true);
      return bufferRequest<T>(token, query, variables);
    }
    if (e instanceof BufferError && e.code === "rate_limit" && (e.retryAfter ?? 99) <= 3) {
      await new Promise((r) => setTimeout(r, (e.retryAfter ?? 1) * 1000));
      return bufferRequest<T>(token, query, variables);
    }
    throw e;
  }
}

export async function getConnection(userId: string) {
  const { data } = await supabaseAdmin().from("buffer_connections").select("*").eq("user_id", userId).maybeSingle();
  return data;
}
