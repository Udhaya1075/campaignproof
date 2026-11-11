import Link from "next/link";

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
        <rect width="30" height="30" rx="9" fill="#2C4BFF" />
        <path d="M8.5 15.5l4.5 4.5 8.5-10" fill="none" stroke="#FADE2A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={light ? "text-white" : "text-brand-ink"}>CampaignProof</span>
    </Link>
  );
}
