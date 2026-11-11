import { describe, expect, it } from "vitest";
import { decrypt, encrypt, pkceChallenge, randomUrlSafe, safeEqual } from "../../src/lib/crypto.ts";
import { isSafePublicUrl, isSameOrigin, rateLimit, resetRateLimits } from "../../src/lib/security.ts";
import { bufferRequest } from "../../src/lib/buffer/client.ts";
import { BufferError } from "../../src/lib/buffer/errors.ts";
import { buildAuthorizeUrl, exchangeCode, refreshTokens, SCOPES } from "../../src/lib/buffer/oauth.ts";
import { diffWords } from "../../src/lib/diff.ts";

const KEY = Buffer.alloc(32, 7).toString("base64");
const json = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });

describe("token encryption", () => {
  it("round-trips and uses a fresh IV each time", () => {
    const a = encrypt("secret-token", KEY);
    const b = encrypt("secret-token", KEY);
    expect(a).not.toBe(b);
    expect(decrypt(a, KEY)).toBe("secret-token");
    expect(a).not.toContain("secret-token");
  });
  it("rejects tampering and the wrong key", () => {
    const enc = encrypt("secret-token", KEY);
    const parts = enc.split(".");
    parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith("AA") ? "BB" : "AA");
    expect(() => decrypt(parts.join("."), KEY)).toThrow();
    expect(() => decrypt(enc, Buffer.alloc(32, 9).toString("base64"))).toThrow();
    expect(() => encrypt("x", Buffer.alloc(8).toString("base64"))).toThrow();
  });
});

