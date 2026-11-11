import { describe, expect, it } from "vitest";
import { applyFixes, auditPosts } from "../../src/lib/audit/index.ts";
import type { AuditPost, CampaignBrief } from "../../src/lib/audit/index.ts";

const brief: CampaignBrief = {
  name: "Diwali Sale",
  productName: "Aurora Lamp",
  approvedPrice: 999,
  currency: "INR",
  discountPercent: 20,
  startDate: "2026-11-10",
  endDate: "2026-11-20",
  officialUrl: "example.com/offer",
  requiredPhrases: ["Limited Time Offer"],
  prohibitedPhrases: ["50% discount"],
};

const post = (text: string, extra: Partial<AuditPost> = {}): AuditPost => ({ id: "p1", channel: "Instagram", service: "instagram", text, ...extra });
const run = (text: string, b: CampaignBrief = brief) => auditPosts(b, [post(text)]);
const rules = (text: string, b: CampaignBrief = brief) => run(text, b).findings.map((f) => f.ruleId);

const GOOD = "Aurora Lamp for ₹999, 20% off. Ends November 20. Limited Time Offer. https://example.com/offer";

describe("audit engine: price", () => {
  it("accepts the correct price in several formats", () => {
    for (const t of ["₹999", "Rs. 999", "Rs 999/-", "INR 999", "999 rupees", "₹ 999.00"]) {
      expect(rules(GOOD.replace("₹999", t))).not.toContain("price.mismatch");
    }
  });
  it("flags an incorrect price and gives the approved value", () => {
    const f = run(GOOD.replace("₹999", "₹1,299")).findings.find((x) => x.ruleId === "price.mismatch")!;
    expect(f.severity).toBe("critical");
    expect(f.detected).toBe("₹1,299");
    expect(f.expected).toBe("₹999");
  });
  it("accepts the original price when it is part of the brief", () => {
    const b = { ...brief, originalPrice: 1249 };
    expect(rules(GOOD + " Was ₹1,249", b)).not.toContain("price.mismatch");
  });
  it("ignores thresholds and discount amounts", () => {
    expect(rules(GOOD + " Free delivery on orders above ₹500. Save ₹200 today.")).not.toContain("price.mismatch");
  });
  it("flags a different currency", () => {
    expect(rules(GOOD.replace("₹999", "$999"))).toContain("price.mismatch");
  });
  it("understands lakh and k", () => {
    const b = { ...brief, approvedPrice: 150000 };
    expect(rules(GOOD.replace("₹999", "₹1.5 lakh"), b)).not.toContain("price.mismatch");
    expect(rules(GOOD.replace("₹999", "₹150k"), b)).not.toContain("price.mismatch");
  });
});

describe("audit engine: discount", () => {
  it("accepts the correct discount", () => {
    expect(rules(GOOD)).not.toContain("discount.mismatch");
    expect(rules(GOOD.replace("20% off", "Save 20 percent"))).not.toContain("discount.mismatch");
  });
  it("flags an incorrect discount", () => {
    const f = run(GOOD.replace("20%", "25%")).findings.find((x) => x.ruleId === "discount.mismatch")!;
    expect(f.detected).toBe("25%");
    expect(f.expected).toBe("20%");
    expect(f.severity).toBe("critical");
  });
  it("does not treat unrelated percentages as discounts", () => {
    expect(rules(GOOD + " Made with 100% recycled glass.")).not.toContain("discount.mismatch");
  });
});

