"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson, fmtDate } from "@/lib/fetcher";
import { Alert, Badge, Button, Card, CardHeader } from "./ui";
import { ConfirmDialog } from "./confirm";
import { useToast } from "./toast";

export function BufferCard({ configured, connection }: { configured: boolean; connection: { status: string; buffer_email: string | null; organization_id: string | null; organization_name: string | null; connected_at: string; scopes: string | null } | null }) {
  const router = useRouter();
  const toast = useToast();
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = connection?.status === "active";

  useEffect(() => { if (active) fetchJson("/api/buffer/organizations").then((d) => setOrgs(d.organizations)).catch(() => {}); }, [active]);

  return (
    <Card>
      <CardHeader title="Buffer connection" subtitle="CampaignProof reads your scheduled posts and, only after you confirm, edits their text." action={connection ? <Badge tone={active ? "green" : "red"}>{active ? "Connected" : connection.status === "expired" ? "Expired" : connection.status}</Badge> : <Badge>Not connected</Badge>} />
      <div className="space-y-4 p-5">
        {!configured && <Alert tone="warn">The server is missing Buffer or encryption settings. Fill in <code>.env.local</code> (see README), then restart the app.</Alert>}
        {connection && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-slate-500">Buffer account</dt><dd>{connection.buffer_email ?? "—"}</dd></div>
            <div><dt className="text-xs text-slate-500">Connected</dt><dd>{fmtDate(connection.connected_at, true)}</dd></div>
            <div><dt className="text-xs text-slate-500">Permissions</dt><dd className="break-words">{connection.scopes ?? "—"}</dd></div>
            <div><dt className="text-xs text-slate-500">Organization</dt><dd>
              {orgs.length > 1 ? <select className="field !py-1" value={connection.organization_id ?? ""} onChange={async (e) => { try { await fetchJson("/api/buffer/organizations", { body: { organizationId: e.target.value } }); toast.success("Organization changed"); router.refresh(); } catch (er) { toast.error((er as Error).message); } }}>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select> : connection.organization_name ?? "—"}</dd></div>
          </dl>)}
        {connection && !active && <Alert tone="error">Buffer no longer accepts the saved access. Reconnect to keep auditing live posts.</Alert>}
        <div className="flex flex-wrap gap-2">
          <a href="/api/buffer/connect" aria-disabled={!configured} className={`inline-flex items-center rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-navy ${configured ? "" : "pointer-events-none opacity-50"}`}>{connection ? "Reconnect Buffer" : "Connect Buffer"}</a>
          {connection && <Button variant="secondary" onClick={() => setConfirm(true)}>Disconnect</Button>}
        </div>
        <p className="text-xs text-slate-500">Disconnecting deletes the stored tokens here. You can also revoke access any time from Buffer’s own settings.</p>
      </div>
      <ConfirmDialog open={confirm} danger loading={busy} title="Disconnect Buffer?" confirmLabel="Disconnect" onCancel={() => setConfirm(false)} onConfirm={async () => {
        setBusy(true);
        try { await fetchJson("/api/buffer/disconnect", { body: {} }); toast.success("Buffer disconnected"); setConfirm(false); router.refresh(); } catch (e) { toast.error((e as Error).message); }
        setBusy(false);
      }}>Saved campaigns, posts and audits stay. You will need to reconnect before fetching live posts or sending corrections.</ConfirmDialog>
    </Card>
  );
}
