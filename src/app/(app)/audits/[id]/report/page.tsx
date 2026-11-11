import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/fetcher";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Audit report" };

export default async function Report({ params }: { params: { id: string } }) {
  const db = supabaseServer();
  const { data: run } = await db.from("audit_runs").select("*, campaigns(name)").eq("id", params.id).maybeSingle();
  if (!run) notFound();
  const { data: findings } = await db.from("audit_findings").select("*").eq("run_id", params.id).order("created_at");
  const order = { critical: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
  const rows = [...(findings ?? [])].sort((a, b) => order[a.severity] - order[b.severity]);
  return (
    <article className="mx-auto max-w-4xl bg-white text-[13px]">
      <div className="no-print mb-6 flex justify-end"><PrintButton /></div>
      <h1 className="text-2xl font-semibold">CampaignProof audit report</h1>
      <p className="mt-1 text-slate-600">{(run as any).campaigns?.name}{run.is_demo ? " (demo data)" : ""} · {fmtDate(run.created_at, true)}</p>
      <p className="mt-4">{run.total_posts} posts checked · {run.passed_posts} passed · {run.failed_posts} failed · {run.critical_count} critical · {run.high_count} high · {run.medium_count} medium · {run.low_count} low</p>
      <table className="mt-6 w-full border-collapse text-left align-top">
        <thead><tr className="border-b-2 border-brand-ink">{["Severity", "Channel", "Issue", "Found", "Approved", "Why and how to fix"].map((h) => <th key={h} className="py-2 pr-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{rows.map((f) => (<tr key={f.id} className="break-inside-avoid border-b border-slate-300"><td className="py-2 pr-3 font-semibold capitalize">{f.severity}</td><td className="pr-3">{f.channel_name}</td><td className="pr-3">{f.category.replace(/_/g, " ")}</td>
          <td className="pr-3">{f.detected_value ?? "Missing"}</td><td className="pr-3">{f.expected_value ?? "—"}</td><td className="py-2">{f.explanation} <strong>Fix:</strong> {f.suggestion}</td></tr>))}</tbody>
      </table>
      {rows.length === 0 && <p className="mt-6">No issues found.</p>}
    </article>
  );
}