describe("audit engine: dates", () => {
  it("accepts the correct end date in different formats", () => {
    for (const d of ["November 20", "20 November", "20th Nov", "Nov 20, 2026", "2026-11-20", "20/11/2026"]) {
      expect(rules(GOOD.replace("November 20", d))).not.toContain("date.end");
    }
  });
  it("flags an incorrect end date and keeps the post's date style", () => {
    const r = run(GOOD.replace("November 20", "November 25"));
    const f = r.findings.find((x) => x.ruleId === "date.end")!;
    expect(f.expected).toBe("20 November 2026");
    expect(applyFixes(GOOD.replace("November 20", "November 25"), r.findings).text).toContain("Ends November 20.");
  });
  it("flags a wrong year", () => {
    expect(rules(GOOD.replace("November 20", "November 20, 2027"))).toContain("date.end");
  });
  it("checks the start date too", () => {
    expect(rules(GOOD + " Starts November 12.")).toContain("date.start");
    expect(rules(GOOD + " Starts November 10.")).not.toContain("date.start");
  });
  it("does not choke on invalid calendar dates", () => {
    expect(() => run("Ends February 31")).not.toThrow();
  });
});

describe("audit engine: URL", () => {
  it("accepts the official URL with or without protocol, www, slash or utm", () => {
    for (const u of ["example.com/offer", "https://example.com/offer", "www.example.com/offer/", "https://example.com/offer?utm_source=ig"]) {
      expect(rules(GOOD.replace("https://example.com/offer", u))).not.toContain("url.mismatch");
    }
  });
  it("flags a different domain", () => {
    const f = run(GOOD.replace("example.com/offer", "exmaple.com/offer")).findings.find((x) => x.ruleId === "url.mismatch")!;
    expect(f.severity).toBe("high");
    expect(f.expected).toBe("example.com/offer");
  });
  it("flags another page on the official domain with lower severity", () => {
    const f = run(GOOD.replace("/offer", "/sale")).findings.find((x) => x.ruleId === "url.other-page")!;
    expect(f.severity).toBe("medium");
  });
  it("flags a missing URL", () => {
    expect(rules("Aurora Lamp ₹999, 20% off. Ends November 20. Limited Time Offer.")).toContain("url.missing");
  });
  it("does not mistake an email address for a URL", () => {
    expect(rules(GOOD + " Questions: help@other.com")).not.toContain("url.mismatch");
  });
  it("notes shortened links instead of following them", () => {
    expect(rules(GOOD.replace("https://example.com/offer", "https://bit.ly/abc123"))).toContain("url.shortened");
  });
});

describe("audit engine: phrases and info", () => {
  it("flags a missing required phrase (case-insensitive match otherwise)", () => {
    expect(rules(GOOD.replace("Limited Time Offer", "limited-time offer"))).not.toContain("phrase.required");
    expect(rules(GOOD.replace("Limited Time Offer", "Hurry"))).toContain("phrase.required");
  });
  it("flags a prohibited phrase with its exact location", () => {
    const text = GOOD + " Also 50% discount on everything!";
    const f = run(text).findings.find((x) => x.ruleId === "phrase.prohibited")!;
    expect(f.severity).toBe("critical");
    expect(text.slice(f.start!, f.end!)).toBe("50% discount");
  });
  it("does not match a prohibited phrase inside a longer number", () => {
    expect(rules(GOOD + " 150% discount")).not.toContain("phrase.prohibited");
  });
  it("flags missing mandatory information", () => {
    const b = { ...brief, requiredInfo: ["Free shipping across India"] };
    expect(rules(GOOD, b)).toContain("info.required");
    expect(rules(GOOD + " We offer free shipping across India.", b)).not.toContain("info.required");
  });
});

describe("audit engine: claims", () => {
  it("flags unsupported claims and respects approved claims", () => {
    expect(rules(GOOD + " Guaranteed best price!")).toContain("claim.unsupported");
    const b = { ...brief, approvedClaims: ["Free returns"] };
    expect(rules(GOOD + " Free returns.", b)).not.toContain("claim.unsupported");
    expect(rules(GOOD + " Free returns.")).toContain("claim.unsupported");
  });
});

