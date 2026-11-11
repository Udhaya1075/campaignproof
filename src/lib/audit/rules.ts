import type { AuditPost, Category, Finding, Severity } from "./types.ts";
import type { NormalizedBrief } from "./brief.ts";
import { formatMoney, formatPercent } from "./brief.ts";
import {
  containsInfo, extractDates, extractPercents, extractPrices, extractUrls, findPhrase, formatDateHuman,
  formatDateLike, norm, sameDate, sameUrl, SHORTENERS,
} from "./text.ts";

type Draft = Omit<Finding, "id" | "postId" | "channel">;

export function channelLabel(p: AuditPost): string {
  return (p.channel || p.service || "Unknown channel").toString();
}

function excerpt(text: string, start: number, end: number): string {
  const a = Math.max(0, start - 24);
  const b = Math.min(text.length, end + 24);
  return `${a > 0 ? "…" : ""}${text.slice(a, b)}${b < text.length ? "…" : ""}`.replace(/\s+/g, " ");
}

function draft(
  text: string, ruleId: string, category: Category, severity: Severity,
  d: { detected: string | null; expected: string | null; start?: number | null; end?: number | null; explanation: string; suggestion: string; replacement?: string | null },
): Draft {
  const start = d.start ?? null;
  const end = d.end ?? null;
  return {
    ruleId, category, severity, detected: d.detected, expected: d.expected, start, end,
    excerpt: start !== null && end !== null ? excerpt(text, start, end) : null,
    explanation: d.explanation, suggestion: d.suggestion, replacement: d.replacement ?? null,
  };
}

// ------------------------------------------------------------------ price
export function priceRule(post: AuditPost, b: NormalizedBrief): Draft[] {
  const allowed = [b.approvedPrice, b.originalPrice].filter((n): n is number => n !== null);
  if (allowed.length === 0) return [];
  const expectedValue = b.approvedPrice ?? b.originalPrice!;
  const expected = formatMoney(expectedValue, b.currency);
  const out: Draft[] = [];
  for (const a of extractPrices(post.text)) {
    const valueOk = allowed.some((v) => Math.abs(v - a.value) < 0.005);
    const currencyOk = a.currency === null || a.currency === b.currency;
    if (valueOk && currencyOk) continue;
    out.push(draft(post.text, "price.mismatch", "price", "critical", {
      detected: a.raw.trim(), expected, start: a.start, end: a.end,
      explanation: valueOk
        ? `The amount ${a.raw.trim()} is in a different currency from the campaign (${b.currency}).`
        : `The post quotes ${a.raw.trim()} but the approved price is ${expected}${b.originalPrice !== null && b.approvedPrice !== null ? ` (original price ${formatMoney(b.originalPrice, b.currency)})` : ""}.`,
      suggestion: `Replace ${a.raw.trim()} with ${expected}.`,
      replacement: expected,
    }));
  }
  return out;
}

// ------------------------------------------------------------------ discount
export function discountRule(post: AuditPost, b: NormalizedBrief): Draft[] {
  if (b.discountPercent === null) return [];
  const expected = formatPercent(b.discountPercent);
  const out: Draft[] = [];
  for (const p of extractPercents(post.text)) {
    if (!p.isDiscount || Math.abs(p.value - b.discountPercent) < 0.001) continue;
    out.push(draft(post.text, "discount.mismatch", "discount", "critical", {
      detected: p.raw, expected, start: p.start, end: p.end,
      explanation: `The post advertises ${p.raw} off, but the approved discount is ${expected}.`,
      suggestion: `Change ${p.raw} to ${expected}.`,
      replacement: expected,
    }));
  }
  return out;
}

