import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { loadCampaign } from "@/lib/campaigns";
import { formatMoney } from "@/lib/audit/brief";
import { fmtDate } from "@/lib/fetcher";
import { Alert, Badge, Card, CardHeader, DemoBadge, EmptyState, LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import { DeleteCampaignButton, RemovePostButton, RunAuditButton } from "@/components/actions";

export default async function CampaignDetail({ params }: { params: { id: string } }) {
  const db = supabaseServer();
  const c = await loadCampaign(db, params.id);
  if (!c) notFound();
  const [{ data: posts }, { data: runs }] = await Promise.all([
    db.from("campaign_posts").select("*").eq("campaign_id", params.id).order("due_at", { ascending: true }),
    db.from("audit_runs").select("*").eq("campaign_id", params.id).order("created_at", { ascending: false }).limit(10),
  ]);
  const k = c.campaign, b = c.brief;
  const chips = (items: string[] | undefined, tone: "blue" | "red" | "gray" = "gray") => items?.length ? <div className="flex flex-wrap gap-1.5">{items.map((x) => <Badge key={x} tone={tone}>{x}</Badge>)}</div> : <span className="text-slate-400">Not set</span>;
  const row = (label: string, v: React.ReactNode) => <div><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-0.5 text-sm">{v}</dd></div>;
  const money = (n: number | null | undefined) => (n === null || n === undefined ? <span className="text-slate-400">Not set</span> : formatMoney(n, k.currency));

  return (
    <>
      <PageHeader title={<span className="flex flex-wrap items-center gap-3">{k.name}<StatusBadge status={k.status} />{k.is_demo && <DemoBadge />}</span>} subtitle={k.description}
        actions={<><LinkButton variant="secondary" href={`/campaigns/${k.id}/edit`}>Edit brief</LinkButton><DeleteCampaignButton id={k.id} name={k.name} /></>} />
      {k.is_demo && <div className="mb-5"><Alert tone="warn">Sample campaign with deliberate mistakes. It is clearly separate from real Buffer data, and corrections are never sent to Buffer.</Alert></div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Approved brief" />
          <dl className="space-y-4 p-5">
            {row("Product", b.productName ?? <span className="text-slate-400">Not set</span>)}
            {row("Approved price", money(b.approvedPrice))}
            {row("Original price", money(b.originalPrice))}
            {row("Discount", b.discountPercent !== null && b.discountPercent !== undefined ? `${b.discountPercent}%` : <span className="text-slate-400">Not set</span>)}
            {row("Dates", k.start_date || k.end_date ? `${fmtDate(k.start_date)} to ${fmtDate(k.end_date)}` : <span className="text-slate-400">Not set</span>)}
            {row("Official URL", b.officialUrl ?? <span className="text-slate-400">Not set</span>)}
            {row("Required phrases", chips(b.requiredPhrases, "blue"))}
            {row("Prohibited phrases", chips(b.prohibitedPhrases, "red"))}
            {row("Required information", chips(b.requiredInfo))}
            {row("Approved claims", chips(b.approvedClaims))}
            {k.additional_rules && row("Additional rules", <p className="whitespace-pre-wrap">{k.additional_rules}</p>)}
            {row("Channels", c.channels.length ? chips(c.channels.map((x) => x.channel_name ?? x.channel_id)) : <span className="text-slate-400">None assigned</span>)}
          </dl>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={`Posts (${posts?.length ?? 0})`} subtitle="Snapshots of the posts that will be audited." action={!k.is_demo && <LinkButton variant="secondary" href={`/campaigns/${k.id}/posts`}>Select posts from Buffer</LinkButton>} />
            {!posts?.length ? <EmptyState title="No posts yet" body="Fetch your scheduled posts from Buffer and pick the ones that belong to this campaign." action={!k.is_demo && <LinkButton href={`/campaigns/${k.id}/posts`}>Select posts</LinkButton>} /> : (
              <ul className="divide-y divide-[var(--line)]">{posts.map((p) => (
                <li key={p.id} className="flex gap-3 px-5 py-3"><div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="font-medium text-brand-ink">{p.channel_name ?? "Channel"}</span><span>{fmtDate(p.due_at, true)}</span>{p.status && <Badge>{p.status}</Badge>}{p.is_demo && <DemoBadge />}</div>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm">{p.text}</p></div>
                  <Link href={`/posts/${p.id}`} className="shrink-0 text-sm text-brand hover:underline">Open</Link><RemovePostButton id={p.id} /></li>))}</ul>)}
            <div className="flex justify-end border-t border-[var(--line)] p-4"><RunAuditButton campaignId={k.id} disabled={!posts?.length} /></div>
          </Card>

          <Card>
            <CardHeader title="Audit history" />
            {!runs?.length ? <p className="p-5 text-sm text-slate-500">No audits yet.</p> : (
              <ul className="divide-y divide-[var(--line)]">{runs.map((r) => (
                <li key={r.id}><Link href={`/audits/${r.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm hover:bg-slate-50"><span>{fmtDate(r.created_at, true)}</span>
                  <span className="text-slate-500">{r.passed_posts} passed · {r.failed_posts} flagged</span>
                  {r.critical_count > 0 && <Badge tone="red">{r.critical_count} critical</Badge>}{r.high_count > 0 && <Badge>{r.high_count} high</Badge>}</Link></li>))}</ul>)}
          </Card>
        </div>
      </div>
    </>
  );
}
