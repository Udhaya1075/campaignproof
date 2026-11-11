// Request hardening helpers: same-origin check, in-memory rate limiter, safe URL validation.

/** CSRF defence for cookie-authenticated mutations: the Origin header must be our own origin. */
export function isSameOrigin(origin: string | null, allowed: string[]): boolean {
  if (!origin) return false;
  try {
    const o = new URL(origin).origin;
    return allowed.some((a) => new URL(a).origin === o);
  } catch {
    return false;
  }
}

interface Bucket { count: number; resetAt: number }
const buckets = new Map<string, Bucket>();

/**
 * Fixed-window limiter. State lives in process memory, so on serverless hosts each instance counts
 * separately: it is a brake against bursts and accidents, not a hard global quota.
 */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfter: number } {
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  return b.count <= limit ? { ok: true, retryAfter: 0 } : { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
}

export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * Only public http(s) URLs may be stored as a campaign URL. CampaignProof never fetches these URLs,
 * but validating here keeps loopback/private/credentialed addresses out of the database, so a future
 * link checker cannot be turned against internal services (SSRF).
 */
export function isSafePublicUrl(input: string): boolean {
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  const h = u.hostname.toLowerCase();
  if (!h.includes(".") || h.startsWith("[")) return false;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".lan")) return false;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127 || a === 0 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
  }
  return true;
}
