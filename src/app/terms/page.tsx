import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata = { title: "Terms of service" };

export default function Terms() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-sm leading-relaxed">
      <Logo /><h1 className="mt-8 text-2xl font-semibold">Terms of service (template)</h1>
      <p className="mt-2 rounded bg-brand-yellow/30 p-3">Template for a portfolio project. Replace with terms reviewed for your jurisdiction before offering the service publicly.</p>
      <h2 className="mt-6 font-semibold">The service</h2>
      <p>CampaignProof compares scheduled social posts with a brief you write and reports differences. It is an aid, not a guarantee: it can miss problems and can flag things that are fine. You remain responsible for everything you publish.</p>
      <h2 className="mt-6 font-semibold">Your Buffer account</h2>
      <p>You may connect only accounts you are authorised to manage. Edits are sent to Buffer only after you explicitly confirm them, and are subject to Buffer’s own terms and limits.</p>
      <h2 className="mt-6 font-semibold">Availability</h2>
      <p>The service is provided as is, without warranty, and may change or stop at any time.</p>
      <p className="mt-8"><Link className="text-brand underline" href="/">Back to home</Link></p>
    </main>
  );
}