describe("audit engine: cross-channel consistency", () => {
  const open: CampaignBrief = { name: "Spring Launch", productName: "Aurora Lamp" };
  const posts: AuditPost[] = [
    { id: "a", channel: "Instagram", text: "Aurora Lamp: 20% off, ends November 20." },
    { id: "b", channel: "Facebook", text: "Aurora Lamp: 20% off, ends November 20." },
    { id: "c", channel: "LinkedIn", text: "Aurora Lamp: 25% off, ends November 25." },
  ];
  it("flags the minority value when the brief is silent", () => {
    const r = auditPosts(open, posts);
    const c = r.posts.find((p) => p.postId === "c")!;
    expect(c.findings.map((f) => f.ruleId).sort()).toEqual(["cross.date", "cross.discount"]);
    expect(c.findings.find((f) => f.ruleId === "cross.discount")!.expected).toBe("20%");
    expect(r.posts.find((p) => p.postId === "a")!.passed).toBe(true);
  });
  it("does not duplicate findings when the brief already defines the value", () => {
    const r = auditPosts({ ...open, discountPercent: 20, endDate: "2026-11-20" }, posts);
    expect(r.findings.some((f) => f.category === "cross_channel")).toBe(false);
  });
  it("reports ties without picking a winner", () => {
    const r = auditPosts(open, posts.slice(1).map((p, i) => ({ ...p, text: i ? "Aurora Lamp: 25% off" : "Aurora Lamp: 20% off" })));
    const f = r.findings.filter((x) => x.ruleId === "cross.discount");
    expect(f).toHaveLength(2);
    expect(f[0].expected).toBeNull();
  });
});

describe("audit engine: robustness", () => {
  it("handles an empty brief: optional fields never cause findings", () => {
    const r = auditPosts({ name: "Bare" }, [post("Bare campaign launching soon")]);
    expect(r.findings).toEqual([]);
    expect(r.passedPosts).toBe(1);
  });
  it("handles empty and invalid inputs without throwing", () => {
    expect(() => auditPosts({ name: "" }, [])).not.toThrow();
    expect(auditPosts(brief, []).totalPosts).toBe(0);
    // @ts-expect-error deliberately invalid
    expect(() => auditPosts(null, null)).not.toThrow();
    // @ts-expect-error deliberately invalid
    expect(() => auditPosts({ ...brief, approvedPrice: "abc", endDate: "not-a-date", requiredPhrases: [1, null] }, [post(GOOD)])).not.toThrow();
  });
  it("reports an empty post instead of piling on findings", () => {
    const r = run("   ");
    expect(r.findings.map((f) => f.ruleId)).toEqual(["post.empty"]);
  });
  it("counts severities and pass/fail per post", () => {
    const r = auditPosts(brief, [post(GOOD, { id: "ok" }), post("Aurora Lamp ₹500 only", { id: "bad" })]);
    expect(r.passedPosts).toBe(1);
    expect(r.failedPosts).toBe(1);
    expect(r.counts.critical).toBeGreaterThanOrEqual(1);
  });
  it("the reference post passes cleanly", () => {
    expect(run(GOOD).findings).toEqual([]);
  });
});

describe("applyFixes", () => {
  it("fixes price, discount, URL and appends required phrase", () => {
    const text = "Aurora Lamp now ₹1,299 with 25% off. Ends November 20. exmaple.com/offer";
    const r = auditPosts(brief, [post(text)]);
    const fixed = applyFixes(text, r.findings).text;
    expect(fixed).toContain("₹999");
    expect(fixed).toContain("20% off");
    expect(fixed).toContain("example.com/offer");
    expect(fixed).toContain("Limited Time Offer");
    expect(auditPosts(brief, [post(fixed)]).findings).toEqual([]);
  });
  it("removes prohibited phrases cleanly", () => {
    const text = GOOD + " Enjoy 50% discount today.";
    const r = auditPosts(brief, [post(text)]);
    const fixed = applyFixes(text, r.findings).text;
    expect(fixed).not.toContain("50% discount");
    expect(fixed).not.toMatch(/ {2}/);
  });
});
