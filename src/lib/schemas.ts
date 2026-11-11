import { z } from "zod";
import { isSafePublicUrl } from "./security.ts";

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const optText = (max: number) => z.preprocess(blank, z.string().trim().max(max).nullable().optional());
const optNum = (max: number) => z.preprocess((v) => (v === "" || v === undefined ? null : v), z.number().finite().min(0).max(max).nullable().optional());
const optDate = z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").nullable().optional());
const strList = (max = 50) => z.array(z.string().trim().min(1).max(300)).max(max).default([]);

export const CAMPAIGN_STATUSES = ["draft", "active", "completed", "archived"] as const;

export const campaignSchema = z
  .object({
    name: z.string().trim().min(1, "Give the campaign a name").max(120),
    description: optText(2000),
    status: z.enum(CAMPAIGN_STATUSES).default("draft"),
    productName: optText(160),
    approvedPrice: optNum(1e9),
    originalPrice: optNum(1e9),
    currency: z.enum(["INR", "USD", "EUR", "GBP"]).default("INR"),
    discountPercent: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.number().min(0).max(100).nullable().optional()),
    startDate: optDate,
    endDate: optDate,
    officialUrl: z.preprocess(blank, z.string().trim().max(500).nullable().optional().refine((v) => !v || isSafePublicUrl(v), "Enter a public web address such as example.com/offer")),
    additionalRules: optText(4000),
    requiredPhrases: strList(),
    prohibitedPhrases: strList(),
    requiredInfo: strList(),
    approvedClaims: strList(),
    channels: z.array(z.object({ channelId: z.string().min(1).max(100), channelName: z.string().max(200).nullable().optional(), service: z.string().max(50).nullable().optional() })).max(50).default([]),
  })
  .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, { path: ["endDate"], message: "End date must be on or after the start date" });

export type CampaignInput = z.infer<typeof campaignSchema>;

export const importPostsSchema = z.object({
  posts: z.array(z.object({
    id: z.string().min(1).max(100),
    text: z.string().max(10000),
    status: z.string().max(40).nullable().optional(),
    dueAt: z.string().max(40).nullable().optional(),
    channelId: z.string().max(100).nullable().optional(),
    channelName: z.string().max(200).nullable().optional(),
    service: z.string().max(50).nullable().optional(),
  })).min(1).max(100),
});

export const postsQuerySchema = z.object({
  channelIds: z.string().optional().transform((v) => (v ? v.split(",").filter(Boolean).slice(0, 50) : [])),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  status: z.enum(["scheduled", "draft"]).default("scheduled"),
  after: z.string().max(500).optional(),
});

export const correctionCreateSchema = z.object({ campaignPostId: z.string().uuid(), runId: z.string().uuid().nullable().optional(), correctedText: z.string().min(1).max(10000) });
export const correctionPatchSchema = z.object({ status: z.enum(["draft", "approved", "rejected"]).optional(), correctedText: z.string().min(1).max(10000).optional() })
  .refine((v) => v.status !== undefined || v.correctedText !== undefined, "Nothing to update");
export const correctionApplySchema = z.object({ confirm: z.literal(true) });
