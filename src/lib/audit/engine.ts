import type { AuditPost, AuditResult, CampaignBrief, Category, Finding, PostResult, Severity } from "./types.ts";
import { SEVERITY_ORDER } from "./types.ts";
import { normalizeBrief, type NormalizedBrief } from "./brief.ts";
import { channelLabel, POST_RULES } from "./rules.ts";
import { extractDates, extractPercents, extractPrices, extractUrls, SHORTENERS, urlKey } from "./text.ts";

const SEV_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

interface Mention { key: string; display: string; start: number; end: number }

/** Values each post states, used to spot conflicts when the brief has no approved value. */
function factsFor(post: AuditPost, b: NormalizedBrief) {
  const prices: Mention[] = b.approvedPrice === null && b.originalPrice === null
    ? extractPrices(post.text).map((a) => ({ key: `${a.currency ?? ""}${a.value}`, display: a.raw.trim(), start: a.start, end: a.end }))
    : [];
  const discounts: Mention[] = b.discountPercent === null
    ? extractPercents(post.text).filter((p) => p.isDiscount).map((p) => ({ key: String(p.value), display: p.raw, start: p.start, end: p.end }))
    : [];
  const endDates: Mention[] = !b.end
    ? extractDates(post.text).filter((d) => d.role === "end").map((d) => ({ key: `${d.month}-${d.day}`, display: d.raw, start: d.start, end: d.end }))
    : [];
  const urls: Mention[] = !b.officialUrl
    ? extractUrls(post.text).filter((u) => !SHORTENERS.has(u.host)).map((u) => ({ key: urlKey(u), display: u.raw, start: u.start, end: u.end }))
    : [];
  return { price: prices, discount: discounts, date: endDates, url: urls };
}

const CROSS: { field: "price" | "discount" | "date" | "url"; label: string; severity: Severity }[] = [
  { field: "price", label: "price", severity: "high" },
  { field: "discount", label: "discount", severity: "high" },
  { field: "date", label: "end date", severity: "medium" },
  { field: "url", label: "URL", severity: "medium" },
];

function crossChannel(posts: AuditPost[], b: NormalizedBrief): Map<string, Omit<Finding, "id" | "postId" | "channel">[]> {
  const out = new Map<string, Omit<Finding, "id" | "postId" | "channel">[]>();
  if (posts.length < 2) return out;
  const facts = posts.map((p) => ({ post: p, f: factsFor(p, b) }));
  for (const { field, label, severity } of CROSS) {
    const perKey = new Map<string, { display: string; postIds: Set<string> }>();
    for (const { post, f } of facts) {
      for (const m of f[field]) {
        const e = perKey.get(m.key) ?? { display: m.display, postIds: new Set<string>() };
        e.postIds.add(post.id);
        perKey.set(m.key, e);
      }
    }
    if (perKey.size < 2) continue;
    const ranked = [...perKey.entries()].sort((a, c) => c[1].postIds.size - a[1].postIds.size);
    const unique = ranked[0][1].postIds.size > ranked[1][1].postIds.size;
    const majority = unique ? ranked[0] : null;
    const summary = ranked.map(([, v]) => `"${v.display}" (${v.postIds.size} post${v.postIds.size === 1 ? "" : "s"})`).join(" vs ");
    for (const { post, f } of facts) {
      for (const m of f[field]) {
        if (majority && m.key === majority[0]) continue;
        const list = out.get(post.id) ?? [];
        list.push({
          ruleId: `cross.${field}`, category: "cross_channel", severity,
          detected: m.display, expected: majority ? majority[1].display : null,
          start: m.start, end: m.end,
          excerpt: post.text.slice(Math.max(0, m.start - 24), m.end + 24).replace(/\s+/g, " "),
          explanation: `Channels disagree on the ${label}: ${summary}.${majority ? ` Most posts use "${majority[1].display}".` : " There is no clear majority."}`,
          suggestion: majority
            ? `If "${majority[1].display}" is correct, use it here and add it to the campaign brief so future audits can enforce it.`
            : `Decide which ${label} is correct, add it to the campaign brief, and update the other posts.`,
          replacement: null,
        });
        out.set(post.id, list);
      }
    }
  }
  return out;
}

/** Audit posts against an approved brief. Pure, deterministic, never throws on bad input. */
export function auditPosts(briefInput: CampaignBrief, postsInput: AuditPost[]): AuditResult {
  const brief = normalizeBrief(briefInput ?? ({ name: "" } as CampaignBrief));
  const posts: AuditPost[] = (Array.isArray(postsInput) ? postsInput : [])
    .filter((p) => p && typeof p.id === "string")
    .map((p) => ({ ...p, text: typeof p.text === "string" ? p.text : "" }));

  const cross = crossChannel(posts.filter((p) => p.text.trim()), brief);
  const results: PostResult[] = [];
  const all: Finding[] = [];

  for (const post of posts) {
    const channel = channelLabel(post);
    const empty = !post.text.trim();
    const drafts = empty
      ? POST_RULES[0](post, brief)
      : [...POST_RULES.flatMap((rule) => rule(post, brief)), ...(cross.get(post.id) ?? [])];
    drafts.sort((a, c) => SEV_RANK[a.severity] - SEV_RANK[c.severity] || (a.start ?? 1e9) - (c.start ?? 1e9));
    const findings: Finding[] = drafts.map((d, i) => ({ ...d, id: `${post.id}:${d.ruleId}:${i}`, postId: post.id, channel }));
    results.push({ postId: post.id, channel, passed: findings.length === 0, findings });
    all.push(...findings);
  }

  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of all) counts[f.severity]++;
  const passed = results.filter((r) => r.passed).length;
  return { totalPosts: results.length, passedPosts: passed, failedPosts: results.length - passed, counts, findings: all, posts: results };
}

/**
 * Apply every machine-applicable suggestion to a post's text. Overlapping range fixes are skipped
 * (the first, most severe one wins). Returns the new text and which findings were applied.
 */
export function applyFixes(text: string, findings: Pick<Finding, "id" | "start" | "end" | "replacement">[]): { text: string; applied: string[] } {
  const applied: string[] = [];
  const ranges = findings
    .filter((f) => f.replacement !== null && f.start !== null && f.end !== null)
    .map((f) => ({ id: f.id, start: f.start as number, end: f.end as number, text: f.replacement as string }))
    .sort((a, b) => a.start - b.start);
  const kept: typeof ranges = [];
  for (const r of ranges) if (!kept.some((k) => r.start < k.end && r.end > k.start)) kept.push(r);

  let out = text;
  for (const r of [...kept].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, r.start) + r.text + out.slice(r.end);
    applied.push(r.id);
  }
  if (kept.some((r) => r.text === "")) out = out.replace(/[ \t]{2,}/g, " ").replace(/ +([,.;:!?])/g, "$1").replace(/[ \t]+\n/g, "\n");

  const appends = new Set<string>();
  for (const f of findings) {
    if (f.replacement && f.start === null && f.end === null && !appends.has(f.replacement)) {
      if (!out.toLowerCase().includes(f.replacement.toLowerCase())) {
        appends.add(f.replacement);
        applied.push(f.id);
      }
    }
  }
  if (appends.size) out = `${out.replace(/\s+$/, "")}\n${[...appends].join("\n")}`;
  return { text: out.trim(), applied };
}

export function emptyCounts(): Record<Severity, number> {
  return Object.fromEntries(SEVERITY_ORDER.map((s) => [s, 0])) as Record<Severity, number>;
}

export type { Category };
