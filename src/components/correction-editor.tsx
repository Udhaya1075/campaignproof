"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applyFixes } from "@/lib/audit/engine";
import { diffWords } from "@/lib/diff";
import { fetchJson, fmtDate } from "@/lib/fetcher";
import { Alert, Button, Card, CardHeader, SeverityBadge, StatusBadge } from "./ui";
import { ConfirmDialog } from "./confirm";
import { useToast } from "./toast";

export interface FindingLite { id: string; severity: "critical" | "high" | "medium" | "low"; category: string; explanation: string; suggestion: string; detected_value: string | null; expected_value: string | null; start_index: number | null; end_index: number | null; replacement: string | null }
export interface CorrectionRow { id: string; status: string; original_text: string; corrected_text: string; error_message: string | null; created_at: string; applied_at: string | null }

function Highlighted({ text, findings }: { text: string; findings: FindingLite[] }) {
  const ranges = findings.filter((f) => f.start_index !== null && f.end_index !== null).map((f) => [f.start_index!, f.end_index!] as const).sort((a, b) => a[0] - b[0]);
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const [s, e] of ranges) {
    if (s < at) continue;
    parts.push(text.slice(at, s));
    parts.push(<mark key={s} className="flag">{text.slice(s, e) || "·"}</mark>);
    at = e;
  }
  parts.push(text.slice(at));
  return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{parts}</p>;
}