// ------------------------------------------------------------------ dates
export function dateRule(post: AuditPost, b: NormalizedBrief): Draft[] {
  if (!b.start && !b.end) return [];
  const out: Draft[] = [];
  for (const m of extractDates(post.text)) {
    const startOk = b.start ? sameDate(m, b.start) : false;
    const endOk = b.end ? sameDate(m, b.end) : false;
    if (m.role === "end" && b.end) {
      if (endOk) continue;
      const exp = formatDateLike(m, b.end);
      out.push(draft(post.text, "date.end", "date", "high", {
        detected: m.raw, expected: formatDateHuman(b.end), start: m.start, end: m.end,
        explanation: `The post gives ${m.raw} as the end of the campaign, but the approved end date is ${formatDateHuman(b.end)}.`,
        suggestion: `Change ${m.raw} to ${exp}.`, replacement: exp,
      }));
    } else if (m.role === "start" && b.start) {
      if (startOk) continue;
      const exp = formatDateLike(m, b.start);
      out.push(draft(post.text, "date.start", "date", "high", {
        detected: m.raw, expected: formatDateHuman(b.start), start: m.start, end: m.end,
        explanation: `The post gives ${m.raw} as the start of the campaign, but the approved start date is ${formatDateHuman(b.start)}.`,
        suggestion: `Change ${m.raw} to ${exp}.`, replacement: exp,
      }));
    } else if (m.role === "unknown") {
      if (startOk || endOk) continue;
      const ref = b.end ?? b.start!;
      out.push(draft(post.text, "date.unclear", "date", "medium", {
        detected: m.raw, expected: `${b.start ? `start ${formatDateHuman(b.start)}` : ""}${b.start && b.end ? ", " : ""}${b.end ? `end ${formatDateHuman(b.end)}` : ""}`,
        start: m.start, end: m.end,
        explanation: `The date ${m.raw} does not match the campaign dates (${formatDateHuman(ref)} is approved), and the post does not say what it refers to.`,
        suggestion: "Check whether this date is correct, or remove it if it is not part of the campaign.",
      }));
    }
  }
  return out;
}

// ------------------------------------------------------------------ url
const LOW_PRIORITY_URL_SERVICES = new Set(["instagram", "tiktok"]);

export function urlRule(post: AuditPost, b: NormalizedBrief): Draft[] {
  if (!b.officialUrl || !b.officialUrlRaw) return [];
  const urls = extractUrls(post.text);
  const out: Draft[] = [];
  let matched = false;
  let flagged = false;
  for (const u of urls) {
    if (SHORTENERS.has(u.host)) {
      flagged = true;
      out.push(draft(post.text, "url.shortened", "url", "low", {
        detected: u.raw, expected: b.officialUrlRaw, start: u.start, end: u.end,
        explanation: `${u.raw} is a shortened link. CampaignProof never follows links, so it cannot confirm where it leads.`,
        suggestion: "Confirm manually that this link resolves to the official campaign URL.",
      }));
      continue;
    }
    if (sameUrl(u, b.officialUrl)) { matched = true; continue; }
    flagged = true;
    const sameHost = u.host === b.officialUrl.host;
    out.push(draft(post.text, sameHost ? "url.other-page" : "url.mismatch", "url", sameHost ? "medium" : "high", {
      detected: u.raw, expected: b.officialUrlRaw, start: u.start, end: u.end,
      explanation: sameHost
        ? `${u.raw} is on the official site but is not the approved campaign page (${b.officialUrlRaw}).`
        : `${u.raw} is not the official campaign URL (${b.officialUrlRaw}).`,
      suggestion: `Use ${b.officialUrlRaw}.`,
      replacement: b.officialUrlRaw,
    }));
  }
  if (!matched && !flagged) {
    const soft = LOW_PRIORITY_URL_SERVICES.has((post.service ?? "").toLowerCase());
    out.push(draft(post.text, "url.missing", "url", soft ? "low" : "medium", {
      detected: null, expected: b.officialUrlRaw,
      explanation: `The post does not include the official campaign URL (${b.officialUrlRaw}).`,
      suggestion: soft ? "Add the URL, or mention that the link is in the bio if the network does not allow links." : `Add ${b.officialUrlRaw} to the post.`,
      replacement: b.officialUrlRaw,
    }));
  }
  return out;
}

// ------------------------------------------------------------------ phrases
export function requiredPhraseRule(post: AuditPost, b: NormalizedBrief): Draft[] {
  return b.requiredPhrases
    .filter((p) => findPhrase(post.text, p).length === 0)
    .map((p) => draft(post.text, "phrase.required", "required_phrase", "high", {
      detected: null, expected: p,
      explanation: `The required phrase "${p}" is missing from this post.`,
      suggestion: `Add "${p}" to the post.`, replacement: p,
    }));
}

export function prohibitedPhraseRule(post: AuditPost, b: NormalizedBrief): Draft[] {
  const out: Draft[] = [];
  for (const p of b.prohibitedPhrases) {
    for (const hit of findPhrase(post.text, p)) {
      out.push(draft(post.text, "phrase.prohibited", "prohibited_phrase", "critical", {
        detected: hit.raw, expected: null, start: hit.start, end: hit.end,
        explanation: `The post contains "${hit.raw}", which is on the campaign's prohibited list ("${p}").`,
        suggestion: `Remove "${hit.raw}" or rewrite the sentence using approved information.`,
        replacement: "",
      }));
    }
  }
  return out;
}

