import type { SupabaseClient } from "@supabase/supabase-js";
import type { CampaignBrief } from "./audit/types.ts";
import type { CampaignInput } from "./schemas.ts";

/** Persist a campaign and its brief lists. RLS + the owner triggers keep everything scoped to userId. */
export async function saveCampaign(db: SupabaseClient, userId: string, input: CampaignInput, id?: string): Promise<string> {
  const row = {
    user_id: userId,
    name: input.name,
    description: input.description ?? null,
    status: input.status,
    product_name: input.productName ?? null,
    approved_price: input.approvedPrice ?? null,
    original_price: input.originalPrice ?? null,
    currency: input.currency,
    discount_percent: input.discountPercent ?? null,
    start_date: input.startDate ?? null,
    end_date: input.endDate ?? null,
    official_url: input.officialUrl ?? null,
    additional_rules: input.additionalRules ?? null,
  };
  let campaignId = id;
  if (id) {
    const { error } = await db.from("campaigns").update(row).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await db.from("campaigns").insert(row).select("id").single();
    if (error || !data) throw new Error(error?.message ?? "Could not create campaign");
    campaignId = data.id;
  }
  const cid = campaignId as string;
  await Promise.all([
    db.from("campaign_facts").delete().eq("campaign_id", cid),
    db.from("campaign_phrases").delete().eq("campaign_id", cid),
    db.from("campaign_channels").delete().eq("campaign_id", cid),
  ]);
  const base = { user_id: userId, campaign_id: cid };
  const facts = [
    ...input.requiredInfo.map((value) => ({ ...base, kind: "required_info", value })),
    ...input.approvedClaims.map((value) => ({ ...base, kind: "approved_claim", value })),
  ];
  const phrases = [
    ...input.requiredPhrases.map((phrase) => ({ ...base, kind: "required", phrase })),
    ...input.prohibitedPhrases.map((phrase) => ({ ...base, kind: "prohibited", phrase })),
  ];
  const channels = input.channels.map((c) => ({ ...base, channel_id: c.channelId, channel_name: c.channelName ?? null, service: c.service ?? null }));
  if (facts.length) {
    const { error } = await db.from("campaign_facts").insert(facts);
    if (error) throw new Error(error.message);
  }
  if (phrases.length) {
    const { error } = await db.from("campaign_phrases").insert(phrases);
    if (error) throw new Error(error.message);
  }
  if (channels.length) {
    const { error } = await db.from("campaign_channels").insert(channels);
    if (error) throw new Error(error.message);
  }
  return cid;
}

export interface LoadedCampaign {
  campaign: Record<string, any>;
  brief: CampaignBrief;
  channels: { channel_id: string; channel_name: string | null; service: string | null }[];
  facts: { kind: string; value: string }[];
  phrases: { kind: string; phrase: string }[];
}

export async function loadCampaign(db: SupabaseClient, id: string): Promise<LoadedCampaign | null> {
  const { data: campaign } = await db.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (!campaign) return null;
  const [f, p, c] = await Promise.all([
    db.from("campaign_facts").select("kind, value").eq("campaign_id", id).order("created_at"),
    db.from("campaign_phrases").select("kind, phrase").eq("campaign_id", id).order("created_at"),
    db.from("campaign_channels").select("channel_id, channel_name, service").eq("campaign_id", id),
  ]);
  const facts = f.data ?? [];
  const phrases = p.data ?? [];
  const brief: CampaignBrief = {
    name: campaign.name,
    productName: campaign.product_name,
    approvedPrice: campaign.approved_price === null ? null : Number(campaign.approved_price),
    originalPrice: campaign.original_price === null ? null : Number(campaign.original_price),
    currency: campaign.currency,
    discountPercent: campaign.discount_percent === null ? null : Number(campaign.discount_percent),
    startDate: campaign.start_date,
    endDate: campaign.end_date,
    officialUrl: campaign.official_url,
    requiredPhrases: phrases.filter((x) => x.kind === "required").map((x) => x.phrase),
    prohibitedPhrases: phrases.filter((x) => x.kind === "prohibited").map((x) => x.phrase),
    requiredInfo: facts.filter((x) => x.kind === "required_info").map((x) => x.value),
    approvedClaims: facts.filter((x) => x.kind === "approved_claim").map((x) => x.value),
  };
  return { campaign, brief, channels: c.data ?? [], facts, phrases };
}
