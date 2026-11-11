// Text extraction helpers: money, percentages, dates, URLs and phrases.
// Everything here is pure and deterministic. No network access of any kind.

export interface Span {
  start: number;
  end: number;
  raw: string;
}

const L = "\\p{L}\\p{N}";

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function norm(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Regex that matches a phrase regardless of case, spacing or punctuation between words. */
export function phraseRegex(phrase: string): RegExp | null {
  const tokens = phrase.normalize("NFKC").match(/[\p{L}\p{N}]+/gu);
  if (!tokens || tokens.length === 0) return null;
  const body = tokens.map(escapeRegExp).join(`[^${L}]+`);
  return new RegExp(`(?<![${L}])${body}(?![${L}])`, "giu");
}

export function findPhrase(text: string, phrase: string): Span[] {
  const re = phraseRegex(phrase);
  if (re) {
    return [...text.matchAll(re)].map((m) => ({ start: m.index!, end: m.index! + m[0].length, raw: m[0] }));
  }
  // symbols-only phrase: plain case-insensitive search
  const out: Span[] = [];
  const hay = text.toLowerCase();
  const needle = phrase.toLowerCase().trim();
  if (!needle) return out;
  let i = hay.indexOf(needle);
  while (i !== -1) {
    out.push({ start: i, end: i + needle.length, raw: text.slice(i, i + needle.length) });
    i = hay.indexOf(needle, i + needle.length);
  }
  return out;
}

const STOP = new Set(["the", "a", "an", "and", "or", "of", "on", "in", "for", "to", "with", "at", "is", "are"]);

/** True when the text contains the info statement (exact phrase, or every meaningful word). */
export function containsInfo(text: string, info: string): boolean {
  if (findPhrase(text, info).length > 0) return true;
  const words = norm(info).split(" ").filter((w) => w.length > 2 && !STOP.has(w));
  if (words.length < 2) return false;
  const hay = ` ${norm(text)} `;
  return words.every((w) => hay.includes(` ${w} `));
}

// ---------------------------------------------------------------- money

export interface Amount extends Span {
  value: number;
  currency: string | null;
}

const CURRENCY_ALIASES: Record<string, string> = {
  "₹": "INR", rs: "INR", inr: "INR", rupees: "INR", rupee: "INR",
  $: "USD", usd: "USD", dollars: "USD", dollar: "USD",
  "€": "EUR", eur: "EUR", euros: "EUR", euro: "EUR",
  "£": "GBP", gbp: "GBP", pounds: "GBP",
};

const MULT: Record<string, number> = {
  k: 1e3, lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5, crore: 1e7, crores: 1e7, cr: 1e7, million: 1e6,
};

const NUM = "(\\d+(?:,\\d{2,3})*(?:\\.\\d+)?)";
const PREFIX_RE = new RegExp(
  `(?<![${L}])(₹|\\$|€|£|rs\\.?|inr|usd|eur|gbp)\\s*${NUM}(?:\\s*(k|lakhs?|lacs?|crores?|cr|million)(?![${L}]))?`,
  "giu",
);
const SUFFIX_RE = new RegExp(
  `(?<![${L}.,])${NUM}\\s*(rupees?|inr|usd|dollars?|eur|euros?|gbp|pounds|/-)(?![${L}])`,
  "giu",
);

function parseNum(s: string): number {
  return Number.parseFloat(s.replace(/,/g, ""));
}

export function extractAmounts(text: string): Amount[] {
  const out: Amount[] = [];
  for (const m of text.matchAll(PREFIX_RE)) {
    const sym = m[1].toLowerCase().replace(/\.$/, "");
    const mult = m[3] ? MULT[m[3].toLowerCase()] ?? 1 : 1;
    const value = parseNum(m[2]) * mult;
    if (Number.isFinite(value)) {
      out.push({ start: m.index!, end: m.index! + m[0].length, raw: m[0], value, currency: CURRENCY_ALIASES[sym] ?? null });
    }
  }
  for (const m of text.matchAll(SUFFIX_RE)) {
    const start = m.index!;
    const end = start + m[0].length;
    if (out.some((a) => start < a.end && end > a.start)) continue;
    const value = parseNum(m[1]);
    const unit = m[2].toLowerCase();
    if (Number.isFinite(value)) {
      out.push({ start, end, raw: m[0], value, currency: unit === "/-" ? "INR" : CURRENCY_ALIASES[unit] ?? null });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

const THRESHOLD_BEFORE =
  /(above|over|minimum|min\.?|orders? (?:of|above|over)|worth|up ?to|spend|spending|more than|at least|cashback of|save|saving|savings of|extra|flat|worth)\s*$/i;
const DISCOUNT_AFTER = /^\s*(?:\w+\s+)?(off|cashback|discount|saved?|savings|less)\b/i;

/** Money that looks like a product price (not "orders above ₹500" or "save ₹200"). */
export function extractPrices(text: string): Amount[] {
  return extractAmounts(text).filter((a) => {
    const before = text.slice(Math.max(0, a.start - 28), a.start);
    const after = text.slice(a.end, a.end + 16);
    return !THRESHOLD_BEFORE.test(before) && !DISCOUNT_AFTER.test(after);
  });
}

// ---------------------------------------------------------------- percentages

export interface Percent extends Span {
  value: number;
  isDiscount: boolean;
}

const PERCENT_RE = /(?<![\d.])(\d{1,3}(?:\.\d+)?)\s*(?:%|per\s?cent|pct)/giu;
const PCT_AFTER = /^\s*(?:\w+\s+){0,2}(off|discount|savings?|cashback|sale|less)\b/i;
const PCT_BEFORE = /(save|saving|savings|discount of|discount|up ?to|flat|get|extra|enjoy|additional)\s*$/i;

export function extractPercents(text: string): Percent[] {
  const out: Percent[] = [];
  for (const m of text.matchAll(PERCENT_RE)) {
    const start = m.index!;
    const end = start + m[0].length;
    const after = text.slice(end, end + 28);
    const before = text.slice(Math.max(0, start - 20), start);
    out.push({ start, end, raw: m[0], value: Number.parseFloat(m[1]), isDiscount: PCT_AFTER.test(after) || PCT_BEFORE.test(before) });
  }
  return out;
}

// ---------------------------------------------------------------- dates

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_LOOKUP: Record<string, number> = {};
MONTHS.forEach((m, i) => {
  MONTH_LOOKUP[m.toLowerCase()] = i + 1;
  MONTH_LOOKUP[m.slice(0, 3).toLowerCase()] = i + 1;
});
MONTH_LOOKUP["sept"] = 9;

export type DateStyle = "dmy-name" | "mdy-name" | "iso" | "numeric";

export interface DateMention extends Span {
  month: number;
  day: number;
  year: number | null;
  style: DateStyle;
  shortMonth: boolean;
  role: "start" | "end" | "unknown";
}

const MONTH_ALT = "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec";
const ORD = "(?:st|nd|rd|th)?";
const DMY_NAME = new RegExp(`(?<![\\d${"\\p{L}"}])(\\d{1,2})${ORD}\\s+(?:of\\s+)?(${MONTH_ALT})(?:\\s*,?\\s*(\\d{4}))?(?![\\d\\p{L}])`, "giu");
const MDY_NAME = new RegExp(`(?<![\\p{L}])(${MONTH_ALT})\\.?\\s+(\\d{1,2})${ORD}(?!\\d)(?:\\s*,?\\s*(\\d{4})(?!\\d))?(?![\\p{L}])`, "giu");
const ISO = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g;
const NUMERIC = /(?<![\d.])(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?!\d)/g;

export function isValidDay(year: number | null, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const y = year ?? 2024; // leap year when the year is unknown
  return day <= new Date(Date.UTC(y, month, 0)).getUTCDate();
}

const END_WORDS = /(end|ends|ending|ended|until|till|through|thru|valid|expires?|expiry|expiring|last day|deadline|closes?|closing|by|before|to)\b[^.!?\n]{0,18}$/i;
const START_WORDS = /(start|starts|starting|begin|begins|beginning|from|live|launch(?:es|ing)?|kicks? off|opens?|since)\b[^.!?\n]{0,18}$/i;
const END_AFTER = /^\s*(?:is|are)?\s*(?:the\s+)?(last day|deadline|final day)/i;

function roleFor(text: string, start: number, end: number): "start" | "end" | "unknown" {
  const before = text.slice(Math.max(0, start - 34), start);
  if (/(?:^|\s)(to|until|till|through|thru)\s*$/i.test(before)) return "end";
  if (END_WORDS.test(before)) return "end";
  if (START_WORDS.test(before)) return "start";
  if (END_AFTER.test(text.slice(end, end + 30))) return "end";
  return "unknown";
}

export function extractDates(text: string): DateMention[] {
  const found: Omit<DateMention, "role">[] = [];
  const push = (m: RegExpMatchArray, month: number, day: number, year: number | null, style: DateStyle, monthToken?: string) => {
    if (!isValidDay(year, month, day)) return;
    found.push({
      start: m.index!, end: m.index! + m[0].length, raw: m[0], month, day, year, style,
      shortMonth: monthToken ? monthToken.replace(/\./g, "").length <= 3 : false,
    });
  };
  for (const m of text.matchAll(ISO)) push(m, +m[2], +m[3], +m[1], "iso");
  for (const m of text.matchAll(NUMERIC)) {
    let day = +m[1], month = +m[2];
    if (month > 12 && day <= 12) [day, month] = [month, day]; // MM/DD/YYYY when unambiguous
    push(m, month, day, +m[3], "numeric");
  }
  for (const m of text.matchAll(DMY_NAME)) push(m, MONTH_LOOKUP[m[2].toLowerCase()], +m[1], m[3] ? +m[3] : null, "dmy-name", m[2]);
  for (const m of text.matchAll(MDY_NAME)) push(m, MONTH_LOOKUP[m[1].toLowerCase()], +m[2], m[3] ? +m[3] : null, "mdy-name", m[1]);
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: Omit<DateMention, "role">[] = [];
  for (const f of found) if (!kept.some((k) => f.start < k.end && f.end > k.start)) kept.push(f);
  return kept.map((k) => ({ ...k, role: roleFor(text, k.start, k.end) }));
}

export interface YMD { year: number; month: number; day: number }

export function parseISODate(s: string | null | undefined): YMD | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((s ?? "").trim());
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  return isValidDay(y, mo, d) ? { year: y, month: mo, day: d } : null;
}

export function sameDate(m: DateMention, t: YMD): boolean {
  return m.month === t.month && m.day === t.day && (m.year === null || m.year === t.year);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Format a date using the same style the post used, so a replacement reads naturally. */
export function formatDateLike(m: DateMention, t: YMD): string {
  const name = MONTHS[t.month - 1];
  const mon = m.shortMonth ? name.slice(0, 3) : name;
  const yr = m.year !== null ? ` ${t.year}` : "";
  switch (m.style) {
    case "iso": return `${t.year}-${pad(t.month)}-${pad(t.day)}`;
    case "numeric": return `${pad(t.day)}/${pad(t.month)}/${t.year}`;
    case "mdy-name": return `${mon} ${t.day}${m.year !== null ? `, ${t.year}` : ""}`;
    default: return `${t.day} ${mon}${yr}`;
  }
}

export function formatDateHuman(t: YMD): string {
  return `${t.day} ${MONTHS[t.month - 1]} ${t.year}`;
}

// ---------------------------------------------------------------- URLs

export interface UrlMention extends Span {
  host: string;
  path: string;
  query: string;
}

const TLDS = "com|in|io|co|net|org|app|shop|store|online|ly|me|info|biz|dev|ai|xyz|co\\.in|org\\.in|us|uk|ca|au|site|page|link";
const URL_RE = new RegExp(
  `(?<![@\\w.\\-/])(?:https?:\\/\\/[^\\s<>"'\\)\\]]+|www\\.[^\\s<>"'\\)\\]]+|(?:[a-z0-9-]+\\.)+(?:${TLDS})(?![\\w-])(?:\\/[^\\s<>"'\\)\\]]*)?)`,
  "giu",
);

export const SHORTENERS = new Set(["bit.ly", "buff.ly", "t.co", "tinyurl.com", "ow.ly", "lnkd.in", "goo.gl", "rebrand.ly", "is.gd", "cutt.ly", "fb.me", "amzn.to"]);

export function parseUrl(raw: string): { host: string; path: string; query: string } | null {
  const s = raw.trim().replace(/[.,;:!?]+$/, "");
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (!host.includes(".")) return null;
    const path = decodeURIComponent(u.pathname).replace(/\/+$/, "").toLowerCase();
    const params = [...u.searchParams.entries()].filter(([k]) => !/^utm_/i.test(k) && k.toLowerCase() !== "fbclid");
    params.sort(([a], [b]) => a.localeCompare(b));
    return { host, path, query: params.map(([k, v]) => `${k.toLowerCase()}=${v}`).join("&") };
  } catch {
    return null;
  }
}

export function extractUrls(text: string): UrlMention[] {
  const out: UrlMention[] = [];
  for (const m of text.matchAll(URL_RE)) {
    const raw = m[0].replace(/[.,;:!?]+$/, "");
    const p = parseUrl(raw);
    if (p) out.push({ start: m.index!, end: m.index! + raw.length, raw, ...p });
  }
  return out;
}

export function urlKey(u: { host: string; path: string; query: string }): string {
  return `${u.host}${u.path}${u.query ? `?${u.query}` : ""}`;
}

export function sameUrl(post: { host: string; path: string; query: string }, official: { host: string; path: string; query: string }): boolean {
  if (post.host !== official.host || post.path !== official.path) return false;
  return official.query === "" || post.query === official.query;
}
