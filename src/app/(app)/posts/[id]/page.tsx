import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getConnection } from "@/lib/buffer/tokens";
import { bufferConfigured } from "@/lib/env";
import { CorrectionEditor } from "@/components/correction-editor";
import { DemoBadge, LinkButton, PageHeader } from "@/components/ui";

export const metadata = { title: "Review and fix" };

export default async function PostPage({ params, searchParams }: { params: { id: string }; searchParams: { run?: string } }) {
  const db = supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  const { data: post } = await db.from("campaign_posts").select("*, campaigns(name)").eq("id", params.id).maybeSingle();
  if (!post) notFound();
  let runId = searchParams.run ?? null;
  if (!runId) {
    const { data: latest } = await db.from("audit_runs").select("id").eq("campaign_id", post.campaign_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    runId = latest?.id ?? null;
  }
  const [{ data: findings }, { data: corrections }] = await Promise.all([
    runId ? db.from("audit_findings").select("*").eq("run_id", runId).eq("campaign_post_id", post.id) : Promise.resolve({ data: [] as any[] }),
    db.from("corrections").select("*").eq("campaign_post_id", post.id).order("created_at", { ascending: false }),
  ]);
  const conn = bufferConfigured() && user ? await getConnection(user.id).catch(() => null) : null;
  return (
    <>
      <PageHeader title={<span className="flex flex-wrap items-center gap-3">Review and fix{post.is_demo && <DemoBadge />}</span>} subtitle={`${(post as any).campaigns?.name} · ${post.channel_name ?? "channel"}`}
        actions={runId ? <LinkButton variant="secondary" href={`/audits/${runId}`}>Back to audit</LinkButton> : <LinkButton variant="secondary" href={`/campaigns/${post.campaign_id}`}>Back to campaign</LinkButton>} />
      <CorrectionEditor post={post} findings={(findings ?? []) as any} runId={runId} corrections={(corrections ?? []) as any} canSend={conn?.status === "active"} />
    </>
  );
}