export function requiredInfoRule(post: AuditPost, b: NormalizedBrief): Draft[] {
  return b.requiredInfo
    .filter((info) => !containsInfo(post.text, info))
    .map((info) => draft(post.text, "info.required", "required_info", "medium", {
      detected: null, expected: info,
      explanation: `Mandatory campaign information is missing: "${info}".`,
      suggestion: `Add this information to the post: "${info}".`, replacement: info,
    }));
}

// ------------------------------------------------------------------ claims
const CLAIMS: { re: RegExp; severity: Severity; why: string }[] = [
  { re: /\b(?:100\s*%\s*)?guarantee[sd]?\b/giu, severity: "high", why: "guarantees are legally sensitive" },
  { re: /\brisk[- ]free\b|\b(?:no|zero)[- ]risk\b/giu, severity: "high", why: "risk-free claims need substantiation" },
  { re: /\b(?:miracle|cures?|cured|instant results?)\b/giu, severity: "high", why: "health and results claims need substantiation" },
  { re: /\b(?:best|cheapest|lowest|greatest)\s+(?:price|prices|deal|offer|in\s+(?:the\s+)?(?:world|class|india))\b/giu, severity: "medium", why: "superlatives need proof" },
  { re: /(?:#\s?1|\bno\.?\s?1\b|\bnumber one\b|\bworld'?s best\b)/giu, severity: "medium", why: "ranking claims need proof" },
  { re: /\b100\s*%\s*(?:free|safe|natural|genuine|authentic|effective|secure)\b/giu, severity: "medium", why: "absolute claims need proof" },
  { re: /\bfree\b/giu, severity: "medium", why: '"free" offers must be part of the approved campaign' },
];

export function claimRule(post: AuditPost, b: NormalizedBrief): Draft[] {
  const approvedText = [...b.approvedClaims, ...b.requiredPhrases, ...b.requiredInfo].map((s) => s.toLowerCase()).join(" | ");
  const out: Draft[] = [];
  const seen: [number, number][] = [];
  for (const c of CLAIMS) {
    for (const m of post.text.matchAll(c.re)) {
      const start = m.index!;
      const end = start + m[0].length;
      if (seen.some(([s, e]) => start < e && end > s)) continue;
      const word = m[0].toLowerCase().trim();
      const key = word.replace(/^100\s*%\s*/, "");
      if (approvedText.includes(word) || approvedText.includes(key)) continue;
      seen.push([start, end]);
      out.push(draft(post.text, "claim.unsupported", "unsupported_claim", c.severity, {
        detected: m[0], expected: null, start, end,
        explanation: `"${m[0]}" is a promotional claim that is not in the approved brief (${c.why}).`,
        suggestion: `Remove it, or add it to the brief's approved claims if it is true and allowed.`,
      }));
    }
  }
  return out;
}

// ------------------------------------------------------------------ messaging
export function messagingRule(post: AuditPost, b: NormalizedBrief): Draft[] {
  if (!post.text.trim()) {
    return [draft(post.text, "post.empty", "messaging", "high", {
      detected: null, expected: null,
      explanation: "This post has no text, so it cannot be checked against the brief.",
      suggestion: "Add the campaign copy, or remove the post from the audit.",
    })];
  }
  const hay = ` ${norm(post.text)} `;
  const covers = (s: string | null, ratio: number) => {
    if (!s) return false;
    const words = norm(s).split(" ").filter((w) => w.length > 2);
    if (words.length === 0) return false;
    return words.filter((w) => hay.includes(` ${w} `)).length / words.length >= ratio;
  };
  const urlHit = b.officialUrl ? extractUrls(post.text).some((u) => sameUrl(u, b.officialUrl!)) : false;
  if (covers(b.productName, 1) || covers(b.name, 0.6) || urlHit) return [];
  if (!b.productName && !b.name) return [];
  return [draft(post.text, "messaging.off-topic", "messaging", "low", {
    detected: null, expected: b.productName ?? b.name,
    explanation: `The post does not mention the campaign ("${b.name}") or the product${b.productName ? ` ("${b.productName}")` : ""}, so it may not belong to this campaign.`,
    suggestion: "Confirm this post belongs to the campaign, or mention the campaign or product by name.",
  })];
}

export const POST_RULES = [
  messagingRule, priceRule, discountRule, dateRule, urlRule,
  requiredPhraseRule, prohibitedPhraseRule, requiredInfoRule, claimRule,
];
