import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/fetcher";
import { Badge, Card, DemoBadge, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Audit history" };

export default async function Audits() {
  const { data } = await supabaseServer().from("audit_runs").select("*, campaigns(name)").order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <PageHeader title="Audit history" subtitle="Every audit run is saved, so you can see how a campaign improved." />
      <Card>
        {!data?.length ? <EmptyState title="No audits yet" body="Open a campaign, add its posts and run an audit." /> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs text-slate-500"><tr>{["When", "Campaign", "Status", "Posts", "Passed", "Flagged", "Critical", "High", ""].map((h) => <th key={h} className="px-3 py-3 font-medium first:pl-5">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-[var(--line)]">{data.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50"><td className="py-3 pl-5 pr-3">{fmtDate(r.created_at, true)}</td>
                <td className="px-3">{r.campaigns?.name} {r.is_demo && <DemoBadge />}</td><td className="px-3"><StatusBadge status={r.status} /></td>
                <td className="px-3 tabular-nums">{r.total_posts}</td><td className="px-3 tabular-nums">{r.passed_posts}</td><td className="px-3 tabular-nums">{r.failed_posts}</td>
                <td className="px-3 tabular-nums">{r.critical_count ? <Badge tone="red">{r.critical_count}</Badge> : 0}</td><td className="px-3 tabular-nums">{r.high_count}</td>
                <td className="px-3 pr-5 text-right"><Link className="text-brand hover:underline" href={`/audits/${r.id}`}>Open</Link></td></tr>))}</tbody></table></div>)}
      </Card>
    </>
  );
}
