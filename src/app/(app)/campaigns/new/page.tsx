import { supabaseServer } from "@/lib/supabase/server";
import { getConnection } from "@/lib/buffer/tokens";
import { bufferConfigured } from "@/lib/env";
import { CampaignForm } from "@/components/campaign-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "New campaign" };

export default async function NewCampaign() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  const conn = bufferConfigured() && user ? await getConnection(user.id).catch(() => null) : null;
  return (<><PageHeader title="New campaign" /><CampaignForm bufferConnected={conn?.status === "active"} /></>);
}
