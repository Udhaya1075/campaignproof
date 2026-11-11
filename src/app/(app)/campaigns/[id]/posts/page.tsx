import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getConnection } from "@/lib/buffer/tokens";
import { bufferConfigured } from "@/lib/env";
import { Alert, LinkButton, PageHeader } from "@/components/ui";
import { PostPicker } from "@/components/post-picker";

export const metadata = { title: "Select posts" };

export default async function SelectPosts({ params }: { params: { id: string } }) {
  const db = supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  const { data: c } = await db.from("campaigns").select("id, name, is_demo").eq("id", params.id).maybeSingle();
  if (!c) notFound();
  if (c.is_demo) redirect(`/campaigns/${c.id}`);
  const conn = bufferConfigured() && user ? await getConnection(user.id).catch(() => null) : null;
  const { data: all } = await db.from("campaign_posts").select("buffer_post_id, campaign_id, campaigns(name)").eq("is_demo", false).not("buffer_post_id", "is", null);
  const assigned: Record<string, { campaign: string; here: boolean }> = {};
  for (const r of (all ?? []) as any[]) assigned[r.buffer_post_id] = { campaign: r.campaigns?.name ?? "another campaign", here: r.campaign_id === c.id };
  return (
    <>
      <PageHeader title={`Select posts for ${c.name}`} actions={<LinkButton variant="secondary" href={`/campaigns/${c.id}`}>Back to campaign</LinkButton>} />
      {conn?.status === "active" ? <PostPicker campaignId={c.id} assigned={assigned} /> : (
        <Alert tone="warn">Buffer isn’t connected{conn ? " (the connection expired)" : ""}. <a className="font-medium underline" href="/settings">Connect Buffer</a> to fetch your scheduled posts.</Alert>)}
    </>
  );
}
