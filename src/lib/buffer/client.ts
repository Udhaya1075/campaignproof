import { BufferError } from "./errors.ts";

export const BUFFER_API_URL = "https://api.buffer.com";

interface GqlResponse<T> {
  data?: T;
  errors?: { message: string; extensions?: { code?: string } }[];
}

export interface RequestOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const AUTH_CODES = new Set(["UNAUTHORIZED", "UNAUTHENTICATED", "INVALID_TOKEN", "TOKEN_EXPIRED"]);

/**
 * One GraphQL call to Buffer. Maps every failure to a BufferError so callers can react:
 * auth (expired/revoked token), rate_limit (429, with retryAfter seconds), timeout, network, api.
 * The access token is only ever placed in the Authorization header; it is never logged or echoed.
 */
export async function bufferRequest<T>(
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {},
  opts: RequestOptions = {},
): Promise<T> {
  const f = opts.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15_000);
  let res: Response;
  try {
    res = await f(BUFFER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ query, variables }),
      signal: ctrl.signal,
      cache: "no-store",
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new BufferError("timeout", "Buffer did not respond in time. Try again in a moment.");
    throw new BufferError("network", "Could not reach Buffer. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 || res.status === 403) throw new BufferError("auth", "Buffer rejected the access token. Reconnect your Buffer account.");
  if (res.status === 429) {
    const ra = Number.parseInt(res.headers.get("retry-after") ?? "", 10);
    throw new BufferError("rate_limit", "Buffer rate limit reached.", Number.isFinite(ra) ? ra : 60);
  }

  let body: GqlResponse<T>;
  try {
    body = (await res.json()) as GqlResponse<T>;
  } catch {
    throw new BufferError("api", `Buffer returned an unreadable response (HTTP ${res.status}).`);
  }

  if (body.errors?.length) {
    const codes = body.errors.map((e) => e.extensions?.code ?? "");
    if (codes.some((c) => AUTH_CODES.has(c))) throw new BufferError("auth", "Buffer rejected the access token. Reconnect your Buffer account.");
    if (codes.includes("RATE_LIMIT_EXCEEDED")) {
      const ra = Number.parseInt(res.headers.get("retry-after") ?? "", 10);
      throw new BufferError("rate_limit", "Buffer rate limit reached.", Number.isFinite(ra) ? ra : 60);
    }
    throw new BufferError("api", body.errors[0].message);
  }
  if (!res.ok || !body.data) throw new BufferError("api", `Buffer request failed (HTTP ${res.status}).`);
  return body.data;
}
