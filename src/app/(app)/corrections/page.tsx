import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/fetcher";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Corrections" };

export default async function Corrections() {
  const { data } = await supabaseServer().from("corrections").select("*, campaign_posts(id, channel_name, is_demo, campaigns(name))").order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <PageHeader title="Corrections" subtitle="Every draft, approval and update sent to Buffer." />
      <Card>
        {!data?.length ? <EmptyState title="No corrections yet" body="Open a flagged post from an audit to write and approve a correction." /> : (
          <ul className="divide-y divide-[var(--line)]">{data.map((c: any) => (
            <li key={c.id}><Link href={`/posts/${c.campaign_posts?.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm hover:bg-slate-50">
              <StatusBadge status={c.status} /><span className="font-medium">{c.campaign_posts?.campaigns?.name}</span><span className="text-slate-500">{c.campaign_posts?.channel_name}</span>
              <span className="ml-auto text-slate-400">{fmtDate(c.created_at, true)}</span></Link></li>))}</ul>)}
      </Card>
    </>
  );
}