describe("PKCE and OAuth state", () => {
  it("matches the RFC 7636 test vector", () => {
    expect(pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
  it("generates unique url-safe values", () => {
    const a = randomUrlSafe(32), b = randomUrlSafe(32);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
  it("compares state in a length-safe way", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
  it("builds the Buffer authorize URL with S256 PKCE and the minimal scopes", () => {
    const u = new URL(buildAuthorizeUrl({ clientId: "cid", redirectUri: "https://localhost:3000/api/buffer/callback", state: "st", challenge: "ch" }));
    expect(u.origin + u.pathname).toBe("https://auth.buffer.com/auth");
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("state")).toBe("st");
    expect(u.searchParams.get("scope")).toBe(SCOPES.join(" "));
    expect(SCOPES).toContain("offline_access");
  });
});

describe("Buffer token endpoint", () => {
  it("sends the client secret only when there is one", async () => {
    const seen: string[] = [];
    const f = (async (_u: unknown, init: RequestInit) => { seen.push(String(init.body)); return json({ access_token: "a", refresh_token: "r", expires_in: 3600, scope: "x" }); }) as unknown as typeof fetch;
    await exchangeCode({ clientId: "c", clientSecret: "s", redirectUri: "https://x/cb", code: "k", verifier: "v" }, f);
    await exchangeCode({ clientId: "c", redirectUri: "https://x/cb", code: "k", verifier: "v" }, f);
    expect(seen[0]).toContain("client_secret=s");
    expect(seen[0]).toContain("code_verifier=v");
    expect(seen[1]).not.toContain("client_secret");
  });
  it("returns an expiry date and the rotated refresh token", async () => {
    const f = (async () => json({ access_token: "a2", refresh_token: "r2", expires_in: 3600 })) as unknown as typeof fetch;
    const t = await refreshTokens({ clientId: "c", refreshToken: "r1" }, f);
    expect(t.refreshToken).toBe("r2");
    expect(t.expiresAt.getTime()).toBeGreaterThan(Date.now() + 3_000_000);
  });
  it("maps invalid_grant to an auth error (expired or revoked token)", async () => {
    const f = (async () => json({ error: "invalid_grant" }, { status: 400 })) as unknown as typeof fetch;
    await expect(refreshTokens({ clientId: "c", refreshToken: "old" }, f)).rejects.toThrow("Reconnect");
    try { await refreshTokens({ clientId: "c", refreshToken: "old" }, f); } catch (e) { expect((e as BufferError).code).toBe("auth"); }
  });
});

describe("Buffer GraphQL client", () => {
  const call = (f: typeof fetch, timeoutMs?: number) => bufferRequest<{ ok: boolean }>("tok", "query { x }", {}, { fetchImpl: f, timeoutMs });
  const code = async (p: Promise<unknown>) => { try { await p; return "none"; } catch (e) { return (e as BufferError).code; } };

  it("returns data and sends the bearer token only in the header", async () => {
    let init: RequestInit = {};
    const f = (async (_u: unknown, i: RequestInit) => { init = i; return json({ data: { ok: true } }); }) as unknown as typeof fetch;
    expect((await call(f)).ok).toBe(true);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(String(init.body)).not.toContain("tok\"");
  });
  it("maps HTTP 401 and GraphQL UNAUTHORIZED to auth (expired token)", async () => {
    expect(await code(call((async () => json({}, { status: 401 })) as unknown as typeof fetch))).toBe("auth");
    expect(await code(call((async () => json({ errors: [{ message: "x", extensions: { code: "UNAUTHORIZED" } }] })) as unknown as typeof fetch))).toBe("auth");
  });
  it("maps 429 to rate_limit and keeps Retry-After", async () => {
    const f = (async () => json({}, { status: 429, headers: { "retry-after": "42" } })) as unknown as typeof fetch;
    try { await call(f); } catch (e) { expect((e as BufferError).code).toBe("rate_limit"); expect((e as BufferError).retryAfter).toBe(42); }
  });
  it("maps GraphQL RATE_LIMIT_EXCEEDED to rate_limit", async () => {
    expect(await code(call((async () => json({ errors: [{ message: "slow", extensions: { code: "RATE_LIMIT_EXCEEDED" } }] })) as unknown as typeof fetch))).toBe("rate_limit");
  });
  it("surfaces other GraphQL errors as api errors", async () => {
    expect(await code(call((async () => json({ errors: [{ message: "Bad field" }] })) as unknown as typeof fetch))).toBe("api");
  });
  it("times out a hung request", async () => {
    const hang = ((_u: unknown, i: RequestInit) => new Promise((_, rej) => i.signal!.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))))) as unknown as typeof fetch;
    expect(await code(call(hang, 30))).toBe("timeout");
  });
  it("maps a network failure and an unreadable body", async () => {
    expect(await code(call((async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch))).toBe("network");
    expect(await code(call((async () => new Response("<html>", { status: 502 })) as unknown as typeof fetch))).toBe("api");
  });
});

describe("security helpers", () => {
  it("allows only same-origin mutations", () => {
    const allowed = ["https://app.example.com"];
    expect(isSameOrigin("https://app.example.com", allowed)).toBe(true);
    expect(isSameOrigin("https://evil.example.net", allowed)).toBe(false);
    expect(isSameOrigin(null, allowed)).toBe(false);
    expect(isSameOrigin("not a url", allowed)).toBe(false);
  });
  it("rate limits per key and recovers after the window", () => {
    resetRateLimits();
    const t = 1_000_000;
    expect(rateLimit("k", 2, 1000, t).ok).toBe(true);
    expect(rateLimit("k", 2, 1000, t + 1).ok).toBe(true);
    const blocked = rateLimit("k", 2, 1000, t + 2);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(rateLimit("other", 2, 1000, t + 3).ok).toBe(true);
    expect(rateLimit("k", 2, 1000, t + 1500).ok).toBe(true);
  });
  it("rejects unsafe campaign URLs (SSRF prevention)", () => {
    for (const bad of ["http://localhost/x", "http://127.0.0.1/", "http://10.0.0.5/a", "http://192.168.1.1", "http://169.254.169.254/latest", "http://172.16.0.1", "ftp://example.com", "javascript:alert(1)", "https://user:pw@example.com", "http://[::1]/", "http://intranet.local", "http://printer"]) {
      expect(isSafePublicUrl(bad)).toBe(false);
    }
    for (const good of ["example.com/offer", "https://www.example.co.in/a?b=1", "http://shop.example.com"]) expect(isSafePublicUrl(good)).toBe(true);
  });
});

describe("diff", () => {
  it("marks only the changed words", () => {
    const d = diffWords("Get 25% off today", "Get 20% off today");
    expect(d.filter((p) => p.type === "del").map((p) => p.text)).toEqual(["25%"]);
    expect(d.filter((p) => p.type === "add").map((p) => p.text)).toEqual(["20%"]);
    expect(d.map((p) => p.text).join("")).toContain("Get ");
  });
  it("handles empty input", () => {
    expect(diffWords("", "")).toEqual([]);
    expect(diffWords("a", "")).toEqual([{ type: "del", text: "a" }]);
  });
});
