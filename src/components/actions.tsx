"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Play, Sparkles, Trash2, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { fetchJson } from "@/lib/fetcher";
import { Alert, Button, Field } from "./ui";
import { ConfirmDialog } from "./confirm";
import { useToast } from "./toast";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button onClick={async () => { await supabaseBrowser().auth.signOut(); router.push("/"); router.refresh(); }} className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
      <LogOut className="h-4 w-4" aria-hidden /> Sign out
    </button>
  );
}

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) return setMsg({ kind: "error", text: "Use a password with at least 8 characters." });
    setBusy(true);
    const sb = supabaseBrowser();
    if (mode === "login") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { setBusy(false); return setMsg({ kind: "error", text: "That email and password don't match." }); }
      router.push(safeNext);
      router.refresh();
    } else {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name || undefined } } });
      setBusy(false);
      if (error) return setMsg({ kind: "error", text: error.message });
      if (data.session) { router.push("/dashboard"); router.refresh(); }
      else setMsg({ kind: "success", text: "Account created. Check your email to confirm it, then sign in." });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {mode === "register" && <Field label="Name" htmlFor="name"><input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>}
      <Field label="Email" htmlFor="email"><input id="email" type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
      <Field label="Password" htmlFor="password" hint={mode === "register" ? "At least 8 characters." : undefined}>
        <input id="password" type="password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
      </Field>
      {msg && <Alert tone={msg.kind}>{msg.text}</Alert>}
      <Button type="submit" loading={busy} className="w-full">{mode === "login" ? "Sign in" : "Create account"}</Button>
      <p className="text-center text-sm text-slate-500">
        {mode === "login" ? <>New here? <Link className="text-brand underline" href="/register">Create an account</Link></> : <>Already registered? <Link className="text-brand underline" href="/login">Sign in</Link></>}
      </p>
    </form>
  );
}

export function RunAuditButton({ campaignId, disabled, label = "Run audit" }: { campaignId: string; disabled?: boolean; label?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button disabled={disabled} loading={busy} onClick={async () => {
      setBusy(true);
      try { const { runId } = await fetchJson(`/api/campaigns/${campaignId}/audit`, { method: "POST", body: {} }); router.push(`/audits/${runId}`); }
      catch (e) { toast.error((e as Error).message); setBusy(false); }
    }}><Play className="h-4 w-4" aria-hidden /> {label}</Button>
  );
}

export function DemoButton({ variant = "secondary" }: { variant?: "primary" | "secondary" }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button variant={variant} loading={busy} onClick={async () => {
      setBusy(true);
      try { const { id } = await fetchJson("/api/demo", { method: "POST", body: {} }); router.push(`/campaigns/${id}`); router.refresh(); }
      catch (e) { toast.error((e as Error).message); setBusy(false); }
    }}><Sparkles className="h-4 w-4" aria-hidden /> Load demo campaign</Button>
  );
}

export function DeleteCampaignButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}><Trash2 className="h-4 w-4" aria-hidden /> Delete</Button>
      <ConfirmDialog open={open} danger loading={busy} title="Delete this campaign?" confirmLabel="Delete campaign" onCancel={() => setOpen(false)} onConfirm={async () => {
        setBusy(true);
        try { await fetchJson(`/api/campaigns/${id}`, { method: "DELETE" }); toast.success("Campaign deleted"); router.push("/campaigns"); router.refresh(); }
        catch (e) { toast.error((e as Error).message); setBusy(false); setOpen(false); }
      }}>“{name}”, its saved posts, audits and corrections will be removed from CampaignProof. Nothing changes in Buffer.</ConfirmDialog>
    </>
  );
}

export function RemovePostButton({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <button aria-label="Remove post from campaign" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600" onClick={async () => {
      try { await fetchJson(`/api/campaign-posts/${id}`, { method: "DELETE" }); router.refresh(); } catch (e) { toast.error((e as Error).message); }
    }}><X className="h-4 w-4" /></button>
  );
}
