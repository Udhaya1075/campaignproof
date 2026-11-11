import { describe, expect, it } from "vitest";
import { campaignSchema, correctionApplySchema, importPostsSchema } from "../../src/lib/schemas.ts";

describe("campaign schema", () => {
  it("accepts a minimal campaign: every brief field is optional", () => {
    const r = campaignSchema.parse({ name: "Spring" });
    expect(r.requiredPhrases).toEqual([]);
    expect(r.approvedPrice ?? null).toBeNull();
    expect(r.currency).toBe("INR");
  });
  it("turns blank form fields into null", () => {
    const r = campaignSchema.parse({ name: "x", approvedPrice: "", discountPercent: "", startDate: "", officialUrl: "  ", productName: "" });
    expect(r.approvedPrice).toBeNull();
    expect(r.officialUrl).toBeNull();
    expect(r.startDate).toBeNull();
  });
  it("rejects invalid input", () => {
    expect(() => campaignSchema.parse({ name: "" })).toThrow();
    expect(() => campaignSchema.parse({ name: "x", discountPercent: 140 })).toThrow();
    expect(() => campaignSchema.parse({ name: "x", approvedPrice: -5 })).toThrow();
    expect(() => campaignSchema.parse({ name: "x", startDate: "2026-12-01", endDate: "2026-11-01" })).toThrow();
    expect(() => campaignSchema.parse({ name: "x", endDate: "20/11/2026" })).toThrow();
    expect(() => campaignSchema.parse({ name: "x", officialUrl: "http://169.254.169.254/" })).toThrow();
  });
});

describe("other request schemas", () => {
  it("requires explicit confirmation to apply a correction", () => {
    expect(() => correctionApplySchema.parse({})).toThrow();
    expect(() => correctionApplySchema.parse({ confirm: "yes" })).toThrow();
    expect(correctionApplySchema.parse({ confirm: true }).confirm).toBe(true);
  });
  it("limits imported posts", () => {
    expect(() => importPostsSchema.parse({ posts: [] })).toThrow();
    expect(() => importPostsSchema.parse({ posts: Array.from({ length: 101 }, (_, i) => ({ id: String(i), text: "x" })) })).toThrow();
  });
});
