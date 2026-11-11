"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { SeverityBadge, EmptyState } from "./ui";

export interface FindingRow {
  id: string; campaign_post_id: string | null; category: string; severity: "critical" | "high" | "medium" | "low";
  detected_value: string | null; expected_value: string | null; excerpt: string | null; explanation: string; suggestion: string; channel_name: string | null; rule_id: string;
}
const RANK = { critical: 0, high: 1, medium: 2, low: 3 } as const;
const LABEL: Record<string, string> = {
  price: "Price", discount: "Discount", date: "Date", url: "URL", required_phrase: "Required phrase", required_info: "Required info",
  prohibited_phrase: "Prohibited phrase", unsupported_claim: "Unsupported claim", cross_channel: "Cross-channel conflict", messaging: "Messaging",
};

export function FindingsTable({ findings, runId }: { findings: FindingRow[]; runId: string }) {
  const [sev, setSev] = useState("all");
  const [cat, setCat] = useState("all");
  const [ch, setCh] = useState("all");
  const [sort, setSort] = useState("severity");

  const channels = useMemo(() => [...new Set(findings.map((f) => f.channel_name ?? "Unknown"))].sort(), [findings]);
  const cats = useMemo(() => [...new Set(findings.map((f) => f.category))].sort(), [findings]);
  const rows = useMemo(() => findings
    .filter((f) => (sev === "all" || f.severity === sev) && (cat === "all" || f.category === cat) && (ch === "all" || (f.channel_name ?? "Unknown") === ch))
    .sort((a, b) => sort === "severity" ? RANK[a.severity] - RANK[b.severity] : sort === "channel" ? (a.channel_name ?? "").localeCompare(b.channel_name ?? "") : a.category.localeCompare(b.category)),
  [findings, sev, cat, ch, sort]);

  const sel = "field !w-auto !py-1.5";
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        {[
          ["Severity", sev, setSev, [["all", "All"], ["critical", "Critical"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]]],
          ["Issue type", cat, setCat, [["all", "All"], ...cats.map((c) => [c, LABEL[c] ?? c])]],
          ["Channel", ch, setCh, [["all", "All"], ...channels.map((c) => [c, c])]],
          ["Sort by", sort, setSort, [["severity", "Severity"], ["channel", "Channel"], ["category", "Issue type"]]],
        ].map(([label, val, fn, opts]: any) => (
          <div key={label}><label className="mb-1 block text-xs font-medium text-slate-500" htmlFor={`f-${label}`}>{label}</label>
            <select id={`f-${label}`} className={sel} value={val} onChange={(e) => fn(e.target.value)}>{opts.map(([v, l]: string[]) => <option key={v} value={v}>{l}</option>)}</select></div>
        ))}
        <p className="pb-2 text-sm text-slate-500" aria-live="polite">{rows.length} of {findings.length} findings</p>
      </div>
      {rows.length === 0 ? <div className="rounded-lg border border-[var(--line)] bg-white"><EmptyState title="Nothing matches these filters" body="Clear a filter to see more findings." /></div> : (
        <ul className="space-y-3">
          {rows.map((f) => (
            <li key={f.id} className="rounded-lg border border-[var(--line)] bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={f.severity} />
                <span className="text-sm font-semibold">{LABEL[f.category] ?? f.category}</span>
                <span className="text-sm text-slate-500">on {f.channel_name ?? "Unknown channel"}</span>
                {f.campaign_post_id && <Link className="ml-auto text-sm font-medium text-brand hover:underline" href={`/posts/${f.campaign_post_id}?run=${runId}`}>Review and fix</Link>}
              </div>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-xs font-medium text-slate-500">Found in the post</dt><dd className="mt-0.5">{f.detected_value ? <mark className="flag">{f.detected_value}</mark> : <span className="text-slate-500">Missing</span>}</dd></div>
                <div><dt className="text-xs font-medium text-slate-500">Approved value</dt><dd className="mt-0.5">{f.expected_value ? <span className="fix">{f.expected_value}</span> : <span className="text-slate-500">None. Needs a decision.</span>}</dd></div>
              </dl>
              {f.excerpt && <p className="mt-3 rounded bg-slate-50 px-3 py-2 text-xs text-slate-600">{f.excerpt}</p>}
              <p className="mt-3 text-sm">{f.explanation}</p>
              <p className="mt-1 text-sm text-slate-600"><span className="font-medium text-brand-ink">Fix: </span>{f.suggestion}</p>
            </li>))}
        </ul>)}
    </div>
  );
}
