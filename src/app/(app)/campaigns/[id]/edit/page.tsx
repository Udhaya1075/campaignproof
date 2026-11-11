import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { loadCampaign } from "@/lib/campaigns";
import { getConnection } from "@/lib/buffer/tokens";
import { bufferConfigured } from "@/lib/env";
import { CampaignForm, type CampaignFormValues } from "@/components/campaign-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Edit campaign" };

export default async function EditCampaign({ params }: { params: { id: string } }) {
  const db = supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  const c = await loadCampaign(db, params.id);
  if (!c) notFound();
  const conn = bufferConfigured() && user ? await getConnection(user.id).catch(() => null) : null;
  const k = c.campaign;
  const initial: CampaignFormValues = {
    name: k.name, description: k.description ?? "", status: k.status, productName: k.product_name ?? "", approvedPrice: k.approved_price ?? "", originalPrice: k.original_price ?? "",
    currency: k.currency, discountPercent: k.discount_percent ?? "", startDate: k.start_date ?? "", endDate: k.end_date ?? "", officialUrl: k.official_url ?? "", additionalRules: k.additional_rules ?? "",
    requiredPhrases: (c.brief.requiredPhrases ?? []).join("\n"), prohibitedPhrases: (c.brief.prohibitedPhrases ?? []).join("\n"), requiredInfo: (c.brief.requiredInfo ?? []).join("\n"), approvedClaims: (c.brief.approvedClaims ?? []).join("\n"),
    channels: c.channels.map((x) => ({ channelId: x.channel_id, channelName: x.channel_name, service: x.service })),
  } as CampaignFormValues;
  for (const key of ["approvedPrice", "originalPrice", "discountPercent"] as const) initial[key] = String(initial[key] ?? "");
  return (<><PageHeader title={`Edit ${k.name}`} /><CampaignForm id={params.id} initial={initial} isDemo={k.is_demo} bufferConnected={conn?.status === "active"} /></>);
}
