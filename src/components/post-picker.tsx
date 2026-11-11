"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson, fmtDate, ApiError } from "@/lib/fetcher";
import { Alert, Badge, Button, Card, CardHeader, EmptyState, Spinner } from "./ui";
import { useToast } from "./toast";

interface Ch { id: string; name: string; displayName: string | null; service: string }
interface P { id: string; text: string; status: string; dueAt: string | null; channelId: string; channelName: string; channelService: string }

export function PostPicker({ campaignId, assigned }: { campaignId: string; assigned: Record<string, { campaign: string; here: boolean }> }) {
  const router = useRouter();
  const toast = useToast();
  const [channels, setChannels] = useState<Ch[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("scheduled");
  const [posts, setPosts] = useState<P[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, P>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ text: string; reconnect: boolean } | null>(null);

  useEffect(() => { fetchJson("/api/buffer/channels").then((d) => setChannels(d.channels)).catch((e) => setError({ text: e.message, reconnect: e instanceof ApiError && (e.code === "buffer_auth" || e.code === "buffer_not_connected") })); }, []);

  async function load(more = false) {
    setLoading(true); setError(null);
    const q = new URLSearchParams({ status });
    if (sel.length) q.set("channelIds", sel.join(","));
    if (from) q.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) q.set("to", new Date(`${to}T23:59:59`).toISOString());
    if (more && cursor) q.set("after", cursor);
    try {
      const d = await fetchJson(`/api/buffer/posts?${q}`);
      setPosts((cur) => (more && cur ? [...cur, ...d.posts] : d.posts));
      setCursor(d.pageInfo.hasNextPage ? d.pageInfo.endCursor : null);
    } catch (e: any) { setError({ text: e.message, reconnect: e.code === "buffer_auth" || e.code === "buffer_not_connected" }); }
    setLoading(false);
  }

  const pickable = (posts ?? []).filter((p) => !assigned[p.id]?.here);
  const count = Object.keys(picked).length;

  async function save() {
    setSaving(true);
    try {
      const r = await fetchJson(`/api/campaigns/${campaignId}/posts`, { body: { posts: Object.values(picked).map((p) => ({ id: p.id, text: p.text, status: p.status, dueAt: p.dueAt, channelId: p.channelId, channelName: p.channelName, service: p.channelService })) } });
      toast.success(`${r.added} post${r.added === 1 ? "" : "s"} added`);
      router.push(`/campaigns/${campaignId}`); router.refresh();
    } catch (e: any) { toast.error(e.message); setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Find posts in Buffer" subtitle="Live data from your connected Buffer organization." />
        <div className="grid gap-4 p-5 md:grid-cols-4">
          <fieldset className="md:col-span-2"><legend className="mb-1 text-sm font-medium">Channels</legend>
            <div className="flex flex-wrap gap-2">{channels.length === 0 && <span className="text-sm text-slate-500">All channels</span>}
              {channels.map((c) => { const on = sel.includes(c.id); return (
                <button type="button" key={c.id} aria-pressed={on} onClick={() => setSel((s) => on ? s.filter((x) => x !== c.id) : [...s, c.id])}
                  className={`rounded-full border px-3 py-1 text-xs ${on ? "border-brand bg-brand text-white" : "border-[var(--line)] hover:bg-slate-50"}`}>{c.displayName || c.name} · {c.service}</button>); })}</div>
          </fieldset>
          <div><label htmlFor="from" className="mb-1 block text-sm font-medium">Scheduled from</label><input id="from" type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label htmlFor="to" className="mb-1 block text-sm font-medium">Scheduled until</label><input id="to" type="date" className="field" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div><label htmlFor="st" className="mb-1 block text-sm font-medium">Status</label>
            <select id="st" className="field" value={status} onChange={(e) => setStatus(e.target.value)}><option value="scheduled">Scheduled</option><option value="draft">Drafts</option></select></div>
          <div className="flex items-end"><Button onClick={() => load()} loading={loading && !posts}>Fetch posts</Button></div>
        </div>
      </Card>

      {error && <Alert tone="error">{error.text} {error.reconnect && <a className="font-medium underline" href="/settings">Go to Buffer settings</a>}</Alert>}

      {posts === null ? (loading ? <Spinner label="Fetching from Buffer" /> : null) : posts.length === 0 ? (
        <Card><EmptyState title="No posts found" body="Buffer returned nothing for these filters. Try a wider date range or a different status." /></Card>
      ) : (
        <Card>
          <CardHeader title={`${posts.length} post${posts.length === 1 ? "" : "s"} found`} action={
            <Button variant="secondary" onClick={() => setPicked(Object.fromEntries(pickable.map((p) => [p.id, p])))} disabled={!pickable.length}>Select all</Button>} />
          <ul className="divide-y divide-[var(--line)]">
            {posts.map((p) => { const a = assigned[p.id]; const here = a?.here; return (
              <li key={p.id}><label className={`flex gap-3 px-5 py-4 ${here ? "opacity-60" : "cursor-pointer hover:bg-slate-50"}`}>
                <input type="checkbox" className="mt-1" disabled={here} checked={!!picked[p.id]} onChange={() => setPicked((s) => { const n = { ...s }; if (n[p.id]) delete n[p.id]; else n[p.id] = p; return n; })} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-brand-ink">{p.channelName}</span><span>{p.channelService}</span><span>{fmtDate(p.dueAt, true)}</span><Badge>{p.status}</Badge>
                    {a && <Badge tone={here ? "green" : "yellow"}>{here ? "Already in this campaign" : `In “${a.campaign}”`}</Badge>}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{p.text || <em className="text-slate-400">No text</em>}</p>
                </div></label></li>); })}
          </ul>
          {cursor && <div className="border-t border-[var(--line)] p-4 text-center"><Button variant="secondary" loading={loading} onClick={() => load(true)}>Load more</Button></div>}
        </Card>
      )}

      <div className="sticky bottom-4 flex items-center justify-between rounded-lg border border-[var(--line)] bg-white p-3 shadow-lg">
        <span className="text-sm">{count} selected</span>
        <Button disabled={count === 0} loading={saving} onClick={save}>Add to campaign</Button>
      </div>
    </div>
  );
}
