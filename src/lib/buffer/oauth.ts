import { BufferError } from "./errors.ts";

export const AUTH_URL = "https://auth.buffer.com/auth";
export const TOKEN_URL = "https://auth.buffer.com/token";
/** Narrowest set that supports this app: read account/channels, read + edit posts, refresh tokens. */
export const SCOPES = ["account:read", "posts:read", "posts:write", "offline_access"];

export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scope: string;
}

export function buildAuthorizeUrl(p: { clientId: string; redirectUri: string; state: string; challenge: string }): string {
  const q = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    state: p.state,
    code_challenge: p.challenge,
    code_challenge_method: "S256",
    prompt: "consent",
  });
  return `${AUTH_URL}?${q.toString()}`;
}

async function tokenRequest(body: Record<string, string>, fetchImpl: typeof fetch = fetch): Promise<TokenSet> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  let res: Response;
  try {
    res = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
      signal: ctrl.signal,
      cache: "no-store",
    });
  } catch (e) {
    throw new BufferError(e instanceof Error && e.name === "AbortError" ? "timeout" : "network", "Could not reach Buffer's token service.");
  } finally {
    clearTimeout(timer);
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || typeof json.access_token !== "string") {
    const err = typeof json.error === "string" ? json.error : "token_error";
    if (res.status === 429) throw new BufferError("rate_limit", "Buffer rate limit reached.", Number.parseInt(res.headers.get("retry-after") ?? "60", 10) || 60);
    if (err === "invalid_grant" || err === "invalid_client" || res.status === 400 || res.status === 401) {
      throw new BufferError("auth", `Buffer refused the authorization (${err}). Reconnect your Buffer account.`);
    }
    throw new BufferError("api", `Buffer token request failed (${err}).`);
  }
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
  return {
    accessToken: json.access_token,
    refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : null,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    scope: typeof json.scope === "string" ? json.scope : SCOPES.join(" "),
  };
}

export function exchangeCode(p: { clientId: string; clientSecret?: string; redirectUri: string; code: string; verifier: string }, fetchImpl?: typeof fetch) {
  const body: Record<string, string> = {
    client_id: p.clientId, grant_type: "authorization_code", code: p.code, redirect_uri: p.redirectUri, code_verifier: p.verifier,
  };
  if (p.clientSecret) body.client_secret = p.clientSecret; // confidential clients only
  return tokenRequest(body, fetchImpl);
}

export function refreshTokens(p: { clientId: string; clientSecret?: string; refreshToken: string }, fetchImpl?: typeof fetch) {
  const body: Record<string, string> = { client_id: p.clientId, grant_type: "refresh_token", refresh_token: p.refreshToken };
  if (p.clientSecret) body.client_secret = p.clientSecret;
  return tokenRequest(body, fetchImpl);
}
