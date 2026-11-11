"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/fetcher";
import { Alert, Button, Card, CardHeader, Field } from "./ui";
import { useToast } from "./toast";

export interface CampaignFormValues {
  name: string; description: string; status: string; productName: string; approvedPrice: string; originalPrice: string; currency: string;
  discountPercent: string; startDate: string; endDate: string; officialUrl: string; additionalRules: string;
  requiredPhrases: string; prohibitedPhrases: string; requiredInfo: string; approvedClaims: string;
  channels: { channelId: string; channelName: string | null; service: string | null }[];
}
export const EMPTY_FORM: CampaignFormValues = {
  name: "", description: "", status: "draft", productName: "", approvedPrice: "", originalPrice: "", currency: "INR", discountPercent: "", startDate: "", endDate: "",
  officialUrl: "", additionalRules: "", requiredPhrases: "", prohibitedPhrases: "", requiredInfo: "", approvedClaims: "", channels: [],
};

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const num = (s: string) => (s.trim() === "" ? null : Number(s));

export function CampaignForm({ id, initial, bufferConnected, isDemo }: { id?: string; initial?: CampaignFormValues; bufferConnected: boolean; isDemo?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState<CampaignFormValues>(initial ?? EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [channels, setChannels] = useState<{ id: string; name: string; displayName: string | null; service: string; isDisconnected?: boolean }[] | null>(null);
  const [chError, setChError] = useState<string | null>(null);
  const set = (k: keyof CampaignFormValues, val: string) => setV((x) => ({ ...x, [k]: val }));

  useEffect(() => {
    if (!bufferConnected || isDemo) return;
    fetchJson("/api/buffer/channels").then((d) => setChannels(d.channels)).catch((e) => setChError(e.message));
  }, [bufferConnected, isDemo]);

  const toggle = (c: { id: string; name: string; displayName: string | null; service: string; isDisconnected?: boolean }) =>
    setV((x) => ({ ...x, channels: x.channels.some((k) => k.channelId === c.id) ? x.channels.filter((k) => k.channelId !== c.id) : [...x.channels, { channelId: c.id, channelName: c.displayName || c.name, service: c.service }] }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErrors({});
    const body = {
      name: v.name, description: v.description, status: v.status, productName: v.productName, approvedPrice: num(v.approvedPrice), originalPrice: num(v.originalPrice),
      currency: v.currency, discountPercent: num(v.discountPercent), startDate: v.startDate, endDate: v.endDate, officialUrl: v.officialUrl, additionalRules: v.additionalRules,
      requiredPhrases: lines(v.requiredPhrases), prohibitedPhrases: lines(v.prohibitedPhrases), requiredInfo: lines(v.requiredInfo), approvedClaims: lines(v.approvedClaims), channels: v.channels,
    };
    try {
      const r = await fetchJson(id ? `/api/campaigns/${id}` : "/api/campaigns", { method: id ? "PUT" : "POST", body });
      toast.success(id ? "Campaign saved" : "Campaign created");
      router.push(`/campaigns/${r.id}`); router.refresh();
    } catch (err: any) {
      setBusy(false);
      toast.error(err.message);
    }
  }

  const txt = (k: keyof CampaignFormValues, p: { label: string; hint?: string; type?: string; placeholder?: string; step?: string }) => (
    <Field label={p.label} hint={p.hint} error={errors[k]} htmlFor={k}>
      <input id={k} type={p.type ?? "text"} step={p.step} placeholder={p.placeholder} className="field" value={v[k] as string} onChange={(e) => set(k, e.target.value)} />
    </Field>
  );
  const area = (k: keyof CampaignFormValues, label: string, hint: string, rows = 3) => (
    <Field label={label} hint={hint} htmlFor={k}><textarea id={k} rows={rows} className="field font-mono text-[13px]" value={v[k] as string} onChange={(e) => set(k, e.target.value)} /></Field>
  );

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader title="Campaign" subtitle="What you're running and when." />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">{txt("name", { label: "Campaign name", placeholder: "Diwali Sale" })}</div>
          {txt("productName", { label: "Product or service", hint: "Optional. Used to spot posts that don't mention it.", placeholder: "Aurora Lamp" })}
          <Field label="Status" htmlFor="status">
            <select id="status" className="field" value={v.status} onChange={(e) => set("status", e.target.value)}>
              <option value="draft">Draft</option><option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option>
            </select>
          </Field>
          {txt("startDate", { label: "Start date", type: "date" })}
          {txt("endDate", { label: "End date", type: "date" })}
          <div className="sm:col-span-2">{area("description", "Description", "Optional internal notes.", 2)}</div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Approved brief" subtitle="The source of truth. Leave a field empty and CampaignProof won't enforce it." />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Currency" htmlFor="currency">
            <select id="currency" className="field" value={v.currency} onChange={(e) => set("currency", e.target.value)}>
              <option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option>
            </select>
          </Field>
          {txt("discountPercent", { label: "Discount %", type: "number", step: "0.01", placeholder: "20" })}
          {txt("approvedPrice", { label: "Approved price", type: "number", step: "0.01", placeholder: "999" })}
          {txt("originalPrice", { label: "Original price", hint: "Optional. Posts may quote it as the 'was' price.", type: "number", step: "0.01", placeholder: "1249" })}
          <div className="sm:col-span-2">{txt("officialUrl", { label: "Official campaign URL", hint: "Public web address only. CampaignProof never opens it.", placeholder: "example.com/offer" })}</div>
          {area("requiredPhrases", "Required phrases", "One per line. Every post must contain each one.\nLimited Time Offer")}
          {area("prohibitedPhrases", "Prohibited phrases", "One per line. Posts must never contain these.\n50% discount")}
          {area("requiredInfo", "Required information", "One per line, e.g. Free shipping across India")}
          {area("approvedClaims", "Approved claims", "One per line. Claims such as “free returns” are allowed only if listed.")}
          <div className="sm:col-span-2">{area("additionalRules", "Additional rules", "Free-form notes for your team. Shown on the campaign page; not enforced automatically.", 3)}</div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Channels" subtitle="Which Buffer channels this campaign runs on." />
        <div className="p-5">
          {isDemo ? <Alert>Demo campaigns use sample channels.</Alert>
            : !bufferConnected ? <Alert tone="warn">Connect Buffer in Settings to assign real channels. You can still save the campaign now.</Alert>
            : chError ? <Alert tone="error">{chError}</Alert>
            : !channels ? <p className="text-sm text-slate-500">Loading channels from Buffer…</p>
            : channels.length === 0 ? <p className="text-sm text-slate-500">Your Buffer organization has no channels yet.</p>
            : <ul className="grid gap-2 sm:grid-cols-2">{channels.map((c) => (
                <li key={c.id}><label className="flex cursor-pointer items-center gap-3 rounded-md border border-[var(--line)] px-3 py-2 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={v.channels.some((k) => k.channelId === c.id)} onChange={() => toggle(c)} />
                  <span className="font-medium">{c.displayName || c.name}</span><span className="text-slate-500">{c.service}</span>
                  {c.isDisconnected && <span className="text-xs text-red-600">disconnected</span>}
                </label></li>))}</ul>}
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" loading={busy}>{id ? "Save changes" : "Create campaign"}</Button>
      </div>
    </form>
  );
}
