import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/fetcher";
import { Card, DemoBadge, EmptyState, LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import { DemoButton } from "@/components/actions";

export const metadata = { title: "Campaigns" };

export default async function Campaigns() {
  const db = supabaseServer();
  const { data } = await db.from("campaigns").select("id, name, status, is_demo, start_date, end_date, campaign_posts(count), audit_runs(created_at)").order("created_at", { ascending: false });
  return (
    <>
      <PageHeader title="Campaigns" subtitle="Each campaign holds an approved brief and the posts audited against it." actions={<><DemoButton /><LinkButton href="/campaigns/new">New campaign</LinkButton></>} />
      <Card>
        {!data?.length ? <EmptyState title="No campaigns yet" body="Create a campaign and write down the approved price, dates, link and wording. That brief is what every post is checked against." action={<LinkButton href="/campaigns/new">Create your first campaign</LinkButton>} /> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs text-slate-500"><tr><th className="px-5 py-3 font-medium">Campaign</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Runs</th><th className="px-3 py-3 font-medium">Posts</th><th className="px-5 py-3 font-medium">Dates</th></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">{data.map((c: any) => (
              <tr key={c.id} className="hover:bg-slate-50"><td className="px-5 py-3"><Link className="font-medium text-brand hover:underline" href={`/campaigns/${c.id}`}>{c.name}</Link> {c.is_demo && <DemoBadge />}</td>
                <td className="px-3 py-3"><StatusBadge status={c.status} /></td><td className="px-3 py-3 tabular-nums">{c.audit_runs?.length ?? 0}</td><td className="px-3 py-3 tabular-nums">{c.campaign_posts?.[0]?.count ?? 0}</td>
                <td className="px-5 py-3 text-slate-500">{c.start_date || c.end_date ? `${fmtDate(c.start_date)} to ${fmtDate(c.end_date)}` : "—"}</td></tr>))}</tbody></table></div>)}
      </Card>
    </>
  );
}
