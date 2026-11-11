import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { bufferForUser, getConnection } from "@/lib/buffer/tokens";
import { bufferConfigured } from "@/lib/env";
import { Q_CHANNELS, type BufferChannel } from "@/lib/buffer/queries";
import { fmtDate } from "@/lib/fetcher";
import { Alert, Card, CardHeader, DemoBadge, EmptyState, LinkButton, PageHeader, Stat, StatusBadge } from "@/components/ui";
import { DemoButton } from "@/components/actions";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const db = supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  const [{ data: campaigns }, { data: runs }] = await Promise.all([
    db.from("campaigns").select("id, name, status, is_demo, end_date, created_at").order("created_at", { ascending: false }),
    db.from("audit_runs").select("id, campaign_id, is_demo, total_posts, passed_posts, failed_posts, critical_count, high_count, medium_count, low_count, created_at, campaigns(name)").order("created_at", { ascending: false }).limit(200),
  ]);
  const real = (campaigns ?? []).filter((c) => !c.is_demo);
  const realRuns = (runs ?? []).filter((r) => !r.is_demo);

  let channelCount: number | null = null;
  let bufferNote: string | null = null;
  const conn = user ? await getConnection(user.id).catch(() => null) : null;
  if (conn?.status === "active" && conn.organization_id && bufferConfigured()) {
    try { channelCount = (await bufferForUser<{ channels: BufferChannel[] }>(user!.id, Q_CHANNELS, { organizationId: conn.organization_id })).channels.filter((c) => !c.isDisconnected).length; }
    catch (e) { bufferNote = (e as Error).message; }
  }

  const sum = (k: "total_posts" | "critical_count" | "high_count" | "medium_count" | "low_count") => realRuns.reduce((n, r) => n + (r[k] as number), 0);
  const latestByCampaign = new Map<string, (typeof realRuns)[number]>();
  for (const r of realRuns) if (!latestByCampaign.has(r.campaign_id)) latestByCampaign.set(r.campaign_id, r);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Totals cover your real campaigns. Demo data is excluded." actions={<LinkButton href="/campaigns/new">New campaign</LinkButton>} />
      {!conn && <div className="mb-5"><Alert tone="info">Buffer isn’t connected yet. <Link className="font-medium underline" href="/settings">Connect it</Link> to audit real scheduled posts, or load the demo campaign to see how CampaignProof works.</Alert></div>}
      {conn && conn.status !== "active" && <div className="mb-5"><Alert tone="error">Your Buffer connection has expired. <Link className="font-medium underline" href="/settings">Reconnect</Link>.</Alert></div>}
      {bufferNote && <div className="mb-5"><Alert tone="warn">Couldn’t read channels from Buffer: {bufferNote}</Alert></div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Campaigns" value={real.length} />
        <Stat label="Active campaigns" value={real.filter((c) => c.status === "active").length} />
        <Stat label="Connected Buffer channels" value={channelCount ?? "—"} hint={channelCount === null ? "Not connected" : undefined} />
        <Stat label="Posts audited (all runs)" value={sum("total_posts")} />
        <Stat label="Issues detected" value={sum("critical_count") + sum("high_count") + sum("medium_count") + sum("low_count")} />
        <Stat label="High-priority issues" value={sum("critical_count") + sum("high_count")} hint="Critical + high" tone={sum("critical_count") + sum("high_count") > 0 ? "red" : undefined} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Recent audit activity" action={<Link href="/audits" className="text-sm text-brand hover:underline">All audits</Link>} />
          {(runs ?? []).length === 0 ? <EmptyState title="No audits yet" body="Add posts to a campaign and run your first audit." /> : (
            <ul className="divide-y divide-[var(--line)]">{(runs ?? []).slice(0, 6).map((r: any) => (
              <li key={r.id}><Link href={`/audits/${r.id}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-slate-50">
                <span className="font-medium">{r.campaigns?.name ?? "Campaign"}</span>{r.is_demo && <DemoBadge />}
                <span className="ml-auto text-slate-500">{r.failed_posts}/{r.total_posts} posts flagged</span><span className="w-28 text-right text-slate-400">{fmtDate(r.created_at)}</span></Link></li>))}</ul>)}
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Campaign status" action={<Link href="/campaigns" className="text-sm text-brand hover:underline">All campaigns</Link>} />
          {(campaigns ?? []).length === 0 ? <EmptyState title="No campaigns" body="Create one, or start from the sample." action={<><LinkButton href="/campaigns/new">New campaign</LinkButton><DemoButton /></>} /> : (
            <ul className="divide-y divide-[var(--line)]">{(campaigns ?? []).slice(0, 6).map((c) => { const r = latestByCampaign.get(c.id) ?? (runs ?? []).find((x) => x.campaign_id === c.id); return (
              <li key={c.id}><Link href={`/campaigns/${c.id}`} className="flex items-center gap-2 px-5 py-3 text-sm hover:bg-slate-50">
                <span className="truncate font-medium">{c.name}</span>{c.is_demo && <DemoBadge />}<span className="ml-auto"><StatusBadge status={c.status} /></span>
                <span className="w-16 text-right text-xs text-slate-500">{r ? (r.failed_posts ? `${r.failed_posts} flagged` : "clean") : "not audited"}</span></Link></li>); })}</ul>)}
        </Card>
      </div>
      <Card className="mt-6"><CardHeader title="Quick actions" /><div className="flex flex-wrap gap-2 p-5">
        <LinkButton href="/campaigns/new" variant="secondary">New campaign</LinkButton><LinkButton href="/settings" variant="secondary">Buffer settings</LinkButton><DemoButton /></div></Card>
    </>
  );
}
