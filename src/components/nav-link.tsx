"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function NavLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = path === href || path.startsWith(`${href}/`) || (href === "/campaigns" && path.startsWith("/posts"));
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={clsx("flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors", active ? "bg-brand/10 text-brand" : "text-slate-600 hover:bg-[var(--surface)] hover:text-brand-ink")}>
      {children} {label}
    </Link>
  );
}
