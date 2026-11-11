import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/fetcher";
import { DemoBadge, LinkButton, PageHeader, Stat } from "@/components/ui";
import { FindingsTable, type FindingRow } from "@/components/findings-table";
import { RunAuditButton } from "@/components/actions";
import { Card, CardHeader, EmptyState } from "@/components/ui";

export const metadata = { title: "Audit results" };

export default async function AuditResult({ params }: { params: { id: string } }) {
  const db = supabaseServer();
  const { data: run } = await db.from("audit_runs").select("*, campaigns(id, name)").eq("id", params.id).maybeSingle();
  if (!run) notFound();
  const [{ data: findings }, { data: posts }] = await Promise.all([
    db.from("audit_findings").select("*").eq("run_id", params.id),
    db.from("campaign_posts").select("id, channel_name, text").eq("campaign_id", run.campaign_id),
  ]);
  const flagged = new Set((findings ?? []).map((f) => f.campaign_post_id));
  const passed = (posts ?? []).filter((p) => !flagged.has(p.id));
  const camp = (run as any).campaigns;
  return (
    <>
      <PageHeader title={<span className="flex flex-wrap items-center gap-3">Audit: {camp?.name}{run.is_demo && <DemoBadge />}</span>} subtitle={`Run on ${fmtDate(run.created_at, true)}`}
        actions={<><LinkButton variant="secondary" href={`/api/audits/${run.id}/report`}>Download CSV</LinkButton><LinkButton variant="secondary" href={`/audits/${run.id}/report`}>Printable report</LinkButton><RunAuditButton campaignId={run.campaign_id} label="Run again" /></>} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <Stat label="Posts checked" value={run.total_posts} /><Stat label="Passed" value={run.passed_posts} /><Stat label="Failed" value={run.failed_posts} tone={run.failed_posts ? "red" : undefined} />
        <Stat label="Critical" value={run.critical_count} tone={run.critical_count ? "red" : undefined} /><Stat label="High" value={run.high_count} /><Stat label="Medium" value={run.medium_count} /><Stat label="Low" value={run.low_count} />
      </div>
      {findings?.length ? <FindingsTable findings={findings as FindingRow[]} runId={run.id} /> : <Card><EmptyState title="No issues found" body="Every post matches the approved brief." /></Card>}
      {passed.length > 0 && (
        <Card className="mt-6"><CardHeader title={`Passed posts (${passed.length})`} /><ul className="divide-y divide-[var(--line)]">{passed.map((p) => (
          <li key={p.id} className="flex gap-3 px-5 py-3 text-sm"><span className="font-medium">{p.channel_name}</span><span className="line-clamp-1 flex-1 text-slate-500">{p.text}</span><Link className="text-brand hover:underline" href={`/posts/${p.id}`}>Open</Link></li>))}</ul></Card>)}
    </>
  );
}
