import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { LinkButton, SeverityBadge } from "@/components/ui";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CHECKS = [
  "Wrong prices", "Drifting discounts", "Mismatched dates", "Wrong links", "Missing required wording", "Banned phrases",
  "Missing mandatory details", "Unapproved claims", "Channels that disagree", "Off-campaign posts",
];
const CHANNELS = ["Instagram", "Facebook", "LinkedIn", "X", "Threads", "TikTok", "Bluesky", "Pinterest", "YouTube"];

function Window({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div aria-hidden className={`overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-lift ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        {title && <span className="ml-3 text-xs font-medium text-slate-500">{title}</span>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function MockFinding({ channel, sev, kind, found, approved }: { channel: string; sev: string; kind: string; found: string; approved: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <div className="flex items-center gap-2 text-sm"><SeverityBadge severity={sev} /><b>{kind}</b><span className="text-slate-500">on {channel}</span></div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div><div className="text-xs text-slate-500">Found in the post</div><mark className="flag">{found}</mark></div>
        <div><div className="text-xs text-slate-500">Approved value</div><span className="fix">{approved}</span></div>
      </div>
    </div>
  );
}

function Feature({ eyebrow, title, body, flip, children }: { eyebrow: string; title: string; body: string; flip?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={flip ? "lg:order-2" : ""}>
        <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">{eyebrow}</span>
        <h3 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h3>
        <p className="mt-4 text-lg text-slate-600">{body}</p>
      </div>
      <div className={`rounded-3xl bg-[var(--surface)] p-6 sm:p-8 ${flip ? "lg:order-1" : ""}`}>{children}</div>
    </div>
  );
}

export default async function Home() {
  const { data: { user } } = await supabaseServer().auth.getUser().catch(() => ({ data: { user: null } }));
  if (user) redirect("/dashboard");
  return (
    <div className="bg-white">
      <a href="https://buffer.com/api/commit" target="_blank" rel="noreferrer" className="flex flex-wrap items-center justify-center gap-2 bg-brand-navy px-4 py-2.5 text-center text-sm text-white">
        <span className="rounded-full bg-brand-yellow px-2.5 py-0.5 text-xs font-bold text-brand-ink">Buffer Commit 2026</span>
        CampaignProof is an entry in Buffer’s first API build contest.
      </a>

      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <Logo />
          <nav aria-label="Sections" className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <a href="#features" className="hover:text-brand">Features</a><a href="#checks" className="hover:text-brand">What it checks</a><a href="#limits" className="hover:text-brand">Limits</a>
          </nav>
          <div className="flex items-center gap-2"><LinkButton href="/login" variant="ghost">Log in</LinkButton><LinkButton href="/register">Get started free</LinkButton></div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-8 pt-16 text-center sm:px-8 lg:pt-24">
        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">Catch the wrong discount before it goes live</h1>
        <p className="mx-auto mt-6 max-w-2xl text-xl text-slate-600">CampaignProof checks every scheduled Buffer post against your approved campaign brief, shows exactly what’s off, and fixes it only when you say so.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3"><LinkButton href="/register" className="!px-7 !py-3.5 text-base">Create a free account</LinkButton><LinkButton href="#features" variant="secondary" className="!px-7 !py-3.5 text-base">See how it works</LinkButton></div>
        <p className="mt-4 text-sm text-slate-500">No Buffer account handy? Load the demo campaign after you sign up.</p>

        <div className="mx-auto mt-14 max-w-5xl text-left">
          <Window title="Diwali Sale · Audit results">
            <div className="grid gap-5 md:grid-cols-5">
              <div className="rounded-2xl bg-brand-navy p-5 text-sm text-white md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-brand-yellow">Approved brief</div>
                <dl className="mt-4 space-y-3">
                  {[["Price", "₹999"], ["Discount", "20%"], ["Ends", "20 November"], ["Link", "example.com/offer"], ["Must include", "Limited Time Offer"]].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-white/15 pb-2"><dt className="text-white/60">{k}</dt><dd className="font-semibold">{v}</dd></div>))}
                </dl>
              </div>
              <div className="space-y-3 md:col-span-3">
                <div className="flex gap-3 text-center text-xs"><div className="flex-1 rounded-xl bg-[var(--surface)] py-2"><b className="block text-xl">4</b>checked</div><div className="flex-1 rounded-xl bg-[var(--surface)] py-2"><b className="block text-xl text-red-600">3</b>flagged</div><div className="flex-1 rounded-xl bg-[var(--surface)] py-2"><b className="block text-xl text-emerald-700">1</b>passed</div></div>
                <MockFinding channel="Instagram" sev="critical" kind="Discount" found="25% off" approved="20%" />
                <MockFinding channel="Facebook" sev="high" kind="End date" found="25 November" approved="20 November" />
                <MockFinding channel="LinkedIn" sev="high" kind="Link" found="shop.example-deals.com" approved="example.com/offer" />
              </div>
            </div>
          </Window>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-8">
        <p className="text-sm font-semibold text-slate-500">Audits posts on any channel in your Buffer workspace</p>
        <ul className="mt-5 flex flex-wrap justify-center gap-2">{CHANNELS.map((c) => <li key={c} className="rounded-full border border-[var(--line)] bg-white px-4 py-1.5 text-sm font-medium">{c}</li>)}</ul>
      </section>

      <section id="features" className="mx-auto max-w-6xl space-y-24 px-4 py-14 sm:px-8">
        <Feature eyebrow="Brief" title="Write the facts once" body="Price, discount, dates, official link, required and banned wording. Every field is optional, so a simple campaign stays simple.">
          <Window className="shadow-card"><ul className="space-y-3 text-sm">
            {[["Approved price", "₹999"], ["Original price", "₹1,249"], ["Discount", "20%"], ["Required phrase", "Limited Time Offer"], ["Prohibited phrase", "50% discount"]].map(([k, v]) => (
              <li key={k} className="flex items-center justify-between rounded-xl bg-[var(--surface)] px-4 py-2.5"><span className="text-slate-500">{k}</span><b>{v}</b></li>))}</ul></Window>
        </Feature>
        <Feature flip eyebrow="Audit" title="See exactly what’s off, and why" body="Rule-based checks, not guesswork. Each finding highlights the words in the post, states the approved value and explains the reason in plain language.">
          <div className="space-y-3"><MockFinding channel="Instagram" sev="critical" kind="Prohibited phrase" found="50% discount" approved="Remove it" /><MockFinding channel="X" sev="medium" kind="Required info" found="Missing" approved="Free shipping across India" /></div>
        </Feature>
        <Feature eyebrow="Fix" title="Review it, approve it, then update Buffer" body="Compare original and corrected text, approve the change, and confirm. The post keeps its schedule, and nothing is ever published for you.">
          <Window className="shadow-card"><p className="text-sm leading-relaxed">Aurora Lamp is now ₹999! Get <del className="gone">25% off</del> <ins className="fix no-underline">20% off</ins> this Diwali. Ends 20 Nov. <ins className="fix no-underline">Limited Time Offer.</ins></p>
            <div className="mt-5 flex justify-end gap-2"><span className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold">Reject</span><span className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white">Approve and send</span></div></Window>
        </Feature>
      </section>

      <section id="checks" className="bg-brand-navy py-20 text-white">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ten checks. Same result every time.</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">Deterministic rules, no AI guesswork, so you can trust and explain every finding.</p>
          <ul className="mt-10 flex flex-wrap justify-center gap-3">{CHECKS.map((c) => <li key={c} className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold">{c}</li>)}</ul>
        </div>
      </section>

      <section id="limits" className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-8">
        <h2 className="text-3xl font-bold tracking-tight">Straight about the limits</h2>
        <p className="mt-4 text-lg text-slate-600">CampaignProof uses what Buffer’s API offers: channels, scheduled posts, and editing a post’s text. It doesn’t read analytics or comments or change images, and a few thread formats may need editing inside Buffer.</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
        <div className="rounded-3xl bg-brand px-6 py-14 text-center text-white sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Grow your campaigns with confidence</h2>
          <p className="mt-3 text-white/80">Free to start. Connect Buffer when you’re ready.</p>
          <Link href="/register" className="mt-8 inline-flex rounded-full bg-brand-yellow px-8 py-3.5 text-base font-bold text-brand-ink hover:brightness-95">Get started for free</Link>
        </div>
      </section>

      <footer className="bg-brand-navy text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-3 sm:px-8">
          <div><Logo light /><p className="mt-4 max-w-xs text-sm text-white/60">Campaign consistency auditing for Buffer. Built for Buffer Commit 2026.</p></div>
          <nav aria-label="Product" className="text-sm"><h3 className="font-semibold">Product</h3><ul className="mt-3 space-y-2 text-white/70"><li><Link href="/register" className="hover:text-white">Get started</Link></li><li><Link href="/login" className="hover:text-white">Log in</Link></li><li><a href="#features" className="hover:text-white">Features</a></li></ul></nav>
          <nav aria-label="Resources" className="text-sm"><h3 className="font-semibold">Resources</h3><ul className="mt-3 space-y-2 text-white/70">
            <li><a href="https://developers.buffer.com" target="_blank" rel="noreferrer" className="hover:text-white">Buffer API docs</a></li><li><a href="https://buffer.com/api/commit" target="_blank" rel="noreferrer" className="hover:text-white">Buffer Commit</a></li>
            <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li><li><Link href="/terms" className="hover:text-white">Terms</Link></li></ul></nav>
        </div>
        <p className="border-t border-white/10 py-5 text-center text-xs text-white/50">© 2026 CampaignProof. An independent project built on the Buffer API. Not affiliated with or endorsed by Buffer.</p>
      </footer>
    </div>
  );
}
