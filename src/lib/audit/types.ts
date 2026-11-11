export type Severity = "critical" | "high" | "medium" | "low";

export type Category =
  | "price"
  | "discount"
  | "date"
  | "url"
  | "required_phrase"
  | "required_info"
  | "prohibited_phrase"
  | "unsupported_claim"
  | "cross_channel"
  | "messaging";

/** The approved source of truth for a campaign. Every field except `name` is optional. */
export interface CampaignBrief {
  name: string;
  productName?: string | null;
  approvedPrice?: number | null;
  originalPrice?: number | null;
  /** ISO 4217-ish code: INR, USD, EUR, GBP. Defaults to INR. */
  currency?: string | null;
  discountPercent?: number | null;
  /** YYYY-MM-DD */
  startDate?: string | null;
  /** YYYY-MM-DD */
  endDate?: string | null;
  officialUrl?: string | null;
  requiredPhrases?: string[];
  prohibitedPhrases?: string[];
  requiredInfo?: string[];
  approvedClaims?: string[];
}

export interface AuditPost {
  id: string;
  channel?: string | null;
  service?: string | null;
  text: string;
}

export interface Finding {
  id: string;
  postId: string;
  channel: string;
  ruleId: string;
  category: Category;
  severity: Severity;
  /** What the post says (null when something is missing). */
  detected: string | null;
  /** What the approved brief says. */
  expected: string | null;
  /** Character range of the problem inside the post text, when it can be located. */
  start: number | null;
  end: number | null;
  excerpt: string | null;
  explanation: string;
  suggestion: string;
  /**
   * Machine-applicable fix.
   * - start/end set + replacement set: replace that range (empty string deletes it).
   * - start/end null + replacement set: append the replacement on a new line.
   * - replacement null: needs a human decision.
   */
  replacement: string | null;
}

export interface PostResult {
  postId: string;
  channel: string;
  passed: boolean;
  findings: Finding[];
}

export interface AuditResult {
  totalPosts: number;
  passedPosts: number;
  failedPosts: number;
  counts: Record<Severity, number>;
  findings: Finding[];
  posts: PostResult[];
}

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];
