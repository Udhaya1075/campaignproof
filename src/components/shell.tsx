import Link from "next/link";
import { FileClock, LayoutDashboard, Megaphone, PenLine, Settings } from "lucide-react";
import { Logo } from "./logo";
import { NavLink } from "./nav-link";
import { SignOutButton } from "./actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/audits", label: "Audit history", icon: FileClock },
  { href: "/corrections", label: "Corrections", icon: PenLine },
  { href: "/settings", label: "Buffer & account", icon: Settings },
];

export function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface)] lg:flex">
      <aside className="no-print border-b border-[var(--line)] bg-white lg:fixed lg:inset-y-0 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-3 lg:block lg:px-6 lg:py-6">
          <Logo href="/dashboard" />
          <div className="lg:hidden"><SignOutButton /></div>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
          {NAV.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} label={label}><Icon className="h-[18px] w-[18px]" aria-hidden /></NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 hidden w-full border-t border-[var(--line)] p-5 lg:block">
          <p className="truncate text-xs text-slate-500" title={email}>{email}</p>
          <div className="mt-2 -ml-2"><SignOutButton /></div>
          <a href="https://buffer.com/api/commit" target="_blank" rel="noreferrer" className="mt-3 block rounded-xl bg-brand-navy px-3 py-2 text-xs font-medium text-white">
            <span className="mr-1.5 rounded-full bg-brand-yellow px-1.5 py-0.5 font-semibold text-brand-ink">Commit 2026</span>Built on the Buffer API
          </a>
          <div className="mt-3 flex gap-3 text-xs text-slate-400"><Link href="/privacy" className="hover:underline">Privacy</Link><Link href="/terms" className="hover:underline">Terms</Link></div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 lg:pl-64"><div className="mx-auto max-w-6xl px-4 py-10 sm:px-10">{children}</div></main>
    </div>
  );
}