export function CorrectionEditor({ post, findings, runId, corrections, canSend }: {
  post: { id: string; text: string; channel_name: string | null; is_demo: boolean; buffer_post_id: string | null };
  findings: FindingLite[]; runId: string | null; corrections: CorrectionRow[]; canSend: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const latest = corrections.find((c) => c.status !== "rejected") ?? null;
  const [text, setText] = useState(latest?.corrected_text ?? applyFixes(post.text, findings.map((f) => ({ id: f.id, start: f.start_index, end: f.end_index, replacement: f.replacement }))).text);
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const [corrId, setCorrId] = useState<string | null>(latest?.id ?? null);
  const [status, setStatus] = useState<string>(latest?.status ?? "none");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const diff = useMemo(() => diffWords(post.text, text), [post.text, text]);
  const changed = text.trim() !== post.text.trim();
  const fixable = findings.filter((f) => f.replacement !== null);

  function recompute(nextSkip: Set<string>) {
    setSkip(nextSkip);
    setText(applyFixes(post.text, fixable.filter((f) => !nextSkip.has(f.id)).map((f) => ({ id: f.id, start: f.start_index, end: f.end_index, replacement: f.replacement }))).text);
  }

  async function run<T>(key: string, fn: () => Promise<T>, ok: string) {
    setBusy(key);
    try { await fn(); toast.success(ok); router.refresh(); } catch (e: any) { toast.error(e.message); }
    setBusy(null);
  }
  const saveDraft = () => run("draft", async () => {
    if (corrId && status !== "applied") { await fetchJson(`/api/corrections/${corrId}`, { method: "PATCH", body: { correctedText: text } }); }
    else { const r = await fetchJson("/api/corrections", { body: { campaignPostId: post.id, runId, correctedText: text } }); setCorrId(r.id); }
    setStatus("draft");
  }, "Draft saved");
  const setState = (s: "approved" | "rejected") => run(s, async () => {
    let id = corrId;
    if (!id) { const r = await fetchJson("/api/corrections", { body: { campaignPostId: post.id, runId, correctedText: text } }); id = r.id; setCorrId(id); }
    else await fetchJson(`/api/corrections/${id}`, { method: "PATCH", body: { correctedText: text } });
    await fetchJson(`/api/corrections/${id}`, { method: "PATCH", body: { status: s } });
    setStatus(s);
  }, s === "approved" ? "Correction approved" : "Correction rejected");
  const send = () => run("send", async () => { await fetchJson(`/api/corrections/${corrId}/apply`, { body: { confirm: true } }); setStatus("applied"); setConfirm(false); }, "Sent to Buffer");

  const locked = status === "applied";
  return (
    <div className="space-y-5">
      {post.is_demo && <Alert tone="warn">This is demo data. You can practise the whole workflow, but nothing is ever sent to Buffer.</Alert>}
      {findings.length > 0 && (
        <Card>
          <CardHeader title="What to fix" subtitle="Tick the suggestions you want to apply. You can still edit the text by hand." />
          <ul className="divide-y divide-[var(--line)]">{findings.map((f) => (
            <li key={f.id} className="flex gap-3 px-5 py-3 text-sm">
              <input type="checkbox" className="mt-1" aria-label="Apply this suggestion" disabled={f.replacement === null || locked} checked={f.replacement !== null && !skip.has(f.id)}
                onChange={() => { const n = new Set(skip); n.has(f.id) ? n.delete(f.id) : n.add(f.id); recompute(n); }} />
              <div><div className="flex items-center gap-2"><SeverityBadge severity={f.severity} /><span className="font-medium">{f.suggestion}</span></div>
                <p className="mt-1 text-slate-600">{f.explanation}{f.replacement === null && " This one needs your judgement."}</p></div></li>))}</ul>
        </Card>)}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardHeader title="Original" subtitle={post.channel_name ?? undefined} /><div className="p-5"><Highlighted text={post.text} findings={findings} /></div></Card>
        <Card><CardHeader title="Corrected draft" />
          <div className="p-5"><label htmlFor="corr" className="sr-only">Corrected text</label>
            <textarea id="corr" rows={9} className="field" value={text} disabled={locked} onChange={(e) => setText(e.target.value)} />
            <p className="mt-1 text-right text-xs text-slate-500">{text.length} characters</p></div></Card>
      </div>

      <Card><CardHeader title="Changes" subtitle="Red is removed, green is added." />
        <p className="whitespace-pre-wrap break-words p-5 text-sm leading-relaxed">{changed ? diff.map((d, i) => d.type === "same" ? <span key={i}>{d.text}</span> : d.type === "add" ? <ins key={i} className="fix no-underline">{d.text}</ins> : <del key={i} className="gone">{d.text}</del>) : <span className="text-slate-500">No changes yet.</span>}</p></Card>

      <div className="flex flex-wrap items-center gap-2">
        {status !== "none" && <StatusBadge status={status} />}
        <Button variant="secondary" onClick={saveDraft} loading={busy === "draft"} disabled={locked || !changed}>Save draft</Button>
        <Button variant="secondary" onClick={() => setState("rejected")} loading={busy === "rejected"} disabled={locked}>Reject</Button>
        <Button onClick={() => setState("approved")} loading={busy === "approved"} disabled={locked || !changed}>Approve correction</Button>
        <Button variant="primary" className="ml-auto bg-brand-navy" onClick={() => setConfirm(true)} disabled={!canSend || status !== "approved" || locked || post.is_demo}>Send to Buffer</Button>
      </div>
      {!canSend && !post.is_demo && <Alert tone="warn">Connect Buffer in Settings to send approved corrections.</Alert>}
      {corrections.find((c) => c.status === "failed") && <Alert tone="error">Buffer rejected the last attempt: {corrections.find((c) => c.status === "failed")!.error_message}</Alert>}

      <ConfirmDialog open={confirm} loading={busy === "send"} title="Update this post in Buffer?" confirmLabel="Update post in Buffer" onCancel={() => setConfirm(false)} onConfirm={send}>
        This replaces the text of the Buffer post with your approved version. Its schedule stays the same, and it is not published early. We first check that the post is unchanged in Buffer since you imported it.
      </ConfirmDialog>

      {corrections.length > 0 && (
        <Card><CardHeader title="Correction history" />
          <ul className="divide-y divide-[var(--line)] text-sm">{corrections.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-5 py-3"><StatusBadge status={c.status} /><span className="text-slate-500">{fmtDate(c.created_at, true)}</span>
              {c.applied_at && <span className="text-slate-500">sent {fmtDate(c.applied_at, true)}</span>}{c.error_message && <span className="text-red-600">{c.error_message}</span>}</li>))}</ul></Card>)}
    </div>
  );
}
