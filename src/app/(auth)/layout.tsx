import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface)] px-4 py-10">
      <Logo />
      <div className="mt-8 w-full max-w-md rounded-3xl border border-[var(--line)] bg-white p-8 shadow-lift">{children}</div>
      <p className="mt-6 text-xs text-slate-500">Built for Buffer Commit 2026</p>
    </div>
  );
}
