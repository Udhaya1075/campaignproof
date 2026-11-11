import type { CampaignBrief } from "./types.ts";
import { parseISODate, parseUrl, type YMD } from "./text.ts";

export interface NormalizedBrief {
  name: string;
  productName: string | null;
  approvedPrice: number | null;
  originalPrice: number | null;
  currency: string;
  discountPercent: number | null;
  start: YMD | null;
  end: YMD | null;
  officialUrlRaw: string | null;
  officialUrl: { host: string; path: string; query: string } | null;
  requiredPhrases: string[];
  prohibitedPhrases: string[];
  requiredInfo: string[];
  approvedClaims: string[];
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const list = (v: unknown): string[] =>
  Array.isArray(v)
    ? [...new Set(v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean))]
    : [];

/** Turns whatever the database/UI hands us into a clean brief. Never throws. */
export function normalizeBrief(input: CampaignBrief): NormalizedBrief {
  const urlRaw = typeof input.officialUrl === "string" && input.officialUrl.trim() ? input.officialUrl.trim() : null;
  const discount = num(input.discountPercent);
  return {
    name: typeof input.name === "string" ? input.name.trim() : "",
    productName: typeof input.productName === "string" && input.productName.trim() ? input.productName.trim() : null,
    approvedPrice: num(input.approvedPrice),
    originalPrice: num(input.originalPrice),
    currency: (typeof input.currency === "string" && input.currency.trim() ? input.currency.trim() : "INR").toUpperCase(),
    discountPercent: discount !== null && discount <= 100 ? discount : null,
    start: parseISODate(input.startDate),
    end: parseISODate(input.endDate),
    officialUrlRaw: urlRaw,
    officialUrl: urlRaw ? parseUrl(urlRaw) : null,
    requiredPhrases: list(input.requiredPhrases),
    prohibitedPhrases: list(input.prohibitedPhrases),
    requiredInfo: list(input.requiredInfo),
    approvedClaims: list(input.approvedClaims),
  };
}

const SYMBOL: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

export function formatMoney(value: number, currency: string): string {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  const sym = SYMBOL[currency];
  return sym ? `${sym}${n}` : `${currency} ${n}`;
}

export function formatPercent(v: number): string {
  return `${Number.isInteger(v) ? v : v.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}
