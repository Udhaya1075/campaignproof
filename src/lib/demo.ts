import type { SupabaseClient } from "@supabase/supabase-js";
import { saveCampaign } from "./campaigns.ts";
import { campaignSchema } from "./schemas.ts";

/** Sample data, always flagged is_demo so it is never confused with real Buffer data. */
export async function createDemoCampaign(db: SupabaseClient, userId: string): Promise<string> {
  const input = campaignSchema.parse({
    name: "Diwali Sale (demo)", status: "active", productName: "Aurora Lamp", description: "Sample campaign with deliberate errors. Not connected to Buffer.",
    approvedPrice: 999, originalPrice: 1249, currency: "INR", discountPercent: 20, startDate: "2026-11-10", endDate: "2026-11-20",
    officialUrl: "example.com/offer", requiredPhrases: ["Limited Time Offer"], prohibitedPhrases: ["50% discount"],
    requiredInfo: [], approvedClaims: [],
    channels: [{ channelId: "demo-ig", channelName: "Demo Instagram", service: "instagram" }, { channelId: "demo-fb", channelName: "Demo Facebook", service: "facebook" }, { channelId: "demo-li", channelName: "Demo LinkedIn", service: "linkedin" }, { channelId: "demo-x", channelName: "Demo X", service: "twitter" }],
  });
  const id = await saveCampaign(db, userId, input);
  await db.from("campaigns").update({ is_demo: true }).eq("id", id);
  const posts = [
    ["demo-ig", "Demo Instagram", "instagram", "Aurora Lamp is now ₹999! Get 25% off this Diwali. Offer ends November 20. Limited Time Offer. Shop: example.com/offer"],
    ["demo-fb", "Demo Facebook", "facebook", "Light up your home with the Aurora Lamp at ₹999 – 20% off. Hurry, sale ends 25 November! Limited Time Offer. https://example.com/offer"],
    ["demo-li", "Demo LinkedIn", "linkedin", "Our Aurora Lamp Diwali Sale: ₹999 only. Enjoy 50% discount until Nov 20. Limited Time Offer. Details: https://shop.example-deals.com/aurora"],
    ["demo-x", "Demo X", "twitter", "Aurora Lamp Diwali Sale: ₹999, 20% off, ends Nov 20 – Limited Time Offer. https://example.com/offer"],
  ].map(([cid, name, service, text], i) => ({
    user_id: userId, campaign_id: id, is_demo: true, buffer_post_id: null, channel_id: cid, channel_name: name, service, text,
    status: "scheduled", due_at: new Date(Date.UTC(2026, 10, 12 + i, 9, 0)).toISOString(),
  }));
  const { error } = await db.from("campaign_posts").insert(posts);
  if (error) throw new Error(error.message);
  return id;
}
